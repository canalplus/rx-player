#!/usr/bin/env node
/**
 * # run_tests.mjs
 *
 * This file allows to run most of our test suites (with the exception of
 * performance tests, which rely on a different script) by running the `vitest`
 * dependency on them with the right options.
 *
 * You can either run it directly as a script (run `node run_tests.mjs -h`
 * to see the different options) or by requiring it as a node module.
 * If doing the latter you will obtain a function you will have to run with the
 * right options.
 */

import { pathToFileURL } from "url";
import { startVitest } from "vitest/node";
import { webdriverio } from "@vitest/browser-webdriverio";

/** If not specified, run only this browser. */
const DEFAULT_BROWSER = "chrome";

/** Paths were unit tests are defined. */
const UNIT_TEST_FILES = [
  "tests/unit/src/**/*.[jt]s?(x)",
  "tests/unit/global/**/*.test.[jt]s?(x)",
];
/** Paths were integration tests are defined. */
const INTEGRATION_TEST_FILES = [
  "tests/integration/scenarios/**/*.[jt]s?(x)",
  "tests/integration/**/*.test.[jt]s?(x)",
];
/** Paths were memory tests are defined. */
const MEMORY_TEST_FILES = ["tests/memory/**/*.[jt]s?(x)"];

const baseGlobals = {
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
};

/**
 * @param {Object} config - The test configuration object.
 * @param {string} config.browser - The browser chosen to run the tests.
 * Can be `"chrome"`, `"firefox"` or `"edge"`.
 * @param {boolean} config.unit - If `true`, run unit tests.
 * @param {boolean} config.integration - If `true`, run integration tests.
 * @param {boolean} config.memory - If `true`, run memory tests.
 * @param {boolean} config.watch - If `true`, re-run tests when a depended file
 * changed.
 * @param {Array.<string>} testFilters - The filters you can pass to vitest ot
 * only run some tests.
 * @returns {Promise.<Object>} - The vitest object.
 */
export default function runVitests(
  { browser, unit, integration, memory, watch },
  testFilters = [],
) {
  return startVitest("test", testFilters, {
    reporters: "dot",
    watch,
    // Only integration and memory tests necessitate a complex setup
    globalSetup: !integration && !memory ? undefined : "tests/globalSetup.mjs",
    projects: [generateTestConfig({ browser, unit, integration, memory })],
  });
}

/**
 * Generate the configuration associated to a particular browser adapted to
 * RxPlayer tests (headless, autoplay enabled, memory control...).
 * @param {string} browser - The browser chosen to run the tests.
 * Can be `"chrome"`, `"firefox"` or `"edge"`.
 * @returns {Object} - The `vitest`'s `browser` config to set to run that
 * browser.
 */
function getBrowserConfig(browser) {
  switch (browser) {
    case "chrome":
      return {
        enabled: true,
        provider: webdriverio({
          capabilities: {
            browserName: "chrome",
            "goog:chromeOptions": {
              args: [
                "--autoplay-policy=no-user-gesture-required",
                "--enable-precise-memory-info",
                "--js-flags=--expose-gc",
              ],
            },
          },
        }),
        headless: true,
        screenshotFailures: false,
        instances: [
          {
            browser: "chrome",
          },
        ],
      };

    case "firefox":
      return {
        enabled: true,
        provider: webdriverio({
          capabilities: {
            browserName: "firefox",
            "moz:firefoxOptions": {
              prefs: {
                "media.autoplay.default": 0,
                "media.autoplay.enabled.user-gestures-needed": false,
                "media.autoplay.block-webaudio": false,
                "media.autoplay.ask-permission": false,
                "media.autoplay.block-event.enabled": false,
                "media.block-autoplay-until-in-foreground": false,
              },
            },
          },
        }),
        headless: true,
        screenshotFailures: false,
        instances: [
          {
            browser: "firefox",
          },
        ],
      };

    case "edge":
      return {
        enabled: true,
        provider: webdriverio({
          capabilities: {
            browserName: "edge",
            "ms:edgeOptions": {
              args: ["--autoplay-policy=no-user-gesture-required"],
            },
          },
        }),
        headless: true,
        screenshotFailures: false,
        instances: [
          {
            browser: "edge",
          },
        ],
      };

    default:
      return {
        enabled: false,
      };
  }
}

