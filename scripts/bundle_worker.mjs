#!/usr/bin/env node
/**
 * # bundle_worker.mjs
 *
 * This file allows to create the `dist/worker.js` file representing the code
 * that will run in the WebWorker.
 *
 * You can either run it directly as a script (run `node build_worker.mjs -h`
 * to see the different options) or by requiring it as a node module.
 * If doing the latter you will obtain a function you will have to run with the
 * right options.
 */

import { join } from "path";
import { pathToFileURL } from "url";
import esbuild from "esbuild";
import rootDirectory from "./utils/project_root_directory.mjs";
import getHumanReadableHours from "./utils/get_human_readable_hours.mjs";

// If true, this script is called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { argv } = process;
  if (argv.includes("-h") || argv.includes("--help")) {
    displayHelp();
    process.exit(0);
  }
  const shouldWatch = argv.includes("-w") || argv.includes("--watch");
  const shouldMinify = argv.includes("-m") || argv.includes("--minify");
  const production = argv.includes("-p") || argv.includes("--production-mode");
  const silent = argv.includes("-s") || argv.includes("--silent");
  buildWorker({
    watch: shouldWatch,
    minify: shouldMinify,
    production,
    silent,
  });
}

/**
 * Build the worker with the given options.
 * @param {Object} options
 * @param {boolean} [options.minify] - If `true`, the output will be minified.
 * @param {boolean} [options.production] - If `false`, the code will be compiled
 * in "development" mode, which has supplementary assertions.
 * @param {boolean} [options.watch] - If `true`, the RxPlayer's files involve
 * will be watched and the code re-built each time one of them changes.
 * @param {boolean} [options.silent] - If `true`, we won't output logs.
 * @param {boolean} [options.outfile] - Destination of the produced bundle.
 * `dist/worker.js` by default.
 * @returns {Promise}
 */
export default function buildWorker(options) {
  const minify = !!options.minify;
  const watch = !!options.watch;
  const isDevMode = !options.production;
  const isSilent = options.silent;
  const outfile = options.outfile ?? join(rootDirectory, "dist/worker.js");

  /** Declare a plugin to anounce when a build begins and ends */
  const consolePlugin = {
    name: "onEnd",
    setup(build) {
      build.onStart(() => {
        console.log(
          `\x1b[33m[${getHumanReadableHours()}]\x1b[0m ` + "New worker build started",
        );
      });
      build.onEnd((result) => {
        if (result.errors.length > 0 || result.warnings.length > 0) {
          const { errors, warnings } = result;
          console.log(
            `\x1b[33m[${getHumanReadableHours()}]\x1b[0m ` +
              `Worker re-built with ${errors.length} error(s) and ` +
              ` ${warnings.length} warning(s) `,
          );
          return;
        }
        console.log(
          `\x1b[32m[${getHumanReadableHours()}]\x1b[0m ` +
            `Worker updated at ${outfile}!`,
        );
      });
    },
  };

  const meth = watch ? "context" : "build";

  // Create a context for incremental builds
  return esbuild[meth]({
    entryPoints: [join(rootDirectory, "src/worker_entry_point.ts")],
    bundle: true,
    target: "es2017",
    minify,
    outfile,
    plugins: isSilent ? [] : [consolePlugin],
    define: {
      "process.env.NODE_ENV": JSON.stringify(isDevMode ? "development" : "production"),
      __ENVIRONMENT__: JSON.stringify({
        PRODUCTION: 0,
        DEV: 1,
        CURRENT_ENV: isDevMode ? 1 : 0,
      }),
      __LOGGER_LEVEL__: JSON.stringify({ CURRENT_LEVEL: "NONE" }),
    },
  })
    .then((context) => {
      if (watch) {
        return context.watch();
      }
    })
    .catch((err) => {
      if (!isSilent) {
        console.error(
          `\x1b[31m[${getHumanReadableHours()}]\x1b[0m Worker build failed:`,
          err,
        );
      }
      throw err;
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
    `Usage: node build_worker.mjs [options]
Options:
  -h, --help             Display this help
  -m, --minify           Minify the built worker
  -p, --production-mode  Build all files in production mode (less runtime checks, mostly).
  -s, --silent           Don't log to stdout/stderr when bundling
  -w, --watch            Re-build each time either the worker or library files change`,
    /* eslint-enable indent */
  );
  /* eslint-enable no-console */
}
