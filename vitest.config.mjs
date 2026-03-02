import { defineConfig } from "vitest/config";
import { webdriverio } from "@vitest/browser-webdriverio";

/**
 * - `"src"` (unit tests)
 * - `"integration"` (integration tests)
 * - `"memory"` (memory tests)
 * - or `undefined` (all those)
 */
const testCategory = process.env.INCLUDE_ONLY_TESTS;

/** "chrome", "edge", "firefox", or undefined (all browsers) */
const configuredBrowser = process.env.BROWSER_CONFIG;

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

export default defineConfig({
  test: {
    watch: false,
    globals: false,
    reporters: "dot",
    globalSetup:
      // Unit tests (in src) do not necessitate a complex setup
      testCategory === "src" ? undefined : "tests/globalSetup.mjs",
    // If BROWSER_CONFIG is set, filter to only that browser
    projects: [generateTestConfig(configuredBrowser, testCategory)],
  },
});

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
 * @param {string} browserName - The browser chosen to run the tests.
 * Can be `"chrome"`, `"firefox"` or `"edge"`.
 * @param {string|undefined} testCategory - The "category" of the tests that
 * should be run, can be `"src"` (unit tests), `"integration"` or `"memory"`.
 * All of them if undefined.
 * @returns {Object} - The corresponding `vitest` config.
 */
function generateTestConfig(browserName = DEFAULT_BROWSER, testCategory) {
  const includedFiles = [];
  switch (testCategory) {
    case "src":
      includedFiles.push(...UNIT_TEST_FILES);
      break;
    case "integration":
      includedFiles.push(...INTEGRATION_TEST_FILES);
      break;
    case "memory":
      includedFiles.push(...MEMORY_TEST_FILES);
      break;
    case null:
    case undefined:
    case "":
      includedFiles.push(
        ...INTEGRATION_TEST_FILES,
        ...MEMORY_TEST_FILES,
        ...UNIT_TEST_FILES,
      );
      break;

    default:
      console.error("Vitest config file: unkown test filter: " + testCategory);
  }
  return {
    test: {
      name: browserName,
      browser: getBrowserConfig(browserName),
      include: includedFiles,
    },
    define: {
      ...baseGlobals,
      __BROWSER_NAME__: JSON.stringify(browserName),
    },
  };
}
