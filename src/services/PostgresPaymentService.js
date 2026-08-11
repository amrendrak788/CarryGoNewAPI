const { pool } = require("../database/postgres");

const PostgresParcelModel =
    require("../models/PostgresParcelModel");

const PostgresWalletModel =
    require("../models/PostgresWalletModel");

const PostgresTransactionModel =
    require("../models/PostgresTransactionModel");

const { createId } =
    require("../utils/id");

const { now } =
    require("../utils/date");


class PostgresPaymentService {

    static async holdPayment(user, parcelId) {

        if (!parcelId) {
            throw new Error(
                "Parcel ID is required"
            );
        }

        /*
         * -----------------------------------------
         * Find parcel
         * -----------------------------------------
         */

        const parcel =
            await PostgresParcelModel.findById(
                parcelId
            );

        if (!parcel) {
            throw new Error(
                "Parcel not found"
            );
        }

        if (
            parcel.customerId !== user.id
        ) {
            throw new Error(
                "You are not authorized to pay for this parcel"
            );
        }

        if (
            parcel.status !== "AVAILABLE" &&
            parcel.status !== "BOOKED"
        ) {
            throw new Error(
                "Payment cannot be held for this parcel"
            );
        }


        const amount =
            Number(parcel.payout);

        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            throw new Error(
                "Invalid parcel payment amount"
            );
        }


        /*
         * =========================================
         * ATOMIC PAYMENT HOLD
         * =========================================
         */

