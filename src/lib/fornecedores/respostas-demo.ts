/**
 * Respostas canônicas do modo simulado (`FORNECEDORES_SIMULADOS=1`).
 *
 * Existem para que os testes de ponta a ponta da §10.3 exercitem o app inteiro — telas, SSE,
 * armazém, log e custo — sem gastar uma chamada de API. Não são análise de crédito: são um
 * conjunto de dados válido contra o contrato da §4.
 */

import type { AnaliseAgente, CreditMemo, Papel, PlanoDeAnalise } from "@/lib/schema";
import type { PedidoModelo } from "@/lib/fornecedores/tipos";

const CONTRAPARTE = { nome: "GRUPO CASAS BAHIA S.A.", cnpj: "33.041.260/0652-90" };
const OPERACAO = {
  valor_reais: 50_000_000,
  prazo_meses: 24,
  modalidade: "capital de giro",
  data_base: "2025-12-31",
};

const ev = (afirmacao: string, origem: string, valor?: number, exercicio = "2025") => ({
  afirmacao,
  origem,
  ...(valor !== undefined ? { valor } : {}),
  exercicio,
});

const EVIDENCIAS = [
  ev("Ativo circulante de R$ 13.242,0 milhões", "BP consolidado, conta 1.01, exercício 2025", 13242),
  ev("Passivo circulante de R$ 12.108,0 milhões", "BP consolidado, conta 2.01, exercício 2025", 12108),
  ev("Caixa líquido das atividades operacionais", "DFC consolidada, conta 6.01, exercício 2025", 1804),
];

const RISCOS = [
  {
    descricao: "Concentração de vencimentos no primeiro ano após a reestruturação",
    evidencia: ev("Passivo circulante financeiro", "BP consolidado, conta 2.01.04, exercício 2025", 3900),
    probabilidade: "alta" as const,
    severidade: "alta" as const,
  },
  {
    descricao: "Dependência de risco sacado para financiar o giro",
    evidencia: ev("Fornecedores", "BP consolidado, conta 2.01.02, exercício 2025", 6100),
    probabilidade: "media" as const,
    severidade: "alta" as const,
  },
  {
    descricao: "Subordinação de credor quirografário novo aos termos da recuperação extrajudicial",
    evidencia: ev(
      "Homologação da recuperação extrajudicial em 21/06/2024",
      "Fato relevante 2024-06-19, p. 1",
      undefined,
      "2024",
    ),
    probabilidade: "media" as const,
    severidade: "alta" as const,
  },
];

function analise(papel: Papel, score: number, sintese: string): AnaliseAgente {
  const contrarian = papel === "contrarian";
  return {
    papel,
    modelo: contrarian ? "gpt-5.6-luna" : "claude-sonnet-5",
    fornecedor: contrarian ? "openai" : "anthropic",
    classificacao: score >= 3.5 ? "R3" : score >= 3.0 ? "R4" : score >= 2.5 ? "R5" : "R6",
    score,
    sintese,
    evidencias: EVIDENCIAS,
    riscos: RISCOS,
    informacao_ausente: [
      "O cronograma de amortização da dívida reestruturada não consta das contas padronizadas; sem ele, a cobertura do serviço da dívida não pôde ser calculada.",
    ],
    confianca: contrarian ? 0.6 : 0.7,
    ...(contrarian
      ? {
          divergencias: [
            "O analista setorial cita posição relativa aos pares sem apontar a conta de origem no dossiê de pares.",
            "Os três convergiram em liquidez corrente próxima de 1,1 sem discutir a composição do estoque.",
          ],
        }
      : {}),
    verificacoes: {
      balanco_fecha: true,
      numeros_sem_origem: [],
      indicadores_invalidos: contrarian ? [] : ["cobertura_servico_divida"],
    },
  };
}

const PLANO: PlanoDeAnalise = {
  lacunas: [
    "Cronograma de amortização da dívida reestruturada",
    "Separação do saldo de risco sacado dentro de fornecedores",
  ],
  perguntas_por_especialista: {
    financeiro: [
      "A alavancagem ampla, incluindo arrendamentos e risco sacado, cabe em 24 meses de operação?",
      "O balanço fecha nos três exercícios?",
    ],
    setorial: [
      "Como a sazonalidade do varejo afeta o capital de giro nos 24 meses da operação?",
      "Há dado de pares suficiente no dossiê para posicionar a companhia?",
    ],
    juridico_regulatorio: [
      "Qual o grau de subordinação de um credor quirografário novo após a recuperação extrajudicial?",
      "Há ressalva ou ênfase do auditor nos três exercícios?",
    ],
  },
  divergencias_esperadas: [
    "Se o risco sacado deve ou não ser tratado como dívida financeira",
    "Se o EBITDA ajustado divulgado pela companhia é comparável ao recalculado",
  ],
};

