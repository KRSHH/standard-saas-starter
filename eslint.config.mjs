import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import drizzle from "eslint-plugin-drizzle";

const eslintConfig = defineConfig([
  // Next.js core-web-vitals + TypeScript presets (arrays to spread).
  ...nextVitals,
  ...nextTs,

  // Drizzle SQL-injection guards — scoped to schema/query files only so the
  // rule doesn't false-positive on Map.delete() / URLSearchParams.delete().
  {
    files: ["src/db/**/*.ts", "src/lib/payments/**/*.ts"],
    plugins: { drizzle },
    rules: {
      "drizzle/enforce-delete-with-where": "error",
      "drizzle/enforce-update-with-where": "error",
    },
  },

  // Project-wide rules.
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  // Looser rules for test files + scripts (CLIs talk via console).
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "e2e/**",
      "src/db/seed.ts",
      "scripts/**",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "no-console": "off",
    },
  },

  // Override default ignores.
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "drizzle/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
