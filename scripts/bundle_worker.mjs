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

import * as path from "path";
import { pathToFileURL } from "url";
import esbuild from "esbuild";
import TerserPlugin from "terser-webpack-plugin";
import webpack from "webpack";
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
  buildWorkerEs5({
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
  const outfile = options.outfile ?? path.join(rootDirectory, "dist/worker.js");

  /** Declare a plugin to anounce when a build begins and ends */
  const consolePlugin = {
    name: "onEnd",
    setup(build) {
      build.onStart(() => {
        console.log(
          `\x1b[33m[${getHumanReadableHours()}]\x1b[0m ` +
            "New Worker file build started",
        );
      });
      build.onEnd((result) => {
        if (result.errors.length > 0 || result.warnings.length > 0) {
          const { errors, warnings } = result;
          console.log(
            `\x1b[33m[${getHumanReadableHours()}]\x1b[0m ` +
              `Worker file re-built with ${errors.length} error(s) and ` +
              ` ${warnings.length} warning(s) `,
          );
          return;
        }
        console.log(
          `\x1b[32m[${getHumanReadableHours()}]\x1b[0m ` +
            `Worker file updated at ${outfile}!`,
        );
      });
    },
  };

  const meth = watch ? "context" : "build";

  // Create a context for incremental builds
  return esbuild[meth]({
    entryPoints: [path.join(rootDirectory, "src/worker_entry_point.ts")],
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
          `\x1b[31m[${getHumanReadableHours()}]\x1b[0m Worker file build failed:`,
          err,
        );
      }
      throw err;
    });
}

export function buildWorkerEs5(options) {
  const shouldMinify = !!options.minify;
  const watch = !!options.watch;
  const isDevMode = !options.production;
  const isSilent = options.silent;
  const outfile = options.outfile ?? path.join(rootDirectory, "dist/worker.es5.js");
  const outputPath = path.dirname(outfile);
  const filename = path.basename(outfile);

  const plugins = [
    new webpack.DefinePlugin({
      __ENVIRONMENT__: {
        PRODUCTION: 0,
        DEV: 1,
        CURRENT_ENV: isDevMode ? 1 : 0,
      },
      __LOGGER_LEVEL__: JSON.stringify({ CURRENT_LEVEL: "NONE" }),
    }),
  ];

  if (!isSilent) {
    console.log(
      `\x1b[33m[${getHumanReadableHours()}]\x1b[0m ` +
        "New ES5 Worker file build started",
    );
  }

  const compiler = webpack({
    mode: isDevMode ? "development" : "production",
    entry: [path.join(rootDirectory, "src/worker_entry_point.ts")],
    output: {
      path: outputPath,
      filename,
      environment: {
        arrowFunction: false,
        asyncFunction: false,
        bigIntLiteral: false,
        const: false,
        destructuring: false,
        dynamicImport: false,
        dynamicImportInWorker: false,
        forOf: false,
        globalThis: false,
        module: false,
        optionalChaining: false,
        templateLiteral: false,
      },
    },
    optimization: {
      minimize: shouldMinify,
      minimizer: shouldMinify ? [new TerserPlugin()] : [],
    },
    performance: {
      maxEntrypointSize: shouldMinify ? 600000 : 2500000,
      maxAssetSize: shouldMinify ? 600000 : 2500000,
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: "babel-loader",
              options: {
                cacheDirectory: true,
                presets: [["@babel/env", { loose: true, modules: false }]],
                plugins: [["@babel/plugin-transform-runtime"]],
              },
            },
            { loader: "ts-loader" },
          ],
        },
      ],
    },
    plugins,
  });

  return new Promise((res, rej) => {
    if (watch) {
      compiler.watch({}, (err) => {
        if (err) {
          if (!isSilent) {
            console.error(
              `\x1b[31m[${getHumanReadableHours()}]\x1b[0m ES5 Worker file build failed:`,
              err,
            );
          }
          rej(err);
        } else if (!isSilent) {
          console.log(
            `\x1b[32m[${getHumanReadableHours()}]\x1b[0m ` +
              `ES5 Worker file updated at ${outfile}!`,
          );
        }
        res();
      });
      return;
    }
    compiler.run((err) => {
      if (err) {
        if (!isSilent) {
          console.error(
            `\x1b[31m[${getHumanReadableHours()}]\x1b[0m ES5 Worker file build failed:`,
            err,
          );
        }
        rej(err);
      } else if (!isSilent) {
        console.log(
          `\x1b[32m[${getHumanReadableHours()}]\x1b[0m ` +
            `ES5 Worker file written at ${outfile}!`,
        );
      }
      res();
    });
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
