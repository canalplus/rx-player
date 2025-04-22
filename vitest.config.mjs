import { defineConfig } from "vitest/config";

function getBrowserConfig(browser) {
  switch (browser) {
    case "chrome":
      return {
        enabled: true,
        provider: "webdriverio",
        headless: true,
        screenshotFailures: false,
        instances: [
          {
            browser: "chrome",
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
        ],
      };

    case "firefox":
      return {
        enabled: true,
        provider: "webdriverio",
        headless: true,
        screenshotFailures: false,
        instances: [
          {
            browser: "firefox",
            capabilities: {
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
          },
        ],
      };

    case "edge":
      return {
        enabled: true,
        provider: "webdriverio",
        headless: true,
        screenshotFailures: false,
        instances: [
          {
            browser: "edge",
            capabilities: {
              "ms:edgeOptions": {
                args: ["--autoplay-policy=no-user-gesture-required"],
              },
            },
          },
        ],
      };

    default:
      return {
        enabled: false,
      };
  }
}

export default defineConfig({
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
    __BROWSER_NAME__: JSON.stringify(process.env.BROWSER_CONFIG),
  },
  test: {
    watch: false,
    globals: false,
    reporters: "dot",
    include: [
      // integration tests
      "tests/integration/scenarios/**/*.[jt]s?(x)",
      "tests/integration/**/*.test.[jt]s?(x)",
      // memory tests
      "tests/memory/**/*.[jt]s?(x)",
    ],
    globalSetup: "tests/globalSetup.mjs",
    browser: getBrowserConfig(process.env.BROWSER_CONFIG ?? "chrome"),
  },
});
