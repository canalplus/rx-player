/* eslint-env node */

const Webpack = require("webpack");
const WebpackDevServer = require("webpack-dev-server");
const path = require("path");

const webpackConfig = require("./webpack-demo.config.js");

const compiler = Webpack(webpackConfig);
const server = new WebpackDevServer(compiler, {
  contentBase: path.join(__dirname, "../demo"),
  compress: true,
});

server.listen(8080, "127.0.0.1", function() {
  console.log("Starting server on http://localhost:8080");
});
