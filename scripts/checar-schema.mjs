/** Checa se cada JSON Schema é aceito pela saída estruturada da Anthropic. Custo: centavos. */
import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const u = (p) => pathToFileURL(resolve(raiz, p)).href;
const S = await import(u("src/lib/schema-json.ts"));

const c = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
for (const nome of ["JSON_SCHEMA_PLANO", "JSON_SCHEMA_ANALISE", "JSON_SCHEMA_MEMO"]) {
  try {
    await c.messages.create({
      model: process.env.MODEL_ESPECIALISTA,
      max_tokens: 16,
      output_config: { effort: "low", format: { type: "json_schema", schema: S[nome] } },
      messages: [{ role: "user", content: "oi" }],
    });
    console.log(`✓ ${nome} aceito`);
  } catch (e) {
    console.log(`✗ ${nome}: ${e?.error?.error?.message ?? e.message}`);
  }
}
