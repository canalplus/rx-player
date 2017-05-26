/* eslint-env node */
const path = require("path");
const ClosureCompiler = require("webpack-closure-compiler");

const RX_PLAYER_ENV = process.env.RX_PLAYER_ENV || "production";

const shouldMinify = process.env.RXP_MINIFY;

if (["development", "production"].indexOf(RX_PLAYER_ENV) < 0) {
  throw new Error("unknown RX_PLAYER_ENV " + RX_PLAYER_ENV);
}

const webpack = require("webpack");

const config = {
  output: {
    library: "RxPlayer",
    libraryTarget: "umd",
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: "babel",
        exclude: /node_modules/,
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

if (shouldMinify) {
  config.plugins.push(new ClosureCompiler({
    options: {
      compilation_level: "SIMPLE",
      language_in: "ES5",
      warning_level: "VERBOSE",
    },
  }));
}

module.exports = config;
