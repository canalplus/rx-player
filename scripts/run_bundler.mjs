#!/usr/bin/env node
/**
 * # run_bundler.mjs
 *
 * This file allows to create JavaScript bundles for the RxPlayer through our
 * bundlers with the right configuration.
 *
 * You can either run it directly as a script (run `node run_bundler.mjs -h`
 * to see the different options) or by requiring it as a node module.
 * If doing the latter you will obtain a function you will have to run with the
 * right options.
 */

import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "url";
import esbuild from "esbuild";
import getHumanReadableHours from "./utils/get_human_readable_hours.mjs";

// If true, this script is called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    displayHelp();
    process.exit(0);
  }

  const inputFile = args[0];
  if (inputFile === undefined) {
    console.error("ERROR: no input file provided\n");
    displayHelp();
    process.exit(1);
  }

  const normalizedPath = path.normalize(inputFile);
  if (!fs.existsSync(normalizedPath)) {
    console.error(`ERROR: input file not found: ${normalizedPath}\n`);
    displayHelp();
    process.exit(1);
  }

  const shouldWatch = args.includes("-w") || args.includes("--watch");
  const shouldMinify = args.includes("-m") || args.includes("--minify");
  const production = args.includes("-p") || args.includes("--production-mode");
  const globalScope = args.includes("-g") || args.includes("--globals");
  const silent = args.includes("-s") || args.includes("--silent");

  let outfile;
  {
    let outputIndex = args.indexOf("-o");
    if (outputIndex < 0) {
      outputIndex = args.indexOf("--output");
    }
    if (outputIndex >= 0) {
      const wantedOutputFile = args[outputIndex + 1];
      if (wantedOutputFile === undefined) {
        console.error("ERROR: no output file provided\n");
        displayHelp();
        process.exit(1);
      }
      outfile = path.normalize(wantedOutputFile);
    }
  }

  try {
    runBundler(normalizedPath, {
      watch: shouldWatch,
      minify: shouldMinify,
      production,
      globalScope,
      silent,
      outfile,
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
 * Run bundler with the given options.
 * @param {string} inputFile
 * @param {Object} options
 * @param {boolean} [options.minify] - If `true`, the output will be minified.
 * @param {boolean} [options.globalScope] - If `true`, enable global scope mode
 * (the `__GLOBAL_SCOPE__` global symbol will be set to `true` in the bundle).
 * @param {boolean} [options.production] - If `false`, the code will be compiled
 * in "development" mode, which has supplementary assertions.
 * @param {boolean} [options.watch] - If `true`, the RxPlayer's files involve
 * will be watched and the code re-built each time one of them changes.
 * @param {boolean} [options.silent] - If `true`, we won't output logs.
 * @param {string} [options.outfile] - Destination of the produced es2017
 * bundle. To ignore to skip ES2017 bundle generation.
 * @returns {Promise}
 */
export default async function runBundler(inputFile, options) {
  const minify = !!options.minify;
  const watch = !!options.watch;
  const isDevMode = !options.production;
  const isSilent = options.silent;
  const outfile = options.outfile;
  const globalScope = !!options.globalScope;

  if (outfile === undefined) {
    throw new Error("No output file has been provided");
  }

  const esbuildStepsPlugin = {
    name: "bundler-steps",
    setup(build) {
      build.onStart(() => logWarning(`Bundling of ${inputFile} started`));
      build.onEnd((result) => {
        if (result.errors.length > 0 || result.warnings.length > 0) {
          const { errors, warnings } = result;
          logWarning(
            `File re-bundle of ${inputFile} failed with ${errors.length} error(s) and ` +
              ` ${warnings.length} warning(s) `,
          );
          return;
        }
        if (outfile !== undefined) {
          logSuccess(`File updated at ${outfile}!`);
        }
      });
    },
  };

  const meth = watch ? "context" : "build";

  // Create a context for incremental builds
  try {
    const context = await esbuild[meth]({
      entryPoints: [inputFile],
      bundle: true,
      target: "es2017",
      minify,
      write: outfile !== undefined,
      outfile,
      plugins: [esbuildStepsPlugin],
      define: {
        "process.env.NODE_ENV": JSON.stringify(isDevMode ? "development" : "production"),
        __ENVIRONMENT__: JSON.stringify({
          PRODUCTION: 0,
          DEV: 1,
          CURRENT_ENV: isDevMode ? 1 : 0,
        }),
        __LOGGER_LEVEL__: JSON.stringify({ CURRENT_LEVEL: isDevMode ? "INFO" : "NONE" }),
        __GLOBAL_SCOPE__: JSON.stringify(globalScope),
      },
    });
    if (watch) {
      return context.watch();
    }
  } catch (err) {
    logError(`Bundling failed for ${inputFile}:`, err);
    throw err;
  }

  function logSuccess(msg) {
    if (!isSilent) {
      console.log(`\x1b[32m[${getHumanReadableHours()}]\x1b[0m`, msg);
    }
  }

  function logWarning(msg) {
    if (!isSilent) {
      console.log(`\x1b[33m[${getHumanReadableHours()}]\x1b[0m`, msg);
    }
  }

  function logError(msg) {
    if (!isSilent) {
      console.log(`\x1b[31m[${getHumanReadableHours()}]\x1b[0m`, msg);
    }
  }
}

/**
 * Display through `console.log` an helping message relative to how to run this
 * script.
 */
function displayHelp() {
  console.log(
    `Usage: node run_bundler.mjs input-file [options]
Available options:
  -h, --help                  Display this help message
  -m, --minify                Minify the built bundle
  -o <path>, --output <path>  Specify an output file for the ES2017 bundle. To ignore to skip ES2017
                              bundle generation.
  -p, --production-mode       Build all files in production mode (less runtime checks, mostly).
  -g, --globals               Add the RxPlayer to the global scope.
  -g, --global-scope          If set, enable "global scope mode" (the \`__GLOBAL_SCOPE__\` global
                              symbol) on the bundle.
  -s, --silent                Don't log to stdout/stderr when bundling
  -w, --watch                 Re-build each time either the files it depends on changed`,
  );
}
