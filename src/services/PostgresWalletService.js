const { pool } =
    require("../database/postgres");

const PostgresWalletModel =
    require("../models/PostgresWalletModel");

const PostgresWalletTopupModel =
    require("../models/PostgresWalletTopupModel");

const PostgresTransactionModel =
    require("../models/PostgresTransactionModel");

const { createId } =
    require("../utils/id");

const { now } =
    require("../utils/date");


class PostgresWalletService {


    /*
     * =========================================
     * GET WALLET
     * =========================================
     */

    static async getWallet(user) {

        const wallet =
            await PostgresWalletModel.findByUserId(
                user.id
            );

        if (!wallet) {
            throw new Error(
                "Wallet not found"
            );
        }

        const transactions =
            await PostgresTransactionModel.findByWallet(
                wallet.id
            );

        return {

            wallet,

            balance:
                Number(wallet.balance || 0),

            holdBalance:
                Number(wallet.holdBalance || 0),

            currency:
                wallet.currency || "INR",

            transactions

        };
    }


    /*
     * =========================================
     * CREATE ADD MONEY REQUEST
     *
     * CURRENTLY WITHOUT RAZORPAY
     *
     * This creates a pending topup.
     * For testing we can immediately
     * confirm it through confirmTopup().
     *
     * Later Razorpay will create the
     * payment/order and call confirmation
     * after successful verification.
     * =========================================
     */

    static async createTopup(
        user,
        amount
    ) {

        amount = Number(amount);


        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            throw new Error(
                "Amount must be greater than zero"
            );

        }


        if (amount > 100000) {

            throw new Error(
                "Maximum topup amount is 100000 INR"
            );

        }


        /*
         * Find customer wallet
         */

        const wallet =
            await PostgresWalletModel.findByUserId(
                user.id
            );


        if (!wallet) {

            throw new Error(
                "Wallet not found"
            );

        }


        /*
         * Create topup
         */

        const topupId =
            createId("topup");


        const topup =
            await PostgresWalletTopupModel
                .createTopup({

                    id:
                        topupId,

                    userId:
                        user.id,

                    walletId:
                        wallet.id,

                    amount,

                    currency:
                        wallet.currency ||
                        "INR",

                    /*
                     * Currently manual/test.
                     *
                     * Later:
                     * RAZORPAY
                     */

                    paymentMethod:
                        "MANUAL",

                    status:
                        "PENDING",

                    createdAt:
                        now(),

                    updatedAt:
                        now()

                });


