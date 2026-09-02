import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de ponta a ponta com FORNECEDORES SIMULADOS (spec §10.3).
 *
 * Nenhum caso aqui gasta uma chamada de API: `FORNECEDORES_SIMULADOS=1` troca os adaptadores
 * por respostas canônicas válidas contra o contrato da §4.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run start -- --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      FORNECEDORES_SIMULADOS: "1",
      MODEL_SUPERVISOR: "claude-sonnet-5",
      MODEL_ESPECIALISTA: "claude-sonnet-5",
      MODEL_CONTRARIAN: "gpt-5.6-luna",
      LIMITE_EXECUCOES_POR_IP_HORA: "100",
    },
  },
});
