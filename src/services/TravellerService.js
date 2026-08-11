const TravellerProfileModel = require("../models/TravellerProfileModel");
const TripModel = require("../models/TripModel");
const ParcelModel = require("../models/ParcelModel");
const BookingModel = require("../models/BookingModel");
const DeliveryModel = require("../models/DeliveryModel");
const WalletModel = require("../models/WalletModel");
const TransactionModel = require("../models/TransactionModel");
const { BookingStatus, ParcelStatus, DeliveryStatus } = require("../constants/status");
const { now } = require("../utils/date");
const { db } = require("../database/db");

class TravellerService {

    static dashboard(user) {

        const profile =
            TravellerProfileModel.findByUserId(user.id);

        if (!profile) {
            throw new Error("Traveller profile not found");
        }

        const bookings =
            BookingModel.findByTraveller(user.id);

        const trips =
            TripModel.findByTraveller(user.id);

        const activeTrips =
            trips.filter(trip =>
                trip.status === "ACTIVE"
            );

        const pendingBookings =
            bookings.filter(booking =>
                booking.status === BookingStatus.PENDING
            );

        const acceptedBookings =
            bookings.filter(booking =>
                booking.status === BookingStatus.ACCEPTED
            );

        return {

            profile,

            stats: {

                totalTrips: trips.length,

                activeTrips: activeTrips.length,

                pendingBookings: pendingBookings.length,

                acceptedBookings: acceptedBookings.length,

                completedTrips: profile.completedTrips || 0

            },

            trips,

            pendingBookings,

            acceptedBookings

        };

    }

    static bookings(user) {

        return BookingModel.findByTraveller(user.id);

    }

    static pendingBookings(user) {

        return BookingModel.find(booking =>

            booking.travellerId === user.id &&

            booking.status === BookingStatus.PENDING

        );

    }

    static trips(user) {

        return TripModel.findByTraveller(user.id);

    }

    static acceptBooking(user, bookingId) {

        const booking =
            BookingModel.findById(bookingId);

        if (!booking) {
            throw new Error("Booking not found");
        }

        if (booking.travellerId !== user.id) {
            throw new Error(
                "You are not authorized to accept this booking"
            );
        }

        if (booking.status !== BookingStatus.PENDING) {
            throw new Error(
                "Booking is no longer pending"
            );
        }

        const parcel =
            ParcelModel.findById(booking.parcelId);

        if (!parcel) {
            throw new Error("Parcel not found");
        }

        const trip =
            TripModel.findById(booking.tripId);

        if (!trip) {
            throw new Error("Trip not found");
        }

        if (trip.travellerId !== user.id) {
            throw new Error(
                "Trip does not belong to this traveller"
            );
        }

        if (trip.status !== "ACTIVE") {
            throw new Error(
                "Trip is not active"
            );
        }

        if (
            Number(trip.availableWeight) <
            Number(parcel.weight)
        ) {
            throw new Error(
                "Trip does not have enough available capacity"
            );
        }

        const updatedBooking =
            BookingModel.accept(bookingId);

        ParcelModel.changeStatus(
            parcel.id,
            ParcelStatus.ACCEPTED
        );

        TripModel.decreaseCapacity(
            trip.id,
            parcel.weight
        );

        const delivery =
            DeliveryModel.findByBooking(booking.id);

        if (delivery) {

            DeliveryModel.changeStatus(
                delivery.id,
                DeliveryStatus.ACCEPTED
            );

            DeliveryModel.addHistory(
                delivery.id,
                DeliveryStatus.ACCEPTED,
                null
            );

        }

        return {

            booking: updatedBooking,

            parcel:
                ParcelModel.findById(parcel.id),

            trip:
                TripModel.findById(trip.id),

            delivery:
                delivery
                    ? DeliveryModel.findById(delivery.id)
                    : null

        };

    }

