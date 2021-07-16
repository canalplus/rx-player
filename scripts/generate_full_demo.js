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
          CURRENT_ENV: isDevMode ? 1 : 0,
        },
        __LOGGER_LEVEL__: {
          CURRENT_LEVEL: "\"INFO\"",
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
