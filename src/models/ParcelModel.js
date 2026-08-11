const BaseModel = require("./BaseModel");
const { ParcelStatus } = require("../constants/status");
const { now } = require("../utils/date");

class ParcelModel extends BaseModel {

    constructor() {
        super("parcels");
    }

    findByCustomer(customerId) {

        return this.find(parcel =>
            parcel.customerId === customerId
        );

    }

    findByTraveller(travellerId) {

        return this.find(parcel =>
            parcel.travellerId === travellerId
        );

    }

    findAvailable() {

        return this.find(parcel =>
            parcel.status === ParcelStatus.AVAILABLE
        );

    }

    findBooked() {

        return this.find(parcel =>
            parcel.status === ParcelStatus.BOOKED
        );

    }

    findAccepted() {

        return this.find(parcel =>
            parcel.status === ParcelStatus.ACCEPTED
        );

    }

    findPickedUp() {

        return this.find(parcel =>
            parcel.status === ParcelStatus.PICKED_UP
        );

    }

    findInTransit() {

        return this.find(parcel =>
            parcel.status === ParcelStatus.IN_TRANSIT
        );

    }

    findDelivered() {

        return this.find(parcel =>
            parcel.status === ParcelStatus.DELIVERED
        );

    }

    findCancelled() {

        return this.find(parcel =>
            parcel.status === ParcelStatus.CANCELLED
        );

    }

    assignTraveller(parcelId, travellerId) {

        return this.update(parcelId, {

            travellerId,
            status: ParcelStatus.BOOKED,
            updatedAt: now()

        });

    }

    unassignTraveller(parcelId) {

        return this.update(parcelId, {

            travellerId: null,

            updatedAt: now()

        });

    }

    verifyPickupOtp(parcelId) {

        return this.update(parcelId, {

            pickupOtpVerified: true,
            status: ParcelStatus.PICKED_UP,
            updatedAt: now()

        });

    }

    verifyDeliveryOtp(parcelId) {

        return this.update(parcelId, {

            deliveryOtpVerified: true,
            status: ParcelStatus.DELIVERED,
            updatedAt: now()

        });

    }

    changeStatus(parcelId, status) {

        return this.update(parcelId, {

            status,

            updatedAt: now()

        });

    }

    cancel(parcelId) {

        return this.changeStatus(
            parcelId,
           ParcelStatus.CANCELLED
        );

    }

    complete(parcelId) {

        return this.changeStatus(
            parcelId,
            ParcelStatus.DELIVERED
        );

    }

}

module.exports = new ParcelModel();