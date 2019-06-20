/* eslint-env node */

const path = require("path");

const BASE_URL = "/DASH_dynamic_SegmentTemplate/media/";
const Manifest_URL = {
  url: BASE_URL + "Manifest.mpd",
  path: path.join(__dirname, "./media/Manifest.mpd"),
  contentType: "application/dash+xml",
};

/**
 * URLs for which the request should be stubbed.
 * @type {Array.<Object>}
 */
module.exports = [
  // manifest
  Manifest_URL,

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
