/**
 * Contrato de dados — spec §4 e §10.1.
 *
 * As regras de contrato que este arquivo protege: evidência com menos de três itens reprova,
 * risco fora de 3 a 6 reprova, e score fora de 1 a 5 reprova.
 */
import { describe, it, expect } from "vitest";
import { analiseAgenteSchema, creditMemoSchema, planoDeAnaliseSchema } from "@/lib/schema";

const evidencia = (n: number) => ({
  afirmacao: `afirmação ${n}`,
  origem: `BP consolidado, conta 1.0${n}, exercício 2025`,
  valor: 100 + n,
  exercicio: "2025",
});

const risco = (n: number) => ({
  descricao: `risco ${n}`,
  evidencia: evidencia(n),
  probabilidade: "media" as const,
  severidade: "alta" as const,
});

const analiseValida = {
  papel: "financeiro" as const,
  modelo: "claude-sonnet-5",
  fornecedor: "anthropic" as const,
  classificacao: "R4" as const,
  score: 3.2,
  sintese: "Alavancagem ampla elevada e cobertura de juros abaixo de 1,5x.",
  evidencias: [evidencia(1), evidencia(2), evidencia(3)],
  riscos: [risco(1), risco(2), risco(3)],
  informacao_ausente: ["cronograma de amortização não consta das notas"],
  confianca: 0.7,
  verificacoes: { balanco_fecha: true, numeros_sem_origem: [], indicadores_invalidos: [] },
};

describe("análise de agente", () => {
  it("aceita uma análise completa", () => {
    expect(analiseAgenteSchema.safeParse(analiseValida).success).toBe(true);
  });

  it("reprova com menos de três evidências — a regra 'cada número tem endereço'", () => {
    const r = analiseAgenteSchema.safeParse({
      ...analiseValida,
      evidencias: [evidencia(1), evidencia(2)],
    });
    expect(r.success).toBe(false);
  });

  it("reprova com menos de três ou mais de seis riscos", () => {
    expect(
      analiseAgenteSchema.safeParse({ ...analiseValida, riscos: [risco(1), risco(2)] }).success,
    ).toBe(false);
    expect(
      analiseAgenteSchema.safeParse({
        ...analiseValida,
        riscos: [1, 2, 3, 4, 5, 6, 7].map(risco),
      }).success,
    ).toBe(false);
  });

  it("reprova score fora de 1 a 5 e confiança fora de 0 a 1", () => {
    expect(analiseAgenteSchema.safeParse({ ...analiseValida, score: 5.4 }).success).toBe(false);
    expect(analiseAgenteSchema.safeParse({ ...analiseValida, score: 0.9 }).success).toBe(false);
    expect(analiseAgenteSchema.safeParse({ ...analiseValida, confianca: 1.2 }).success).toBe(
      false,
    );
  });

  it("reprova síntese acima de 600 caracteres", () => {
    expect(
      analiseAgenteSchema.safeParse({ ...analiseValida, sintese: "a".repeat(601) }).success,
    ).toBe(false);
  });

  it("reprova evidência sem origem", () => {
    const semOrigem = { ...evidencia(1), origem: "" };
    expect(
      analiseAgenteSchema.safeParse({
        ...analiseValida,
        evidencias: [semOrigem, evidencia(2), evidencia(3)],
      }).success,
    ).toBe(false);
  });

  it("exige o bloco de verificações mesmo quando está tudo certo", () => {
    const { verificacoes: _, ...semVerificacoes } = analiseValida;
    expect(analiseAgenteSchema.safeParse(semVerificacoes).success).toBe(false);
  });

  it("aceita balanco_fecha nulo, que é 'não foi possível verificar'", () => {
    expect(
      analiseAgenteSchema.safeParse({
        ...analiseValida,
        verificacoes: { ...analiseValida.verificacoes, balanco_fecha: null },
      }).success,
    ).toBe(true);
  });

  it("aceita divergencias apenas como campo opcional do contrarian", () => {
    expect(
      analiseAgenteSchema.safeParse({
        ...analiseValida,
        papel: "contrarian",
        fornecedor: "openai",
        modelo: "gpt-5.6-luna",
        divergencias: ["a análise setorial cita média de mercado sem dado no dossiê"],
      }).success,
    ).toBe(true);
  });

  it("reprova papel ou fornecedor fora do contrato", () => {
    expect(analiseAgenteSchema.safeParse({ ...analiseValida, papel: "tesouraria" }).success).toBe(
      false,
    );
    expect(
      analiseAgenteSchema.safeParse({ ...analiseValida, fornecedor: "google" }).success,
    ).toBe(false);
  });
});

