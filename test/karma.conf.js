const webpackConfig = require("../webpack.config.js");

module.exports = function(config) {
  config.set({
    browsers: [
      "Chrome",
      "ChromeCanary",
      "Firefox",
    ],

    reporters: ["mocha"],

    basePath: "..",

    frameworks: ["mocha"],

    webpack: webpackConfig,

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
  });
};
