/**
 * Dossiê demo — spec §6.1 e decisão 4 da §15.
 *
 * O dossiê é curado: os três releases de 4T saíram, e com eles o EBITDA ajustado divulgado pela
 * companhia. O que este arquivo protege é que tudo o que a metodologia precisa continue
 * calculável a partir do que ficou.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { dossieEntradaSchema } from "@/lib/schema";
import { cnpjValido } from "@/lib/cnpj";
import { CONTAS_CVM } from "@/prompts/contas-cvm";

const dossie = dossieEntradaSchema.parse(
  JSON.parse(
    readFileSync(
      path.resolve(__dirname, "../public/demo/dossie-casas-bahia.json"),
      "utf8",
    ),
  ),
);

const textoDe = (trecho: string) =>
  dossie.documentos.find((d) => d.titulo.toLowerCase().includes(trecho))!.texto;

/** Lê "conta<TAB>descrição<TAB>exercício<TAB>valor" das tabelas padronizadas. */
function valor(texto: string, conta: string, exercicio: string): number {
  const linha = texto
    .split("\n")
    .find((l) => l.startsWith(`${conta}\t`) && l.includes(`\t${exercicio}\t`));
  if (!linha) throw new Error(`conta ${conta} não encontrada para ${exercicio}`);
  return Number(linha.split("\t")[3]);
}

describe("o dossiê demo é válido e curado", () => {
  it("valida contra o contrato de entrada", () => {
    expect(dossie.documentos.length).toBeGreaterThan(0);
    expect(cnpjValido(dossie.contraparte.cnpj)).toBe(true);
  });

  it("os três releases de 4T ficaram FORA", () => {
    const titulos = dossie.documentos.map((d) => d.titulo).join(" | ");
    expect(titulos).not.toMatch(/Release de resultado/i);
    expect(titulos).not.toMatch(/4T2[345]/);
  });

  it("os DFP de 5 MB não entram por extenso, só como referência de página", () => {
    const referencia = dossie.documentos.find((d) => d.titulo.includes("referência"))!;
    expect(referencia.texto.length).toBeLessThan(2000);
    expect(referencia.texto).toMatch(/NÃO\s+estão\s+transcritas/);
  });

  it("a planilha adulterada da Aula 2 não é embarcada", () => {
    const tudo = JSON.stringify(dossie);
    expect(tudo).not.toMatch(/com_erro/);
  });

  it("cabe no orçamento de contexto que o critério de 3 minutos exige", () => {
    const caracteres = dossie.documentos.reduce((t, d) => t + d.texto.length, 0);
    // Com os releases eram 387 mil caracteres, ≈207 mil tokens por agente, e 255 s de execução.
    expect(caracteres).toBeLessThan(150_000);
  });
});

describe("o EBITDA continua calculável sem os releases", () => {
  const dre = textoDe("resultado (consolidado)");
  const dfc = textoDe("fluxos de caixa");

  it("as duas contas da definição estão presentes nos três exercícios", () => {
    for (const exercicio of ["2023", "2024", "2025"]) {
      expect(valor(dre, "3.05", exercicio), `3.05/${exercicio}`).toBeTypeOf("number");
      expect(valor(dfc, "6.01.01.03", exercicio), `6.01.01.03/${exercicio}`).toBeTypeOf("number");
    }
  });

  it("EBITDA = 3.05 + 6.01.01.03 dá a série dos três exercícios", () => {
    const ebitda = (exercicio: string) =>
      valor(dre, "3.05", exercicio) + valor(dfc, "6.01.01.03", exercicio);
    expect(ebitda("2023")).toBeCloseTo(-22.0, 1);
    expect(ebitda("2024")).toBeCloseTo(1582.0, 1);
    expect(ebitda("2025")).toBeCloseTo(2380.0, 1);
  });

  it("a definição no prompt aponta exatamente essas duas contas", () => {
    expect(CONTAS_CVM).toContain("conta 3.05");
    expect(CONTAS_CVM).toContain("conta 6.01.01.03");
  });

  it("o prompt manda declarar ausente o EBITDA ajustado da companhia", () => {
    expect(CONTAS_CVM).toMatch(/EBITDA ajustado divulgado pela companhia NÃO está neste dossiê/);
    expect(CONTAS_CVM).toMatch(/informacao_ausente/);
  });
});

describe("os demais insumos da metodologia continuam no dossiê", () => {
  const bpa = textoDe("ativo");
  const bpp = textoDe("passivo");
  const dre = textoDe("resultado (consolidado)");
  const dfc = textoDe("fluxos de caixa");

  const insumos: Array<[string, string, string]> = [
    ["ativo circulante", bpa, "1.01"],
    ["caixa e equivalentes", bpa, "1.01.01"],
    ["passivo circulante", bpp, "2.01"],
    ["fornecedores", bpp, "2.01.02"],
    ["empréstimos de curto prazo", bpp, "2.01.04"],
    ["empréstimos de longo prazo", bpp, "2.02.01"],
    ["arrendamento de curto prazo", bpp, "2.01.05.02.09"],
    ["arrendamento de longo prazo", bpp, "2.02.02.02.06"],
    ["risco sacado a fornecedores", bpp, "2.01.05.02.07"],
    ["receita líquida", dre, "3.01"],
    ["despesas financeiras", dre, "3.06.02"],
    ["caixa das atividades operacionais", dfc, "6.01"],
    ["capex", dfc, "6.02.01"],
  ];

  for (const [nome, texto, conta] of insumos) {
    it(`${nome} (conta ${conta})`, () => {
      expect(valor(texto, conta, "2025")).toBeTypeOf("number");
    });
  }

  it("há dado de pares do varejo, para a análise setorial não inventar média de mercado", () => {
    expect(textoDe("pares").length).toBeGreaterThan(1000);
  });

  it("os sete fatos relevantes do evento de crédito continuam por extenso", () => {
    const fatos = dossie.documentos.filter((d) => d.titulo.startsWith("Fato relevante"));
    expect(fatos).toHaveLength(7);
    expect(fatos.map((f) => f.titulo).join(" ")).toMatch(/Homologacao Recuperacao Extrajudicial/);
  });
});

describe("o prompt exige o código da conta na origem", () => {
  it("diz que nomear a demonstração não basta", () => {
    expect(CONTAS_CVM).toMatch(/precisa conter o código da conta/);
    expect(CONTAS_CVM).toContain("DFP consolidada, DRE_con");
  });

  it("mostra a forma de citar um cálculo próprio", () => {
    expect(CONTAS_CVM).toMatch(/cálculo próprio: 3\.05 \(1\.343,0\) \+ 6\.01\.01\.03/);
  });
});
