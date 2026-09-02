/**
 * Redator do memo — spec §10.1: "memo com contrarian e sem contrarian a partir do mesmo
 * conjunto de análises".
 */
import { describe, it, expect } from "vitest";
import { memoEmMarkdown } from "@/lib/memo-markdown";
import { memoDe } from "./apoio";

const comC = memoEmMarkdown(memoDe(true));
const semC = memoEmMarkdown(memoDe(false));

describe("ordem do modelo de credit memo do curso", () => {
  it("as nove seções aparecem na ordem fixa", () => {
    const secoes = [...comC.matchAll(/^## (\d)\. (.+)$/gm)].map((m) => m[2]);
    expect(secoes).toEqual([
      "Recomendação",
      "Síntese",
      "Quadro de indicadores",
      "Leitura do negócio",
      "Riscos",
      "Divergências",
      "Condições sugeridas",
      "Informação ausente",
      "Verificações",
    ]);
  });

  it("a recomendação vem primeiro, com a classificação e a leitura da faixa", () => {
    expect(comC).toMatch(/## 1\. Recomendação\n\*\*Conceder com condições — R4\*\* \(Risco moderado\)/);
  });

  it("a síntese traz exatamente cinco marcadores", () => {
    const bloco = comC.split("## 2. Síntese")[1].split("## 3.")[0];
    expect(bloco.trim().split("\n")).toHaveLength(5);
  });
});

describe("com e sem contrarian, a partir do mesmo conjunto", () => {
  it("a versão com contrarian traz a divergência; a sem traz a ausência dela", () => {
    expect(comC).toMatch(/tratamento do risco sacado/);
    expect(semC).toMatch(/Nenhuma divergência registrada\./);
  });

  it("as Verificações listam uma linha por análise — quatro contra três", () => {
    const linhas = (texto: string) =>
      texto.split("## 9. Verificações")[1].split("\n").filter((l) => l.startsWith("- **"));
    expect(linhas(comC)).toHaveLength(4);
    expect(linhas(semC)).toHaveLength(3);
  });

  it("o rodapé declara se a revisão contrarian entrou", () => {
    expect(comC).toMatch(/Revisão contrarian: incluída/);
    expect(semC).toMatch(/Revisão contrarian: não incluída/);
  });

  it("cada linha de Verificações nomeia o modelo que emitiu a análise", () => {
    expect(comC).toMatch(/\*\*contrarian\*\* \(gpt-5\.6-luna\)/);
    expect(comC).toMatch(/\*\*financeiro\*\* \(claude-sonnet-5\)/);
  });
});

describe("rastreabilidade", () => {
  it("toda linha de risco carrega a origem da evidência", () => {
    const tabela = comC.split("## 5. Riscos")[1].split("## 6.")[0];
    for (const linha of tabela.split("\n").filter((l) => l.startsWith("| risco"))) {
      expect(linha).toMatch(/conta [\d.]+, exercício \d{4}/);
    }
  });

  it("o quadro de indicadores traz a coluna de origem preenchida", () => {
    expect(comC).toMatch(/\| liquidez_corrente \|.*\| BP consolidado, exercício 2025 \|/);
  });
});
