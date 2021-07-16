/* eslint-env node */

const Webpack = require("webpack");

/**
 * Generate a configuration object ready to be used by Webpack for testing the
 * RxPlayer's code.
 * @param {Object} args
 * @param {Object} args.contentServerInfo - Information on the server that will
 * be run to serve test contents, called the "content server".
 * @param {string} args.contentServerInfo.url - URL of the content server.
 * @param {number} args.contentServerInfo.port - Port that should be used when
 * requesting the content server.
 * @returns {Object} - The Webpack config
 */
module.exports = function generateTestWebpackConfig({
  contentServerInfo
}) {
  return {
    mode: "development",
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
      fallback: {
        "assert": false,
        "util": false,
        "fs": false,
        "tls": false,
        "net": false,
        "path": false,
        "zlib": false,
        "http": false,
        "https": false,
        "stream": false,
        "crypto": false,
      }
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
        },
      ],
    },
    plugins: [
      new Webpack.DefinePlugin({
        __TEST_CONTENT_SERVER__: {
          URL: JSON.stringify(contentServerInfo.url),
          PORT: JSON.stringify(String(contentServerInfo.port)),
        },
        __FEATURES__: {
          IS_DISABLED: 0,
          IS_ENABLED: 1,

          DASH: 1,
          DIRECTFILE: 1,
          EME: 1,
          HTML_SAMI: 1,
          HTML_SRT: 1,
          HTML_TTML: 1,
          HTML_VTT: 1,
          LOCAL_MANIFEST: 1,
          METAPLAYLIST: 1,
          NATIVE_SAMI: 1,
          NATIVE_SRT: 1,
          NATIVE_TTML: 1,
          NATIVE_VTT: 1,
          SMOOTH: 1,
        },
        __ENVIRONMENT__: {
          PRODUCTION: 0,
          DEV: 1,
          CURRENT_ENV: 1,
        },
        __LOGGER_LEVEL__: {
          CURRENT_LEVEL: "\"NONE\"",
        },
      }),
    ],
  };
};
