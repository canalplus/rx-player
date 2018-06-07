/* eslint-env node */
const path = require("path");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const webpack = require("webpack");

const RXP_ENV = process.env.RXP_ENV || "production";
const shouldMinify = !!process.env.RXP_MINIFY;

if (["development", "production"].indexOf(RXP_ENV) < 0) {
  throw new Error("unknown RXP_ENV " + RXP_ENV);
}

const isDevMode = RXP_ENV === "development";

module.exports = {
  mode: isDevMode ? "development" : "production",
  entry: path.join(__dirname, "./demo/full/scripts/index.js"),
  output: {
    path: path.join(__dirname, "./demo/full"),
    filename: "bundle.js",
  },
  optimization: {
    minimizer: shouldMinify ? [
      new UglifyJsPlugin(),
    ] : [],
  },
  performance: {
    maxEntrypointSize: shouldMinify ? 1000000 : 2000000,
    maxAssetSize: shouldMinify ? 1000000 : 2000000,
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: {
          loader: "babel-loader",
          options: {
            cacheDirectory: true,
            presets: [
              "react",
              ["es2015", { loose: true, modules: false }],
              "es2016",
              "es2017",
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: [
          "style-loader",
          "css-loader",
        ],
      },
      {
        test: /\.(otf|eot|svg|ttf|woff)$/,
        use: ["url-loader"],
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
        HTML_SAMI: true,
        HTML_TTML: true,
        HTML_SRT: true,
        HTML_VTT: true,
      },
      "__DEV__": true,
      "__LOGGER_LEVEL__": "\"INFO\"",
      "process.env": {
        NODE_ENV: JSON.stringify("production"),
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
