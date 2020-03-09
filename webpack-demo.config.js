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
  entry: path.join(__dirname, "./demo/full/scripts/index.js"),
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
  watchOptions: {
    ignored: /node_modules/,
  },
};
