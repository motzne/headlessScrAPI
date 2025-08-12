const sharp = require("sharp");

module.exports = async (screenshotBase64, thumbnailSettings) => {
  const { thumbnail_width, thumbnail_height, quality } = thumbnailSettings;
  const thumbnailBuffer = await sharp(Buffer.from(screenshotBase64, "base64"))
    .resize({
      width: thumbnail_width,
      height: thumbnail_height,
      withoutEnlargement: true,
    })
    .toFormat("jpeg")
    .jpeg({ quality: quality })
    .toBuffer();
  return thumbnailBuffer.toString("base64");
};