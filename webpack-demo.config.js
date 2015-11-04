/* eslint-env node */
var fs = require("fs");
var path = require("path");

var RX_PLAYER_ENV = process.env.RX_PLAYER_ENV || "development";

if (["development", "production"].indexOf(RX_PLAYER_ENV) < 0)
  throw new Error("unknown RX_PLAYER_ENV " + RX_PLAYER_ENV);

var webpack = require("webpack");
var version = fs.readFileSync("./VERSION").toString().replace(/\n$/g, "");

module.exports = {
  entry: "./demo/index.js",
  output: {
    path: path.join(__dirname, "demo"),
    filename: "bundle.js",
  },
  module: {
    loaders: [
      { test: /\.js$/, loader: "babel?loose=all", exclude: [/rx\.lite\.js$/] },
      { test: /\.css$/, loader: "style-loader!css-loader" },
      { test: /\.(otf|eot|svg|ttf|woff)/, loader: "url-loader" }
    ],
  },
  resolve: {
    alias: {
      main: __dirname + "/src",
      test: __dirname + "/test",
    },
  },
  plugins: [
    new webpack.DefinePlugin({
      "__RX_PLAYER_VERSION_PLACEHOLDER__": JSON.stringify(version),
      "__DEV__": RX_PLAYER_ENV === "development"
    }),
  ],
  resolveLoader: {
    fallback: path.join(__dirname, "node_modules")
  }
};
