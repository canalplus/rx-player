/* jshint node:true */
var fs = require("fs");
var path = require("path");

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
      { test: /\.js$/, loader: "babel?loose=all" },
      { test: /\.css$/, loader: "style-loader!css-loader" },
      {
        test: /\.(otf|eot|svg|ttf|woff)/,
        loader: "url-loader"
      }
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
      "__DEV__": true,
      "__RX_PLAYER_VERSION_PLACEHOLDER__": JSON.stringify(version),
    }),
  ],
  resolveLoader: {
    root: path.join(__dirname, "node_modules")
  }
};
