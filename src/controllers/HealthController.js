const { ok } = require("../utils/response");

class HealthController {
  static status(req, res) {
    ok(res, {
      app: "SafarDrop Backend API",
      status: "running",
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = { HealthController };
