const {
    PostgresCustomerService
} = require("../services/PostgresCustomerService");
const {
    CustomerService
} = require("../services/CustomerService");
const {
    PostgresPaymentService
} = require("../services/PostgresPaymentService");
const {
    PostgresWalletService
} = require("../services/PostgresWalletService");
const {
    created,
    error,
    ok
} = require("../utils/response");

const {
    Messages
} = require("../constants/messages");

class CustomerController {

    /*
     * =========================================
     * DASHBOARD
     * =========================================
     */

    static async dashboard(req, res) {

        try {

            ok(
                res,
                await PostgresCustomerService.dashboard(
                    req.auth.user
                )
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
     * =========================================
     * CREATE PARCEL
     * =========================================
     */

    static async createParcel(req, res) {

        try {

            created(
                res,
                await PostgresCustomerService.createParcel(
                    req.auth.user,
                    req.body
                ),
                Messages.PARCEL_CREATED
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
     * =========================================
     * CUSTOMER DELIVERIES
     * =========================================
     */

    static async deliveries(req, res) {

        try {

            ok(
                res,
                await PostgresCustomerService.deliveries(
                    req.auth.user
                )
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
     * =========================================
     * CUSTOMER PARCELS
     * =========================================
     */

    static async parcels(req, res) {

        try {

            ok(
                res,
                await PostgresCustomerService.parcels(
                    req.auth.user
                ),
                "Customer parcels fetched successfully"
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
     * =========================================
     * TRACK PARCEL
     * =========================================
     */

    static async trackParcel(req, res) {

        try {

            ok(
                res,
                await PostgresCustomerService.trackParcel(
                    req.auth.user,
                    req.params.id
                ),
                "Parcel tracking fetched successfully"
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
     * =========================================
     * BOOK TRAVELLER
     *
     * NOT MIGRATED YET
     * =========================================
     */

   static async bookTraveller(req, res) {

    try {

        const result =
            await PostgresCustomerService.bookTraveller(
                req.auth.user,
                req.params.id,
                req.body.parcelId,
                req.body.tripId
            );

        ok(
            res,
            result,
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


    /*
     * =========================================
     * RECEIPT
     *
     * NOT MIGRATED YET
     * =========================================
     */

    static receipt(req, res) {

        try {

            ok(
                res,
                CustomerService.receipt(
                    req.auth.user,
                    req.params.id
                ),
                "Receipt fetched successfully"
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
     * =========================================
     * HOLD PAYMENT
     *
     * NOT MIGRATED YET
     * =========================================
     */

   static async holdPayment(req, res) {

    try {

        const result =
            await PostgresPaymentService.holdPayment(
                req.auth.user,
                req.params.id
            );

        ok(
            res,
            result,
            "Payment held successfully"
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
 * =========================================
 * WALLET
 * =========================================
 */

static async wallet(req, res) {

    try {

        ok(
            res,
            await PostgresWalletService.getWallet(
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
 * =========================================
 * ADD MONEY
 *
 * Currently MANUAL.
 * Later Razorpay will use the same
 * topup system.
 * =========================================
 */

static async addMoney(req, res) {

    try {

        const result =
            await PostgresWalletService.createTopup(
                req.auth.user,
                req.body.amount
            );

        created(
            res,
            result,
            "Add money request created successfully"
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
 * =========================================
 * CONFIRM ADD MONEY
 *
 * CURRENTLY MANUAL
 *
 * Later Razorpay verification will happen
 * before this service is called.
 * =========================================
 */

static async confirmAddMoney(req, res) {

    try {

        const result =
            await PostgresWalletService.confirmTopup(
                req.auth.user,
                req.params.id
            );

        ok(
            res,
            result,
            "Money added to wallet successfully"
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
 * =========================================
 * WALLET TOPUP HISTORY
 * =========================================
 */

static async topups(req, res) {

    try {

        ok(
            res,
            await PostgresWalletService.topups(
                req.auth.user
            ),
            "Wallet topups fetched successfully"
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
     * =========================================
     * CANCEL BOOKING
     *
     * NOT MIGRATED YET
     * =========================================
     */

    static cancelBooking(req, res) {

        try {

            ok(
                res,
                CustomerService.cancelBooking(
                    req.auth.user,
                    req.params.id
                ),
                "Booking cancelled and payment refunded successfully"
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
    CustomerController
};