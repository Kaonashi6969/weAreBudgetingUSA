// @ts-check
const eslint = require("@eslint/js");
const { defineConfig } = require("eslint/config");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");
const html = require("@html-eslint/eslint-plugin");
const htmlParser = require("@html-eslint/parser");
const angularParser = require("@angular-eslint/template-parser");

module.exports = defineConfig([
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "app",
          style: "kebab-case",
        },
      ],
    },
  },
  {
    files: ["src/app/**/*.html"],
    languageOptions: {
      parser: angularParser,
    },
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
    ],
    rules: {},
  },
  {
    files: ["src/index.html"],
    languageOptions: {
      parser: htmlParser,
    },
    plugins: {
      "@html-eslint": html,
    },
    rules: {
      "@html-eslint/indent": ["error", 2],
      "@html-eslint/no-duplicate-attrs": "error",
      "@html-eslint/require-doctype": "off",
      "@html-eslint/require-li-container": "error",
      "@html-eslint/no-inline-styles": "warn",
    },
  },
]);

