/**
 * Orquestrador — spec §10.1 ("contagem de chamadas: 7 com contrarian, 5 sem") e §3.1.
 */
import { describe, it, expect } from "vitest";
import { executarAnalise, type EventoExecucao } from "@/lib/orquestrador";
import { ArmazemEmMemoria } from "@/lib/armazem";
import { FornecedorSimulado } from "@/lib/fornecedores/simulado";
import {
  adaptadoresSimulados,
  dossieDeTeste,
  respostasCanonicas,
  analiseDe,
  memoDe,
} from "./apoio";

async function rodar(
  incluir_contrarian: boolean,
  respostas = respostasCanonicas() as never,
) {
  const armazem = new ArmazemEmMemoria();
  const eventos: EventoExecucao[] = [];
  const estado = await executarAnalise({
    execucao_id: "exec-teste",
    dossie: dossieDeTeste,
    incluir_contrarian,
    adaptadores: adaptadoresSimulados(respostas),
    armazem,
    aoEvento: (e) => eventos.push(e),
  });
  return { estado, eventos, armazem };
}

describe("contagem de chamadas (§10.1, §6.5)", () => {
  it("são 7 com o contrarian ligado", async () => {
    const { estado } = await rodar(true);
    expect(estado.log.chamadas).toHaveLength(7);
    expect(estado.log.chamadas.map((c) => c.etapa)).toEqual([
      "planejamento",
      "financeiro",
      "setorial",
      "juridico_regulatorio",
      "contrarian",
      "consolidação (sem contrarian)",
      "consolidação (com contrarian)",
    ]);
  });

  it("são 5 com o contrarian desligado", async () => {
    const { estado } = await rodar(false);
    expect(estado.log.chamadas).toHaveLength(5);
    expect(estado.log.chamadas.map((c) => c.etapa)).toEqual([
      "planejamento",
      "financeiro",
      "setorial",
      "juridico_regulatorio",
      "consolidação (sem contrarian)",
    ]);
  });

  it("as duas consolidações são linhas distintas e rotuladas", async () => {
    const { estado } = await rodar(true);
    const consolidacoes = estado.log.chamadas.filter((c) => c.etapa.startsWith("consolidação"));
    expect(consolidacoes).toHaveLength(2);
    expect(new Set(consolidacoes.map((c) => c.etapa)).size).toBe(2);
  });

  it("o reenvio único não vira linha nova de log", async () => {
    const respostas = {
      ...respostasCanonicas(),
      financeiro: (_p: unknown, tentativa: number) =>
        tentativa === 1 ? "não é json" : JSON.stringify(analiseDe("financeiro")),
    };
    const { estado } = await rodar(true, respostas as never);
    expect(estado.log.chamadas).toHaveLength(7);
    const fin = estado.log.chamadas.find((c) => c.etapa === "financeiro")!;
    expect(fin.erro).toBeUndefined();
  });
});

describe("fornecedores e esforço (§3.2)", () => {
  it("o contrarian roda em outro fornecedor, com temperatura; os Claude usam effort high", async () => {
    const { estado } = await rodar(true);
    const contrarian = estado.log.chamadas.find((c) => c.etapa === "contrarian")!;
    expect(contrarian.fornecedor).toBe("openai");
    expect(contrarian.modelo).toBe("gpt-5.6-luna");
    expect(contrarian.esforco).toBe(0.7);

    for (const c of estado.log.chamadas.filter((c) => c.etapa !== "contrarian")) {
      expect(c.fornecedor).toBe("anthropic");
      expect(c.modelo).toBe("claude-sonnet-5");
      expect(c.esforco).toBe("high");
    }
  });

  it("toda chamada registra tokens, tempo e custo", async () => {
    const { estado } = await rodar(true);
    for (const c of estado.log.chamadas) {
      expect(c.tokens_entrada).toBeGreaterThan(0);
      expect(c.tokens_saida).toBeGreaterThan(0);
      expect(c.custo_usd).toBeGreaterThan(0);
      expect(c.duracao_ms).toBeGreaterThanOrEqual(0);
    }
    expect(estado.log.custo_total_usd).toBeCloseTo(
      estado.log.chamadas.reduce((t, c) => t + c.custo_usd, 0),
      12,
    );
  });
});

