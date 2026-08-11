require("dotenv").config();
const http = require("http");
const { port } = require("./config/appConfig");
const { routeRequest } = require("./routes/router");

const server = http.createServer((req, res) => {
  routeRequest(req, res);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`SafarDrop backend running on port ${port}`);
});
