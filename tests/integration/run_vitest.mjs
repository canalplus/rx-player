/* eslint-env node */

import { defineConfig } from "vitest/config";
import { startVitest } from "vitest/node";
import TestContentServer from "../contents/server.mjs";
const CONTENT_SERVER_PORT = 3000;

const config = defineConfig({
  define: {
    // global variables
    __TEST_CONTENT_SERVER__: {
      URL: "127.0.0.1",
      PORT: 3000,
    },
    __ENVIRONMENT__: {
      PRODUCTION: 0,
      DEV: 1,
      CURRENT_ENV: 1,
    },
    __LOGGER_LEVEL__: {
      CURRENT_LEVEL: '"NONE"',
    },
  },
  test: {
    globals: false,
    include: [
      // "**/scenarios/**/*.?(c|m)[jt]s?(x)",
      "tests/memory/index.js",
    ],
    browser: {
      enabled: true,
      name: "chrome",
      provider: "webdriverio",
      headless: true,
      providerOptions: {
        capabilities: {
          "goog:chromeOptions": {
            args: [
              "--autoplay-policy=no-user-gesture-required",
              "--enable-precise-memory-info",
              "--js-flags=--expose-gc",
            ],
          },
        },
      },
    },
  },
});

// customLaunchers: {
//   ChromeMemory: {
//     base: "Chrome",
//     flags: [
//       "--autoplay-policy=no-user-gesture-required",
//     ,
//     ],
//   },
//   ChromeHeadlessMemory: {
//     base: "ChromeHeadless",
//     flags: [
//       "--autoplay-policy=no-user-gesture-required",
//       "--enable-precise-memory-info",
//       '--js-flags="--expose-gc"',
//     ],
//   },
// },

const testContentServer = TestContentServer(CONTENT_SERVER_PORT);

startVitest("test", undefined, undefined, config);

// import * as path from "path";
// import { fileURLToPath } from 'url';
// import karma from "karma";
// import TestContentServer from "../contents/server.mjs";
// import generateTestWebpackConfig from "../generate_test_webpack_config.mjs";

// const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
// const parseConfig = karma.config.parseConfig;
// const Server = karma.Server;
// const CONTENT_SERVER_PORT = 3000;

// const argv = process.argv;
// if (argv.includes("-h") || argv.includes("--help")) {
//   displayHelp();
//   process.exit(0);
// }

// const singleRun = !argv.includes("--watch");

// const browsers = [];
// if (argv.includes("--bchrome")) {
//   browsers.push("ChromeAutoPlay");
// }
// if (argv.includes("--bchromehl")) {
//   browsers.push("ChromeHeadlessAutoPlay");
// }
// if (argv.includes("--bfirefoxhl")) {
//   browsers.push("FirefoxHeadlessAutoPlay");
// }

// if (browsers.length === 0) {
//   displayHelp();
//   process.exit(0);
// }

// const webpackConfig = generateTestWebpackConfig({
//   contentServerInfo: { url: "127.0.0.1", port: CONTENT_SERVER_PORT },
// });

// const karmaConf = {
//   basePath: ".",
//   browsers: browsers,
//   customLaunchers: {
//     ChromeHeadlessAutoPlay: {
//       base: "ChromeHeadless",
//       flags: [ "--autoplay-policy=no-user-gesture-required" ],
//     },
//     FirefoxHeadlessAutoPlay: {
//       base: "FirefoxHeadless",
//       prefs: {
//         "media.autoplay.default": 0,
//         "media.autoplay.enabled.user-gestures-needed": false,
//         "media.autoplay.block-webaudio": false,
//         "media.autoplay.ask-permission": false,
//         "media.autoplay.block-event.enabled": false,
//         "media.block-autoplay-until-in-foreground": false,
//       },
//     },
//     ChromeAutoPlay: {
//       base: "Chrome",
//       flags: [ "--autoplay-policy=no-user-gesture-required" ],
//     },
//   },
//   singleRun,
//   reporters: ["dots"],
//   frameworks: ["webpack", "mocha"],
//   plugins: [
//     "karma-chrome-launcher",
//     "karma-firefox-launcher",
//     "karma-mocha",
//     "karma-webpack"
//   ],
//   webpack: webpackConfig,
//   webpackMiddleware: { stats: { colors: true, chunks: false } },
//   preprocessors: {
//     [path.resolve(currentDirectory, "./scenarios/**/*.js")]: ["webpack"],
//   },
//   files: [
//     {
//       pattern: path.resolve(currentDirectory, "./scenarios/**/*.js"),
//       watched: false,
//     }
//   ],
//   client: {
//     captureConsole: true,
//     mocha: { reporter: "html" },
//   },
// };

// const testContentServer = TestContentServer(CONTENT_SERVER_PORT);
// parseConfig(
//   null,
//   karmaConf,
//   { promiseConfig: true, throwErrors: true }
// ).then((parsedConfig) => {
//   const server = new Server(parsedConfig, function(exitCode) {
//     testContentServer.close();
//     process.exit(exitCode);
//   });
//   server.start();
// }, (rejectReason) => {
//   /* eslint-disable-next-line no-console */
//   console.error("Karma config rejected:", rejectReason);
// });

// function displayHelp() {
//   /* eslint-disable no-console */
//   console.log(
//   /* eslint-disable indent */
// `Usage: node run.mjs [options]
// Options:
//   -h, --help    Display this help
//   --bchrome     Launch tests on Chrome
//   --bchromehl   Launch tests on headless Chrome
//   --bfirefoxhl  Launch tests on headless Firefox
//   --watch       Re-run tests on modifications`,
//   /* eslint-enable indent */
//   );
//   /* eslint-enable no-console */
// }
