const { pool } =
    require("../database/postgres");

const PostgresParcelModel =
    require("../models/PostgresParcelModel");

const PostgresDeliveryModel =
    require("../models/PostgresDeliveryModel");

const PostgresBookingModel =
    require("../models/PostgresBookingModel");

const PostgresTravellerProfileModel =
    require("../models/PostgresTravellerProfileModel");

const PostgresTripModel =
    require("../models/PostgresTripModel");

const { createId } =
    require("../utils/id");

const { now } =
    require("../utils/date");

const { generateOtp } =
    require("../utils/otp");

const {
    ParcelStatus,
    DeliveryStatus,
    BookingStatus
} = require("../constants/status");

class PostgresCustomerService {

    static safeUser(user) {

        if (!user) {
            return null;
        }

        const {
            password,
            ...safe
        } = user;

        return safe;
    }


    /*
     * =========================================
     * DASHBOARD
     * =========================================
     */

    static async dashboard(user) {

        const parcels =
            await PostgresParcelModel.findByCustomer(
                user.id
            );

        const travellersResult =
            await pool.query(
                `
                SELECT
                    id,
                    user_id,
                    rating,
                    completed_trips,
                    vehicle_type,
                    vehicle_number,
                    max_weight,
                    kyc_verified,
                    status,
                    created_at,
                    updated_at,
                    created_by,
                    updated_by,
                    is_deleted,
                    deleted_at
                FROM traveller_profiles
                WHERE status = 'AVAILABLE'
                  AND (
                      is_deleted = FALSE
                      OR is_deleted IS NULL
                  )
                ORDER BY id
                `
            );

        const travellers =
            travellersResult.rows.map(row => ({
                id: row.id,

                userId: row.user_id,

                rating:
                    row.rating !== null
                        ? Number(row.rating)
                        : null,

                completedTrips:
                    row.completed_trips !== null
                        ? Number(row.completed_trips)
                        : 0,

                vehicleType:
                    row.vehicle_type,

                vehicleNumber:
                    row.vehicle_number,

                maxWeight:
                    row.max_weight !== null
                        ? Number(row.max_weight)
                        : null,

                kycVerified:
                    row.kyc_verified,

                status:
                    row.status,

                createdAt:
                    row.created_at,

                updatedAt:
                    row.updated_at,

                createdBy:
                    row.created_by,

                updatedBy:
                    row.updated_by,

                isDeleted:
                    row.is_deleted,

                deletedAt:
                    row.deleted_at
            }));


        /*
         * Only deliveries belonging to
         * this customer's parcels.
         */

        const deliveries =
            (
                await Promise.all(
                    parcels.map(parcel =>
                        PostgresDeliveryModel.findByParcel(
                            parcel.id
                        )
                    )
                )
            ).filter(Boolean);


        return {

            user:
                PostgresCustomerService.safeUser(
                    user
                ),

            stats: {

                booked:
                    parcels.length,

                delivered:
                    parcels.filter(
                        parcel =>
                            parcel.status ===
                            ParcelStatus.DELIVERED
                    ).length,

                active:
                    parcels.filter(
                        parcel =>
                            ![
                                ParcelStatus.DELIVERED,
                                ParcelStatus.CANCELLED
                            ].includes(
                                parcel.status
                            )
                    ).length

            },

            travellers,

            deliveries
        };
    }


    /*
     * =========================================
     * CREATE PARCEL
     * =========================================
     */

