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

// @ts-check

import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "url";
import esbuild from "esbuild";
import getHumanReadableHours from "./utils/get_human_readable_hours.mjs";
import PROJECT_ROOT_DIRECTORY from "./utils/project_root_directory.mjs";

/**
 * @typedef {{
 *   name?: string;
 *   minify?: boolean;
 *   globalScope?: boolean;
 *   production?: boolean;
 *   watch?: boolean;
 *   silent?: boolean;
 *   outfile?: string;
 *   globals?: Record<string, string>;
 * }} RunBundlerOptions
 *
 * Bundler options.
 * @property {string} [name] - The "name" associated to your bundle, used in
 * logs if `silent` is not set to `true`.
 * @property {boolean} [minify] - If `true`, the output is minified.
 * @property {boolean} [globalScope] - If `true`, enable global scope mode so
 * the `__GLOBAL_SCOPE__` symbol is set to `true` in the bundle.
 * @property {boolean} [production] - If `false`, compile in development mode,
 * which keeps supplementary assertions enabled.
 * @property {boolean} [watch] - If `true`, rebuild each time one of the
 * RxPlayer source files used by that bundle changes.
 * @property {boolean} [silent] - If `true`, don't output logs.
 * @property {string} [outfile] - Destination of the produced ES2017 bundle.
 * @property {Record<string, string>} [globals] - Optional globally-defined
 * identifiers, as a key-value object. If you want to replace an identifier
 * with a string literal, wrap it with `JSON.stringify`.
 */

/**
 * Run bundler with the given options.
 * @param {string} inputFile
 * @param {RunBundlerOptions} options
 * @returns {Promise.<void>}
 */
export default async function runBundler(inputFile, options) {
  const name = options.name;
  const minify = !!options.minify;
  const watch = !!options.watch;
  const isDevMode = !options.production;
  const isSilent = options.silent;
  const outfile = options.outfile;
  const globals = options.globals;
  const relativeInFile = path.relative(PROJECT_ROOT_DIRECTORY, inputFile);
  const relativeOutfile =
    outfile === undefined ? undefined : path.relative(PROJECT_ROOT_DIRECTORY, outfile);
  const globalScope = !!options.globalScope;

  if (outfile === undefined) {
    throw new Error("No output file has been provided");
  }

  const esbuildStepsPlugin = {
    name: "bundler-steps",
    /** @param {import("esbuild").PluginBuild} build */
    setup(build) {
      build.onStart(() => {
        if (name != null) {
          logWarning(`Bundling for "${name}" started. (${relativeInFile}).`);
        } else {
          logWarning(`Bundling of "${relativeInFile}" started.`);
        }
      });
      build.onEnd((result) => {
        if (result.errors.length > 0 || result.warnings.length > 0) {
          const { errors, warnings } = result;
          logWarning(
            `Re-bundling for "${name ?? inputFile}" failed with ${errors.length} error(s) and ` +
              ` ${warnings.length} warning(s) `,
          );
          return;
        }
        if (relativeOutfile !== undefined) {
          if (name != null) {
            logSuccess(`Bundling for "${name}" succeeded. (${relativeOutfile}).`);
          } else {
            logSuccess(`Bundling of "${relativeOutfile}" succeeded.`);
          }
        }
      });
    },
  };

  try {
    const buildOptions = {
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
        ...(globals ?? {}),
      },
    };
    if (watch) {
      const context = await esbuild.context(buildOptions);
      return context.watch();
    }
    await esbuild.build(buildOptions);
  } catch (err) {
    logError(`Bundling failed for "${name ?? inputFile}": ${String(err)}`);
    throw err;
  }

  /** @param {string} msg */
  function logSuccess(msg) {
    if (!isSilent) {
      console.log(`\x1b[32m[${getHumanReadableHours()}]\x1b[0m`, msg);
    }
  }

  /** @param {string} msg */
  function logWarning(msg) {
    if (!isSilent) {
      console.log(`\x1b[33m[${getHumanReadableHours()}]\x1b[0m`, msg);
    }
  }

  /** @param {string} msg */
  function logError(msg) {
    if (!isSilent) {
      console.log(`\x1b[31m[${getHumanReadableHours()}]\x1b[0m`, msg);
    }
  }
}

// If true, this script is called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  let shouldWatch = false;
  let shouldMinify = false;
  let production = false;
  let globalScope = false;
  let outputFile = "";
  let silent = false;
  let name;

  if (args[0] === "-h" || args[0] === "--help") {
    displayHelp();
    process.exit(0);
  }
  for (let argOffset = 1; argOffset < args.length; argOffset++) {
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

      case "-g":
      case "--globals":
        globalScope = true;
        break;

      case "-s":
      case "--silent":
        silent = true;
        break;

      case "-n":
      case "--name":
        {
          argOffset++;
          name = args[argOffset];
          if (name === undefined) {
            console.error("ERROR: no name provided\n");
            displayHelp();
            process.exit(1);
          }
        }
        break;

      case "-o":
      case "--output":
        {
          argOffset++;
          const wantedOutput = args[argOffset];
          if (wantedOutput === undefined) {
            console.error("ERROR: no output file provided\n");
            displayHelp();
            process.exit(1);
          }
          outputFile = path.normalize(wantedOutput);
        }
        break;

      case "--":
        argOffset = args.length;
        break;

      default: {
        console.error('ERROR: unknown option: "' + currentArg + '"\n');
        displayHelp();
        process.exit(1);
      }
    }
  }

  const inputFile = args[0];
  if (inputFile === undefined) {
    console.error("ERROR: no input file provided\n");
    displayHelp();
    process.exit(1);
  }

  const normalizedPath = path.normalize(inputFile);
  if (!fs.existsSync(normalizedPath)) {
    console.error(`ERROR: input file not found: ${inputFile}\n`);
    displayHelp();
    process.exit(1);
  }

  try {
    /** @type {RunBundlerOptions} */
    const runOptions = {
      watch: shouldWatch,
      minify: shouldMinify,
      production,
      globalScope,
      silent,
      outfile: outputFile,
    };
    if (name !== undefined) {
      runOptions.name = name;
    }
    runBundler(normalizedPath, runOptions).catch((err) => {
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
    `run_bundler.mjs: Produce a RxPlayer bundle (a single JS file containing the RxPlayer).

Usage: node run_bundler.mjs <INPUT FILE> [OPTIONS]

Available options:
  -h, --help                  Display this help message.
  -o <PATH>, --output <PATH>  Mandatory: Specify the output file.
  -m, --minify                Minify the built bundle.
  -p, --production-mode       Build all files in production mode (less runtime checks, mostly).
  -g, --globals               Add the RxPlayer to the global scope.
  -n, --name                  Optional "name" to refer to your bundle. Will be used for in log output outputs.
  -s, --silent                Don't log to stdout/stderr when bundling.
  -w, --watch                 Re-build each time any of the files depended on changed.`,
  );
}
