/**
 * Descoberta das credenciais do KV — spec §8.2.
 *
 * O caso real que originou este arquivo: a integração Upstash foi conectada com o prefixo
 * "KV_REST_API_TOKEN", produzindo KV_REST_API_TOKEN_KV_REST_API_URL, enquanto KV_REST_API_URL
 * existia, criada à mão, e vazia. O app lia a vazia e caía no armazém em memória — que na Vercel
 * não sobrevive entre instâncias.
 */
import { describe, it, expect } from "vitest";
import { credenciaisKV } from "@/lib/credenciais-kv";

describe("nomes canônicos", () => {
  it("encontra KV_REST_API_URL e KV_REST_API_TOKEN", () => {
    expect(
      credenciaisKV({ KV_REST_API_URL: "https://kv.exemplo", KV_REST_API_TOKEN: "t" }),
    ).toEqual({ url: "https://kv.exemplo", token: "t" });
  });

  it("aceita a convenção Upstash fora da Vercel", () => {
    expect(
      credenciaisKV({
        UPSTASH_REDIS_REST_URL: "https://kv.exemplo",
        UPSTASH_REDIS_REST_TOKEN: "t",
      }),
    ).toEqual({ url: "https://kv.exemplo", token: "t" });
  });

  it("remove a barra final da URL, que duplicaria a barra da rota", () => {
    expect(credenciaisKV({ KV_REST_API_URL: "https://kv.exemplo/", KV_REST_API_TOKEN: "t" })?.url)
      .toBe("https://kv.exemplo");
  });
});

describe("variáveis prefixadas pela integração da Vercel", () => {
  it("encontra o par mesmo com prefixo", () => {
    expect(
      credenciaisKV({ MEU_APP_KV_REST_API_URL: "https://kv.exemplo", MEU_APP_KV_REST_API_TOKEN: "t" }),
    ).toEqual({ url: "https://kv.exemplo", token: "t" });
  });

  it("o caso real deste projeto: prefixo igual ao nome canônico do token", () => {
    expect(
      credenciaisKV({
        KV_REST_API_URL: "",
        KV_REST_API_TOKEN: "",
        KV_REST_API_TOKEN_KV_REST_API_URL: "https://kv.exemplo",
        KV_REST_API_TOKEN_KV_REST_API_TOKEN: "token-de-escrita",
        KV_REST_API_TOKEN_KV_REST_API_READ_ONLY_TOKEN: "token-so-leitura",
      }),
    ).toEqual({ url: "https://kv.exemplo", token: "token-de-escrita" });
  });

  it("NUNCA escolhe o token só de leitura — o armazém grava", () => {
    const c = credenciaisKV({
      KV_REST_API_TOKEN_KV_REST_API_URL: "https://kv.exemplo",
      KV_REST_API_TOKEN_KV_REST_API_READ_ONLY_TOKEN: "token-so-leitura",
    });
    // Sem token de escrita, não há credencial: melhor cair no armazém em memória do que
    // descobrir na primeira gravação, em produção.
    expect(c).toBeNull();
  });
});

describe("ausência e valor vazio", () => {
  it("variável vazia não vale", () => {
    expect(credenciaisKV({ KV_REST_API_URL: "", KV_REST_API_TOKEN: "" })).toBeNull();
    expect(credenciaisKV({ KV_REST_API_URL: "   ", KV_REST_API_TOKEN: "t" })).toBeNull();
  });

  it("só a URL, ou só o token, não bastam", () => {
    expect(credenciaisKV({ KV_REST_API_URL: "https://kv.exemplo" })).toBeNull();
    expect(credenciaisKV({ KV_REST_API_TOKEN: "t" })).toBeNull();
  });

  it("ambiente sem nada devolve null", () => {
    expect(credenciaisKV({})).toBeNull();
  });
});
