/* eslint-env node */

const path = require("path");

const BASE_URL = "/DASH_dynamic_UTCTimings/media/";

/**
 * URLs for which the request should be stubbed.
 * @type {Array.<Object>}
 */
module.exports = [
  // Manifests
  {
    url: BASE_URL + "Manifest_without_timings.mpd",
    path: path.join(__dirname, "./media/Manifest_without_timings.mpd"),
    contentType: "application/dash+xml",
  },
  {
    url: BASE_URL + "Manifest_with_direct.mpd",
    path: path.join(__dirname, "./media/Manifest_with_direct.mpd"),
    contentType: "application/dash+xml",
  },
  {
    url: BASE_URL + "Manifest_with_http.mpd",
    path: path.join(__dirname, "./media/Manifest_with_http.mpd"),
    contentType: "application/dash+xml",
  },
  {
    url: BASE_URL + "Manifest_with_direct_and_http.mpd",
    path: path.join(__dirname, "./media/Manifest_with_direct_and_http.mpd"),
    contentType: "application/dash+xml",
  },

  // Audio initialization segment
  {
    url: BASE_URL + "A48/init.mp4",
    path: path.join(__dirname, "./media/A48/init.mp4"),
    contentType: "audio/mp4",
  },

  // Audio segments
  {
    url: BASE_URL + "A48/776759063.m4s",
    path: path.join(__dirname, "./media/A48/776759063.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759064.m4s",
    path: path.join(__dirname, "./media/A48/776759064.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759065.m4s",
    path: path.join(__dirname, "./media/A48/776759065.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759066.m4s",
    path: path.join(__dirname, "./media/A48/776759066.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759067.m4s",
    path: path.join(__dirname, "./media/A48/776759067.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759068.m4s",
    path: path.join(__dirname, "./media/A48/776759068.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759069.m4s",
    path: path.join(__dirname, "./media/A48/776759069.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759070.m4s",
    path: path.join(__dirname, "./media/A48/776759070.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759071.m4s",
    path: path.join(__dirname, "./media/A48/776759071.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759072.m4s",
    path: path.join(__dirname, "./media/A48/776759072.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759073.m4s",
    path: path.join(__dirname, "./media/A48/776759073.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759074.m4s",
    path: path.join(__dirname, "./media/A48/776759074.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759075.m4s",
    path: path.join(__dirname, "./media/A48/776759075.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759076.m4s",
    path: path.join(__dirname, "./media/A48/776759076.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759077.m4s",
    path: path.join(__dirname, "./media/A48/776759077.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759078.m4s",
    path: path.join(__dirname, "./media/A48/776759078.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759079.m4s",
    path: path.join(__dirname, "./media/A48/776759079.m4s"),
    contentType: "audio/mp4",
  },

  // Video initialization segment
  {
    url: BASE_URL + "V300/init.mp4",
    path: path.join(__dirname, "./media/V300/init.mp4"),
    contentType: "video/mp4",
  },

  // Video Segments
  {
    url: BASE_URL + "V300/776759063.m4s",
    path: path.join(__dirname, "./media/V300/776759063.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759064.m4s",
    path: path.join(__dirname, "./media/A48/776759064.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759065.m4s",
    path: path.join(__dirname, "./media/V300/776759065.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759066.m4s",
    path: path.join(__dirname, "./media/V300/776759066.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759067.m4s",
    path: path.join(__dirname, "./media/V300/776759067.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759068.m4s",
    path: path.join(__dirname, "./media/V300/776759068.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759069.m4s",
    path: path.join(__dirname, "./media/V300/776759069.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759070.m4s",
    path: path.join(__dirname, "./media/V300/776759070.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759071.m4s",
    path: path.join(__dirname, "./media/V300/776759071.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759072.m4s",
    path: path.join(__dirname, "./media/V300/776759072.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759073.m4s",
    path: path.join(__dirname, "./media/V300/776759073.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759074.m4s",
    path: path.join(__dirname, "./media/V300/776759074.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759075.m4s",
    path: path.join(__dirname, "./media/V300/776759075.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759076.m4s",
    path: path.join(__dirname, "./media/V300/776759076.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759077.m4s",
    path: path.join(__dirname, "./media/V300/776759077.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759078.m4s",
    path: path.join(__dirname, "./media/V300/776759078.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759079.m4s",
    path: path.join(__dirname, "./media/V300/776759079.m4s"),
    contentType: "audio/mp4",
  },
];
