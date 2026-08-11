const ValidationMessages = Object.freeze({

    NAME_REQUIRED: "Name is required",

    MOBILE_REQUIRED: "Mobile number is required",

    INVALID_MOBILE: "Invalid mobile number",

    PASSWORD_REQUIRED: "Password is required",

    PASSWORD_MIN_LENGTH: "Password must be at least 6 characters",

    CITY_REQUIRED: "City is required",

    ROLE_REQUIRED: "Role is required",

    INVALID_ROLE: "Role must be customer or traveller",

    PARCEL_TITLE_REQUIRED: "Parcel title is required",

    RECEIVER_REQUIRED: "Receiver name is required",

    PICKUP_REQUIRED: "Pickup address is required",

    DROP_REQUIRED: "Delivery address is required",

    WEIGHT_REQUIRED: "Parcel weight is required",

    INVALID_WEIGHT: "Weight must be greater than zero",

    PAYOUT_REQUIRED: "Payout is required",

    INVALID_PAYOUT: "Payout must be greater than zero"

});

module.exports = {
    ValidationMessages
};