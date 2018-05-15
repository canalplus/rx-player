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
        // TODO
        // EME: true,
        // BIF: true,
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

module.exports = config;
