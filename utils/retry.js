const debugLog = require("./debugLog");

module.exports = async (fn, retries = 3, delay = 5000) => {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      debugLog(`Attempt ${i + 1} to perform action`);
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        debugLog(`Retrying after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};
