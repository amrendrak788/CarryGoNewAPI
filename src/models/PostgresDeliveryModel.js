const PostgresBaseModel = require("./PostgresBaseModel");
const { pool } = require("../database/postgres");
const { DeliveryStatus } = require("../constants/status");
const { now } = require("../utils/date");

class PostgresDeliveryModel extends PostgresBaseModel {

    constructor() {
        super("deliveries", {
            hasSoftDelete: false
        });
    }


   mapRow(row, history = []) {

    if (!row) {
        return null;
    }

    /*
     * -----------------------------------------
     * CURRENT LOCATION
     *
     * Latest location delivery_history से लो.
     * इससे traveller की latest tracking location
     * response में दिखाई देगी.
     *
     * अगर history में location नहीं मिले तो
     * deliveries table की current latitude/
     * longitude से fallback होगा.
     * -----------------------------------------
     */

    let currentLocation = {
        address: null,
        latitude: row.current_latitude,
        longitude: row.current_longitude
    };


    /*
     * History already ASC order में आती है.
     * इसलिए आखिरी record latest record है.
     */

    if (
        Array.isArray(history) &&
        history.length > 0
    ) {

        const latestLocation =
            [...history]
                .reverse()
                .find(item =>
                    item.latitude !== null &&
                    item.longitude !== null
                );


        if (latestLocation) {

            currentLocation = {
                address:
                    latestLocation.location ?? null,

                latitude:
                    latestLocation.latitude,

                longitude:
                    latestLocation.longitude
            };

        }

    }


    return {

        id: row.id,

        parcelId:
            row.parcel_id,

        bookingId:
            row.booking_id,

        currentStatus:
            row.current_status,

        progress:
            row.progress !== null
                ? Number(row.progress)
                : 0,

        currentLocation,

        lastUpdated:
            row.last_updated,

        state:
            row.state,

        nextAction:
            row.next_action,

        meta:
            row.meta,

        parcelLabel:
            row.parcel_label,

        route:
            row.route,

        earning:
            row.earning !== null
                ? Number(row.earning)
                : null,

        createdAt:
            row.created_at,

        history

    };
}

    async getHistory(deliveryId) {

        const result =
            await pool.query(
                `
                SELECT
                    id,
                    delivery_id,
                    status,
                    location_text,
                    latitude,
                    longitude,
                    event_time
                FROM delivery_history
                WHERE delivery_id = $1
                ORDER BY event_time ASC, id ASC
                `,
                [deliveryId]
            );

        return result.rows.map(row => ({
            id: row.id,

            status: row.status,

            location:
                row.location_text,

            latitude:
                row.latitude,

            longitude:
                row.longitude,

            timestamp:
                row.event_time
        }));
    }


    async findById(id) {

        const row =
            await super.findById(id);

        if (!row) {
            return null;
        }

        const history =
            await this.getHistory(id);

        return this.mapRow(
            row,
            history
        );
    }


    async findByParcel(parcelId) {

        const row =
            await this.findOneByColumn(
                "parcel_id",
                parcelId
            );

        if (!row) {
            return null;
        }

        const history =
            await this.getHistory(row.id);

        return this.mapRow(
            row,
            history
        );
    }


    async findByBooking(bookingId) {

        const row =
            await this.findOneByColumn(
                "booking_id",
                bookingId
            );

        if (!row) {
            return null;
        }

        const history =
            await this.getHistory(row.id);

        return this.mapRow(
            row,
            history
        );
    }


    async findPickedUp() {

        const rows =
            await this.findManyByColumn(
                "current_status",
                DeliveryStatus.PICKED_UP
            );

        return Promise.all(
            rows.map(async row => {

                const history =
                    await this.getHistory(row.id);

                return this.mapRow(
                    row,
                    history
                );
            })
        );
    }


    async findInTransit() {

        const rows =
            await this.findManyByColumn(
                "current_status",
                DeliveryStatus.IN_TRANSIT
            );

        return Promise.all(
            rows.map(async row => {

                const history =
                    await this.getHistory(row.id);

                return this.mapRow(
                    row,
                    history
                );
            })
        );
    }


    async findDelivered() {

        const rows =
            await this.findManyByColumn(
                "current_status",
                DeliveryStatus.DELIVERED
            );

        return Promise.all(
            rows.map(async row => {

                const history =
                    await this.getHistory(row.id);

                return this.mapRow(
                    row,
                    history
                );
            })
        );
    }


