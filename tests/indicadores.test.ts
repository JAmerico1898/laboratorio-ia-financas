/**
 * Catálogo de indicadores e pesos do score — metodologia.md §6, regra do CLAUDE.md.
 */
import { describe, it, expect } from "vitest";
import {
  INDICADORES,
  PESOS_SCORE,
  scorePonderado,
  definicaoDe,
  indicadorConhecido,
  type DimensaoScore,
} from "@/lib/indicadores";
import { classificar } from "@/lib/escala";

describe("catálogo", () => {
  it("todo indicador tem nome, definição e a seção da metodologia de onde veio", () => {
    for (const [chave, def] of Object.entries(INDICADORES)) {
      expect(def.chave, chave).toBe(chave);
      expect(def.nome, chave).toBeTruthy();
      expect(def.definicao, chave).toBeTruthy();
      expect(def.secao, chave).toBeTruthy();
    }
  });

  it("cobre as cinco seções de indicador da metodologia", () => {
    const secoes = new Set(Object.values(INDICADORES).map((d) => d.secao));
    expect(secoes).toEqual(
      new Set([
        "1. Liquidez",
        "2. Ciclo de caixa",
        "3. Alavancagem",
        "4. Cobertura",
        "5. Rentabilidade e geração de caixa",
      ]),
    );
  });

  it("indicador sem definição não pode ser exibido", () => {
    expect(indicadorConhecido("liquidez_corrente")).toBe(true);
    expect(indicadorConhecido("indicador_inventado")).toBe(false);
    expect(() => definicaoDe("indicador_inventado")).toThrow(/não tem definição/);
  });
});

describe("pesos do score (metodologia.md §6)", () => {
  it("somam 1", () => {
    const soma = Object.values(PESOS_SCORE).reduce((a, b) => a + b, 0);
    expect(soma).toBeCloseTo(1, 10);
  });

  it("são os cinco da metodologia, com os valores publicados", () => {
    expect(PESOS_SCORE).toEqual({
      liquidez: 0.2,
      alavancagem: 0.25,
      cobertura: 0.25,
      geracao_de_caixa: 0.2,
      qualidade_da_informacao: 0.1,
    });
  });
});

describe("score ponderado", () => {
  const notas = (n: number): Record<DimensaoScore, number> => ({
    liquidez: n,
    alavancagem: n,
    cobertura: n,
    geracao_de_caixa: n,
    qualidade_da_informacao: n,
  });

  it("notas iguais devolvem a própria nota", () => {
    expect(scorePonderado(notas(3))).toBeCloseTo(3, 10);
    expect(scorePonderado(notas(5))).toBeCloseTo(5, 10);
  });

  it("pondera cada dimensão pelo seu peso", () => {
    const s = scorePonderado({
      liquidez: 2,
      alavancagem: 3,
      cobertura: 4,
      geracao_de_caixa: 3,
      qualidade_da_informacao: 5,
    });
    // 0,4 + 0,75 + 1,0 + 0,6 + 0,5
    expect(s).toBeCloseTo(3.25, 10);
    expect(classificar(s)).toBe("R4"); // 3,3 → R4
  });

  it("rejeita nota fora de 1 a 5", () => {
    expect(() => scorePonderado({ ...notas(3), liquidez: 0 })).toThrow();
    expect(() => scorePonderado({ ...notas(3), cobertura: 6 })).toThrow();
  });
});
