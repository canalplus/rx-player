import { defineConfig } from "vitest/config";
import { webdriverio } from "@vitest/browser-webdriverio";

const UNIT_TEST_FILES = [
  "tests/unit/src/**/*.[jt]s?(x)",
  "tests/unit/global/**/*.test.[jt]s?(x)",
];
const INTEGRATION_TEST_FILES = [
  "tests/integration/scenarios/**/*.[jt]s?(x)",
  "tests/integration/**/*.test.[jt]s?(x)",
];
const MEMORY_TEST_FILES = ["tests/memory/**/*.[jt]s?(x)"];

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

const allProjects = [
  {
    test: {
      name: "chrome",
      browser: getBrowserConfig("chrome"),
    },
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
      __BROWSER_NAME__: JSON.stringify("chrome"),
    },
  },
  {
    test: {
      name: "firefox",
      browser: getBrowserConfig("firefox"),
    },
    define: {
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
      __BROWSER_NAME__: JSON.stringify("firefox"),
    },
  },
  {
    test: {
      name: "edge",
      browser: getBrowserConfig("edge"),
    },
    define: {
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
      __BROWSER_NAME__: JSON.stringify("edge"),
    },
  },
];

const includedFiles = [];
switch (process.env.INCLUDE_ONLY_TESTS) {
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
    console.error(
      "Vitest config file: unkown test filter: " + process.env.INCLUDE_ONLY_TESTS,
    );
}

export default defineConfig({
  test: {
    // Shared config for all projects
    watch: false,
    globals: false,
    reporters: "dot",
    globalSetup: "tests/globalSetup.mjs",
    // If BROWSER_CONFIG is set, filter to only that browser
    projects: (process.env.BROWSER_CONFIG
      ? allProjects.filter((project) => project.test.name === process.env.BROWSER_CONFIG)
      : allProjects
    ).map((project) => ({
      ...project,
      test: {
        ...project.test,
        include: includedFiles,
      },
    })),
  },
});
