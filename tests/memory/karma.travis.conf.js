/* eslint-env node */
const path = require("path");
const webpackConfig = require("../../webpack-tests.config.js");

const singleRun = !process.env.RXP_TESTS_WATCH;

const karmaConf = {
  basePath: ".",

  browserNoActivityTimeout: 5 * 60 * 1000,

  browsers: [
    "ChromeHeadlessMemory",
  ],

  customLaunchers: {
    ChromeHeadlessMemory: {
      base: "ChromeHeadless",
      flags: [
        "--autoplay-policy=no-user-gesture-required",
        "--enable-precise-memory-info",
        "--js-flags=\"--expose-gc\"",
      ],
    },
  },

  singleRun,

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
