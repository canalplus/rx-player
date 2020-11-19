module.exports = {
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
    // Possible Errors <http://eslint.org/docs/rules/#possible-errors>
    // babel removes them for older browsers, we should do a codemod
    "comma-dangle": [1, "always-multiline"],
    // equivalent to jshint boss
    "no-cond-assign": 0,
    // equivalent to jshint devel
    "no-console": 1,
    // prohibits things like `while (true)`
    "no-constant-condition": 0,
    // we need to be able to match these
    "no-control-regex": 0,
    // equivalent to jshint debug
    "no-debugger": 2,
    // equivalent to jshint W004
    "no-dupe-args": 2,
    // syntax error in strict mode, almost certainly unintended in any case
    "no-dupe-keys": 2,
    // almost certainly a bug
    "no-duplicate-case": 1,
    // almost certainly a bug
    "no-empty-character-class": 1,
    // would warn on uncommented empty `catch (ex) {}` blocks
    "no-empty": 0,
    // can cause subtle bugs in IE 8, and we shouldn't do this anyways
    "no-ex-assign": 1,
    // we shouldn"t do this anyways
    "no-extra-boolean-cast": 1,
    // parens may be used to improve clarity, equivalent to jshint W068
    'no-extra-parens': [1, 'functions'],
    // equivalent to jshint W032
    'no-extra-semi': 2,
    // a function delaration shouldn't be rewritable
    'no-func-assign': 2,
    // babel and es6 allow block-scoped functions
    'no-inner-declarations': 0,
    // will cause a runtime error
    'no-invalid-regexp': 1,
    // disallow non-space or tab whitespace characters
    'no-irregular-whitespace': 1,
    // write `if (!(a in b))`, not `if (!a in b)`, equivalent to jshint W007
    'no-negated-in-lhs': 2,
    // will cause a runtime error
    'no-obj-calls': 2,
    // improves legibility
    'no-regex-spaces': 1,
    // equivalent to jshint elision
    'no-sparse-arrays': 2,
    // equivalent to jshint W027
    'no-unreachable': 2,
    // equivalent to jshint use-isnan
    'use-isnan': 2,
    // probably too noisy ATM
    'valid-jsdoc': 0,
    // equivalent to jshint notypeof
    'valid-typeof': 2,
    // we already require semicolons
    'no-unexpected-multiline': 0,
    'no-trailing-spaces': 2,
    'no-multiple-empty-lines': 1,

    // Best Practices <http://eslint.org/docs/rules/#best-practices>
    // probably a bug, we shouldn't actually even use this yet, because of IE8
    'accessor-pairs': [1, {setWithoutGet: true}],
    'block-scoped-var': 1,
    // cyclomatic complexity, we're too far gone
    'complexity': 0,
    // style guide: Always use brackets, even when optional.
    'curly': [1, 'all'],

    'no-case-declarations': 0,
    'no-var': 1,
    'prefer-const': 1,

    'max-len': [1, 80, 2,
      {
        'ignoreUrls': true,
        'ignoreStrings': true,
        'ignoreTemplateLiterals': true,
        'ignoreRegExpLiterals': true,
      }
    ],

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
