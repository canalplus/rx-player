/* eslint-env node */

const path = require("path");
export default [
  {
    url: "/texttracks/subtitle_example.xml",
    path: path.join(__dirname, "./subtitle_example.xml"),
    contentType: "application/ttml+xml",
  },
];
