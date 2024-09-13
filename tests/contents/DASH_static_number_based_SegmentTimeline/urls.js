/* eslint-env node */

const path = require("path");

/**
 * Data worth a little more than 15s of playback audio+video
 *
 * Note: the same actual low-bitrate segments are used for every video tracks to
 * avoid being too heavy.
 */

const baseURL = "/DASH_static_number_based_SegmentTimeline/media/";

module.exports = [
  // Manifest
  {
    url: baseURL + "manifest.mpd",
    path: path.join(__dirname, "./media/manifest.mpd"),
    contentType: "application/dash+xml",
  },
  {
    url: baseURL + "end_number.mpd",
    path: path.join(__dirname, "./media/end_number.mpd"),
    contentType: "application/dash+xml",
  },
];
