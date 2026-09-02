/**
 * Catálogo de indicadores — a tradução em código da `metodologia.md` da Aula 3.
 *
 * Regra do CLAUDE.md: **nenhum indicador é exibido sem definição aqui**. Quando um indicador
 * tem mais de uma definição de mercado, a definição deste arquivo é a que vale; é o mesmo texto
 * que vai no prompt dos agentes, para que a tela e o modelo estejam falando do mesmo número.
 */

export type DimensaoScore =
  | "liquidez"
  | "alavancagem"
  | "cobertura"
  | "geracao_de_caixa"
  | "qualidade_da_informacao";

export interface DefinicaoIndicador {
  chave: string;
  nome: string;
  /** A fórmula em palavras, como está na metodologia. */
  definicao: string;
  /** Seção da metodologia.md de onde a definição vem. */
  secao: string;
  unidade: "indice" | "dias" | "reais_milhoes" | "percentual" | "vezes";
  observacao?: string;
}

export const INDICADORES: Record<string, DefinicaoIndicador> = {
  liquidez_corrente: {
    chave: "liquidez_corrente",
    nome: "Liquidez corrente",
    definicao: "Ativo circulante ÷ passivo circulante",
    secao: "1. Liquidez",
    unidade: "indice",
    observacao: "Em varejo, olhe a composição: estoque parado não paga dívida",
  },
  liquidez_seca: {
    chave: "liquidez_seca",
    nome: "Liquidez seca",
    definicao: "(Ativo circulante − estoques) ÷ passivo circulante",
    secao: "1. Liquidez",
    unidade: "indice",
    observacao:
      "Diferença grande em relação à corrente indica dependência de giro de estoque",
  },
  capital_circulante_liquido: {
    chave: "capital_circulante_liquido",
    nome: "Capital circulante líquido",
    definicao: "Ativo circulante − passivo circulante",
    secao: "1. Liquidez",
    unidade: "reais_milhoes",
    observacao: "Em valor, não em índice",
  },
  prazo_medio_estoques: {
    chave: "prazo_medio_estoques",
    nome: "Prazo médio de estoques",
    definicao: "(Estoque médio ÷ custo das mercadorias vendidas) × 365",
    secao: "2. Ciclo de caixa",
    unidade: "dias",
  },
  prazo_medio_recebimento: {
    chave: "prazo_medio_recebimento",
    nome: "Prazo médio de recebimento",
    definicao: "(Contas a receber médio ÷ receita líquida) × 365",
    secao: "2. Ciclo de caixa",
    unidade: "dias",
  },
  prazo_medio_pagamento: {
    chave: "prazo_medio_pagamento",
    nome: "Prazo médio de pagamento",
    definicao: "(Fornecedores médio ÷ custo das mercadorias vendidas) × 365",
    secao: "2. Ciclo de caixa",
    unidade: "dias",
    observacao:
      "Com risco sacado, o prazo está inflado: parte do saldo de fornecedores já foi paga por um banco. Reporte com e sem o saldo de risco sacado quando a nota explicativa permitir separar",
  },
  ciclo_conversao_caixa: {
    chave: "ciclo_conversao_caixa",
    nome: "Ciclo de conversão de caixa",
    definicao: "Prazo de estoques + prazo de recebimento − prazo de pagamento",
    secao: "2. Ciclo de caixa",
    unidade: "dias",
  },
  divida_bruta_ebitda: {
    chave: "divida_bruta_ebitda",
    nome: "Dívida bruta ÷ EBITDA",
    definicao: "Dívida bruta do exercício ÷ EBITDA do exercício",
    secao: "3. Alavancagem",
    unidade: "vezes",
    observacao: "Obrigatório reportar nas duas versões de dívida: restrita e ampla",
  },
  divida_liquida_ebitda: {
    chave: "divida_liquida_ebitda",
    nome: "Dívida líquida ÷ EBITDA",
    definicao: "(Dívida bruta − caixa e equivalentes) ÷ EBITDA",
    secao: "3. Alavancagem",
    unidade: "vezes",
    observacao:
      "Companhias de varejo divulgam dívida líquida abatendo recebíveis de cartão. Reporte a métrica da companhia e a sua, lado a lado, e diga qual é qual",
  },
  divida_patrimonio: {
    chave: "divida_patrimonio",
    nome: "Dívida ÷ patrimônio líquido",
    definicao: "Dívida bruta ÷ patrimônio líquido",
    secao: "3. Alavancagem",
    unidade: "vezes",
  },
  participacao_curto_prazo: {
    chave: "participacao_curto_prazo",
    nome: "Participação da dívida de curto prazo",
    definicao: "Dívida de curto prazo ÷ dívida total",
    secao: "3. Alavancagem",
    unidade: "percentual",
  },
  cobertura_juros: {
    chave: "cobertura_juros",
    nome: "Cobertura de juros",
    definicao: "EBITDA ÷ despesa financeira líquida do exercício",
    secao: "4. Cobertura",
    unidade: "vezes",
  },
  cobertura_servico_divida: {
    chave: "cobertura_servico_divida",
    nome: "Cobertura do serviço da dívida",
    definicao: "(EBITDA − capex) ÷ (amortizações + juros previstos para os 12 meses seguintes)",
    secao: "4. Cobertura",
    unidade: "vezes",
    observacao:
      "Depende do cronograma de amortização, que está em nota explicativa. Sem o cronograma, não estime: registre em informação ausente",
  },
  margem_bruta: {
    chave: "margem_bruta",
    nome: "Margem bruta",
    definicao: "Lucro bruto ÷ receita líquida",
    secao: "5. Rentabilidade e geração de caixa",
    unidade: "percentual",
  },
  margem_ebitda: {
    chave: "margem_ebitda",
    nome: "Margem EBITDA",
    definicao: "EBITDA ÷ receita líquida",
    secao: "5. Rentabilidade e geração de caixa",
    unidade: "percentual",
  },
  margem_liquida: {
    chave: "margem_liquida",
    nome: "Margem líquida",
    definicao: "Resultado líquido ÷ receita líquida",
    secao: "5. Rentabilidade e geração de caixa",
    unidade: "percentual",
  },
  retorno_capital_investido: {
    chave: "retorno_capital_investido",
    nome: "Retorno sobre o capital investido",
    definicao:
      "Resultado operacional após impostos ÷ (patrimônio líquido + dívida onerosa)",
    secao: "5. Rentabilidade e geração de caixa",
    unidade: "percentual",
  },
  fluxo_caixa_livre: {
    chave: "fluxo_caixa_livre",
    nome: "Fluxo de caixa livre",
    definicao: "Fluxo de caixa operacional − capex",
    secao: "5. Rentabilidade e geração de caixa",
    unidade: "reais_milhoes",
  },
  fco_divida_curto_prazo: {
    chave: "fco_divida_curto_prazo",
    nome: "Fluxo de caixa operacional ÷ dívida de curto prazo",
    definicao: "Fluxo de caixa operacional ÷ dívida de curto prazo",
    secao: "5. Rentabilidade e geração de caixa",
    unidade: "vezes",
  },
};

