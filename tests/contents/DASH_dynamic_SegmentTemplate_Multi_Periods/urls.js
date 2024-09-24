/* eslint-env node */

const path = require("path");

const BASE_URL = "/DASH_dynamic_SegmentTemplate_Multi_Periods/media/";

/**
 * URLs for which the request should be stubbed.
 * @type {Array.<Object>}
 */
module.exports = [
  // manifest
  {
    url: BASE_URL + "Manifest.mpd",
    path: path.join(__dirname, "./media/Manifest.mpd"),
    contentType: "application/dash+xml",
  },
];
