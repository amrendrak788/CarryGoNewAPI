const { AuthService } = require("../services/AuthService");
const { created, error, ok } = require("../utils/response");
const { Messages } = require("../constants/messages");

class AuthController {

    static async login(req, res) {

        try {

            const result =
                await AuthService.login(req.body);

            ok(
                res,
                result,
                Messages.LOGIN_SUCCESS
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


    static async signup(req, res) {

        try {

            const result =
                await AuthService.signup(req.body);

            created(
                res,
                result,
                Messages.SIGNUP_SUCCESS
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


    static async selectMode(req, res) {

        try {

            const result =
                await AuthService.selectMode(
                    req.auth.user,
                    req.body.role
                );

            ok(
                res,
                result,
                Messages.MODE_SELECTED
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


    static me(req, res) {

        try {

            ok(
                res,
                AuthService.me(req.auth.user),
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


    static async logout(req, res) {

        try {

            const result =
                await AuthService.logout(
                    req.auth.token
                );

            ok(
                res,
                result,
                Messages.LOGOUT_SUCCESS
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

module.exports = { AuthController };