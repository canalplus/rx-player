#!/usr/bin/env node
/* eslint-env node */

/**
 * Build the standalone demo
 * =========================
 *
 * This script allows to build the simple standalone demo locally.
 *
 * You can run it as a script through `node generate_standalone_demo.js`.
 * Be aware that this demo will be built again every time one of the library
 * file is updated.
 */

const Webpack = require("webpack");
const path = require("path");
const displayWebpackErrors = require("./utils/display_webpack_errors");
const getHumanReadableHours = require("./utils/get_human_readable_hours");

const webpackConfig = require("../webpack.config.js");

/* eslint-disable no-console */
console.log(
  `\x1b[35m[${getHumanReadableHours()}]\x1b[0m ` +
    "Building demo..."
);
/* eslint-enable no-console */

const config = webpackConfig({
  production: false,
  minify: false,
  reportSize: false,
});

// overwrite entries/output (ugly but just werks and did not find any better for now)
config.entry = path.join(__dirname, "../src/index.ts");
config.output.path = __dirname;
config.output.filename = "../demo/standalone/lib.js";

const compiler = Webpack(config);

const compilerWatching = compiler.watch({
  aggregateTimeout: 300,
}, (err, stats) => {
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
});

compilerWatching.compiler.hooks.watchRun.intercept({
  call() {
    /* eslint-disable no-console */
    console.log(
      `\x1b[35m[${getHumanReadableHours()}]\x1b[0m ` +
      "Re-building demo"
    );
    /* eslint-enable no-console */
  },
});
