/**
 * Evals de qualidade da análise — spec §10.4.
 *
 * ATENÇÃO: gasta CHAMADAS REAIS de API. Cinco execuções completas sobre o dossiê de referência.
 * Rode sob demanda, nunca no CI.
 *
 *   node --env-file=.env.local scripts/evals.mjs [--execucoes 5]
 *
 * O resultado vai para evals/ultimo.json, versionado, com o identificador de modelo e a data.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Os módulos TypeScript do app são carregados por tsx (veja o script "evals" no package.json),
// para reusar o orquestrador de produção em vez de duplicá-lo aqui.
const { executarAnalise } = await import(pathToFileURL(resolve(raiz, "src/lib/orquestrador.ts")).href);
const { ArmazemEmMemoria } = await import(pathToFileURL(resolve(raiz, "src/lib/armazem.ts")).href);
const { FornecedorAnthropic } = await import(pathToFileURL(resolve(raiz, "src/lib/fornecedores/anthropic.ts")).href);
const { FornecedorOpenAI } = await import(pathToFileURL(resolve(raiz, "src/lib/fornecedores/openai.ts")).href);

const n = Number(process.argv[process.argv.indexOf("--execucoes") + 1]) || 5;
const dossie = JSON.parse(
  readFileSync(resolve(raiz, "public/demo/dossie-casas-bahia.json"), "utf8"),
);

const adaptadores = {
  anthropic: new FornecedorAnthropic(process.env.MODEL_ESPECIALISTA, process.env.ANTHROPIC_API_KEY),
  contrarian: new FornecedorOpenAI(process.env.MODEL_CONTRARIAN, process.env.OPENAI_API_KEY),
};

/** Toda evidência do memo tem origem no formato "conta e exercício" ou "documento e página". */
const TEM_ORIGEM = /(conta\s+[\d.]+|p\.\s*\d+|exerc[íi]cio\s+\d{4})/i;

const execucoes = [];
for (let i = 0; i < n; i++) {
  process.stdout.write(`execução ${i + 1}/${n}… `);
  const estado = await executarAnalise({
    execucao_id: `eval-${i + 1}`,
    dossie,
    incluir_contrarian: true,
    adaptadores,
    armazem: new ArmazemEmMemoria(),
  });
  const memo = estado.memo_com_contrarian;
  const analises = estado.analises;
  const evidencias = analises.flatMap((a) => a.evidencias);
  const contrarian = analises.find((a) => a.papel === "contrarian");

  const valoresDasEvidencias = new Set(
    evidencias.filter((e) => e.valor !== undefined).map((e) => Number(e.valor).toFixed(1)),
  );
  const valoresDoMemo = (memo?.quadro_indicadores ?? [])
    .flatMap((q) => [q.v2023, q.v2024, q.v2025])
    .filter((v) => v !== undefined && v !== null)
    .map((v) => Number(v).toFixed(1));

  const textoDasAnalises = JSON.stringify(analises).toLowerCase();

  execucoes.push({
    execucao: i + 1,
    classificacao: memo?.classificacao ?? null,
    custo_usd: estado.log.custo_total_usd,
    duracao_ms: estado.log.duracao_ms,
    chamadas: estado.log.chamadas.length,
    evidencias_com_origem: evidencias.filter((e) => TEM_ORIGEM.test(e.origem)).length,
    evidencias_total: evidencias.length,
    valores_do_memo_sem_lastro: valoresDoMemo.filter((v) => !valoresDasEvidencias.has(v)).length,
    valores_do_memo_total: valoresDoMemo.length,
    alavancagem_nas_duas_versoes:
      textoDasAnalises.includes("restrita") && textoDasAnalises.includes("ampla"),
    contrarian_com_objecao_com_evidencia: Boolean(
      contrarian?.divergencias?.length && contrarian.evidencias.length >= 3,
    ),
    verificacoes_presentes: analises.every((a) => a.verificacoes !== undefined),
  });
  console.log(`${memo?.classificacao ?? "sem memo"} · US$ ${estado.log.custo_total_usd.toFixed(4)}`);
}

