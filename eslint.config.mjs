import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import globals from "globals";
import tseslint from "typescript-eslint";

const eslintConfig = [
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  eslintConfigPrettier,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: ["tsconfig.json", "tsconfig.test.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // MCP SDK handlers receive untyped `arguments` — these rules produce
      // hundreds of false positives that add noise without improving safety.
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-explicit-any": "off",

      // Template literals with unknown/undefined are fine in error messages
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true, allowBoolean: true, allowNullish: true },
      ],

      // Allow void expressions in arrow shorthand (common pattern)
      "@typescript-eslint/no-confusing-void-expression": "off",

      // Allow non-null assertions — used intentionally after validation
      "@typescript-eslint/no-non-null-assertion": "off",

      // We use the low-level Server API intentionally (manual setRequestHandler);
      // McpServer is the high-level API, Server is correct for our advanced usage.
      "@typescript-eslint/no-deprecated": "off",
    },
  },
  {
    // Vendored agent-skill content (tracked but not part of the TS project) and
    // the test fixture project are not linted.
    ignores: [
      "node_modules/**",
      "build/**",
      "test/fixture/**",
      ".claude/**",
      ".agents/**",
    ],
  },
];

export default eslintConfig;
