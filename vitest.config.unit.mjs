import { defineConfig } from "vitest/config";

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
    watch: false,
    reporters: "dot",
    include: ["src/**/*.test.ts", "src/__tests__/**/*.ts"],
    environment: "jsdom",

    // Force explicit imports
    globals: false,
  },
});
