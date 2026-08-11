const PostgresUserModel =
    require("../models/PostgresUserModel");

const PostgresSessionModel =
    require("../models/PostgresSessionModel");

const { createId } = require("../utils/id");
const { generateToken } = require("../utils/jwt");
const Validator = require("../utils/validator");
const { now } = require("../utils/date");
const { Messages } = require("../constants/messages");
const { Roles } = require("../constants/roles");
const AppError = require("../utils/AppError");
const { ResponseCodes } = require("../constants/responseCodes");

class AuthService {

    static async login(body) {

        Validator.login(body);

        const user =
            await PostgresUserModel.findByMobile(
                body.mobile
            );

        if (!user || user.password !== body.password) {

            throw new AppError(
                401,
                ResponseCodes.INVALID_CREDENTIALS,
                Messages.INVALID_CREDENTIALS
            );
        }

        const token = generateToken(user);

        await PostgresUserModel.updateLastLogin(
            user.id
        );

        await PostgresSessionModel.createSession({
            id: createId("ses"),
            token,
            userId: user.id,
            createdAt: now()
        });

        return {
            token,
            user: AuthService.safeUser(user)
        };
    }


    static async signup(body) {

        Validator.signup(body);

        const exists =
            await PostgresUserModel.existsByMobile(
                body.mobile
            );

        if (exists) {

            throw new AppError(
                400,
                ResponseCodes.DUPLICATE_RECORD,
                Messages.MOBILE_ALREADY_EXISTS
            );
        }

        const user =
            await PostgresUserModel.create({

                id: createId("usr"),

                name: body.name,

                mobile: body.mobile,

                password: body.password,

                selectedRole: null,

                city: body.city || "Delhi"

            });

        const token = generateToken(user);

        await PostgresSessionModel.createSession({

            id: createId("ses"),

            token,

            userId: user.id,

            createdAt: now()

        });

        return {
            token,
            user: AuthService.safeUser(user)
        };
    }


    static async selectMode(user, role) {

        if (!Object.values(Roles).includes(role)) {

                        throw new AppError(
                    400,
                    ResponseCodes.INVALID_ROLE,
                    Messages.INVALID_ROLE
                );
        }

        const updated =
            await PostgresUserModel.update(
                user.id,
                {
                    selectedRole: role
                }
            );

        return AuthService.safeUser(updated);
    }


    static safeUser(user) {

        if (!user) {
            return null;
        }

        const {
            password,
            ...safe
        } = user;

        return safe;
    }


    static me(user) {

        return AuthService.safeUser(user);
    }


    static async logout(token) {

        await PostgresSessionModel.deleteByToken(
            token
        );

        return {
            success: true
        };
    }
}

module.exports = { AuthService };