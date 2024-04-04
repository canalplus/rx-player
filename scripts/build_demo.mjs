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
const DEMO_OUT_FILE = join(rootDirectory, "demo/full/bundle.js");
const WORKER_OUT_FILE = join(rootDirectory, "demo/full/worker.js");
const WASM_FILE_DEPENDENCY = join(rootDirectory, "dist/mpd-parser.wasm");

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
  const includeWasmParser = argv.includes("--include-wasm");
  buildDemo({
    watch: shouldWatch,
    minify: shouldMinify,
    includeWasmParser,
    production,
  });
}

/**
 * Build the demo with the given options.
 * @param {Object} options
 * @param {boolean} [options.minify] - If `true`, the output will be minified.
 * @param {boolean} [options.production] - If `false`, the code will be compiled
 * in "development" mode, which has supplementary assertions.
 * @param {boolean} [options.watch] - If `true`, the RxPlayer's files involve
 * will be watched and the code re-built each time one of them changes.
 * @param {boolean} [options.includeWasmParser] - If `true`, the WebAssembly MPD
 * parser of the RxPlayer will be used (if it can be requested).
 */
export default function buildDemo(options) {
  const minify = !!options.minify;
  const watch = !!options.watch;
  const isDevMode = !options.production;
  const includeWasmParser = !!options.includeWasmParser;
  const outfile = DEMO_OUT_FILE;

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

  runBundler(WORKER_IN_FILE, {
    watch,
    minify,
    production: !isDevMode,
    outfile: WORKER_OUT_FILE,
    silent: false,
  });

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
    entryPoints: [join(rootDirectory, "demo/full/scripts/index.tsx")],
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
