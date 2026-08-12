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
            current_user AS db_user,
            inet_server_addr() AS server_ip,
            inet_server_port() AS server_port,
            current_setting('server_version') AS postgres_version,
            to_regclass('public.users') AS users_table,
            to_regclass('public.sessions') AS sessions_table
    `);

    console.log("POSTGRES IDENTITY:", result.rows[0]);
}

module.exports = {
    pool,
    testConnection
};
