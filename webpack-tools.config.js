/* eslint-env node */

const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const webpack = require("webpack");
const path = require("path");

const RXP_ENV = process.env.RXP_ENV || "production";
const shouldMinify = !!process.env.RXP_MINIFY;
const shouldReportSize = process.env.RXP_SIZE_REPORT === "true";

if (["development", "production"].indexOf(RXP_ENV) < 0) {
  throw new Error("unknown RXP_ENV " + RXP_ENV);
}

const isDevMode = RXP_ENV === "development";

const plugins = [
  new webpack.DefinePlugin({
    __DEV__: isDevMode,
    __LOGGER_LEVEL__: isDevMode ? "\"INFO\"" : "\"DEBUG\"",
    "process.env": {
      NODE_ENV: JSON.stringify(isDevMode ? "development" : "production"),
    },
  }),
];

if (shouldReportSize) {
  plugins.push(new BundleAnalyzerPlugin());
}

module.exports = {
  mode: isDevMode ? "development" : "production",
  entry: {
    "../tools/index": "./src/experimental/tools/index.ts"
  },
  output: {
    libraryTarget: "umd",
    filename: shouldMinify ? "[name].min.js" : "[name].js",
  },
  optimization: {
    minimizer: shouldMinify ? [new UglifyJsPlugin()] : [
      new UglifyJsPlugin({
        uglifyOptions: {
          compress: { keep_infinity: true },
          keep_fnames: true,
          keep_classnames: true,
          keep_fargs: true,
          mangle: false,
          output: {
            beautify: true,
            comments: true,
          },
        },
      }),
    ],
  },
  performance: {
    maxEntrypointSize: shouldMinify ? 400000 : 1500000,
    maxAssetSize: shouldMinify ? 400000 : 1500000,
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: {
            configFile: "tsconfig.modules.json",
          }
        },
      },
    ],
  },
  plugins,
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
