/* eslint-env node */

const Webpack = require("webpack");
const WebpackDevServer = require("webpack-dev-server");
const path = require("path");

const webpackDemoConfig = require("./webpack-demo.config.js");
const webpackLibConfig = require("./webpack.config.js");

// overwrite entries/output (ugly but just werks and did not find any better)
webpackLibConfig.entry = path.join(__dirname, "../src/exports.ts");
webpackLibConfig.output.path = path.join(__dirname, "../demo/full");
webpackLibConfig.output.filename = "lib.js";

const demoCompiler = Webpack(webpackDemoConfig);
const libCompiler = Webpack(webpackLibConfig);

const serverDemo = new WebpackDevServer(demoCompiler, {
  contentBase: path.join(__dirname, "../demo/full"),
  compress: true,
});

const serverLib = new WebpackDevServer(libCompiler, {
  contentBase: path.join(__dirname, "../demo/full"),
  compress: true,
});

serverDemo.listen(8000, "127.0.0.1", function() {
  /* eslint-disable no-console */
  console.log("Starting demo server on http://localhost:8000");
  /* eslint-enable no-console */
});

serverLib.listen(3941, "127.0.0.1", function() {
  /* eslint-disable no-console */
  console.log("Starting lib server on http://localhost:3941");
  /* eslint-enable no-console */
});
