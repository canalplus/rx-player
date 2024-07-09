/* eslint-env node */

import * as path from "path";
import patchSegmentWithTimeOffset from "../utils/patchSegmentWithTimeOffset.mjs";
import { fileURLToPath } from "url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

const baseURL = "/DASH_DRM_static_SegmentTemplate/media/";

const segments = [];

// video
[
  "8-80399bf5",
  "9-80399bf5",
  "10-80399bf5",
  "11-90953e09",
  "12-90953e09",
  "1-80399bf5",
  "2-80399bf5",
  "3-80399bf5",
  "4-90953e09",
  "5-90953e09",
].forEach((dir) => {
  segments.push({
    url: baseURL + dir + "/init.mp4",
    path: path.join(currentDirectory, `./media/${dir}/init.mp4`),
    content: "video/mp4",
  });
  const duration = [
    "1-80399bf5",
    "2-80399bf5",
    "3-80399bf5",
    "4-90953e09",
    "5-90953e09",
  ].includes(dir)
    ? 96
    : 4799983;
  for (let i = 1; i <= 184; i++) {
    const nb = String(i).padStart(4, "0");
    segments.push({
      url: baseURL + dir + `/${nb}.m4s`,
      path: path.join(currentDirectory, `./media/${dir}/0001.m4s`),
      postProcess: (buffer) => patchMp4(buffer, (i - 1) * duration),
      content: "video/mp4",
    });
  }
});

[
  // audio
  "15-585f233f",
  "16-4222bd78",
  "17",
].forEach((dir) => {
  segments.push({
    url: baseURL + dir + "/init.mp4",
    path: path.join(currentDirectory, `./media/${dir}/init.mp4`),
    content: "audio/mp4",
  });
  const duration = 95232;
  for (let i = 1; i <= 185; i++) {
    const nb = String(i).padStart(4, "0");
    segments.push({
      url: baseURL + dir + `/${nb}.m4s`,
      path: path.join(currentDirectory, `./media/${dir}/0001.m4s`),
      postProcess: (buffer) => patchMp4(buffer, (i - 1) * duration),
      content: "audio/mp4",
    });
  }
});

[
  // subtitles
  "19",
  "27",
].forEach((dir) => {
  segments.push({
    url: baseURL + dir + "/init.mp4",
    path: path.join(currentDirectory, `./media/${dir}/init.mp4`),
    content: "application/mp4",
  });
  const duration = 4000;
  for (let i = 1; i <= 184; i++) {
    const nb = String(i).padStart(4, "0");
    segments.push({
      url: baseURL + dir + `/${nb}.m4s`,
      path: path.join(currentDirectory, `./media/${dir}/0001.m4s`),
      postProcess: (buffer) => patchMp4(buffer, (i - 1) * duration),
      content: "application/mp4",
    });
  }
});

export default [
  // Manifest
  {
    url: baseURL + "encrypted_multiple_keys_number.mpd",
    path: path.join(currentDirectory, "./media/encrypted_multiple_keys_number.mpd"),
    contentType: "application/dash+xml",
  },
  ...segments,
];

/**
 * Translate groups of 4 big-endian bytes to Integer.
 * @param {Uint8Array} bytes
 * @param {Number} offset - The offset (from the start of the given array)
 * @returns {Number}
 */
function be4toi(bytes, offset) {
  return (
    bytes[offset + 0] * 0x1000000 +
    bytes[offset + 1] * 0x0010000 +
    bytes[offset + 2] * 0x0000100 +
    bytes[offset + 3]
  );
}

function patchMp4(buffer, startTime) {
  const bufferu8 = new Uint8Array(buffer);
  let ret = bufferu8;

  // If it just finishes with "mdat", fill in the rest with 0
  if (
    bufferu8[bufferu8.length - 4] === 0x6d &&
    bufferu8[bufferu8.length - 3] === 0x64 &&
    bufferu8[bufferu8.length - 2] === 0x61 &&
    bufferu8[bufferu8.length - 1] === 0x74
  ) {
    const mdatLen = be4toi(bufferu8, bufferu8.length - 8);
    const remainingLength = mdatLen - 8;
    ret = new Uint8Array(bufferu8.length + remainingLength);
    ret.set(bufferu8, 0);
  }
  return patchSegmentWithTimeOffset(ret, startTime).buffer;
}
