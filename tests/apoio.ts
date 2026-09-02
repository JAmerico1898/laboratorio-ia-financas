/**
 * Apoio para os testes: respostas canônicas do fornecedor simulado.
 * Não é arquivo de teste — o vitest só coleta *.test.ts.
 */

import type { AnaliseAgente, CreditMemo, DossieEntrada, Papel, PlanoDeAnalise } from "@/lib/schema";
import { FornecedorSimulado } from "@/lib/fornecedores/simulado";

export const dossieDeTeste: DossieEntrada = {
  contraparte: { nome: "Contraparte de Teste S.A.", cnpj: "33.041.260/0652-90" },
  operacao: {
    valor_reais: 50_000_000,
    prazo_meses: 24,
    modalidade: "capital de giro",
    data_base: "2025-12-31",
  },
  documentos: [
    {
      titulo: "Balanço patrimonial consolidado",
      origem: "DFP 2025, p. 12",
      texto: "Ativo circulante 12.000,0 · Passivo circulante 11.000,0 [p. 12]",
    },
  ],
};

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

export function analiseDe(papel: Papel, score = 3.2): AnaliseAgente {
  const contrarian = papel === "contrarian";
  return {
    papel,
    modelo: contrarian ? "gpt-5.6-luna" : "claude-sonnet-5",
    fornecedor: contrarian ? "openai" : "anthropic",
    classificacao: "R4",
    score,
    sintese: `Síntese do papel ${papel}.`,
    evidencias: [evidencia(1), evidencia(2), evidencia(3)],
    riscos: [risco(1), risco(2), risco(3)],
    informacao_ausente: ["cronograma de amortização não consta das notas"],
    confianca: 0.7,
    ...(contrarian
      ? { divergencias: ["a análise setorial cita média de mercado sem dado no dossiê"] }
      : {}),
    verificacoes: { balanco_fecha: true, numeros_sem_origem: [], indicadores_invalidos: [] },
  };
}

export const planoDeTeste: PlanoDeAnalise = {
  lacunas: ["cronograma de amortização ausente"],
  perguntas_por_especialista: {
    financeiro: ["Qual a alavancagem ampla?", "O balanço fecha nos três exercícios?"],
    setorial: ["Como a sazonalidade afeta o giro?", "Há dado de pares no dossiê?"],
    juridico_regulatorio: ["Qual o grau de subordinação?", "Há ressalva do auditor?"],
  },
  divergencias_esperadas: ["risco sacado como dívida", "EBITDA ajustado da companhia"],
};

export function memoDe(comContrarian: boolean): CreditMemo {
  const analises = comContrarian
    ? [analiseDe("financeiro"), analiseDe("setorial"), analiseDe("juridico_regulatorio"), analiseDe("contrarian")]
    : [analiseDe("financeiro"), analiseDe("setorial"), analiseDe("juridico_regulatorio")];
  return {
    execucao_id: "exec-teste",
    contraparte: dossieDeTeste.contraparte,
    operacao: dossieDeTeste.operacao,
    recomendacao: "conceder_com_condicoes",
    classificacao: "R4",
    score_consolidado: 3.2,
    sintese: ["um 1", "dois 2", "três 3", "quatro 4", "cinco 5"],
    quadro_indicadores: [
      { indicador: "liquidez_corrente", v2025: 1.1, origem: "BP consolidado, exercício 2025" },
    ],
    leitura_do_negocio: "Parágrafo um. Parágrafo dois.",
    riscos: [risco(1)],
    condicoes_sugeridas: ["covenant de alavancagem ampla máxima de 4,0x"],
    informacao_ausente: [],
    divergencias: comContrarian
      ? [
          {
            tema: "tratamento do risco sacado",
            posicoes: [
              { papel: "financeiro", posicao: "dívida" },
              { papel: "contrarian", posicao: "dívida, e com prazo inflado" },
            ],
          },
        ]
      : [],
    contrarian_incluido: comContrarian,
    analises,
  };
}

/** Respostas canônicas: todo papel devolve JSON válido na primeira tentativa. */
export function respostasCanonicas(): Record<string, () => string> {
  return {
    planejamento: () => JSON.stringify(planoDeTeste),
    financeiro: () => JSON.stringify(analiseDe("financeiro", 3.0)),
    setorial: () => JSON.stringify(analiseDe("setorial", 3.3)),
    juridico_regulatorio: () => JSON.stringify(analiseDe("juridico_regulatorio", 3.3)),
    contrarian: () => JSON.stringify(analiseDe("contrarian", 2.8)),
    consolidacao_com: () => JSON.stringify(memoDe(true)),
    consolidacao_sem: () => JSON.stringify(memoDe(false)),
  };
}

export function adaptadoresSimulados(
  respostas: Record<string, (pedido: never, tentativa: number) => string> = respostasCanonicas() as never,
) {
  return {
    anthropic: new FornecedorSimulado({
      fornecedor: "anthropic",
      modelo: "claude-sonnet-5",
      esforco: "high",
      respostas: respostas as never,
    }),
    contrarian: new FornecedorSimulado({
      fornecedor: "openai",
      modelo: "gpt-5.6-luna",
      esforco: 0.7,
      respostas: respostas as never,
    }),
  };
}