        return {

            topup,

            paymentRequired:
                true,

            paymentMethod:
                "MANUAL",

            message:
                "Topup created successfully. Confirm payment to add money."

        };

    }


    /*
     * =========================================
     * CONFIRM TOPUP
     *
     * CURRENTLY MANUAL
     *
     * Later Razorpay verification will happen
     * before this wallet credit operation.
     * =========================================
     */

    static async confirmTopup(
        user,
        topupId
    ) {

        if (!topupId) {

            throw new Error(
                "Topup ID is required"
            );

        }


        const client =
            await pool.connect();


        try {

            await client.query(
                "BEGIN"
            );


            /*
             * ---------------------------------
             * LOCK TOPUP
             * ---------------------------------
             */

            const topupResult =
                await client.query(
                    `
                    SELECT *
                    FROM wallet_topups
                    WHERE id = $1
                      AND user_id = $2
                    FOR UPDATE
                    `,
                    [
                        topupId,
                        user.id
                    ]
                );


            if (
                topupResult.rows.length === 0
            ) {

                throw new Error(
                    "Topup not found"
                );

            }


            const topup =
                topupResult.rows[0];


            /*
             * Already completed
             */

            if (
                topup.status ===
                "SUCCESS"
            ) {

                await client.query(
                    "COMMIT"
                );


                return {

                    alreadyCompleted:
                        true,

                    topup:
                        PostgresWalletTopupModel
                            .mapRow(topup)

                };

            }


            /*
             * Only pending topup can be confirmed
             */

            if (
                topup.status !==
                "PENDING"
            ) {

                throw new Error(
                    `Topup cannot be confirmed. Current status: ${topup.status}`
                );

            }


            /*
             * ---------------------------------
             * LOCK WALLET
             * ---------------------------------
             */

            const walletResult =
                await client.query(
                    `
                    SELECT *
                    FROM wallets
                    WHERE id = $1
                    FOR UPDATE
                    `,
                    [topup.wallet_id]
                );


            if (
                walletResult.rows.length === 0
            ) {

                throw new Error(
                    "Wallet not found"
                );

            }


            const wallet =
                walletResult.rows[0];


            /*
             * ---------------------------------
             * PREVENT DUPLICATE CREDIT
             *
             * If a CREDIT transaction already
             * exists for this topup, don't add
             * money again.
             * ---------------------------------
             */

            const existingTransaction =
                await client.query(
                    `
                    SELECT *
                    FROM transactions
                    WHERE wallet_id = $1
                      AND type = 'CREDIT'
                      AND status = 'SUCCESS'
                      AND parcel_id IS NULL
                      AND booking_id IS NULL
                      AND amount = $2
                    ORDER BY created_at DESC
                    LIMIT 1
                    `,
                    [
                        wallet.id,
                        topup.amount
                    ]
                );


            if (
                existingTransaction.rows.length > 0
            ) {

                await client.query(
                    `
                    UPDATE wallet_topups
                    SET
                        status = 'SUCCESS',
                        updated_at = $1
                    WHERE id = $2
                    `,
                    [
                        now(),
                        topup.id
                    ]
                );


                await client.query(
                    "COMMIT"
                );


                return {

                    alreadyCompleted:
                        true,

                    topup:
                        PostgresWalletTopupModel
                            .mapRow({

                                ...topup,

                                status:
                                    "SUCCESS"

                            }),

                    transaction:
                        PostgresWalletService
                            .mapTransaction(
                                existingTransaction
                                    .rows[0]
                            )

                };

            }


            /*
             * ---------------------------------
             * ADD MONEY TO WALLET
             * ---------------------------------
             */

            const currentBalance =
                Number(
                    wallet.balance || 0
                );


            const newBalance =
                currentBalance +
                Number(topup.amount);


            const walletUpdate =
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
                        newBalance,
                        now(),
                        wallet.id
                    ]
                );


            /*
             * ---------------------------------
             * CREATE CREDIT TRANSACTION
             * ---------------------------------
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
                        NULL,
                        NULL,
                        $3,
                        $4,
                        'CREDIT',
                        'SUCCESS',
                        $5,
                        $6
                    )
                    RETURNING *
                    `,
                    [
                        transactionId,

                        wallet.id,

                        Number(topup.amount),

                        topup.payment_method ||
                            "MANUAL",

                        now(),

                        now()
                    ]
                );


            /*
             * ---------------------------------
             * MARK TOPUP SUCCESS
             * ---------------------------------
             */

            const updatedTopupResult =
                await client.query(
                    `
                    UPDATE wallet_topups
                    SET
                        status = 'SUCCESS',
                        updated_at = $1
                    WHERE id = $2
                    RETURNING *
                    `,
                    [
                        now(),
                        topup.id
                    ]
                );


            /*
             * ---------------------------------
             * COMMIT
             * ---------------------------------
             */

            await client.query(
                "COMMIT"
            );


            return {

                alreadyCompleted:
                    false,

                topup:
                    PostgresWalletTopupModel
                        .mapRow(
                            updatedTopupResult
                                .rows[0]
                        ),

                wallet:
                    PostgresWalletService
                        .mapWallet(
                            walletUpdate.rows[0]
                        ),

                transaction:
                    PostgresWalletService
                        .mapTransaction(
                            transactionResult
                                .rows[0]
                        )

            };


        } catch (err) {

            try {

                await client.query(
                    "ROLLBACK"
                );

            } catch (rollbackError) {

                console.error(
                    "Topup rollback failed:",
                    rollbackError
                );

            }

            throw err;

        } finally {

            client.release();

        }

    }


    /*
     * =========================================
     * TOPUP HISTORY
     * =========================================
     */

    static async topups(user) {

        return await PostgresWalletTopupModel
            .findByUserId(
                user.id
            );

    }


    /*
     * =========================================
     * TRANSACTIONS
     * =========================================
     */

    static async transactions(user) {

        const wallet =
            await PostgresWalletModel.findByUserId(
                user.id
            );


        if (!wallet) {

            throw new Error(
                "Wallet not found"
            );

        }


        return await PostgresTransactionModel
            .findByWallet(
                wallet.id
            );

    }


    /*
     * =========================================
     * HELPERS
     * =========================================
     */

    static mapWallet(row) {

        return {

            id:
                row.id,

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
                row.status,

            createdAt:
                row.created_at,

            updatedAt:
                row.updated_at

        };

    }


    static mapTransaction(row) {

        return {

            id:
                row.id,

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
    PostgresWalletService
};