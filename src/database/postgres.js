const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
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
