const PostgresBaseModel = require("./PostgresBaseModel");
const { ParcelStatus } = require("../constants/status");
const { now } = require("../utils/date");

class PostgresParcelModel extends PostgresBaseModel {

    constructor() {
        super("parcels");
    }

    mapRow(row) {

        if (!row) {
            return null;
        }

        return {
            id: row.id,

            customerId: row.customer_id,

            travellerId: row.traveller_id,

            bookingId: row.booking_id,

            title: row.title,

            description: row.description,

            senderName: row.sender_name,

            receiverName: row.receiver_name,

            receiverMobile: row.receiver_mobile,

            weight: row.weight !== null
                ? Number(row.weight)
                : null,

            weightUnit: row.weight_unit,

            payout: row.payout !== null
                ? Number(row.payout)
                : null,

            currency: row.currency,

            pickup: {
                address: row.pickup_address,
                latitude: row.pickup_latitude,
                longitude: row.pickup_longitude
            },

            drop: {
                address: row.drop_address,
                latitude: row.drop_latitude,
                longitude: row.drop_longitude
            },

            pickupOtp: row.pickup_otp,

            pickupOtpVerified:
                row.pickup_otp_verified,

            deliveryOtp: row.delivery_otp,

            deliveryOtpVerified:
                row.delivery_otp_verified,

            status: row.status,

            createdAt: row.created_at,

            updatedAt: row.updated_at,

            createdBy: row.created_by,

            updatedBy: row.updated_by,

            isDeleted: row.is_deleted,

            deletedAt: row.deleted_at,

            badge: row.badge,

            note: row.note
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


    async findAvailable() {

        const rows =
            await this.findManyByColumn(
                "status",
                ParcelStatus.AVAILABLE
            );

        return rows.map(row =>
            this.mapRow(row)
        );
    }


    async findBooked() {

        const rows =
            await this.findManyByColumn(
                "status",
                ParcelStatus.BOOKED
            );

        return rows.map(row =>
            this.mapRow(row)
        );
    }


    async findAccepted() {

        const rows =
            await this.findManyByColumn(
                "status",
                ParcelStatus.ACCEPTED
            );

        return rows.map(row =>
            this.mapRow(row)
        );
    }


    async findPickedUp() {

        const rows =
            await this.findManyByColumn(
                "status",
                ParcelStatus.PICKED_UP
            );

        return rows.map(row =>
            this.mapRow(row)
        );
    }


    async findInTransit() {

        const rows =
            await this.findManyByColumn(
                "status",
                ParcelStatus.IN_TRANSIT
            );

        return rows.map(row =>
            this.mapRow(row)
        );
    }


    async findDelivered() {

        const rows =
            await this.findManyByColumn(
                "status",
                ParcelStatus.DELIVERED
            );

        return rows.map(row =>
            this.mapRow(row)
        );
    }


    async findCancelled() {

        const rows =
            await this.findManyByColumn(
                "status",
                ParcelStatus.CANCELLED
            );

        return rows.map(row =>
            this.mapRow(row)
        );
    }


    async createParcel(parcel) {

        const result =
            await this.create(

                [
                    "id",
                    "customer_id",
                    "traveller_id",
                    "booking_id",
                    "title",
                    "description",
                    "sender_name",
                    "receiver_name",
                    "receiver_mobile",
                    "weight",
                    "weight_unit",
                    "payout",
                    "currency",
                    "pickup_address",
                    "pickup_latitude",
                    "pickup_longitude",
                    "drop_address",
                    "drop_latitude",
                    "drop_longitude",
                    "pickup_otp",
                    "pickup_otp_verified",
                    "delivery_otp",
                    "delivery_otp_verified",
                    "status",
                    "created_at",
                    "updated_at",
                    "created_by",
                    "updated_by",
                    "is_deleted",
                    "deleted_at"
                ],

                [
                    parcel.id,
                    parcel.customerId,
                    parcel.travellerId,
                    parcel.bookingId,
                    parcel.title,
                    parcel.description,
                    parcel.senderName,
                    parcel.receiverName,
                    parcel.receiverMobile,
                    parcel.weight,
                    parcel.weightUnit,
                    parcel.payout,
                    parcel.currency,

                    parcel.pickup?.address || null,
                    parcel.pickup?.latitude ?? null,
                    parcel.pickup?.longitude ?? null,

                    parcel.drop?.address || null,
                    parcel.drop?.latitude ?? null,
                    parcel.drop?.longitude ?? null,

                    parcel.pickupOtp,
                    parcel.pickupOtpVerified,

                    parcel.deliveryOtp,
                    parcel.deliveryOtpVerified,

                    parcel.status,

                    parcel.createdAt,
                    parcel.updatedAt,

                    parcel.createdBy,
                    parcel.updatedBy,

                    parcel.isDeleted ?? false,
                    parcel.deletedAt ?? null
                ]
            );

        return this.mapRow(result);
    }


    async assignTraveller(
        parcelId,
        travellerId
    ) {

        const row =
            await this.updateById(
                parcelId,
                {
                    traveller_id: travellerId,
                    status: ParcelStatus.BOOKED,
                    updated_at: now()
                }
            );

        return this.mapRow(row);
    }


    async unassignTraveller(parcelId) {

        const row =
            await this.updateById(
                parcelId,
                {
                    traveller_id: null,
                    updated_at: now()
                }
            );

        return this.mapRow(row);
    }


    async verifyPickupOtp(parcelId) {

        const row =
            await this.updateById(
                parcelId,
                {
                    pickup_otp_verified: true,
                    status: ParcelStatus.PICKED_UP,
                    updated_at: now()
                }
            );

        return this.mapRow(row);
    }


    async verifyDeliveryOtp(parcelId) {

        const row =
            await this.updateById(
                parcelId,
                {
                    delivery_otp_verified: true,
                    status: ParcelStatus.DELIVERED,
                    updated_at: now()
                }
            );

        return this.mapRow(row);
    }


    async changeStatus(
        parcelId,
        status
    ) {

        const row =
            await this.updateById(
                parcelId,
                {
                    status,
                    updated_at: now()
                }
            );

        return this.mapRow(row);
    }


    async cancel(parcelId) {

        return this.changeStatus(
            parcelId,
            ParcelStatus.CANCELLED
        );
    }


    async complete(parcelId) {

        return this.changeStatus(
            parcelId,
            ParcelStatus.DELIVERED
        );
    }
}


module.exports =
    new PostgresParcelModel();