/**
 * @param {Object} config - The test configuration object.
 * @param {string} config.browser - The browser chosen to run the tests.
 * Can be `"chrome"`, `"firefox"` or `"edge"`.
 * @param {boolean} config.unit - If `true`, run unit tests.
 * @param {boolean} config.integration - If `true`, run integration tests.
 * @param {boolean} config.memory - If `true`, run memory tests.
 * @returns {Object} - The corresponding `vitest` config.
 */
function generateTestConfig({ browser, unit, integration, memory }) {
  const includedFiles = [];
  if (unit) {
    includedFiles.push(...UNIT_TEST_FILES);
  }
  if (integration) {
    includedFiles.push(...INTEGRATION_TEST_FILES);
  }
  if (memory) {
    includedFiles.push(...MEMORY_TEST_FILES);
  }
  return {
    test: {
      name: browser,
      browser: getBrowserConfig(browser),
      include: includedFiles,
      globals: false,
    },
    define: {
      ...baseGlobals,
      __BROWSER_NAME__: JSON.stringify(browser),
    },
  };
}

// If true, this script is called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  let shouldWatch = false;
  let memory = false;
  let integration = false;
  let unit = false;
  // TODO: multiple browsers?
  let browser = "";
  const filters = [];

  if (args[0] === "-h" || args[0] === "--help") {
    displayHelp();
    process.exit(0);
  }
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
      case "--memory":
        memory = true;
        break;

      case "-i":
      case "--integration":
        integration = true;
        break;

      case "-u":
      case "--unit":
        unit = true;
        break;

      case "-f":
      case "--filter":
        {
          argOffset++;
          const newFilter = args[argOffset];
          if (newFilter === undefined) {
            console.error(`ERROR: no filter provided to ${currentArg} flag.\n`);
            displayHelp();
            process.exit(1);
          }
          filters.push(newFilter);
        }
        break;

      case "-b":
      case "--browser":
        {
          argOffset++;
          browser = args[argOffset];
          if (browser === undefined) {
            console.error("ERROR: no browser name provided\n");
            displayHelp();
            process.exit(1);
          }
          if (!["chrome", "firefox", "edge"].includes(browser)) {
            console.error(
              'ERROR: Invalid browser name provided.\nOnly "chrome", "firefox" or "edge" is authorized',
            );
            displayHelp();
            process.exit(1);
          }
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

  if (!unit && !integration && !memory) {
    if (filters.length === 0) {
      console.warn("~~~ ⚠️  No test category specified, running all of them");
      console.log();
    }
    unit = true;
    integration = true;
    memory = true;
  }

  if (integration) {
    console.warn(
      `~~~ ⚠️ Integration tests have two dependencies: a local RxPlayer build and ffmpeg.
~~~ Make sure you:
~~~ 1.  Have an ffmpeg executable in your path and,
~~~ 2.  You built an up-to-date RxPlayer through the \`build\` npm script.`,
    );
    console.log();
  }

  if (!browser) {
    console.info("Note: No browser specified, running on " + DEFAULT_BROWSER);
    console.log();
    browser = DEFAULT_BROWSER;
  }

  try {
    runVitests(
      {
        watch: shouldWatch,
        memory,
        integration,
        unit,
        browser,
      },
      filters,
    ).catch((err) => {
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
    `run_tests.mjs: Run our test suites.

By default run all our unit, integration and memory tests unless one of the "-f", "-u", "-i"
or "-m" flag is set (see below).

Usage: node run_tests.mjs [OPTIONS]

Available options:
  -h, --help                          Display this help message.
  -f <FILTER>, --filter <FILTER>      A string that will serve as a filter.
                                      Only test files containing this string will run.
                                      This flag can be set multiple times, in which case
                                      tests containing **either** of those strings will run.
  -b <BROWSER>, --browser <BROWSER>   The browser to run those tests on.
                                      Can be set to either "chrome", "firefox" or "edge".
                                      "chrome" by default.
  -u, --unit                          Perform unit tests.
                                      If this flag is set, integration and memory tests will not
                                      run unless respectively the "-i" and/or the "-m" flag is set.
  -i, --integration                   Perform integration tests.
                                      If this flag is set, unit and memory tests will not run
                                      unless respectively the "-u" and/or the "-m" flag is set.
  -m, --memory                        Perform memory tests (checking for memory leak).
                                      If this flag is set, unit and integration tests will not run
                                      unless respectively the "-u" and/or the "-i" flag is set.
  -w, --watch                         Re-run tests if any of its depended file has changed.`,
  );
}
