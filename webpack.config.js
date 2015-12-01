/* jshint node:true */
var fs = require("fs");
var path = require("path");

var RX_PLAYER_ENV = process.env.RX_PLAYER_ENV || "production";

if (["development", "production"].indexOf(RX_PLAYER_ENV) < 0)
  throw new Error("unknown RX_PLAYER_ENV " + RX_PLAYER_ENV);

var webpack = require("webpack");
var version = fs.readFileSync("./VERSION").toString().replace(/\n$/g, "");

module.exports = {
  output: {
    library: "RxPlayer",
    libraryTarget: "umd"
  },
  module: {
    loaders: [
      { test: /\.js$/, loader: "babel?loose=all" },
    ]
  },
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
      "__DEV__": RX_PLAYER_ENV === "development"
    }),
  ],
  resolveLoader: {
    root: path.join(__dirname, "node_modules")
  }
};
