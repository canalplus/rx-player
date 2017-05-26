/* eslint-env node */
const path = require("path");
const webpack = require("webpack");
const ClosureCompiler = require("webpack-closure-compiler");

const shouldMinify = process.env.RXP_DEMO_MINIFY;

const config = {
  entry: path.join(__dirname, "../demo/scripts/index.js"),
  output: {
    path: path.join(__dirname, "../demo"),
    filename: "bundle.js",
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
              "react",
              ["es2015", { loose: true }],
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
