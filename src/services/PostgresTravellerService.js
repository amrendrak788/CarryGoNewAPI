const PostgresTravellerProfileModel =
require("../models/PostgresTravellerProfileModel");

const PostgresTripModel =
require("../models/PostgresTripModel");

const PostgresBookingModel =
require("../models/PostgresBookingModel");

const PostgresParcelModel =
require("../models/PostgresParcelModel");

const PostgresDeliveryModel =
require("../models/PostgresDeliveryModel");
const PostgresWalletModel =
require("../models/PostgresWalletModel");

const PostgresTransactionModel =
require("../models/PostgresTransactionModel");
const { pool } =
require("../database/postgres");
const { PostgresPaymentService } =
require("./PostgresPaymentService");
const { now } =
require("../utils/date");

const {
    BookingStatus,
    ParcelStatus,
    DeliveryStatus
} = require("../constants/status");

class PostgresTravellerService {

    static async dashboard(user) {

        const profile =
            await PostgresTravellerProfileModel.findByUserId(
                user.id
            );

        if (!profile) {
            throw new Error(
                "Traveller profile not found"
            );
        }


        const bookings =
            await PostgresBookingModel.findByTraveller(
                user.id
            );


        const trips =
            await PostgresTripModel.findByTraveller(
                user.id
            );


        const activeTrips =
            trips.filter(
                trip =>
                    trip.status === "ACTIVE"
            );


        const pendingBookings =
            bookings.filter(
                booking =>
                    booking.status ===
                    BookingStatus.PENDING
            );


        const acceptedBookings =
            bookings.filter(
                booking =>
                    booking.status ===
                    BookingStatus.ACCEPTED
            );


        return {

            profile,

            stats: {

                totalTrips:
                    trips.length,

                activeTrips:
                    activeTrips.length,

                pendingBookings:
                    pendingBookings.length,

                acceptedBookings:
                    acceptedBookings.length,

                completedTrips:
                    Number(
                        profile.completedTrips || 0
                    )

            },

            trips,

            pendingBookings,

            acceptedBookings

        };

    }


    static async bookings(user) {

        return PostgresBookingModel.findByTraveller(
            user.id
        );

    }


    static async pendingBookings(user) {

        const bookings =
            await PostgresBookingModel.findByTraveller(
                user.id
            );

        return bookings.filter(
            booking =>
                booking.status ===
                BookingStatus.PENDING
        );

    }

