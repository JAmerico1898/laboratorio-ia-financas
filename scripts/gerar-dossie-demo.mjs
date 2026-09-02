/**
 * Gera public/demo/dossie-casas-bahia.json a partir do dossiê da Aula 2 (spec §6.1, decisão 4).
 *
 * O dossiê demo é CURADO e PRÉ-EXTRAÍDO. Os três DFP_*.pdf (5 MB cada, centenas de páginas)
 * não entram como texto integral — só como referência de página nas evidências. Enviá-los
 * inteiros a cada agente ameaçaria o critério de 3 minutos e o teto de custo, sem acrescentar
 * nada que a planilha padronizada da CVM já não traga de forma estruturada.
 *
 * A planilha adulterada da Aula 2 (`..._com_erro.xlsx`) NÃO é embarcada: ela é assunto exclusivo
 * daquela aula (decisão 5).
 *
 *   node scripts/gerar-dossie-demo.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";
import { extractText, getDocumentProxy } from "unpdf";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const origem = resolve(raiz, "..", "02_Dossie_Caso", "dossie");
const destino = resolve(raiz, "public", "demo", "dossie-casas-bahia.json");

const CONTRAPARTE = { nome: "GRUPO CASAS BAHIA S.A.", cnpj: "33.041.260/0652-90" };
const OPERACAO = {
  valor_reais: 50_000_000,
  prazo_meses: 24,
  modalidade: "capital de giro",
  data_base: "2025-12-31",
};

/** As quatro demonstrações que o memo usa. DVA e DMPL ficam de fora: nenhum indicador as pede. */
const ABAS = {
  BPA_con: "Balanço patrimonial — ativo (consolidado)",
  BPP_con: "Balanço patrimonial — passivo (consolidado)",
  DRE_con: "Demonstração do resultado (consolidado)",
  DFC_MI_con: "Demonstração dos fluxos de caixa — método indireto (consolidado)",
};

/**
 * Cada arquivo DFP traz o exercício de referência (ÚLTIMO) e o anterior (PENÚLTIMO).
 * Ficamos só com ÚLTIMO de cada ano: 2023, 2024 e 2025, sem duplicar exercício.
 */
