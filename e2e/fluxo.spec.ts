/**
 * Testes de ponta a ponta — spec §10.3. Fornecedores simulados; nenhuma chamada de API.
 */
import { test, expect, type Page } from "@playwright/test";

/** Dispara a execução pelo link do caso de demonstração e espera o memo ficar pronto. */
async function executarDemo(page: Page, comContrarian = true) {
  await page.goto("/");
  if (!comContrarian) {
    await page.getByRole("switch", { name: /Incluir revisão contrarian/ }).click();
  }
  await page.getByText("carregar o caso de demonstração").click();
  await page.waitForURL(/\/analise\/[0-9a-f-]+$/);
  await expect(page.getByRole("link", { name: "Ver o credit memo" })).toBeVisible({
    timeout: 60_000,
  });
  return page.url().split("/").pop()!;
}

test("1. caminho feliz: demo → memo → aprovar → log", async ({ page }) => {
  const id = await executarDemo(page);

  // A tela de execução mostra os cinco cartões e o JSON de cada agente.
  await expect(page.getByText("Analista financeiro")).toBeVisible();
  await expect(page.getByText("Analista setorial")).toBeVisible();
  await expect(page.getByText("Analista jurídico-regulatório")).toBeVisible();
  await expect(page.getByText("Revisor contrarian")).toBeVisible();
  await expect(page.getByRole("button", { name: "ver JSON da análise" }).first()).toBeVisible();

  // O log não é acessível antes da decisão (§13.5).
  await page.goto(`/analise/${id}/log`);
  await expect(page.getByText("O log ainda não está liberado")).toBeVisible();

  await page.goto(`/analise/${id}/memo`);
  await expect(page.getByText("Conceder com condições")).toBeVisible();
  await expect(page.getByText("Divergências", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Ir para a decisão" }).click();
  await expect(
    page.getByText("O aplicativo não concede crédito. A decisão registrada abaixo é sua."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Aprovar" }).click();
  await page.getByRole("button", { name: "Registrar decisão" }).click();
  await expect(page.getByText("Decisão registrada")).toBeVisible();

  await page.getByRole("link", { name: /Ver o log/ }).click();
  await expect(page.getByText("Log da execução")).toBeVisible();
  await expect(page.getByText("7 chamadas")).toBeVisible();
  await expect(page.getByRole("cell", { name: "consolidação (com contrarian)" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "consolidação (sem contrarian)" })).toBeVisible();
});

test("2. sem contrarian: o memo não traz objeções e o log traz cinco chamadas", async ({ page }) => {
  const id = await executarDemo(page, false);

  await expect(page.getByText("Revisor contrarian")).toHaveCount(0);

  await page.goto(`/analise/${id}/memo`);
  await expect(page.getByText("Nenhuma divergência registrada")).toBeVisible();
  // Sem as duas versões, o interruptor não aparece.
  await expect(page.getByRole("switch", { name: /Exibir o memo com a revisão/ })).toHaveCount(0);

  await page.goto(`/analise/${id}/decisao`);
  await page.getByRole("button", { name: "Aprovar" }).click();
  await page.getByRole("button", { name: "Registrar decisão" }).click();
  await page.goto(`/analise/${id}/log`);
  await expect(page.getByText("5 chamadas")).toBeVisible();
  await expect(page.getByRole("cell", { name: "consolidação (com contrarian)" })).toHaveCount(0);
});

test("3. o interruptor do memo alterna sem nova chamada de API", async ({ page }) => {
  const id = await executarDemo(page);
  await page.goto(`/analise/${id}/memo`);

  const chamadasDeAnalise: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().includes("/api/analise")) chamadasDeAnalise.push(r.url());
  });

  await expect(page.getByText("Conceder com condições — R5")).toBeVisible();
  await page.getByRole("switch", { name: /Exibir o memo com a revisão/ }).click();
  await expect(page.getByText("Conceder com condições — R4")).toBeVisible();
  await expect(page.getByText("Nenhuma divergência registrada")).toBeVisible();

  expect(chamadasDeAnalise).toEqual([]);
});

test("4. recarregar no meio da execução reconstrói o estado", async ({ page }) => {
  await page.goto("/");
  await page.getByText("carregar o caso de demonstração").click();
  await page.waitForURL(/\/analise\/[0-9a-f-]+$/);

  // Recarrega enquanto ainda há agente executando.
  await expect(page.getByText("executando").first()).toBeVisible({ timeout: 15_000 });
  await page.reload();

  await expect(page.getByText("GRUPO CASAS BAHIA S.A.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver o credit memo" })).toBeVisible({
    timeout: 60_000,
  });
});

test("5. a decisão não avança sem justificativa em devolver e rejeitar", async ({ page }) => {
  const id = await executarDemo(page);
  await page.goto(`/analise/${id}/decisao`);

  await page.getByRole("button", { name: "Devolver com comentário" }).click();
  await expect(page.getByRole("button", { name: "Registrar decisão" })).toBeDisabled();
  await page.locator("#comentario").fill("curto");
  await expect(page.getByRole("button", { name: "Registrar decisão" })).toBeDisabled();
  await page.locator("#comentario").fill("Faltou a abertura do saldo de risco sacado nas notas.");
  await expect(page.getByRole("button", { name: "Registrar decisão" })).toBeEnabled();

  await page.getByRole("button", { name: "Rejeitar" }).click();
  await page.locator("#comentario").fill("");
  await expect(page.getByRole("button", { name: "Registrar decisão" })).toBeDisabled();
});

test("6. o CNPJ inválido bloqueia o envio", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Contraparte").fill("Empresa de Teste S.A.");
  await page.getByLabel("CNPJ").fill("33041260065291");
  await expect(page.getByText("dígito verificador não confere")).toBeVisible();
  await expect(page.getByRole("button", { name: "Executar análise" })).toBeDisabled();
});

test("7. falha de um especialista: o memo sai com a ausência declarada e o log registra o erro", async ({
  page,
  request,
}) => {
  // Dispara direto pela API para poder pedir a falha simulada do analista setorial.
  const form = new FormData();
  form.set("demo", "true");
  form.set("incluir_contrarian", "true");
  form.set("simular_falha_em", "setorial");
  const r = await request.post("/api/analise", { multipart: form });
  expect(r.status()).toBe(202);
  const { execucao_id } = await r.json();

  await page.goto(`/analise/${execucao_id}`);
  await expect(page.getByRole("link", { name: "Ver o credit memo" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText("erro").first()).toBeVisible();

  await page.goto(`/analise/${execucao_id}/memo`);
  await expect(page.getByText(/A análise setorial falhou na validação do contrato/)).toBeVisible();

  await page.goto(`/analise/${execucao_id}/decisao`);
  await page.getByRole("button", { name: "Aprovar" }).click();
  await page.getByRole("button", { name: "Registrar decisão" }).click();
  await page.goto(`/analise/${execucao_id}/log`);
  // A execução continua com 7 linhas: a etapa que falhou é uma linha com erro, não uma linha a menos.
  await expect(page.getByText("7 chamadas")).toBeVisible();
  await expect(page.getByRole("row", { name: /setorial/ }).getByText("erro")).toBeVisible();
});
