const {
    PostgresTravellerService
} = require("../services/PostgresTravellerService");

const {
    TravellerService
} = require("../services/TravellerService");

const { ok, error } =
require("../utils/response");

const { Messages } =
require("../constants/messages");

const {
    PayoutService
} = require("../services/PayoutService");


class TravellerController {


    static async dashboard(req, res) {

        try {

            ok(
                res,
                await PostgresTravellerService.dashboard(
                    req.auth.user
                ),
                Messages.PROFILE_FETCHED
            );

        } catch (err) {

            error(
                res,
                err.statusCode || 500,
                err.message,
                err.code,
                err.details
            );

        }

    }


    static async bookings(req, res) {

        try {

            ok(
                res,
                await PostgresTravellerService.bookings(
                    req.auth.user
                ),
                Messages.PROFILE_FETCHED
            );

        } catch (err) {

            error(
                res,
                err.statusCode || 500,
                err.message,
                err.code,
                err.details
            );

        }

    }


    static async pendingBookings(req, res) {

        try {

            ok(
                res,
                await PostgresTravellerService.pendingBookings(
                    req.auth.user
                ),
                Messages.PROFILE_FETCHED
            );

        } catch (err) {

            error(
                res,
                err.statusCode || 500,
                err.message,
                err.code,
                err.details
            );

        }

    }


    static async trips(req, res) {

        try {

            ok(
                res,
                await PostgresTravellerService.trips(
                    req.auth.user
                ),
                Messages.PROFILE_FETCHED
            );

        } catch (err) {

            error(
                res,
                err.statusCode || 500,
                err.message,
                err.code,
                err.details
            );

        }

    }


    static async acceptBooking(req, res) {

        try {

            ok(
                res,
                await PostgresTravellerService.acceptBooking(
                    req.auth.user,
                    req.params.id
                ),
                Messages.TRAVELLER_BOOKED
            );

        } catch (err) {

            error(
                res,
                err.statusCode || 500,
                err.message,
                err.code,
                err.details
            );

        }

    }


    static async rejectBooking(req, res) {

        try {

            ok(
                res,
                await PostgresTravellerService.rejectBooking(
                    req.auth.user,
                    req.params.id
                ),
                Messages.TRAVELLER_BOOKED
            );

        } catch (err) {

            error(
                res,
                err.statusCode || 500,
                err.message,
                err.code,
                err.details
            );

        }

    }


    static async verifyPickupOtp(req, res) {

        try {

            ok(
                res,
                await PostgresTravellerService.verifyPickupOtp(
                    req.auth.user,
                    req.params.id,
                    req.body.otp
                ),
                "Pickup OTP verified successfully"
            );

        } catch (err) {

            error(
                res,
                err.statusCode || 500,
                err.message,
                err.code,
                err.details
            );

        }

    }
static async markInTransit(req, res) {

    try {

        ok(
            res,
            await PostgresTravellerService.markInTransit(
                req.auth.user,
                req.params.id,
                req.body.location || null
            ),
            "Parcel marked in transit successfully"
        );

    } catch (err) {

        error(
            res,
            err.statusCode || 500,
            err.message,
            err.code,
            err.details
        );

    }

}

    static async verifyDeliveryOtp(req, res) {

        try {

            ok(
                res,
                await PostgresTravellerService.verifyDeliveryOtp(
                    req.auth.user,
                    req.params.id,
                    req.body.otp,
                    req.body.location || null
                ),
                "Delivery OTP verified successfully"
            );

        } catch (err) {

            error(
                res,
                err.statusCode || 500,
                err.message,
                err.code,
                err.details
            );

        }

    }


    static async wallet(req, res) {

        try {

            ok(
                res,
                await PostgresTravellerService.wallet(
                    req.auth.user
                ),
                "Wallet fetched successfully"
            );

        } catch (err) {

            error(
                res,
                err.statusCode || 500,
                err.message,
                err.code,
                err.details
            );

        }

    }


    /*
     * Transactions
     *
     * PostgreSQL TravellerService me abhi
     * transactions() confirm nahi kiya gaya hai.
     *
     * Isliye फिलहाल old service use kar rahe hain.
     */

    static transactions(req, res) {

        try {

            ok(
                res,
                TravellerService.transactions(
                    req.auth.user
                ),
                "Transactions fetched successfully"
            );

        } catch (err) {

            error(
                res,
                err.statusCode || 500,
                err.message,
                err.code,
                err.details
            );

        }

    }


    /*
     * Payout
     *
     * Isko abhi change nahi kar rahe.
     * PostgreSQL payout flow separately verify
     * karna hai.
     */

    static releasePayout(req, res) {

        try {

            ok(
                res,
                PayoutService.releaseTravellerPayout(
                    req.params.id
                ),
                "Traveller payout released successfully"
            );

        } catch (err) {

            error(
                res,
                err.statusCode || 500,
                err.message,
                err.code,
                err.details
            );

        }

    }


    /*
     * Legacy advanceDelivery
     *
     * PostgreSQL equivalent already separate
     * endpoints se handle ho raha hai:
     *
     * pickup
     * transit
     * deliver
     *
     * Is method ko फिलहाल old service par hi
     * रहने दे रहे हैं.
     */

    static advanceDelivery(req, res) {

        try {

            ok(
                res,
                TravellerService.advanceDelivery(
                    req.auth.user,
                    req.params.id,
                    req.body
                ),
                "Parcel marked in transit successfully"
            );

        } catch (err) {

            error(
                res,
                err.statusCode || 500,
                err.message,
                err.code,
                err.details
            );

        }

    }

}


module.exports = {
    TravellerController
};