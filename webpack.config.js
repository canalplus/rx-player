/* eslint-env node */
var fs = require("fs");
var path = require("path");

var RX_PLAYER_ENV = process.env.RX_PLAYER_ENV || "production";
var RX_PLAYER_TARGET = process.env.RX_PLAYER_TARGET === "node" ? "node" : "web";

if (["development", "production"].indexOf(RX_PLAYER_ENV) < 0)
  throw new Error("unknown RX_PLAYER_ENV " + RX_PLAYER_ENV);

var webpack = require("webpack");
var version = fs.readFileSync("./VERSION").toString().replace(/\n$/g, "");

module.exports = {
  entry: RX_PLAYER_TARGET == "node" ? "./src/index.node.js" : "./src/index.js",
  output: {
    library: "RxPlayer",
    libraryTarget: "umd"
  },
  module: {
    loaders: [
      { test: /\.js$/, exclude: [/rx\.lite\.js$/,/es6-promise\.js/], loader: "babel?loose=all" },
    ]
  },
  target: RX_PLAYER_TARGET,
  resolve: {
    alias: {
      main: __dirname + "/src",
      test: __dirname + "/test",
    },
  },
  plugins: [
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.DefinePlugin({
      "__RX_PLAYER_VERSION_PLACEHOLDER__": JSON.stringify(version),
      "__RX_PLAYER_TARGET__": JSON.stringify(RX_PLAYER_TARGET),
      "__DEV__": RX_PLAYER_ENV === "development",
    }),
  ],
  resolveLoader: {
    fallback: path.join(__dirname, "node_modules")
  }
};
