/* eslint-env node */

module.exports = {
  // to uncomment to display logs.
  // verbose: false,
  roots: ["<rootDir>/src"],
  preset: "ts-jest",
  testEnvironment: "jsdom",
  testMatch: ["**/?(*.)+(spec|test).[jt]s?(x)"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/index.ts",
    "!**/__tests__/**",
  ],
  globals: {
    "ts-jest": {
      tsconfig: {
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
        types: ["node", "jest"],
        module: "es2015",
        moduleResolution: "node",
        esModuleInterop: true,
        typeRoots: [
          "./src/typings",
          "./node_modules/@types",
        ],
      },
    },
    __FEATURES__: {
      IS_DISABLED: 0,
      IS_ENABLED: 1,

      BIF_PARSER: 1,
      DASH: 1,
      DIRECTFILE: 1,
      EME: 1,
      HTML_SAMI: 1,
      HTML_SRT: 1,
      HTML_TTML: 1,
      HTML_VTT: 1,
      LOCAL_MANIFEST: 1,
      METAPLAYLIST: 1,
      NATIVE_SAMI: 1,
      NATIVE_SRT: 1,
      NATIVE_TTML: 1,
      NATIVE_VTT: 1,
      SMOOTH: 1,
    },
    __ENVIRONMENT__: {
      PRODUCTION: 0,
      DEV: 1,
      CURRENT_ENV: 1,
    },
    __LOGGER_LEVEL__: {
      CURRENT_LEVEL: "\"NONE\"",
    },
  },
};