/** Existe definição para este indicador? É o que o CLAUDE.md exige antes de exibir qualquer número. */
export function indicadorConhecido(chave: string): boolean {
  return chave in INDICADORES;
}

export function definicaoDe(chave: string): DefinicaoIndicador {
  const def = INDICADORES[chave];
  if (!def) {
    throw new Error(
      `indicador "${chave}" não tem definição em src/lib/indicadores.ts e por isso não pode ser exibido.`,
    );
  }
  return def;
}

/**
 * Pesos do score por dimensão (metodologia.md §6). Somam 1.
 * Nota por dimensão de 1 a 5; score = Σ (nota × peso).
 */
export const PESOS_SCORE: Record<DimensaoScore, number> = {
  liquidez: 0.2,
  alavancagem: 0.25,
  cobertura: 0.25,
  geracao_de_caixa: 0.2,
  qualidade_da_informacao: 0.1,
};

/** Calcula o score ponderado a partir das cinco notas de dimensão, cada uma de 1 a 5. */
export function scorePonderado(notas: Record<DimensaoScore, number>): number {
  for (const [dimensao, nota] of Object.entries(notas)) {
    if (nota < 1 || nota > 5) {
      throw new Error(`nota de "${dimensao}" vai de 1 a 5; recebida: ${nota}`);
    }
  }
  return (Object.keys(PESOS_SCORE) as DimensaoScore[]).reduce(
    (total, d) => total + notas[d] * PESOS_SCORE[d],
    0,
  );
}
