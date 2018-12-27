/* eslint-env node */

const express = require("express");
const Webpack = require("webpack");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const https = require("https");

// uglily mutate RXP_METAPLAYLIST environment variable
process.env.RXP_METAPLAYLIST = true;

const webpackDemoConfig = require("../../webpack-demo.config.js");
const webpackLibConfig = require("../../webpack.config.js");

const HTTP_PORT = 8000;
const HTTPS_PORT = 8443;

// overwrite entries/output (ugly but just werks and did not find any better)
webpackLibConfig.entry = path.join(__dirname, "../../src/exports.ts");
webpackLibConfig.output.path = __dirname;
webpackLibConfig.output.filename = "lib.js";

const demoCompiler = Webpack(webpackDemoConfig);
const libCompiler = Webpack(webpackLibConfig);

const app = express();
app.use(express.static(path.join(__dirname, ".")));

app.listen(HTTP_PORT, (err) => {
  if (err) {
    /* eslint-disable no-console */
    console.log(err);
    /* eslint-enable no-console */
    return;
  }
  /* eslint-disable no-console */
  console.log(`Listening HTTP at http://localhost:${HTTP_PORT}`);
  /* eslint-enable no-console */
});

const demoCompilerWatching = demoCompiler.watch({
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
}, (err, stats) => {
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
});

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

Promise.all([
  promisify(fs.readFile)(path.join(__dirname, "../../localhost.crt")),
  promisify(fs.readFile)(path.join(__dirname, "../../localhost.key")),
]).then(([pubFile, privFile]) => {
  if (pubFile != null && privFile != null) {
    https.createServer({
      key: privFile,
      cert: pubFile,
    }, app).listen(HTTPS_PORT, (err) => {
      if (err) {
        /* eslint-disable no-console */
        console.log(err);
        /* eslint-enable no-console */
        return;
      }
      /* eslint-disable no-console */
      console.log(`Listening HTTPS at https://localhost:${HTTPS_PORT}`);
      /* eslint-enable no-console */
    });
  }
}, (err) => {
  if (err.code === "ENOENT") {
    /* eslint-disable no-console */
    console.warn("Not launching the demo in HTTPS: certificate not generated.");
    console.info("You can run `npm run certificate` to generate a certificate.");
    /* eslint-enable no-console */
  } else {
    /* eslint-disable no-console */
    console.error(err);
    /* eslint-enable no-console */
  }
});

function getHumanReadableHours() {
  const date = new Date();
  return String(date.getHours()).padStart(2, "0") + ":" +
    String(date.getMinutes()).padStart(2, "0") + ":" +
    String(date.getSeconds()).padStart(2, "0") + ":" +
    String(date.getSeconds()).padStart(2, "0") + "." +
    String(date.getMilliseconds()).padStart(4, "0");
}

function displayWebpackErrors(errors, warnings) {
  /* eslint-disable no-console */
  for (let i = 0; i < warnings.length; i++) {
    const warning = warnings[i];
    if (warning.loaderSource != null) {
      console.error(`\nWarning from ${warning.loaderSource}:`);
    } else {
      console.error("\nWarning:");
    }
    console.error(warning.message);
  }
  for (let i = 0; i < errors.length; i++) {
    const error = errors[i];
    if (error.loaderSource != null) {
      console.error(`\nError from ${error.loaderSource}:`);
    } else {
      console.error("\nError:");
    }
    console.error(error.message);
  }
  if (errors.length || warnings.length) {
    console.log();
  }
  /* eslint-enable no-console */
}
