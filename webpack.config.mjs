/* eslint-env node */

/**
 * This file exports a configuration used to generate our "legacy" bundles in
 * dist/rx-player.js and dist/rx-player.min (depending on if the minify option
 * is set) by using Webpack.
 *
 * Note that we do not rely at all on this configuration when the usually
 * preferred "Minimal" version of the player is imported.
 */

import TerserPlugin from "terser-webpack-plugin";
import webpack from "webpack";

/**
 * Generate the Webpack config used to generate the RxPlayer's legacy bundles.
 * @param {Object} env - Arguments. When Webpack is called through the CLI,
 * those are created implicitely based on flags.
 * @param {boolean} [options.minify] - If `true`, the output will be minified.
 * @param {boolean} [options.production] - If `true`, the code will be compiled
 * in "production" mode, which contains between other things less runtime
 * assertions.
 * @returns {Object} - The Webpack configuration
 */
export default (env) => {
  const isDevMode = !env.production;
  const shouldMinify = !!env.minify;

  const plugins = [
    new webpack.DefinePlugin({
      __ENVIRONMENT__: {
        PRODUCTION: 0,
        DEV: 1,
        CURRENT_ENV: isDevMode ? 1 : 0,
      },
      __LOGGER_LEVEL__: {
        CURRENT_LEVEL: isDevMode ? '"INFO"' : '"ERROR"',
      },
    }),
  ];

  return {
    mode: isDevMode ? "development" : "production",
    entry: "./src/index.ts",
    output: {
      library: "RxPlayer",
      libraryTarget: "umd",
      libraryExport: "default",
      filename: shouldMinify ? "rx-player.min.js" : "rx-player.js",
      environment: {
        arrowFunction: false,
        bigIntLiteral: false,
        const: false,
        destructuring: false,
        dynamicImport: false,
        forOf: false,
        module: false,
      },
    },
    optimization: {
      minimize: shouldMinify,
      minimizer: shouldMinify ? [new TerserPlugin()] : [],
    },
    performance: {
      maxEntrypointSize: shouldMinify ? 600000 : 2500000,
      maxAssetSize: shouldMinify ? 600000 : 2500000,
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: "babel-loader",
              options: {
                cacheDirectory: true,
                presets: [["@babel/env", { loose: true, modules: false }]],
                plugins: [["@babel/plugin-transform-runtime"]],
              },
            },
            { loader: "ts-loader" },
          ],
        },
      ],
    },
    plugins,
  };
};
