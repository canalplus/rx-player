import { defineConfig } from "vitest/config";

function getBrowserConfig(browser) {
  switch (browser) {
    case "chrome":
      return {
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
      };

    case "firefox":
      return {
        enabled: true,
        name: "firefox",
        provider: "webdriverio",
        headless: true,
        providerOptions: {
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
    watch: process.env.WATCH === "true",
    // include: [
    //   "src/parsers/manifest/dash/native-parser/node_parsers/__tests__/SegmentURL.test.ts",
    // ],
    include: ["src/manifest/classes/__tests__/period.test.ts"],
    // include: ["src/**/*.test.ts", "src/__tests__/**/*.ts"],

    // Force explicit imports
    globals: false,
    browser: getBrowserConfig(process.env.BROWSER_CONFIG),
  },
});
