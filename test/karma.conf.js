/* eslint-env node */
const path = require("path");
const webpackConfig = require("../webpack.config.js");

const coverageIsWanted = process.env.RXP_COVERAGE;

if (coverageIsWanted) {
  if (!webpackConfig.module) {
    webpackConfig.module = {};
  }

  if (!webpackConfig.module.postLoaders) {
    webpackConfig.module.postLoaders = [];
  }

  // add coverage for js files in src
  webpackConfig.module.postLoaders.push({
    test: /\.js$/,
    include: path.resolve(__dirname, "../src/"),
    loader: "istanbul-instrumenter-loader",
  });
}

const karmaConf = {
  basePath: "..",

  browsers: [
    "Chrome",
    "ChromeCanary",
    "Firefox",
  ],

  singleRun: !!coverageIsWanted,

  reporters: ["mocha", "coverage-istanbul"],

  frameworks: ["mocha"],

  webpack: webpackConfig,

  webpackMiddleware: {
    stats: { colors: true, chunks: false },
  },

  preprocessors: {
    "test/index.js": ["webpack"],
  },

  files: [
    "test/index.js",
  ],

  client: {
    mocha: {
      reporter: "html",
    },
  },

  coverageIstanbulReporter: {
    reports: ["html", "lcovonly", "text-summary"],
    dir: path.resolve(__dirname, "../coverage/%browser%"),

    // if using webpack and pre-loaders, work around webpack breaking the source
    // path
    fixWebpackSourcePaths: true,
  },
};

module.exports = function(config) {
  config.set(karmaConf);
};
