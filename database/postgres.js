const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

pool.on("error", (err) => {
    console.error("Unexpected PostgreSQL error:", err);
});

async function testConnection() {

    const result = await pool.query(
        "SELECT NOW() AS current_time"
    );

    console.log(
        "PostgreSQL connected:",
        result.rows[0].current_time
    );

}

module.exports = {
    pool,
    testConnection
};