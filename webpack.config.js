/* eslint-env node */

/**
 * This file exports a configuration used to generate our "legacy" builds in
 * dist/rx-player.js and dist/rx-player.min (depending on if the minify option
 * is set) by using Webpack.
 *
 * Note that we do not rely at all on this configuration when the usually
 * preferred "Minimal" version of the player is imported.
 */

const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const TerserPlugin = require("terser-webpack-plugin");
const webpack = require("webpack");

/**
 * Generate the Webpack config used to generate the RxPlayer's legacy builds.
 * @param {Object} env - Arguments. When Webpack is called through the CLI,
 * those are created implicitely based on flags.
 * @param {boolean} [options.minify] - If `true`, the output will be minified.
 * @param {boolean} [options.production] - If `true`, the code will be compiled
 * in "production" mode, which contains between other things less runtime
 * assertions.
 * @param {boolean} [options.shouldReportSize] - If `true`, a bunle size report
 * will be generated after the build.
 * @returns {Object} - The Webpack configuration
 */
module.exports = (env) => {
  const isDevMode = !env.production;
  const shouldMinify = !!env.minify;
  const shouldReportSize = !!env.reportSize;

  const plugins = [
    new webpack.DefinePlugin({
      "__FEATURES__": {
        IS_DISABLED: +(false), // === 0 (wrote this way to be explicit)
        IS_ENABLED: +(true), // === 1 (wrote this way to be explicit)

        // Each following feature is compared to IS_ENABLED or IS_DISABLED in
        // code to check whether the feature is enabled or not.
        SMOOTH: +(true),
        DASH: +(true),
        LOCAL_MANIFEST: +(false),
        METAPLAYLIST: +(false),
        DIRECTFILE: +(true),
        NATIVE_TTML: +(true),
        NATIVE_SAMI: +(true),
        NATIVE_VTT: +(true),
        NATIVE_SRT: +(true),
        HTML_TTML: +(true),
        HTML_SAMI: +(true),
        HTML_VTT: +(true),
        HTML_SRT: +(true),
        EME: +(true),
      },
      __ENVIRONMENT__: {
        PRODUCTION: 0,
        DEV: 1,
        CURRENT_ENV: isDevMode ? 1 : 0,
      },
      __LOGGER_LEVEL__: {
        CURRENT_LEVEL: isDevMode ? "\"INFO\"" : "\"ERROR\"",
      },
    }),
  ];

  if (shouldReportSize) {
    plugins.push(new BundleAnalyzerPlugin());
  }
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
          exclude: /node_modules/,
          use: [
            {
              loader: "babel-loader",
              options: {
                cacheDirectory: true,
                presets: [
                  [ "@babel/env", { loose: true, modules: false } ],
                ],
                plugins: [[ "@babel/plugin-transform-runtime" ]],
              },
            },
            { loader: "ts-loader" },
          ],
        },
      ],
    },
    plugins,
    watchOptions: {
      ignored: /node_modules/,
    },
  };
};
