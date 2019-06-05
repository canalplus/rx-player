/* eslint-env node */

const path = require("path");
export default [
  {
    url: "/imagetracks/image.bif",
    path: path.join(__dirname, "./example.bif"),
    contentType: "application/bif",
  },
];
