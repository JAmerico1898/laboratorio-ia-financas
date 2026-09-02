/**
 * Parser de resposta de agente (spec §4 "Regras de contrato" e §10.1).
 *
 * Resposta que não valida é reenviada UMA vez com o erro de validação anexado. Se falhar de
 * novo, a análise entra no memo com o erro preenchido e o supervisor consolida sem ela.
 */

import type { ZodType } from "zod";

export interface ResultadoParse<T> {
  ok: boolean;
  dados?: T;
  erro?: string;
}

/**
 * Remove cerca de código quando o modelo desobedece a instrução "sem cercas".
 * Aceita ```json, ``` puro, e texto antes ou depois do bloco.
 */
export function limparCerca(bruto: string): string {
  const texto = bruto.trim();
  const cerca = texto.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (cerca) return cerca[1].trim();
  return texto;
}

/**
 * Faz o parse e valida contra o schema. Não relança: devolve o erro em texto, porque o erro
 * é o que vai anexado ao reenvio.
 */
export function analisarResposta<T>(bruto: string, schema: ZodType<T>): ResultadoParse<T> {
  let json: unknown;
  try {
    json = JSON.parse(limparCerca(bruto));
  } catch (e) {
    return { ok: false, erro: `JSON inválido: ${(e as Error).message}` };
  }

  const r = schema.safeParse(json);
  if (!r.success) {
    const problemas = r.error.issues
      .map((i) => `${i.path.join(".") || "(raiz)"}: ${i.message}`)
      .join("; ");
    return { ok: false, erro: `não valida contra o schema — ${problemas}` };
  }
  return { ok: true, dados: r.data };
}

/** A mensagem que acompanha o reenvio único. */
export function mensagemDeReenvio(erro: string): string {
  return [
    "A resposta anterior foi rejeitada pela validação do contrato de dados.",
    `Erro: ${erro}`,
    "Reenvie a resposta corrigida. Apenas JSON válido, sem cercas de código e sem comentários.",
  ].join("\n");
}

/**
 * Executa `chamar` e, se a resposta não validar, reenvia UMA vez com o erro anexado.
 * Devolve o resultado final e quantas chamadas foram gastas, porque o log conta chamadas.
 */
export async function comReenvioUnico<T>(
  schema: ZodType<T>,
  chamar: (correcao?: string) => Promise<string>,
  /**
   * Campos que o servidor carimba na resposta antes de validar — `modelo` e `fornecedor`.
   * Ver `CAMPOS_CARIMBADOS_PELO_SERVIDOR` em `schema-json.ts`.
   */
  carimbo?: () => Record<string, unknown>,
): Promise<{ resultado: ResultadoParse<T>; tentativas: number }> {
  const analisar = (bruto: string) => {
    if (!carimbo) return analisarResposta(bruto, schema);
    try {
      const json = JSON.parse(limparCerca(bruto)) as Record<string, unknown>;
      return analisarResposta(JSON.stringify({ ...json, ...carimbo() }), schema);
    } catch (e) {
      return { ok: false, erro: `JSON inválido: ${(e as Error).message}` };
    }
  };

  const primeira = analisar(await chamar());
  if (primeira.ok) return { resultado: primeira, tentativas: 1 };

  const segunda = analisar(await chamar(mensagemDeReenvio(primeira.erro!)));
  if (segunda.ok) return { resultado: segunda, tentativas: 2 };

  return {
    resultado: {
      ok: false,
      erro: `falhou duas vezes. Primeira: ${primeira.erro} | Segunda: ${segunda.erro}`,
    },
    tentativas: 2,
  };
}
