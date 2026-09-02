/**
 * Teste de fidelidade visual — spec §10.5.
 *
 * Lê o `globals.css` e compara com a lista canônica da §2. Se alguém trocar uma cor,
 * uma fonte ou o raio base, este teste fica vermelho e o portão da §10.7 não abre.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { CORES_GRAFICO } from "@/config/graficos";

const css = readFileSync(path.resolve(__dirname, "../src/app/globals.css"), "utf8");

/** Extrai o valor de um custom property, na primeira ocorrência. */
function token(nome: string): string | undefined {
  const m = css.match(new RegExp(String.raw`^\s*${nome}:\s*([^;]+);`, "m"));
  return m?.[1].trim();
}

describe("tokens de cor da §2", () => {
  const canonicos: Record<string, string> = {
    "--color-primary": "#00314a",
    "--color-primary-container": "#134866",
    "--color-secondary": "#006b5f",
    "--color-secondary-container": "#8df5e4",
    "--color-error": "#ba1a1a",
    "--background": "#f8f9fa",
    "--card": "#ffffff",
    "--foreground": "#191c1d",
    "--muted-foreground": "#3f4945",
    "--border": "#e1e3e4",
    "--ring": "#00314a",
  };

  for (const [nome, valor] of Object.entries(canonicos)) {
    it(`${nome} = ${valor}`, () => {
      expect(token(nome)).toBe(valor);
    });
  }
});

describe("tipografia e raio da §2", () => {
  it("--font-heading aponta para Manrope", () => {
    expect(token("--font-heading")).toBe("var(--font-manrope)");
  });

  it("--font-sans aponta para Inter", () => {
    expect(token("--font-sans")).toBe("var(--font-inter)");
  });

  it("--radius base é 0.625rem", () => {
    expect(token("--radius")).toBe("0.625rem");
  });

  it("os --radius-* derivados do preset estão presentes", () => {
    for (const sufixo of ["sm", "md", "lg", "xl", "2xl", "3xl", "4xl"]) {
      expect(token(`--radius-${sufixo}`), `--radius-${sufixo}`).toBeDefined();
    }
  });
});

describe("preset copiado verbatim", () => {
  it("traz os tokens --sidebar-* que a §2 não lista", () => {
    for (const nome of [
      "--sidebar",
      "--sidebar-foreground",
      "--sidebar-primary",
      "--sidebar-border",
      "--sidebar-ring",
    ]) {
      expect(token(nome), nome).toBeDefined();
    }
  });

  it("traz o bloco .dark", () => {
    expect(css).toMatch(/^\.dark\s*\{/m);
  });

  it("tem 200 linhas, como o preset", () => {
    expect(css.trimEnd().split("\n").length).toBe(200);
  });
});

describe("paleta dos gráficos da §2", () => {
  it("tem os quatro valores canônicos", () => {
    expect(CORES_GRAFICO).toEqual({
      accent: "#006b5f",
      green: "#059669",
      red: "#dc2626",
      gold: "#d97706",
    });
  });
});
