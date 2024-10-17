import { defineConfig } from "vitest/config";
import { promises as fs } from "fs";

// https://github.com/tachibana-shin/vite-plugin-arraybuffer/blob/main/src/main.ts
function vitePluginArraybuffer() {
  return {
    name: "array-buffer-loader",
    async load(id) {
      if (id.endsWith("?arraybuffer")) {
        const filePath = id.replace(/\?arraybuffer$/, "");
        const fileBuffer = await fs.readFile(filePath);
        return {
          code: `export default new Uint8Array([${new Uint8Array(fileBuffer).join(",")}]).buffer`,
          map: { mappings: "" },
        };
      }
    },
  };
}

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
  plugins: [vitePluginArraybuffer()],
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
    include: ["tests/**/*.[jt]s?(x)"],
    exclude: ["tests/performance/**/*.[jt]s?(x)"],
    globalSetup: "tests/contents/server.mjs",
    browser: getBrowserConfig(process.env.BROWSER_CONFIG),
  },
});
