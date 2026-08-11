const BaseModel = require("./BaseModel");
const { DeliveryStatus } = require("../constants/status");
const { now } = require("../utils/date");

class DeliveryModel extends BaseModel {

    constructor() {
        super("deliveries");
    }

    findByParcel(parcelId) {

        return this.findOne(delivery =>
            delivery.parcelId === parcelId
        );

    }

    findByBooking(bookingId) {

        return this.findOne(delivery =>
            delivery.bookingId === bookingId
        );

    }

    findPickedUp() {

        return this.find(delivery =>
            delivery.currentStatus === DeliveryStatus.PICKED_UP
        );

    }

    findInTransit() {

        return this.find(delivery =>
            delivery.currentStatus === DeliveryStatus.IN_TRANSIT
        );

    }

    findDelivered() {

        return this.find(delivery =>
            delivery.currentStatus === DeliveryStatus.DELIVERED
        );

    }

    updateLocation(id, latitude, longitude) {

        const delivery = this.findById(id);

        if (!delivery)
            return null;

        return this.update(id, {

            currentLocation: {

                latitude,

                longitude

            },

            lastUpdated: now()

        });

    }

    addHistory(id, status, location) {

        const delivery = this.findById(id);

        if (!delivery)
            return null;

        const history = delivery.history || [];

        history.push({

            status,

            location,

            timestamp: now()

        });

        return this.update(id, {

            history,

            lastUpdated: now()

        });

    }

    changeStatus(id, status) {

    const delivery = this.findById(id);

    if (!delivery) {
        return null;
    }

    const patch = {

        currentStatus: status,

        state: status,

        lastUpdated: now()

    };

    if (status === DeliveryStatus.ACCEPTED) {

        patch.progress = 20;
        patch.nextAction = "VERIFY_PICKUP";
        patch.meta = "Traveller accepted booking";

    }

    if (status === DeliveryStatus.PICKED_UP) {

        patch.progress = 50;
        patch.nextAction = "MARK_IN_TRANSIT";
        patch.meta = "Parcel picked up";

    }

    if (status === DeliveryStatus.IN_TRANSIT) {

        patch.progress = 75;
        patch.nextAction = "MARK_DELIVERED";
        patch.meta = "Parcel is in transit";

    }

    if (status === DeliveryStatus.DELIVERED) {

        patch.progress = 100;
        patch.nextAction = "VIEW_RECEIPT";
        patch.meta = "Parcel delivered";

    }

    if (status === DeliveryStatus.CANCELLED) {

        patch.nextAction = "NONE";
        patch.meta = "Delivery cancelled";

    }

    return this.update(id, patch);

}

    markPickedUp(id, location) {

        this.addHistory(
            id,
            DeliveryStatus.PICKED_UP,
            location
        );

        return this.changeStatus(
            id,
            DeliveryStatus.PICKED_UP
        );

    }

    markInTransit(id, location) {

        this.addHistory(
            id,
            DeliveryStatus.IN_TRANSIT,
            location
        );

        return this.changeStatus(
            id,
            DeliveryStatus.IN_TRANSIT
        );

    }

    markDelivered(id, location) {

        this.addHistory(
            id,
            DeliveryStatus.DELIVERED,
            location
        );

        return this.changeStatus(
            id,
            DeliveryStatus.DELIVERED
        );

    }
    clearBooking(id) {

    const delivery =
        this.findById(id);

    if (!delivery) {
        return null;
    }

    return this.update(id, {

        bookingId: null,

        currentStatus: "CANCELLED",

        state: "CANCELLED",

        progress: 0,

        nextAction: "BOOK_TRAVELLER",

        meta: "Traveller rejected booking",

        lastUpdated: now()

    });

}

}

module.exports = new DeliveryModel();