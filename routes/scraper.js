const express = require("express");
const puppeteerExtra = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const useProxy = require("@lem0-packages/puppeteer-page-proxy");
const retry = require("../utils/retry");
const debugLog = require("../utils/debugLog");
const generateThumbnail = require("../utils/generateThumbnail");

puppeteerExtra.use(StealthPlugin());

const defaultConfig = {
  viewport: { width: 1920, height: 1080 },
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  browserLaunchTimeout: 5000,
  pageLoadTimeout: 10000,
  proxy: null,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
  thumbnailSettings: {
    thumbnail_width: 400,
    thumbnail_height: 400,
    quality: 80,
    optimizedForMSTeams: false,
  },
};

const router = express.Router();

router.post("/", async (req, res) => {
  const { url, config, features } = req.body;

  if (!url) {
    debugLog("Missing URL in request body");
    return res.status(400).json({ message: "URL is required" });
  }

  // Default to enabling all features if none specified
  const effectiveFeatures = {
    screenshot: false,
    screenshotFullpage: false,
    thumbnail: false,
    htmlContent: false,
    redirectChain: false,
    ...features,
  };

  const effectiveConfig = {
    viewport: config?.viewport || defaultConfig.viewport,
    userAgent: config?.userAgent || defaultConfig.userAgent,
    browserLaunchTimeout:
      config?.browserLaunchTimeout || defaultConfig.browserLaunchTimeout,
    pageLoadTimeout: config?.pageLoadTimeout || defaultConfig.pageLoadTimeout,
    proxy: config?.proxy !== undefined ? config.proxy : defaultConfig.proxy,
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
      optimizedForMSTeams:
        config?.optimizedForMSTeams !== undefined
          ? config.optimizedForMSTeams
          : defaultConfig.optimizedForMSTeams,
    },
  };

  let browser;
  try {
    debugLog(`Scraper started for URL: ${url}`);
    const result = await retry(async () => {
      debugLog("Launching browser with Puppeteer");
      const launchOptions = {
        headless: true,
        args: effectiveConfig.args,
        timeout: effectiveConfig.browserLaunchTimeout,
      };

      if (process.env.USE_CHROMIUM === "true") {
        debugLog(
          `Using custom Chromium executable: ${process.env.USE_CHROMIUM}`
        );
        launchOptions.executablePath = "/usr/bin/chromium";
      }

      browser = await puppeteerExtra.launch(launchOptions);
      const page = await browser.newPage();
      if (effectiveConfig.proxy == null) {
        debugLog("No proxy configured, proceeding without proxy");
      } else {
        debugLog(`Using proxy: ${effectiveConfig.proxy}`);
        await useProxy(page, effectiveConfig.proxy);
      }
      await page.setViewport(effectiveConfig.viewport);
      await page.setUserAgent(effectiveConfig.userAgent);

      debugLog("Navigating to the URL");
      const response = await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: effectiveConfig.pageLoadTimeout,
      });

      const responseData = {};
      const isoTimestamp = new Date().toISOString();
      responseData.requested_url = url;
      responseData.timestamp = isoTimestamp;

      if (effectiveFeatures.redirectChain && response) {
        debugLog("Capturing redirect chain");
        // Puppeteer redirectChain returns array of Requests
        const chain = response.request().redirectChain();
        responseData.redirectChain = chain.map((r) => ({
          url: r.url(),
          method: r.method(),
          headers: r.headers(),
        }));
      }

      if (effectiveFeatures.screenshot) {
        debugLog("Capturing screenshot");
        responseData.screenshot = await page.screenshot({ encoding: "base64" });
      }

      if (effectiveFeatures.screenshotFullpage) {
        debugLog("Capturing full-page screenshot");
        responseData.screenshotFullPage = await page.screenshot({
          encoding: "base64",
          fullPage: true,
        });
      }

      if (effectiveFeatures.thumbnail) {
        debugLog("Generating thumbnail");
        const sourceScreenshot =
          responseData.screenshot ||
          (await page.screenshot({ encoding: "base64" }));
        responseData.thumbnail = await generateThumbnail(
          sourceScreenshot,
          effectiveConfig.thumbnailSettings
        );
      }

      if (effectiveFeatures.htmlContent) {
        debugLog("Getting HTML content");
        responseData.htmlContent = await page.content();
      }

      await browser.close();
      debugLog("Browser closed");

      return responseData;
    });

    debugLog("Scraper operation successful");
    res.status(200).json(result);
  } catch (error) {
    debugLog("Scraper operation failed");
    res.status(500).json({
      message: "Failed to capture scraper data",
      error: error.message,
    });
  } finally {
    // Close the browser instance, even if an error occurs
    if (browser) {
      await browser.close();
    }
  }
});

module.exports = router;
