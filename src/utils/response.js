const { ResponseCodes } = require("../constants/responseCodes");

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });

    res.end(JSON.stringify(data, null, 2));
}

function ok(
    res,
    data = {},
    message = "Success",
    code = ResponseCodes.SUCCESS
) {
    sendJson(res, 200, {
        success: true,
        code,
        message,
        data
    });
}

function created(
    res,
    data = {},
    message = "Created",
    code = ResponseCodes.SUCCESS
) {
    sendJson(res, 201, {
        success: true,
        code,
        message,
        data
    });
}

function error(
    res,
    statusCode,
    message,
    code = ResponseCodes.INTERNAL_SERVER_ERROR,
    details = null
) {
    sendJson(res, statusCode, {
        success: false,
        code,
        message,
        details
    });
}

module.exports = {
    sendJson,
    ok,
    created,
    error
};