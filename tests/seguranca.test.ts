/**
 * Segurança — spec §10.6.
 *
 * "Um teste automatizado falha se qualquer arquivo em src/app ou src/components referenciar
 * uma chave" (§8.1). O mesmo teste é a base do hook de pre-commit da §12: CLAUDE.md é
 * instrução, hook é controle.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const raiz = path.resolve(__dirname, "..");

/** Nomes de segredo que jamais podem aparecer em código que vai para o navegador. */
export const SEGREDOS = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "KV_REST_API_TOKEN"];

function arquivosDe(dir: string, extensoes = [".ts", ".tsx"]): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const completo = path.join(dir, e.name);
    if (e.isDirectory()) return arquivosDe(completo, extensoes);
    return extensoes.some((x) => e.name.endsWith(x)) ? [completo] : [];
  });
}

/** Um arquivo é "de cliente" se traz a diretiva "use client". */
function ehCliente(conteudo: string): boolean {
  return /^\s*["']use client["']/m.test(conteudo);
}

const componentes = arquivosDe(path.join(raiz, "src", "components"));
const app = arquivosDe(path.join(raiz, "src", "app"));

describe("chaves nunca chegam ao cliente (§8.1)", () => {
  it("nenhum componente de cliente referencia uma chave", () => {
    const culpados: string[] = [];
    for (const arquivo of [...componentes, ...app]) {
      const conteudo = readFileSync(arquivo, "utf8");
      if (!ehCliente(conteudo)) continue;
      for (const segredo of SEGREDOS) {
        if (conteudo.includes(segredo)) culpados.push(`${path.relative(raiz, arquivo)}: ${segredo}`);
      }
    }
    expect(culpados).toEqual([]);
  });

  it("nenhum componente de cliente lê process.env", () => {
    const culpados: string[] = [];
    for (const arquivo of [...componentes, ...app]) {
      const conteudo = readFileSync(arquivo, "utf8");
      if (ehCliente(conteudo) && conteudo.includes("process.env")) {
        culpados.push(path.relative(raiz, arquivo));
      }
    }
    expect(culpados).toEqual([]);
  });

  it("nenhum componente de cliente importa um adaptador de fornecedor ou a config do servidor", () => {
    const proibidos = [
      "@/lib/fornecedores/anthropic",
      "@/lib/fornecedores/openai",
      "@/lib/config-servidor",
      "@anthropic-ai/sdk",
      "openai",
    ];
    const culpados: string[] = [];
    for (const arquivo of [...componentes, ...app]) {
      const conteudo = readFileSync(arquivo, "utf8");
      if (!ehCliente(conteudo)) continue;
      for (const p of proibidos) {
        if (conteudo.includes(`from "${p}"`)) {
          culpados.push(`${path.relative(raiz, arquivo)}: ${p}`);
        }
      }
    }
    expect(culpados).toEqual([]);
  });
});

describe("nenhuma variável sensível com prefixo NEXT_PUBLIC_ (§10.6)", () => {
  it("nem no código", () => {
    const culpados: string[] = [];
    for (const arquivo of arquivosDe(path.join(raiz, "src"))) {
      const conteudo = readFileSync(arquivo, "utf8");
      for (const m of conteudo.matchAll(/NEXT_PUBLIC_(\w+)/g)) {
        if (/KEY|TOKEN|SECRET|SENHA/i.test(m[1])) {
          culpados.push(`${path.relative(raiz, arquivo)}: ${m[0]}`);
        }
      }
    }
    expect(culpados).toEqual([]);
  });

  it("nem no .env.example", () => {
    const env = readFileSync(path.join(raiz, ".env.example"), "utf8");
    expect(env).not.toMatch(/NEXT_PUBLIC_\w*(KEY|TOKEN|SECRET)/i);
  });
});

describe("o .env.local não é versionado", () => {
  it("está no .gitignore", () => {
    const ignore = readFileSync(path.join(raiz, ".gitignore"), "utf8");
    expect(ignore).toMatch(/^\.env\.local$/m);
  });

  it("o .env.example não traz valor de chave preenchido", () => {
    const exemplo = readFileSync(path.join(raiz, ".env.example"), "utf8");
    // Compara o COMPRIMENTO, nunca o valor: uma falha aqui não pode imprimir o segredo que
    // ela acabou de encontrar.
    const preenchidas = SEGREDOS.filter((segredo) => {
      const linha = exemplo.match(new RegExp(`^${segredo}=(.*)$`, "m"));
      return linha ? linha[1].replace(/["']/g, "").trim().length > 0 : false;
    });
    expect(preenchidas, "chaves preenchidas em arquivo versionado").toEqual([]);
  });
});

describe("nenhuma rota devolve o conteúdo bruto dos arquivos enviados (§10.6)", () => {
  it("o armazém só guarda log, plano, análises e memos", () => {
    const armazem = readFileSync(path.join(raiz, "src", "lib", "armazem.ts"), "utf8");
    // O tipo EstadoExecucao é o que a rota GET devolve por inteiro.
    const campos = armazem.match(/export interface EstadoExecucao \{([\s\S]*?)\n\}/)![1];
    expect(campos).not.toMatch(/documentos|arquivos|texto_extraido|dossie/);
  });

  it("a rota de análise não guarda os bytes do arquivo em lugar nenhum", () => {
    const rota = readFileSync(path.join(raiz, "src", "app", "api", "analise", "route.ts"), "utf8");
    expect(rota).not.toMatch(/writeFile|createWriteStream|fs\.write/);
  });
});
