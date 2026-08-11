const PostgresBaseModel = require("./PostgresBaseModel");
const { BookingStatus } = require("../constants/status");
const { now } = require("../utils/date");

class PostgresBookingModel extends PostgresBaseModel {

    constructor() {
        super("bookings", {
            hasSoftDelete: false
        });
    }


    mapRow(row) {

        if (!row) {
            return null;
        }

        return {
            id: row.id,

            parcelId: row.parcel_id,

            tripId: row.trip_id,

            customerId: row.customer_id,

            travellerId: row.traveller_id,

            status: row.status,

            requestedAt: row.requested_at,

            acceptedAt: row.accepted_at,

            rejectedAt: row.rejected_at,

            cancelledAt: row.cancelled_at,

            completedAt: row.completed_at,

            createdAt: row.created_at,

            updatedAt: row.updated_at
        };
    }


    async findById(id) {

        const row =
            await super.findById(id);

        return this.mapRow(row);
    }


    async findByCustomer(customerId) {

        const rows =
            await this.findManyByColumn(
                "customer_id",
                customerId
            );

        return rows.map(row =>
            this.mapRow(row)
        );
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


    async findByParcel(parcelId) {

        const row =
            await this.findOneByColumn(
                "parcel_id",
                parcelId
            );

        return this.mapRow(row);
    }


    async findByTrip(tripId) {

        const rows =
            await this.findManyByColumn(
                "trip_id",
                tripId
            );

        return rows.map(row =>
            this.mapRow(row)
        );
    }


    async findPending() {

        const rows =
            await this.findManyByColumn(
                "status",
                BookingStatus.PENDING
            );

        return rows.map(row =>
            this.mapRow(row)
        );
    }


    async findAccepted() {

        const rows =
            await this.findManyByColumn(
                "status",
                BookingStatus.ACCEPTED
            );

        return rows.map(row =>
            this.mapRow(row)
        );
    }


    async findRejected() {

        const rows =
            await this.findManyByColumn(
                "status",
                BookingStatus.REJECTED
            );

        return rows.map(row =>
            this.mapRow(row)
        );
    }


    async findCancelled() {

        const rows =
            await this.findManyByColumn(
                "status",
                BookingStatus.CANCELLED
            );

        return rows.map(row =>
            this.mapRow(row)
        );
    }


    async createBooking(data) {

        const result =
            await this.create(

                [
                    "id",
                    "parcel_id",
                    "trip_id",
                    "customer_id",
                    "traveller_id",
                    "status",
                    "requested_at",
                    "accepted_at",
                    "rejected_at",
                    "cancelled_at",
                    "completed_at",
                    "created_at",
                    "updated_at"
                ],

                [
                    data.id,
                    data.parcelId,
                    data.tripId,
                    data.customerId,
                    data.travellerId,
                    data.status,
                    data.requestedAt || now(),
                    data.acceptedAt || null,
                    data.rejectedAt || null,
                    data.cancelledAt || null,
                    data.completedAt || null,
                    data.createdAt || now(),
                    data.updatedAt || now()
                ]
            );

        return this.mapRow(result);
    }


    async accept(id) {

        const currentTime = now();

        const row =
            await this.updateById(
                id,
                {
                    status: BookingStatus.ACCEPTED,
                    accepted_at: currentTime,
                    updated_at: currentTime
                }
            );

        return this.mapRow(row);
    }


    async reject(id) {

        const currentTime = now();

        const row =
            await this.updateById(
                id,
                {
                    status: BookingStatus.REJECTED,
                    rejected_at: currentTime,
                    updated_at: currentTime
                }
            );

        return this.mapRow(row);
    }


    async cancel(id) {

        const currentTime = now();

        const row =
            await this.updateById(
                id,
                {
                    status: BookingStatus.CANCELLED,
                    cancelled_at: currentTime,
                    updated_at: currentTime
                }
            );

        return this.mapRow(row);
    }


    async complete(id) {

        const currentTime = now();

        const row =
            await this.updateById(
                id,
                {
                    status: BookingStatus.COMPLETED,
                    completed_at: currentTime,
                    updated_at: currentTime
                }
            );

        return this.mapRow(row);
    }
}


module.exports =
    new PostgresBookingModel();