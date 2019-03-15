/* eslint-env node */

const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const webpack = require("webpack");

const RXP_ENV = process.env.RXP_ENV || "production";
const shouldMinify = !!process.env.RXP_MINIFY;
const shouldReportSize = process.env.RXP_SIZE_REPORT === "true";
const isBarebone = process.env.RXP_BAREBONE === "true";

if (["development", "production"].indexOf(RXP_ENV) < 0) {
  throw new Error("unknown RXP_ENV " + RXP_ENV);
}

const isDevMode = RXP_ENV === "development";

const plugins = [
  new webpack.DefinePlugin({
    "__FEATURES__": {
      SMOOTH: isBarebone ?
        process.env.RXP_SMOOTH === "true" :
        process.env.RXP_SMOOTH !== "false",

      DASH: isBarebone ?
        process.env.RXP_DASH === "true" :
        process.env.RXP_DASH !== "false",

      LOCAL_MANIFEST: process.env.RXP_LOCAL_MANIFEST === "true",

      METAPLAYLIST: process.env.RXP_METAPLAYLIST === "true",

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

      EME: isBarebone ?
        process.env.RXP_EME === "true" :
        process.env.RXP_EME !== "false",

      BIF_PARSER: isBarebone ?
        process.env.RXP_BIF_PARSER === "true" :
        process.env.RXP_BIF_PARSER !== "false",
    },

    // Path relative to src/features where optional features are implemented
    __RELATIVE_PATH__: {
      EME_MANAGER: JSON.stringify("../core/eme/index.ts"),
      IMAGE_BUFFER: JSON.stringify("../custom_source_buffers/image/index.ts"),
      BIF_PARSER: JSON.stringify("../parsers/images/bif.ts"),
      SMOOTH: JSON.stringify("../transports/smooth/index.ts"),
      DASH: JSON.stringify("../transports/dash/index.ts"),
      LOCAL_MANIFEST: JSON.stringify("../transports/local/index.ts"),
      METAPLAYLIST: JSON.stringify("../transports/metaplaylist/index.ts"),
      NATIVE_TEXT_BUFFER: JSON.stringify("../custom_source_buffers/text/native/index.ts"),
      NATIVE_VTT: JSON.stringify("../parsers/texttracks/webvtt/native/index.ts"),
      NATIVE_SRT: JSON.stringify("../parsers/texttracks/srt/native.ts"),
      NATIVE_TTML: JSON.stringify("../parsers/texttracks/ttml/native/index.ts"),
      NATIVE_SAMI: JSON.stringify("../parsers/texttracks/sami/native.ts"),
      HTML_TEXT_BUFFER: JSON.stringify("../custom_source_buffers/text/html/index.ts"),
      HTML_VTT: JSON.stringify("../parsers/texttracks/webvtt/html/index.ts"),
      HTML_SRT: JSON.stringify("../parsers/texttracks/srt/html.ts"),
      HTML_TTML: JSON.stringify("../parsers/texttracks/ttml/html/index.ts"),
      HTML_SAMI: JSON.stringify("../parsers/texttracks/sami/html.ts"),
      DIRECTFILE: JSON.stringify("../core/init/initialize_directfile.ts"),
    },
    __DEV__: isDevMode,
    __LOGGER_LEVEL__: isDevMode ? "\"INFO\"" : "\"DEBUG\"",
    "process.env": {
      NODE_ENV: JSON.stringify(isDevMode ? "development" : "production"),
    },
  }),
];

if (shouldReportSize) {
  plugins.push(new BundleAnalyzerPlugin());
}

module.exports = {
  mode: isDevMode ? "development" : "production",
  entry: "./src/exports.ts",
  output: {
    library: "RxPlayer",
    libraryTarget: "umd",
    filename: shouldMinify ? "rx-player.min.js" : "rx-player.js",
  },
  optimization: {
    minimizer: shouldMinify ? [new UglifyJsPlugin()] : [
      new UglifyJsPlugin({
        uglifyOptions: {
          compress: {
            keep_infinity: true,
            inline: false,
            reduce_funcs: false, // does not work well on commentated funcs.
                                 // TODO open issue on uglify
          },
          keep_fnames: true,
          keep_classnames: true,
          keep_fargs: true,
          mangle: false,
          output: {
            beautify: true,
            comments: true,
          },
        },
      }),
    ],
  },
  performance: {
    maxEntrypointSize: shouldMinify ? 400000 : 1700000,
    maxAssetSize: shouldMinify ? 400000 : 1700000,
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "babel-loader",
            options: {
              cacheDirectory: true,
              presets: [
                [ "@babel/env", { loose: true, modules: false } ],
              ],
            },
          },
          { loader: "ts-loader" },
        ],
      },
    ],
  },
  plugins,
  node: {
    console: false,
    global: true,
    process: false,
    Buffer: false,
    __filename: false,
    __dirname: false,
    setImmediate: false,
  },
  watchOptions: {
    ignored: /node_modules/,
  },
};