 static rejectBooking(user, bookingId) {

    const booking =
        BookingModel.findById(bookingId);

    if (!booking) {
        throw new Error("Booking not found");
    }

    if (booking.travellerId !== user.id) {
        throw new Error(
            "You are not authorized to reject this booking"
        );
    }

    if (booking.status !== BookingStatus.PENDING) {
        throw new Error(
            "Booking is no longer pending"
        );
    }

    const parcel =
        ParcelModel.findById(booking.parcelId);

    if (!parcel) {
        throw new Error("Parcel not found");
    }

    /*
     * Prevent duplicate refund
     */

    const existingRefund =
        TransactionModel.findSuccessfulRefundByBooking(
            booking.id
        );

    if (existingRefund) {

        return {

            alreadyRefunded: true,

            transaction:
                existingRefund,

            booking,

            parcel

        };

    }

    const amount =
        Number(parcel.payout);

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error(
            "Invalid refund amount"
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
     * Exact HOLD transaction
     */

    const holdTransaction =
        TransactionModel.findSuccessfulHoldByBooking(
            booking.id
        );

    if (!holdTransaction) {
        throw new Error(
            "Payment hold transaction not found for this booking"
        );
    }

    if (Number(holdTransaction.amount) !== amount) {
        throw new Error(
            "Payment hold amount does not match refund amount"
        );
    }

    /*
     * Verify held amount
     */

    const holdBalance =
        Number(customerWallet.holdBalance || 0);

    if (holdBalance < amount) {
        throw new Error(
            "Insufficient held wallet balance for refund"
        );
    }

    /*
     * -----------------------------------------
     * ATOMIC TRANSACTION
     * -----------------------------------------
     *
     * All financial and booking state changes
     * happen together.
     *
     * If anything fails, the JSON database
     * remains unchanged.
     */

    let result;

    result = db.transaction(() => {

        /*
         * Refund customer wallet
         */

        const updatedWallet =
            WalletModel.refundHold(
                booking.customerId,
                amount
            );

        /*
         * Reject booking
         */

        const updatedBooking =
            BookingModel.reject(
                bookingId
            );

        /*
         * Make parcel available again
         */

        ParcelModel.update(
            parcel.id,
            {

                travellerId: null,

                bookingId: null,

                status: ParcelStatus.AVAILABLE,

                updatedAt: now()

            }
        );

        /*
         * Clear delivery booking
         */

        const delivery =
            DeliveryModel.findByBooking(
                booking.id
            );

        if (delivery) {

            DeliveryModel.clearBooking(
                delivery.id
            );

        }

        /*
         * Create refund transaction
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
                    "REFUND",

                status:
                    "SUCCESS"

            });

        return {

            updatedWallet,

            updatedBooking,

            transaction

        };

    });

    /*
     * Return final state from database
     */

    return {

        alreadyRefunded: false,

        amount,

        booking:
            BookingModel.findById(
                booking.id
            ),

        parcel:
            ParcelModel.findById(
                parcel.id
            ),

        delivery:
            DeliveryModel.findByParcel(
                parcel.id
            ),

        wallet:
            WalletModel.findByUserId(
                booking.customerId
            ),

        transaction:
            result.transaction

    };

}
static verifyPickupOtp(user, parcelId, otp) {

    if (!parcelId) {
        throw new Error("Parcel ID is required");
    }

    if (!otp) {
        throw new Error("Pickup OTP is required");
    }

    const parcel =
        ParcelModel.findById(parcelId);

    if (!parcel) {
        throw new Error("Parcel not found");
    }

    if (parcel.travellerId !== user.id) {
        throw new Error(
            "You are not authorized to pick up this parcel"
        );
    }

    if (parcel.status !== ParcelStatus.ACCEPTED) {
        throw new Error(
            "Parcel is not ready for pickup"
        );
    }

    if (parcel.pickupOtpVerified === true) {
        throw new Error(
            "Pickup OTP already verified"
        );
    }

    if (
        String(parcel.pickupOtp) !==
        String(otp)
    ) {
        throw new Error(
            "Invalid pickup OTP"
        );
    }

    const delivery =
        DeliveryModel.findByParcel(parcel.id);

    if (!delivery) {
        throw new Error("Delivery not found");
    }

    ParcelModel.verifyPickupOtp(
        parcel.id
    );

    ParcelModel.changeStatus(
        parcel.id,
        ParcelStatus.PICKED_UP
    );

    DeliveryModel.markPickedUp(
        delivery.id,
        parcel.pickup
    );

 
return {

    parcel:
        ParcelModel.findById(parcel.id),

    delivery:
        DeliveryModel.findById(delivery.id)

};

}
static advanceDelivery(user, deliveryId, body = {}) {

    if (!deliveryId) {
        throw new Error("Delivery ID is required");
    }

    const delivery =
        DeliveryModel.findById(deliveryId);

    if (!delivery) {
        throw new Error("Delivery not found");
    }

    const parcel =
        ParcelModel.findById(delivery.parcelId);

    if (!parcel) {
        throw new Error("Parcel not found");
    }

    if (parcel.travellerId !== user.id) {
        throw new Error(
            "You are not authorized to update this delivery"
        );
    }

    if (delivery.currentStatus !== DeliveryStatus.PICKED_UP) {
        throw new Error(
            "Parcel must be picked up before marking it in transit"
        );
    }

    if (parcel.status !== ParcelStatus.PICKED_UP) {
        throw new Error(
            "Parcel is not in picked-up state"
        );
    }

    const location =
        body.location ||
        (
            body.latitude !== undefined &&
            body.longitude !== undefined
                ? {
                    latitude: body.latitude,
                    longitude: body.longitude
                }
                : null
        );

    const updatedParcel =
        ParcelModel.changeStatus(
            parcel.id,
            ParcelStatus.IN_TRANSIT
        );

    const updatedDelivery =
        DeliveryModel.markInTransit(
            delivery.id,
            location
        );

    return {

        parcel:
            ParcelModel.findById(parcel.id),

        delivery:
            DeliveryModel.findById(delivery.id)

    };

}
static markInTransit(user, parcelId, location = null) {

    if (!parcelId) {
        throw new Error("Parcel ID is required");
    }

    const parcel = ParcelModel.findById(parcelId);
  console.error("🔥🔥 MARK_IN_TRANSIT METHOD CALLED 🔥🔥");
    if (!parcel) {
        throw new Error("Parcel not found");
    }

    if (parcel.travellerId !== user.id) {
        throw new Error(
            "You are not authorized to move this parcel"
        );
    }
       console.error("🔥 PARCEL DEBUG:", {
        parcelId: parcel?.id,
        parcelStatus: JSON.stringify(parcel?.status),
        expectedStatus: JSON.stringify(ParcelStatus.PICKED_UP),
        travellerId: parcel?.travellerId,
        userId: user?.id
    });

    if (parcel.status !== ParcelStatus.PICKED_UP) {
        throw new Error(
            "Parcel must be picked up before moving in transit"
        );
    }

    const delivery =
        DeliveryModel.findByParcel(parcel.id);

    if (!delivery) {
        throw new Error("Delivery not found");
    }

    if (
        delivery.currentStatus !==
        DeliveryStatus.PICKED_UP
    ) {
        throw new Error(
            "Delivery is not ready for transit"
        );
    }

    ParcelModel.changeStatus(
        parcel.id,
        ParcelStatus.IN_TRANSIT
    );

    DeliveryModel.markInTransit(
        delivery.id,
        location
    );

    return {

        parcel:
            ParcelModel.findById(parcel.id),

        delivery:
            DeliveryModel.findById(delivery.id)

    };

}
static verifyDeliveryOtp(user, parcelId, otp, location = null) {

    if (!parcelId) {
        throw new Error("Parcel ID is required");
    }

    if (!otp) {
        throw new Error("Delivery OTP is required");
    }

    const parcel =
        ParcelModel.findById(parcelId);

    if (!parcel) {
        throw new Error("Parcel not found");
    }

    if (parcel.travellerId !== user.id) {
        throw new Error(
            "You are not authorized to deliver this parcel"
        );
    }

    if (parcel.status !== ParcelStatus.IN_TRANSIT) {
        throw new Error(
            "Parcel must be in transit before delivery"
        );
    }

    if (parcel.deliveryOtpVerified === true) {
        throw new Error(
            "Delivery OTP already verified"
        );
    }

    if (
        String(parcel.deliveryOtp) !==
        String(otp)
    ) {
        throw new Error("Invalid delivery OTP");
    }

    const delivery =
        DeliveryModel.findByParcel(parcel.id);

    if (!delivery) {
        throw new Error("Delivery not found");
    }

    if (
        delivery.currentStatus !==
        DeliveryStatus.IN_TRANSIT
    ) {
        throw new Error(
            "Delivery is not ready to be completed"
        );
    }

    /*
     * Verify delivery OTP
     */

    ParcelModel.update(parcel.id, {

        deliveryOtpVerified: true,

        updatedAt: now(),

        updatedBy: user.id

    });
    /*
     * Mark parcel delivered
     */

    ParcelModel.changeStatus(
        parcel.id,
        ParcelStatus.DELIVERED
    );

    /*
     * Mark delivery delivered
     */

    DeliveryModel.markDelivered(
        delivery.id,
        location || parcel.drop
    );

    /*
     * Complete booking
     */

    const booking =
        BookingModel.findById(
            parcel.bookingId
        );

    let updatedBooking = null;

    if (booking) {

        updatedBooking =
            BookingModel.complete(
                booking.id
            );

    }

    return {

        parcel:
            ParcelModel.findById(parcel.id),

       delivery:
        delivery
        ? DeliveryModel.findById(delivery.id)
        : null,

        booking:
            updatedBooking

    };

}

static wallet(user) {

    const wallet =
        WalletModel.findByUserId(user.id);

    if (!wallet) {
        throw new Error("Traveller wallet not found");
    }

    const profile =
        TravellerProfileModel.findByUserId(user.id);

    const transactions =
        TransactionModel.findByWallet(wallet.id);

    const successfulCredits =
        transactions.filter(transaction =>
            transaction.type === "CREDIT" &&
            transaction.status === "SUCCESS"
        );

    const totalEarned =
        successfulCredits.reduce(
            (total, transaction) =>
                total + Number(transaction.amount || 0),
            0
        );

    return {

        wallet,

        balance:
            Number(wallet.balance || 0),

        totalEarned,

        completedTrips:
            profile
                ? Number(profile.completedTrips || 0)
                : 0

    };

}

static transactions(user) {

    const wallet =
        WalletModel.findByUserId(user.id);

    if (!wallet) {
        throw new Error("Traveller wallet not found");
    }

    return TransactionModel.findByWallet(
        wallet.id
    );

}
}

module.exports = { TravellerService };