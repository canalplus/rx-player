import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
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
    reporters: "dot",
    include: ["./tests/parsers/**/*.test.js"],
    environment: "node",
    globals: false,
  },
});
