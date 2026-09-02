/**
 * Escala R1–R7 e consolidação de score — spec §10.1.
 *
 * As fronteiras exatas que o spec manda testar são 3,4/3,5 (R4 de R3) e 2,4/2,5 (R6 de R5).
 */
import { describe, it, expect } from "vitest";
import { classificar, recomendar, consolidarScore, arredondar1, FAIXAS } from "@/lib/escala";
import { classificacaoSchema } from "@/lib/schema";

describe("fronteiras exatas da §10.1", () => {
  it("3,4 é R4 e 3,5 é R3", () => {
    expect(classificar(3.4)).toBe("R4");
    expect(classificar(3.5)).toBe("R3");
  });

  it("2,4 é R6 e 2,5 é R5", () => {
    expect(classificar(2.4)).toBe("R6");
    expect(classificar(2.5)).toBe("R5");
  });
});

describe("a escala inteira da metodologia.md §7", () => {
  const casos: Array<[number, string]> = [
    [5.0, "R1"],
    [4.5, "R1"],
    [4.4, "R2"],
    [4.0, "R2"],
    [3.9, "R3"],
    [3.5, "R3"],
    [3.4, "R4"],
    [3.0, "R4"],
    [2.9, "R5"],
    [2.5, "R5"],
    [2.4, "R6"],
    [2.0, "R6"],
    [1.9, "R7"],
    [1.0, "R7"],
  ];

  for (const [score, esperado] of casos) {
    it(`score ${score.toFixed(1)} → ${esperado}`, () => {
      expect(classificar(score)).toBe(esperado);
    });
  }
});

describe("arredondamento para uma casa decimal", () => {
  it("3,45 sobe para 3,5 e portanto é R3", () => {
    expect(arredondar1(3.45)).toBe(3.5);
    expect(classificar(3.45)).toBe("R3");
  });

  it("3,44 fica em 3,4 e portanto é R4", () => {
    expect(classificar(3.44)).toBe("R4");
  });

  it("não sofre com a aritmética de ponto flutuante", () => {
    expect(arredondar1(0.1 + 0.2 + 3.2)).toBe(3.5);
    expect(classificar(1.15 + 1.35)).toBe("R5"); // 2,5
  });

  it("rejeita score não finito em vez de devolver R7 em silêncio", () => {
    expect(() => classificar(Number.NaN)).toThrow();
  });
});

describe("recomendação imposta pela escala", () => {
  it("R1 a R3 concedem", () => {
    for (const c of ["R1", "R2", "R3"] as const) expect(recomendar(c)).toBe("conceder");
  });

  it("R4 e R5 concedem com condições", () => {
    for (const c of ["R4", "R5"] as const)
      expect(recomendar(c)).toBe("conceder_com_condicoes");
  });

  it("R6 e R7 não concedem", () => {
    for (const c of ["R6", "R7"] as const) expect(recomendar(c)).toBe("nao_conceder");
  });
});

describe("consolidação de score (§5.3)", () => {
  it("sem contrarian, é a média dos três especialistas", () => {
    const r = consolidarScore([3.0, 3.6, 3.9]);
    expect(r.media).toBeCloseTo(3.5, 10);
    expect(r.ajuste).toBe(0);
    expect(r.score).toBeCloseTo(3.5, 10);
    expect(r.classificacao).toBe("R3");
  });

  it("o ajuste do contrarian derruba a faixa quando cruza a fronteira", () => {
    const r = consolidarScore([3.6, 3.6, 3.6], 0.2);
    expect(r.score).toBeCloseTo(3.4, 10);
    expect(r.classificacao).toBe("R4");
  });

  it("o ajuste é limitado a 0,5 ponto", () => {
    expect(() => consolidarScore([3.5, 3.5, 3.5], 0.6)).toThrow();
    expect(() => consolidarScore([3.5, 3.5, 3.5], -0.1)).toThrow();
  });

  it("o score nunca cai abaixo de 1,0, o piso da escala", () => {
    expect(consolidarScore([1.0, 1.0, 1.0], 0.5).score).toBe(1);
  });

  it("recusa consolidar sem nenhum especialista", () => {
    expect(() => consolidarScore([])).toThrow();
  });
});

describe("a escala e o contrato de dados não se separam", () => {
  it("o enum do schema tem exatamente as faixas de escala.ts", () => {
    expect(classificacaoSchema.options).toEqual(FAIXAS.map((f) => f.classificacao));
  });
});
