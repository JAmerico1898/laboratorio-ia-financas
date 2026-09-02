/**
 * Validação de CNPJ — spec §10.1.
 */
import { describe, it, expect } from "vitest";
import { cnpjValido, formatarCnpj, apenasDigitos } from "@/lib/cnpj";

describe("CNPJ válido", () => {
  it("aceita o CNPJ da contraparte do caso de demonstração", () => {
    expect(cnpjValido("33.041.260/0652-90")).toBe(true);
  });

  it("aceita com e sem máscara", () => {
    expect(cnpjValido("33041260065290")).toBe(true);
    expect(cnpjValido("33.041.260/0652-90")).toBe(true);
  });
});

describe("CNPJ inválido", () => {
  it("rejeita dígito verificador errado", () => {
    expect(cnpjValido("33.041.260/0652-91")).toBe(false);
    expect(cnpjValido("33.041.260/0652-80")).toBe(false);
  });

  it("rejeita comprimento diferente de 14", () => {
    expect(cnpjValido("3304126006529")).toBe(false);
    expect(cnpjValido("330412600652900")).toBe(false);
    expect(cnpjValido("")).toBe(false);
  });

  it("rejeita sequências de dígito repetido, que passam no cálculo mas não são de ninguém", () => {
    expect(cnpjValido("00000000000000")).toBe(false);
    expect(cnpjValido("11111111111111")).toBe(false);
  });

  it("rejeita texto que não contém 14 dígitos", () => {
    expect(cnpjValido("não é um cnpj")).toBe(false);
  });
});

describe("máscara", () => {
  it("formata o CNPJ completo", () => {
    expect(formatarCnpj("33041260065290")).toBe("33.041.260/0652-90");
  });

  it("formata parcialmente enquanto a pessoa digita", () => {
    expect(formatarCnpj("33")).toBe("33");
    expect(formatarCnpj("33041")).toBe("33.041");
    expect(formatarCnpj("33041260")).toBe("33.041.260");
    expect(formatarCnpj("330412600652")).toBe("33.041.260/0652");
  });

  it("descarta dígito além do décimo quarto", () => {
    expect(formatarCnpj("330412600652909999")).toBe("33.041.260/0652-90");
  });

  it("apenasDigitos remove a pontuação", () => {
    expect(apenasDigitos("33.041.260/0652-90")).toBe("33041260065290");
  });
});
