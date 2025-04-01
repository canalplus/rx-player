import { defineConfig } from "eslint/config";
import jsLint from "@eslint/js";
import tsLint from "typescript-eslint";
import react from "eslint-plugin-react";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([
  jsLint.configs.recommended,
  tsLint.configs.recommended,
  {
    plugins: {
      react,
    },

    languageOptions: {
      globals: {
        __DEV__: true,
        __LOGGER_LEVEL__: true,
        __FEATURES__: true,
      },

      parser: tsParser,
      ecmaVersion: 2017,
      sourceType: "module",

      parserOptions: {
        tsconfigRootDir: __dirname,
        project: "./tsconfig.json",

        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    rules: {
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
      "no-unreachable": 2,
      "use-isnan": 2,
      "valid-jsdoc": 0,
      "valid-typeof": 2,
      "no-unexpected-multiline": 0,
      "no-trailing-spaces": 2,
      "no-multiple-empty-lines": 1,

      "accessor-pairs": [
        1,
        {
          setWithoutGet: true,
        },
      ],

      "block-scoped-var": 1,
      complexity: 0,
      curly: [1, "all"],
      "no-case-declarations": 0,
      "no-var": 1,
      "prefer-const": 1,
      "linebreak-style": [1, "unix"],
      semi: [1, "always"],
      "react/jsx-uses-vars": [2],
      "react/jsx-uses-react": [2],
    },
  },
]);
