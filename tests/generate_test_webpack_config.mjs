/* eslint-env node */

import Webpack from "webpack";

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
export default function generateTestWebpackConfig({ contentServerInfo }) {
  return {
    mode: "development",
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
      fallback: {
        assert: false,
        util: false,
        fs: false,
        tls: false,
        net: false,
        path: false,
        zlib: false,
        http: false,
        https: false,
        stream: false,
        crypto: false,
      },
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
        __ENVIRONMENT__: {
          PRODUCTION: 0,
          DEV: 1,
          CURRENT_ENV: 1,
        },
        __LOGGER_LEVEL__: {
          CURRENT_LEVEL: '"NONE"',
        },
        __GLOBAL_SCOPE__: false,
      }),
    ],
  };
}
