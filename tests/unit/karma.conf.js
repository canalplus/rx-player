/* eslint-env node */
const path = require("path");
const webpackConfig = require("../../tools/webpack.config.js");

const singleRun = !process.env.RXP_TESTS_WATCH;

const karmaConf = {
  basePath: "..",

  browsers: [
    "Chrome",
    "ChromeCanary",
    "Firefox",
  ],

  singleRun,

  reporters: ["mocha", "coverage-istanbul"],

  frameworks: ["mocha"],

  webpack: webpackConfig,

  webpackMiddleware: {
    stats: { colors: true, chunks: false },
  },

  preprocessors: {
    [path.resolve(__dirname, "./index.js")]: "webpack",
  },

  files: [
    path.resolve(__dirname, "./index.js"),
  ],

  client: {
    mocha: {
      reporter: "html",
    },
  },
};

module.exports = function(config) {
  config.set(karmaConf);
};
