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
//   - RXP_BAREBONE
//   If set to "true", the following features are deactivated by default, unless
//   stated otherwise:
//     - Smooth Streaming
//     - DASH
//     - DirectFile Streaming
//     - Native TTML
//     - Native SAMI
//     - Native VTT
//     - Native SRT
//     - TTML in "html" mode
//     - SAMI in "html" mode
//     - VTT in "html" mode
//     - SRT in "html" mode
//    Any of those can then be added through their specific environment
//    variables.
//    /!\ With RXP_BAREBONE and no feature activated, the Rx-Player won't be
//    able to play any content. This variable is only here to let you opt-in
//    the features you want.
//
//   - RXP_SMOOTH
//   If set to "false", all code relative to HSS streaming will be ignored
//   during a build.
//   (If RXP_BAREBONE was set to "true", you have to explicitely set this value
//   to "true" to include this feature in the build.)
//
//   - RXP_DASH
//   If set to "false", all code relative to DASH streaming will be ignored
//   during a build.
//   (If RXP_BAREBONE was set to "true", you have to explicitely set this value
//   to "true" to include this feature in the build.)
//
//   - RXP_DIRECTFILE
//   If set to "false", all code relative to direct file streaming will be
//   ignored during a build.
//   (If RXP_BAREBONE was set to "true", you have to explicitely set this value
//   to "true" to include this feature in the build.)
//
//   - RXP_NATIVE_TTML
//   If set to "false", all code relative to TTML parsing for native text tracks
//   will be ignored during a build.
//   (If RXP_BAREBONE was set to "true", you have to explicitely set this value
//   to "true" to include this feature in the build.)
//
//   - RXP_NATIVE_SAMI
//   If set to "false", all code relative to SAMI parsing for native text tracks
//   will be ignored during a build.
//   (If RXP_BAREBONE was set to "true", you have to explicitely set this value
//   to "true" to include this feature in the build.)
//
//   - RXP_NATIVE_VTT
//   If set to "false", all code relative to VTT parsing for native text tracks
//   will be ignored during a build.
//   (If RXP_BAREBONE was set to "true", you have to explicitely set this value
//   to "true" to include this feature in the build.)
//
//   - RXP_NATIVE_SRT
//   If set to "false", all code relative to SRT parsing for native text tracks
//   will be ignored during a build.
//   (If RXP_BAREBONE was set to "true", you have to explicitely set this value
//   to "true" to include this feature in the build.)
//
//   - RXP_HTML_SAMI
//   If set to "false", all code relative to SAMI parsing for html text tracks*
//   will be ignored during a build.
//   *html text tracks are tracks which are added to a DOM element instead of a
//   <track> (the latter here being called "native") tag for a richer
//   formatting.
//   (If RXP_BAREBONE was set to "true", you have to explicitely set this value
//   to "true" to include this feature in the build.)
//
//   - RXP_HTML_TTML
//   If set to "false", all code relative to TTML parsing for html text tracks*
//   will be ignored during a build.
//   *html text tracks are tracks which are added to a DOM element instead of a
//   <track> (the latter here being called "native") tag for a richer
//   formatting.
//   (If RXP_BAREBONE was set to "true", you have to explicitely set this value
//   to "true" to include this feature in the build.)
//
//   - RXP_HTML_SRT
//   If set to "false", all code relative to SRT parsing for html text tracks*
//   will be ignored during a build.
//   *html text tracks are tracks which are added to a DOM element instead of a
//   <track> (the latter here being called "native") tag for a richer
//   formatting.
//   (If RXP_BAREBONE was set to "true", you have to explicitely set this value
//   to "true" to include this feature in the build.)

const ClosureCompiler = require("webpack-closure-compiler");

const RXP_ENV = process.env.RXP_ENV || "production";

const shouldMinify = process.env.RXP_MINIFY;

const isBarebone = process.env.RXP_BAREBONE === "true";

if (["development", "production"].indexOf(RXP_ENV) < 0) {
  throw new Error("unknown RXP_ENV " + RXP_ENV);
}

const webpack = require("webpack");

const config = {
  // devtool: "source-map",
  resolve: {
    // Add '.ts' and '.tsx' as resolvable extensions.
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  output: {
    library: "RxPlayer",
    libraryTarget: "umd",
  },
  module: {
    rules: [
      {
        // test: /\.(j|t)s$/,
        // exclude: /node_modules/,
        // use: {
        //   loader: "babel-loader",
        //   options: {
        //     presets: [
        //       "react",
        //       ["es2015", { loose: true, modules: false }],
        //     ],
        //   },
        // },
      // }, {
        test: /\.tsx?$/,
        use: "ts-loader",
        // }, {
        //   enforce: "pre",
        //   test: /\.js$/,
        //   loader: "source-map-loader",
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      "__FEATURES__": {
        SMOOTH: isBarebone ?
          process.env.RXP_SMOOTH === "true" :
          process.env.RXP_SMOOTH !== "false",

        DASH: isBarebone ?
          process.env.RXP_DASH === "true" :
          process.env.RXP_DASH !== "false",

        DIRECTFILE: isBarebone ?
          process.env.RXP_DIRECTFILE === "true" :
          process.env.RXP_DIRECTFILE !== "false",

        NATIVE_TTML: isBarebone ?
          process.env.RXP_NATIVE_TTML === "true" :
          process.env.RXP_NATIVE_TTML !== "false",

        NATIVE_SAMI: isBarebone ?
          process.env.RXP_NATIVE_SAMI === "true" :
          process.env.RXP_NATIVE_SAMI !== "false",

        NATIVE_VTT: isBarebone ?
          process.env.RXP_NATIVE_VTT === "true" :
          process.env.RXP_NATIVE_VTT !== "false",

        NATIVE_SRT: isBarebone ?
          process.env.RXP_NATIVE_SRT === "true" :
          process.env.RXP_NATIVE_SRT !== "false",

        HTML_TTML: isBarebone ?
          process.env.RXP_HTML_TTML === "true" :
          process.env.RXP_HTML_TTML !== "false",

        HTML_SAMI: isBarebone ?
          process.env.RXP_HTML_SAMI === "true" :
          process.env.RXP_HTML_SAMI !== "false",

        HTML_VTT: isBarebone ?
          process.env.RXP_HTML_VTT === "true" :
          process.env.RXP_HTML_VTT !== "false",

        HTML_SRT: isBarebone ?
          process.env.RXP_HTML_SRT === "true" :
          process.env.RXP_HTML_SRT !== "false",

        // TODO
        // EME: isBarebone ?
        //   process.env.RXP_EME === "true" :
        //   process.env.RXP_EME !== "false",
        // BIF: isBarebone ?
        //   process.env.RXP_BIF === "true" :
        //   process.env.RXP_BIF !== "false",
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
