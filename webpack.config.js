/* eslint-env node */
const path = require("path");

const RX_PLAYER_ENV = process.env.RX_PLAYER_ENV || "production";

if (["development", "production"].indexOf(RX_PLAYER_ENV) < 0) {
  throw new Error("unknown RX_PLAYER_ENV " + RX_PLAYER_ENV);
}

const webpack = require("webpack");

module.exports = {
  output: {
    library: "RxPlayer",
    libraryTarget: "umd",
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: "babel",
        query: {
          "presets": ["es2015-loose"],
        },
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
      "__DEV__": RX_PLAYER_ENV === "development",
      "process.env": {
        NODE_ENV: JSON.stringify(RX_PLAYER_ENV),
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
