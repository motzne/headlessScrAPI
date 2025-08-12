const express = require("express");
const puppeteerExtra = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const retry = require("../utils/retry");
const debugLog = require("../utils/debugLog");
const generateThumbnail = require("../utils/generateThumbnail");

puppeteerExtra.use(StealthPlugin());

const defaultConfig = {
  viewport: { width: 1920, height: 1080 },
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  browserLaunchTimeout: 5000,
  pageLoadTimeout: 10000,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
  thumbnailSettings: {
    thumbnail_width: 400,
    thumbnail_height: 400,
    quality: 80,
  },
};

const router = express.Router();

router.post("/", async (req, res) => {
  const { url, config } = req.body;
  if (!url) {
    debugLog("Missing URL in request body");
    return res.status(400).json({ message: "URL is required" });
  }

  const effectiveConfig = {
    viewport: config?.viewport || defaultConfig.viewport,
    userAgent: config?.userAgent || defaultConfig.userAgent,
    browserLaunchTimeout: config?.browserLaunchTimeout || defaultConfig.browserLaunchTimeout,
    pageLoadTimeout: config?.pageLoadTimeout || defaultConfig.pageLoadTimeout,
    headless: config?.headless !== undefined ? config.headless : defaultConfig.headless,
    args: config?.args || defaultConfig.args,
    thumbnailSettings: {
      thumbnail_width: config?.thumbnailSettings?.thumbnail_width || defaultConfig.thumbnailSettings.thumbnail_width,
      thumbnail_height: config?.thumbnailSettings?.thumbnail_height || defaultConfig.thumbnailSettings.thumbnail_height,
      quality: config?.thumbnailSettings?.quality || defaultConfig.thumbnailSettings.quality,
    },
  };

  try {
    debugLog(`Scraper started for URL: ${url}`);
    const result = await retry(async () => {

      debugLog("Launching browser with Puppeteer");
      const launchOptions = {
        headless: effectiveConfig.headless,
        args: effectiveConfig.args,
        timeout: effectiveConfig.browserLaunchTimeout,
      };
      if (process.env.CHROMIUM_PATH) {
        debugLog(`Using custom Chromium executable: ${process.env.CHROMIUM_PATH}`);
        launchOptions.executablePath = process.env.CHROMIUM_PATH;
      }
      const browser = await puppeteerExtra.launch(launchOptions);

      const page = await browser.newPage();
      await page.setViewport(effectiveConfig.viewport);
      await page.setUserAgent(effectiveConfig.userAgent);

      debugLog("Navigating to the URL");
      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: effectiveConfig.pageLoadTimeout,
      });

      debugLog("Capturing full screenshot");
      const screenshotBase64 = await page.screenshot({ encoding: "base64" });
      const screenshotFullPageBase64 = await page.screenshot({ encoding: "base64", fullPage: true });

      debugLog("Generating thumbnail");
      const thumbnailBase64 = await generateThumbnail(screenshotBase64, effectiveConfig.thumbnailSettings);

      debugLog("Getting page HTML content");
      const htmlContent = await page.content();

      await browser.close();
      debugLog("Browser closed");

      const isoTimestamp = new Date().toISOString();

      return {
        requested_url: url,
        timestamp: isoTimestamp,
        screenshot: screenshotBase64,
        screenshotFullPage: screenshotFullPageBase64,
        thumbnail: thumbnailBase64,
        htmlContent: htmlContent,
      };
    });

    debugLog("Scraper operation successful");
    res.status(200).json(result);
  } catch (error) {
    debugLog("Scraper operation failed");
    res.status(500).json({
      message: "Failed to capture scraper data",
      error: error.message,
    });
  }
});

module.exports = router;