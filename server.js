require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const debugLog = require("./utils/debugLog"); // Add debugLog utility
const authenticate = require("./middleware/authenticate");
const scraperRouter = require("./routes/scraper");

const app = express();
const port = 5555;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  debugLog(`Incoming request: ${req.method} ${req.url}`);
  next();
});

app.use("/api/scraper", authenticate, scraperRouter);

app.get("/health", (req, res) => {
  res.status(200).json({ message: `HeadlessScrAPI running` });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  debugLog(`Server is starting on port ${port}`);
  console.log(`Server is running on http://localhost:${port}`);
});

