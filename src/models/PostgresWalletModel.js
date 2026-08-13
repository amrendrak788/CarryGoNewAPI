const PostgresBaseModel =
    require("./PostgresBaseModel");

const { now } =
    require("../utils/date");


class PostgresWalletModel
    extends PostgresBaseModel {


    constructor() {

        super(
            "wallets",
            {
                hasSoftDelete: true
            }
        );

    }


    /*
     * =========================================
     * MAP DATABASE ROW
     * =========================================
     */

    mapRow(row) {

        if (!row) {
            return null;
        }


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
                row.currency || "INR",

            status:
                row.status || "ACTIVE",

            createdAt:
                row.created_at,

            updatedAt:
                row.updated_at,

            isDeleted:
                row.is_deleted,

            deletedAt:
                row.deleted_at

        };

    }


    /*
     * =========================================
     * FIND WALLET BY USER
     * =========================================
     */

    async findByUserId(userId) {

        const row =
            await this.findOneByColumn(
                "user_id",
                userId
            );


        return this.mapRow(row);

    }

async createForUser(userId, currency = "INR") {

    if (!userId) {
        throw new Error(
            "User ID is required"
        );
    }

    /*
     * Check existing wallet
     */

    const existing =
        await this.findByUserId(userId);

    if (existing) {
        return existing;
    }


    /*
     * Create wallet
     */

    const walletId =
        `wal_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)}`;


    const row =
        await this.create(
            [
                "id",
                "user_id",
                "balance",
                "hold_balance",
                "currency",
                "status",
                "created_at",
                "updated_at",
                "is_deleted",
                "deleted_at"
            ],
            [
                walletId,
                userId,
                0,
                0,
                currency,
                "ACTIVE",
                now(),
                now(),
                false,
                null
            ]
        );


    return this.mapRow(row);
}
    /*
     * =========================================
     * CREATE WALLET FOR USER
     *
     * Signup ke time use hoga.
     *
     * Agar wallet already hai,
     * duplicate nahi banega.
     * =========================================
     */

    async createForUser(userId) {

        if (!userId) {

            throw new Error(
                "User ID is required"
            );

        }


        /*
         * Existing wallet check
         */

        const existing =
            await this.findByUserId(
                userId
            );


        if (existing) {

            return existing;

        }


        const walletId =
            `wal_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 8)}`;


        const currentTime =
            now();


        const row =
            await this.create(

                [
                    "id",
                    "user_id",
                    "balance",
                    "hold_balance",
                    "currency",
                    "status",
                    "created_at",
                    "updated_at"
                ],

                [
                    walletId,
                    userId,
                    0,
                    0,
                    "INR",
                    "ACTIVE",
                    currentTime,
                    currentTime
                ]

            );


        return this.mapRow(row);

    }


    /*
     * =========================================
     * GET BALANCE
     * =========================================
     */

    async getBalance(userId) {

        const wallet =
            await this.findByUserId(
                userId
            );


        if (!wallet) {

            return null;

        }


        return Number(
            wallet.balance || 0
        );

    }


    /*
     * =========================================
     * CREDIT
     *
     * Future:
     * Razorpay verification ke baad
     * bhi isi logic ko use karenge.
     * =========================================
     */

    async credit(
        userId,
        amount
    ) {

        amount =
            Number(amount);


        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            throw new Error(
                "Invalid credit amount"
            );

        }


        const wallet =
            await this.findByUserId(
                userId
            );


        if (!wallet) {

            throw new Error(
                "Wallet not found"
            );

        }


        const balance =
            Number(
                wallet.balance || 0
            );


        const row =
            await this.updateById(

                wallet.id,

                {

                    balance:
                        balance + amount,

                    updated_at:
                        now()

                }

            );


        return this.mapRow(row);

    }


    /*
     * =========================================
     * DEBIT
     * =========================================
     */

    async debit(
        userId,
        amount
    ) {

        amount =
            Number(amount);


        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            throw new Error(
                "Invalid debit amount"
            );

        }


        const wallet =
            await this.findByUserId(
                userId
            );


        if (!wallet) {

            throw new Error(
                "Wallet not found"
            );

        }


        const balance =
            Number(
                wallet.balance || 0
            );


        if (
            balance < amount
        ) {

            throw new Error(
                "Insufficient wallet balance"
            );

        }


        const row =
            await this.updateById(

                wallet.id,

                {

                    balance:
                        balance - amount,

                    updated_at:
                        now()

                }

            );


        return this.mapRow(row);

    }


    /*
     * =========================================
     * HOLD
     *
     * Parcel payment ke time.
     * =========================================
     */

    async hold(
        userId,
        amount
    ) {

        amount =
            Number(amount);


        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            throw new Error(
                "Invalid hold amount"
            );

        }


        const wallet =
            await this.findByUserId(
                userId
            );


        if (!wallet) {

            throw new Error(
                "Wallet not found"
            );

        }


        const balance =
            Number(
                wallet.balance || 0
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
            Number(
                wallet.holdBalance || 0
            ) + amount;


        const row =
            await this.updateById(

                wallet.id,

                {

                    balance:
                        newBalance,

                    hold_balance:
                        newHoldBalance,

                    updated_at:
                        now()

                }

            );


        return this.mapRow(row);

    }


    /*
     * =========================================
     * RELEASE HOLD
     * =========================================
     */

    async releaseHold(
        userId,
        amount
    ) {

        amount =
            Number(amount);


        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            throw new Error(
                "Invalid release amount"
            );

        }


        const wallet =
            await this.findByUserId(
                userId
            );


        if (!wallet) {

            throw new Error(
                "Wallet not found"
            );

        }


        const holdBalance =
            Number(
                wallet.holdBalance || 0
            );


        if (
            holdBalance < amount
        ) {

            throw new Error(
                "Insufficient held wallet balance"
            );

        }


        const row =
            await this.updateById(

                wallet.id,

                {

                    hold_balance:
                        holdBalance - amount,

                    updated_at:
                        now()

                }

            );


        return this.mapRow(row);

    }


    /*
     * =========================================
     * REFUND HOLD
     *
     * Customer cancellation/rejection.
     * =========================================
     */

    async refundHold(
        userId,
        amount
    ) {

        amount =
            Number(amount);


        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            throw new Error(
                "Invalid refund amount"
            );

        }


        const wallet =
            await this.findByUserId(
                userId
            );


        if (!wallet) {

            throw new Error(
                "Wallet not found"
            );

        }


        const holdBalance =
            Number(
                wallet.holdBalance || 0
            );


        if (
            holdBalance < amount
        ) {

            throw new Error(
                "Insufficient held wallet balance"
            );

        }


        const newBalance =
            Number(
                wallet.balance || 0
            ) + amount;


        const newHoldBalance =
            holdBalance - amount;


        const row =
            await this.updateById(

                wallet.id,

                {

                    balance:
                        newBalance,

                    hold_balance:
                        newHoldBalance,

                    updated_at:
                        now()

                }

            );


        return this.mapRow(row);

    }

}


module.exports =
    new PostgresWalletModel();