        return await PostgresPaymentService
            .withPaymentTransaction(
                user.id,
                parcel,
                amount
            );
    }

    static async settlePayment(
    parcelId,
    bookingId
) {

    if (!parcelId) {
        throw new Error(
            "Parcel ID is required"
        );
    }

    if (!bookingId) {
        throw new Error(
            "Booking ID is required"
        );
    }


    const client =
        await pool.connect();


    try {

        await client.query(
            "BEGIN"
        );


        /*
         * -----------------------------------------
         * 1. LOCK PARCEL
         * -----------------------------------------
         */

        const parcelResult =
            await client.query(
                `
                SELECT
                    id,
                    customer_id,
                    traveller_id,
                    booking_id,
                    payout,
                    currency,
                    status
                FROM parcels
                WHERE id = $1
                FOR UPDATE
                `,
                [parcelId]
            );


        const parcel =
            parcelResult.rows[0];


        if (!parcel) {
            throw new Error(
                "Parcel not found"
            );
        }


        /*
         * -----------------------------------------
         * 2. VALIDATE BOOKING
         * -----------------------------------------
         */

        if (
            parcel.booking_id !==
            bookingId
        ) {
            throw new Error(
                "Parcel booking mismatch"
            );
        }


        /*
         * -----------------------------------------
         * 3. VALIDATE TRAVELLER
         * -----------------------------------------
         */

        if (!parcel.traveller_id) {
            throw new Error(
                "Traveller not assigned to parcel"
            );
        }


        /*
         * -----------------------------------------
         * 4. FIND CUSTOMER WALLET
         * -----------------------------------------
         */

        const customerWalletResult =
            await client.query(
                `
                SELECT
                    id,
                    user_id,
                    balance,
                    hold_balance,
                    currency,
                    status
                FROM wallets
                WHERE user_id = $1
                FOR UPDATE
                `,
                [parcel.customer_id]
            );


        if (
            customerWalletResult.rows.length !== 1
        ) {
            throw new Error(
                "Customer wallet not found"
            );
        }


        const customerWallet =
            customerWalletResult.rows[0];


        /*
         * -----------------------------------------
         * 5. FIND PAYMENT HOLD
         * -----------------------------------------
         */

        const holdResult =
            await client.query(
                `
                SELECT
                    id,
                    wallet_id,
                    parcel_id,
                    booking_id,
                    amount,
                    payment_method,
                    type,
                    status,
                    created_at,
                    updated_at
                FROM transactions
                WHERE parcel_id = $1
                  AND booking_id = $2
                  AND type = 'HOLD'
                  AND status = 'SUCCESS'
                ORDER BY created_at DESC
                LIMIT 1
                FOR UPDATE
                `,
                [
                    parcelId,
                    bookingId
                ]
            );


        const hold =
            holdResult.rows[0];


        if (!hold) {
            throw new Error(
                "Payment hold not found"
            );
        }


        const amount =
            Number(hold.amount);


        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            throw new Error(
                "Invalid payment hold amount"
            );
        }


        /*
         * -----------------------------------------
         * 6. CHECK DUPLICATE CREDIT
         * -----------------------------------------
         */

        const creditResult =
            await client.query(
                `
                SELECT
                    id,
                    wallet_id,
                    parcel_id,
                    booking_id,
                    amount,
                    payment_method,
                    type,
                    status,
                    created_at,
                    updated_at
                FROM transactions
                WHERE parcel_id = $1
                  AND booking_id = $2
                  AND type = 'CREDIT'
                  AND status = 'SUCCESS'
                LIMIT 1
                FOR UPDATE
                `,
                [
                    parcelId,
                    bookingId
                ]
            );


        if (
            creditResult.rows.length > 0
        ) {

            await client.query(
                "COMMIT"
            );


            return {

                alreadySettled: true,

                amount,

                customerWallet:
                    PostgresPaymentService
                        .mapWallet(
                            customerWallet
                        ),

                transaction:
                    PostgresPaymentService
                        .mapTransaction(
                            creditResult.rows[0]
                        )

            };
        }


        /*
         * -----------------------------------------
         * 7. CHECK CUSTOMER HOLD BALANCE
         * -----------------------------------------
         */

        const customerHoldBalance =
            Number(
                customerWallet.hold_balance || 0
            );


        if (
            customerHoldBalance < amount
        ) {
            throw new Error(
                "Insufficient customer hold balance"
            );
        }


        /*
         * -----------------------------------------
         * 8. LOCK TRAVELLER WALLET
         * -----------------------------------------
         */

        const travellerWalletResult =
            await client.query(
                `
                SELECT
                    id,
                    user_id,
                    balance,
                    hold_balance,
                    currency,
                    status
                FROM wallets
                WHERE user_id = $1
                FOR UPDATE
                `,
                [parcel.traveller_id]
            );


        if (
            travellerWalletResult.rows.length !== 1
        ) {
            throw new Error(
                "Traveller wallet not found"
            );
        }


        const travellerWallet =
            travellerWalletResult.rows[0];


        /*
         * -----------------------------------------
         * 9. RELEASE CUSTOMER HOLD
         *
         * IMPORTANT:
         *
         * HOLD payment already reduced
         * customer balance.
         *
         * Therefore settlement only reduces
         * hold_balance.
         *
         * We DO NOT add amount back to
         * customer balance.
         * -----------------------------------------
         */

        const newCustomerHoldBalance =
            customerHoldBalance -
            amount;


        const customerWalletUpdate =
            await client.query(
                `
                UPDATE wallets
                SET
                    hold_balance = $1,
                    updated_at = $2
                WHERE id = $3
                RETURNING *
                `,
                [
                    newCustomerHoldBalance,
                    now(),
                    customerWallet.id
                ]
            );


        /*
         * -----------------------------------------
         * 10. CREDIT TRAVELLER WALLET
         * -----------------------------------------
         */

        const travellerBalance =
            Number(
                travellerWallet.balance || 0
            );


        const newTravellerBalance =
            travellerBalance +
            amount;


        const travellerWalletUpdate =
            await client.query(
                `
                UPDATE wallets
                SET
                    balance = $1,
                    updated_at = $2
                WHERE id = $3
                RETURNING *
                `,
                [
                    newTravellerBalance,
                    now(),
                    travellerWallet.id
                ]
            );


        /*
         * -----------------------------------------
         * 11. CREATE CREDIT TRANSACTION
         * -----------------------------------------
         */

        const transactionId =
            createId("txn");


        const transactionResult =
            await client.query(
                `
                INSERT INTO transactions
                (
                    id,
                    wallet_id,
                    parcel_id,
                    booking_id,
                    amount,
                    payment_method,
                    type,
                    status,
                    created_at,
                    updated_at
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    $9,
                    $10
                )
                RETURNING *
                `,
                [
                    transactionId,
                    travellerWallet.id,
                    parcelId,
                    bookingId,
                    amount,
                    "WALLET",
                    "CREDIT",
                    "SUCCESS",
                    now(),
                    now()
                ]
            );


        /*
         * -----------------------------------------
         * 12. COMMIT
         * -----------------------------------------
         */

        await client.query(
            "COMMIT"
        );


        return {

            alreadySettled: false,

            amount,

            customerWallet:
                PostgresPaymentService
                    .mapWallet(
                        customerWalletUpdate.rows[0]
                    ),

            travellerWallet:
                PostgresPaymentService
                    .mapWallet(
                        travellerWalletUpdate.rows[0]
                    ),

            transaction:
                PostgresPaymentService
                    .mapTransaction(
                        transactionResult.rows[0]
                    )

        };


    } catch (err) {

        try {

            await client.query(
                "ROLLBACK"
            );

        } catch (rollbackError) {

            console.error(
                "Payment settlement rollback failed:",
                rollbackError
            );
        }

        throw err;

    } finally {

        client.release();

    }
}

    static async withPaymentTransaction(
        userId,
        parcel,
        amount
    ) {

        const client =
            await pool.connect();

        try {

            await client.query(
                "BEGIN"
            );


            /*
             * -------------------------------------
             * Lock wallet
             * -------------------------------------
             */

            const walletResult =
                await client.query(
                    `
                    SELECT
                        id,
                        user_id,
                        balance,
                        hold_balance,
                        currency,
                        status
                    FROM wallets
                    WHERE user_id = $1
                    FOR UPDATE
                    `,
                    [userId]
                );


            if (
                walletResult.rows.length !== 1
            ) {
                throw new Error(
                    "Customer wallet not found"
                );
            }


            const wallet =
                walletResult.rows[0];


            /*
             * -------------------------------------
             * Check duplicate HOLD
             *
             * Do this INSIDE transaction after
             * wallet lock.
             * -------------------------------------
             */

            const existingResult =
                await client.query(
                    `
                    SELECT
                        id,
                        wallet_id,
                        parcel_id,
                        booking_id,
                        amount,
                        payment_method,
                        type,
                        status,
                        created_at,
                        updated_at
                    FROM transactions
                    WHERE parcel_id = $1
                      AND type = 'HOLD'
                      AND status = 'SUCCESS'
                    LIMIT 1
                    `,
                    [parcel.id]
                );


            if (
                existingResult.rows.length > 0
            ) {

                await client.query(
                    "COMMIT"
                );

                return {

                    alreadyPaid: true,

                    transaction:
                        PostgresPaymentService
                            .mapTransaction(
                                existingResult.rows[0]
                            ),

                    wallet:
                        PostgresPaymentService
                            .mapWallet(wallet)

                };
            }


            /*
             * -------------------------------------
             * Check wallet balance
             * -------------------------------------
             */

            const balance =
                Number(
                    wallet.balance || 0
                );

            const holdBalance =
                Number(
                    wallet.hold_balance || 0
                );


            if (
                balance < amount
            ) {
                throw new Error(
                    "Insufficient wallet balance"
                );
            }


            const newBalance =
                balance - amount;

            const newHoldBalance =
                holdBalance + amount;


            /*
             * -------------------------------------
             * Update wallet
             * -------------------------------------
             */

            const walletUpdate =
                await client.query(
                    `
                    UPDATE wallets
                    SET
                        balance = $1,
                        hold_balance = $2,
                        updated_at = $3
                    WHERE id = $4
                    RETURNING *
                    `,
                    [
                        newBalance,
                        newHoldBalance,
                        now(),
                        wallet.id
                    ]
                );


            /*
             * -------------------------------------
             * Create HOLD transaction
             * -------------------------------------
             */

            const transactionId =
                createId("txn");


            const transactionResult =
                await client.query(
                    `
                    INSERT INTO transactions
                    (
                        id,
                        wallet_id,
                        parcel_id,
                        booking_id,
                        amount,
                        payment_method,
                        type,
                        status,
                        created_at,
                        updated_at
                    )
                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7,
                        $8,
                        $9,
                        $10
                    )
                    RETURNING *
                    `,
                    [
                        transactionId,
                        wallet.id,
                        parcel.id,
                        parcel.bookingId || null,
                        amount,
                        "WALLET",
                        "HOLD",
                        "SUCCESS",
                        now(),
                        now()
                    ]
                );


            /*
             * -------------------------------------
             * COMMIT
             * -------------------------------------
             */

            await client.query(
                "COMMIT"
            );


            return {

                alreadyPaid: false,

                amount,

                wallet:
                    PostgresPaymentService
                        .mapWallet(
                            walletUpdate.rows[0]
                        ),

                transaction:
                    PostgresPaymentService
                        .mapTransaction(
                            transactionResult.rows[0]
                        )

            };


        } catch (err) {

            try {

                await client.query(
                    "ROLLBACK"
                );

            } catch (rollbackError) {

                console.error(
                    "Payment rollback failed:",
                    rollbackError
                );
            }

            throw err;

        } finally {

            client.release();

        }
    }


    static mapWallet(row) {

        return {

            id: row.id,

            userId:
                row.user_id,

            balance:
                row.balance !== null
                    ? Number(row.balance)
                    : 0,

            holdBalance:
                row.hold_balance !== null
                    ? Number(row.hold_balance)
                    : 0,

            currency:
                row.currency,

            status:
                row.status

        };
    }


    static mapTransaction(row) {

        return {

            id: row.id,

            walletId:
                row.wallet_id,

            parcelId:
                row.parcel_id,

            bookingId:
                row.booking_id,

            amount:
                row.amount !== null
                    ? Number(row.amount)
                    : 0,

            paymentMethod:
                row.payment_method,

            type:
                row.type,

            status:
                row.status,

            createdAt:
                row.created_at,

            updatedAt:
                row.updated_at

        };
    }
}


module.exports = {
    PostgresPaymentService
};