function tabelaDaAba(planilha, aba) {
  const linhas = XLSX.utils.sheet_to_json(planilha.Sheets[aba], { header: 1 });
  const cabecalho = linhas[0];
  const idx = (nome) => cabecalho.indexOf(nome);
  const i = {
    ordem: idx("ORDEM_EXERC"),
    fim: idx("DT_FIM_EXERC"),
    conta: idx("CD_CONTA"),
    descricao: idx("DS_CONTA"),
    valor: idx("VL_CONTA"),
    escala: idx("ESCALA_MOEDA"),
  };

  const vistos = new Set();
  const saida = [];
  for (const l of linhas.slice(1)) {
    if (l[i.ordem] !== "ÚLTIMO") continue;
    const exercicio = String(l[i.fim]).slice(0, 4);
    if (!["2023", "2024", "2025"].includes(exercicio)) continue;
    const chave = `${exercicio}|${l[i.conta]}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    // A CVM publica em MIL reais; o curso trabalha em R$ milhões, uma casa decimal.
    const milhoes = l[i.escala] === "MIL" ? Number(l[i.valor]) / 1000 : Number(l[i.valor]);
    saida.push({ exercicio, conta: String(l[i.conta]), descricao: String(l[i.descricao]), milhoes });
  }
  saida.sort((a, b) => a.conta.localeCompare(b.conta) || a.exercicio.localeCompare(b.exercicio));
  return saida;
}

function comoTexto(titulo, linhas) {
  const corpo = linhas
    .map((l) => `${l.conta}\t${l.descricao}\t${l.exercicio}\t${l.milhoes.toFixed(1)}`)
    .join("\n");
  return `${titulo}\nValores em R$ milhões. Colunas: conta | descrição | exercício | valor\n\n${corpo}`;
}

async function textoDoPdf(caminho) {
  const pdf = await getDocumentProxy(new Uint8Array(readFileSync(caminho)));
  const { text } = await extractText(pdf, { mergePages: false });
  const paginas = Array.isArray(text) ? text : [text];
  return paginas.map((t, i) => `[p. ${i + 1}]\n${t.trim()}`).join("\n\n");
}

const documentos = [];

// 1. Demonstrações padronizadas, com conta e exercício preservados.
const dfp = XLSX.read(readFileSync(resolve(origem, "casas_bahia_DFP_bruto.xlsx")));
for (const [aba, titulo] of Object.entries(ABAS)) {
  const linhas = tabelaDaAba(dfp, aba);
  documentos.push({
    titulo,
    origem: `DFP consolidada padronizada da CVM, aba ${aba}, exercícios de 2023 a 2025`,
    texto: comoTexto(titulo, linhas),
  });
}

// 2. Os sete fatos relevantes do evento de crédito, por extenso.
const fatos = readdirSync(origem)
  .filter((f) => f.startsWith("credito_") && f.endsWith(".pdf"))
  .sort();
for (const arquivo of fatos) {
  const data = arquivo.slice(8, 18);
  const assunto = basename(arquivo, ".pdf").slice(19).replace(/_/g, " ");
  documentos.push({
    titulo: `Fato relevante ${data} — ${assunto}`,
    origem: `CVM, documento ${arquivo}`,
    texto: await textoDoPdf(resolve(origem, arquivo)),
  });
}

// 3. Os três releases de resultado do 4T.
const releases = readdirSync(origem)
  .filter((f) => f.startsWith("release_") && f.endsWith(".pdf"))
  .sort();
for (const arquivo of releases) {
  const data = arquivo.slice(8, 18);
  documentos.push({
    titulo: `Release de resultado — ${basename(arquivo, ".pdf").slice(19).replace(/_/g, " ")}`,
    origem: `CVM, documento ${arquivo} (divulgado em ${data})`,
    texto: await textoDoPdf(resolve(origem, arquivo)),
  });
}

// 4. Indicadores dos pares do varejo.
const pares = XLSX.read(readFileSync(resolve(origem, "pares_varejo_DFP_bruto.xlsx")));
const linhasPares = pares.SheetNames.flatMap((aba) =>
  Object.keys(ABAS).includes(aba) ? tabelaDaAba(pares, aba).map((l) => ({ ...l, aba })) : [],
);
if (linhasPares.length) {
  documentos.push({
    titulo: "Pares do varejo — demonstrações padronizadas",
    origem: "DFP consolidada padronizada da CVM, companhias comparáveis do varejo",
    texto: comoTexto("Pares do varejo", linhasPares),
  });
}

// 5. Referência de página aos DFP completos — presentes no dossiê, ausentes do texto.
documentos.push({
  titulo: "DFP completas de 2023, 2024 e 2025 — referência",
  origem: "CVM, DFP_2023/2024/2025_GRUPO_CASAS_BAHIA_S_A.pdf",
  texto: [
    "As demonstrações financeiras padronizadas completas dos três exercícios, com as notas",
    "explicativas e o relatório do auditor, constam do dossiê como PDF. Elas NÃO estão",
    "transcritas aqui: o que foi extraído delas são as contas padronizadas acima.",
    "",
    "Ao citar uma nota explicativa, use a forma \"DFP 2025, p. N\". Se o número que você precisa",
    "não estiver nas contas padronizadas nem nos fatos relevantes nem nos releases acima, ele",
    "não está disponível para esta análise: registre em \"informacao_ausente\".",
  ].join("\n"),
});

const dossie = { contraparte: CONTRAPARTE, operacao: OPERACAO, documentos };

mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, JSON.stringify(dossie, null, 2) + "\n");

const chars = documentos.reduce((t, d) => t + d.texto.length, 0);
console.log(`✓ ${destino}`);
console.log(`  ${documentos.length} documentos, ${chars.toLocaleString("pt-BR")} caracteres`);
console.log(`  ≈ ${Math.round(chars / 4).toLocaleString("pt-BR")} tokens de entrada por agente`);
for (const d of documentos) {
  console.log(`  · ${d.titulo} — ${d.texto.length.toLocaleString("pt-BR")} car.`);
}
if (!existsSync(resolve(origem, "casas_bahia_DFP_bruto.xlsx"))) process.exit(1);
