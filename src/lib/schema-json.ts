/**
 * O contrato da §4 em JSON Schema, para ser ENVIADO aos modelos.
 *
 * O preâmbulo dos prompts manda "responda no schema fornecido". Fornecer o schema é isto: os
 * dois fornecedores suportam saída estruturada, e é ela que garante que a resposta valide na
 * primeira tentativa. Sem isto o modelo inventa a própria forma, reprova na validação e o
 * reenvio único dobra o custo de cada etapa sem resolver.
 *
 * A fonte continua sendo o schema Zod: aqui só o convertemos.
 */

import { z } from "zod";
import { analiseAgenteSchema, creditMemoSchema, planoDeAnaliseSchema } from "@/lib/schema";

type JsonSchema = Record<string, unknown>;

/**
 * Converte um schema Zod em JSON Schema aceitável pelos dois fornecedores.
 *
 * `io: "input"` evita que campos com valor padrão virem obrigatórios; `additionalProperties`
 * fechado é exigência da saída estruturada estrita da OpenAI.
 */
function paraJsonSchema(schema: z.ZodType): JsonSchema {
  return normalizar(z.toJSONSchema(schema, { io: "input", target: "draft-7" }) as JsonSchema);
}

/**
 * Restrições que a saída estruturada da Anthropic recusa — devolve
 * `For 'number' type, properties maximum, minimum are not supported`.
 *
 * Removê-las do que vai ao modelo não afrouxa o contrato: elas continuam valendo no schema Zod,
 * que é quem valida a resposta. O que muda é a camada onde a regra é aplicada — o modelo recebe
 * a FORMA, o Zod cobra os LIMITES. O texto do prompt já enuncia os limites que importam
 * ("mínimo 3 evidências", "de três a seis riscos", "score de 1,0 a 5,0").
 */
const RESTRICOES_NAO_SUPORTADAS = [
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "pattern",
  "minItems",
  "maxItems",
  "format",
];

/** Fecha todo objeto a `additionalProperties: false` e remove as restrições não suportadas. */
function normalizar(no: JsonSchema): JsonSchema {
  if (no.type === "object") no.additionalProperties = false;
  for (const chave of RESTRICOES_NAO_SUPORTADAS) delete no[chave];
  for (const valor of Object.values(no)) {
    if (Array.isArray(valor)) {
      for (const item of valor) if (item && typeof item === "object") normalizar(item as JsonSchema);
    } else if (valor && typeof valor === "object") {
      normalizar(valor as JsonSchema);
    }
  }
  return no;
}

/**
 * `modelo` e `fornecedor` saem do schema que vai ao modelo: são metadados da execução, não
 * conteúdo da análise. Um modelo perguntado sobre o próprio identificador responde o que acha
 * que é — na primeira medição, o Sonnet 5 se declarou "gpt-5-thinking". Quem sabe qual modelo
 * atendeu é o adaptador, e é ele que carimba os dois campos depois do parse.
 */
export const CAMPOS_CARIMBADOS_PELO_SERVIDOR = ["modelo", "fornecedor"] as const;

function semMetadados(schema: JsonSchema): JsonSchema {
  const props = schema.properties as Record<string, unknown> | undefined;
  const obrigatorios = schema.required as string[] | undefined;
  if (props) for (const campo of CAMPOS_CARIMBADOS_PELO_SERVIDOR) delete props[campo];
  if (obrigatorios) {
    schema.required = obrigatorios.filter(
      (c) => !(CAMPOS_CARIMBADOS_PELO_SERVIDOR as readonly string[]).includes(c),
    );
  }
  return schema;
}

export const JSON_SCHEMA_ANALISE = semMetadados(paraJsonSchema(analiseAgenteSchema));
export const JSON_SCHEMA_MEMO = paraJsonSchema(creditMemoSchema);
export const JSON_SCHEMA_PLANO = paraJsonSchema(planoDeAnaliseSchema);
