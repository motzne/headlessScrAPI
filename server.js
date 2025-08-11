require("dotenv").config(); // Load environment variables
const express = require("express");
const bodyParser = require("body-parser");
const puppeteer = require("puppeteer");
const puppeteerExtra = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const sharp = require("sharp"); // For image processing (thumbnail generation)
const { setTimeout } = require("timers");

// Enable the stealth plugin
puppeteerExtra.use(StealthPlugin());

const app = express();
const port = 5555;

// Enable debug mode from .env file
const debugMode = process.env.DEBUG === "true";

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Default configuration values
const defaultConfig = {
  viewport: { width: 1920, height: 1080 }, // Normal desktop resolution
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  browserLaunchTimeout: 5000, // Timeout for browser launch
  pageLoadTimeout: 10000, // Timeout for page load
  headless: true, // Default to headless mode
  args: ["--no-sandbox", "--disable-setuid-sandbox"], // Default Puppeteer args
  thumbnailSettings: {
    thumbnail_width: 400, // Max width for thumbnail
    thumbnail_height: 400, // Max height for thumbnail
    quality: 80, // Compression quality for JPEG thumbnail
  },
};

// Authentication middleware to check API token
const authenticate = (req, res, next) => {
  const token = req.headers["authorization"];

  // Check if token is provided and matches the stored token
  if (!token || token !== `Bearer ${process.env.API_ACCESS_TOKEN}`) {
    debugLog("Unauthorized access attempt");
    return res.status(401).json({ message: "Unauthorized" });
  }

  debugLog("Authentication successful");
  next();
};

// Retry helper function
const retry = async (fn, retries = 3, delay = 3000) => {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      debugLog(`Attempt ${i + 1} to perform action`);
      return await fn();
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${i + 1} failed: ${error.message}`);
      if (i < retries - 1) {
        debugLog(`Retrying after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay)); // Delay before retrying
      }
    }
  }
  throw lastError; // If all attempts fail, throw the last error encountered
};

// Debug logging function
const debugLog = (message) => {
  if (debugMode) {
    console.debug(`[DEBUG] ${message}`);
  }
};

// Generate a smaller thumbnail while maintaining aspect ratio and compressing it
const generateThumbnail = async (screenshotBase64, thumbnailSettings) => {
  const { thumbnail_width, thumbnail_height, quality } = thumbnailSettings;

  // Resize the image while keeping the aspect ratio and compressing it
  const thumbnailBuffer = await sharp(Buffer.from(screenshotBase64, "base64"))
    .resize({
      width: thumbnail_width,
      height: thumbnail_height,
      withoutEnlargement: true,
    }) // Maintain aspect ratio
    .toFormat("jpeg") // Convert to JPEG to reduce file size
    .jpeg({ quality: quality }) // Adjust JPEG quality for compression
    .toBuffer(); // Convert to buffer

  return thumbnailBuffer.toString("base64"); // Convert thumbnail buffer to base64 string
};

// Scraper endpoint: captures a screenshot, HTML DOM, and generates a thumbnail
app.post("/scraper", authenticate, async (req, res) => {
  const { url, config } = req.body;

  if (!url) {
    debugLog("Missing URL in request body");
    return res.status(400).json({ message: "URL is required" });
  }

  // Merge the provided config with the default config
  const effectiveConfig = {
    viewport: config?.viewport || defaultConfig.viewport,
    userAgent: config?.userAgent || defaultConfig.userAgent,
    browserLaunchTimeout:
      config?.browserLaunchTimeout || defaultConfig.browserLaunchTimeout,
    pageLoadTimeout: config?.pageLoadTimeout || defaultConfig.pageLoadTimeout,
    headless:
      config?.headless !== undefined ? config.headless : defaultConfig.headless,
    args: config?.args || defaultConfig.args,
    thumbnailSettings: {
      thumbnail_width:
        config?.thumbnailSettings?.thumbnail_width ||
        defaultConfig.thumbnailSettings.thumbnail_width,
      thumbnail_height:
        config?.thumbnailSettings?.thumbnail_height ||
        defaultConfig.thumbnailSettings.thumbnail_height,
      quality:
        config?.thumbnailSettings?.quality ||
        defaultConfig.thumbnailSettings.quality,
    },
  };

  try {
    debugLog(`Scraper started for URL: ${url}`);
    const result = await retry(async () => {
      debugLog("Launching browser with Puppeteer");
      const browser = await puppeteerExtra.launch({
        headless: effectiveConfig.headless,
        args: effectiveConfig.args,
        timeout: effectiveConfig.browserLaunchTimeout,
        executablePath: "/usr/bin/chromium",
      });

      const page = await browser.newPage();

      // Set the viewport and user agent from the request or use the defaults
      await page.setViewport(effectiveConfig.viewport);
      await page.setUserAgent(effectiveConfig.userAgent);

      debugLog("Navigating to the URL");
      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: effectiveConfig.pageLoadTimeout,
      }); // Timeout for page load

      // Capture the screenshot as base64
      debugLog("Capturing full screenshot");
      const screenshotBase64 = await page.screenshot({ encoding: "base64" });

      // Generate a smaller thumbnail while keeping the aspect ratio
      debugLog("Generating thumbnail");
      const thumbnailBase64 = await generateThumbnail(
        screenshotBase64,
        effectiveConfig.thumbnailSettings
      );

      // Get the HTML DOM of the loaded page
      debugLog("Getting page HTML content");
      const htmlContent = await page.content();

      await browser.close();
      debugLog("Browser closed");

      const isoTimestamp = new Date().toISOString();

      return {
        requested_url: url,
        timestamp: isoTimestamp,
        screenshot: screenshotBase64,
        thumbnail: thumbnailBase64,
        htmlContent: htmlContent,
      };
    });

    debugLog("Scraper operation successful");
    res.status(200).json(result); // Send the result as JSON response
  } catch (error) {
    console.error("Error capturing scraper data:", error);
    debugLog("Scraper operation failed");
    res.status(500).json({
      message: "Failed to capture scraper data",
      error: error.message,
    });
  }
});

// Example endpoint to handle site scraping requests (unchanged)
app.get("/", authenticate, (req, res) => {
  // Placeholder for site scraping logic
  res.status(200).json({ message: `HeadlessScrAPI running` });
});

// Start the server on port 5555
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  debugLog(`Server started on port ${port}`);
});
