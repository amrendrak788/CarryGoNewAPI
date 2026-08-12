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
            current_database() AS database_name,
            current_schema() AS schema_name,
            current_setting('search_path') AS search_path,
            EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'users'
            ) AS users_exists
    `);

    console.log("POSTGRES CHECK:", result.rows[0]);
}
module.exports = {
    pool,
    testConnection
};
