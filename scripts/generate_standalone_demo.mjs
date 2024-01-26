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

import Webpack from "webpack";
import { pathToFileURL } from "url";
import { join } from "path";
import projectRootDirectory from "./utils/project_root_directory.mjs";
import displayWebpackErrors from "./utils/display_webpack_errors.mjs";
import getHumanReadableHours from "./utils/get_human_readable_hours.mjs";
import generateWebpackConfig from "../webpack.config.mjs";

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { argv } = process;
  if (argv.includes("-h") || argv.includes("--help")) {
    displayHelp();
    process.exit(0);
  }
  const reportSize = argv.includes("-r") || argv.includes("--report");
  const shouldMinify = argv.includes("-m") || argv.includes("--minify");
  const production = argv.includes("-p") || argv.includes("--production-mode");
  buildStandaloneDemo({
    production,
    minify: shouldMinify,
    reportSize,
  });
}

export default function buildStandaloneDemo(opts) {
  const config = generateWebpackConfig(opts);

  // overwrite entries/output (ugly but just werks and did not find any better for now)
  config.entry = join(projectRootDirectory, "src/index.ts");
  config.output.path = projectRootDirectory;
  config.output.filename = "demo/standalone/lib.js";

  const compiler = Webpack(config);

  const compilerWatching = compiler.watch(
    {
      aggregateTimeout: 300,
    },
    (err, stats) => {
      if (err) {
        /* eslint-disable no-console */
        console.error(
          `\x1b[31m[${getHumanReadableHours()}]\x1b[0m Could not compile demo:`,
          err,
        );
        /* eslint-enable no-console */
        return;
      }

      if (
        (stats.compilation.errors && stats.compilation.errors.length) ||
        (stats.compilation.warnings && stats.compilation.warnings.length)
      ) {
        const errors = stats.compilation.errors || [];
        const warnings = stats.compilation.warnings || [];
        displayWebpackErrors(errors, warnings);
        /* eslint-disable no-console */
        console.log(
          `\x1b[33m[${getHumanReadableHours()}]\x1b[0m ` +
            `Demo built with ${errors.length} error(s) and ` +
            ` ${warnings.length} warning(s) (in ${stats.endTime - stats.startTime} ms).`,
        );
        /* eslint-enable no-console */
      } else {
        /* eslint-disable no-console */
        console.log(
          `\x1b[32m[${getHumanReadableHours()}]\x1b[0m Demo built (in ${stats.endTime - stats.startTime} ms).`,
        );
        /* eslint-enable no-console */
      }
    },
  );

  compilerWatching.compiler.hooks.watchRun.intercept({
    call() {
      /* eslint-disable no-console */
      console.log(`\x1b[35m[${getHumanReadableHours()}]\x1b[0m ` + "Building demo...");
      /* eslint-enable no-console */
    },
  });
}

/**
 * Display through `console.log` an helping message relative to how to run this
 * script.
 */
function displayHelp() {
  /* eslint-disable no-console */
  console.log(
    /* eslint-disable indent */
    `Usage: node build_demo.mjs [options]
Options:
  -h, --help             Display this help
  -m, --minify           Minify the built demo
  -p, --production-mode  Build all files in production mode (less runtime checks, mostly).
  -r, --report           Produce a size report when done, opening a web browser page`,
    /* eslint-enable indent */
  );
  /* eslint-enable no-console */
}
