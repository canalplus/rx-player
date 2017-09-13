/* eslint-env node */

// Used environment variables:
//
//   - RXP_ENV
//   Either "production" or "development". "production" as a default.
//   In the "development" case:
//     - logs will be activated
//     - the code will be less tolerant towards unwanted behavior
//     - the code will be less optimized
//
//   - RXP_MINIFY
//   The code will be minified when built
//
//   - RXP_SMOOTH
//   If set to "false", all code relative to HSS streaming will be ignored
//   during a build
//
//   - RXP_DASH
//   If set to "false", all code relative to DASH streaming will be ignored
//   during a build
//
//   - RXP_DIRECTFILE
//   If set to "false", all code relative to direct file streaming will be
//   ignored during a build

const ClosureCompiler = require("webpack-closure-compiler");

const RXP_ENV = process.env.RXP_ENV || "production";

const shouldMinify = process.env.RXP_MINIFY;

if (["development", "production"].indexOf(RXP_ENV) < 0) {
  throw new Error("unknown RXP_ENV " + RXP_ENV);
}

const webpack = require("webpack");

const config = {
  output: {
    library: "RxPlayer",
    libraryTarget: "umd",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              "react",
              ["es2015", { loose: true, modules: false }],
            ],
          },
        },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      "__FEATURES__": {
        SMOOTH: process.env.RXP_SMOOTH !== "false",
        DASH: process.env.RXP_DASH !== "false",
        DIRECTFILE: process.env.RXP_DIRECTFILE !== "false",

        // TODO
        // TTML: process.env.RXP_TTML !== "false",
        // SAMI: process.env.RXP_SAMI !== "false",
        // BIF: process.env.RXP_BIF !== "false",
      },
      "__DEV__": RXP_ENV === "development",
      "__LOGGER_LEVEL__": "\"DEBUG\"",
      "process.env": {
        NODE_ENV: JSON.stringify(RXP_ENV),
      },
    }),
  ],
  node: {
    console: false,
    global: true,
    process: false,
    Buffer: false,
    __filename: false,
    __dirname: false,
    setImmediate: false,
  },
};

if (shouldMinify) {
  config.plugins.push(new ClosureCompiler({
    options: {
      compilation_level: "SIMPLE",
      language_in: "ES5",
      warning_level: "VERBOSE",
    },
  }));
}

module.exports = config;
