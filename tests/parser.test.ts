/**
 * Parser de resposta de agente — spec §10.1.
 *
 * "JSON válido, JSON com cerca de código, JSON truncado, JSON com campo faltando — os três
 * últimos precisam disparar o reenvio único."
 */
import { describe, it, expect, vi } from "vitest";
import { analisarResposta, limparCerca, comReenvioUnico } from "@/lib/parser";
import { analiseAgenteSchema } from "@/lib/schema";
import { analiseDe } from "./apoio";

const valida = JSON.stringify(analiseDe("financeiro"));

describe("limpeza de cerca de código", () => {
  it("passa JSON puro adiante", () => {
    expect(limparCerca('{"a":1}')).toBe('{"a":1}');
  });

  it("remove cerca ```json", () => {
    expect(limparCerca('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("remove cerca sem linguagem", () => {
    expect(limparCerca('```\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("remove texto antes e depois da cerca", () => {
    expect(limparCerca('Claro! Segue:\n```json\n{"a":1}\n```\nEspero ter ajudado.')).toBe(
      '{"a":1}',
    );
  });
});

describe("validação", () => {
  it("aceita JSON válido no schema", () => {
    const r = analisarResposta(valida, analiseAgenteSchema);
    expect(r.ok).toBe(true);
    expect(r.dados?.papel).toBe("financeiro");
  });

  it("aceita JSON válido dentro de cerca", () => {
    expect(analisarResposta("```json\n" + valida + "\n```", analiseAgenteSchema).ok).toBe(true);
  });

  it("recusa JSON truncado e diz por quê", () => {
    const r = analisarResposta(valida.slice(0, -20), analiseAgenteSchema);
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/JSON inválido/);
  });

  it("recusa JSON com campo faltando e nomeia o campo", () => {
    const { confianca: _, ...semConfianca } = analiseDe("financeiro");
    const r = analisarResposta(JSON.stringify(semConfianca), analiseAgenteSchema);
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/confianca/);
  });

  it("recusa análise com duas evidências e nomeia o campo", () => {
    const a = analiseDe("financeiro");
    const r = analisarResposta(
      JSON.stringify({ ...a, evidencias: a.evidencias.slice(0, 2) }),
      analiseAgenteSchema,
    );
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/evidencias/);
  });
});

describe("reenvio único", () => {
  it("não reenvia quando a primeira resposta vale", async () => {
    const chamar = vi.fn(async () => valida);
    const { resultado, tentativas } = await comReenvioUnico(analiseAgenteSchema, chamar);
    expect(resultado.ok).toBe(true);
    expect(tentativas).toBe(1);
    expect(chamar).toHaveBeenCalledTimes(1);
  });

  it("reenvia uma vez com o erro anexado e aceita a correção", async () => {
    const chamar = vi.fn(async (correcao?: string) =>
      correcao ? valida : "isto não é json",
    );
    const { resultado, tentativas } = await comReenvioUnico(analiseAgenteSchema, chamar);
    expect(resultado.ok).toBe(true);
    expect(tentativas).toBe(2);
    expect(chamar).toHaveBeenCalledTimes(2);
    expect(chamar.mock.calls[1][0]).toMatch(/rejeitada pela validação/);
  });

  it("reenvia exatamente uma vez — não fica tentando", async () => {
    const chamar = vi.fn(async () => "continua quebrado");
    const { resultado, tentativas } = await comReenvioUnico(analiseAgenteSchema, chamar);
    expect(resultado.ok).toBe(false);
    expect(tentativas).toBe(2);
    expect(chamar).toHaveBeenCalledTimes(2);
    expect(resultado.erro).toMatch(/falhou duas vezes/);
  });
});
