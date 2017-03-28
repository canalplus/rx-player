/* eslint-env node */
const path = require("path");
const webpackConfig = require("../webpack.config.js");

const coverageIsWanted = process.env.RXP_COVERAGE;

if (coverageIsWanted) {
  if (!webpackConfig.module) {
    webpackConfig.module = {};
  }

  if (!webpackConfig.rules) {
    webpackConfig.rules = [];
  }

  // add coverage for js files in src
  webpackConfig.rules.push({
    test: /\.js$/,
    include: path.resolve("src/"),
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

  reporters: ["mocha"]
    .concat(coverageIsWanted ? ["coverage-istanbul"] : []),

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
    // reports can be any that are listed here:
    // https://github.com/istanbuljs/istanbul-reports/tree/590e6b0089f67b723a1fdf57bc7ccc080ff189d7/lib
    reports: ["html"],

    // base output directory. If you include %browser% in the path it will be
    // replaced with the karma browser name
    dir: path.join(__dirname, "coverage/%browser%/"),

    // if using webpack and pre-loaders, work around webpack breaking the source
    // path
    fixWebpackSourcePaths: true,
  },
};

module.exports = function(config) {
  config.set(karmaConf);
};
