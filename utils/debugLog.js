module.exports = (message) => {
  if (process.env.DEBUG === "true") {
    console.debug(`[DEBUG] ${message}`);
  }
};