    async updateLocation(
        id,
        latitude,
        longitude
    ) {

        const delivery =
            await this.findById(id);

        if (!delivery) {
            return null;
        }

        const row =
            await this.updateById(
                id,
                {
                    current_latitude: latitude,
                    current_longitude: longitude,
                    last_updated: now()
                }
            );

        const history =
            await this.getHistory(id);

        return this.mapRow(
            row,
            history
        );
    }


    async addHistory(
        id,
        status,
        location
    ) {

        const delivery =
            await super.findById(id);

        if (!delivery) {
            return null;
        }

        let locationText = null;
        let latitude = null;
        let longitude = null;

        if (
            location &&
            typeof location === "object"
        ) {

            latitude =
                location.latitude ?? null;

            longitude =
                location.longitude ?? null;

            if (
                location.address !== undefined &&
                location.address !== null
            ) {
                locationText =
                    String(location.address);
            }

        } else if (
            location !== undefined &&
            location !== null
        ) {

            locationText =
                String(location);
        }

        await pool.query(
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
            ($1, $2, $3, $4, $5, $6)
            `,
            [
                id,
                status,
                locationText,
                latitude,
                longitude,
                now()
            ]
        );

        const row =
            await super.findById(id);

        const history =
            await this.getHistory(id);

        return this.mapRow(
            row,
            history
        );
    }


    async changeStatus(
        id,
        status
    ) {

        const delivery =
            await super.findById(id);

        if (!delivery) {
            return null;
        }

        const patch = {
            current_status: status,
            state: status,
            last_updated: now()
        };


        if (
            status ===
            DeliveryStatus.ACCEPTED
        ) {

            patch.progress = 20;

            patch.next_action =
                "VERIFY_PICKUP";

            patch.meta =
                "Traveller accepted booking";
        }


        if (
            status ===
            DeliveryStatus.PICKED_UP
        ) {

            patch.progress = 50;

            patch.next_action =
                "MARK_IN_TRANSIT";

            patch.meta =
                "Parcel picked up";
        }


        if (
            status ===
            DeliveryStatus.IN_TRANSIT
        ) {

            patch.progress = 75;

            patch.next_action =
                "MARK_DELIVERED";

            patch.meta =
                "Parcel is in transit";
        }


        if (
            status ===
            DeliveryStatus.DELIVERED
        ) {

            patch.progress = 100;

            patch.next_action =
                "VIEW_RECEIPT";

            patch.meta =
                "Parcel delivered";
        }


        if (
            status ===
            DeliveryStatus.CANCELLED
        ) {

            patch.next_action =
                "NONE";

            patch.meta =
                "Delivery cancelled";
        }


        const row =
            await this.updateById(
                id,
                patch
            );

        const history =
            await this.getHistory(id);

        return this.mapRow(
            row,
            history
        );
    }


    async markPickedUp(
        id,
        location
    ) {

        await this.addHistory(
            id,
            DeliveryStatus.PICKED_UP,
            location
        );

        return this.changeStatus(
            id,
            DeliveryStatus.PICKED_UP
        );
    }


    async markInTransit(
        id,
        location
    ) {

        await this.addHistory(
            id,
            DeliveryStatus.IN_TRANSIT,
            location
        );

        return this.changeStatus(
            id,
            DeliveryStatus.IN_TRANSIT
        );
    }


    async markDelivered(
        id,
        location
    ) {

        await this.addHistory(
            id,
            DeliveryStatus.DELIVERED,
            location
        );

        return this.changeStatus(
            id,
            DeliveryStatus.DELIVERED
        );
    }


    async clearBooking(id) {

        const delivery =
            await super.findById(id);

        if (!delivery) {
            return null;
        }

        const row =
            await this.updateById(
                id,
                {
                    booking_id: null,
                    current_status: "CANCELLED",
                    state: "CANCELLED",
                    progress: 0,
                    next_action: "BOOK_TRAVELLER",
                    meta: "Traveller rejected booking",
                    last_updated: now()
                }
            );

        const history =
            await this.getHistory(id);

        return this.mapRow(
            row,
            history
        );
    }
}


module.exports =
    new PostgresDeliveryModel();