#!/usr/bin/env node
/**
 * # build_demo.mjs
 *
 * This file allows to build the demo of the RxPlayer, by using esbuild.
 *
 * You can either run it directly as a script (run `node build_demo.mjs -h`
 * to see the different options) or by requiring it as a node module.
 * If doing the latter you will obtain a function you will have to run with the
 * right options.
 */

import { stat } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import esbuild from "esbuild";
import rootDirectory from "./utils/project_root_directory.mjs";
import getHumanReadableHours from "./utils/get_human_readable_hours.mjs";
import runBundler from "./run_bundler.mjs";

const WORKER_IN_FILE = join(rootDirectory, "src/worker_entry_point.ts");
const DEMO_OUT_FILE = join(rootDirectory, "demo/bundle.js");
const WORKER_OUT_FILE = join(rootDirectory, "demo/worker.js");
const WASM_FILE_DEPENDENCY = join(rootDirectory, "dist/mpd-parser.wasm");

/**
 * Build the demo with the given options.
 * @param {Object} [options]
 * @param {boolean} [options.minify] - If `true`, the output will be minified.
 * Defaults to `false`.
 * @param {boolean} [options.production] - If `false`, the code will be compiled
 * in "development" mode, which has supplementary assertions.
 * Defaults to `true`.
 * @param {boolean} [options.watch] - If `true`, the RxPlayer's files involve
 * will be watched and the code re-built each time one of them changes.
 * Defaults to `false`.
 * @param {boolean} [options.silent] - If `true`, no logs will be outputed to
 * signal the advancement of the build.
 * Defaults to `false`.
 * @param {boolean} [options.includeWasmParser] - If `true`, the WebAssembly MPD
 * parser of the RxPlayer will be used (if it can be requested).
 * Defaults to `false`.
 * @returns {Promise} - Promise which resolves when the intial build is done or
 * rejects with an error when it cannot be done.
 */
export default function buildDemo(options = {}) {
  const verbose = !options.silent;
  const minify = !!options.minify;
  const watch = !!options.watch;
  const isDevMode = !options.production;
  const includeWasmParser = !!options.includeWasmParser;
  const outfile = DEMO_OUT_FILE;

  if (verbose && includeWasmParser) {
    stat(WASM_FILE_DEPENDENCY, (err) => {
      if (err != null && err.code === "ENOENT") {
        console.warn(
          "\x1b[31m[NOTE]\x1b[0m No built WebAssembly file detected. " +
            "If needed, please build it separately.",
        );
      } else {
        console.warn(
          "\x1b[33m[NOTE]\x1b[0m The WebAssembly file won't be re-built by " +
            "this script. If needed, ensure its build is up-to-date.",
        );
      }
    });
  }

  const promWorkerBuild = runBundler(WORKER_IN_FILE, {
    watch,
    minify,
    production: !isDevMode,
    outfile: WORKER_OUT_FILE,
    silent: !verbose,
  });

  /** Declare a plugin to anounce when a build begins and ends */
  const consolePlugin = {
    name: "onEnd",
    setup(build) {
      build.onStart(() => {
        if (verbose) {
          console.log(
            `\x1b[33m[${getHumanReadableHours()}]\x1b[0m ` + "New demo build started",
          );
        }
      });
      build.onEnd((result) => {
        if (!verbose) {
          return;
        }
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
  const promDemoBuild = esbuild[meth]({
    entryPoints: [join(rootDirectory, "demo/scripts/index.tsx")],
    bundle: true,
    target: "es2017",
    minify,
    outfile,
    plugins: [consolePlugin],
    define: {
      "process.env.NODE_ENV": JSON.stringify(isDevMode ? "development" : "production"),
      __INCLUDE_WASM_PARSER__: JSON.stringify(includeWasmParser),
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
      if (verbose) {
        console.error(
          `\x1b[31m[${getHumanReadableHours()}]\x1b[0m Demo build failed:`,
          err,
        );
      }
    });

  return Promise.all([promWorkerBuild, promDemoBuild]);
}

// If true, this script is called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  let shouldWatch = false;
  let shouldMinify = false;
  let production = false;
  let silent = false;
  let includeWasmParser = false;
  for (let argOffset = 0; argOffset < args.length; argOffset++) {
    const currentArg = args[argOffset];
    switch (currentArg) {
      case "-h":
      case "--help":
        displayHelp();
        process.exit(0);
        break;
      case "-w":
      case "--watch":
        shouldWatch = true;
        break;
      case "-m":
      case "--minify":
        shouldMinify = true;
        break;
      case "-p":
      case "--production-mode":
        production = true;
        break;
      case "-s":
      case "--silent":
        silent = true;
        break;
      case "--include-wasm":
        includeWasmParser = true;
        break;
      default: {
        console.error('ERROR: unknown option: "' + currentArg + '"\n');
        displayHelp();
        process.exit(1);
      }
    }
  }
  try {
    buildDemo({
      silent,
      watch: shouldWatch,
      minify: shouldMinify,
      includeWasmParser,
      production,
    }).catch((err) => {
      console.error(`ERROR: ${err}\n`);
      process.exit(1);
    });
  } catch (err) {
    console.error(`ERROR: ${err}\n`);
    process.exit(1);
  }
}

/**
 * Display through `console.log` an helping message relative to how to run this
 * script.
 */
function displayHelp() {
  console.log(
    `build_demo.mjs: Build the RxPlayer's demo in the "demo/" directory.

Usage: node build_demo.mjs [OPTIONS]

Options:
  -h, --help             Display this help.
  -m, --minify           Minify the built demo.
  -p, --production-mode  Build all files in production mode (less runtime checks, mostly).
  -w, --watch            Re-build each time either the demo or library files change.
  -s, --silent           Don't log to stdout/stderr when bundling.
  --include-wasm         The demo will be able to request the WebAssembly MPD parser (if available).`,
  );
}