describe("credit memo", () => {
  const memoValido = {
    execucao_id: "exec-1",
    contraparte: { nome: "Contraparte S.A.", cnpj: "33.041.260/0652-90" },
    operacao: {
      valor_reais: 50_000_000,
      prazo_meses: 24,
      modalidade: "capital de giro",
      data_base: "2026-09-02",
    },
    recomendacao: "conceder_com_condicoes" as const,
    classificacao: "R4" as const,
    score_consolidado: 3.2,
    sintese: ["um", "dois", "três", "quatro", "cinco"],
    quadro_indicadores: [
      { indicador: "liquidez_corrente", v2025: 1.1, origem: "BP consolidado, exercício 2025" },
    ],
    leitura_do_negocio: "Dois parágrafos.",
    riscos: [risco(1)],
    condicoes_sugeridas: ["covenant de alavancagem ampla máxima de 4,0x"],
    informacao_ausente: [],
    divergencias: [
      {
        tema: "tratamento do risco sacado",
        posicoes: [
          { papel: "financeiro" as const, posicao: "dívida" },
          { papel: "contrarian" as const, posicao: "dívida, e com prazo inflado" },
        ],
      },
    ],
    contrarian_incluido: true,
    analises: [analiseValida],
  };

  it("aceita um memo completo", () => {
    expect(creditMemoSchema.safeParse(memoValido).success).toBe(true);
  });

  it("exige exatamente cinco marcadores de síntese", () => {
    expect(
      creditMemoSchema.safeParse({ ...memoValido, sintese: ["um", "dois"] }).success,
    ).toBe(false);
  });

  it("aceita divergências vazias — a ausência também é informação", () => {
    expect(creditMemoSchema.safeParse({ ...memoValido, divergencias: [] }).success).toBe(true);
  });

  it("reprova prazo fracionário ou valor negativo", () => {
    expect(
      creditMemoSchema.safeParse({
        ...memoValido,
        operacao: { ...memoValido.operacao, prazo_meses: 24.5 },
      }).success,
    ).toBe(false);
    expect(
      creditMemoSchema.safeParse({
        ...memoValido,
        operacao: { ...memoValido.operacao, valor_reais: -1 },
      }).success,
    ).toBe(false);
  });
});

describe("plano de análise do supervisor", () => {
  const plano = {
    lacunas: ["cronograma de amortização ausente"],
    perguntas_por_especialista: {
      financeiro: ["p1", "p2"],
      setorial: ["p1", "p2", "p3"],
      juridico_regulatorio: ["p1", "p2", "p3", "p4"],
    },
    divergencias_esperadas: ["risco sacado como dívida", "EBITDA ajustado da companhia"],
  };

  it("aceita de duas a quatro perguntas por especialista", () => {
    expect(planoDeAnaliseSchema.safeParse(plano).success).toBe(true);
  });

  it("reprova com uma pergunta só ou com cinco", () => {
    expect(
      planoDeAnaliseSchema.safeParse({
        ...plano,
        perguntas_por_especialista: { ...plano.perguntas_por_especialista, financeiro: ["p1"] },
      }).success,
    ).toBe(false);
    expect(
      planoDeAnaliseSchema.safeParse({
        ...plano,
        perguntas_por_especialista: {
          ...plano.perguntas_por_especialista,
          setorial: ["1", "2", "3", "4", "5"],
        },
      }).success,
    ).toBe(false);
  });

  it("exige exatamente dois pontos de divergência esperada", () => {
    expect(
      planoDeAnaliseSchema.safeParse({ ...plano, divergencias_esperadas: ["um"] }).success,
    ).toBe(false);
  });
});
