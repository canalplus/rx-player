/* eslint-env node */

module.exports = {
  // to uncomment to display logs.
  // verbose: false,
  roots: ["<rootDir>/src"],
  preset: "ts-jest",
  testEnvironment: "jsdom",
  testMatch: ["**/?(*.)+(test).[jt]s"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/index.ts", "!**/__tests__/**"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.jest.json",
      },
    ],
  },
  globals: {
    __ENVIRONMENT__: {
      PRODUCTION: 0,
      DEV: 1,
      CURRENT_ENV: 1,
    },
    __LOGGER_LEVEL__: {
      CURRENT_LEVEL: '"NONE"',
    },
  },
};
