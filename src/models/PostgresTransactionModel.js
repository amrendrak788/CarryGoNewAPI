const PostgresBaseModel = require("./PostgresBaseModel");
const { now } = require("../utils/date");

class PostgresTransactionModel extends PostgresBaseModel {

    constructor() {
    super("transactions", {
        hasSoftDelete: false
    });
}


    mapRow(row) {

        if (!row) {
            return null;
        }

        return {
            id: row.id,

            walletId: row.wallet_id,

            parcelId: row.parcel_id,

            bookingId: row.booking_id,

            amount:
                row.amount !== null
                    ? Number(row.amount)
                    : 0,

            paymentMethod: row.payment_method,

            type: row.type,

            status: row.status,

            createdAt: row.created_at,

            updatedAt: row.updated_at
        };
    }


    async findById(id) {

        const row =
            await super.findById(id);

        return this.mapRow(row);
    }


    async findByBooking(bookingId) {

        const rows =
            await this.findManyByColumn(
                "booking_id",
                bookingId
            );

        return rows.map(row =>
            this.mapRow(row)
        );
    }


    async findByParcel(parcelId) {

        const rows =
            await this.findManyByColumn(
                "parcel_id",
                parcelId
            );

        return rows.map(row =>
            this.mapRow(row)
        );
    }


    async findByWallet(walletId) {

        const rows =
            await this.findManyByColumn(
                "wallet_id",
                walletId
            );

        return rows.map(row =>
            this.mapRow(row)
        );
    }


    async findSuccessfulByBooking(
        bookingId
    ) {

        const result =
            await this.findByBooking(
                bookingId
            );

        return result.find(
            transaction =>
                transaction.status === "SUCCESS" &&
                transaction.type === "CREDIT"
        ) || null;
    }


    async findSuccessfulRefundByBooking(
        bookingId
    ) {

        const result =
            await this.findByBooking(
                bookingId
            );

        return result.find(
            transaction =>
                transaction.status === "SUCCESS" &&
                transaction.type === "REFUND"
        ) || null;
    }


    async findSuccessfulHoldByBooking(
        bookingId
    ) {

        const result =
            await this.findByBooking(
                bookingId
            );

        return result.find(
            transaction =>
                transaction.status === "SUCCESS" &&
                transaction.type === "HOLD"
        ) || null;
    }


    async createTransaction(data) {

        const result =
            await this.create(

                [
                    "id",
                    "wallet_id",
                    "parcel_id",
                    "booking_id",
                    "amount",
                    "payment_method",
                    "type",
                    "status",
                    "created_at",
                    "updated_at"
                ],

                [
                    data.id,
                    data.walletId,
                    data.parcelId,
                    data.bookingId,
                    data.amount,
                    data.paymentMethod,
                    data.type,
                    data.status,
                    data.createdAt || now(),
                    data.updatedAt || null
                ]
            );

        return this.mapRow(result);
    }
}


module.exports =
    new PostgresTransactionModel();