const PostgresBaseModel = require("./PostgresBaseModel");
const { now } = require("../utils/date");

class PostgresTravellerProfileModel extends PostgresBaseModel {

    constructor() {
        super("traveller_profiles");
    }

    mapRow(row) {

        if (!row) {
            return null;
        }

        return {
            id: row.id,

            userId: row.user_id,

            rating:
                row.rating !== null
                    ? Number(row.rating)
                    : 0,

            completedTrips:
                row.completed_trips !== null
                    ? Number(row.completed_trips)
                    : 0,

            vehicleType: row.vehicle_type,

            vehicleNumber: row.vehicle_number,

            maxWeight:
                row.max_weight !== null
                    ? Number(row.max_weight)
                    : null,

            kycVerified:
                row.kyc_verified,

            status: row.status,

            createdAt: row.created_at,

            updatedAt: row.updated_at,

            createdBy: row.created_by,

            updatedBy: row.updated_by,

            isDeleted: row.is_deleted,

            deletedAt: row.deleted_at
        };
    }


    async findByUserId(userId) {

        const row =
            await this.findOneByColumn(
                "user_id",
                userId
            );

        return this.mapRow(row);
    }


    async findAvailable() {

        const rows =
            await this.findManyByColumn(
                "status",
                "AVAILABLE"
            );

        return rows.map(row =>
            this.mapRow(row)
        );
    }


    async findVerified() {

        const result =
            await this.findManyByColumn(
                "kyc_verified",
                true
            );

        return result.map(row =>
            this.mapRow(row)
        );
    }


    async verifyKyc(userId) {

        const profile =
            await this.findByUserId(userId);

        if (!profile) {
            return null;
        }

        const row =
            await this.updateById(
                profile.id,
                {
                    kyc_verified: true,
                    updated_at: now()
                }
            );

        return this.mapRow(row);
    }


    async updateVehicle(
        userId,
        vehicleType,
        vehicleNumber
    ) {

        const profile =
            await this.findByUserId(userId);

        if (!profile) {
            return null;
        }

        const row =
            await this.updateById(
                profile.id,
                {
                    vehicle_type: vehicleType,
                    vehicle_number: vehicleNumber,
                    updated_at: now()
                }
            );

        return this.mapRow(row);
    }


    async updateRating(
        userId,
        rating
    ) {

        const profile =
            await this.findByUserId(userId);

        if (!profile) {
            return null;
        }

        const row =
            await this.updateById(
                profile.id,
                {
                    rating,
                    updated_at: now()
                }
            );

        return this.mapRow(row);
    }
}


module.exports =
    new PostgresTravellerProfileModel();