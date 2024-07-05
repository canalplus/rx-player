module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: [
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "tsconfig.eslint.json",
    sourceType: "module",
  },
  plugins: ["eslint-plugin-import", "eslint-plugin-jsdoc", "ban", "@typescript-eslint"],
  rules: {
    "ban/ban": [
      2,
      {
        name: ["*", "finally"],
        message:
          'Promise.prototype.finally is forbidden due to poor support from older devices.\nNote that this linting rule just bans naively all "finally" method calls, if in this case it wasn\'t called on a Promise, you can safely ignore this error',
      },
    ],
    "@typescript-eslint/adjacent-overload-signatures": "error",
    "@typescript-eslint/array-type": [
      "error",
      {
        default: "array-simple",
      },
    ],
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-restricted-types": [
      "error",
      {
        types: {
          Object: {
            message: "Avoid using the `Object` type. Did you mean `object`?",
          },
          Function: {
            message:
              "Avoid using the `Function` type. Prefer a specific function type, like `() => void`.",
          },
          Boolean: {
            message: "Avoid using the `Boolean` type. Did you mean `boolean`?",
          },
          Number: {
            message: "Avoid using the `Number` type. Did you mean `number`?",
          },
          String: {
            message: "Avoid using the `String` type. Did you mean `string`?",
          },
          Symbol: {
            message: "Avoid using the `Symbol` type. Did you mean `symbol`?",
          },
          HTMLMediaElement: {
            message:
              "Avoid relying on `HTMLMediaElement` directly unless it is API-facing. Prefer our more restricted `IMediaElement` type",
          },
          MediaSource: {
            message:
              "Avoid relying on `MediaSource` directly unless it is API-facing. Prefer our more restricted `IMediaSource` type",
          },
          SourceBuffer: {
            message:
              "Avoid relying on `SourceBuffer` directly unless it is API-facing. Prefer our more restricted `ISourceBuffer` type",
          },
          SourceBufferList: {
            message:
              "Avoid relying on `SourceBufferList` directly unless it is API-facing. Prefer our more restricted `ISourceBufferList` type",
          },
          MediaKeySystemAccess: {
            message:
              "Avoid relying on `MediaKeySystemAccess` directly unless it is API-facing. Prefer our more restricted `IMediaKeySystemAccess` type",
          },
          MediaKeys: {
            message:
              "Avoid relying on `MediaKeys` directly unless it is API-facing. Prefer our more restricted `IMediaKeys` type",
          },
          MediaKeySession: {
            message:
              "Avoid relying on `MediaKeySession` directly unless it is API-facing. Prefer our more restricted `IMediaKeySession` type",
          },
        },
      },
    ],
    "@typescript-eslint/consistent-type-assertions": [
      "error",
      {
        assertionStyle: "as",
        objectLiteralTypeAssertions: "allow",
      },
    ],
    "@typescript-eslint/prefer-promise-reject-errors": "off",
    "@typescript-eslint/only-throw-error": "off",
    "@typescript-eslint/consistent-type-definitions": "error",
    "@typescript-eslint/dot-notation": "error",
    "@typescript-eslint/explicit-member-accessibility": [
      "off",
      {
        accessibility: "explicit",
      },
    ],
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/consistent-type-exports": "error",
    "@typescript-eslint/naming-convention": [
      "error",
      {
        selector: "property",
        format: ["camelCase", "UPPER_CASE", "PascalCase"],
        leadingUnderscore: "allow",
        trailingUnderscore: "allow",
        filter: {
          regex: "^(__esModule$)|(__priv_)",
          match: false,
        },
      },
      {
        selector: "method",
        format: ["camelCase"],
        leadingUnderscore: "allow",
        trailingUnderscore: "allow",
      },
      {
        selector: "variable",
        format: ["camelCase", "UPPER_CASE", "PascalCase"],
        leadingUnderscore: "allow",
        trailingUnderscore: "allow",
      },
      {
        selector: "parameter",
        format: ["camelCase"],
        leadingUnderscore: "allow",
        filter: {
          // you can expand this regex to add more allowed names
          regex: "^__priv_",
          match: false,
        },
      },

      {
        selector: "memberLike",
        modifiers: ["private"],
        format: ["camelCase"],
        leadingUnderscore: "require",
      },
      {
        selector: "enum",
        format: ["PascalCase", "UPPER_CASE"],
        leadingUnderscore: "allow",
      },
      {
        selector: "typeLike",
        format: ["PascalCase"],
        leadingUnderscore: "allow",
      },
    ],
    "@typescript-eslint/no-duplicate-type-constituents": [
      "error",
      {
        ignoreIntersections: false,
        // We sadly have to disable this one because there's many cases where
        // this is done on purpose
        ignoreUnions: true,
      },
    ],
    "@typescript-eslint/no-empty-function": "error",
    "@typescript-eslint/no-empty-interface": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-extraneous-class": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-for-in-array": "error",
    "@typescript-eslint/no-inferrable-types": "off",
    "@typescript-eslint/no-misused-new": "error",
    "@typescript-eslint/no-namespace": "error",
    "@typescript-eslint/no-non-null-assertion": "error",
    "@typescript-eslint/no-this-alias": "error",
    // Might be enabled in the future, for now this is too much work:
    "@typescript-eslint/no-unsafe-enum-comparison": ["off"],
    "@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
    "@typescript-eslint/no-unnecessary-qualifier": "error",
    "@typescript-eslint/no-unnecessary-type-arguments": "error",
    "@typescript-eslint/no-unnecessary-type-assertion": "error",
    "@typescript-eslint/no-unused-expressions": "error",
    "@typescript-eslint/no-use-before-define": "off",
    "@typescript-eslint/no-var-requires": "error",
    "@typescript-eslint/prefer-for-of": "off",
    "@typescript-eslint/prefer-function-type": "error",
    "@typescript-eslint/prefer-namespace-keyword": "error",
    "@typescript-eslint/prefer-readonly": "off",
    "@typescript-eslint/promise-function-async": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        args: "all",
        argsIgnorePattern: "^_",
        caughtErrors: "none",
        destructuredArrayIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/no-shadow": ["error"],
    "@typescript-eslint/restrict-plus-operands": "error",
    "@typescript-eslint/strict-boolean-expressions": "error",
    "@typescript-eslint/triple-slash-reference": [
      "error",
      {
        path: "always",
        types: "prefer-import",
        lib: "always",
      },
    ],
    "@typescript-eslint/unbound-method": "error",
    "@typescript-eslint/unified-signatures": "error",
    "arrow-body-style": "off",
    "arrow-parens": ["off", "always"],
    complexity: [
      "off",
      {
        max: 20,
      },
    ],
    "constructor-super": "error",
    curly: "error",
    "default-case": "off",
    eqeqeq: "error",
    "guard-for-in": "warn",
    "id-blacklist": "off",
    "id-match": "off",
    "import/no-default-export": "off",
    "import/no-deprecated": "error",
    "import/no-extraneous-dependencies": [
      "error",
      { devDependencies: ["**/*.test.ts", "**/__tests__/**"] },
    ],
    "import/no-internal-modules": "off",
    "import/order": [
      "error",
      {
        alphabetize: {
          order: "asc",
          caseInsensitive: true,
        },
      },
    ],
    "import/no-duplicates": "error",
    "jsdoc/check-alignment": "error",
    "jsdoc/no-types": "off",
    "max-classes-per-file": ["warn", 5],
    "max-lines": ["off", 300],
    "newline-per-chained-call": "off",
    "no-bitwise": "off",
    "no-caller": "error",
    "no-console": "error",
    "no-debugger": "error",
    "no-duplicate-case": "error",
    "no-empty": "error",
    "no-eval": "error",
    "no-fallthrough": "error",
    "no-invalid-this": "error",
    "no-magic-numbers": "off",
    "no-new-wrappers": "error",
    "no-nested-ternary": "error",
    "no-param-reassign": "error",
    "no-return-await": "error",
    "no-sequences": "error",
    // eslint has issues with enums, @typescript-eslint/no-shadow works better
    "no-shadow": "off",
    "no-sparse-arrays": "error",
    "no-template-curly-in-string": "error",
    "no-throw-literal": "error",
    "no-undef-init": "error",
    "no-unsafe-finally": "error",
    "no-unused-labels": "error",
    "no-var": "error",
    "no-void": "error",
    "object-shorthand": "error",
    "one-var": ["error", "never"],
    "prefer-const": "error",
    "prefer-spread": "error",
    "prefer-object-spread": "error",
    "prefer-template": "off",
    "no-restricted-properties": [
      "error",
      {
        object: "performance",
        property: "now",
        message:
          "Avoid using `performance.now` directly as timestamps may be different in the worker and the main thread and some platforms don't have it in a Worker environment. Please use the `getMonotonicTimeStamp` util instead.",
      },
      {
        object: "window",
        message:
          "`window` doesn't work in Node.JS and only works when JavaScript is running in the main thread. Please import `globalScope` instead.",
      },
      {
        object: "Object",
        property: "assign",
        message: "Not available in IE11, use `objectAssign` utils instead.",
      },
      {
        object: "Object",
        property: "values",
        message: "Not available in IE11, use `objectValues` utils instead.",
      },
      {
        property: "includes",
        message: "Not available in IE11, use another method such as `indexOf` instead.",
      },
      {
        property: "find",
        message: "Not available in IE11, use `arrayFind` utils instead.",
      },
      {
        property: "findIndex",
        message: "Not available in IE11, use `arrayFindIndex` utils instead.",
      },
      {
        property: "startsWith",
        message: "Not available in IE11, use `startsWith` utils instead.",
      },
      {
        property: "substr",
        message: "Please use `substring` instead.",
      },
    ],
    radix: "error",
    "spaced-comment": [
      "error",
      "always",
      {
        markers: ["/"],
      },
    ],
    "use-isnan": "error",
    "valid-typeof": "error",
    yoda: "error",
  },
};
