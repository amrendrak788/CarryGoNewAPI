require("dotenv").config();

const http = require("http");
const { port } = require("./config/appConfig");
const { routeRequest } = require("./routes/router");
const { testConnection } = require("./database/postgres");

const server = http.createServer((req, res) => {
    routeRequest(req, res);
});

server.listen(port, "0.0.0.0", async () => {
    console.log(`SafarDrop backend running on port ${port}`);

    console.log("PostgreSQL environment:", {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        passwordSet: !!process.env.DB_PASSWORD
    });

    try {
        await testConnection();
    } catch (err) {
        console.error("PostgreSQL connection FAILED:", err.message);
    }
});