    static async acceptBooking(user, bookingId) {

    if (!bookingId) {
        throw new Error(
            "Booking ID is required"
        );
    }

    const client =
        await pool.connect();

    try {

        await client.query("BEGIN");


        /*
         * -----------------------------------------
         * 1. LOCK BOOKING
         * -----------------------------------------
         */

        const bookingResult =
            await client.query(
                `
                SELECT *
                FROM bookings
                WHERE id = $1
                FOR UPDATE
                `,
                [bookingId]
            );

        const booking =
            bookingResult.rows[0];

        if (!booking) {
            throw new Error(
                "Booking not found"
            );
        }


        /*
         * Traveller authorization
         */

        if (
            booking.traveller_id !==
            user.id
        ) {
            throw new Error(
                "You are not authorized to accept this booking"
            );
        }


        /*
         * Booking must be pending
         */

        if (
            booking.status !==
            BookingStatus.PENDING
        ) {
            throw new Error(
                "Booking is no longer pending"
            );
        }


        /*
         * -----------------------------------------
         * 2. LOCK PARCEL
         * -----------------------------------------
         */

        const parcelResult =
            await client.query(
                `
                SELECT *
                FROM parcels
                WHERE id = $1
                FOR UPDATE
                `,
                [booking.parcel_id]
            );

        const parcel =
            parcelResult.rows[0];

        if (!parcel) {
            throw new Error(
                "Parcel not found"
            );
        }


        /*
         * -----------------------------------------
         * 3. LOCK TRIP
         * -----------------------------------------
         */

        const tripResult =
            await client.query(
                `
                SELECT *
                FROM trips
                WHERE id = $1
                FOR UPDATE
                `,
                [booking.trip_id]
            );

        const trip =
            tripResult.rows[0];

        if (!trip) {
            throw new Error(
                "Trip not found"
            );
        }


        /*
         * Trip ownership
         */

        if (
            trip.traveller_id !==
            user.id
        ) {
            throw new Error(
                "Trip does not belong to this traveller"
            );
        }


        /*
         * Trip must be active
         */

        if (
            trip.status !== "ACTIVE"
        ) {
            throw new Error(
                "Trip is not active"
            );
        }


        /*
         * -----------------------------------------
         * 4. CHECK CAPACITY
         * -----------------------------------------
         */

        const parcelWeight =
            Number(parcel.weight);

        const availableWeight =
            Number(trip.available_weight);

        if (
            !Number.isFinite(parcelWeight) ||
            parcelWeight <= 0
        ) {
            throw new Error(
                "Invalid parcel weight"
            );
        }

        if (
            availableWeight <
            parcelWeight
        ) {
            throw new Error(
                "Trip does not have enough available capacity"
            );
        }


        /*
         * -----------------------------------------
         * 5. ACCEPT BOOKING
         * -----------------------------------------
         */

        const currentTime =
            now();

        const updatedBookingResult =
            await client.query(
                `
                UPDATE bookings
                SET
                    status = $1,
                    accepted_at = $2,
                    updated_at = $2
                WHERE id = $3
                RETURNING *
                `,
                [
                    BookingStatus.ACCEPTED,
                    currentTime,
                    bookingId
                ]
            );


        /*
         * -----------------------------------------
         * 6. ACCEPT PARCEL
         * -----------------------------------------
         */

        const updatedParcelResult =
            await client.query(
                `
                UPDATE parcels
                SET
                    status = $1,
                    updated_at = $2,
                    updated_by = $3
                WHERE id = $4
                RETURNING *
                `,
                [
                    ParcelStatus.ACCEPTED,
                    currentTime,
                    user.id,
                    parcel.id
                ]
            );


        /*
         * -----------------------------------------
         * 7. DECREASE TRIP CAPACITY
         * -----------------------------------------
         */

        const newAvailableWeight =
            availableWeight -
            parcelWeight;

        const updatedTripResult =
            await client.query(
                `
                UPDATE trips
                SET
                    available_weight = $1,
                    updated_at = $2
                WHERE id = $3
                RETURNING *
                `,
                [
                    newAvailableWeight,
                    currentTime,
                    trip.id
                ]
            );


        /*
         * -----------------------------------------
         * 8. FIND DELIVERY
         * -----------------------------------------
         */

        const deliveryResult =
            await client.query(
                `
                SELECT *
                FROM deliveries
                WHERE booking_id = $1
                   OR parcel_id = $2
                LIMIT 1
                FOR UPDATE
                `,
                [
                    bookingId,
                    parcel.id
                ]
            );

        const delivery =
            deliveryResult.rows[0];


        let updatedDelivery = null;


        if (delivery) {

            /*
             * -----------------------------------------
             * ACCEPT DELIVERY
             * -----------------------------------------
             */

            const updatedDeliveryResult =
                await client.query(
                    `
                    UPDATE deliveries
                    SET
                        booking_id = $1,
                        current_status = $2,
                        state = $2,
                        progress = 20,
                        next_action = 'VERIFY_PICKUP',
                        meta = 'Traveller accepted booking',
                        last_updated = $3
                    WHERE id = $4
                    RETURNING *
                    `,
                    [
                        bookingId,
                        DeliveryStatus.ACCEPTED,
                        currentTime,
                        delivery.id
                    ]
                );

            updatedDelivery =
                updatedDeliveryResult.rows[0];


            /*
             * -----------------------------------------
             * DELIVERY HISTORY
             * -----------------------------------------
             */

            await client.query(
                `
                INSERT INTO delivery_history
                (
                    delivery_id,
                    status,
                    location_text,
                    latitude,
                    longitude,
                    event_time
                )
                VALUES
                ($1, $2, NULL, NULL, NULL, $3)
                `,
                [
                    delivery.id,
                    DeliveryStatus.ACCEPTED,
                    currentTime
                ]
            );

        }


        /*
         * -----------------------------------------
         * COMMIT
         * -----------------------------------------
         */

        await client.query(
            "COMMIT"
        );


        /*
         * Return using PostgreSQL models
         */

        return {

            booking:
                await PostgresBookingModel.findById(
                    bookingId
                ),

            parcel:
                await PostgresParcelModel.findById(
                    parcel.id
                ),

            trip:
                await PostgresTripModel.findById(
                    trip.id
                ),

            delivery:
                updatedDelivery
                    ? await PostgresDeliveryModel.findById(
                          delivery.id
                      )
                    : null

        };

    } catch (err) {

        await client.query(
            "ROLLBACK"
        );

        throw err;

    } finally {

        client.release();

    }

}

static async verifyPickupOtp(user, parcelId, otp) {

    if (!parcelId) {
        throw new Error(
            "Parcel ID is required"
        );
    }

    if (!otp) {
        throw new Error(
            "Pickup OTP is required"
        );
    }

    const client =
        await pool.connect();

    try {

        await client.query(
            "BEGIN"
        );


        /*
         * -----------------------------------------
         * 1. LOCK PARCEL
         * -----------------------------------------
         */

        const parcelResult =
            await client.query(
                `
                SELECT *
                FROM parcels
                WHERE id = $1
                FOR UPDATE
                `,
                [parcelId]
            );

        const parcel =
            parcelResult.rows[0];

        if (!parcel) {
            throw new Error(
                "Parcel not found"
            );
        }


        /*
         * -----------------------------------------
         * 2. TRAVELLER AUTHORIZATION
         * -----------------------------------------
         */

        if (
            parcel.traveller_id !==
            user.id
        ) {
            throw new Error(
                "You are not authorized to pick up this parcel"
            );
        }


        /*
         * -----------------------------------------
         * 3. PARCEL STATUS
         * -----------------------------------------
         */

        if (
            parcel.status !==
            ParcelStatus.ACCEPTED
        ) {
            throw new Error(
                "Parcel is not ready for pickup"
            );
        }


        /*
         * -----------------------------------------
         * 4. OTP ALREADY VERIFIED
         * -----------------------------------------
         */

        if (
            parcel.pickup_otp_verified === true
        ) {
            throw new Error(
                "Pickup OTP already verified"
            );
        }


        /*
         * -----------------------------------------
         * 5. VERIFY OTP
         * -----------------------------------------
         */

        if (
            String(parcel.pickup_otp) !==
            String(otp)
        ) {
            throw new Error(
                "Invalid pickup OTP"
            );
        }


        /*
         * -----------------------------------------
         * 6. LOCK DELIVERY
         * -----------------------------------------
         */

        const deliveryResult =
            await client.query(
                `
                SELECT *
                FROM deliveries
                WHERE parcel_id = $1
                LIMIT 1
                FOR UPDATE
                `,
                [parcel.id]
            );

        const delivery =
            deliveryResult.rows[0];

        if (!delivery) {
            throw new Error(
                "Delivery not found"
            );
        }


        /*
         * -----------------------------------------
         * 7. VERIFY PICKUP OTP
         * -----------------------------------------
         */

        const currentTime =
            now();

        const updatedParcelResult =
            await client.query(
                `
                UPDATE parcels
                SET
                    pickup_otp_verified = true,
                    status = $1,
                    updated_at = $2,
                    updated_by = $3
                WHERE id = $4
                RETURNING *
                `,
                [
                    ParcelStatus.PICKED_UP,
                    currentTime,
                    user.id,
                    parcel.id
                ]
            );

        const updatedParcel =
            updatedParcelResult.rows[0];


        /*
         * -----------------------------------------
         * 8. UPDATE DELIVERY
         * -----------------------------------------
         */

        const updatedDeliveryResult =
            await client.query(
                `
                UPDATE deliveries
                SET
                    current_status = $1,
                    state = $1,
                    progress = 50,
                    next_action = 'MARK_IN_TRANSIT',
                    meta = 'Parcel picked up',
                    last_updated = $2
                WHERE id = $3
                RETURNING *
                `,
                [
                    DeliveryStatus.PICKED_UP,
                    currentTime,
                    delivery.id
                ]
            );

        const updatedDelivery =
            updatedDeliveryResult.rows[0];


        /*
         * -----------------------------------------
         * 9. DELIVERY HISTORY
         * -----------------------------------------
         */

        await client.query(
            `
            INSERT INTO delivery_history
            (
                delivery_id,
                status,
                location_text,
                latitude,
                longitude,
                event_time
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6
            )
            `,
            [
                delivery.id,
                DeliveryStatus.PICKED_UP,
                parcel.pickup_address || null,
                parcel.pickup_latitude || null,
                parcel.pickup_longitude || null,
                currentTime
            ]
        );


        /*
         * -----------------------------------------
         * 10. COMMIT
         * -----------------------------------------
         */

        await client.query(
            "COMMIT"
        );


        /*
         * -----------------------------------------
         * 11. RETURN POSTGRESQL MODELS
         * -----------------------------------------
         */

        return {

            parcel:
                await PostgresParcelModel.findById(
                    parcel.id
                ),

            delivery:
                await PostgresDeliveryModel.findById(
                    delivery.id
                )

        };

    } catch (err) {

        await client.query(
            "ROLLBACK"
        );

        throw err;

    } finally {

        client.release();

    }

}

static async markInTransit(
    user,
    parcelId,
    location = null
) {

    if (!parcelId) {
        throw new Error(
            "Parcel ID is required"
        );
    }

    const client =
        await pool.connect();

    try {

        await client.query(
            "BEGIN"
        );


        /*
         * -----------------------------------------
         * 1. LOCK PARCEL
         * -----------------------------------------
         */

        const parcelResult =
            await client.query(
                `
                SELECT *
                FROM parcels
                WHERE id = $1
                FOR UPDATE
                `,
                [parcelId]
            );

        const parcel =
            parcelResult.rows[0];

        if (!parcel) {

            throw new Error(
                "Parcel not found"
            );

        }


        /*
         * -----------------------------------------
         * 2. TRAVELLER AUTHORIZATION
         * -----------------------------------------
         */

        if (
            parcel.traveller_id !==
            user.id
        ) {

            throw new Error(
                "You are not authorized to mark this parcel in transit"
            );

        }


        /*
         * -----------------------------------------
         * 3. LOCATION
         *
         * Body:
         *
         * {
         *     "location": {
         *         "address": "Ara, Bihar",
         *         "latitude": 25.3400,
         *         "longitude": 84.5200
         *     }
         * }
         *
         * Location optional.
         * -----------------------------------------
         */

        let locationText = null;
        let latitude = null;
        let longitude = null;


        if (location) {

            /*
             * ADDRESS
             */

            if (
                location.address !== undefined &&
                location.address !== null
            ) {

                locationText =
                    String(
                        location.address
                    ).trim();

                if (
                    locationText.length === 0
                ) {

                    locationText = null;

                }

            }


            /*
             * LATITUDE
             */

            if (
                location.latitude !== undefined &&
                location.latitude !== null
            ) {

                latitude =
                    Number(
                        location.latitude
                    );

            }


            /*
             * LONGITUDE
             */

            if (
                location.longitude !== undefined &&
                location.longitude !== null
            ) {

                longitude =
                    Number(
                        location.longitude
                    );

            }


            /*
             * If location object is supplied,
             * coordinates must be valid.
             */

            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {

                throw new Error(
                    "Invalid location coordinates"
                );

            }


            /*
             * LATITUDE RANGE
             */

            if (
                latitude < -90 ||
                latitude > 90
            ) {

                throw new Error(
                    "Invalid latitude"
                );

            }


            /*
             * LONGITUDE RANGE
             */

            if (
                longitude < -180 ||
                longitude > 180
            ) {

                throw new Error(
                    "Invalid longitude"
                );

            }

        }


        /*
         * -----------------------------------------
         * 4. PARCEL STATUS
         *
         * PICKED_UP -> IN_TRANSIT
         *
         * IN_TRANSIT -> IN_TRANSIT
         *
         * This allows traveller to update
         * location multiple times.
         * -----------------------------------------
         */

        if (
            parcel.status !==
            ParcelStatus.PICKED_UP &&
            parcel.status !==
            ParcelStatus.IN_TRANSIT
        ) {

            throw new Error(
                "Parcel must be picked up before marking in transit"
            );

        }


        /*
         * -----------------------------------------
         * 5. LOCK DELIVERY
         * -----------------------------------------
         */

        const deliveryResult =
            await client.query(
                `
                SELECT *
                FROM deliveries
                WHERE parcel_id = $1
                LIMIT 1
                FOR UPDATE
                `,
                [parcel.id]
            );

        const delivery =
            deliveryResult.rows[0];

        if (!delivery) {

            throw new Error(
                "Delivery not found"
            );

        }


        /*
         * -----------------------------------------
         * 6. DELIVERY STATUS
         *
         * PICKED_UP -> IN_TRANSIT
         *
         * IN_TRANSIT -> IN_TRANSIT
         *
         * Multiple location updates allowed.
         * -----------------------------------------
         */

        if (
            delivery.current_status !==
            DeliveryStatus.PICKED_UP &&
            delivery.current_status !==
            DeliveryStatus.IN_TRANSIT
        ) {

            throw new Error(
                "Delivery must be picked up before marking in transit"
            );

        }


        /*
         * -----------------------------------------
         * 7. CURRENT TIME
         * -----------------------------------------
         */

        const currentTime =
            now();


        /*
         * -----------------------------------------
         * 8. UPDATE PARCEL
         * -----------------------------------------
         */

        const updatedParcelResult =
            await client.query(
                `
                UPDATE parcels
                SET
                    status = $1,
                    updated_at = $2,
                    updated_by = $3
                WHERE id = $4
                RETURNING *
                `,
                [
                    ParcelStatus.IN_TRANSIT,
                    currentTime,
                    user.id,
                    parcel.id
                ]
            );

        const updatedParcel =
            updatedParcelResult.rows[0];


        /*
         * -----------------------------------------
         * 9. UPDATE DELIVERY STATUS ONLY
         *
         * NO current_location COLUMN
         *
         * Latest location is maintained through
         * delivery_history.
         * -----------------------------------------
         */

        const updatedDeliveryResult =
            await client.query(
                `
                UPDATE deliveries
                SET
                    current_status = $1,
                    state = $1,
                    progress = 75,
                    next_action = 'MARK_DELIVERED',
                    meta = 'Parcel is in transit',
                    last_updated = $2
                WHERE id = $3
                RETURNING *
                `,
                [
                    DeliveryStatus.IN_TRANSIT,
                    currentTime,
                    delivery.id
                ]
            );

        const updatedDelivery =
            updatedDeliveryResult.rows[0];


        /*
         * -----------------------------------------
         * 10. SAVE LOCATION HISTORY
         *
         * Every IN_TRANSIT API call creates
         * a new history record.
         *
         * address  -> location_text
         * latitude -> latitude
         * longitude -> longitude
         * -----------------------------------------
         */

        await client.query(
            `
            INSERT INTO delivery_history
            (
                delivery_id,
                status,
                location_text,
                latitude,
                longitude,
                event_time
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6
            )
            `,
            [
                delivery.id,
                DeliveryStatus.IN_TRANSIT,
                locationText,
                latitude,
                longitude,
                currentTime
            ]
        );


        /*
         * -----------------------------------------
         * 11. COMMIT
         * -----------------------------------------
         */

        await client.query(
            "COMMIT"
        );


        /*
         * -----------------------------------------
         * 12. RETURN UPDATED DATA
         * -----------------------------------------
         */

        return {

            parcel:
                await PostgresParcelModel.findById(
                    updatedParcel.id
                ),

            delivery:
                await PostgresDeliveryModel.findById(
                    updatedDelivery.id
                )

        };

    } catch (err) {

        try {

            await client.query(
                "ROLLBACK"
            );

        } catch (rollbackError) {

            console.error(
                "IN_TRANSIT rollback failed:",
                rollbackError
            );

        }

        throw err;

    } finally {

        client.release();

    }

}
static async verifyDeliveryOtp(user, parcelId, otp) {

    if (!parcelId) {
        throw new Error(
            "Parcel ID is required"
        );
    }

    if (!otp) {
        throw new Error(
            "Delivery OTP is required"
        );
    }

    const client =
        await pool.connect();

    try {

        await client.query(
            "BEGIN"
        );


        /*
         * -----------------------------------------
         * 1. LOCK PARCEL
         * -----------------------------------------
         */

        const parcelResult =
            await client.query(
                `
                SELECT *
                FROM parcels
                WHERE id = $1
                FOR UPDATE
                `,
                [parcelId]
            );

        const parcel =
            parcelResult.rows[0];

        if (!parcel) {
            throw new Error(
                "Parcel not found"
            );
        }


        /*
         * -----------------------------------------
         * 2. TRAVELLER AUTHORIZATION
         * -----------------------------------------
         */

        if (
            parcel.traveller_id !==
            user.id
        ) {
            throw new Error(
                "You are not authorized to deliver this parcel"
            );
        }


        /*
         * -----------------------------------------
         * 3. PARCEL STATUS
         * -----------------------------------------
         */

        if (
            parcel.status !==
            ParcelStatus.IN_TRANSIT
        ) {
            throw new Error(
                "Parcel must be in transit before delivery"
            );
        }


        /*
         * -----------------------------------------
         * 4. OTP ALREADY VERIFIED
         * -----------------------------------------
         */

        if (
            parcel.delivery_otp_verified === true
        ) {
            throw new Error(
                "Delivery OTP already verified"
            );
        }


        /*
         * -----------------------------------------
         * 5. VERIFY DELIVERY OTP
         * -----------------------------------------
         */

        if (
            String(parcel.delivery_otp) !==
            String(otp)
        ) {
            throw new Error(
                "Invalid delivery OTP"
            );
        }


        /*
         * -----------------------------------------
         * 6. LOCK BOOKING
         * -----------------------------------------
         */

        const bookingResult =
            await client.query(
                `
                SELECT *
                FROM bookings
                WHERE id = $1
                FOR UPDATE
                `,
                [parcel.booking_id]
            );

        const booking =
            bookingResult.rows[0];

        if (!booking) {
            throw new Error(
                "Booking not found"
            );
        }


        /*
         * -----------------------------------------
         * 7. BOOKING VALIDATION
         * -----------------------------------------
         */

        if (
            booking.traveller_id !==
            user.id
        ) {
            throw new Error(
                "Booking traveller mismatch"
            );
        }


        /*
         * -----------------------------------------
         * 8. LOCK DELIVERY
         * -----------------------------------------
         */

        const deliveryResult =
            await client.query(
                `
                SELECT *
                FROM deliveries
                WHERE parcel_id = $1
                LIMIT 1
                FOR UPDATE
                `,
                [parcel.id]
            );

        const delivery =
            deliveryResult.rows[0];

        if (!delivery) {
            throw new Error(
                "Delivery not found"
            );
        }


        /*
         * -----------------------------------------
         * 9. DELIVERY STATUS VALIDATION
         * -----------------------------------------
         */

        if (
            delivery.current_status !==
            DeliveryStatus.IN_TRANSIT
        ) {
            throw new Error(
                "Delivery must be in transit before completion"
            );
        }


        /*
         * -----------------------------------------
         * 10. CURRENT TIME
         * -----------------------------------------
         */

        const currentTime =
            now();


        /*
         * -----------------------------------------
         * 11. UPDATE PARCEL
         * -----------------------------------------
         */

        const updatedParcelResult =
            await client.query(
                `
                UPDATE parcels
                SET
                    delivery_otp_verified = true,
                    status = $1,
                    updated_at = $2,
                    updated_by = $3
                WHERE id = $4
                RETURNING *
                `,
                [
                    ParcelStatus.DELIVERED,
                    currentTime,
                    user.id,
                    parcel.id
                ]
            );

        const updatedParcel =
            updatedParcelResult.rows[0];


        /*
         * -----------------------------------------
         * 12. UPDATE BOOKING
         * -----------------------------------------
         */

        const updatedBookingResult =
            await client.query(
                `
                UPDATE bookings
                SET
                    status = $1,
                    completed_at = $2,
                    updated_at = $2
                WHERE id = $3
                RETURNING *
                `,
                [
                    BookingStatus.COMPLETED,
                    currentTime,
                    booking.id
                ]
            );

        const updatedBooking =
            updatedBookingResult.rows[0];


        /*
         * -----------------------------------------
         * 13. UPDATE DELIVERY
         * -----------------------------------------
         */

        const updatedDeliveryResult =
            await client.query(
                `
                UPDATE deliveries
                SET
                    current_status = $1,
                    state = $1,
                    progress = 100,
                    next_action = 'VIEW_RECEIPT',
                    meta = 'Parcel delivered',
                    last_updated = $2
                WHERE id = $3
                RETURNING *
                `,
                [
                    DeliveryStatus.DELIVERED,
                    currentTime,
                    delivery.id
                ]
            );

        const updatedDelivery =
            updatedDeliveryResult.rows[0];


        /*
         * -----------------------------------------
         * 14. DELIVERY HISTORY
         * -----------------------------------------
         */

        await client.query(
            `
            INSERT INTO delivery_history
            (
                delivery_id,
                status,
                location_text,
                latitude,
                longitude,
                event_time
            )
            VALUES
            (
                $1,
                $2,
                NULL,
                NULL,
                NULL,
                $3
            )
            `,
            [
                delivery.id,
                DeliveryStatus.DELIVERED,
                currentTime
            ]
        );


        /*
         * -----------------------------------------
         * 15. COMMIT DELIVERY STATE
         * -----------------------------------------
         */

        await client.query(
            "COMMIT"
        );


        /*
         * -----------------------------------------
         * 16. SETTLE PAYMENT
         *
         * Payment service has its own
         * transaction, so call it AFTER
         * this transaction has committed.
         * -----------------------------------------
         */

        const paymentResult =
            await PostgresPaymentService.settlePayment(
                parcel.id,
                booking.id
            );


        /*
         * -----------------------------------------
         * 17. RETURN
         * -----------------------------------------
         */

        return {

            booking:
                await PostgresBookingModel.findById(
                    updatedBooking.id
                ),

            parcel:
                await PostgresParcelModel.findById(
                    updatedParcel.id
                ),

            delivery:
                await PostgresDeliveryModel.findById(
                    updatedDelivery.id
                ),

            payment:
                paymentResult

        };


    } catch (err) {

        try {

            await client.query(
                "ROLLBACK"
            );

        } catch (rollbackError) {

            console.error(
                "Delivery OTP rollback failed:",
                rollbackError
            );
        }

        throw err;

    } finally {

        client.release();

    }
}

static async rejectBooking(user, bookingId) {

    if (!bookingId) {
        throw new Error(
            "Booking ID is required"
        );
    }

    const client =
        await pool.connect();

    try {

        await client.query("BEGIN");


        /*
         * -----------------------------------------
         * 1. LOCK BOOKING
         * -----------------------------------------
         */

        const bookingResult =
            await client.query(
                `
                SELECT *
                FROM bookings
                WHERE id = $1
                FOR UPDATE
                `,
                [bookingId]
            );

        const booking =
            bookingResult.rows[0];

        if (!booking) {
            throw new Error(
                "Booking not found"
            );
        }


        /*
         * Traveller authorization
         */

        if (
            booking.traveller_id !==
            user.id
        ) {
            throw new Error(
                "You are not authorized to reject this booking"
            );
        }


        /*
         * Booking must be pending
         */

        if (
            booking.status !==
            BookingStatus.PENDING
        ) {
            throw new Error(
                "Booking is no longer pending"
            );
        }


        /*
         * -----------------------------------------
         * 2. LOCK PARCEL
         * -----------------------------------------
         */

        const parcelResult =
            await client.query(
                `
                SELECT *
                FROM parcels
                WHERE id = $1
                FOR UPDATE
                `,
                [booking.parcel_id]
            );

        const parcel =
            parcelResult.rows[0];

        if (!parcel) {
            throw new Error(
                "Parcel not found"
            );
        }


        /*
         * -----------------------------------------
         * 3. REJECT BOOKING
         * -----------------------------------------
         */

        const currentTime =
            now();

        const updatedBookingResult =
            await client.query(
                `
                UPDATE bookings
                SET
                    status = $1,
                    rejected_at = $2,
                    updated_at = $2
                WHERE id = $3
                RETURNING *
                `,
                [
                    BookingStatus.REJECTED,
                    currentTime,
                    bookingId
                ]
            );

        const updatedBooking =
            updatedBookingResult.rows[0];


        /*
         * -----------------------------------------
         * 4. RETURN PARCEL TO AVAILABLE
         * -----------------------------------------
         */

        const updatedParcelResult =
            await client.query(
                `
                UPDATE parcels
                SET
                    traveller_id = NULL,
                    booking_id = NULL,
                    status = 'AVAILABLE',
                    updated_at = $1,
                    updated_by = $2
                WHERE id = $3
                RETURNING *
                `,
                [
                    currentTime,
                    user.id,
                    parcel.id
                ]
            );

        const updatedParcel =
            updatedParcelResult.rows[0];


        /*
         * -----------------------------------------
         * 5. FIND DELIVERY
         * -----------------------------------------
         */

        const deliveryResult =
            await client.query(
                `
                SELECT *
                FROM deliveries
                WHERE parcel_id = $1
                FOR UPDATE
                `,
                [parcel.id]
            );

        const delivery =
            deliveryResult.rows[0];


        let updatedDelivery =
            null;


        /*
         * -----------------------------------------
         * 6. UPDATE DELIVERY
         * -----------------------------------------
         */

        if (delivery) {

            const deliveryUpdateResult =
                await client.query(
                    `
                    UPDATE deliveries
                    SET
                        booking_id = NULL,
                        current_status = 'CANCELLED',
                        progress = 0,
                        state = 'CANCELLED',
                        next_action = 'BOOK_TRAVELLER',
                        meta = 'Traveller rejected booking',
                        last_updated = $1
                    WHERE id = $2
                    RETURNING *
                    `,
                    [
                        currentTime,
                        delivery.id
                    ]
                );

            updatedDelivery =
                deliveryUpdateResult.rows[0];


            /*
             * -----------------------------------------
             * 7. DELIVERY HISTORY
             * -----------------------------------------
             */

            await client.query(
                `
                INSERT INTO delivery_history
                (
                    delivery_id,
                    status,
                    location_text,
                    latitude,
                    longitude,
                    event_time
                )
                VALUES
                (
                    $1,
                    'CANCELLED',
                    NULL,
                    NULL,
                    NULL,
                    $2
                )
                `,
                [
                    delivery.id,
                    currentTime
                ]
            );
        }


        /*
         * -----------------------------------------
         * 8. REFUND PAYMENT HOLD
         * -----------------------------------------
         */

       const holdResult =
    await client.query(
        `
        SELECT *
        FROM transactions
        WHERE parcel_id = $1
          AND booking_id = $2
          AND type = 'HOLD'
          AND status = 'SUCCESS'
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
        `,
        [
            parcel.id,
            bookingId
        ]
    );
        const hold =
            holdResult.rows[0];

        if (!hold) {
            throw new Error(
                "Payment hold not found for this parcel"
            );
        }


        /*
         * Check duplicate refund
         */

        const refundCheckResult =
            await client.query(
                `
                SELECT *
                FROM transactions
                WHERE booking_id = $1
                  AND type = 'REFUND'
                  AND status = 'SUCCESS'
                LIMIT 1
                `,
                [bookingId]
            );

        if (
            refundCheckResult.rows.length > 0
        ) {
            throw new Error(
                "Booking already has a successful refund"
            );
        }


        const refundAmount =
            Number(hold.amount);


        /*
         * -----------------------------------------
         * 9. LOCK CUSTOMER WALLET
         * -----------------------------------------
         */

        const walletResult =
            await client.query(
                `
                SELECT *
                FROM wallets
                WHERE user_id = $1
                FOR UPDATE
                `,
                [booking.customer_id]
            );

        const wallet =
            walletResult.rows[0];

        if (!wallet) {
            throw new Error(
                "Customer wallet not found"
            );
        }


        const holdBalance =
            Number(
                wallet.hold_balance || 0
            );

        if (
            holdBalance <
            refundAmount
        ) {
            throw new Error(
                "Insufficient held wallet balance"
            );
        }


        const newBalance =
            Number(
                wallet.balance || 0
            ) + refundAmount;

        const newHoldBalance =
            holdBalance - refundAmount;


        /*
         * -----------------------------------------
         * 10. REFUND WALLET
         * -----------------------------------------
         */

        const updatedWalletResult =
            await client.query(
                `
                UPDATE wallets
                SET
                    balance = $1,
                    hold_balance = $2,
                    updated_at = $3
                WHERE id = $4
                RETURNING *
                `,
                [
                    newBalance,
                    newHoldBalance,
                    currentTime,
                    wallet.id
                ]
            );

        const updatedWallet =
            updatedWalletResult.rows[0];


        /*
         * -----------------------------------------
         * 11. CREATE REFUND TRANSACTION
         * -----------------------------------------
         */

        const refundId =
            `txn_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 8)}`;

        const refundResult =
            await client.query(
                `
                INSERT INTO transactions
                (
                    id,
                    wallet_id,
                    parcel_id,
                    booking_id,
                    amount,
                    payment_method,
                    type,
                    status,
                    created_at,
                    updated_at
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    'WALLET',
                    'REFUND',
                    'SUCCESS',
                    $6,
                    $6
                )
                RETURNING *
                `,
                [
                    refundId,
                    wallet.id,
                    parcel.id,
                    bookingId,
                    refundAmount,
                    currentTime
                ]
            );


        /*
         * -----------------------------------------
         * 12. COMMIT
         * -----------------------------------------
         */

        await client.query(
            "COMMIT"
        );


        return {

            booking:
                updatedBooking,

            parcel:
                updatedParcel,

            refund: {

                amount:
                    refundAmount,

                transaction:
                    refundResult.rows[0]

            },

            wallet:
                updatedWallet,

            delivery:
                updatedDelivery

        };

    } catch (err) {

        await client.query(
            "ROLLBACK"
        );

        throw err;

    } finally {

        client.release();

    }

}

static async wallet(user) {

    const wallet =
        await PostgresWalletModel.findByUserId(
            user.id
        );

    if (!wallet) {
        throw new Error(
            "Traveller wallet not found"
        );
    }


    const profile =
        await PostgresTravellerProfileModel.findByUserId(
            user.id
        );


    const transactions =
        await PostgresTransactionModel.findByWallet(
            wallet.id
        );


    const successfulCredits =
        transactions.filter(
            transaction =>
                transaction.type === "CREDIT" &&
                transaction.status === "SUCCESS"
        );


    const totalEarned =
        successfulCredits.reduce(
            (total, transaction) =>
                total +
                Number(
                    transaction.amount || 0
                ),
            0
        );


    return {

        wallet,

        balance:
            Number(
                wallet.balance || 0
            ),

        totalEarned,

        completedTrips:
            profile
                ? Number(
                      profile.completedTrips || 0
                  )
                : 0

    };
}

    static async trips(user) {

        return PostgresTripModel.findByTraveller(
            user.id
        );

    }

}


module.exports = {
    PostgresTravellerService
};