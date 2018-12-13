/* eslint-env node */

const path = require("path");
const webpack = require("webpack");
const coverageIsWanted = !!process.env.RXP_COVERAGE;

const config = {
  mode: "development",
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  output: {
    library: "RxPlayer",
    libraryTarget: "umd",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      "__FEATURES__": {
        SMOOTH: true,
        DASH: true,
        DIRECTFILE: true,
        NATIVE_TTML: true,
        NATIVE_SAMI: true,
        NATIVE_VTT: true,
        NATIVE_SRT: true,
        HTML_TTML: true,
        HTML_SAMI: true,
        HTML_VTT: true,
        HTML_SRT: true,
        EME: true,
        BIF_PARSER: true,
      },

      // Path relative to src/features where optional features are implemented
      __RELATIVE_PATH__: {
        EME_MANAGER: JSON.stringify("../core/eme/index.ts"),
        IMAGE_BUFFER: JSON.stringify("../core/source_buffers/image/index.ts"),
        BIF_PARSER: JSON.stringify("../parsers/images/bif.ts"),
        SMOOTH: JSON.stringify("../net/smooth/index.ts"),
        DASH: JSON.stringify("../net/dash/index.ts"),
        NATIVE_TEXT_BUFFER: JSON.stringify("../core/source_buffers/text/native/index.ts"),
        NATIVE_VTT: JSON.stringify("../parsers/texttracks/webvtt/native.ts"),
        NATIVE_SRT: JSON.stringify("../parsers/texttracks/srt/native.ts"),
        NATIVE_TTML: JSON.stringify("../parsers/texttracks/ttml/native/index.ts"),
        NATIVE_SAMI: JSON.stringify("../parsers/texttracks/sami/native.ts"),
        HTML_TEXT_BUFFER: JSON.stringify("../core/source_buffers/text/html/index.ts"),
        HTML_VTT: JSON.stringify("../parsers/texttracks/webvtt/html/index.ts"),
        HTML_SRT: JSON.stringify("../parsers/texttracks/srt/html.ts"),
        HTML_TTML: JSON.stringify("../parsers/texttracks/ttml/html/index.ts"),
        HTML_SAMI: JSON.stringify("../parsers/texttracks/sami/html.ts"),
        DIRECTFILE: JSON.stringify("../core/stream/stream_directfile.ts"),
      },
      __DEV__: true,
      __LOGGER_LEVEL__: "\"NONE\"",
      "process.env": {
        NODE_ENV: JSON.stringify("development"),
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

if (coverageIsWanted) {
  config.module.rules.push({
    test: /\.js$/,
    enforce: "post",
    include: path.resolve(__dirname, "./src/"),
    exclude: [/__tests__/],
    use: {
      loader: "istanbul-instrumenter-loader",
      query: {
        esModules: true,
      },
    },
  });
}

module.exports = config;
