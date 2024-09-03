// vitest.config.mjs
import { defineConfig } from "file:///Users/fbouisset/Documents/rx-player/node_modules/vitest/dist/config.js";
import { promises as fs } from "fs";
function vitePluginArraybuffer() {
  return {
    name: "array-buffer-loader",
    async load(id) {
      if (id.endsWith("?arraybuffer")) {
        const filePath = id.replace(/\?arraybuffer$/, "");
        const fileBuffer = await fs.readFile(filePath);
        return {
          code: `export default new Uint8Array([${new Uint8Array(fileBuffer).join(",")}]).buffer`,
          map: { mappings: "" }
        };
      }
    }
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
                "--js-flags=--expose-gc"
              ]
            }
          }
        }
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
                "media.block-autoplay-until-in-foreground": false
              }
            }
          }
        }
      };
    default:
      return {
        enabled: false
      };
  }
}
var vitest_config_default = defineConfig({
  plugins: [vitePluginArraybuffer()],
  define: {
    // global variables
    __TEST_CONTENT_SERVER__: {
      URL: "127.0.0.1",
      PORT: 3e3
    },
    __ENVIRONMENT__: {
      PRODUCTION: 0,
      DEV: 1,
      CURRENT_ENV: 1
    },
    __LOGGER_LEVEL__: {
      CURRENT_LEVEL: '"NONE"'
    },
    __BROWSER_NAME__: JSON.stringify(process.env.BROWSER_CONFIG)
  },
  test: {
    watch: false,
    globals: false,
    reporters: "dot",
    include: ["tests/**/*.[jt]s?(x)"],
    exclude: ["tests/performance/**/*.[jt]s?(x)"],
    globalSetup: "tests/contents/server.mjs",
    browser: getBrowserConfig(process.env.BROWSER_CONFIG)
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy5tanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvZmJvdWlzc2V0L0RvY3VtZW50cy9yeC1wbGF5ZXJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9mYm91aXNzZXQvRG9jdW1lbnRzL3J4LXBsYXllci92aXRlc3QuY29uZmlnLm1qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvZmJvdWlzc2V0L0RvY3VtZW50cy9yeC1wbGF5ZXIvdml0ZXN0LmNvbmZpZy5tanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZXN0L2NvbmZpZ1wiO1xuaW1wb3J0IHsgcHJvbWlzZXMgYXMgZnMgfSBmcm9tIFwiZnNcIjtcblxuLy8gaHR0cHM6Ly9naXRodWIuY29tL3RhY2hpYmFuYS1zaGluL3ZpdGUtcGx1Z2luLWFycmF5YnVmZmVyL2Jsb2IvbWFpbi9zcmMvbWFpbi50c1xuZnVuY3Rpb24gdml0ZVBsdWdpbkFycmF5YnVmZmVyKCkge1xuICByZXR1cm4ge1xuICAgIG5hbWU6IFwiYXJyYXktYnVmZmVyLWxvYWRlclwiLFxuICAgIGFzeW5jIGxvYWQoaWQpIHtcbiAgICAgIGlmIChpZC5lbmRzV2l0aChcIj9hcnJheWJ1ZmZlclwiKSkge1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IGlkLnJlcGxhY2UoL1xcP2FycmF5YnVmZmVyJC8sIFwiXCIpO1xuICAgICAgICBjb25zdCBmaWxlQnVmZmVyID0gYXdhaXQgZnMucmVhZEZpbGUoZmlsZVBhdGgpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGNvZGU6IGBleHBvcnQgZGVmYXVsdCBuZXcgVWludDhBcnJheShbJHtuZXcgVWludDhBcnJheShmaWxlQnVmZmVyKS5qb2luKFwiLFwiKX1dKS5idWZmZXJgLFxuICAgICAgICAgIG1hcDogeyBtYXBwaW5nczogXCJcIiB9LFxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0sXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldEJyb3dzZXJDb25maWcoYnJvd3Nlcikge1xuICBzd2l0Y2ggKGJyb3dzZXIpIHtcbiAgICBjYXNlIFwiY2hyb21lXCI6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICBuYW1lOiBcImNocm9tZVwiLFxuICAgICAgICBwcm92aWRlcjogXCJ3ZWJkcml2ZXJpb1wiLFxuICAgICAgICBoZWFkbGVzczogdHJ1ZSxcbiAgICAgICAgcHJvdmlkZXJPcHRpb25zOiB7XG4gICAgICAgICAgY2FwYWJpbGl0aWVzOiB7XG4gICAgICAgICAgICBcImdvb2c6Y2hyb21lT3B0aW9uc1wiOiB7XG4gICAgICAgICAgICAgIGFyZ3M6IFtcbiAgICAgICAgICAgICAgICBcIi0tYXV0b3BsYXktcG9saWN5PW5vLXVzZXItZ2VzdHVyZS1yZXF1aXJlZFwiLFxuICAgICAgICAgICAgICAgIFwiLS1lbmFibGUtcHJlY2lzZS1tZW1vcnktaW5mb1wiLFxuICAgICAgICAgICAgICAgIFwiLS1qcy1mbGFncz0tLWV4cG9zZS1nY1wiLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfTtcblxuICAgIGNhc2UgXCJmaXJlZm94XCI6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICBuYW1lOiBcImZpcmVmb3hcIixcbiAgICAgICAgcHJvdmlkZXI6IFwid2ViZHJpdmVyaW9cIixcbiAgICAgICAgaGVhZGxlc3M6IHRydWUsXG4gICAgICAgIHByb3ZpZGVyT3B0aW9uczoge1xuICAgICAgICAgIGNhcGFiaWxpdGllczoge1xuICAgICAgICAgICAgXCJtb3o6ZmlyZWZveE9wdGlvbnNcIjoge1xuICAgICAgICAgICAgICBwcmVmczoge1xuICAgICAgICAgICAgICAgIFwibWVkaWEuYXV0b3BsYXkuZGVmYXVsdFwiOiAwLFxuICAgICAgICAgICAgICAgIFwibWVkaWEuYXV0b3BsYXkuZW5hYmxlZC51c2VyLWdlc3R1cmVzLW5lZWRlZFwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBcIm1lZGlhLmF1dG9wbGF5LmJsb2NrLXdlYmF1ZGlvXCI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIFwibWVkaWEuYXV0b3BsYXkuYXNrLXBlcm1pc3Npb25cIjogZmFsc2UsXG4gICAgICAgICAgICAgICAgXCJtZWRpYS5hdXRvcGxheS5ibG9jay1ldmVudC5lbmFibGVkXCI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIFwibWVkaWEuYmxvY2stYXV0b3BsYXktdW50aWwtaW4tZm9yZWdyb3VuZFwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH07XG5cbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZW5hYmxlZDogZmFsc2UsXG4gICAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFt2aXRlUGx1Z2luQXJyYXlidWZmZXIoKV0sXG4gIGRlZmluZToge1xuICAgIC8vIGdsb2JhbCB2YXJpYWJsZXNcbiAgICBfX1RFU1RfQ09OVEVOVF9TRVJWRVJfXzoge1xuICAgICAgVVJMOiBcIjEyNy4wLjAuMVwiLFxuICAgICAgUE9SVDogMzAwMCxcbiAgICB9LFxuICAgIF9fRU5WSVJPTk1FTlRfXzoge1xuICAgICAgUFJPRFVDVElPTjogMCxcbiAgICAgIERFVjogMSxcbiAgICAgIENVUlJFTlRfRU5WOiAxLFxuICAgIH0sXG4gICAgX19MT0dHRVJfTEVWRUxfXzoge1xuICAgICAgQ1VSUkVOVF9MRVZFTDogJ1wiTk9ORVwiJyxcbiAgICB9LFxuICAgIF9fQlJPV1NFUl9OQU1FX186IEpTT04uc3RyaW5naWZ5KHByb2Nlc3MuZW52LkJST1dTRVJfQ09ORklHKSxcbiAgfSxcbiAgdGVzdDoge1xuICAgIHdhdGNoOiBmYWxzZSxcbiAgICBnbG9iYWxzOiBmYWxzZSxcbiAgICByZXBvcnRlcnM6IFwiZG90XCIsXG4gICAgaW5jbHVkZTogW1widGVzdHMvKiovKi5banRdcz8oeClcIl0sXG4gICAgZXhjbHVkZTogW1widGVzdHMvcGVyZm9ybWFuY2UvKiovKi5banRdcz8oeClcIl0sXG4gICAgZ2xvYmFsU2V0dXA6IFwidGVzdHMvY29udGVudHMvc2VydmVyLm1qc1wiLFxuICAgIGJyb3dzZXI6IGdldEJyb3dzZXJDb25maWcocHJvY2Vzcy5lbnYuQlJPV1NFUl9DT05GSUcpLFxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW9TLFNBQVMsb0JBQW9CO0FBQ2pVLFNBQVMsWUFBWSxVQUFVO0FBRy9CLFNBQVMsd0JBQXdCO0FBQy9CLFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLE1BQU0sS0FBSyxJQUFJO0FBQ2IsVUFBSSxHQUFHLFNBQVMsY0FBYyxHQUFHO0FBQy9CLGNBQU0sV0FBVyxHQUFHLFFBQVEsa0JBQWtCLEVBQUU7QUFDaEQsY0FBTSxhQUFhLE1BQU0sR0FBRyxTQUFTLFFBQVE7QUFDN0MsZUFBTztBQUFBLFVBQ0wsTUFBTSxrQ0FBa0MsSUFBSSxXQUFXLFVBQVUsRUFBRSxLQUFLLEdBQUcsQ0FBQztBQUFBLFVBQzVFLEtBQUssRUFBRSxVQUFVLEdBQUc7QUFBQSxRQUN0QjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGO0FBRUEsU0FBUyxpQkFBaUIsU0FBUztBQUNqQyxVQUFRLFNBQVM7QUFBQSxJQUNmLEtBQUs7QUFDSCxhQUFPO0FBQUEsUUFDTCxTQUFTO0FBQUEsUUFDVCxNQUFNO0FBQUEsUUFDTixVQUFVO0FBQUEsUUFDVixVQUFVO0FBQUEsUUFDVixpQkFBaUI7QUFBQSxVQUNmLGNBQWM7QUFBQSxZQUNaLHNCQUFzQjtBQUFBLGNBQ3BCLE1BQU07QUFBQSxnQkFDSjtBQUFBLGdCQUNBO0FBQUEsZ0JBQ0E7QUFBQSxjQUNGO0FBQUEsWUFDRjtBQUFBLFVBQ0Y7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBRUYsS0FBSztBQUNILGFBQU87QUFBQSxRQUNMLFNBQVM7QUFBQSxRQUNULE1BQU07QUFBQSxRQUNOLFVBQVU7QUFBQSxRQUNWLFVBQVU7QUFBQSxRQUNWLGlCQUFpQjtBQUFBLFVBQ2YsY0FBYztBQUFBLFlBQ1osc0JBQXNCO0FBQUEsY0FDcEIsT0FBTztBQUFBLGdCQUNMLDBCQUEwQjtBQUFBLGdCQUMxQiwrQ0FBK0M7QUFBQSxnQkFDL0MsaUNBQWlDO0FBQUEsZ0JBQ2pDLGlDQUFpQztBQUFBLGdCQUNqQyxzQ0FBc0M7QUFBQSxnQkFDdEMsNENBQTRDO0FBQUEsY0FDOUM7QUFBQSxZQUNGO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFFRjtBQUNFLGFBQU87QUFBQSxRQUNMLFNBQVM7QUFBQSxNQUNYO0FBQUEsRUFDSjtBQUNGO0FBRUEsSUFBTyx3QkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLHNCQUFzQixDQUFDO0FBQUEsRUFDakMsUUFBUTtBQUFBO0FBQUEsSUFFTix5QkFBeUI7QUFBQSxNQUN2QixLQUFLO0FBQUEsTUFDTCxNQUFNO0FBQUEsSUFDUjtBQUFBLElBQ0EsaUJBQWlCO0FBQUEsTUFDZixZQUFZO0FBQUEsTUFDWixLQUFLO0FBQUEsTUFDTCxhQUFhO0FBQUEsSUFDZjtBQUFBLElBQ0Esa0JBQWtCO0FBQUEsTUFDaEIsZUFBZTtBQUFBLElBQ2pCO0FBQUEsSUFDQSxrQkFBa0IsS0FBSyxVQUFVLFFBQVEsSUFBSSxjQUFjO0FBQUEsRUFDN0Q7QUFBQSxFQUNBLE1BQU07QUFBQSxJQUNKLE9BQU87QUFBQSxJQUNQLFNBQVM7QUFBQSxJQUNULFdBQVc7QUFBQSxJQUNYLFNBQVMsQ0FBQyxzQkFBc0I7QUFBQSxJQUNoQyxTQUFTLENBQUMsa0NBQWtDO0FBQUEsSUFDNUMsYUFBYTtBQUFBLElBQ2IsU0FBUyxpQkFBaUIsUUFBUSxJQUFJLGNBQWM7QUFBQSxFQUN0RDtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
