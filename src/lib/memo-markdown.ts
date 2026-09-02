/**
 * Exportação do memo em Markdown (spec §6.3), na ordem do modelo de credit memo do curso.
 */

import type { CreditMemo } from "@/lib/schema";
import { leitura } from "@/lib/escala";

const RECOMENDACAO: Record<CreditMemo["recomendacao"], string> = {
  conceder: "Conceder",
  conceder_com_condicoes: "Conceder com condições",
  nao_conceder: "Não conceder",
};

export function memoEmMarkdown(memo: CreditMemo): string {
  const l: string[] = [];
  const reais = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  l.push(`# Credit memo — ${memo.contraparte.nome}`);
  l.push("");
  l.push(
    `CNPJ ${memo.contraparte.cnpj} · ${reais(memo.operacao.valor_reais)} · ${memo.operacao.prazo_meses} meses · ${memo.operacao.modalidade} · data-base ${memo.operacao.data_base}`,
  );
  l.push("");
  l.push("## 1. Recomendação");
  l.push(
    `**${RECOMENDACAO[memo.recomendacao]} — ${memo.classificacao}** (${leitura(memo.classificacao)}), score ${memo.score_consolidado.toFixed(1)}.`,
  );
  l.push("");
  l.push("## 2. Síntese");
  for (const s of memo.sintese) l.push(`- ${s}`);
  l.push("");
  l.push("## 3. Quadro de indicadores");
  l.push("| Indicador | 2023 | 2024 | 2025 | Origem |");
  l.push("|---|---|---|---|---|");
  for (const q of memo.quadro_indicadores) {
    const v = (n?: number) => (n === undefined ? "—" : n.toFixed(1));
    l.push(`| ${q.indicador} | ${v(q.v2023)} | ${v(q.v2024)} | ${v(q.v2025)} | ${q.origem} |`);
  }
  l.push("");
  l.push("## 4. Leitura do negócio");
  l.push(memo.leitura_do_negocio);
  l.push("");
  l.push("## 5. Riscos");
  l.push("| Risco | Evidência | Probabilidade | Severidade |");
  l.push("|---|---|---|---|");
  for (const r of memo.riscos) {
    l.push(
      `| ${r.descricao} | ${r.evidencia.origem} | ${r.probabilidade} | ${r.severidade} |`,
    );
  }
  l.push("");
  l.push("## 6. Divergências");
  if (memo.divergencias.length === 0) {
    l.push("Nenhuma divergência registrada.");
  } else {
    for (const d of memo.divergencias) {
      l.push(`### ${d.tema}`);
      for (const p of d.posicoes) l.push(`- **${p.papel}**: ${p.posicao}`);
    }
  }
  l.push("");
  l.push("## 7. Condições sugeridas");
  if (memo.condicoes_sugeridas.length === 0) {
    l.push("Não aplicável para esta recomendação.");
  } else {
    for (const c of memo.condicoes_sugeridas) l.push(`- ${c}`);
  }
  l.push("");
  l.push("## 8. Informação ausente");
  if (memo.informacao_ausente.length === 0) {
    l.push("Nada registrado como ausente.");
  } else {
    for (const i of memo.informacao_ausente) l.push(`- ${i}`);
  }
  l.push("");
  l.push("## 9. Verificações");
  for (const a of memo.analises) {
    const v = a.verificacoes;
    l.push(
      `- **${a.papel}** (${a.modelo}): balanço fecha: ${v.balanco_fecha === null ? "não verificado" : v.balanco_fecha ? "sim" : "não"}; números sem origem: ${v.numeros_sem_origem.length || "nenhum"}; indicadores inválidos: ${v.indicadores_invalidos.length || "nenhum"}.`,
    );
  }
  l.push("");
  l.push(
    `_Revisão contrarian: ${memo.contrarian_incluido ? "incluída" : "não incluída"}. Execução ${memo.execucao_id}._`,
  );
  return l.join("\n");
}
