#!/usr/bin/env node
/* eslint-env node */

const path = require("path");
const Webpack = require("webpack");
const webpackDemoConfig = require("../webpack-demo.config.js");
const webpackLibConfig = require("../webpack.config.js");
const displayWebpackErrors = require("./display_webpack_errors");
const getHumanReadableHours = require("./get_human_readable_hours");

// overwrite entries/output (ugly but just werks and did not find any better)
webpackLibConfig.entry = path.join(__dirname, "../src/exports.ts");
webpackLibConfig.output.path = __dirname;
webpackLibConfig.output.filename = "../demo/full/lib.js";

const demoCompiler = Webpack(webpackDemoConfig);
const libCompiler = Webpack(webpackLibConfig);

let shouldWatch = false;
for (let i = 1; i < process.argv.length; i++) {
  if (process.argv[i] === "--watch") {
    shouldWatch = true;
  }
}

if (!shouldWatch) {
  demoCompiler.run(onDemoResult);
  libCompiler.run(onLibResult);
} else {
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
