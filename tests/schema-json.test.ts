/**
 * O contrato enviado aos modelos — a correção que fez a primeira execução real custar
 * US$ 4,64 sem produzir memo (nenhum schema ia junto do prompt).
 */
import { describe, it, expect } from "vitest";
import {
  JSON_SCHEMA_ANALISE,
  JSON_SCHEMA_MEMO,
  JSON_SCHEMA_PLANO,
  CAMPOS_CARIMBADOS_PELO_SERVIDOR,
  paraOpenAIEstrito,
  limparNulos,
} from "@/lib/schema-json";
import { analiseAgenteSchema } from "@/lib/schema";
import { comReenvioUnico } from "@/lib/parser";
import { analiseDe } from "./apoio";

const RESTRICOES_RECUSADAS = [
  "minimum",
  "maximum",
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "pattern",
  "format",
];

function percorrer(no: unknown, visitar: (o: Record<string, unknown>) => void): void {
  if (Array.isArray(no)) {
    for (const i of no) percorrer(i, visitar);
  } else if (no && typeof no === "object") {
    visitar(no as Record<string, unknown>);
    for (const v of Object.values(no)) percorrer(v, visitar);
  }
}

describe("schema enviado aos fornecedores", () => {
  const todos = [JSON_SCHEMA_ANALISE, JSON_SCHEMA_MEMO, JSON_SCHEMA_PLANO];

  it("não traz restrição que a saída estruturada da Anthropic recusa", () => {
    const achadas: string[] = [];
    for (const s of todos) {
      percorrer(s, (o) => {
        for (const r of RESTRICOES_RECUSADAS) if (r in o) achadas.push(r);
      });
    }
    expect(achadas).toEqual([]);
  });

  it("fecha todo objeto a additionalProperties: false, como a OpenAI estrita exige", () => {
    const abertos: string[] = [];
    for (const s of todos) {
      percorrer(s, (o) => {
        if (o.type === "object" && o.additionalProperties !== false) abertos.push("objeto aberto");
      });
    }
    expect(abertos).toEqual([]);
  });

  it("não pede ao modelo os campos que o servidor carimba", () => {
    const props = JSON_SCHEMA_ANALISE.properties as Record<string, unknown>;
    for (const campo of CAMPOS_CARIMBADOS_PELO_SERVIDOR) {
      expect(props[campo], campo).toBeUndefined();
      expect(JSON_SCHEMA_ANALISE.required as string[], campo).not.toContain(campo);
    }
  });

  it("mantém os campos que são conteúdo da análise", () => {
    const props = JSON_SCHEMA_ANALISE.properties as Record<string, unknown>;
    for (const campo of ["papel", "classificacao", "score", "sintese", "evidencias", "riscos", "verificacoes"]) {
      expect(props[campo], campo).toBeDefined();
    }
  });
});

describe("carimbo do servidor no parser", () => {
  it("preenche modelo e fornecedor a partir do adaptador, não do modelo", async () => {
    const { modelo: _m, fornecedor: _f, ...semMetadados } = analiseDe("financeiro");
    const { resultado, tentativas } = await comReenvioUnico(
      analiseAgenteSchema,
      async () => JSON.stringify(semMetadados),
      () => ({ modelo: "claude-sonnet-5", fornecedor: "anthropic" }),
    );
    expect(resultado.ok).toBe(true);
    expect(tentativas).toBe(1);
    expect(resultado.dados?.modelo).toBe("claude-sonnet-5");
    expect(resultado.dados?.fornecedor).toBe("anthropic");
  });

  it("o carimbo vence o que o modelo tiver inventado", async () => {
    const inventado = { ...analiseDe("financeiro"), modelo: "gpt-5-thinking", fornecedor: "openai" };
    const { resultado } = await comReenvioUnico(
      analiseAgenteSchema,
      async () => JSON.stringify(inventado),
      () => ({ modelo: "claude-sonnet-5", fornecedor: "anthropic" }),
    );
    expect(resultado.dados?.modelo).toBe("claude-sonnet-5");
    expect(resultado.dados?.fornecedor).toBe("anthropic");
  });
});

describe("tradução para o modo estrito da OpenAI", () => {
  const estrito = paraOpenAIEstrito(JSON_SCHEMA_ANALISE);

  it("todo objeto exige TODAS as suas propriedades", () => {
    percorrer(estrito, (o) => {
      if (o.type === "object" && o.properties) {
        expect(new Set(o.required as string[])).toEqual(
          new Set(Object.keys(o.properties as Record<string, unknown>)),
        );
      }
    });
  });

  it("o campo opcional vira anulável em vez de sumir do required", () => {
    const evidencia = (
      (estrito.properties as Record<string, Record<string, Record<string, unknown>>>).evidencias
        .items as Record<string, unknown>
    ).properties as Record<string, { type: unknown }>;
    expect(evidencia.valor.type).toEqual(["number", "null"]);
    expect(evidencia.afirmacao.type).toBe("string");
  });

  it("não altera o schema original", () => {
    expect((JSON_SCHEMA_ANALISE.required as string[]).includes("divergencias")).toBe(false);
  });

  it("limparNulos remove os nulos que o modo estrito obriga a emitir", () => {
    expect(limparNulos({ a: 1, b: null, c: { d: null, e: 2 }, f: [{ g: null, h: 3 }] })).toEqual({
      a: 1,
      c: { e: 2 },
      f: [{ h: 3 }],
    });
  });
});

describe("erro de fornecedor não derruba a execução", () => {
  it("vira erro legível desta etapa", async () => {
    const { resultado, tentativas } = await comReenvioUnico(
      analiseAgenteSchema,
      async () => JSON.stringify({ __erro_do_fornecedor: "400 schema inválido" }),
    );
    expect(resultado.ok).toBe(false);
    expect(resultado.erro).toMatch(/o fornecedor recusou a chamada/);
    expect(resultado.erro).toMatch(/400 schema inválido/);
    expect(tentativas).toBe(2);
  });
});
