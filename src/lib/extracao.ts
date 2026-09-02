/**
 * Extração de texto dos arquivos enviados (spec §3.1, etapa 1).
 *
 * Roda SEMPRE no servidor. O arquivo vive apenas em memória durante a execução e nunca é
 * gravado em lugar nenhum (§8.2). Um único dossiê em texto alimenta os dois fornecedores — o
 * contrarian não é Anthropic e não receberia um bloco `document` nativo.
 */

import * as XLSX from "xlsx";

/**
 * Extrai o texto de um PDF marcando cada página como `[p. N]`.
 * A rastreabilidade das evidências depende desse marcador: é o "documento e página" da regra
 * "cada número tem endereço".
 */
export async function extrairPdf(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: false });
  const paginas = Array.isArray(text) ? text : [text];
  return paginas.map((t, i) => `[p. ${i + 1}]\n${t.trim()}`).join("\n\n");
}

/**
 * Converte uma planilha em tabelas de texto, uma por aba, em TSV.
 * Formato tabular é mais legível para o modelo do que JSON e gasta menos tokens.
 */
export function extrairPlanilha(bytes: Uint8Array): string {
  const wb = XLSX.read(bytes, { type: "array" });
  return wb.SheetNames.map((nome) => {
    const linhas = XLSX.utils.sheet_to_csv(wb.Sheets[nome], { FS: "\t" });
    return `### Aba: ${nome}\n${linhas.trim()}`;
  }).join("\n\n");
}

/** Despacha pela extensão do arquivo. Formato desconhecido é erro, não silêncio. */
export async function extrair(nome: string, bytes: Uint8Array): Promise<string> {
  const ext = nome.toLowerCase().split(".").pop();
  if (ext === "pdf") return extrairPdf(bytes);
  if (ext === "xlsx" || ext === "xls") return extrairPlanilha(bytes);
  throw new Error(`formato não suportado: "${nome}". Aceitos: PDF e XLSX.`);
}
