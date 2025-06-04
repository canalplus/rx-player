import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    watch: process.env.WATCH === "true",
    reporters: "dot",
    include: ["src/**/*.test.ts", "src/__tests__/**/*.ts"],
    environment: "jsdom",

    // Force explicit imports
    globals: false,
  },
});
