import js from "@eslint/js";
import globals from "globals";
import reactPluginRecommended from "eslint-plugin-react/configs/recommended.js";
import reactPluginJsxRuntime from "eslint-plugin-react/configs/jsx-runtime.js";
import prettierPluginRecommended from "eslint-plugin-prettier/recommended";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    ...reactPluginRecommended,
    ...reactPluginJsxRuntime,
    files: ["**/*.jsx"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      ...reactPluginRecommended.plugins,
      ...reactPluginJsxRuntime.plugins,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...reactPluginRecommended.rules,
      ...reactPluginJsxRuntime.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/prop-types": "off",
    },
  },
  prettierPluginRecommended,
];
