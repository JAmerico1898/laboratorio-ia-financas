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

/**
 * O mesmo princípio no memo, por duas razões.
 *
 * A primeira é de contrato: `execucao_id`, `contraparte` e `operacao` são dados de entrada; pedir
 * ao supervisor que os repita é convidá-lo a errar um CNPJ. E `analises` são as próprias análises
 * que ele acabou de receber — o orquestrador já as tem em mãos.
 *
 * A segunda é dura: com `analises` dentro, a API recusa o schema —
 * *"The compiled grammar is too large, which would cause performance issues."* O `AnaliseAgente`
 * inteiro, repetido dentro do memo, estoura o limite da gramática compilada.
 */
export const CAMPOS_DO_MEMO_CARIMBADOS = [
  "execucao_id",
  "contraparte",
  "operacao",
  "analises",
] as const;

function semCampos(schema: JsonSchema, campos: readonly string[]): JsonSchema {
  const props = schema.properties as Record<string, unknown> | undefined;
  const obrigatorios = schema.required as string[] | undefined;
  if (props) for (const campo of campos) delete props[campo];
  if (obrigatorios) schema.required = obrigatorios.filter((c) => !campos.includes(c));
  return schema;
}

export const JSON_SCHEMA_ANALISE = semCampos(
  paraJsonSchema(analiseAgenteSchema),
  CAMPOS_CARIMBADOS_PELO_SERVIDOR,
);
export const JSON_SCHEMA_MEMO = semCampos(
  paraJsonSchema(creditMemoSchema),
  CAMPOS_DO_MEMO_CARIMBADOS,
);
export const JSON_SCHEMA_PLANO = paraJsonSchema(planoDeAnaliseSchema);

/**
 * A saída estruturada estrita da OpenAI é mais exigente que a da Anthropic: *"'required' is
 * required to be supplied and to be an array including every key in properties"*. Campo opcional
 * não existe lá — o jeito de expressar "pode não vir" é `type: ["number", "null"]` com o campo
 * ainda assim obrigatório.
 *
 * Esta função faz essa tradução. O contrato não muda: o Zod continua aceitando `undefined` nos
 * mesmos campos, e um `null` que chegue do contrarian é limpo antes da validação.
 */
export function paraOpenAIEstrito(schema: JsonSchema): JsonSchema {
  const copia = structuredClone(schema);
  const tornarTudoObrigatorio = (no: JsonSchema) => {
    if (no.type === "object" && no.properties) {
      const props = no.properties as Record<string, JsonSchema>;
      const jaObrigatorios = new Set((no.required as string[] | undefined) ?? []);
      for (const [nome, prop] of Object.entries(props)) {
        if (!jaObrigatorios.has(nome) && typeof prop.type === "string") {
          prop.type = [prop.type, "null"];
        }
      }
      no.required = Object.keys(props);
    }
    for (const valor of Object.values(no)) {
      if (Array.isArray(valor)) {
        for (const i of valor) if (i && typeof i === "object") tornarTudoObrigatorio(i as JsonSchema);
      } else if (valor && typeof valor === "object") {
        tornarTudoObrigatorio(valor as JsonSchema);
      }
    }
  };
  tornarTudoObrigatorio(copia);
  return copia;
}

/** Remove recursivamente os `null` que o modo estrito da OpenAI obriga a emitir. */
export function limparNulos<T>(valor: T): T {
  if (Array.isArray(valor)) return valor.map(limparNulos) as T;
  if (valor && typeof valor === "object") {
    const saida: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor)) {
      if (v !== null) saida[k] = limparNulos(v);
    }
    return saida as T;
  }
  return valor;
}
