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

  const isBarebone = process.env.RXP_BAREBONE === "true";
  const plugins = [
    new webpack.DefinePlugin({
      "__FEATURES__": {
        SMOOTH: isBarebone ?
          process.env.RXP_SMOOTH === "true" :
          process.env.RXP_SMOOTH !== "false",

        DASH: isBarebone ?
          process.env.RXP_DASH === "true" :
          process.env.RXP_DASH !== "false",

        LOCAL_MANIFEST: process.env.RXP_LOCAL_MANIFEST === "true",

        METAPLAYLIST: process.env.RXP_METAPLAYLIST === "true",

        DIRECTFILE: isBarebone ?
          process.env.RXP_DIRECTFILE === "true" :
          process.env.RXP_DIRECTFILE !== "false",

        NATIVE_TTML: isBarebone ?
          process.env.RXP_NATIVE_TTML === "true" :
          process.env.RXP_NATIVE_TTML !== "false",

        NATIVE_SAMI: isBarebone ?
          process.env.RXP_NATIVE_SAMI === "true" :
          process.env.RXP_NATIVE_SAMI !== "false",

        NATIVE_VTT: isBarebone ?
          process.env.RXP_NATIVE_VTT === "true" :
          process.env.RXP_NATIVE_VTT !== "false",

        NATIVE_SRT: isBarebone ?
          process.env.RXP_NATIVE_SRT === "true" :
          process.env.RXP_NATIVE_SRT !== "false",

        HTML_TTML: isBarebone ?
          process.env.RXP_HTML_TTML === "true" :
          process.env.RXP_HTML_TTML !== "false",

        HTML_SAMI: isBarebone ?
          process.env.RXP_HTML_SAMI === "true" :
          process.env.RXP_HTML_SAMI !== "false",

        HTML_VTT: isBarebone ?
          process.env.RXP_HTML_VTT === "true" :
          process.env.RXP_HTML_VTT !== "false",

        HTML_SRT: isBarebone ?
          process.env.RXP_HTML_SRT === "true" :
          process.env.RXP_HTML_SRT !== "false",

        EME: isBarebone ?
          process.env.RXP_EME === "true" :
          process.env.RXP_EME !== "false",

        BIF_PARSER: isBarebone ?
          process.env.RXP_BIF_PARSER === "true" :
          process.env.RXP_BIF_PARSER !== "false",
      },

      // Path relative to src/features where optional features are implemented
      __RELATIVE_PATH__: {
        EME_MANAGER: JSON.stringify("../core/eme/index.ts"),
        IMAGE_BUFFER: JSON.stringify("../core/segment_buffers/implementations/image/index.ts"),
        BIF_PARSER: JSON.stringify("../parsers/images/bif.ts"),
        SMOOTH: JSON.stringify("../transports/smooth/index.ts"),
        DASH: JSON.stringify("../transports/dash/index.ts"),
        DASH_JS_PARSER: JSON.stringify("../parsers/manifest/dash/js-parser/index.ts"),
        LOCAL_MANIFEST: JSON.stringify("../transports/local/index.ts"),
        METAPLAYLIST: JSON.stringify("../transports/metaplaylist/index.ts"),
        NATIVE_TEXT_BUFFER: JSON.stringify("../core/segment_buffers/implementations/text/native/index.ts"),
        NATIVE_VTT: JSON.stringify("../parsers/texttracks/webvtt/native/index.ts"),
        NATIVE_SRT: JSON.stringify("../parsers/texttracks/srt/native.ts"),
        NATIVE_TTML: JSON.stringify("../parsers/texttracks/ttml/native/index.ts"),
        NATIVE_SAMI: JSON.stringify("../parsers/texttracks/sami/native.ts"),
        HTML_TEXT_BUFFER: JSON.stringify("../core/segment_buffers/implementations/text/html/index.ts"),
        HTML_VTT: JSON.stringify("../parsers/texttracks/webvtt/html/index.ts"),
        HTML_SRT: JSON.stringify("../parsers/texttracks/srt/html.ts"),
        HTML_TTML: JSON.stringify("../parsers/texttracks/ttml/html/index.ts"),
        HTML_SAMI: JSON.stringify("../parsers/texttracks/sami/html.ts"),
        DIRECTFILE: JSON.stringify("../core/init/initialize_directfile.ts"),
        MEDIA_ELEMENT_TRACK_CHOICE_MANAGER: JSON.stringify("../core/api/media_element_track_choice_manager.ts"),
      },
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
      maxEntrypointSize: shouldMinify ? 540000 : 2500000,
      maxAssetSize: shouldMinify ? 540000 : 2500000,
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
