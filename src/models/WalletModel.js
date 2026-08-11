const BaseModel = require("./BaseModel");
const { createId } = require("../utils/id");
const { now } = require("../utils/date");

class WalletModel extends BaseModel {

    constructor() {
        super("wallets");
    }

    findByUserId(userId) {

        return this.findOne(
            wallet => wallet.userId === userId
        );

    }

    getBalance(userId) {

        const wallet = this.findByUserId(userId);

        if (!wallet) {
            return null;
        }

        return Number(wallet.balance || 0);

    }

    credit(userId, amount) {

        amount = Number(amount);

        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error("Invalid credit amount");
        }

        const wallet = this.findByUserId(userId);

        if (!wallet) {
            throw new Error("Wallet not found");
        }

        const balance =
            Number(wallet.balance || 0) + amount;

        return this.update(wallet.id, {

            balance,

            updatedAt: now()

        });

    }

    debit(userId, amount) {

        amount = Number(amount);

        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error("Invalid debit amount");
        }

        const wallet = this.findByUserId(userId);

        if (!wallet) {
            throw new Error("Wallet not found");
        }

        const balance =
            Number(wallet.balance || 0);

        if (balance < amount) {
            throw new Error("Insufficient wallet balance");
        }

        return this.update(wallet.id, {

            balance: balance - amount,

            updatedAt: now()

        });

    }
    hold(userId, amount) {

    amount = Number(amount);

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Invalid hold amount");
    }

    const wallet = this.findByUserId(userId);

    if (!wallet) {
        throw new Error("Wallet not found");
    }

    const balance = Number(wallet.balance || 0);

    if (balance < amount) {
        throw new Error("Insufficient wallet balance");
    }

    return this.update(wallet.id, {

        balance: balance - amount,

        holdBalance:
            Number(wallet.holdBalance || 0) + amount,

        updatedAt: now()

    });

}

releaseHold(userId, amount) {

    amount = Number(amount);

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Invalid release amount");
    }

    const wallet = this.findByUserId(userId);

    if (!wallet) {
        throw new Error("Wallet not found");
    }

    const holdBalance =
        Number(wallet.holdBalance || 0);

    if (holdBalance < amount) {
        throw new Error(
            "Insufficient held wallet balance"
        );
    }

    return this.update(wallet.id, {

        holdBalance:
            holdBalance - amount,

        updatedAt: now()

    });

}

refundHold(userId, amount) {

    amount = Number(amount);

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Invalid refund amount");
    }

    const wallet = this.findByUserId(userId);

    if (!wallet) {
        throw new Error("Wallet not found");
    }

    const holdBalance =
        Number(wallet.holdBalance || 0);

    if (holdBalance < amount) {
        throw new Error(
            "Insufficient held wallet balance"
        );
    }

    return this.update(wallet.id, {

        balance:
            Number(wallet.balance || 0) + amount,

        holdBalance:
            holdBalance - amount,

        updatedAt: now()

    });

}

}

module.exports = new WalletModel();