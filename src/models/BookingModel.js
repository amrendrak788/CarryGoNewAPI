
const BaseModel = require("./BaseModel");
const { BookingStatus } = require("../constants/status");
const { now } = require("../utils/date");

class BookingModel extends BaseModel {

    constructor() {
        super("bookings");
    }

    findByCustomer(customerId) {

        return this.find(booking =>
            booking.customerId === customerId
        );

    }

    findByTraveller(travellerId) {

        return this.find(booking =>
            booking.travellerId === travellerId
        );

    }

    findByParcel(parcelId) {

        return this.findOne(booking =>
            booking.parcelId === parcelId
        );

    }

    findByTrip(tripId) {

        return this.find(booking =>
            booking.tripId === tripId
        );

    }

    findPending() {

        return this.find(booking =>
            booking.status === BookingStatus.PENDING
        );

    }

    findAccepted() {

        return this.find(booking =>
            booking.status === BookingStatus.ACCEPTED
        );

    }

    findRejected() {

        return this.find(booking =>
            booking.status === BookingStatus.REJECTED
        );

    }

    findCancelled() {

        return this.find(booking =>
            booking.status === BookingStatus.CANCELLED
        );

    }

    accept(id) {

        return this.update(id, {

            status: BookingStatus.ACCEPTED,

            acceptedAt: now(),

            updatedAt: now()

        });

    }

    reject(id) {

        return this.update(id, {

            status: BookingStatus.REJECTED,

            rejectedAt: now(),

            updatedAt: now()

        });

    }

    cancel(id) {

        return this.update(id, {

            status: BookingStatus.CANCELLED,

            cancelledAt: now(),

            updatedAt: now()

        });

    }

    complete(id) {

        return this.update(id, {

            status: BookingStatus.COMPLETED,

            completedAt: now(),

            updatedAt: now()

        });

    }

}

module.exports = new BookingModel();