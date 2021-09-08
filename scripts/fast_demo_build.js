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
  fastDemoBuild({
    watch: shouldWatch,
    minify: shouldMinify,
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
 */
function fastDemoBuild(options) {
  const minify = !!options.minify;
  const watch = !!options.watch;
  const isDevMode = !options.production;
  let beforeTime = performance.now();

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
      "__DEV__": isDevMode,
      "__LOGGER_LEVEL__": "\"INFO\"",
      "process.env.NODE_ENV": JSON.stringify(isDevMode ? "development" : "production"),
      "__FEATURES__.BIF_PARSER": true,
      "__FEATURES__.DASH": true,
      "__FEATURES__.DIRECTFILE": true,
      "__FEATURES__.EME": true,
      "__FEATURES__.HTML_SAMI": true,
      "__FEATURES__.HTML_SRT": true,
      "__FEATURES__.HTML_TTML": true,
      "__FEATURES__.HTML_VTT": true,
      "__FEATURES__.LOCAL_MANIFEST": true,
      "__FEATURES__.METAPLAYLIST": true,
      "__FEATURES__.NATIVE_SAMI": true,
      "__FEATURES__.NATIVE_SRT": true,
      "__FEATURES__.NATIVE_TTML": true,
      "__FEATURES__.NATIVE_VTT": true,
      "__FEATURES__.SMOOTH": true,

      // Path relative to src/features where optional features are implemented
      "__RELATIVE_PATH__.BIF_PARSER": JSON.stringify("../parsers/images/bif.ts"),
      "__RELATIVE_PATH__.DASH": JSON.stringify("../transports/dash/index.ts"),
      "__RELATIVE_PATH__.DASH_JS_PARSER": JSON.stringify("../parsers/manifest/dash/js-parser/index.ts"),
      "__RELATIVE_PATH__.DIRECTFILE": JSON.stringify("../core/init/initialize_directfile.ts"),
      "__RELATIVE_PATH__.EME_MANAGER": JSON.stringify("../core/eme/index.ts"),
      "__RELATIVE_PATH__.HTML_SAMI": JSON.stringify("../parsers/texttracks/sami/html.ts"),
      "__RELATIVE_PATH__.HTML_SRT": JSON.stringify("../parsers/texttracks/srt/html.ts"),
      "__RELATIVE_PATH__.HTML_TEXT_BUFFER": JSON.stringify("../core/segment_buffers/implementations/text/html/index.ts"),
      "__RELATIVE_PATH__.HTML_TTML": JSON.stringify("../parsers/texttracks/ttml/html/index.ts"),
      "__RELATIVE_PATH__.HTML_VTT": JSON.stringify("../parsers/texttracks/webvtt/html/index.ts"),
      "__RELATIVE_PATH__.IMAGE_BUFFER": JSON.stringify("../core/segment_buffers/implementations/image/index.ts"),
      "__RELATIVE_PATH__.LOCAL_MANIFEST": JSON.stringify("../transports/local/index.ts"),
      "__RELATIVE_PATH__.MEDIA_ELEMENT_TRACK_CHOICE_MANAGER": JSON.stringify("../core/api/media_element_track_choice_manager.ts"),
      "__RELATIVE_PATH__.METAPLAYLIST": JSON.stringify("../transports/metaplaylist/index.ts"),
      "__RELATIVE_PATH__.NATIVE_SAMI": JSON.stringify("../parsers/texttracks/sami/native.ts"),
      "__RELATIVE_PATH__.NATIVE_SRT": JSON.stringify("../parsers/texttracks/srt/native.ts"),
      "__RELATIVE_PATH__.NATIVE_TEXT_BUFFER": JSON.stringify("../core/segment_buffers/implementations/text/native/index.ts"),
      "__RELATIVE_PATH__.NATIVE_TTML": JSON.stringify("../parsers/texttracks/ttml/native/index.ts"),
      "__RELATIVE_PATH__.NATIVE_VTT": JSON.stringify("../parsers/texttracks/webvtt/native/index.ts"),
      "__RELATIVE_PATH__.SMOOTH": JSON.stringify("../transports/smooth/index.ts"),
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
    console.log(`\x1b[32m[${getHumanReadableHours()}]\x1b[0m ` +
                `Build done in ${(performance.now() - beforeTime).toFixed(2)}ms`);
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
