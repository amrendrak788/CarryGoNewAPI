const UserModel = require("../models/UserModel");
const ParcelModel = require("../models/ParcelModel");
const TravellerProfileModel = require("../models/TravellerProfileModel");
const TripModel = require("../models/TripModel");
const BookingModel = require("../models/BookingModel");
const DeliveryModel = require("../models/DeliveryModel");

const { createId } = require("../utils/id");
const { now } = require("../utils/date");
const { ParcelStatus, BookingStatus, DeliveryStatus } = require("../constants/status");
const TransactionModel = require("../models/TransactionModel");
const { generateOtp } = require("../utils/otp");

class CustomerService {

    static dashboard(user) {

        const deliveries = DeliveryModel.find(delivery => {

            const parcel = ParcelModel.findById(delivery.parcelId);

            return parcel && parcel.customerId === user.id;

        });

        const parcels = ParcelModel.findByCustomer(user.id);

        const travellers = TravellerProfileModel.findAvailable();

        return {

            user: CustomerService.safeUser(user),

            stats: {

                booked: parcels.length,

                delivered: parcels.filter(
                    parcel => parcel.status === ParcelStatus.DELIVERED
                ).length,

                active: parcels.filter(
                    parcel =>
                        ![
                            ParcelStatus.DELIVERED,
                            ParcelStatus.CANCELLED
                        ].includes(parcel.status)
                ).length

            },

            travellers,

            deliveries

        };

    }

    static safeUser(user) {

        if (!user) return null;

        const { password, ...safe } = user;

        return safe;

    }

    static createParcel(user, body) {

        if (!body) {

            throw new Error("Parcel data is required");

        }

        const parcel = ParcelModel.create({

            id: createId("par"),

            customerId: user.id,

            travellerId: null,

            bookingId: null,

            title: body.title,

            description: body.description || "",

            senderName: body.senderName || user.name,

            receiverName: body.receiverName,

            receiverMobile: body.receiverMobile || null,

            weight: Number(body.weight),

            weightUnit: body.weightUnit || "KG",

            payout: Number(body.payout),

            currency: body.currency || "INR",

            pickup: {

                address: body.pickup?.address || body.pickup,

                latitude:
                    body.pickup?.latitude !== undefined
                        ? Number(body.pickup.latitude)
                        : null,

                longitude:
                    body.pickup?.longitude !== undefined
                        ? Number(body.pickup.longitude)
                        : null

            },

            drop: {

                address: body.drop?.address || body.drop,

                latitude:
                    body.drop?.latitude !== undefined
                        ? Number(body.drop.latitude)
                        : null,

                longitude:
                    body.drop?.longitude !== undefined
                        ? Number(body.drop.longitude)
                        : null

            },

                    pickupOtp: generateOtp(),

                    pickupOtpVerified: false,

                    deliveryOtp: generateOtp(),

                    deliveryOtpVerified: false,

            status: ParcelStatus.AVAILABLE,

            createdAt: now(),

            updatedAt: now(),

            createdBy: user.id,

            updatedBy: user.id,

            isDeleted: false,

            deletedAt: null

        });

        const delivery = DeliveryModel.create({

            id: createId("del"),

            parcelId: parcel.id,

            bookingId: null,

            currentStatus: DeliveryStatus.BOOKED,

            progress: 10,

            currentLocation: {

                latitude: parcel.pickup.latitude,

                longitude: parcel.pickup.longitude

            },

            lastUpdated: now(),

            history: [

                {

                    status: DeliveryStatus.BOOKED,

                    location: parcel.pickup.address,

                    timestamp: now()

                }

            ]

        });

        return {

            parcel,

            delivery

        };

    }

    static deliveries(user) {

        return DeliveryModel.find(delivery => {

            const parcel =
                ParcelModel.findById(delivery.parcelId);

            return parcel &&
                parcel.customerId === user.id;

        });

    }

