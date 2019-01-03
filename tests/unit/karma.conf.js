/* eslint-env node */

const path = require("path");
const webpackConfig = require("../../webpack-tests.config.js");
const coverageIsWanted = !!process.env.RXP_COVERAGE;

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

  reporters: ["dots"],

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
    captureConsole: false,
    mocha: {
      reporter: "html",
    },
  },
};

if (coverageIsWanted) {
  karmaConf.reporters.push("coverage-istanbul");
  karmaConf.coverageIstanbulReporter = {
    reports: [ "html", "text-summary" ],
    dir: path.join(__dirname, "coverage"),
    fixWebpackSourcePaths: true,
    "report-config": {
      html: { outdir: "html" },
    },
  };
  karmaConf.preprocessors = {
    [path.resolve(__dirname, "./coverage.js")]: "webpack",
  };
  karmaConf.files =  [
    path.resolve(__dirname, "./coverage.js"),
  ];
}

module.exports = function(config) {
  config.set(karmaConf);
};
