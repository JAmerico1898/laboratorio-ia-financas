/**
 * Custo por chamada e total — spec §9 e §10.1.
 */
import { describe, it, expect } from "vitest";
import { custoChamadaUsd, custoTotalUsd, emReais, precoDe, formatarUsd } from "@/lib/custo";
import { PRECOS, CAMBIO_USD_BRL } from "@/config/precos";

describe("custo de uma chamada", () => {
  it("aplica a fórmula da §9 ao Sonnet 5", () => {
    // 1.000.000 de entrada × US$ 2,00 + 100.000 de saída × US$ 10,00 = 2,00 + 1,00
    const usd = custoChamadaUsd({
      modelo: "claude-sonnet-5",
      tokens_entrada: 1_000_000,
      tokens_saida: 100_000,
    });
    expect(usd).toBeCloseTo(3.0, 10);
  });

  it("aplica a fórmula ao contrarian, que é dez vezes mais barato por token", () => {
    const usd = custoChamadaUsd({
      modelo: "gpt-5.6-luna",
      tokens_entrada: 1_000_000,
      tokens_saida: 100_000,
    });
    expect(usd).toBeCloseTo(0.32, 10);
  });

  it("chamada sem tokens custa zero", () => {
    expect(
      custoChamadaUsd({ modelo: "claude-sonnet-5", tokens_entrada: 0, tokens_saida: 0 }),
    ).toBe(0);
  });

  it("modelo sem preço declarado é erro, não zero silencioso", () => {
    expect(() =>
      custoChamadaUsd({ modelo: "modelo-inexistente", tokens_entrada: 10, tokens_saida: 10 }),
    ).toThrow(/sem preço declarado/);
  });
});

describe("custo total da execução", () => {
  it("soma as sete chamadas de uma execução com contrarian", () => {
    const chamadas = [
      { modelo: "claude-sonnet-5", tokens_entrada: 20_000, tokens_saida: 2_000 },
      { modelo: "claude-sonnet-5", tokens_entrada: 30_000, tokens_saida: 4_000 },
      { modelo: "claude-sonnet-5", tokens_entrada: 30_000, tokens_saida: 4_000 },
      { modelo: "claude-sonnet-5", tokens_entrada: 30_000, tokens_saida: 4_000 },
      { modelo: "gpt-5.6-luna", tokens_entrada: 40_000, tokens_saida: 5_000 },
      { modelo: "claude-sonnet-5", tokens_entrada: 50_000, tokens_saida: 6_000 },
      { modelo: "claude-sonnet-5", tokens_entrada: 60_000, tokens_saida: 6_000 },
    ];
    // Claude: entrada 220.000 × 2/1e6 = 0,44 ; saída 26.000 × 10/1e6 = 0,26
    // Luna:   entrada  40.000 × 0,2/1e6 = 0,008 ; saída 5.000 × 1,2/1e6 = 0,006
    expect(custoTotalUsd(chamadas)).toBeCloseTo(0.44 + 0.26 + 0.008 + 0.006, 10);
  });

  it("execução sem chamadas custa zero", () => {
    expect(custoTotalUsd([])).toBe(0);
  });
});

describe("conversão para reais", () => {
  it("usa a taxa fixa declarada, não uma consulta em tempo de execução", () => {
    expect(emReais(1)).toBeCloseTo(CAMBIO_USD_BRL.taxa, 10);
  });
});

describe("preços declarados", () => {
  it("todo preço traz a data da consulta e a fonte", () => {
    for (const [modelo, preco] of Object.entries(PRECOS)) {
      expect(preco.consultado_em, modelo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(preco.fonte, modelo).toBeTruthy();
      expect(preco.entrada, modelo).toBeGreaterThan(0);
      expect(preco.saida, modelo).toBeGreaterThan(0);
    }
  });

  it("o câmbio também traz data e fonte", () => {
    expect(CAMBIO_USD_BRL.consultado_em).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(CAMBIO_USD_BRL.fonte).toBeTruthy();
  });

  it("precoDe recusa modelo desconhecido", () => {
    expect(() => precoDe("gpt-inexistente")).toThrow();
  });
});

describe("formatação", () => {
  it("mostra quatro casas, porque uma execução custa centavos", () => {
    expect(formatarUsd(0.0123)).toBe("US$ 0.0123");
  });
});
