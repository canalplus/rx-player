/* eslint-env node */
const path = require("path");
const webpackConfig = require("../tools/webpack.config.js");

const coverageIsWanted = !!process.env.RXP_COVERAGE;
const singleRun = !process.env.RXP_TESTS_WATCH;

if (coverageIsWanted) {
  if (!webpackConfig.module) {
    webpackConfig.module = {};
  }

  if (!webpackConfig.module.rules) {
    webpackConfig.module.rules = [];
  }

  // add coverage for js files in src
  webpackConfig.module.rules.push({
    test: /\.js$/,
    enforce: "post",
    include: path.resolve(__dirname, "../src/"),
    exclude: [/__tests__/],
    use: {
      loader: "istanbul-instrumenter-loader",
      query: {
        esModules: true,
      },
    },
  });
}

const karmaConf = {
  basePath: ".",

  singleRun,

  browsers: [
    "Chrome",
    "ChromeCanary",
    "Firefox",
  ],

  reporters: coverageIsWanted ?
    ["mocha", "coverage"] : ["mocha"],

  frameworks: ["mocha"],

  webpack: webpackConfig,

  webpackMiddleware: {
    stats: { colors: true, chunks: false },
  },

  preprocessors: {
    [path.resolve(__dirname, "./integration/index.js")]: "webpack",
    [path.resolve(__dirname, "./unit/index.js")]: "webpack",
  },

  files: [
    path.resolve(__dirname, "./unit/index.js"),
    path.resolve(__dirname, "./integration/index.js"),
  ],

  client: {
    mocha: {
      reporter: "html",
    },
  },

  coverageIstanbulReporter: {
    reports: ["html", "lcovonly", "text-summary"],
    dir: path.resolve(__dirname, "coverage/%browser%"),

    // if using webpack and pre-loaders, work around webpack breaking the source
    // path
    fixWebpackSourcePaths: true,
  },
};

module.exports = function(config) {
  config.set(karmaConf);
};