const faixas = ["R1", "R2", "R3", "R4", "R5", "R6", "R7"];
const indices = execucoes.map((e) => faixas.indexOf(e.classificacao)).filter((i) => i >= 0);

const limiares = [
  {
    eval: "Toda evidência do memo tem origem (conta e exercício, ou documento e página)",
    limiar: "100%",
    valor: `${((execucoes.reduce((t, e) => t + e.evidencias_com_origem, 0) / execucoes.reduce((t, e) => t + e.evidencias_total, 0)) * 100).toFixed(1)}%`,
    passou: execucoes.every((e) => e.evidencias_com_origem === e.evidencias_total),
  },
  {
    eval: "Nenhum valor do memo é inexistente nas evidências dos agentes",
    limiar: "100%",
    valor: `${execucoes.reduce((t, e) => t + e.valores_do_memo_sem_lastro, 0)} sem lastro`,
    passou: execucoes.every((e) => e.valores_do_memo_sem_lastro === 0),
  },
  {
    eval: "Alavancagem aparece nas duas versões (restrita e ampla)",
    limiar: `${n} de ${n}`,
    valor: `${execucoes.filter((e) => e.alavancagem_nas_duas_versoes).length} de ${n}`,
    passou: execucoes.every((e) => e.alavancagem_nas_duas_versoes),
  },
  {
    eval: "Classificação estável entre execuções",
    limiar: "variação máxima de 1 faixa",
    valor: `${indices.length ? Math.max(...indices) - Math.min(...indices) : "—"} faixa(s)`,
    passou: indices.length > 0 && Math.max(...indices) - Math.min(...indices) <= 1,
  },
  {
    eval: "O contrarian produz ao menos uma objeção com evidência",
    limiar: `${n} de ${n}`,
    valor: `${execucoes.filter((e) => e.contrarian_com_objecao_com_evidencia).length} de ${n}`,
    passou: execucoes.every((e) => e.contrarian_com_objecao_com_evidencia),
  },
  {
    eval: 'Seção "Verificações" presente em todas as análises',
    limiar: "100%",
    valor: execucoes.every((e) => e.verificacoes_presentes) ? "100%" : "abaixo de 100%",
    passou: execucoes.every((e) => e.verificacoes_presentes),
  },
];

const custos = execucoes.map((e) => e.custo_usd);
const media = custos.reduce((a, b) => a + b, 0) / custos.length;
const desvio = Math.sqrt(custos.reduce((t, c) => t + (c - media) ** 2, 0) / custos.length);

const resultado = {
  rodado_em: new Date().toISOString(),
  modelos: {
    supervisor: process.env.MODEL_SUPERVISOR,
    especialistas: process.env.MODEL_ESPECIALISTA,
    contrarian: process.env.MODEL_CONTRARIAN,
  },
  execucoes_realizadas: n,
  todos_os_limiares_atendidos: limiares.every((l) => l.passou),
  limiares,
  custo: {
    media_usd: Number(media.toFixed(4)),
    desvio_usd: Number(desvio.toFixed(4)),
    minimo_usd: Number(Math.min(...custos).toFixed(4)),
    maximo_usd: Number(Math.max(...custos).toFixed(4)),
  },
  duracao: {
    media_ms: Math.round(execucoes.reduce((t, e) => t + e.duracao_ms, 0) / n),
    maxima_ms: Math.max(...execucoes.map((e) => e.duracao_ms)),
  },
  execucoes,
};

mkdirSync(resolve(raiz, "evals"), { recursive: true });
writeFileSync(resolve(raiz, "evals/ultimo.json"), JSON.stringify(resultado, null, 2) + "\n");

console.log("");
for (const l of limiares) {
  console.log(`${l.passou ? "✓" : "✗"} ${l.eval}\n    limiar ${l.limiar} · obtido ${l.valor}`);
}
console.log(`\ncusto médio US$ ${media.toFixed(4)} (desvio ${desvio.toFixed(4)})`);
console.log(`duração média ${(resultado.duracao.media_ms / 1000).toFixed(1)} s`);
console.log(`\n→ evals/ultimo.json`);

process.exit(resultado.todos_os_limiares_atendidos ? 0 : 1);
