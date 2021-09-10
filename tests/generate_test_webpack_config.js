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
 * @param {boolean} [coverage] - If set to `true`, supplementary steps will be
 * taken to allow code coverage reports.
 * @returns {Object} - The Webpack config
 */
module.exports = function generateTestWebpackConfig({
  contentServerInfo,
  coverage,
}) {
  const coverageIsWanted = !!coverage;
  const config = {
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
          BIF_PARSER: true,
          DASH: true,
          DIRECTFILE: true,
          EME: true,
          HTML_SAMI: true,
          HTML_SRT: true,
          HTML_TTML: true,
          HTML_VTT: true,
          LOCAL_MANIFEST: true,
          METAPLAYLIST: true,
          NATIVE_SAMI: true,
          NATIVE_SRT: true,
          NATIVE_TTML: true,
          NATIVE_VTT: true,
          SMOOTH: true,
        },

        // Path relative to src/features where optional features are implemented
        __RELATIVE_PATH__: {
          BIF_PARSER: JSON.stringify("../parsers/images/bif.ts"),
          DASH: JSON.stringify("../transports/dash/index.ts"),
          DASH_JS_PARSER: JSON.stringify("../parsers/manifest/dash/js-parser/index.ts"),
          DIRECTFILE: JSON.stringify("../core/init/initialize_directfile.ts"),
          EME_MANAGER: JSON.stringify("../core/eme/index.ts"),
          HTML_SAMI: JSON.stringify("../parsers/texttracks/sami/html.ts"),
          HTML_SRT: JSON.stringify("../parsers/texttracks/srt/html.ts"),
          HTML_TEXT_BUFFER: JSON.stringify("../core/segment_buffers/implementations/text/html/index.ts"),
          HTML_TTML: JSON.stringify("../parsers/texttracks/ttml/html/index.ts"),
          HTML_VTT: JSON.stringify("../parsers/texttracks/webvtt/html/index.ts"),
          IMAGE_BUFFER: JSON.stringify("../core/segment_buffers/implementations/image/index.ts"),
          LOCAL_MANIFEST: JSON.stringify("../transports/local/index.ts"),
          MEDIA_ELEMENT_TRACK_CHOICE_MANAGER: JSON.stringify("../core/api/media_element_track_choice_manager.ts"),
          METAPLAYLIST: JSON.stringify("../transports/metaplaylist/index.ts"),
          NATIVE_SAMI: JSON.stringify("../parsers/texttracks/sami/native.ts"),
          NATIVE_SRT: JSON.stringify("../parsers/texttracks/srt/native.ts"),
          NATIVE_TEXT_BUFFER: JSON.stringify("../core/segment_buffers/implementations/text/native/index.ts"),
          NATIVE_TTML: JSON.stringify("../parsers/texttracks/ttml/native/index.ts"),
          NATIVE_VTT: JSON.stringify("../parsers/texttracks/webvtt/native/index.ts"),
          SMOOTH: JSON.stringify("../transports/smooth/index.ts"),
        },
        __DEV__: true,
        __LOGGER_LEVEL__: "\"NONE\"",
        "process.env": {
          NODE_ENV: JSON.stringify("development"),
        },
      }),
    ],
  };

  if (coverageIsWanted) {
    config.devtool = "inline-source-map";
    config.module.rules = [
      {
        test: /\.tsx?$/,
        use: [{
          loader: "ts-loader",
          options: {
            compilerOptions: {
              // needed for istanbul accuracy
              sourceMap: true,
            },
          },
        }],
      },
      {
        test: /\.ts$/,
        exclude: [/__tests__/],
        enforce: "post",
        use: {
          loader: "istanbul-instrumenter-loader",
          options: { esModules: true },
        },
      },
    ];
  }
  return config;
}
