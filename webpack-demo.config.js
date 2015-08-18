/* jshint node:true */
var path = require("path");
var webpack = require("webpack");

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
      {
        test: /\.(otf|eot|svg|ttf|woff)/,
        loader: "url-loader"
      }
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      "__DEV__": true,
      "__RX_PLAYER_VERSION_PLACEHOLDER__": JSON.stringify("0.0.0-demo"),
    }),
  ],
  resolveLoader: {
    fallback: path.join(__dirname, "node_modules")
  }
};
