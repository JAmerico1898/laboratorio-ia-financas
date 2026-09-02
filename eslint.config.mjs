import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

export default [
  ...tseslint.configs.recommended,
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      // O AGENTS.md proíbe `any`: aqui isso é erro, não aviso.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // src/prompts/curso/ é gerado por scripts/sync-curso.mjs.
    ignores: [".next/", "node_modules/", "src/prompts/curso/", "playwright-report/", "test-results/"],
  },
];
