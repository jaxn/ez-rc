// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/dev-dist/**",
      "**/node_modules/**",
      "**/playwright-report/**",
      "e2e/.results/**",
      "**/*.config.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Client: browser globals + React hooks rules.
  {
    files: ["client/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: { globals: { ...globals.browser } },
    rules: { ...reactHooks.configs.recommended.rules },
  },

  // Server + shared: Node globals.
  {
    files: ["server/**/*.ts", "shared/**/*.ts"],
    languageOptions: { globals: { ...globals.node } },
  },

  // Tooling + e2e: run in Node, but page.evaluate bodies use browser globals.
  {
    files: ["e2e/**/*.ts", "playwright.config.ts", "vitest.workspace.ts"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },

  // Keep ESLint out of Prettier's lane.
  prettier,
);
