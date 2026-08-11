const BaseModel = require("./BaseModel");

class TripModel extends BaseModel {

    constructor() {
        super("trips");
    }

    findByTraveller(travellerId) {

        return this.find(trip =>
            trip.travellerId === travellerId
        );

    }

    findAvailable() {

        return this.find(trip =>
            trip.status === "ACTIVE"
        );

    }

    findCompleted() {

        return this.find(trip =>
            trip.status === "COMPLETED"
        );

    }

    findUpcoming() {

        const today = new Date().toISOString().split("T")[0];

        return this.find(trip =>
            trip.travelDate >= today &&
            trip.status === "ACTIVE"
        );

    }

    findByDate(date) {

        return this.find(trip =>
            trip.travelDate === date
        );

    }

    findByRoute(from, to) {

        return this.find(trip =>

            trip.from.address
                .toLowerCase()
                .includes(from.toLowerCase())

            &&

            trip.to.address
                .toLowerCase()
                .includes(to.toLowerCase())

        );

    }

    updateStatus(id, status) {

        return this.update(id, {

            status,

            updatedAt: now()

        });

    }

    increaseCapacity(id, weight) {

        const trip = this.findById(id);

        if (!trip)
            return null;

        return this.update(id, {

            availableWeight:

                Number(trip.availableWeight) +
                Number(weight),

            updatedAt: new Date().toISOString()

        });

    }

    decreaseCapacity(id, weight) {

        const trip = this.findById(id);

        if (!trip)
            return null;

        if (trip.availableWeight < weight)
            throw new Error("Trip capacity exceeded");

        return this.update(id, {

            availableWeight:

                Number(trip.availableWeight) -
                Number(weight),

            updatedAt: new Date().toISOString()

        });

    }

    cancel(id) {

        return this.updateStatus(id, "CANCELLED");

    }

    complete(id) {

        return this.updateStatus(id, "COMPLETED");

    }

}

module.exports = new TripModel();