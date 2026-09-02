/**
 * Custo por chamada e por execução (spec §9).
 *
 *   custo_usd = (tokens_entrada / 1e6) * preco_entrada + (tokens_saida / 1e6) * preco_saida
 */

import { PRECOS, CAMBIO_USD_BRL, type PrecoModelo } from "@/config/precos";

export interface ConsumoChamada {
  modelo: string;
  tokens_entrada: number;
  tokens_saida: number;
}

/** Preço de tabela do modelo. Modelo sem preço declarado é erro, não zero silencioso. */
export function precoDe(modelo: string): PrecoModelo {
  const preco = PRECOS[modelo];
  if (!preco) {
    throw new Error(
      `sem preço declarado para o modelo "${modelo}". Acrescente a linha em src/config/precos.ts, com a data da consulta.`,
    );
  }
  return preco;
}

export function custoChamadaUsd(consumo: ConsumoChamada): number {
  const preco = precoDe(consumo.modelo);
  return (
    (consumo.tokens_entrada / 1e6) * preco.entrada + (consumo.tokens_saida / 1e6) * preco.saida
  );
}

export function custoTotalUsd(chamadas: ConsumoChamada[]): number {
  return chamadas.reduce((total, c) => total + custoChamadaUsd(c), 0);
}

/** Equivalente em reais pela taxa fixa declarada em precos.ts. */
export function emReais(usd: number): number {
  return usd * CAMBIO_USD_BRL.taxa;
}

/** Formata em dólares com quatro casas: uma execução custa centavos, e centavos importam na aula. */
export function formatarUsd(usd: number): string {
  return `US$ ${usd.toFixed(4)}`;
}

export function formatarBrl(usd: number): string {
  return emReais(usd).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
