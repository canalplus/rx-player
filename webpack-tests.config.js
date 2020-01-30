/* eslint-env node */

const webpack = require("webpack");
const coverageIsWanted = !!process.env.RXP_COVERAGE;

const config = {
  mode: "development",
  entry: "./tests/integration/index.js",
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
      "__TEST_CONTENT_SERVER__": {
        URL: "\"127.0.0.1\"",
        PORT: "\"3000\"",
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
        DIRECTFILE: JSON.stringify("../core/init/initialize_directfile.ts"),
        EME_MANAGER: JSON.stringify("../core/eme/index.ts"),
        HTML_SAMI: JSON.stringify("../parsers/texttracks/sami/html.ts"),
        HTML_SRT: JSON.stringify("../parsers/texttracks/srt/html.ts"),
        HTML_TEXT_BUFFER: JSON.stringify("../custom_source_buffers/text/html/index.ts"),
        HTML_TTML: JSON.stringify("../parsers/texttracks/ttml/html/index.ts"),
        HTML_VTT: JSON.stringify("../parsers/texttracks/webvtt/html/index.ts"),
        IMAGE_BUFFER: JSON.stringify("../custom_source_buffers/image/index.ts"),
        LOCAL_MANIFEST: JSON.stringify("../transports/local/index.ts"),
        METAPLAYLIST: JSON.stringify("../transports/metaplaylist/index.ts"),
        NATIVE_SAMI: JSON.stringify("../parsers/texttracks/sami/native.ts"),
        NATIVE_SRT: JSON.stringify("../parsers/texttracks/srt/native.ts"),
        NATIVE_TEXT_BUFFER: JSON.stringify("../custom_source_buffers/text/native/index.ts"),
        NATIVE_TTML: JSON.stringify("../parsers/texttracks/ttml/native/index.ts"),
        NATIVE_VTT: JSON.stringify("../parsers/texttracks/webvtt/native/index.ts"),
        SMOOTH: JSON.stringify("../transports/smooth/index.ts"),
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
  config.devtool = "inline-source-map";
  config.module.rules = [
    {
      test: /\.tsx?$/,
      use: [{
        loader: "ts-loader",
        options: {
          compilerOptions: {
            // needed for istanbul accuracy
            sourceMap: true,
          },
        },
      }],
    },
    {
      test: /\.ts$/,
      exclude: [/__tests__/],
      enforce: "post",
      use: {
        loader: "istanbul-instrumenter-loader",
        options: { esModules: true },
      },
    },
  ];
}

module.exports = config;