    static trackParcel(user, parcelId) {

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
            "You are not authorized to view this parcel"
        );
    }

    const booking =
        parcel.bookingId
            ? BookingModel.findById(parcel.bookingId)
            : null;

    const delivery =
        DeliveryModel.findByParcel(parcel.id);

    const traveller =
        parcel.travellerId
            ? TravellerProfileModel.findByUserId(
                  parcel.travellerId
              )
            : null;

    return {

        parcel: {

            id: parcel.id,

            title: parcel.title,

            senderName: parcel.senderName,

            receiverName: parcel.receiverName,

            pickup: parcel.pickup,

            drop: parcel.drop,

            weight: parcel.weight,

            payout: parcel.payout,

            status: parcel.status,

            createdAt: parcel.createdAt,

            updatedAt: parcel.updatedAt

        },

        booking: booking
            ? {

                id: booking.id,

                status: booking.status,

                travellerId: booking.travellerId,

                requestedAt: booking.requestedAt,

                acceptedAt: booking.acceptedAt,

                completedAt: booking.completedAt

            }
            : null,

        traveller: traveller
            ? {

                id: traveller.id,

                userId: traveller.userId,

                rating: traveller.rating,

                vehicleType: traveller.vehicleType,

                vehicleNumber: traveller.vehicleNumber,

                completedTrips:
                    traveller.completedTrips,

                kycVerified:
                    traveller.kycVerified

            }
            : null,

        delivery: delivery
            ? {

                id: delivery.id,

                state: delivery.state,

                currentStatus:
                    delivery.currentStatus,

                progress:
                    delivery.progress,

                meta:
                    delivery.meta,

                nextAction:
                    delivery.nextAction,

                currentLocation:
                    delivery.currentLocation || null,

                lastUpdated:
                    delivery.lastUpdated,

                history:
                    delivery.history || []

            }
            : null

    };

}
    static bookTraveller(user, travellerId, parcelId, tripId) {

        if (!travellerId) {

            throw new Error("Traveller ID is required");

        }

        if (!parcelId) {

            throw new Error("Parcel ID is required");

        }

        if (!tripId) {

            throw new Error("Trip ID is required");

        }

        const parcel =
            ParcelModel.findById(parcelId);

        if (!parcel) {

            throw new Error("Parcel not found");

        }

        if (parcel.customerId !== user.id) {

            throw new Error(
                "You are not authorized to book this parcel"
            );

        }

        if (parcel.status !== ParcelStatus.AVAILABLE) {

            throw new Error(
                "This parcel is no longer available"
            );

        }

        const traveller =
            TravellerProfileModel.findByUserId(travellerId);

        if (!traveller) {

            throw new Error(
                "Traveller profile not found"
            );

        }

        if (traveller.status !== "AVAILABLE") {

            throw new Error(
                "Traveller is not available"
            );

        }

        if (!traveller.kycVerified) {

            throw new Error(
                "Traveller KYC is not verified"
            );

        }

        const trip =
            TripModel.findById(tripId);

        if (!trip) {

            throw new Error("Trip not found");

        }

        if (trip.travellerId !== travellerId) {

            throw new Error(
                "Trip does not belong to selected traveller"
            );

        }

        if (trip.status !== "ACTIVE") {

            throw new Error(
                "Selected trip is not active"
            );

        }

        if (
            Number(trip.availableWeight) <
            Number(parcel.weight)
        ) {

            throw new Error(
                "Traveller does not have enough available capacity"
            );

        }

        const existingBooking =
            BookingModel.findByParcel(parcel.id);

        if (existingBooking) {

            throw new Error(
                "This parcel already has a booking"
            );

        }

        const booking = BookingModel.create({

            id: createId("book"),

            parcelId: parcel.id,

            tripId: trip.id,

            customerId: user.id,

            travellerId,

            status: BookingStatus.PENDING,

            requestedAt: now(),

            acceptedAt: null,

            rejectedAt: null,

            cancelledAt: null,

            completedAt: null,

            createdAt: now(),

            updatedAt: now()

        });
const holdTransaction =
    TransactionModel.findOne(transaction =>
        transaction.parcelId === parcel.id &&
        transaction.type === "HOLD" &&
        transaction.status === "SUCCESS"
    );

if (!holdTransaction) {

    throw new Error(
        "Payment hold not found for this parcel"
    );

}

TransactionModel.update(
    holdTransaction.id,
    {
        bookingId: booking.id,
        updatedAt: now()
    }
);
        ParcelModel.update(parcel.id, {

            bookingId: booking.id,

            travellerId,

            status: ParcelStatus.BOOKED,

            updatedAt: now(),

            updatedBy: user.id

        });

        DeliveryModel.update(
            DeliveryModel.findByParcel(parcel.id).id,
            {

                bookingId: booking.id,

                currentStatus: DeliveryStatus.BOOKED,

                lastUpdated: now()

            }
        );

        return {

            booking,

            parcel: ParcelModel.findById(parcel.id),

            delivery: DeliveryModel.findByParcel(parcel.id)

        };

    }
