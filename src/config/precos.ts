/**
 * Preços de tabela dos modelos (spec §9).
 *
 * Nunca leia preço de API em tempo de execução: o custo exibido na tela de log tem de ser
 * reproduzível meses depois. Cada linha carrega a data em que o preço foi consultado na
 * página oficial do fornecedor.
 */

export interface PrecoModelo {
  /** US$ por 1 milhão de tokens de entrada. */
  entrada: number;
  /** US$ por 1 milhão de tokens de saída. */
  saida: number;
  /** Data da consulta à página oficial, ISO 8601. */
  consultado_em: string;
  fonte: string;
}

export const PRECOS: Record<string, PrecoModelo> = {
  "claude-sonnet-5": {
    entrada: 2.0,
    saida: 10.0,
    consultado_em: "2026-09-02",
    fonte: "docs.claude.com/en/docs/about-claude/pricing",
  },
  "gpt-5.6-luna": {
    entrada: 0.2,
    saida: 1.2,
    consultado_em: "2026-09-02",
    fonte: "developers.openai.com/api/docs/pricing",
  },
};

/**
 * Câmbio fixo e declarado, com data. Câmbio estimado é melhor que câmbio invisível (§9).
 */
export const CAMBIO_USD_BRL = {
  taxa: 5.1007,
  consultado_em: "2026-09-02",
  fonte: "economia.awesomeapi.com.br/last/USD-BRL (cotação de compra)",
} as const;
