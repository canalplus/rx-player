const {
  le2toi,
  le4toi,
  bytesToStr,
} = require("../utils/bytes");

function parseBif(buf) {
  let pos = 0;

  const length = buf.length;
  const fileFormat = bytesToStr(buf.subarray(pos, pos + 8));   pos += 8;

  const minorVersion = buf[pos]; pos += 1;
  const majorVersion = buf[pos]; pos += 1;
  const patchVersion = buf[pos]; pos += 1;
  const increVersion = buf[pos]; pos += 1;

  const version = [minorVersion, majorVersion, patchVersion, increVersion].join(".");

  const imageCount = buf[pos] + le4toi(buf, pos + 1); pos += 4;
  const timescale = le4toi(buf, pos); pos += 4;

  const format = bytesToStr(buf.subarray(pos, pos + 4)); pos += 4;

  const width = le2toi(buf, pos); pos += 2;
  const height = le2toi(buf, pos); pos += 2;

  const aspectRatio = [buf[pos], buf[pos + 1]].join(":"); pos += 2;

  const isVod = buf[pos] === 1; pos += 1;

  // bytes 0x1F to 0x40 is unused data for now
  pos = 0x40;

  const thumbs = [];
  let currentImage, currentTs = 0;

  if (!imageCount) {
    throw new Error("bif: no images to parse");
  }

  while (pos < length) {
    const currentImageIndex = le4toi(buf, pos); pos += 4;
    const currentImageOffset = le4toi(buf, pos); pos += 4;

    if (currentImage) {
      const index = currentImage.index;
      const duration = timescale;
      const ts = currentTs;
      const data = buf.subarray(currentImage.offset, currentImageOffset);

      thumbs.push({ index, duration, ts, data });

      currentTs += timescale;
    }

    if (currentImageIndex === 0xffffffff) {
      break;
    }

    currentImage = {
      index: currentImageIndex,
      offset: currentImageOffset,
    };
  }

  return {
    fileFormat,
    version,
    imageCount,
    timescale,
    format,
    width,
    height,
    aspectRatio,
    isVod,
    thumbs,
  };
}

module.exports = {
  parseBif,
};
