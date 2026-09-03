/**
 * Descoberta das credenciais do Redis efêmero (spec §8.2).
 *
 * Existe porque o nome dessas variáveis não é uma coisa só. A integração Upstash da Vercel
 * pergunta um **prefixo** ao conectar o banco a um projeto, e o que ela cria depende da resposta:
 *
 *   sem prefixo          → KV_REST_API_URL, KV_REST_API_TOKEN
 *   prefixo "MEU_APP"    → MEU_APP_KV_REST_API_URL, MEU_APP_KV_REST_API_TOKEN
 *   fora da Vercel       → UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 *
 * Neste projeto o prefixo informado foi, sem querer, "KV_REST_API_TOKEN", o que produziu
 * `KV_REST_API_TOKEN_KV_REST_API_URL`. Ao mesmo tempo existiam `KV_REST_API_URL` e
 * `KV_REST_API_TOKEN` criadas à mão e **vazias**. O app lia as vazias e caía no armazém em
 * memória — que na Vercel não sobrevive entre instâncias.
 *
 * A regra abaixo resolve a família inteira: vale o nome canônico, o nome da convenção Upstash, ou
 * qualquer variável cujo nome **termine** no nome canônico. Vazia nunca vale.
 */

const CANONICOS = {
  url: ["KV_REST_API_URL", "UPSTASH_REDIS_REST_URL"],
  token: ["KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN"],
} as const;

/**
 * Um token só de leitura não serve: o armazém grava. A integração cria
 * `..._KV_REST_API_READ_ONLY_TOKEN`, e sem esta exclusão ele seria escolhido por terminar em
 * "TOKEN" — e o app falharia na primeira gravação, em produção, no meio da aula.
 */
const PROIBIDOS = [/READ_ONLY/i];

type Ambiente = Record<string, string | undefined>;

function procurar(nomes: readonly string[], ambiente: Ambiente): string | undefined {
  const util = (nome: string) =>
    !PROIBIDOS.some((p) => p.test(nome)) && Boolean(ambiente[nome]?.trim());

  // 1. O nome exato, quando tem valor.
  for (const nome of nomes) if (util(nome)) return ambiente[nome];

  // 2. Qualquer variável prefixada que termine no nome canônico.
  for (const nome of nomes) {
    const achado = Object.keys(ambiente)
      .filter((chave) => chave.endsWith(`_${nome}`) && util(chave))
      .sort();
    if (achado.length) return ambiente[achado[0]];
  }
  return undefined;
}

export interface CredenciaisKV {
  url: string;
  token: string;
}

/** Devolve as credenciais quando as duas existem e têm valor; `null` caso contrário. */
export function credenciaisKV(ambiente: Ambiente = process.env): CredenciaisKV | null {
  const url = procurar(CANONICOS.url, ambiente);
  const token = procurar(CANONICOS.token, ambiente);
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}
