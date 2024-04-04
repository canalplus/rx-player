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
import swc from "@swc/core";
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

  let es5Outfile;
  {
    let outputIndex = args.indexOf("-5");
    if (outputIndex < 0) {
      outputIndex = args.indexOf("--es5");
    }
    if (outputIndex >= 0) {
      const wantedEs5OutputFile = args[outputIndex + 1];
      if (wantedEs5OutputFile === undefined) {
        console.error("ERROR: no output file provided for -5/--es5 option\n");
        displayHelp();
        process.exit(1);
      }
      es5Outfile = path.normalize(wantedEs5OutputFile);
    }
  }

  try {
    await runBundler(normalizedPath, {
      watch: shouldWatch,
      minify: shouldMinify,
      production,
      silent,
      outfile,
      es5Outfile,
    });
  } catch (err) {
    console.error(`ERROR: ${err}\n`);
    displayHelp();
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
 * @param {string} [options.es5Outfile] - If set, an ES5 bundle will also be
 * produced at that path.
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
  const es5Outfile = options.es5Outfile;
  const globalScope = !!options.globalScope;

  if (outfile === undefined && es5Outfile === undefined) {
    throw new Error("Neither an output file nor an es5 output file has been provided");
  }

  const esbuildStepsPlugin = {
    name: "bundler-steps",
    setup(build) {
      build.onStart(() => logWarning(`Bundling of ${inputFile} started`));
      build.onEnd((result) => {
        if (watch && es5Outfile !== undefined) {
          buildAndAnnounceEs5Bundle(result?.outputFiles?.[0]?.contents, es5Outfile);
        }
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
    } else if (es5Outfile !== undefined) {
      await buildAndAnnounceEs5Bundle(context?.outputFiles?.[0]?.contents, es5Outfile);
    }
  } catch (err) {
    logError(`Bundling failed for ${inputFile}:`, err);
    throw err;
  }

  async function buildAndAnnounceEs5Bundle(inputData, output) {
    let input;
    if (inputData !== undefined) {
      input = new TextDecoder().decode(inputData);
    } else if (outfile !== undefined) {
      input = await readFile(outfile, "utf-8");
    } else {
      throw new Error("Impossible to generate ES5 bundle: ES2017 bundling not performed");
    }
    try {
      await transpileToEs5({
        input,
        outfile: output,
        minify,
      });
      if (!isSilent) {
        logSuccess(`ES5 file updated at ${output}!`);
      }
    } catch (err) {
      logError(`ES5 file build failed at ${output}: ${err}`);
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

async function transpileToEs5(options) {
  const input = options.input;
  const outfile = options.outfile;
  const minify = options.minify;
  const output = await swc.transform(input, {
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
    `Usage: node run_bundler.mjs input-file [options]
Available options:
  -h, --help                  Display this help message
  -m, --minify                Minify the built bundle
  -o <path>, --output <path>  Specify an output file for the ES2017 bundle. To ignore to skip ES2017
                              bundle generation.
  -5 <path>, --es5 <path>     Perform an ES5-compatible build, should be followed by the corresponding
                              output filename (e.g. '-5 "dist/rx-player.es5.js"')
  -p, --production-mode       Build all files in production mode (less runtime checks, mostly).
  -g, --global-scope          If set, enable "global scope mode" (the \`__GLOBAL_SCOPE__\` global
                              symbol) on the bundle.
  -s, --silent                Don't log to stdout/stderr when bundling
  -w, --watch                 Re-build each time either the files it depends on changed`,
    /* eslint-enable indent */
  );
  /* eslint-enable no-console */
}
