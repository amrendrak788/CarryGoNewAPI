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
    try {
        await testConnection();
    } catch (err) {
        console.error("PostgreSQL connection FAILED:", err);
    }
});
