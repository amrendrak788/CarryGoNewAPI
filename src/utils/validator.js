const { Roles } = require("../constants/roles");
const AppError = require("./AppError");
const { ResponseCodes } = require("../constants/responseCodes");
class Validator {

    static required(value, field) {

        if (
            value === undefined ||
            value === null ||
            value.toString().trim() === ""
        ) {
            throw new AppError(
                400,
                ResponseCodes.VALIDATION_ERROR,
                `${field} is required`
            );
        }

    }

    static mobile(mobile) {

        Validator.required(mobile, "Mobile");

        if (!/^[6-9]\d{9}$/.test(mobile)) {
            throw new AppError(
                400,
                ResponseCodes.VALIDATION_ERROR,
                "Invalid mobile number"
            );
        }

    }

    static password(password) {

        Validator.required(password, "Password");

        if (password.length < 6) {
            throw new AppError(
                400,
                ResponseCodes.VALIDATION_ERROR,
                "Password must be at least 6 characters"
            );
        }

    }

    static number(value, field) {

        Validator.required(value, field);

        if (isNaN(value)) {
            throw new AppError(
                400,
                ResponseCodes.VALIDATION_ERROR,
                `${field} must be a number`
            );
        }

    }

    static positiveNumber(value, field) {

        Validator.number(value, field);

        if (Number(value) <= 0) {
            throw new AppError(
                400,
                ResponseCodes.VALIDATION_ERROR,
                `${field} must be greater than zero`
            );
        }

    }

    static role(role) {

        Validator.required(role, "Role");

        const roles = [
                Roles.CUSTOMER,
                Roles.TRAVELLER
            ];

        if (!roles.includes(role.toLowerCase())) {
           throw new AppError(
                        400,
                        ResponseCodes.VALIDATION_ERROR,
                        "Role must be customer or traveller"
                    );
        }

    }

    static signup(body) {

        Validator.required(body.name, "Name");

        Validator.mobile(body.mobile);

        Validator.password(body.password);

        Validator.required(body.city, "City");

    }

    static login(body) {

        Validator.mobile(body.mobile);

        Validator.password(body.password);

    }

    static parcel(body) {

        Validator.required(body.title, "Parcel title");

        Validator.required(body.receiverName, "Receiver name");

        Validator.required(body.pickup, "Pickup address");

        Validator.required(body.drop, "Delivery address");

        Validator.positiveNumber(body.weight, "Weight");

        Validator.positiveNumber(body.payout, "Payout");

    }

    static trip(body) {

        Validator.required(body.from, "From");

        Validator.required(body.to, "To");

        Validator.required(body.travelDate, "Travel date");

        Validator.required(body.travelTime, "Travel time");

        Validator.positiveNumber(body.availableWeight, "Available weight");

    }

    static booking(body) {

        Validator.required(body.parcelId, "Parcel Id");

        Validator.required(body.tripId, "Trip Id");

    }

}

module.exports = Validator;