/**
 * sync:curso — copia (ou confere) os três artefatos do curso para src/prompts/curso/ (spec §5.8).
 *
 * O repositório é público e autônomo: a cópia em src/prompts/curso/ É a fonte de verdade do
 * código. Este script é local, não é teste de CI — a Vercel e o GitHub Actions não enxergam
 * a pasta 03_Prompt_e_Skill/ do curso.
 *
 *   node scripts/sync-curso.mjs            confere e reporta divergência (código 1 se divergir)
 *   node scripts/sync-curso.mjs --escrever  regrava os módulos a partir dos originais
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const curso = resolve(raiz, "..", "03_Prompt_e_Skill");

const ARTEFATOS = [
  {
    origem: resolve(curso, "Prompt_Estruturado_Analise_Credito.md"),
    destino: resolve(raiz, "src/prompts/curso/prompt_aula1.ts"),
    constante: "PROMPT_AULA1",
    nota: "Prompt estruturado da Aula 1, verbatim.",
  },
  {
    origem: resolve(curso, "credit-analysis/references/metodologia.md"),
    destino: resolve(raiz, "src/prompts/curso/metodologia.ts"),
    constante: "METODOLOGIA",
    nota: "Metodologia da skill credit-analysis da Aula 3, verbatim.",
  },
  {
    origem: resolve(curso, "credit-analysis/references/modelo_credit_memo.md"),
    destino: resolve(raiz, "src/prompts/curso/modelo_credit_memo.ts"),
    constante: "MODELO_CREDIT_MEMO",
    nota: "Modelo de credit memo da Aula 3, verbatim.",
  },
];

/** Envolve o markdown em um módulo TS sem alterar um caractere do texto. */
function modulo({ constante, nota, texto }) {
  const cabecalho = [
    "/**",
    ` * ${nota}`,
    " *",
    " * GERADO POR scripts/sync-curso.mjs — NÃO EDITE À MÃO.",
    " * Edite o original no curso e rode `npm run sync:curso -- --escrever`.",
    " */",
    "",
  ].join("\n");
  const literal = JSON.stringify(texto);
  return `${cabecalho}export const ${constante}: string = ${literal};\n`;
}

/** Extrai de volta o texto embutido, para comparar sem depender do compilador. */
function textoDoModulo(fonte) {
  const m = fonte.match(/export const \w+: string = (".*");\n$/s);
  return m ? JSON.parse(m[1]) : null;
}

const escrever = process.argv.includes("--escrever");
let divergiu = false;

for (const a of ARTEFATOS) {
  if (!existsSync(a.origem)) {
    console.log(`· ${a.constante}: original não encontrado em ${a.origem}`);
    console.log("  (esperado quando o repositório está fora da pasta do curso — nada a conferir)");
    continue;
  }
  const texto = readFileSync(a.origem, "utf8");
  const esperado = modulo({ ...a, texto });

  if (escrever) {
    writeFileSync(a.destino, esperado);
    console.log(`✓ ${a.constante}: regravado`);
    continue;
  }

  const atual = existsSync(a.destino) ? readFileSync(a.destino, "utf8") : "";
  if (textoDoModulo(atual) === texto) {
    console.log(`✓ ${a.constante}: idêntico ao original do curso`);
  } else {
    divergiu = true;
    console.log(`✗ ${a.constante}: DIVERGE do original do curso`);
    console.log(`  original: ${a.origem}`);
    console.log(`  cópia:    ${a.destino}`);
  }
}

if (divergiu) {
  console.log("\nRode `npm run sync:curso -- --escrever` para atualizar a cópia do repositório.");
  process.exit(1);
}
