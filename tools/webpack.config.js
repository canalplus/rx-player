/* eslint-env node */
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
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              "react",
              ["es2015", { loose: true, modules:false }],
            ],
          },
        },
      },
    ],
  },
  plugins: [
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
