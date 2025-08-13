const sharp = require("sharp");

const MAX_SIZE_KB = 25; // Teams limit
const MIN_QUALITY = 20; // Minimum JPEG quality
const MIN_WIDTH = 50;   // Minimum width
const MIN_HEIGHT = 50;  // Minimum height

/**
 * Generates a thumbnail from a base64 screenshot
 * @param {string} screenshotBase64 - base64 string of the screenshot
 * @param {object} thumbnailSettings - { thumbnail_width, thumbnail_height, quality }
 * @param {boolean} optimizedForMSTeams - if true, ensures image < 25KB for Teams
 * @returns {Promise<string>} - base64 thumbnail
 */
module.exports = async (screenshotBase64, thumbnailSettings = false) => {
  let { thumbnail_width, thumbnail_height, quality, optimizedForMSTeams } = thumbnailSettings;
  let buffer = Buffer.from(screenshotBase64, "base64");

  if (!optimizedForMSTeams) {
    // Regular thumbnail
    const outputBuffer = await sharp(buffer)
      .resize({ width: thumbnail_width, height: thumbnail_height, withoutEnlargement: true })
      .toFormat("jpeg")
      .jpeg({ quality })
      .toBuffer();
    return outputBuffer.toString("base64");
  }

  // Optimized for MS Teams
  let outputBuffer = await sharp(buffer)
    .resize({ width: thumbnail_width, height: thumbnail_height, withoutEnlargement: true })
    .toFormat("jpeg")
    .jpeg({ quality })
    .toBuffer();

  while (outputBuffer.length / 1024 > MAX_SIZE_KB) {
    if (quality > MIN_QUALITY) {
      quality -= 5;
    } else if (thumbnail_width > MIN_WIDTH && thumbnail_height > MIN_HEIGHT) {
      thumbnail_width = Math.floor(thumbnail_width * 0.9);
      thumbnail_height = Math.floor(thumbnail_height * 0.9);
    } else {
      break; // cannot reduce further
    }

    outputBuffer = await sharp(buffer)
      .resize({ width: thumbnail_width, height: thumbnail_height, withoutEnlargement: true })
      .toFormat("jpeg")
      .jpeg({ quality })
      .toBuffer();
  }

  return outputBuffer.toString("base64");
};
