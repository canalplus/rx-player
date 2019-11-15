#!/usr/bin/env node
/* eslint-env node */

/**
 * Build the full demo
 * ===================
 *
 * This script allows to build the full demo locally.
 *
 * You can either run it directly as a script (run `node
 * generate_full_demo.js -h` to see the different options) or by requiring it as
 * a node module.
 * If doing the latter you will obtain a function you will have to run with the
 * right options.
 */

const path = require("path");
const Webpack = require("webpack");
const webpackDemoConfig = require("../webpack-demo.config.js");
const webpackLibConfig = require("../webpack.config.js");
const displayWebpackErrors = require("./display_webpack_errors");
const getHumanReadableHours = require("./get_human_readable_hours");

// overwrite entries/output (ugly but just werks and did not find any better)
webpackLibConfig.entry = {
  RxPlayer: path.join(__dirname, "../src/index.ts"),
  RxPlayerTools: path.join(__dirname, "../src/experimental/tools/index.ts"),
};
webpackLibConfig.output.path = __dirname;
webpackLibConfig.output.library = "[name]";
webpackLibConfig.output.filename = "../demo/full/lib.[name].js";

if (require.main === module) {
  // called directly
  const { argv } = process;
  if (argv.includes("-h") || argv.includes("--help")) {
    displayHelp();
    process.exit(0);
  }
  const shouldWatch = argv.includes("-w") || argv.includes("--watch");
  generateFullDemo({ watch: shouldWatch });
} else {
  // loaded as a module
  module.exports = generateFullDemo;
}

/**
 * Build the demo with the given options.
 * @param {Object} options
 */
function generateFullDemo(options) {
  const demoCompiler = Webpack(webpackDemoConfig);
  const libCompiler = Webpack(webpackLibConfig);

  if (!options.watch) {
    /* eslint-disable no-console */
    console.log(
      `\x1b[35m[${getHumanReadableHours()}]\x1b[0m ` +
        "Building demo..."
    );
    /* eslint-enable no-console */
    demoCompiler.run(onDemoResult);

    /* eslint-disable no-console */
    console.log(
      `\x1b[35m[${getHumanReadableHours()}]\x1b[0m ` +
        "Building library..."
    );
    /* eslint-enable no-console */
    libCompiler.run(onLibResult);
  } else {
    /* eslint-disable no-console */
    console.log(
      `\x1b[35m[${getHumanReadableHours()}]\x1b[0m ` +
        "Building demo..."
    );
    /* eslint-enable no-console */
    const demoCompilerWatching = demoCompiler.watch({
      aggregateTimeout: 300,
    }, onDemoResult);

    demoCompilerWatching.compiler.hooks.watchRun.intercept({
      call() {
        /* eslint-disable no-console */
        console.log(
          `\x1b[35m[${getHumanReadableHours()}]\x1b[0m ` +
            "Re-building demo"
        );
        /* eslint-enable no-console */
      },
    });

    /* eslint-disable no-console */
    console.log(
      `\x1b[35m[${getHumanReadableHours()}]\x1b[0m ` +
        "Building library..."
    );
    /* eslint-enable no-console */
    const libCompilerWatching = libCompiler.watch({
      aggregateTimeout: 300,
    }, onLibResult);

    libCompilerWatching.compiler.hooks.watchRun.intercept({
      call() {
        /* eslint-disable no-console */
        console.log(
          `\x1b[35m[${getHumanReadableHours()}]\x1b[0m ` +
            "Re-building library"
        );
        /* eslint-enable no-console */
      },
    });
  }
}

/**
 * Display results when the library finished to build.
 * @param {Error|null|undefined} err
 * @param {Object} stats
 */
function onLibResult(err, stats) {
  if (err) {
    /* eslint-disable no-console */
    console.error(`\x1b[31m[${getHumanReadableHours()}]\x1b[0m Could not compile library:`, err);
    /* eslint-enable no-console */
    return;
  }

  if (
    stats.compilation.errors && stats.compilation.errors.length ||
    stats.compilation.warnings && stats.compilation.warnings.length
  ) {
    const errors = stats.compilation.errors || [];
    const warnings = stats.compilation.warnings || [];
    displayWebpackErrors(errors, warnings);
    /* eslint-disable no-console */
    console.log(
      `\x1b[33m[${getHumanReadableHours()}]\x1b[0m ` +
      `Library built with ${errors.length} error(s) and ` +
      ` ${warnings.length} warning(s) (in ${stats.endTime - stats.startTime} ms).`
    );
    /* eslint-enable no-console */
  } else {
    /* eslint-disable no-console */
    console.log(`\x1b[32m[${getHumanReadableHours()}]\x1b[0m Library built (in ${stats.endTime - stats.startTime} ms).`);
    /* eslint-enable no-console */
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
    console.error(`\x1b[31m[${getHumanReadableHours()}]\x1b[0m Could not compile demo:`, err);
    /* eslint-enable no-console */
    return;
  }

  if (
    stats.compilation.errors && stats.compilation.errors.length ||
    stats.compilation.warnings && stats.compilation.warnings.length
  ) {
    const errors = stats.compilation.errors || [];
    const warnings = stats.compilation.warnings || [];
    displayWebpackErrors(errors, warnings);
    /* eslint-disable no-console */
    console.log(
      `\x1b[33m[${getHumanReadableHours()}]\x1b[0m ` +
      `Demo built with ${errors.length} error(s) and ` +
      ` ${warnings.length} warning(s) (in ${stats.endTime - stats.startTime} ms).`
    );
    /* eslint-enable no-console */
  } else {
    /* eslint-disable no-console */
    console.log(`\x1b[32m[${getHumanReadableHours()}]\x1b[0m Demo built (in ${stats.endTime - stats.startTime} ms).`);
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
`Usage: node generateFullDemo.js [options]
Options:
  -h, --help    Display this help
  -w, --watch   Re-build each time either the demo or library files change`
  /* eslint-enable indent */
  );
  /* eslint-enable no-console */
}
