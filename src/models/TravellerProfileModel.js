const BaseModel = require("./BaseModel");
const { now } = require("../utils/date");

class TravellerProfileModel extends BaseModel {

    constructor() {
        super("travellerProfiles");
    }

    findByUserId(userId) {

        return this.findOne(
            profile => profile.userId === userId
        );

    }

    findAvailable() {

        return this.find(
            profile => profile.status === "AVAILABLE"
        );

    }

    findVerified() {

        return this.find(
            profile => profile.kycVerified === true
        );

    }

    verifyKyc(userId) {

        const profile = this.findByUserId(userId);

        if (!profile) return null;

        return this.update(profile.id, {
            kycVerified: true,
            updatedAt: now()
        });

    }

    updateVehicle(userId, vehicleType, vehicleNumber) {

        const profile = this.findByUserId(userId);

        if (!profile) return null;

        return this.update(profile.id, {
            vehicleType,
            vehicleNumber,
            updatedAt: now()
        });

    }

    updateRating(userId, rating) {

        const profile = this.findByUserId(userId);

        if (!profile) return null;

        return this.update(profile.id, {
            rating,
            updatedAt: now()
        });

    }

}

module.exports = new TravellerProfileModel();