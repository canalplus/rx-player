#!/usr/bin/env node
/* eslint-env node */

/**
 * Build the full demo
 * ===================
 *
 * This script allows to build the full demo locally, by using Webpack's bundler.
 *
 * You can either run it directly as a script (run `node
 * generate_full_demo.js -h` to see the different options) or by requiring it as
 * a node module.
 * If doing the latter you will obtain a function you will have to run with the
 * right options.
 */

const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const Webpack = require("webpack");
const displayWebpackErrors = require("./utils/display_webpack_errors");
const getHumanReadableHours = require("./utils/get_human_readable_hours");

// If true, this script is called directly
if (require.main === module) {
  const { argv } = process;
  if (argv.includes("-h") || argv.includes("--help")) {
    displayHelp();
    process.exit(0);
  }
  const shouldWatch = argv.includes("-w") || argv.includes("--watch");
  const shouldMinify = argv.includes("-m") || argv.includes("--minify");
  const production = argv.includes("-p") || argv.includes("--production-mode");
  generateFullDemo({
    watch: shouldWatch,
    minify: shouldMinify,
    production,
  });
} else {
  // This script is loaded as a module
  module.exports = generateFullDemo;
}

/**
 * Build the demo with the given options.
 * @param {Object} options
 * @param {boolean} [options.minify] - If `true`, the output will be minified.
 * @param {boolean} [options.production] - If `false`, the code will be compiled
 * in "development" mode, which has supplementary assertions.
 * @param {boolean} [options.watch] - If `true`, the RxPlayer's files involve
 * will be watched and the code re-built each time one of them changes.
 */
function generateFullDemo(options) {
  const shouldMinify = options.minify === true;
  const isDevMode = options.production !== true;

  const webpackDemoConfig = {
    mode: isDevMode ? "development" : "production",
    entry: path.join(__dirname, "../demo/full/scripts/index.jsx"),
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    },
    output: {
      path: path.join(__dirname, "../demo/full"),
      filename: "bundle.js",
    },
    optimization: {
      minimize: shouldMinify,
      minimizer: shouldMinify ? [
        new TerserPlugin(),
      ] : [],
    },
    performance: {
      maxEntrypointSize: shouldMinify ? 1000000 : 2500000,
      maxAssetSize: shouldMinify ? 1000000 : 2500000,
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [{
            loader: "ts-loader",
            options: {
              compilerOptions: { sourceMap: true },
            },
          }],
        },
        {
          test: /\.jsx?$/,
          use: {
            loader: "babel-loader",
            options: {
              cacheDirectory: true,
              presets: [
                "@babel/react",
                ["@babel/env", { loose: true, modules: false }],
              ],
            },
          },
        },
      ],
    },
    plugins: [
      new Webpack.DefinePlugin({
        __DEV__: isDevMode,
        __LOGGER_LEVEL__: "\"INFO\"",
        "process.env": {
          NODE_ENV: JSON.stringify(isDevMode ? "development" : "production"),
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
      }),
    ],
    watchOptions: {
      ignored: /node_modules/,
    },
  };
  const demoCompiler = Webpack(webpackDemoConfig);
  if (!options.watch) {
    /* eslint-disable no-console */
    console.log(`\x1b[35m[${getHumanReadableHours()}]\x1b[0m ` +
                "Building demo...");
    /* eslint-enable no-console */
    demoCompiler.run(onDemoResult);
  } else {
    /* eslint-disable no-console */
    console.log(`\x1b[35m[${getHumanReadableHours()}]\x1b[0m ` +
                "Building demo...");
    /* eslint-enable no-console */
    const demoCompilerWatching = demoCompiler.watch({ aggregateTimeout: 300 },
                                                    onDemoResult);

    demoCompilerWatching.compiler.hooks.watchRun.intercept({
      call() {
        /* eslint-disable no-console */
        console.log(`\x1b[35m[${getHumanReadableHours()}]\x1b[0m ` +
                    "Re-building demo");
        /* eslint-enable no-console */
      },
    });
  }
}

/**
 * Display results when the demo finished to build.
 * @param {Error|null|undefined} err
 * @param {Object} stats
 */
function onDemoResult(err, stats) {
  if (err) {
    /* eslint-disable no-console */
    console.error(`\x1b[31m[${getHumanReadableHours()}]\x1b[0m Could not compile demo:`,
                  err);
    /* eslint-enable no-console */
    return;
  }

  if (stats.compilation.errors && stats.compilation.errors.length ||
      stats.compilation.warnings && stats.compilation.warnings.length)
  {
    const errors = stats.compilation.errors || [];
    const warnings = stats.compilation.warnings || [];
    displayWebpackErrors(errors, warnings);
    /* eslint-disable no-console */
    console.log(`\x1b[33m[${getHumanReadableHours()}]\x1b[0m ` +
                `Demo built with ${errors.length} error(s) and ` +
                ` ${warnings.length} warning(s) ` +
                `(in ${stats.endTime - stats.startTime} ms).`);
    /* eslint-enable no-console */
  } else {
    /* eslint-disable no-console */
    console.log(`\x1b[32m[${getHumanReadableHours()}]\x1b[0m Demo built ` +
                `(in ${stats.endTime - stats.startTime} ms).`);
    /* eslint-enable no-console */
  }
}

/**
 * Display through `console.log` an helping message relative to how to run this
 * script.
 */
function displayHelp() {
  /* eslint-disable no-console */
  console.log(
  /* eslint-disable indent */
`Usage: node generate_full_demo.js [options]
Options:
  -h, --help             Display this help
  -m, --minify           Minify the built demo
  -p, --production-mode  Build all files in production mode (less runtime checks, mostly).
  -w, --watch            Re-build each time either the demo or library files change`,
  /* eslint-enable indent */
  );
  /* eslint-enable no-console */
}
