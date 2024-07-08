#!/usr/bin/env node
/**
 * # generate_standalone_demo.mjs
 *
 * This file allows to build the "standalone" demo of the RxPlayer, by using
 * esbuild.
 *
 * The standalone demo is a demo page just including the default RxPlayer build
 * and a minimal webpage exposing an instance of it in the global scope.
 *
 * You can either run it directly as a script (run
 * `node generate_standalone_demo.mjs -h` to see the different options) or by
 * requiring it as a node module. If doing the latter you will obtain a function
 * you will have to run with the right options.
 */

import { join } from "path";
import { pathToFileURL } from "url";
import esbuild from "esbuild";
import rootDirectory from "./utils/project_root_directory.mjs";
import getHumanReadableHours from "./utils/get_human_readable_hours.mjs";

const DEMO_OUT_FILE = join(rootDirectory, "demo/standalone/lib.js");

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
  buildDemo({
    watch: shouldWatch,
    minify: shouldMinify,
    production,
  });
}

/**
 * Build the standalone demo with the given options.
 * @param {Object} options
 * @param {boolean} [options.minify] - If `true`, the output will be minified.
 * @param {boolean} [options.production] - If `false`, the code will be compiled
 * in "development" mode, which has supplementary assertions.
 * @param {boolean} [options.watch] - If `true`, the RxPlayer's files involve
 * will be watched and the code re-built each time one of them changes.
 */
export default function buildDemo(options) {
  const minify = !!options.minify;
  const watch = !!options.watch;
  const isDevMode = !options.production;
  const outfile = DEMO_OUT_FILE;

  /** Declare a plugin to anounce when a build begins and ends */
  const consolePlugin = {
    name: "onEnd",
    setup(build) {
      build.onStart(() => {
        console.log(
          `\x1b[33m[${getHumanReadableHours()}]\x1b[0m ` + "New demo build started",
        );
      });
      build.onEnd((result) => {
        if (result.errors.length > 0 || result.warnings.length > 0) {
          const { errors, warnings } = result;
          console.log(
            `\x1b[33m[${getHumanReadableHours()}]\x1b[0m ` +
              `Demo re-built with ${errors.length} error(s) and ` +
              ` ${warnings.length} warning(s) `,
          );
          return;
        }
        console.log(
          `\x1b[32m[${getHumanReadableHours()}]\x1b[0m ` + `Demo updated at ${outfile}!`,
        );
      });
    },
  };

  const meth = watch ? "context" : "build";

  // Create a context for incremental builds
  esbuild[meth]({
    entryPoints: [join(rootDirectory, "src/index.ts")],
    bundle: true,
    target: "es2017",
    minify,
    outfile,
    plugins: [consolePlugin],
    define: {
      "process.env.NODE_ENV": JSON.stringify(isDevMode ? "development" : "production"),
      __INCLUDE_WASM_PARSER__: JSON.stringify(false),
      __ENVIRONMENT__: JSON.stringify({
        PRODUCTION: 0,
        DEV: 1,
        CURRENT_ENV: isDevMode ? 1 : 0,
      }),
      __LOGGER_LEVEL__: JSON.stringify({
        CURRENT_LEVEL: "INFO",
      }),
      __GLOBAL_SCOPE__: JSON.stringify(true),
    },
  })
    .then((context) => {
      if (watch) {
        return context.watch();
      }
    })
    .catch((err) => {
      console.error(
        `\x1b[31m[${getHumanReadableHours()}]\x1b[0m Demo build failed:`,
        err,
      );
      process.exit(1);
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
  -w, --watch            Re-build each time either the demo or library files change`,
    /* eslint-enable indent */
  );
  /* eslint-enable no-console */
}
