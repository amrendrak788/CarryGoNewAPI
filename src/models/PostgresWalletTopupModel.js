const PostgresBaseModel =
    require("./PostgresBaseModel");

const { now } =
    require("../utils/date");

class PostgresWalletTopupModel
    extends PostgresBaseModel {

    constructor() {
        super("wallet_topups");
    }


    mapRow(row) {

        if (!row) {
            return null;
        }

        return {
            id: row.id,

            userId:
                row.user_id,

            walletId:
                row.wallet_id,

            amount:
                row.amount !== null
                    ? Number(row.amount)
                    : 0,

            currency:
                row.currency,

            paymentMethod:
                row.payment_method,

            status:
                row.status,

            razorpayOrderId:
                row.razorpay_order_id,

            razorpayPaymentId:
                row.razorpay_payment_id,

            razorpaySignature:
                row.razorpay_signature,

            createdAt:
                row.created_at,

            updatedAt:
                row.updated_at
        };
    }


    async findById(id) {

        const row =
            await super.findById(id);

        return this.mapRow(row);
    }


    async findByUserId(userId) {

        const rows =
            await this.findManyByColumn(
                "user_id",
                userId
            );

        return rows.map(
            row => this.mapRow(row)
        );
    }


    async findByOrderId(orderId) {

        const row =
            await this.findOneByColumn(
                "razorpay_order_id",
                orderId
            );

        return this.mapRow(row);
    }


    async findByPaymentId(paymentId) {

        const row =
            await this.findOneByColumn(
                "razorpay_payment_id",
                paymentId
            );

        return this.mapRow(row);
    }


    async createTopup(data) {

        const row =
            await this.create(

                [
                    "id",
                    "user_id",
                    "wallet_id",
                    "amount",
                    "currency",
                    "payment_method",
                    "status",
                    "razorpay_order_id",
                    "razorpay_payment_id",
                    "razorpay_signature",
                    "created_at",
                    "updated_at"
                ],

                [
                    data.id,
                    data.userId,
                    data.walletId,
                    data.amount,
                    data.currency || "INR",
                    data.paymentMethod || "MANUAL",
                    data.status || "PENDING",
                    data.razorpayOrderId || null,
                    data.razorpayPaymentId || null,
                    data.razorpaySignature || null,
                    data.createdAt || now(),
                    data.updatedAt || now()
                ]

            );

        return this.mapRow(row);
    }


    async updateStatus(
        id,
        status,
        extra = {}
    ) {

        const patch = {

            status,

            updated_at: now()

        };


        if (
            extra.razorpayOrderId !== undefined
        ) {

            patch.razorpay_order_id =
                extra.razorpayOrderId;

        }


        if (
            extra.razorpayPaymentId !== undefined
        ) {

            patch.razorpay_payment_id =
                extra.razorpayPaymentId;

        }


        if (
            extra.razorpaySignature !== undefined
        ) {

            patch.razorpay_signature =
                extra.razorpaySignature;

        }


        const row =
            await this.updateById(
                id,
                patch
            );

        return this.mapRow(row);
    }

}


module.exports =
    new PostgresWalletTopupModel();