static parcels(user) {

    const parcels =
        ParcelModel.find(parcel =>
            parcel.customerId === user.id
        );

    return parcels.map(parcel => {

        const booking =
            parcel.bookingId
                ? BookingModel.findById(parcel.bookingId)
                : null;

        const delivery =
            DeliveryModel.findByParcel(parcel.id);

        const traveller =
            parcel.travellerId
                ? TravellerProfileModel.findByUserId(
                      parcel.travellerId
                  )
                : null;

        return {

            parcel: {

                id: parcel.id,

                title: parcel.title,

                senderName: parcel.senderName,

                receiverName: parcel.receiverName,

                pickup: parcel.pickup,

                drop: parcel.drop,

                weight: parcel.weight,

                payout: parcel.payout,

                status: parcel.status,

                createdAt: parcel.createdAt,

                updatedAt: parcel.updatedAt

            },

            booking: booking
                ? {

                    id: booking.id,

                    status: booking.status,

                    travellerId:
                        booking.travellerId,

                    requestedAt:
                        booking.requestedAt,

                    acceptedAt:
                        booking.acceptedAt,

                    completedAt:
                        booking.completedAt

                }
                : null,

            traveller: traveller
                ? {

                    id: traveller.id,

                    rating: traveller.rating,

                    vehicleType:
                        traveller.vehicleType,

                    vehicleNumber:
                        traveller.vehicleNumber,

                    completedTrips:
                        traveller.completedTrips,

                    kycVerified:
                        traveller.kycVerified

                }
                : null,

            delivery: delivery
                ? {

                    id: delivery.id,

                    state: delivery.state,

                    currentStatus:
                        delivery.currentStatus,

                    progress:
                        delivery.progress,

                    meta: delivery.meta,

                    nextAction:
                        delivery.nextAction,

                    lastUpdated:
                        delivery.lastUpdated

                }
                : null

        };

    });

}
static cancelBooking(user, bookingId) {

    if (!bookingId) {
        throw new Error("Booking ID is required");
    }

    const booking =
        BookingModel.findById(bookingId);

    if (!booking) {
        throw new Error("Booking not found");
    }

    if (booking.customerId !== user.id) {
        throw new Error(
            "You are not authorized to cancel this booking"
        );
    }

    if (
        booking.status !== BookingStatus.PENDING &&
        booking.status !== BookingStatus.ACCEPTED
    ) {
        throw new Error(
            "Booking cannot be cancelled now"
        );
    }

    const parcel =
        ParcelModel.findById(booking.parcelId);

    if (!parcel) {
        throw new Error("Parcel not found");
    }

    /*
     * Refund customer's held payment
     */

    const holdTransaction =
        TransactionModel.findOne(transaction =>
            transaction.parcelId === parcel.id &&
            transaction.type === "HOLD" &&
            transaction.status === "SUCCESS"
        );

    if (!holdTransaction) {
        throw new Error(
            "Payment hold not found for this booking"
        );
    }

    const WalletModel =
        require("../models/WalletModel");

    const wallet =
        WalletModel.findByUserId(
            booking.customerId
        );

    if (!wallet) {
        throw new Error("Customer wallet not found");
    }

    const amount =
        Number(holdTransaction.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Invalid refund amount");
    }

    /*
     * Refund HOLD
     *
     * balance     + amount
     * holdBalance - amount
     */

    const updatedWallet =
        WalletModel.refundHold(
            booking.customerId,
            amount
        );

    /*
     * Create REFUND transaction
     */

    const refundTransaction =
        TransactionModel.createTransaction({

            id: `txn_${Date.now()}`,

            walletId: updatedWallet.id,

            parcelId: booking.parcelId,

            bookingId: booking.id,

            amount,

            paymentMethod: "WALLET",

            type: "REFUND",

            status: "SUCCESS"

        });

    /*
     * Mark booking cancelled
     */

    const updatedBooking =
        BookingModel.update(
            booking.id,
            {

                status: BookingStatus.CANCELLED,

                cancelledAt: now(),

                updatedAt: now()

            }
        );

    /*
     * Make parcel available again
     */

    const updatedParcel =
        ParcelModel.update(
            parcel.id,
            {

                travellerId: null,

                bookingId: null,

                status: ParcelStatus.AVAILABLE,

                updatedAt: now(),

                updatedBy: user.id

            }
        );

    /*
     * Reset delivery
     */

    const delivery =
        DeliveryModel.findByParcel(
            parcel.id
        );

    if (delivery) {

        DeliveryModel.update(
            delivery.id,
            {

                bookingId: null,

                currentStatus:
                    DeliveryStatus.CANCELLED,

                state: "CANCELLED",

                nextAction: "BOOK_TRAVELLER",

                progress: 0,

                meta: "Customer cancelled booking",

                lastUpdated: now()

            }
        );

    }

    return {

        booking: updatedBooking,

        parcel: updatedParcel,

        wallet:
            WalletModel.findByUserId(
                booking.customerId
            ),

        transaction: refundTransaction

    };

}

