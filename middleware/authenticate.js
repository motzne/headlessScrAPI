const debugLog = require("../utils/debugLog");

module.exports = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token || token !== `Bearer ${process.env.API_ACCESS_TOKEN}`) {
    debugLog("Unauthorized access attempt");
    return res.status(401).json({ message: "Unauthorized" });
  }
  debugLog("Authentication successful");
  next();
};