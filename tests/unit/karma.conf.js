/* eslint-env node */
const path = require("path");
const webpackConfig = require("../../webpack-tests.config.js");

const singleRun = !process.env.RXP_TESTS_WATCH;

const karmaConf = {
  basePath: ".",

  browsers: [
    // "Chrome",
    // "ChromeHeadless",
    // "ChromeCanary",
    "FirefoxHeadless",
    "ChromeHeadlessAutoPlay",
  ],

  singleRun,

  customLaunchers: {
    FirefoxHeadless: {
      base: "Firefox",
      flags: [ "-headless" ],
    },

    ChromeHeadlessAutoPlay: {
      base: "ChromeHeadless",
      flags: [
        "--autoplay-policy=no-user-gesture-required",
      ],
    },
  },

  reporters: ["mocha"],

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