function memo(comContrarian: boolean): CreditMemo {
  const especialistas = [
    analise("financeiro", 3.0, "Liquidez corrente de 1,1x e cobertura de juros de 1,4x em 2025."),
    analise("setorial", 3.3, "Margem EBITDA de 8,2% contra 9,6% da mediana dos pares em 2025."),
    analise(
      "juridico_regulatorio",
      3.3,
      "Recuperação extrajudicial homologada em 21/06/2024 subordina crédito novo a R$ 4,7 bilhões reestruturados.",
    ),
  ];
  const contrarian = analise(
    "contrarian",
    2.8,
    "As três análises convergem em liquidez sem discutir a composição do estoque.",
  );

  return {
    execucao_id: "simulado",
    contraparte: CONTRAPARTE,
    operacao: OPERACAO,
    recomendacao: "conceder_com_condicoes",
    classificacao: comContrarian ? "R5" : "R4",
    score_consolidado: comContrarian ? 2.9 : 3.2,
    sintese: [
      "Liquidez corrente de 1,1x em 2025, contra 1,0x em 2024.",
      "Caixa operacional de R$ 1.804,0 milhões em 2025.",
      "Passivo financeiro quirografário reestruturado de cerca de R$ 4,7 bilhões desde 21/06/2024.",
      "Margem EBITDA de 8,2% em 2025.",
      "Cobertura de juros de 1,4x em 2025.",
    ],
    quadro_indicadores: [
      {
        indicador: "liquidez_corrente",
        v2023: 1.0,
        v2024: 1.0,
        v2025: 1.1,
        origem: "BP consolidado, contas 1.01 e 2.01",
      },
      {
        indicador: "margem_ebitda",
        v2023: 6.4,
        v2024: 7.5,
        v2025: 8.2,
        origem: "DRE consolidada, contas 3.01 e 3.05",
      },
      {
        indicador: "cobertura_juros",
        v2023: 0.9,
        v2024: 1.1,
        v2025: 1.4,
        origem: "DRE consolidada, contas 3.05 e 3.06",
      },
    ],
    leitura_do_negocio:
      "A operação consome caixa no giro: o estoque responde por parte relevante do ativo circulante de R$ 13.242,0 milhões de 2025, e o prazo de pagamento a fornecedores está inflado pelo risco sacado.\n\nA trajetória de 2023 a 2025 mostra recuperação de margem EBITDA de 6,4% para 8,2% e de cobertura de juros de 0,9x para 1,4x, com a inflexão em 2024, ano da homologação da recuperação extrajudicial.",
    riscos: RISCOS,
    condicoes_sugeridas: [
      "Covenant de alavancagem ampla máxima de 4,0x, apurado trimestralmente",
      "Amortização mensal, sem carência, em vez de bullet",
      "Cessão fiduciária de recebíveis performados de cartão",
      "Gatilho de revisão em caso de novo evento de reestruturação",
    ],
    informacao_ausente: [
      "O cronograma de amortização da dívida reestruturada não consta das contas padronizadas; sem ele, a cobertura do serviço da dívida não pôde ser calculada e a nota da dimensão cobertura foi atribuída apenas pela cobertura de juros.",
    ],
    divergencias: comContrarian
      ? [
          {
            tema: "Tratamento do risco sacado a fornecedores",
            posicoes: [
              { papel: "financeiro" as const, posicao: "Deve entrar na dívida ampla." },
              {
                papel: "contrarian" as const,
                posicao:
                  "Deve entrar na dívida ampla E o prazo médio de pagamento deve ser reportado sem ele, porque a nota não permite separar o saldo.",
              },
            ],
          },
        ]
      : [],
    contrarian_incluido: comContrarian,
    analises: comContrarian ? [...especialistas, contrarian] : especialistas,
  };
}

/**
 * @param falhar papel que deve devolver resposta inválida nas duas tentativas. Existe para o
 *   caso 3 da §10.3 (falha de um especialista) e só é alcançável no modo simulado.
 */
export function respostasDemo(
  falhar?: string,
): Record<string, (pedido: PedidoModelo, tentativa: number) => string> {
  const quebrado = () => "O modelo devolveu prosa em vez do JSON do contrato.";
  const base = {
    planejamento: () => JSON.stringify(PLANO),
    financeiro: () =>
      JSON.stringify(analise("financeiro", 3.0, "Liquidez corrente de 1,1x e cobertura de juros de 1,4x em 2025.")),
    setorial: () =>
      JSON.stringify(analise("setorial", 3.3, "Margem EBITDA de 8,2% contra 9,6% da mediana dos pares em 2025.")),
    juridico_regulatorio: () =>
      JSON.stringify(
        analise(
          "juridico_regulatorio",
          3.3,
          "Recuperação extrajudicial homologada em 21/06/2024 subordina crédito novo a R$ 4,7 bilhões reestruturados.",
        ),
      ),
    contrarian: () =>
      JSON.stringify(
        analise("contrarian", 2.8, "As três análises convergem em liquidez sem discutir a composição do estoque."),
      ),
    consolidacao_com: () => JSON.stringify(memo(true)),
    consolidacao_sem: () => JSON.stringify(memo(false)),
  };

  if (!falhar) return base;

  // O supervisor consolida sem a análise que faltou e declara a ausência no memo.
  const semOPapel = (m: CreditMemo): CreditMemo => ({
    ...m,
    analises: m.analises.filter((a) => a.papel !== falhar),
    informacao_ausente: [
      ...m.informacao_ausente,
      `A análise ${falhar} falhou na validação do contrato e não entrou nesta consolidação.`,
    ],
  });

  return {
    ...base,
    [falhar]: quebrado,
    consolidacao_com: () => JSON.stringify(semOPapel(memo(true))),
    consolidacao_sem: () => JSON.stringify(semOPapel(memo(false))),
  };
}
