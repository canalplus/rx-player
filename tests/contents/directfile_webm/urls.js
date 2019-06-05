/* eslint-env node */

const path = require("path");

const BASE_URL = "/directfile_webm/";

module.exports = [
  {
    url: BASE_URL + "DirectFile.webm",
    path: path.join(__dirname, "DirectFile.webm"),
    contentType: "video/webm",
  },
];
