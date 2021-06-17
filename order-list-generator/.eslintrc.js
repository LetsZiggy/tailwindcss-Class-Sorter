"use strict"

module.exports = {
  "root": true,
  "parser": "@babel/eslint-parser",
  "parserOptions": {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  "plugins": [ "unicorn" ],
  "env": {
    es6: true,
    node: true,
  },
  "extends": [ "standard", "plugin:unicorn/recommended" ],
  "rules": {
    // ---EcmaScript--- //

    "no-inner-declarations": [ "error" ], // Overwrite StandardJS

    "no-unused-vars": [ "warn", { vars: "all", args: "none", ignoreRestSiblings: true }], // Overwrite StandardJS

    "array-bracket-spacing": [ "error", "always", { arraysInArrays: false, objectsInArrays: false }], // Overwrite StandardJS

    "brace-style": [ "error", "stroustrup", { allowSingleLine: true }], // Overwrite StandardJS

    "comma-dangle": [ "error", "always-multiline" ], // Overwrite StandardJS

    "indent": [ "error", 2, { SwitchCase: 1, VariableDeclarator: "first", outerIIFEBody: 1, MemberExpression: "off", FunctionDeclaration: { parameters: 1, body: 1 }, FunctionExpression: { parameters: 1, body: 1 }, CallExpression: { arguments: 1 }, ArrayExpression: 1, ObjectExpression: 1, ImportDeclaration: 1, flatTernaryExpressions: false, ignoreComments: false, ignoredNodes: [ "TemplateLiteral *" ] }], // Overwrite StandardJS

    "no-multiple-empty-lines": [ "error", { max: 3, maxEOF: 1, maxBOF: 1 }], // Overwrite StandardJS

    "one-var": [ "error", "never" ], // Overwrite StandardJS

    "operator-assignment": [ "error", "always" ], // Set

    "operator-linebreak": [ "error", "before" ], // Overwrite StandardJS

    "quote-props": [ "error", "consistent-as-needed", { keywords: true }], // Overwrite StandardJS

    "quotes": [ "error", "double", { avoidEscape: true, allowTemplateLiterals: true }], // Overwrite StandardJS

    "arrow-parens": [ "error", "always" ], // Set

    "template-curly-spacing": [ "error", "always" ], // Overwrite StandardJS

    "prefer-regex-literals": [ "off" ], // Set

    "no-useless-escape": [ "off" ], // Set

    // ---Unicorn--- //

    "unicorn/prefer-at": [ "error" ], // Set

    "unicorn/prefer-string-replace-all": [ "error" ], // Set

    "unicorn/prefer-top-level-await": [ "off" ], // Set

    "unicorn/prevent-abbreviations": [ "off" ], // Set

    "unicorn/no-array-reduce": [ "off" ], // Set

    "unicorn/no-array-for-each": [ "off" ], // Set

    "unicorn/prefer-object-from-entries": [ "off" ], // Set
  },
}
