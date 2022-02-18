module.exports = {
  "env": {
    "browser": true,
    "es6": true,
    "node": true
  },
  "extends": [
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "tsconfig.json",
    "sourceType": "module"
  },
  "plugins": [
    "eslint-plugin-import",
    "eslint-plugin-jsdoc",
    "@typescript-eslint",
    "@typescript-eslint/tslint"
  ],
  "rules": {
    "@typescript-eslint/adjacent-overload-signatures": "error",
    "@typescript-eslint/array-type": [
      "error",
      {
        "default": "array-simple"
      }
    ],
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/ban-types": [
      "error",
      {
        "types": {
          "Object": {
            "message": "Avoid using the `Object` type. Did you mean `object`?"
          },
          "Function": {
            "message": "Avoid using the `Function` type. Prefer a specific function type, like `() => void`."
          },
          "Boolean": {
            "message": "Avoid using the `Boolean` type. Did you mean `boolean`?"
          },
          "Number": {
            "message": "Avoid using the `Number` type. Did you mean `number`?"
          },
          "String": {
            "message": "Avoid using the `String` type. Did you mean `string`?"
          },
          "Symbol": {
            "message": "Avoid using the `Symbol` type. Did you mean `symbol`?"
          }
        }
      }
    ],
    "@typescript-eslint/consistent-type-assertions": [
      "error",
      {
        "assertionStyle": "as",
        "objectLiteralTypeAssertions": "allow",
      }
    ],
    "@typescript-eslint/consistent-type-definitions": "error",
    "@typescript-eslint/dot-notation": "error",
    "@typescript-eslint/explicit-member-accessibility": [
      "off",
      {
        "accessibility": "explicit"
      }
    ],
    "@typescript-eslint/member-delimiter-style": [
      "error",
      {
        "multiline": {
          "delimiter": "semi",
          "requireLast": true
        },
        "singleline": {
          "delimiter": "semi",
          "requireLast": false
        }
      }
    ],
    "@typescript-eslint/indent": [
      "warn",
      2,
      {
        "ArrayExpression": "first",
        "ObjectExpression": "first",
        "CallExpression": { arguments: "first" },
        "FunctionDeclaration": { "parameters": "first" },
        "FunctionExpression": { "parameters": "first" },
        "VariableDeclarator": "first",
        "SwitchCase": 1,
        "ignoreComments": true,
        "flatTernaryExpressions": true,
        "offsetTernaryExpressions": false,
        "ignoredNodes": [
          /* Does not seem to have ConditionalExpression: "first" */
          "ConditionalExpression",
          /* Again, no "first" for all of them */
          "TSTypeParameterInstantiation",
          "TSTypeAliasDeclaration *",
          "TSInterfaceDeclaration *",
          "TSUnionType *"
        ]
      }],
    "@typescript-eslint/naming-convention": [
      "error",
      {
        "selector": "property",
        "format": ["camelCase", "UPPER_CASE", "PascalCase"],
        "leadingUnderscore": "allow",
        "trailingUnderscore": "allow",
        "filter": {
          "regex": "^(__esModule$)|(__priv_)",
          "match": false
        }
      },
      {
        "selector": "method",
        "format": ["camelCase"],
        "leadingUnderscore": "allow",
        "trailingUnderscore": "allow",
      },
      {
        "selector": "variable",
        "format": ["camelCase", "UPPER_CASE", "PascalCase"],
        "leadingUnderscore": "allow",
        "trailingUnderscore": "allow",
      },
      {
        "selector": "parameter",
        "format": ["camelCase"],
        "leadingUnderscore": "allow",
        "filter": {
          // you can expand this regex to add more allowed names
          "regex": "^__priv_",
          "match": false
        }
      },

      {
        "selector": "memberLike",
        "modifiers": ["private"],
        "format": ["camelCase"],
        "leadingUnderscore": "require"
      },
      {
        "selector": "enum",
        "format": ["PascalCase", "UPPER_CASE"],
        "leadingUnderscore": "allow"
      },
      {
        "selector": "typeLike",
        "format": ["PascalCase"],
        "leadingUnderscore": "allow"
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
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }
    ],
    "@typescript-eslint/no-shadow": ["error"],
    "@typescript-eslint/quotes": [
      "error",
      "double"
    ],
    "@typescript-eslint/restrict-plus-operands": "error",
    "@typescript-eslint/semi": [
      "error",
      "always"
    ],
    "@typescript-eslint/strict-boolean-expressions": "error",
    "@typescript-eslint/triple-slash-reference": [
      "error",
      {
        "path": "always",
        "types": "prefer-import",
        "lib": "always"
      }
    ],
    "@typescript-eslint/unbound-method": "error",
    "@typescript-eslint/unified-signatures": "error",
    "arrow-body-style": "off",
    "arrow-parens": [
      "off",
      "always"
    ],
    // TODO?
    // "class-methods-use-this": "error",
    "comma-dangle": [
      "error",
      {
        "objects": "always-multiline",
        "arrays": "always-multiline",
        "imports": "always-multiline",
        "exports": "always-multiline",
        "functions": "never"
      }
    ],
    "complexity": [
      "off",
      {
        "max": 20
      }
    ],
    // TODO?
    // "consistent-return": "error",
    "constructor-super": "error",
    "curly": "error",
    "default-case": "off",
    "eol-last": "error",
    "eqeqeq": [
      "error",
      "smart"
    ],
    "guard-for-in": "warn",
    "id-blacklist": "off",
    "id-match": "off",
    "import/no-default-export": "off",
    "import/no-deprecated": "error",
    "import/no-extraneous-dependencies": [
      "error",
      {
        "devDependencies": false
      }
    ],
    "import/no-internal-modules": "off",
    "import/order": ["error", {
      "alphabetize": {
        "order": "asc",
        "caseInsensitive": true
      }
    }],
    "jsdoc/check-alignment": "error",
    "jsdoc/no-types": "off",
    "linebreak-style": [
      "error",
      "unix"
    ],
    "max-classes-per-file": [
      "warn",
      5
    ],
    "max-len": [
      "warn",
      {
        "code": 90
      }
    ],
    "max-lines": [
      "off",
      300
    ],
    "new-parens": "error",
    "newline-per-chained-call": "off",
    "no-bitwise": "off",
    "no-caller": "error",
    "no-console": "error",
    "no-debugger": "error",
    "no-duplicate-case": "error",
    "import/no-duplicates": "error",
    // replaced by `no-duplicates` which better handle type imports
    "no-duplicate-imports": "off",
    "no-empty": "error",
    "no-eval": "error",
    "no-fallthrough": "error",
    "no-invalid-this": "error",
    "no-magic-numbers": "off",
    "no-multiple-empty-lines": "error",
    "no-new-wrappers": "error",
    "no-param-reassign": "error",
    "no-return-await": "error",
    "no-sequences": "error",
    // eslint has issues with enums, @typescript-eslint/no-shadow works better
    "no-shadow": "off",
    "no-sparse-arrays": "error",
    "no-template-curly-in-string": "error",
    "no-throw-literal": "error",
    "no-trailing-spaces": "error",
    "no-undef-init": "error",
    "no-unsafe-finally": "error",
    "no-unused-labels": "error",
    "no-var": "error",
    "no-void": "error",
    "object-curly-spacing": ["error", "always"],
    "object-shorthand": "error",
    "one-var": [
      "error",
      "never"
    ],
    "prefer-const": "error",
    "prefer-spread": "error",
    "prefer-object-spread": "error",
    "prefer-template": "off",
    "no-restricted-properties": [
      "error",
      {
        "object": "Object",
        "property": "assign",
        "message": "Not available in IE11, use `objectAssign` utils instead.",
      },
      {
        "object": "Object",
        "property": "values",
        "message": "Not available in IE11, use `objectValues` utils instead.",
      },
      {
        "property": "includes",
        "message": "Not available in IE11, use another method such as `indexOf` instead.",
      },
      {
        "property": "find",
        "message": "Not available in IE11, use `arrayFind` utils instead.",
      },
      {
        "property": "findIndex",
        "message": "Not available in IE11, use `arrayFindIndex` utils instead.",
      },
      {
        "property": "startsWith",
        "message": "Not available in IE11, use `startsWith` utils instead.",
      },
      {
        "property": "substr",
        "message": "Please use `substring` instead.",
      },
      {
        "object": "Promise",
        "message": "Not available in IE11, use promise ponyfill instead",
      }
    ],
    "quote-props": [
      "error",
      "as-needed"
    ],
    "radix": "error",
    "space-in-parens": [
      "error",
      "never"
    ],
    "spaced-comment": [
      "error",
      "always",
      {
        "markers": [
          "/"
        ]
      }
    ],
    "use-isnan": "error",
    "valid-typeof": "error",
    "yoda": "error",
    "@typescript-eslint/tslint/config": [
      "error",
      {
        "rules": {
          "encoding": true,
          "import-spacing": true,
          "prefer-while": true,
          "return-undefined": true,
          "whitespace": [
            true,
            "check-branch",
            "check-decl",
            "check-operator",
            "check-module",
            "check-separator",
            "check-type",
            "check-typecast",
            "check-preblock"
          ]
        }
      }
    ]
  }
};
