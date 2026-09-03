/**
 * Armazém em Redis efêmero — spec §8.2.
 *
 * Este adaptador é o que faz a tela de execução funcionar em produção: na Vercel as funções são
 * efêmeras, e sem ele o GET da tela pode cair numa instância que nunca viu o POST que disparou a
 * análise.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ArmazemRedis } from "@/lib/armazem-redis";
import { TTL_MS, type EstadoExecucao } from "@/lib/armazem";
import { analiseDe, dossieDeTeste } from "./apoio";

const estado: EstadoExecucao = {
  execucao_id: "exec-1",
  estado: "aguardando_decisao",
  contrarian_habilitado: true,
  contraparte: dossieDeTeste.contraparte,
  operacao: dossieDeTeste.operacao,
  agentes: { supervisor: { estado: "concluido" } },
  analises: [analiseDe("financeiro")],
  log: {
    execucao_id: "exec-1",
    iniciado_em: "2026-09-02T00:00:00.000Z",
    concluido_em: "2026-09-02T00:03:00.000Z",
    duracao_ms: 180_000,
    chamadas: [],
    custo_total_usd: 0.98,
    divergencias_detectadas: 1,
  },
};

/** Upstash de mentira: guarda o que recebe e devolve no formato {result}. */
function upstashSimulado() {
  const dados = new Map<string, string>();
  const chamadas: string[] = [];
  const buscar = vi.fn(async (url: string, init?: RequestInit) => {
    chamadas.push(url);
    const auth = new Headers(init?.headers).get("Authorization");
    if (auth !== "Bearer token-secreto") return new Response("", { status: 401 });

    const set = url.match(/\/set\/([^?]+)/);
    if (set) {
      dados.set(decodeURIComponent(set[1]), String(init?.body));
      return new Response(JSON.stringify({ result: "OK" }), { status: 200 });
    }
    const get = url.match(/\/get\/(.+)$/);
    if (get) {
      const valor = dados.get(decodeURIComponent(get[1]));
      return new Response(JSON.stringify({ result: valor ?? null }), { status: 200 });
    }
    return new Response("", { status: 404 });
  });
  vi.stubGlobal("fetch", buscar);
  return { dados, chamadas };
}

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe("gravação e leitura", () => {
  it("grava e devolve o estado inteiro", async () => {
    upstashSimulado();
    const armazem = new ArmazemRedis("https://kv.exemplo", "token-secreto");
    await armazem.salvar(estado);
    expect(await armazem.ler("exec-1")).toEqual(estado);
  });

  it("execução inexistente devolve null, não erro", async () => {
    upstashSimulado();
    const armazem = new ArmazemRedis("https://kv.exemplo", "token-secreto");
    expect(await armazem.ler("nao-existe")).toBeNull();
  });

  it("grava com TTL de 2 horas, para expirar sozinho", async () => {
    const { chamadas } = upstashSimulado();
    await new ArmazemRedis("https://kv.exemplo", "token-secreto").salvar(estado);
    expect(chamadas[0]).toContain(`EX=${TTL_MS / 1000}`);
    expect(chamadas[0]).toContain("EX=7200");
  });

  it("a chave é prefixada, para não colidir com outro uso do mesmo Redis", async () => {
    const { dados } = upstashSimulado();
    await new ArmazemRedis("https://kv.exemplo", "token-secreto").salvar(estado);
    expect([...dados.keys()]).toEqual(["execucao:exec-1"]);
  });
});

describe("falhas", () => {
  it("erro de gravação é lançado, não engolido", async () => {
    upstashSimulado();
    const armazem = new ArmazemRedis("https://kv.exemplo", "token-errado");
    await expect(armazem.salvar(estado)).rejects.toThrow(/Redis recusou a gravação/);
  });

  it("valor corrompido é tratado como inexistente", async () => {
    const { dados } = upstashSimulado();
    dados.set("execucao:exec-1", "isto não é json");
    expect(await new ArmazemRedis("https://kv.exemplo", "token-secreto").ler("exec-1")).toBeNull();
  });

  it("recusa ser construído sem URL ou sem token", () => {
    expect(() => new ArmazemRedis("", "token")).toThrow(/KV_REST_API_URL/);
    expect(() => new ArmazemRedis("https://kv.exemplo", "")).toThrow(/KV_REST_API_TOKEN/);
  });
});

describe("o que NUNCA pode entrar no armazém (§8.2)", () => {
  it("o estado gravado não contém documento, texto extraído nem arquivo do usuário", async () => {
    const { dados } = upstashSimulado();
    await new ArmazemRedis("https://kv.exemplo", "token-secreto").salvar(estado);
    const gravado = dados.get("execucao:exec-1")!;
    expect(gravado).not.toMatch(/"documentos"/);
    expect(gravado).not.toMatch(/"texto"/);
    expect(gravado).not.toMatch(/DOSSIÊ/);
  });
});
