const PostgresBaseModel = require("./PostgresBaseModel");
const { now } = require("../utils/date");

class PostgresWalletModel extends PostgresBaseModel {

    constructor() {
        super("wallets");
    }


    mapRow(row) {

        if (!row) {
            return null;
        }

        return {
            id: row.id,

            userId: row.user_id,

            balance:
                row.balance !== null
                    ? Number(row.balance)
                    : 0,

            holdBalance:
                row.hold_balance !== null
                    ? Number(row.hold_balance)
                    : 0,

            currency: row.currency,

            status: row.status,

            createdAt: row.created_at,

            updatedAt: row.updated_at,

            isDeleted: row.is_deleted,

            deletedAt: row.deleted_at
        };
    }


    async findByUserId(userId) {

        const row =
            await this.findOneByColumn(
                "user_id",
                userId
            );

        return this.mapRow(row);
    }


    async getBalance(userId) {

        const wallet =
            await this.findByUserId(userId);

        if (!wallet) {
            return null;
        }

        return Number(wallet.balance || 0);
    }


    async credit(userId, amount) {

        amount = Number(amount);

        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            throw new Error(
                "Invalid credit amount"
            );
        }

        const wallet =
            await this.findByUserId(userId);

        if (!wallet) {
            throw new Error(
                "Wallet not found"
            );
        }

        const balance =
            Number(wallet.balance || 0)
            + amount;

        const row =
            await this.updateById(
                wallet.id,
                {
                    balance,
                    updated_at: now()
                }
            );

        return this.mapRow(row);
    }


    async debit(userId, amount) {

        amount = Number(amount);

        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            throw new Error(
                "Invalid debit amount"
            );
        }

        const wallet =
            await this.findByUserId(userId);

        if (!wallet) {
            throw new Error(
                "Wallet not found"
            );
        }

        const balance =
            Number(wallet.balance || 0);

        if (balance < amount) {
            throw new Error(
                "Insufficient wallet balance"
            );
        }

        const row =
            await this.updateById(
                wallet.id,
                {
                    balance: balance - amount,
                    updated_at: now()
                }
            );

        return this.mapRow(row);
    }


    async hold(userId, amount) {

        amount = Number(amount);

        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            throw new Error(
                "Invalid hold amount"
            );
        }

        const wallet =
            await this.findByUserId(userId);

        if (!wallet) {
            throw new Error(
                "Wallet not found"
            );
        }

        const balance =
            Number(wallet.balance || 0);

        if (balance < amount) {
            throw new Error(
                "Insufficient wallet balance"
            );
        }

        const newBalance =
            balance - amount;

        const newHoldBalance =
            Number(wallet.holdBalance || 0)
            + amount;

        const row =
            await this.updateById(
                wallet.id,
                {
                    balance: newBalance,
                    hold_balance: newHoldBalance,
                    updated_at: now()
                }
            );

        return this.mapRow(row);
    }


    async releaseHold(userId, amount) {

        amount = Number(amount);

        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            throw new Error(
                "Invalid release amount"
            );
        }

        const wallet =
            await this.findByUserId(userId);

        if (!wallet) {
            throw new Error(
                "Wallet not found"
            );
        }

        const holdBalance =
            Number(wallet.holdBalance || 0);

        if (holdBalance < amount) {
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

                    updated_at: now()
                }
            );

        return this.mapRow(row);
    }


    async refundHold(userId, amount) {

        amount = Number(amount);

        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            throw new Error(
                "Invalid refund amount"
            );
        }

        const wallet =
            await this.findByUserId(userId);

        if (!wallet) {
            throw new Error(
                "Wallet not found"
            );
        }

        const holdBalance =
            Number(wallet.holdBalance || 0);

        if (holdBalance < amount) {
            throw new Error(
                "Insufficient held wallet balance"
            );
        }

        const newBalance =
            Number(wallet.balance || 0)
            + amount;

        const newHoldBalance =
            holdBalance - amount;

        const row =
            await this.updateById(
                wallet.id,
                {
                    balance: newBalance,

                    hold_balance:
                        newHoldBalance,

                    updated_at: now()
                }
            );

        return this.mapRow(row);
    }
}


module.exports =
    new PostgresWalletModel();