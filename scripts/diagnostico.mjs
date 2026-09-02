/** Diagnóstico barato: um agente, dossiê minúsculo. Mostra a resposta crua e o erro de validação. */
import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const u = (p) => pathToFileURL(resolve(raiz, p)).href;

const { FornecedorAnthropic } = await import(u("src/lib/fornecedores/anthropic.ts"));
const { PROMPT_FINANCEIRO } = await import(u("src/prompts/especialistas.ts"));
const { analiseAgenteSchema } = await import(u("src/lib/schema.ts"));
const { comReenvioUnico } = await import(u("src/lib/parser.ts"));
const { JSON_SCHEMA_ANALISE } = await import(u("src/lib/schema-json.ts"));

const a = new FornecedorAnthropic(process.env.MODEL_ESPECIALISTA, process.env.ANTHROPIC_API_KEY);
const t0 = Date.now();
const r = await a.gerar({
  sistema: PROMPT_FINANCEIRO,
  usuario: `Contraparte: Teste S.A. (CNPJ 33.041.260/0652-90)
Operação: R$ 50.000.000, 24 meses, capital de giro. Data-base: 2025-12-31.

--- DOSSIÊ ---
Balanço consolidado, R$ milhões:
1.01 Ativo Circulante 2025 13242.0
2.01 Passivo Circulante 2025 12108.0
1 Ativo Total 2025 28900.0
2 Passivo Total 2025 28900.0
3.01 Receita Líquida 2025 29500.0
3.05 EBITDA 2025 2420.0
6.01 Caixa das Atividades Operacionais 2025 1804.0`,
  schema: JSON_SCHEMA_ANALISE,
});
console.log(`tempo ${(Date.now() - t0) / 1000}s · entrada ${r.tokens_entrada} · saída ${r.tokens_saida}`);
console.log("--- RESPOSTA CRUA (primeiros 900 car.) ---");
console.log(r.texto.slice(0, 900));
const { resultado } = await comReenvioUnico(analiseAgenteSchema, async () => r.texto, () => ({
  modelo: a.modelo,
  fornecedor: a.fornecedor,
}));
console.log("--- VALIDAÇÃO (com o carimbo do servidor) ---");
console.log(resultado.ok ? "OK" : resultado.erro);
console.log("esforço:", process.env.ESFORCO_CLAUDE ?? "high");
