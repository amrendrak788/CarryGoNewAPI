const WalletModel = require("../models/WalletModel");
const TransactionModel = require("../models/TransactionModel");
const ParcelModel = require("../models/ParcelModel");
const BookingModel = require("../models/BookingModel");

const { db } = require("../database/db");
const { now } = require("../utils/date");


class PaymentService {

   static holdPayment(user, parcelId) {

    if (!parcelId) {
        throw new Error("Parcel ID is required");
    }

    const parcel =
        ParcelModel.findById(parcelId);

    if (!parcel) {
        throw new Error("Parcel not found");
    }

    if (parcel.customerId !== user.id) {
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

    /*
     * Prevent duplicate payment hold
     */

    const existingTransaction =
        TransactionModel.findOne(transaction =>
            transaction.parcelId === parcel.id &&
            transaction.type === "HOLD" &&
            transaction.status === "SUCCESS"
        );

    if (existingTransaction) {

        return {

            alreadyPaid: true,

            transaction:
                existingTransaction,

            wallet:
                WalletModel.findByUserId(
                    user.id
                )

        };

    }

    const amount =
        Number(parcel.payout);

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error(
            "Invalid parcel payment amount"
        );
    }

    const wallet =
        WalletModel.findByUserId(user.id);

    if (!wallet) {
        throw new Error(
            "Customer wallet not found"
        );
    }

    /*
     * -----------------------------------------
     * ATOMIC PAYMENT HOLD
     * -----------------------------------------
     *
     * Wallet hold and HOLD transaction are
     * committed together.
     *
     * If anything fails, database changes
     * are rolled back.
     */

    const result =
        db.transaction(() => {

            /*
             * Hold customer wallet amount
             */

            const updatedWallet =
                WalletModel.hold(
                    user.id,
                    amount
                );

            /*
             * Create HOLD transaction
             */

            const transaction =
                TransactionModel.createTransaction({

                    id: `txn_${Date.now()}`,

                    walletId:
                        updatedWallet.id,

                    parcelId:
                        parcel.id,

                    bookingId:
                        parcel.bookingId || null,

                    amount,

                    paymentMethod:
                        "WALLET",

                    type:
                        "HOLD",

                    status:
                        "SUCCESS"

                });

            return {

                updatedWallet,

                transaction

            };

        });

    return {

        alreadyPaid: false,

        amount,

        wallet:
            WalletModel.findByUserId(
                user.id
            ),

        transaction:
            result.transaction

    };

}

}

module.exports = { PaymentService };