    static async createParcel(
        user,
        body
    ) {

        if (!body) {
            throw new Error(
                "Parcel data is required"
            );
        }


        const parcelId =
            createId("par");

        const deliveryId =
            createId("del");

        const currentTime =
            now();

        const pickupOtp =
            generateOtp();

        const deliveryOtp =
            generateOtp();


        const pickup =
            body.pickup &&
            typeof body.pickup === "object"
                ? body.pickup
                : {
                    address: body.pickup
                };


        const drop =
            body.drop &&
            typeof body.drop === "object"
                ? body.drop
                : {
                    address: body.drop
                };


        const weight =
            Number(body.weight);

        const payout =
            Number(body.payout);


        if (
            !Number.isFinite(weight) ||
            weight <= 0
        ) {
            throw new Error(
                "Invalid parcel weight"
            );
        }


        if (
            !Number.isFinite(payout) ||
            payout <= 0
        ) {
            throw new Error(
                "Invalid parcel payout"
            );
        }


        const client =
            await pool.connect();


        try {

            await client.query(
                "BEGIN"
            );


            /*
             * ---------------------------------
             * CREATE PARCEL
             * ---------------------------------
             */

            await client.query(
                `
                INSERT INTO parcels
                (
                    id,
                    customer_id,
                    traveller_id,
                    booking_id,
                    title,
                    description,
                    sender_name,
                    receiver_name,
                    receiver_mobile,
                    weight,
                    weight_unit,
                    payout,
                    currency,
                    pickup_address,
                    pickup_latitude,
                    pickup_longitude,
                    drop_address,
                    drop_latitude,
                    drop_longitude,
                    pickup_otp,
                    pickup_otp_verified,
                    delivery_otp,
                    delivery_otp_verified,
                    status,
                    created_at,
                    updated_at,
                    created_by,
                    updated_by,
                    is_deleted,
                    deleted_at
                )
                VALUES
                (
                    $1,
                    $2,
                    NULL,
                    NULL,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    $9,
                    $10,
                    $11,
                    $12,
                    $13,
                    $14,
                    $15,
                    $16,
                    $17,
                    $18,
                    FALSE,
                    $19,
                    FALSE,
                    $20,
                    $21,
                    $22,
                    $23,
                    $24,
                    FALSE,
                    NULL
                )
                `,
                [
                    parcelId,

                    user.id,

                    body.title,

                    body.description || "",

                    body.senderName ||
                        user.name,

                    body.receiverName,

                    body.receiverMobile ||
                        null,

                    weight,

                    body.weightUnit ||
                        "KG",

                    payout,

                    body.currency ||
                        "INR",

                    pickup.address ||
                        null,

                    pickup.latitude !== undefined &&
                    pickup.latitude !== null
                        ? Number(
                            pickup.latitude
                        )
                        : null,

                    pickup.longitude !== undefined &&
                    pickup.longitude !== null
                        ? Number(
                            pickup.longitude
                        )
                        : null,

                    drop.address ||
                        null,

                    drop.latitude !== undefined &&
                    drop.latitude !== null
                        ? Number(
                            drop.latitude
                        )
                        : null,

                    drop.longitude !== undefined &&
                    drop.longitude !== null
                        ? Number(
                            drop.longitude
                        )
                        : null,

                    pickupOtp,

                    deliveryOtp,

                    ParcelStatus.AVAILABLE,

                    currentTime,

                    currentTime,

                    user.id,

                    user.id
                ]
            );


            /*
             * ---------------------------------
             * CREATE DELIVERY
             * ---------------------------------
             */

            await client.query(
                `
                INSERT INTO deliveries
                (
                    id,
                    parcel_id,
                    booking_id,
                    current_status,
                    progress,
                    current_latitude,
                    current_longitude,
                    last_updated,
                    state,
                    next_action,
                    meta,
                    parcel_label,
                    route,
                    earning,
                    created_at
                )
                VALUES
                (
                    $1,
                    $2,
                    NULL,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    NULL,
                    NULL,
                    NULL,
                    NULL,
                    NULL,
                    $9
                )
                `,
                [
                    deliveryId,

                    parcelId,

                    DeliveryStatus.BOOKED,

                    10,

                    pickup.latitude !== undefined &&
                    pickup.latitude !== null
                        ? Number(
                            pickup.latitude
                        )
                        : null,

                    pickup.longitude !== undefined &&
                    pickup.longitude !== null
                        ? Number(
                            pickup.longitude
                        )
                        : null,

                    currentTime,

                    DeliveryStatus.BOOKED,

                    currentTime
                ]
            );


            /*
             * ---------------------------------
             * INITIAL DELIVERY HISTORY
             * ---------------------------------
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
                    deliveryId,

                    DeliveryStatus.BOOKED,

                    pickup.address ||
                        null,

                    pickup.latitude !== undefined &&
                    pickup.latitude !== null
                        ? Number(
                            pickup.latitude
                        )
                        : null,

                    pickup.longitude !== undefined &&
                    pickup.longitude !== null
                        ? Number(
                            pickup.longitude
                        )
                        : null,

                    currentTime
                ]
            );


            await client.query(
                "COMMIT"
            );


        } catch (err) {

            try {
                await client.query(
                    "ROLLBACK"
                );
            } catch (rollbackError) {
                console.error(
                    "Create parcel rollback failed:",
                    rollbackError
                );
            }

            throw err;

        } finally {

            client.release();
        }


        /*
         * Return exactly the same style
         * as the old service.
         */

        const parcel =
            await PostgresParcelModel.findById(
                parcelId
            );

        const delivery =
            await PostgresDeliveryModel.findById(
                deliveryId
            );


        return {
            parcel,
            delivery
        };
    }


    /*
     * =========================================
     * CUSTOMER DELIVERIES
     * =========================================
     */

    static async deliveries(user) {

        const parcels =
            await PostgresParcelModel.findByCustomer(
                user.id
            );


        const deliveries =
            (
                await Promise.all(
                    parcels.map(parcel =>
                        PostgresDeliveryModel.findByParcel(
                            parcel.id
                        )
                    )
                )
            ).filter(Boolean);


        return deliveries;
    }
static async parcels(user) {

    return await PostgresParcelModel.findByCustomer(
        user.id
    );
}

    /*
     * =========================================
     * TRACK PARCEL
     * =========================================
     */

    static async trackParcel(
        user,
        parcelId
    ) {

        if (!parcelId) {
            throw new Error(
                "Parcel ID is required"
            );
        }


        const parcel =
            await PostgresParcelModel.findById(
                parcelId
            );


        if (!parcel) {
            throw new Error(
                "Parcel not found"
            );
        }


        if (
            parcel.customerId !== user.id
        ) {
            throw new Error(
                "You are not authorized to view this parcel"
            );
        }


        let booking = null;

        if (parcel.bookingId) {

            const result =
                await pool.query(
                    `
                    SELECT *
                    FROM bookings
                    WHERE id = $1
                    LIMIT 1
                    `,
                    [parcel.bookingId]
                );


            if (
                result.rows.length > 0
            ) {

                const row =
                    result.rows[0];

                booking = {

                    id: row.id,

                    parcelId:
                        row.parcel_id,

                    tripId:
                        row.trip_id,

                    customerId:
                        row.customer_id,

                    travellerId:
                        row.traveller_id,

                    status:
                        row.status,

                    requestedAt:
                        row.requested_at,

                    acceptedAt:
                        row.accepted_at,

                    rejectedAt:
                        row.rejected_at,

                    cancelledAt:
                        row.cancelled_at,

                    completedAt:
                        row.completed_at,

                    createdAt:
                        row.created_at,

                    updatedAt:
                        row.updated_at
                };
            }
        }


        const delivery =
            await PostgresDeliveryModel.findByParcel(
                parcel.id
            );


        let traveller = null;


        if (parcel.travellerId) {

            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        user_id,
                        rating,
                        completed_trips,
                        vehicle_type,
                        vehicle_number,
                        max_weight,
                        kyc_verified,
                        status
                    FROM traveller_profiles
                    WHERE user_id = $1
                      AND (
                          is_deleted = FALSE
                          OR is_deleted IS NULL
                      )
                    LIMIT 1
                    `,
                    [parcel.travellerId]
                );


            if (
                result.rows.length > 0
            ) {

                const row =
                    result.rows[0];

                traveller = {

                    id:
                        row.id,

                    userId:
                        row.user_id,

                    rating:
                        row.rating !== null
                            ? Number(row.rating)
                            : null,

                    vehicleType:
                        row.vehicle_type,

                    vehicleNumber:
                        row.vehicle_number,

                    completedTrips:
                        row.completed_trips !== null
                            ? Number(
                                row.completed_trips
                            )
                            : 0,

                    kycVerified:
                        row.kyc_verified
                };
            }
        }


        return {

            parcel: {

                id:
                    parcel.id,

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
                    parcel.payout,

                status:
                    parcel.status,

                createdAt:
                    parcel.createdAt,

                updatedAt:
                    parcel.updatedAt
            },


            booking: booking
                ? {

                    id:
                        booking.id,

                    status:
                        booking.status,

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

                    id:
                        traveller.id,

                    userId:
                        traveller.userId,

                    rating:
                        traveller.rating,

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

                    id:
                        delivery.id,

                    state:
                        delivery.state,

                    currentStatus:
                        delivery.currentStatus,

                    progress:
                        delivery.progress,

                    meta:
                        delivery.meta,

                    nextAction:
                        delivery.nextAction,

                    currentLocation:
                        delivery.currentLocation ||
                        null,

                    lastUpdated:
                        delivery.lastUpdated,

                    history:
                        delivery.history ||
                        []
                }
                : null
        };
    }
    /*
     * =========================================
     * CANCEL BOOKING + REFUND
     * =========================================
     */

    static async cancelBooking(
        user,
        bookingId
    ) {

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
             * -------------------------------------
             * Get booking
             * -------------------------------------
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


            if (
                bookingResult.rows.length === 0
            ) {
                throw new Error(
                    "Booking not found"
                );
            }


            const booking =
                bookingResult.rows[0];


            /*
             * -------------------------------------
             * Verify customer ownership
             * -------------------------------------
             */

            if (
                booking.customer_id !== user.id
            ) {
                throw new Error(
                    "You are not authorized to cancel this booking"
                );
            }


            /*
             * -------------------------------------
             * Booking status validation
             * -------------------------------------
             */

            if (
                booking.status ===
                "CANCELLED"
            ) {
                throw new Error(
                    "Booking is already cancelled"
                );
            }


            if (
                booking.status ===
                "COMPLETED"
            ) {
                throw new Error(
                    "Completed booking cannot be cancelled"
                );
            }


            /*
             * -------------------------------------
             * Lock parcel
             * -------------------------------------
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


            if (
                parcelResult.rows.length === 0
            ) {
                throw new Error(
                    "Parcel not found"
                );
            }


            const parcel =
                parcelResult.rows[0];


            /*
             * -------------------------------------
             * Find successful HOLD
             * -------------------------------------
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
                        booking.parcel_id,
                        booking.id
                    ]
                );


            /*
             * -------------------------------------
             * Refund only when HOLD exists
             * -------------------------------------
             */

            let refundTransaction = null;
            let refundAmount = 0;


            if (
                holdResult.rows.length > 0
            ) {

                const hold =
                    holdResult.rows[0];

                refundAmount =
                    Number(hold.amount);


                /*
                 * ---------------------------------
                 * Prevent duplicate refund
                 * ---------------------------------
                 */

                const refundCheck =
                    await client.query(
                        `
                        SELECT *
                        FROM transactions
                        WHERE booking_id = $1
                          AND type = 'REFUND'
                          AND status = 'SUCCESS'
                        LIMIT 1
                        `,
                        [booking.id]
                    );


                if (
                    refundCheck.rows.length === 0
                ) {

                    /*
                     * -----------------------------
                     * Lock customer wallet
                     * -----------------------------
                     */

                    const walletResult =
                        await client.query(
                            `
                            SELECT *
                            FROM wallets
                            WHERE user_id = $1
                            FOR UPDATE
                            `,
                            [user.id]
                        );


                    if (
                        walletResult.rows.length === 0
                    ) {
                        throw new Error(
                            "Customer wallet not found"
                        );
                    }


                    const wallet =
                        walletResult.rows[0];


                    const holdBalance =
                        Number(
                            wallet.hold_balance || 0
                        );


                    if (
                        holdBalance < refundAmount
                    ) {
                        throw new Error(
                            "Insufficient held wallet balance for refund"
                        );
                    }


                    const newBalance =
                        Number(
                            wallet.balance || 0
                        ) + refundAmount;


                    const newHoldBalance =
                        holdBalance - refundAmount;


                    /*
                     * -----------------------------
                     * Refund wallet
                     * -----------------------------
                     */

                    await client.query(
                        `
                        UPDATE wallets
                        SET
                            balance = $1,
                            hold_balance = $2,
                            updated_at = $3
                        WHERE id = $4
                        `,
                        [
                            newBalance,
                            newHoldBalance,
                            now(),
                            wallet.id
                        ]
                    );


                    /*
                     * -----------------------------
                     * Create REFUND transaction
                     * -----------------------------
                     */

                    const refundId =
                        createId("txn");


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
                                $6,
                                $7,
                                $8,
                                $9,
                                $10
                            )
                            RETURNING *
                            `,
                            [
                                refundId,
                                wallet.id,
                                booking.parcel_id,
                                booking.id,
                                refundAmount,
                                "WALLET",
                                "REFUND",
                                "SUCCESS",
                                now(),
                                now()
                            ]
                        );


                    refundTransaction =
                        refundResult.rows[0];

                } else {

                    /*
                     * Refund already exists.
                     * Do not credit wallet again.
                     */

                    refundTransaction =
                        refundCheck.rows[0];

                    refundAmount =
                        Number(
                            refundTransaction.amount
                        );
                }
            }


