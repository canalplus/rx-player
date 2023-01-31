/**
 * # fast_demo_build.js
 *
 * This file allows to perform a "fast" build of the RxPlayer's demo, by using
 * esbuild.
 *
 * You can either run it directly as a script (run `node fast_demo_build.js -h`
 * to see the different options) or by requiring it as a node module.
 * If doing the latter you will obtain a function you will have to run with the
 * right options.
 */

const path = require("path");
const esbuild = require("esbuild");
const getHumanReadableHours = require("./utils/get_human_readable_hours");

// If true, this script is called directly
if (require.main === module) {
  const { argv } = process;
  if (argv.includes("-h") || argv.includes("--help")) {
    displayHelp();
    process.exit(0);
  }
  const shouldWatch = argv.includes("-w") || argv.includes("--watch");
  const shouldMinify = argv.includes("-m") || argv.includes("--minify");
  const production = argv.includes("-p") || argv.includes("--production-mode");
  const includeWasmParser = argv.includes("--include-wasm");
  fastDemoBuild({
    watch: shouldWatch,
    minify: shouldMinify,
    includeWasmParser,
    production,
  });
} else {
  // This script is loaded as a module
  module.exports = fastDemoBuild;
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
function fastDemoBuild(options) {
  const minify = !!options.minify;
  const watch = !!options.watch;
  const isDevMode = !options.production;
  const includeWasmParser = !!options.includeWasmParser;
  let beforeTime = process.hrtime.bigint();

  esbuild.build({
    entryPoints: [path.join(__dirname, "../demo/full/scripts/index.jsx")],
    bundle: true,
    minify,
    outfile: path.join(__dirname, "../demo/full/bundle.js"),
    watch: !watch ? undefined : {
      onRebuild(error, result) {
        if (error) {
          console.error(`\x1b[31m[${getHumanReadableHours()}]\x1b[0m Demo re-build failed:`,
                        err);
        } else {
          if (result.errors > 0 || result.warnings > 0) {
            const { errors, warnings } = result;
            console.log(`\x1b[33m[${getHumanReadableHours()}]\x1b[0m ` +
                        `Demo re-built with ${errors.length} error(s) and ` +
                        ` ${warnings.length} warning(s) ` +
                        `(in ${stats.endTime - stats.startTime} ms).`);
          }
          console.log(`\x1b[32m[${getHumanReadableHours()}]\x1b[0m ` +
                      "Demo re-built!");
        }
      },
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(isDevMode ? "development" : "production"),
      __INCLUDE_WASM_PARSER__: includeWasmParser,
      __ENVIRONMENT__: JSON.stringify({
        PRODUCTION: 0,
        DEV: 1,
        CURRENT_ENV: isDevMode ? 1 : 0,
      }),
      __LOGGER_LEVEL__: JSON.stringify({
        CURRENT_LEVEL: "INFO",
      }),
    }
  }).then(
  (result) => {
    if (result.errors > 0 || result.warnings > 0) {
      const { errors, warnings } = result;
      console.log(`\x1b[33m[${getHumanReadableHours()}]\x1b[0m ` +
                  `Demo built with ${errors.length} error(s) and ` +
                  ` ${warnings.length} warning(s) ` +
                  `(in ${stats.endTime - stats.startTime} ms).`);
    }
    const fullTime = (process.hrtime.bigint() - beforeTime) / 1000000n;
    console.log(`\x1b[32m[${getHumanReadableHours()}]\x1b[0m ` +
                `Build done in ${fullTime}ms`);
  },
  (err) => {
    console.error(`\x1b[31m[${getHumanReadableHours()}]\x1b[0m Demo build failed:`,
                  err);
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
`Usage: node generate_full_demo.js [options]
Options:
  -h, --help             Display this help
  -m, --minify           Minify the built demo
  -p, --production-mode  Build all files in production mode (less runtime checks, mostly).
  -w, --watch            Re-build each time either the demo or library files change`,
  /* eslint-enable indent */
  );
  /* eslint-enable no-console */
}
