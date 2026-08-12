const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

pool.on("error", (err) => {
    console.error("Unexpected PostgreSQL error:", err);
});

async function testConnection() {
    const result = await pool.query(`
        SELECT
            current_database() AS database,
            current_schema() AS schema,
            to_regclass('public.users') AS users_table,
            to_regclass('public.sessions') AS sessions_table
    `);

    console.log("PostgreSQL check:", result.rows[0]);
}

module.exports = {
    pool,
    testConnection
};
