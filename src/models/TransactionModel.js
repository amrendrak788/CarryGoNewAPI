const BaseModel = require("./BaseModel");
const { now } = require("../utils/date");

class TransactionModel extends BaseModel {

    constructor() {
        super("transactions");
    }

    findById(id) {

        return super.findById(id);

    }

    findByBooking(bookingId) {

        return this.find(
            transaction =>
                transaction.bookingId === bookingId
        );

    }

    findByParcel(parcelId) {

        return this.find(
            transaction =>
                transaction.parcelId === parcelId
        );

    }

    findByWallet(walletId) {

        return this.find(
            transaction =>
                transaction.walletId === walletId
        );

    }

   findSuccessfulByBooking(bookingId) {
    return this.findOne(
        transaction =>
            transaction.bookingId === bookingId &&
            transaction.status === "SUCCESS" &&
            transaction.type === "CREDIT"
    );
}
findSuccessfulRefundByBooking(bookingId) {

    return this.findOne(
        transaction =>
            transaction.bookingId === bookingId &&
            transaction.status === "SUCCESS" &&
            transaction.type === "REFUND"
    );

}
findSuccessfulHoldByBooking(bookingId) {

    return this.findOne(
        transaction =>
            transaction.bookingId === bookingId &&
            transaction.status === "SUCCESS" &&
            transaction.type === "HOLD"
    );

}

    createTransaction(data) {

        return this.create({

            ...data,

            createdAt: now()

        });

    }

}

module.exports = new TransactionModel();