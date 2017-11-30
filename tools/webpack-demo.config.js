/* eslint-env node */
const path = require("path");
const webpack = require("webpack");
const ClosureCompiler = require("webpack-closure-compiler");

const shouldMinify = process.env.RXP_DEMO_MINIFY;

const config = {
  entry: path.join(__dirname, "../demo/full/scripts/index.js"),
  output: {
    path: path.join(__dirname, "../demo/full"),
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
              ["es2015", { loose: true, modules: false }],
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
      "__FEATURES__": {
        SMOOTH: true,
        DASH: true,
        DIRECTFILE: true,
        NATIVE_TTML: true,
        NATIVE_SAMI: true,
        NATIVE_VTT: true,
        NATIVE_SRT: true,
        HTML_SAMI: true,
        HTML_TTML: true,
        HTML_SRT: true,
        HTML_VTT: true,
      },
      "__DEV__": true,
      "__LOGGER_LEVEL__": "\"INFO\"",
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
