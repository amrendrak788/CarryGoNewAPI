const { parseBody } =
require("../middleware/bodyParser");

const { getAuthUser } =
require("../middleware/auth");

const { AuthController } =
require("../controllers/AuthController");

const { CustomerController } =
require("../controllers/CustomerController");

const { HealthController } =
require("../controllers/HealthController");

const { TravellerController } =
require("../controllers/TravellerController");

const {
    error,
    sendJson
} = require("../utils/response");

const {
    ResponseCodes
} = require("../constants/responseCodes");


const routes = [

    /*
     * =========================================
     * HEALTH
     * =========================================
     */

    {
        method: "GET",
        path: /^\/api\/health$/,
        handler: HealthController.status,
        auth: false
    },


    /*
     * =========================================
     * AUTH
     * =========================================
     */

    {
        method: "POST",
        path: /^\/api\/auth\/login$/,
        handler: AuthController.login,
        auth: false
    },

    {
        method: "POST",
        path: /^\/api\/auth\/signup$/,
        handler: AuthController.signup,
        auth: false
    },

    {
        method: "POST",
        path: /^\/api\/auth\/select-mode$/,
        handler: AuthController.selectMode,
        auth: true
    },

    {
        method: "GET",
        path: /^\/api\/auth\/me$/,
        handler: AuthController.me,
        auth: true
    },

    {
        method: "POST",
        path: /^\/api\/auth\/logout$/,
        handler: AuthController.logout,
        auth: true
    },


    /*
     * =========================================
     * CUSTOMER
     * =========================================
     */

    {
        method: "GET",
        path: /^\/api\/customers\/dashboard$/,
        handler: CustomerController.dashboard,
        auth: true,
        role: "customer"
    },

    {
        method: "POST",
        path: /^\/api\/customers\/parcels$/,
        handler: CustomerController.createParcel,
        auth: true,
        role: "customer"
    },

    {
        method: "GET",
        path: /^\/api\/customers\/deliveries$/,
        handler: CustomerController.deliveries,
        auth: true,
        role: "customer"
    },

    {
        method: "POST",
        path: /^\/api\/customers\/travellers\/([^/]+)\/book$/,
        handler: CustomerController.bookTraveller,
        auth: true,
        role: "customer",
        params: ["id"]
    },

    {
        method: "GET",
        path: /^\/api\/customers\/parcels\/([^/]+)\/track$/,
        handler: CustomerController.trackParcel,
        auth: true,
        role: "customer",
        params: ["id"]
    },

    {
        method: "GET",
        path: /^\/api\/customers\/parcels$/,
        handler: CustomerController.parcels,
        auth: true,
        role: "customer"
    },

    {
        method: "GET",
        path: /^\/api\/customers\/parcels\/([^/]+)\/receipt$/,
        handler: CustomerController.receipt,
        auth: true,
        role: "customer",
        params: ["id"]
    },

    {
        method: "POST",
        path: /^\/api\/customers\/parcels\/([^/]+)\/pay$/,
        handler: CustomerController.holdPayment,
        auth: true,
        role: "customer",
        params: ["id"]
    },

    {
        method: "POST",
        path: /^\/api\/customers\/bookings\/([^/]+)\/cancel$/,
        handler: CustomerController.cancelBooking,
        auth: true,
        role: "customer",
        params: ["id"]
    },


    /*
     * =========================================
     * TRAVELLER
     * =========================================
     */

    {
        method: "GET",
        path: /^\/api\/travellers\/dashboard$/,
        handler: TravellerController.dashboard,
        auth: true,
        role: "traveller"
    },

    {
        method: "GET",
        path: /^\/api\/travellers\/bookings$/,
        handler: TravellerController.bookings,
        auth: true,
        role: "traveller"
    },

    {
        method: "GET",
        path: /^\/api\/travellers\/pending-bookings$/,
        handler: TravellerController.pendingBookings,
        auth: true,
        role: "traveller"
    },

    {
        method: "GET",
        path: /^\/api\/travellers\/trips$/,
        handler: TravellerController.trips,
        auth: true,
        role: "traveller"
    },


    /*
     * =========================================
     * TRAVELLER BOOKING
     * =========================================
     */

    {
        method: "POST",
        path: /^\/api\/travellers\/bookings\/([^/]+)\/accept$/,
        handler: TravellerController.acceptBooking,
        auth: true,
        role: "traveller",
        params: ["id"]
    },

    {
        method: "POST",
        path: /^\/api\/travellers\/bookings\/([^/]+)\/reject$/,
        handler: TravellerController.rejectBooking,
        auth: true,
        role: "traveller",
        params: ["id"]
    },


    /*
     * =========================================
     * TRAVELLER TRIPS
     * =========================================
     */

    {
        method: "POST",
        path: /^\/api\/travellers\/trips$/,
        handler: TravellerController.createTrip,
        auth: true,
        role: "traveller"
    },


    /*
     * =========================================
     * TRAVELLER PARCELS
     * =========================================
     */

    {
        method: "GET",
        path: /^\/api\/travellers\/parcels$/,
        handler: TravellerController.parcels,
        auth: true,
        role: "traveller"
    },

    {
        method: "POST",
        path: /^\/api\/travellers\/parcels\/([^/]+)\/accept$/,
        handler: TravellerController.acceptParcel,
        auth: true,
        role: "traveller",
        params: ["id"]
    },


    /*
     * =========================================
     * LEGACY ADVANCE DELIVERY
     *
     * फिलहाल रखा गया है।
     * बाद में PostgreSQL migration complete
     * होने के बाद हटाया जा सकता है।
     * =========================================
     */

    {
        method: "POST",
        path: /^\/api\/travellers\/deliveries\/([^/]+)\/advance$/,
        handler: TravellerController.advanceDelivery,
        auth: true,
        role: "traveller",
        params: ["id"]
    },


    /*
     * =========================================
     * PICKUP OTP
     *
     * PENDING/ACCEPTED
     *       ↓
     * PICKUP OTP
     *       ↓
     * PICKED_UP
     * =========================================
     */

    {
        method: "POST",
        path: /^\/api\/travellers\/parcels\/([^/]+)\/verify-pickup-otp$/,
        handler: TravellerController.verifyPickupOtp,
        auth: true,
        role: "traveller",
        params: ["id"]
    },


    /*
     * =========================================
     * MARK IN TRANSIT
     *
     * PICKED_UP
     *      ↓
     * IN_TRANSIT
     * =========================================
     */

    {
        method: "POST",
        path: /^\/api\/travellers\/parcels\/([^/]+)\/transit$/,
        handler: TravellerController.markInTransit,
        auth: true,
        role: "traveller",
        params: ["id"]
    },


    /*
     * =========================================
     * DELIVERY OTP
     *
     * IN_TRANSIT
     *      ↓
     * DELIVERY OTP
     *      ↓
     * DELIVERED
     * =========================================
     */

    {
        method: "POST",
        path: /^\/api\/travellers\/parcels\/([^/]+)\/verify-delivery-otp$/,
        handler: TravellerController.verifyDeliveryOtp,
        auth: true,
        role: "traveller",
        params: ["id"]
    },


    /*
     * =========================================
     * PAYOUT
     * =========================================
     */

    {
        method: "POST",
        path: /^\/api\/travellers\/bookings\/([^/]+)\/payout$/,
        handler: TravellerController.releasePayout,
        auth: true,
        role: "traveller",
        params: ["id"]
    },


    /*
     * =========================================
     * WALLET
     * =========================================
     */

    {
        method: "GET",
        path: /^\/api\/travellers\/wallet$/,
        handler: TravellerController.wallet,
        auth: true,
        role: "traveller"
    },


    /*
     * =========================================
     * TRANSACTIONS
     * =========================================
     */

    {
        method: "GET",
        path: /^\/api\/travellers\/transactions$/,
        handler: TravellerController.transactions,
        auth: true,
        role: "traveller"
    }

];