describe("as duas versões do memo (§3.1 etapa 5, §6.3)", () => {
  it("com contrarian, as duas ficam prontas ao fim da execução", async () => {
    const { estado } = await rodar(true);
    expect(estado.memo_com_contrarian).toBeDefined();
    expect(estado.memo_sem_contrarian).toBeDefined();
    expect(estado.memo_com_contrarian!.contrarian_incluido).toBe(true);
    expect(estado.memo_sem_contrarian!.contrarian_incluido).toBe(false);
  });

  it("sem contrarian, só existe a versão sem — e nenhuma chamada extra é feita", async () => {
    const { estado } = await rodar(false);
    expect(estado.memo_sem_contrarian).toBeDefined();
    expect(estado.memo_com_contrarian).toBeUndefined();
  });

  it("as duas versões diferem no texto, não só no score", async () => {
    const { estado } = await rodar(true);
    expect(estado.memo_com_contrarian!.divergencias.length).toBeGreaterThan(0);
    expect(estado.memo_sem_contrarian!.divergencias).toHaveLength(0);
    expect(estado.memo_com_contrarian!.analises.length).toBe(
      estado.memo_sem_contrarian!.analises.length + 1,
    );
  });
});

describe("estado e eventos", () => {
  it("termina em aguardando_decisao — o app não conclui sozinho", async () => {
    const { estado } = await rodar(true);
    expect(estado.estado).toBe("aguardando_decisao");
    expect(estado.log.decisao_humana).toBeUndefined();
  });

  it("o contrarian só começa depois que os três especialistas terminam", async () => {
    const { eventos } = await rodar(true);
    const nomes = eventos.map((e) => `${e.tipo}:${"agente" in e ? e.agente : ""}`);
    const inicioContrarian = nomes.indexOf("agente_iniciou:contrarian");
    for (const papel of ["financeiro", "setorial", "juridico_regulatorio"]) {
      expect(nomes.indexOf(`agente_concluiu:${papel}`)).toBeLessThan(inicioContrarian);
    }
  });

  it("o estado é reconstruível a partir do armazém a qualquer momento", async () => {
    const { armazem } = await rodar(true);
    const lido = await armazem.ler("exec-teste");
    expect(lido).not.toBeNull();
    expect(lido!.log.chamadas).toHaveLength(7);
    expect(lido!.memo_com_contrarian).toBeDefined();
  });
});

describe("falha de um especialista (§10.3, caso 3)", () => {
  it("o memo é emitido com a ausência declarada e o log registra o erro", async () => {
    const respostas = {
      ...respostasCanonicas(),
      setorial: () => "o modelo devolveu prosa em vez de JSON",
      consolidacao_com: () =>
        JSON.stringify({
          ...memoDe(true),
          analises: [
            analiseDe("financeiro"),
            analiseDe("juridico_regulatorio"),
            analiseDe("contrarian"),
          ],
          informacao_ausente: ["a análise setorial falhou e não entrou nesta consolidação"],
        }),
    };
    const { estado } = await rodar(true, respostas as never);

    expect(estado.agentes.setorial.estado).toBe("erro");
    const linha = estado.log.chamadas.find((c) => c.etapa === "setorial")!;
    expect(linha.erro).toBeTruthy();
    expect(estado.log.chamadas).toHaveLength(7);
    expect(estado.memo_com_contrarian).toBeDefined();
    expect(estado.memo_com_contrarian!.informacao_ausente.join(" ")).toMatch(/setorial/);
    expect(estado.estado).toBe("aguardando_decisao");
  });
});

describe("esforço por papel (§3.2)", () => {
  it("o planejamento usa o adaptador próprio quando existe", async () => {
    const armazem = new ArmazemEmMemoria();
    const base = adaptadoresSimulados(respostasCanonicas() as never);
    const planejamento = new FornecedorSimulado({
      fornecedor: "anthropic",
      modelo: "claude-sonnet-5",
      esforco: "low",
      respostas: respostasCanonicas() as never,
    });

    const estado = await executarAnalise({
      execucao_id: "exec-esforco",
      dossie: dossieDeTeste,
      incluir_contrarian: true,
      adaptadores: { ...base, planejamento },
      armazem,
    });

    const linha = (etapa: string) => estado.log.chamadas.find((c) => c.etapa === etapa)!;
    expect(linha("planejamento").esforco).toBe("low");
    // Quem analisa continua no esforço de análise.
    expect(linha("financeiro").esforco).toBe("high");
    expect(linha("consolidação (com contrarian)").esforco).toBe("high");
  });

  it("sem adaptador de planejamento, tudo cai no adaptador Claude comum", async () => {
    const { estado } = await rodar(true);
    expect(estado.log.chamadas.find((c) => c.etapa === "planejamento")!.esforco).toBe("high");
  });
});
