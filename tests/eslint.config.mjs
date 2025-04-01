import { defineConfig, globalIgnores } from "eslint/config";
import jsLint from "@eslint/js";
import react from "eslint-plugin-react";
import globals from "globals";

export default defineConfig([
  globalIgnores(["tests/performance/current.js", "tests/performance/previous.js"]),
  jsLint.configs.recommended,
  {
    plugins: {
      react,
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.commonjs,
        ...globals.mocha,
        ...globals.node,
        __DEV__: true,
        __LOGGER_LEVEL__: true,
        __FEATURES__: true,
      },

      ecmaVersion: 2020,
      sourceType: "module",

      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    rules: {
      "comma-dangle": [1, "only-multiline"],
      "no-cond-assign": 0,
      "no-console": 1,
      "no-constant-condition": 0,
      "no-control-regex": 0,
      "no-debugger": 2,
      "no-dupe-args": 2,
      "no-dupe-keys": 2,
      "no-duplicate-case": 1,
      "no-empty-character-class": 1,
      "no-empty": 0,
      "no-ex-assign": 1,
      "no-extra-boolean-cast": 1,
      "no-extra-parens": [1, "functions"],
      "no-extra-semi": 2,
      "no-func-assign": 2,
      "no-inner-declarations": 0,
      "no-invalid-regexp": 1,
      "no-irregular-whitespace": 1,
      "no-negated-in-lhs": 2,
      "no-obj-calls": 2,
      "no-regex-spaces": 1,
      "no-sparse-arrays": 2,
      // NOTE: eslint doesn't seem to allow the inclusion of Node.JS globals by
      // default.
      // I don't want to spend too much efforts on this nor include and maintain
      // another "globals" dependency just for this.
      "no-undef": 0,
      "no-unreachable": 2,
      "use-isnan": 2,
      "valid-jsdoc": 0,
      "valid-typeof": 2,
      "no-unexpected-multiline": 0,
      "no-trailing-spaces": 2,
      "no-multiple-empty-lines": 1,
      "no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "none",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      "accessor-pairs": [
        1,
        {
          setWithoutGet: true,
        },
      ],

      "block-scoped-var": 1,
      complexity: 0,
      curly: [1, "all"],
      "no-var": 1,
      "prefer-const": 1,
      "linebreak-style": [1, "unix"],
      semi: [1, "always"],
      "react/jsx-uses-vars": [2],
      "react/jsx-uses-react": [2],
    },
  },
]);