async function routeRequest(req, res) {

    /*
     * -----------------------------------------
     * OPTIONS / CORS
     * -----------------------------------------
     */

    if (req.method === "OPTIONS") {

        sendJson(
            res,
            200,
            {}
        );

        return;
    }


    /*
     * -----------------------------------------
     * PARSE URL
     * -----------------------------------------
     */

    const url =
        new URL(
            req.url,
            `http://${req.headers.host}`
        );


    /*
     * -----------------------------------------
     * FIND ROUTE
     * -----------------------------------------
     */

    const route =
        routes.find(
            item =>
                item.method === req.method &&
                item.path.test(
                    url.pathname
                )
        );


    if (!route) {

        error(
            res,
            404,
            "Route not found"
        );

        return;
    }


    /*
     * -----------------------------------------
     * PARSE BODY
     * -----------------------------------------
     */

    try {

        req.body =
            ["POST", "PUT", "PATCH"]
                .includes(req.method)
                ? await parseBody(req)
                : {};

    } catch (err) {

        error(
            res,
            400,
            err.message
        );

        return;
    }


    /*
     * -----------------------------------------
     * ROUTE PARAMS
     * -----------------------------------------
     */

    const match =
        url.pathname.match(
            route.path
        );

    req.params = {};


    if (
        route.params &&
        match
    ) {

        route.params.forEach(
            (name, index) => {

                req.params[name] =
                    match[index + 1];

            }
        );

    }


    /*
     * -----------------------------------------
     * AUTHENTICATION
     * -----------------------------------------
     */

    if (route.auth) {

        req.auth =
            await getAuthUser(req);


        if (!req.auth) {

            error(
                res,
                401,
                "Unauthorized. Pass Authorization: Bearer ",
                ResponseCodes.UNAUTHORIZED
            );

            return;
        }


        /*
         * -------------------------------------
         * ROLE CHECK
         * -------------------------------------
         */

        if (
            route.role &&
            req.auth.user.selectedRole !==
            route.role
        ) {

            error(
                res,
                403,
                `Forbidden. Continue as ${route.role} before using this API.`,
                ResponseCodes.FORBIDDEN
            );

            return;
        }

    }


    /*
     * -----------------------------------------
     * EXECUTE HANDLER
     * -----------------------------------------
     */

    route.handler(
        req,
        res
    );

}


module.exports = {
    routeRequest
};