/* eslint-env node */

const path = require("path");
const webpackConfig = require("../../webpack-tests.config.js");
const coverageIsWanted = !!process.env.RXP_COVERAGE;

const singleRun = !process.env.RXP_TESTS_WATCH;

const karmaConf = {
  basePath: ".",

  browsers: [
    "FirefoxAutoPlay",
    "ChromeAutoPlay",
  ],

  customLaunchers: {
    FirefoxAutoPlay: {
      base: "Firefox",
      prefs: {
        "media.autoplay.default": 0,
        "media.autoplay.enabled.user-gestures-needed": false,
        "media.autoplay.block-webaudio": false,
        "media.autoplay.ask-permission": false,
        "media.autoplay.block-event.enabled": false,
        "media.block-autoplay-until-in-foreground": false,
      },
    },

    ChromeAutoPlay: {
      base: "Chrome",
      flags: [ "--autoplay-policy=no-user-gesture-required" ],
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
}

module.exports = function(config) {
  config.set(karmaConf);
};
