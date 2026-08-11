const { dbFile } = require("../config/appConfig");
const { JsonDatabase } = require("./JsonDatabase");

const db = new JsonDatabase(dbFile);

module.exports = { db };
