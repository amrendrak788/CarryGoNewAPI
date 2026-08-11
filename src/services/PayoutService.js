const WalletModel = require("../models/WalletModel");
const TransactionModel = require("../models/TransactionModel");
const BookingModel = require("../models/BookingModel");
const ParcelModel = require("../models/ParcelModel");
const TravellerProfileModel = require("../models/TravellerProfileModel");
const { db } = require("../database/db");
const { now } = require("../utils/date");

class PayoutService {

   static releaseTravellerPayout(bookingId) {

    if (!bookingId) {
        throw new Error("Booking ID is required");
    }

    const booking =
        BookingModel.findById(bookingId);

    if (!booking) {
        throw new Error("Booking not found");
    }

    if (booking.status !== "COMPLETED") {
        throw new Error(
            "Payout can only be released for completed booking"
        );
    }

    const parcel =
        ParcelModel.findById(booking.parcelId);

    if (!parcel) {
        throw new Error("Parcel not found");
    }

    if (parcel.status !== "DELIVERED") {
        throw new Error(
            "Payout can only be released after delivery"
        );
    }

    /*
     * Prevent duplicate payout.
     *
     * Only successful CREDIT transaction means
     * traveller payout has actually happened.
     */

    const existingTransaction =
        TransactionModel.findSuccessfulByBooking(
            booking.id
        );

    if (existingTransaction) {

        return {

            alreadyPaid: true,

            transaction:
                existingTransaction,

            wallet:
                WalletModel.findByUserId(
                    booking.travellerId
                )

        };

    }

    const amount =
        Number(parcel.payout);

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error(
            "Invalid payout amount"
        );
    }

    /*
     * Customer wallet
     */

    const customerWallet =
        WalletModel.findByUserId(
            booking.customerId
        );

    if (!customerWallet) {
        throw new Error(
            "Customer wallet not found"
        );
    }

    /*
     * Verify customer's held amount.
     */

    const customerHoldBalance =
        Number(customerWallet.holdBalance || 0);

    if (customerHoldBalance < amount) {
        throw new Error(
            "Insufficient held customer balance"
        );
    }

    /*
     * Traveller wallet
     */

    const travellerWallet =
        WalletModel.findByUserId(
            booking.travellerId
        );

    if (!travellerWallet) {
        throw new Error(
            "Traveller wallet not found"
        );
    }

    /*
     * -----------------------------------------
     * ATOMIC PAYOUT TRANSACTION
     * -----------------------------------------
     *
     * All three financial/state changes happen
     * together:
     *
     * 1. Release customer hold
     * 2. Credit traveller wallet
     * 3. Create payout transaction
     *
     * completedTrips is also updated inside
     * the same transaction.
     *
     * If anything fails, all changes rollback.
     */

    const result =
        db.transaction(() => {

            /*
             * Release customer's held amount.
             */

            WalletModel.releaseHold(
                booking.customerId,
                amount
            );

            /*
             * Credit traveller wallet.
             */

            const updatedWallet =
                WalletModel.credit(
                    booking.travellerId,
                    amount
                );

            /*
             * Create successful payout transaction.
             */

            const transaction =
                TransactionModel.createTransaction({

                    id: `txn_${Date.now()}`,

                    walletId:
                        updatedWallet.id,

                    parcelId:
                        booking.parcelId,

                    bookingId:
                        booking.id,

                    amount,

                    paymentMethod:
                        "WALLET",

                    type:
                        "CREDIT",

                    status:
                        "SUCCESS"

                });

            /*
             * Increase completed trips only once.
             */

            const profile =
                TravellerProfileModel.findByUserId(
                    booking.travellerId
                );

            let updatedProfile = profile;

            if (profile) {

                updatedProfile =
                    TravellerProfileModel.update(
                        profile.id,
                        {

                            completedTrips:
                                Number(
                                    profile.completedTrips || 0
                                ) + 1,

                            updatedAt: now()

                        }
                    );

            }

            return {

                updatedWallet,

                transaction,

                traveller:
                    updatedProfile

            };

        });

    /*
     * Return final database state.
     */

    return {

        alreadyPaid: false,

        amount,

        wallet:
            WalletModel.findByUserId(
                booking.travellerId
            ),

        transaction:
            result.transaction,

        traveller:
            TravellerProfileModel.findByUserId(
                booking.travellerId
            )

    };

}

}

module.exports = { PayoutService };