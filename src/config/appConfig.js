const path = require("path");

const rootDir = path.resolve(__dirname, "../..");

module.exports = {
  port: Number(process.env.PORT || 8080),
  dbFile: path.resolve(rootDir, process.env.DB_FILE || "data/database.json"),
  jwtSecret:
        process.env.JWT_SECRET ||
        "SafarDrop@2026#SecretKey",

    jwtExpiresIn:
        process.env.JWT_EXPIRES_IN || "7d"
};
