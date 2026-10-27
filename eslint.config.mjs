import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Allow a leading underscore to mark an intentionally-unused
      // parameter (e.g. an interface method a skeleton implementation
      // doesn't use yet).
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Historical/audit source material from the external RISE generation
    // pipeline (see data/question-bank/README.md) -- not application code,
    // not written to this repo's lint conventions, kept only as a
    // provenance record for research-data/'s own non-canonical copies.
    "research-data/**",
    "docs/perp_files/**",
  ]),
]);

export default eslintConfig;
