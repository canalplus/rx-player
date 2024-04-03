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

import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "url";
import esbuild from "esbuild";
import swc from "@swc/core";
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
  const buildEs5 = argv.includes("-5") || argv.includes("--es5");
  buildWorker({
    watch: shouldWatch,
    minify: shouldMinify,
    production,
    silent,
    es5: buildEs5,
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
 * @param {boolean} [options.es5] - If `true`, an ES5 bundle will also be
 * produced.
 * @param {string} [options.outfile] - Destination of the produced bundle.
 * `dist/worker.js` by default.
 * @param {string} [options.es5Outfile] - Destination of the produced ES5
 * bundle (only if [options.es5] has been set to `true`).
 * `dist/worker.es5.js` by default.
 * @returns {Promise}
 */
export default async function buildWorker(options) {
  const minify = !!options.minify;
  const watch = !!options.watch;
  const isDevMode = !options.production;
  const isSilent = options.silent;
  const outfile = options.outfile ?? path.join(rootDirectory, "dist/worker.js");
  const es5Outfile = options.es5Outfile ?? path.join(rootDirectory, "dist/worker.es5.js");

  const esbuildStepsPlugin = {
    name: "worker-steps",
    setup(build) {
      build.onStart(() => logWarning("New Worker file build started"));
      build.onEnd((result) => {
        if (watch && options.es5) {
          buildAndAnnounceEs5Bundle();
        }
        if (result.errors.length > 0 || result.warnings.length > 0) {
          const { errors, warnings } = result;
          logWarning(
            `Worker file re-built with ${errors.length} error(s) and ` +
              ` ${warnings.length} warning(s) `,
          );
          return;
        }
        logSuccess(`Worker file updated at ${outfile}!`);
      });
    },
  };

  const meth = watch ? "context" : "build";

  // Create a context for incremental builds
  try {
    const context = await esbuild[meth]({
      entryPoints: [path.join(rootDirectory, "src/worker_entry_point.ts")],
      bundle: true,
      target: "es2017",
      minify,
      outfile,
      plugins: [esbuildStepsPlugin],
      define: {
        "process.env.NODE_ENV": JSON.stringify(isDevMode ? "development" : "production"),
        __ENVIRONMENT__: JSON.stringify({
          PRODUCTION: 0,
          DEV: 1,
          CURRENT_ENV: isDevMode ? 1 : 0,
        }),
        __LOGGER_LEVEL__: JSON.stringify({ CURRENT_LEVEL: "NONE" }),
      },
    });
    if (watch) {
      return context.watch();
    } else if (options.es5) {
      await buildAndAnnounceEs5Bundle();
    }
  } catch (err) {
    logError(`Worker file build failed:`, err);
    throw err;
  }

  async function buildAndAnnounceEs5Bundle() {
    try {
      await transpileWorkerToEs5({
        infile: outfile,
        outfile: es5Outfile,
        minify,
      });
      if (!isSilent) {
        logSuccess(`ES5 Worker file updated at ${es5Outfile}!`);
      }
    } catch (err) {
      logError(`ES5 Worker file build failed: ${err}`);
      throw err;
    }
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
 * Simple promisified `fs.readFile` API.
 * @param {string} filePath
 * @param {string|null} encoding
 * @returns {*} - Read data, the type depends on the `encoding` parameters (see
 * `fs.readFile` documentation).
 */
function readFile(filePath, encoding) {
  return new Promise((res, rej) => {
    fs.readFile(filePath, { encoding }, function (err, data) {
      if (err) {
        rej(err);
      }
      res(data);
    });
  });
}

/**
 * Simple promisified `fs.writeFile` API.
 * @param {string} filePath
 * @param {string} content
 * @returns {Promise}
 */
function writeFile(filePath, content) {
  return new Promise((res, rej) => {
    fs.writeFile(filePath, content, (err) => {
      if (err) {
        rej(err);
      }
      res();
    });
  });
}

async function transpileWorkerToEs5(options) {
  const infile = options.infile;
  const outfile = options.outfile;
  const fileData = await readFile(infile, "utf-8");
  const minify = options.minify;
  const output = await swc.transform(fileData, {
    jsc: {
      parser: {
        syntax: "ecmascript",
        jsx: false,
        dynamicImport: false,
        privateMethod: false,
        functionBind: false,
        exportDefaultFrom: false,
        exportNamespaceFrom: false,
        decorators: false,
        decoratorsBeforeExport: false,
        topLevelAwait: false,
        importMeta: false,
      },
      minify: {
        compress: {
          unused: true,
        },
        mangle: true,
      },
      transform: null,
      target: "es5",
      loose: false,
      externalHelpers: false,
      // Requires v1.2.50 or upper and requires target to be es2016 or upper.
      keepClassNames: false,
    },
    minify,
  });
  await writeFile(outfile, output.code);
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
