/* eslint-env node */

const coverageIsWanted = !!process.env.RXP_COVERAGE;

module.exports = {
  // to uncomment to display logs.
  // verbose: false,
  roots: ["<rootDir>/src"],
  preset: "ts-jest",
  testEnvironment: "jsdom",
  testMatch: ["**/?(*.)+(spec|test).[jt]s?(x)"],
  collectCoverage: coverageIsWanted,
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/index.ts",
    "!**/__tests__/**",
  ],
  globals: {
    __DEV__: true,
    "ts-jest": {
      tsConfig: {
        target: "es2017",
        lib: ["es2017", "dom"],
        forceConsistentCasingInFileNames: true,
        skipLibCheck: false,
        noImplicitAny: true,
        strict: true,
        strictNullChecks: true,
        strictPropertyInitialization: true,
        noUnusedParameters: true,
        noUnusedLocals: true,
        types: ["rxjs", "node", "jest"],
        module: "es2015",
        moduleResolution: "node",
        esModuleInterop: true,
        typeRoots: [
          "./src/typings",
          "./node_modules/@types",
        ],
      },
    },
  },
};
