const ParcelStatus = Object.freeze({

    AVAILABLE: "AVAILABLE",

    BOOKED: "BOOKED",

    ACCEPTED: "ACCEPTED",

    PICKED_UP: "PICKED_UP",

    IN_TRANSIT: "IN_TRANSIT",

    DELIVERED: "DELIVERED",

    CANCELLED: "CANCELLED"

});

const DeliveryStatus = Object.freeze({

    BOOKED: "BOOKED",

    ACCEPTED: "ACCEPTED",

    PICKED_UP: "PICKED_UP",

    IN_TRANSIT: "IN_TRANSIT",

    DELIVERED: "DELIVERED",

    CANCELLED: "CANCELLED"

});

const TravellerStatus = Object.freeze({

    AVAILABLE: "AVAILABLE",

    BUSY: "BUSY",

    OFFLINE: "OFFLINE"

});
const BookingStatus = Object.freeze({

    PENDING: "PENDING",

    ACCEPTED: "ACCEPTED",

    REJECTED: "REJECTED",

    CANCELLED: "CANCELLED",

    COMPLETED: "COMPLETED"

});
module.exports = {

    ParcelStatus,
     BookingStatus,
    DeliveryStatus,
    TravellerStatus

};