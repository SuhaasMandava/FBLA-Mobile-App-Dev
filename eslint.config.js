// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Plain Node scripts run outside the app.
    files: ["scripts/**/*.js", "scripts/**/*.mjs"],
    languageOptions: { globals: { __dirname: "readonly", process: "readonly", console: "readonly" } },
  },
]);
