/* eslint-env node */
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
      {
        test: /\.js$/,
        loader: "babel",
        query: {
          "cacheDirectory": true,
          "plugins": ["transform-object-rest-spread"],
          "presets": ["react", "es2015-loose"],
        },
      },
      { test: /\.css$/, loader: "style-loader!css-loader" },
      {
        test: /\.(otf|eot|svg|ttf|woff)/,
        loader: "url-loader",
      },
    ],
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
      "__DEV__": true,
      "process.env": {
        NODE_ENV: JSON.stringify("production")
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
  resolveLoader: {
    root: path.join(__dirname, "node_modules"),
  },
};
