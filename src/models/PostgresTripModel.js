const PostgresBaseModel = require("./PostgresBaseModel");
const { pool } = require("../database/postgres");
const { now } = require("../utils/date");

class PostgresTripModel extends PostgresBaseModel {

    constructor() {
        super("trips", {
            hasSoftDelete: false
        });
    }

    mapRow(row) {

        if (!row) {
            return null;
        }

        return {
            id: row.id,

            travellerId: row.traveller_id,

            from: {
                address: row.from_location
            },

            to: {
                address: row.to_location
            },

            tripTime: row.trip_time,

            distance: row.distance,

            matches: row.matches,

            status: row.status,

            availableWeight:
                row.available_weight !== null
                    ? Number(row.available_weight)
                    : 0,

            updatedAt: row.updated_at
        };
    }


    async findById(id) {

        const row =
            await super.findById(id);

        return this.mapRow(row);
    }


    async findByTraveller(travellerId) {

        const rows =
            await this.findManyByColumn(
                "traveller_id",
                travellerId
            );

        return rows.map(row =>
            this.mapRow(row)
        );
    }


    async findAvailable() {

        const rows =
            await this.findManyByColumn(
                "status",
                "ACTIVE"
            );

        return rows.map(row =>
            this.mapRow(row)
        );
    }


    async findCompleted() {

        const rows =
            await this.findManyByColumn(
                "status",
                "COMPLETED"
            );

        return rows.map(row =>
            this.mapRow(row)
        );
    }


    async findUpcoming() {

        const rows =
            await this.findAvailable();

        const today =
            new Date()
                .toISOString()
                .split("T")[0];

        return rows.filter(trip => {

            if (!trip.tripTime) {
                return false;
            }

            const tripDate =
                String(trip.tripTime)
                    .split("T")[0];

            return tripDate >= today;

        });
    }


    async findByDate(date) {

        const rows =
            await this.findManyByColumn(
                "trip_time",
                date
            );

        return rows.map(row =>
            this.mapRow(row)
        );
    }


    async findByRoute(from, to) {

        const result =
            await pool.query(
                `
                SELECT *
                FROM trips
                WHERE LOWER(from_location)
                    LIKE LOWER($1)
                  AND LOWER(to_location)
                    LIKE LOWER($2)
                `,
                [
                    `%${from}%`,
                    `%${to}%`
                ]
            );

        return result.rows.map(row =>
            this.mapRow(row)
        );
    }


    async updateStatus(id, status) {

        const row =
            await this.updateById(
                id,
                {
                    status,
                    updated_at: now()
                }
            );

        return this.mapRow(row);
    }


    async increaseCapacity(
        id,
        weight
    ) {

        const trip =
            await this.findById(id);

        if (!trip) {
            return null;
        }

        const newWeight =
            Number(trip.availableWeight)
            + Number(weight);

        const row =
            await this.updateById(
                id,
                {
                    available_weight: newWeight,
                    updated_at: now()
                }
            );

        return this.mapRow(row);
    }


    async decreaseCapacity(
        id,
        weight
    ) {

        const trip =
            await this.findById(id);

        if (!trip) {
            return null;
        }

        if (
            Number(trip.availableWeight)
            < Number(weight)
        ) {
            throw new Error(
                "Trip capacity exceeded"
            );
        }

        const newWeight =
            Number(trip.availableWeight)
            - Number(weight);

        const row =
            await this.updateById(
                id,
                {
                    available_weight: newWeight,
                    updated_at: now()
                }
            );

        return this.mapRow(row);
    }


    async cancel(id) {

        return this.updateStatus(
            id,
            "CANCELLED"
        );
    }


    async complete(id) {

        return this.updateStatus(
            id,
            "COMPLETED"
        );
    }
}


module.exports =
    new PostgresTripModel();