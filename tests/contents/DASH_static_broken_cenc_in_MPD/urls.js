/* eslint-env node */
/**
 * Data worth a little more than 15s of playback audio+video
 *
 * Note: the same actual low-bitrate segments are used for every video tracks to
 * avoid being too heavy.
 */

const path = require("path");
const BASE_URL = "/DASH_static_broken_cenc_in_MPD/media/";

module.exports = [
  // Manifest
  {
    url: BASE_URL + "broken_cenc.mpd",
    path: path.join(__dirname, "media/broken_cenc.mpd"),
    contentType: "application/dash+xml",
  },
  {
    url: BASE_URL + "video.mp4",
    path: path.join(__dirname, "media/video.mp4"),
    contentType: "video/mp4",
  },

  // Audio initialization segment
  {
    url: BASE_URL + "audio.mp4",
    path: path.join(__dirname, "media/audio.mp4"),
    contentType: "audio/mp4",
  },
];
