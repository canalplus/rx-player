module.exports = {
  "root": true,
  "env": {
    "es6": true,
    "browser": true,
    "commonjs": true,
    "mocha": true
  },

  "globals": {
    "__DEV__": true,
    "__LOGGER_LEVEL__": true,
    "__FEATURES__": true
  },

  "plugins": [
    "react"
  ],

  "extends": "eslint:recommended",

  "parserOptions": {
    "ecmaVersion": 2017,
    "ecmaFeatures": {
      "jsx": true
    },
    "sourceType": "module"
  },

  "rules": {
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
    "accessor-pairs": [1, {setWithoutGet: true}],
    "block-scoped-var": 1,
    "complexity": 0,
    "curly": [1, "all"],
    "no-var": 1,
    "prefer-const": 1,
    "max-len": [1, 80, 2, {
      "ignoreUrls": true,
      "ignoreStrings": true,
      "ignoreTemplateLiterals": true,
      "ignoreRegExpLiterals": true,
    } ],
    "indent": [1, 2, {
      "ArrayExpression": "first",
      "ObjectExpression": "first",
      "CallExpression": { arguments: "first" },
      "SwitchCase": 1,
      "ignoreComments": true
    }],
    "quotes": [1, "double"],
    "linebreak-style": [1, "unix"],
    "semi": [1, "always"],
    "react/jsx-uses-vars": [2],
    "react/jsx-uses-react": [2]
  }
};
