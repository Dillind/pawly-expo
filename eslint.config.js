// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const stylesheetPropertyPerLine = require('./eslint-rules/stylesheet-property-per-line');

module.exports = defineConfig([
  expoConfig,
  {
    plugins: { crumpet: { rules: { 'stylesheet-property-per-line': stylesheetPropertyPerLine } } },
    rules: {
      'crumpet/stylesheet-property-per-line': 'error'
    }
  },
  {
    ignores: ['dist/*', '.design/**']
  }
]);
