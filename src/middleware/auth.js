const PostgresSessionModel =
    require("../models/PostgresSessionModel");

const PostgresUserModel =
    require("../models/PostgresUserModel");

const { verifyToken } =
    require("../utils/jwt");


async function getAuthUser(req) {

    const header =
        req.headers.authorization || "";

    const token =
        header.startsWith("Bearer ")
            ? header.slice(7)
            : header;

    if (!token) {
        return null;
    }

    // JWT verify
    const payload =
        verifyToken(token);

    if (!payload) {
        return null;
    }

    // PostgreSQL session verify
    const session =
        await PostgresSessionModel.findByToken(token);

    if (!session) {
        return null;
    }

    // Token belongs to same user
    if (session.userId !== payload.userId) {
        return null;
    }

    // PostgreSQL user verify
    const user =
        await PostgresUserModel.findById(
            session.userId
        );

    if (!user) {
        return null;
    }

    return {
        user,
        token,
        session
    };
}


module.exports = {
    getAuthUser
};