            /*
             * -------------------------------------
             * Cancel booking
             * -------------------------------------
             */

            const currentTime =
                now();


            const cancelledBookingResult =
                await client.query(
                    `
                    UPDATE bookings
                    SET
                        status = 'CANCELLED',
                        cancelled_at = $1,
                        updated_at = $1
                    WHERE id = $2
                    RETURNING *
                    `,
                    [
                        currentTime,
                        booking.id
                    ]
                );


            /*
             * -------------------------------------
             * Cancel parcel
             * -------------------------------------
             */

            const cancelledParcelResult =
                await client.query(
                    `
                    UPDATE parcels
                    SET
                        status = 'CANCELLED',
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


            /*
             * -------------------------------------
             * Update delivery
             * -------------------------------------
             *
             * Keep delivery record.
             * Clear booking relationship and mark
             * it cancelled.
             * -------------------------------------
             */

            await client.query(
                `
                UPDATE deliveries
                SET
                    booking_id = NULL,
                    current_status = 'CANCELLED',
                    state = 'CANCELLED',
                    progress = 0,
                    next_action = 'BOOK_TRAVELLER',
                    meta = 'Customer cancelled booking',
                    last_updated = $1
                WHERE parcel_id = $2
                `,
                [
                    currentTime,
                    parcel.id
                ]
            );


            /*
             * -------------------------------------
             * Delivery history
             * -------------------------------------
             */

            const deliveryResult =
                await client.query(
                    `
                    SELECT id
                    FROM deliveries
                    WHERE parcel_id = $1
                    LIMIT 1
                    `,
                    [parcel.id]
                );


            if (
                deliveryResult.rows.length > 0
            ) {

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
                        $2,
                        $3,
                        $4,
                        $5
                    )
                    `,
                    [
                        deliveryResult.rows[0].id,
                        parcel.pickup_address ||
                            null,
                        parcel.pickup_latitude,
                        parcel.pickup_longitude,
                        currentTime
                    ]
                );
            }


            /*
             * -------------------------------------
             * COMMIT
             * -------------------------------------
             */

            await client.query(
                "COMMIT"
            );


            /*
             * -------------------------------------
             * Return result
             * -------------------------------------
             */

            return {

                booking:
                    cancelledBookingResult
                        .rows[0],

                parcel:
                    cancelledParcelResult
                        .rows[0],

                refund: refundTransaction
                    ? {
                        amount: refundAmount,
                        transaction:
                            refundTransaction
                    }
                    : null

            };


        } catch (err) {

            try {

                await client.query(
                    "ROLLBACK"
                );

            } catch (rollbackError) {

                console.error(
                    "Cancel booking rollback failed:",
                    rollbackError
                );
            }

            throw err;

        } finally {

            client.release();

        }
    }
    static async bookTraveller(
    user,
    travellerId,
    parcelId,
    tripId
) {

    if (!travellerId) {
        throw new Error(
            "Traveller ID is required"
        );
    }

    if (!parcelId) {
        throw new Error(
            "Parcel ID is required"
        );
    }

    if (!tripId) {
        throw new Error(
            "Trip ID is required"
        );
    }

    /*
     * -----------------------------------------
     * GET PARCEL
     * -----------------------------------------
     */

    const parcel =
        await PostgresParcelModel.findById(
            parcelId
        );

    if (!parcel) {
        throw new Error(
            "Parcel not found"
        );
    }

    if (parcel.customerId !== user.id) {
        throw new Error(
            "You are not authorized to book this parcel"
        );
    }

    if (
        parcel.status !==
        ParcelStatus.AVAILABLE
    ) {
        throw new Error(
            "This parcel is no longer available"
        );
    }


    /*
     * -----------------------------------------
     * GET TRAVELLER
     * -----------------------------------------
     */

    const traveller =
        await PostgresTravellerProfileModel.findByUserId(
            travellerId
        );

    if (!traveller) {
        throw new Error(
            "Traveller profile not found"
        );
    }

    if (
        traveller.status !==
        "AVAILABLE"
    ) {
        throw new Error(
            "Traveller is not available"
        );
    }

    if (!traveller.kycVerified) {
        throw new Error(
            "Traveller KYC is not verified"
        );
    }


    /*
     * -----------------------------------------
     * GET TRIP
     * -----------------------------------------
     */

    const trip =
        await PostgresTripModel.findById(
            tripId
        );

    if (!trip) {
        throw new Error(
            "Trip not found"
        );
    }

    if (
        trip.travellerId !==
        travellerId
    ) {
        throw new Error(
            "Trip does not belong to selected traveller"
        );
    }

    if (
        trip.status !==
        "ACTIVE"
    ) {
        throw new Error(
            "Selected trip is not active"
        );
    }


    /*
     * -----------------------------------------
     * CHECK CAPACITY
     * -----------------------------------------
     */

    if (
        Number(trip.availableWeight) <
        Number(parcel.weight)
    ) {
        throw new Error(
            "Traveller does not have enough available capacity"
        );
    }


    /*
     * -----------------------------------------
     * CHECK EXISTING BOOKING
     * -----------------------------------------
     */

    const existingBooking =
        await PostgresBookingModel.findByParcel(
            parcel.id
        );

    if (existingBooking) {
        throw new Error(
            "This parcel already has a booking"
        );
    }


    /*
     * -----------------------------------------
     * CHECK PAYMENT HOLD
     *
     * IMPORTANT:
     * Do this BEFORE creating booking.
     * -----------------------------------------
     */

    const holdResult =
        await pool.query(
            `
            SELECT
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
            FROM transactions
            WHERE parcel_id = $1
              AND type = 'HOLD'
              AND status = 'SUCCESS'
            ORDER BY created_at DESC
            LIMIT 1
            `,
            [parcel.id]
        );

    const holdTransaction =
        holdResult.rows[0] || null;

    if (!holdTransaction) {
        throw new Error(
            "Payment hold not found for this parcel"
        );
    }


    /*
     * -----------------------------------------
     * VERIFY HOLD AMOUNT
     * -----------------------------------------
     */

    const parcelAmount =
        Number(parcel.payout);

    const holdAmount =
        Number(holdTransaction.amount);

    if (
        !Number.isFinite(parcelAmount) ||
        parcelAmount <= 0
    ) {
        throw new Error(
            "Invalid parcel payment amount"
        );
    }

    if (
        holdAmount !== parcelAmount
    ) {
        throw new Error(
            "Payment hold amount does not match parcel payout"
        );
    }


    /*
     * -----------------------------------------
     * ATOMIC BOOKING
     * -----------------------------------------
     */

    const client =
        await pool.connect();

    let bookingId;

    try {

        await client.query(
            "BEGIN"
        );


        /*
         * Lock parcel
         *
         * Prevent two customers/requests
         * booking the same parcel at once.
         */

        const parcelLock =
            await client.query(
                `
                SELECT
                    id,
                    customer_id,
                    status
                FROM parcels
                WHERE id = $1
                FOR UPDATE
                `,
                [parcel.id]
            );

        if (
            !parcelLock.rows.length
        ) {
            throw new Error(
                "Parcel not found"
            );
        }

        if (
            parcelLock.rows[0].customer_id !==
            user.id
        ) {
            throw new Error(
                "You are not authorized to book this parcel"
            );
        }

        if (
            parcelLock.rows[0].status !==
            ParcelStatus.AVAILABLE
        ) {
            throw new Error(
                "This parcel is no longer available"
            );
        }


        /*
         * Create booking
         */

        bookingId =
            createId("book");

        const currentTime =
            now();

        await client.query(
            `
            INSERT INTO bookings
            (
                id,
                parcel_id,
                trip_id,
                customer_id,
                traveller_id,
                status,
                requested_at,
                accepted_at,
                rejected_at,
                cancelled_at,
                completed_at,
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
                $6,
                $7,
                NULL,
                NULL,
                NULL,
                NULL,
                $8,
                $9
            )
            `,
            [
                bookingId,
                parcel.id,
                trip.id,
                user.id,
                travellerId,
                BookingStatus.PENDING,
                currentTime,
                currentTime,
                currentTime
            ]
        );


        /*
         * Attach HOLD transaction
         */

        const holdUpdate =
            await client.query(
                `
                UPDATE transactions
                SET
                    booking_id = $1,
                    updated_at = $2
                WHERE id = $3
                  AND booking_id IS NULL
                  AND type = 'HOLD'
                  AND status = 'SUCCESS'
                RETURNING *
                `,
                [
                    bookingId,
                    currentTime,
                    holdTransaction.id
                ]
            );

        if (
            holdUpdate.rowCount !== 1
        ) {
            throw new Error(
                "Payment hold could not be attached to booking"
            );
        }


        /*
         * BOOK PARCEL
         */

        const parcelUpdate =
            await client.query(
                `
                UPDATE parcels
                SET
                    booking_id = $1,
                    traveller_id = $2,
                    status = $3,
                    updated_at = $4,
                    updated_by = $5
                WHERE id = $6
                RETURNING *
                `,
                [
                    bookingId,
                    travellerId,
                    ParcelStatus.BOOKED,
                    currentTime,
                    user.id,
                    parcel.id
                ]
            );

        if (
            parcelUpdate.rowCount !== 1
        ) {
            throw new Error(
                "Parcel could not be booked"
            );
        }


        /*
         * BOOK DELIVERY
         */

        const deliveryUpdate =
            await client.query(
                `
                UPDATE deliveries
                SET
                    booking_id = $1,
                    current_status = $2,
                    state = $2,
                    last_updated = $3
                WHERE parcel_id = $4
                RETURNING *
                `,
                [
                    bookingId,
                    DeliveryStatus.BOOKED,
                    currentTime,
                    parcel.id
                ]
            );

        if (
            deliveryUpdate.rowCount !== 1
        ) {
            throw new Error(
                "Delivery not found for parcel"
            );
        }


        await client.query(
            "COMMIT"
        );

    } catch (err) {

        try {
            await client.query(
                "ROLLBACK"
            );
        } catch (rollbackError) {
            console.error(
                "Booking rollback failed:",
                rollbackError
            );
        }

        throw err;

    } finally {

        client.release();

    }


    /*
     * -----------------------------------------
     * RETURN SAME STYLE AS OLD SERVICE
     * -----------------------------------------
     */

    const booking =
        await PostgresBookingModel.findById(
            bookingId
        );

    const updatedParcel =
        await PostgresParcelModel.findById(
            parcel.id
        );

    const delivery =
        await PostgresDeliveryModel.findByParcel(
            parcel.id
        );

    return {

        booking,

        parcel:
            updatedParcel,

        delivery

    };
}

}


module.exports = {
    PostgresCustomerService
};