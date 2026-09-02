// @vitest-environment jsdom
/**
 * Testes de componente — spec §10.2.
 *
 * Aqui o alvo é o comportamento da interface isolada do servidor: os cinco cartões e seus
 * estados, o JSON expansível e a trava da tela de decisão. O fluxo completo é exercitado nos
 * testes de ponta a ponta da §10.3.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PainelExecucao } from "@/components/painel-execucao";
import { PainelDecisao } from "@/components/painel-decisao";
import type { EstadoExecucao } from "@/lib/armazem";
import { analiseDe, dossieDeTeste, planoDeTeste } from "./apoio";

const estadoBase: EstadoExecucao = {
  execucao_id: "exec-1",
  estado: "executando",
  contrarian_habilitado: true,
  contraparte: dossieDeTeste.contraparte,
  operacao: dossieDeTeste.operacao,
  agentes: {
    supervisor: { estado: "concluido" },
    financeiro: { estado: "concluido" },
    setorial: { estado: "executando" },
    juridico_regulatorio: { estado: "erro", erro: "não valida contra o schema" },
    contrarian: { estado: "aguardando" },
  },
  plano: planoDeTeste,
  analises: [analiseDe("financeiro")],
  log: {
    execucao_id: "exec-1",
    iniciado_em: new Date().toISOString(),
    concluido_em: "",
    duracao_ms: 0,
    chamadas: [
      {
        papel: "financeiro",
        etapa: "financeiro",
        fornecedor: "anthropic",
        modelo: "claude-sonnet-5",
        esforco: "high",
        tokens_entrada: 1200,
        tokens_saida: 340,
        duracao_ms: 4100,
        custo_usd: 0.0058,
      },
    ],
    custo_total_usd: 0.0058,
    divergencias_detectadas: 0,
  },
};

/** O painel fala com o servidor por fetch e EventSource; ambos são substituídos aqui. */
function prepararRede(estado: EstadoExecucao | null, aoPost?: (corpo: unknown) => Response) {
  vi.stubGlobal(
    "EventSource",
    class {
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: (() => void) | null = null;
      close() {}
    },
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST" && aoPost) return aoPost(JSON.parse(String(init.body)));
      if (estado === null) return new Response("null", { status: 404 });
      return new Response(JSON.stringify(estado), { status: 200 });
    }),
  );
}

beforeEach(() => vi.restoreAllMocks());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("tela de execução (§6.2)", () => {
  it("renderiza os cinco cartões e reflete cada estado", async () => {
    prepararRede(estadoBase);
    render(<PainelExecucao execucaoId="exec-1" />);

    for (const rotulo of [
      "Supervisor",
      "Analista financeiro",
      "Analista setorial",
      "Analista jurídico-regulatório",
      "Revisor contrarian",
    ]) {
      expect(await screen.findByText(rotulo)).toBeDefined();
    }

    expect(screen.getAllByText("concluído").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("executando")).toBeDefined();
    expect(screen.getByText("erro")).toBeDefined();
    expect(screen.getByText("aguardando")).toBeDefined();
    expect(screen.getByText("não valida contra o schema")).toBeDefined();
  });

  it("sem contrarian habilitado, o cartão do contrarian não existe", async () => {
    const semContrarian = structuredClone(estadoBase);
    semContrarian.contrarian_habilitado = false;
    delete semContrarian.agentes.contrarian;
    prepararRede(semContrarian);

    render(<PainelExecucao execucaoId="exec-1" />);
    expect(await screen.findByText("Analista financeiro")).toBeDefined();
    expect(screen.queryByText("Revisor contrarian")).toBeNull();
  });

  it("o JSON da análise é expansível e mostra o conteúdo integral", async () => {
    prepararRede(estadoBase);
    render(<PainelExecucao execucaoId="exec-1" />);

    const botao = await screen.findByRole("button", { name: "ver JSON da análise" });
    expect(screen.queryByText(/"verificacoes"/)).toBeNull();

    await userEvent.click(botao);

    const bloco = await screen.findByText(/"verificacoes"/);
    // Integral: o JSON exibido tem de ser exatamente a análise recebida.
    expect(JSON.parse(bloco.textContent!)).toEqual(estadoBase.analises[0]);
    expect(screen.getByRole("button", { name: "esconder JSON" })).toBeDefined();
  });

  it("mostra o identificador de modelo e o fornecedor de cada agente", async () => {
    prepararRede(estadoBase);
    render(<PainelExecucao execucaoId="exec-1" />);
    expect((await screen.findAllByText("claude-sonnet-5")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("anthropic").length).toBeGreaterThan(0);
    expect(screen.getByText("openai")).toBeDefined();
  });
});

describe("tela de decisão (§6.4)", () => {
  const aguardando = { ...estadoBase, estado: "aguardando_decisao" as const };

  it("mostra a frase que é o requisito", async () => {
    prepararRede(aguardando);
    render(<PainelDecisao execucaoId="exec-1" />);
    expect(
      await screen.findByText("O aplicativo não concede crédito. A decisão registrada abaixo é sua."),
    ).toBeDefined();
  });

  it("não avança sem comentário em devolver", async () => {
    prepararRede(aguardando);
    render(<PainelDecisao execucaoId="exec-1" />);

    await userEvent.click(await screen.findByRole("button", { name: "Devolver com comentário" }));
    const registrar = screen.getByRole("button", { name: "Registrar decisão" });
    expect(registrar).toHaveProperty("disabled", true);

    await userEvent.type(screen.getByLabelText(/Justificativa/), "curto demais");
    expect(registrar).toHaveProperty("disabled", true);

    await userEvent.type(screen.getByLabelText(/Justificativa/), " para os vinte caracteres");
    await waitFor(() => expect(registrar).toHaveProperty("disabled", false));
  });

  it("não avança sem comentário em rejeitar", async () => {
    prepararRede(aguardando);
    render(<PainelDecisao execucaoId="exec-1" />);

    await userEvent.click(await screen.findByRole("button", { name: "Rejeitar" }));
    expect(screen.getByRole("button", { name: "Registrar decisão" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("aprovar não exige comentário", async () => {
    prepararRede(aguardando);
    render(<PainelDecisao execucaoId="exec-1" />);
    await screen.findByRole("button", { name: "Aprovar" });
    expect(screen.getByRole("button", { name: "Registrar decisão" })).toHaveProperty(
      "disabled",
      false,
    );
  });
});
