/* eslint-env node */
const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const webpack = require("webpack");

const RXP_ENV = process.env.RXP_ENV || "production";
const shouldMinify = !!process.env.RXP_MINIFY;

if (["development", "production"].indexOf(RXP_ENV) < 0) {
  throw new Error("unknown RXP_ENV " + RXP_ENV);
}

const isDevMode = RXP_ENV === "development";

module.exports = {
  mode: isDevMode ? "development" : "production",
  entry: path.join(__dirname, "./demo/full/scripts/index.jsx"),
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    alias: {
      ["rx-player$"]: path.resolve(__dirname, "src/index.ts"),
      ["rx-player/tools$"]: path.resolve(__dirname, "src/tools/index.ts"),
      ["rx-player/experimental/tools$"]: path.resolve(__dirname, "src/experimental/tools/index.ts"),
    },
  },
  output: {
    path: path.join(__dirname, "./demo/full"),
    filename: "bundle.js",
  },
  optimization: {
    minimize: shouldMinify,
    minimizer: shouldMinify ? [
      new TerserPlugin(),
    ] : [],
  },
  performance: {
    maxEntrypointSize: shouldMinify ? 1000000 : 2500000,
    maxAssetSize: shouldMinify ? 1000000 : 2500000,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{
          loader: "ts-loader",
          options: {
            compilerOptions: { sourceMap: true },
          },
        }],
      },
      {
        test: /\.jsx?$/,
        use: {
          loader: "babel-loader",
          options: {
            cacheDirectory: true,
            presets: [
              "@babel/react",
              ["@babel/env", { loose: true, modules: false }],
            ],
          },
        },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      "__DEV__": true,
      "__LOGGER_LEVEL__": "\"INFO\"",
      "process.env": {
        NODE_ENV: JSON.stringify(isDevMode ? "development" : "production"),
      },
      "__FEATURES__": {
        BIF_PARSER: true,
        DASH: true,
        DIRECTFILE: true,
        EME: true,
        HTML_SAMI: true,
        HTML_SRT: true,
        HTML_TTML: true,
        HTML_VTT: true,
        LOCAL_MANIFEST: true,
        METAPLAYLIST: true,
        NATIVE_SAMI: true,
        NATIVE_SRT: true,
        NATIVE_TTML: true,
        NATIVE_VTT: true,
        SMOOTH: true,
      },

      // Path relative to src/features where optional features are implemented
      __RELATIVE_PATH__: {
        BIF_PARSER: JSON.stringify("../parsers/images/bif.ts"),
        DASH: JSON.stringify("../transports/dash/index.ts"),
        DASH_JS_PARSER: JSON.stringify("../parsers/manifest/dash/js-parser/index.ts"),
        DIRECTFILE: JSON.stringify("../core/init/initialize_directfile.ts"),
        EME_MANAGER: JSON.stringify("../core/eme/index.ts"),
        HTML_SAMI: JSON.stringify("../parsers/texttracks/sami/html.ts"),
        HTML_SRT: JSON.stringify("../parsers/texttracks/srt/html.ts"),
        HTML_TEXT_BUFFER: JSON.stringify("../core/segment_buffers/implementations/text/html/index.ts"),
        HTML_TTML: JSON.stringify("../parsers/texttracks/ttml/html/index.ts"),
        HTML_VTT: JSON.stringify("../parsers/texttracks/webvtt/html/index.ts"),
        IMAGE_BUFFER: JSON.stringify("../core/segment_buffers/implementations/image/index.ts"),
        LOCAL_MANIFEST: JSON.stringify("../transports/local/index.ts"),
        MEDIA_ELEMENT_TRACK_CHOICE_MANAGER: JSON.stringify("../core/api/media_element_track_choice_manager.ts"),
        METAPLAYLIST: JSON.stringify("../transports/metaplaylist/index.ts"),
        NATIVE_SAMI: JSON.stringify("../parsers/texttracks/sami/native.ts"),
        NATIVE_SRT: JSON.stringify("../parsers/texttracks/srt/native.ts"),
        NATIVE_TEXT_BUFFER: JSON.stringify("../core/segment_buffers/implementations/text/native/index.ts"),
        NATIVE_TTML: JSON.stringify("../parsers/texttracks/ttml/native/index.ts"),
        NATIVE_VTT: JSON.stringify("../parsers/texttracks/webvtt/native/index.ts"),
        SMOOTH: JSON.stringify("../transports/smooth/index.ts"),
      },
    }),
  ],
  watchOptions: {
    ignored: /node_modules/,
  },
};
