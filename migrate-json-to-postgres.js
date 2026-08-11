require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { pool } = require("./database/postgres");

const DB_FILE = path.join(
    __dirname,
    "data",
    "database.json"
);

function toNumber(value) {

    if (value === null || value === undefined || value === "") {
        return null;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    const match = String(value).replace(/,/g, "").match(/-?\d+(\.\d+)?/);

    return match ? Number(match[0]) : null;
}

function toDate(value) {

    if (!value) {
        return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? null
        : date;
}

function normalizeLocation(location) {

    if (!location) {
        return {
            text: null,
            latitude: null,
            longitude: null
        };
    }

    if (typeof location === "string") {
        return {
            text: location,
            latitude: null,
            longitude: null
        };
    }

    return {
        text: location.address || null,
        latitude: toNumber(location.latitude),
        longitude: toNumber(location.longitude)
    };
}

async function migrate() {

    const raw = fs.readFileSync(
        DB_FILE,
        "utf8"
    );

    const db = JSON.parse(raw);

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        console.log("=================================");
        console.log("CargoDrop JSON → PostgreSQL");
        console.log("Migration started...");
        console.log("=================================");


        // =====================================================
        // USERS
        // =====================================================

        for (const user of db.users || []) {

            await client.query(
                `
                INSERT INTO users (
                    id,
                    name,
                    mobile,
                    password,
                    selected_role,
                    city,
                    last_login,
                    updated_at
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                ON CONFLICT (id)
                DO UPDATE SET
                    name = EXCLUDED.name,
                    mobile = EXCLUDED.mobile,
                    password = EXCLUDED.password,
                    selected_role = EXCLUDED.selected_role,
                    city = EXCLUDED.city,
                    last_login = EXCLUDED.last_login,
                    updated_at = EXCLUDED.updated_at
                `,
                [
                    user.id,
                    user.name,
                    user.mobile,
                    user.password,
                    user.selectedRole || null,
                    user.city || null,
                    toDate(user.lastLogin),
                    toDate(user.updatedAt)
                ]
            );
        }

        console.log("Users:", (db.users || []).length);


        // =====================================================
        // SESSIONS
        // =====================================================

        for (const session of db.sessions || []) {

            await client.query(
                `
                INSERT INTO sessions (
                    id,
                    token,
                    user_id,
                    created_at
                )
                VALUES ($1,$2,$3,$4)
                ON CONFLICT (id)
                DO UPDATE SET
                    token = EXCLUDED.token,
                    user_id = EXCLUDED.user_id,
                    created_at = EXCLUDED.created_at
                `,
                [
                    session.id,
                    session.token,
                    session.userId,
                    toDate(session.createdAt)
                ]
            );
        }

        console.log("Sessions:", (db.sessions || []).length);


        // =====================================================
        // TRAVELLERS
        // =====================================================

        for (const traveller of db.travellers || []) {

            await client.query(
                `
                INSERT INTO travellers (
                    id,
                    name,
                    rating,
                    route,
                    vehicle,
                    price_range,
                    status,
                    slots
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                ON CONFLICT (id)
                DO UPDATE SET
                    name = EXCLUDED.name,
                    rating = EXCLUDED.rating,
                    route = EXCLUDED.route,
                    vehicle = EXCLUDED.vehicle,
                    price_range = EXCLUDED.price_range,
                    status = EXCLUDED.status,
                    slots = EXCLUDED.slots
                `,
                [
                    traveller.id,
                    traveller.name,
                    toNumber(traveller.rating),
                    traveller.route || null,
                    traveller.vehicle || null,
                    traveller.priceRange || null,
                    traveller.status || null,
                    Number(traveller.slots || 0)
                ]
            );
        }

        console.log("Travellers:", (db.travellers || []).length);


        // =====================================================
        // TRAVELLER PROFILES
        // =====================================================

        for (const profile of db.travellerProfiles || []) {

            await client.query(
                `
                INSERT INTO traveller_profiles (
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
                )
                VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,
                    $9,$10,$11,$12,$13,$14,$15
                )
                ON CONFLICT (id)
                DO UPDATE SET
                    user_id = EXCLUDED.user_id,
                    rating = EXCLUDED.rating,
                    completed_trips = EXCLUDED.completed_trips,
                    vehicle_type = EXCLUDED.vehicle_type,
                    vehicle_number = EXCLUDED.vehicle_number,
                    max_weight = EXCLUDED.max_weight,
                    kyc_verified = EXCLUDED.kyc_verified,
                    status = EXCLUDED.status,
                    updated_at = EXCLUDED.updated_at,
                    updated_by = EXCLUDED.updated_by,
                    is_deleted = EXCLUDED.is_deleted,
                    deleted_at = EXCLUDED.deleted_at
                `,
                [
                    profile.id,
                    profile.userId,
                    toNumber(profile.rating),
                    Number(profile.completedTrips || 0),
                    profile.vehicleType || null,
                    profile.vehicleNumber || null,
                    toNumber(profile.maxWeight),
                    Boolean(profile.kycVerified),
                    profile.status || null,
                    toDate(profile.createdAt),
                    toDate(profile.updatedAt),
                    profile.createdBy || null,
                    profile.updatedBy || null,
                    Boolean(profile.isDeleted),
                    toDate(profile.deletedAt)
                ]
            );
        }

        console.log(
            "Traveller profiles:",
            (db.travellerProfiles || []).length
        );


        // =====================================================
        // TRIPS
        // =====================================================

        for (const trip of db.trips || []) {

            await client.query(
                `
                INSERT INTO trips (
                    id,
                    traveller_id,
                    from_location,
                    to_location,
                    trip_time,
                    distance,
                    matches,
                    status,
                    available_weight,
                    updated_at
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                ON CONFLICT (id)
                DO UPDATE SET
                    traveller_id = EXCLUDED.traveller_id,
                    from_location = EXCLUDED.from_location,
                    to_location = EXCLUDED.to_location,
                    trip_time = EXCLUDED.trip_time,
                    distance = EXCLUDED.distance,
                    matches = EXCLUDED.matches,
                    status = EXCLUDED.status,
                    available_weight = EXCLUDED.available_weight,
                    updated_at = EXCLUDED.updated_at
                `,
                [
                    trip.id,
                    trip.travellerId,
                    trip.from || null,
                    trip.to || null,
                    trip.time || null,
                    trip.distance || null,
                    trip.matches || null,
                    trip.status || null,
                    toNumber(trip.availableWeight),
                    toDate(trip.updatedAt)
                ]
            );
        }

        console.log("Trips:", (db.trips || []).length);


        // =====================================================
        // PARCELS
        // =====================================================

        for (const parcel of db.parcels || []) {

            const pickup =
                normalizeLocation(parcel.pickup);

            const drop =
                normalizeLocation(parcel.drop);

            await client.query(
                `
                INSERT INTO parcels (
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
                    deleted_at,
                    badge,
                    note
                )
                VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                    $11,$12,$13,$14,$15,$16,$17,$18,$19,
                    $20,$21,$22,$23,$24,$25,$26,$27,$28,
                    $29,$30,$31,$32
                )
                ON CONFLICT (id)
                DO UPDATE SET
                    customer_id = EXCLUDED.customer_id,
                    traveller_id = EXCLUDED.traveller_id,
                    booking_id = EXCLUDED.booking_id,
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    sender_name = EXCLUDED.sender_name,
                    receiver_name = EXCLUDED.receiver_name,
                    receiver_mobile = EXCLUDED.receiver_mobile,
                    weight = EXCLUDED.weight,
                    weight_unit = EXCLUDED.weight_unit,
                    payout = EXCLUDED.payout,
                    currency = EXCLUDED.currency,
                    pickup_address = EXCLUDED.pickup_address,
                    pickup_latitude = EXCLUDED.pickup_latitude,
                    pickup_longitude = EXCLUDED.pickup_longitude,
                    drop_address = EXCLUDED.drop_address,
                    drop_latitude = EXCLUDED.drop_latitude,
                    drop_longitude = EXCLUDED.drop_longitude,
                    pickup_otp = EXCLUDED.pickup_otp,
                    pickup_otp_verified = EXCLUDED.pickup_otp_verified,
                    delivery_otp = EXCLUDED.delivery_otp,
                    delivery_otp_verified = EXCLUDED.delivery_otp_verified,
                    status = EXCLUDED.status,
                    created_at = EXCLUDED.created_at,
                    updated_at = EXCLUDED.updated_at,
                    created_by = EXCLUDED.created_by,
                    updated_by = EXCLUDED.updated_by,
                    is_deleted = EXCLUDED.is_deleted,
                    deleted_at = EXCLUDED.deleted_at,
                    badge = EXCLUDED.badge,
                    note = EXCLUDED.note
                `,
                [
                    parcel.id,
                    parcel.customerId,
                    parcel.travellerId || null,
                    parcel.bookingId || null,
                    parcel.title,
                    parcel.description || null,
                    parcel.senderName || null,
                    parcel.receiverName || null,
                    parcel.receiverMobile || null,
                    toNumber(parcel.weight),
                    parcel.weightUnit ||
                        (
                            typeof parcel.weight === "string" &&
                            parcel.weight.toLowerCase().includes("kg")
                                ? "KG"
                                : "KG"
                        ),
                    toNumber(parcel.payout),
                    parcel.currency || "INR",

                    pickup.text,
                    pickup.latitude,
                    pickup.longitude,

                    drop.text,
                    drop.latitude,
                    drop.longitude,

                    parcel.pickupOtp || null,
                    Boolean(parcel.pickupOtpVerified),

                    parcel.deliveryOtp || null,
                    Boolean(parcel.deliveryOtpVerified),

                    parcel.status || null,

                    toDate(parcel.createdAt),
                    toDate(parcel.updatedAt),

                    parcel.createdBy || null,
                    parcel.updatedBy || null,

                    Boolean(parcel.isDeleted),
                    toDate(parcel.deletedAt),

                    parcel.badge || null,
                    parcel.note || null
                ]
            );
        }

        console.log("Parcels:", (db.parcels || []).length);


        // =====================================================
        // BOOKINGS
        // =====================================================

        for (const booking of db.bookings || []) {

            await client.query(
                `
                INSERT INTO bookings (
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
                VALUES (
                    $1,$2,$3,$4,$5,$6,$7,
                    $8,$9,$10,$11,$12,$13
                )
                ON CONFLICT (id)
                DO UPDATE SET
                    parcel_id = EXCLUDED.parcel_id,
                    trip_id = EXCLUDED.trip_id,
                    customer_id = EXCLUDED.customer_id,
                    traveller_id = EXCLUDED.traveller_id,
                    status = EXCLUDED.status,
                    requested_at = EXCLUDED.requested_at,
                    accepted_at = EXCLUDED.accepted_at,
                    rejected_at = EXCLUDED.rejected_at,
                    cancelled_at = EXCLUDED.cancelled_at,
                    completed_at = EXCLUDED.completed_at,
                    created_at = EXCLUDED.created_at,
                    updated_at = EXCLUDED.updated_at
                `,
                [
                    booking.id,
                    booking.parcelId,
                    booking.tripId,
                    booking.customerId,
                    booking.travellerId,
                    booking.status || null,
                    toDate(booking.requestedAt),
                    toDate(booking.acceptedAt),
                    toDate(booking.rejectedAt),
                    toDate(booking.cancelledAt),
                    toDate(booking.completedAt),
                    toDate(booking.createdAt),
                    toDate(booking.updatedAt)
                ]
            );
        }

        console.log("Bookings:", (db.bookings || []).length);


        // =====================================================
        // DELIVERIES
        // =====================================================

        for (const delivery of db.deliveries || []) {
            const parcelExists =
                (db.parcels || []).some(
                    parcel => parcel.id === delivery.parcelId
                );

            if (!parcelExists) {

                console.warn(
                    `Skipping delivery ${delivery.id}: parcel ${delivery.parcelId} not found`
                );

                continue;
            }

            const location =
                delivery.currentLocation || null;

            const latitude =
                location
                    ? toNumber(location.latitude)
                    : null;

            const longitude =
                location
                    ? toNumber(location.longitude)
                    : null;

            await client.query(
                `
                INSERT INTO deliveries (
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
                VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,
                    $9,$10,$11,$12,$13,$14,$15
                )
                ON CONFLICT (id)
                DO UPDATE SET
                    parcel_id = EXCLUDED.parcel_id,
                    booking_id = EXCLUDED.booking_id,
                    current_status = EXCLUDED.current_status,
                    progress = EXCLUDED.progress,
                    current_latitude = EXCLUDED.current_latitude,
                    current_longitude = EXCLUDED.current_longitude,
                    last_updated = EXCLUDED.last_updated,
                    state = EXCLUDED.state,
                    next_action = EXCLUDED.next_action,
                    meta = EXCLUDED.meta,
                    parcel_label = EXCLUDED.parcel_label,
                    route = EXCLUDED.route,
                    earning = EXCLUDED.earning,
                    created_at = EXCLUDED.created_at
                `,
                [
                    delivery.id,
                    delivery.parcelId,
                    delivery.bookingId || null,
                    delivery.currentStatus || null,
                    Number(delivery.progress || 0),
                    latitude,
                    longitude,
                    toDate(delivery.lastUpdated),

                    delivery.state || null,
                    delivery.nextAction || null,
                    delivery.meta || null,

                    delivery.parcel || null,
                    delivery.route || null,
                    toNumber(delivery.earning),

                    toDate(delivery.createdAt)
                ]
            );
        }

        console.log("Deliveries:", (db.deliveries || []).length);


        // =====================================================
        // DELIVERY HISTORY
        // =====================================================

        for (const delivery of db.deliveries || []) {

            for (const history of delivery.history || []) {

                const location =
                    normalizeLocation(history.location);

                await client.query(
                    `
                    INSERT INTO delivery_history (
                        delivery_id,
                        status,
                        location_text,
                        latitude,
                        longitude,
                        event_time
                    )
                    VALUES ($1,$2,$3,$4,$5,$6)
                    `,
                    [
                        delivery.id,
                        history.status || null,
                        location.text,
                        location.latitude,
                        location.longitude,
                        toDate(history.timestamp)
                    ]
                );
            }
        }

        console.log("Delivery history migrated.");


        // =====================================================
        // WALLETS
        // =====================================================

        for (const wallet of db.wallets || []) {

            await client.query(
                `
                INSERT INTO wallets (
                    id,
                    user_id,
                    balance,
                    hold_balance,
                    currency,
                    status,
                    created_at,
                    updated_at,
                    is_deleted,
                    deleted_at
                )
                VALUES (
                    $1,$2,$3,$4,$5,
                    $6,$7,$8,$9,$10
                )
                ON CONFLICT (id)
                DO UPDATE SET
                    user_id = EXCLUDED.user_id,
                    balance = EXCLUDED.balance,
                    hold_balance = EXCLUDED.hold_balance,
                    currency = EXCLUDED.currency,
                    status = EXCLUDED.status,
                    created_at = EXCLUDED.created_at,
                    updated_at = EXCLUDED.updated_at,
                    is_deleted = EXCLUDED.is_deleted,
                    deleted_at = EXCLUDED.deleted_at
                `,
                [
                    wallet.id,
                    wallet.userId,
                    toNumber(wallet.balance) || 0,
                    toNumber(wallet.holdBalance) || 0,
                    wallet.currency || "INR",
                    wallet.status || null,
                    toDate(wallet.createdAt),
                    toDate(wallet.updatedAt),
                    Boolean(wallet.isDeleted),
                    toDate(wallet.deletedAt)
                ]
            );
        }

        console.log("Wallets:", (db.wallets || []).length);


        // =====================================================
        // TRANSACTIONS
        // =====================================================

        for (const transaction of db.transactions || []) {

            await client.query(
                `
                INSERT INTO transactions (
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
                VALUES (
                    $1,$2,$3,$4,$5,
                    $6,$7,$8,$9,$10
                )
                ON CONFLICT (id)
                DO UPDATE SET
                    wallet_id = EXCLUDED.wallet_id,
                    parcel_id = EXCLUDED.parcel_id,
                    booking_id = EXCLUDED.booking_id,
                    amount = EXCLUDED.amount,
                    payment_method = EXCLUDED.payment_method,
                    type = EXCLUDED.type,
                    status = EXCLUDED.status,
                    created_at = EXCLUDED.created_at,
                    updated_at = EXCLUDED.updated_at
                `,
                [
                    transaction.id,
                    transaction.walletId,
                    transaction.parcelId || null,
                    transaction.bookingId || null,
                    toNumber(transaction.amount),
                    transaction.paymentMethod || null,
                    transaction.type || null,
                    transaction.status || null,
                    toDate(transaction.createdAt),
                    toDate(transaction.updatedAt)
                ]
            );
        }

        console.log(
            "Transactions:",
            (db.transactions || []).length
        );


        await client.query("COMMIT");

        console.log("");
        console.log("=================================");
        console.log("MIGRATION SUCCESSFUL");
        console.log("=================================");

    } catch (error) {

        await client.query("ROLLBACK");

        console.error("");
        console.error("=================================");
        console.error("MIGRATION FAILED");
        console.error("=================================");
        console.error(error.message);

        throw error;

    } finally {

        client.release();

    }
}

migrate()
    .then(async () => {
        await pool.end();
        process.exit(0);
    })
    .catch(async () => {
        await pool.end();
        process.exit(1);
    });