static receipt(user, parcelId) {

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
            "You are not authorized to view this receipt"
        );
    }

    if (parcel.status !== ParcelStatus.DELIVERED) {
        throw new Error(
            "Receipt is available only after delivery"
        );
    }

    const booking =
        parcel.bookingId
            ? BookingModel.findById(parcel.bookingId)
            : null;

    if (!booking) {
        throw new Error("Booking not found");
    }

    if (booking.status !== BookingStatus.COMPLETED) {
        throw new Error(
            "Booking is not completed"
        );
    }

    const delivery =
        DeliveryModel.findByParcel(parcel.id);

    if (!delivery) {
        throw new Error("Delivery not found");
    }

    const traveller =
        parcel.travellerId
            ? TravellerProfileModel.findByUserId(
                  parcel.travellerId
              )
            : null;

    const transaction =
        TransactionModel.findSuccessfulByBooking(
            booking.id
        );

    return {

        receipt: {

            receiptId:
                `receipt_${booking.id}`,

            bookingId:
                booking.id,

            parcelId:
                parcel.id,

            status:
                "COMPLETED",

            generatedAt:
                now()

        },

        parcel: {

            title:
                parcel.title,

            senderName:
                parcel.senderName,

            receiverName:
                parcel.receiverName,

            pickup:
                parcel.pickup,

            drop:
                parcel.drop,

            weight:
                parcel.weight,

            payout:
                parcel.payout

        },

        traveller: traveller
            ? {

                name:
                    traveller.name ||
                    null,

                rating:
                    traveller.rating,

                vehicleType:
                    traveller.vehicleType,

                vehicleNumber:
                    traveller.vehicleNumber,

                kycVerified:
                    traveller.kycVerified

            }
            : null,

        delivery: {

            status:
                delivery.currentStatus,

            deliveredAt:
                booking.completedAt,

            progress:
                delivery.progress,

            history:
                delivery.history || []

        },

        payment: transaction
            ? {

                amount:
                    transaction.amount,

                type:
                    transaction.type,

                status:
                    transaction.status,

                transactionId:
                    transaction.id,

                createdAt:
                    transaction.createdAt

            }
            : null

    };

}
}

module.exports = { CustomerService };