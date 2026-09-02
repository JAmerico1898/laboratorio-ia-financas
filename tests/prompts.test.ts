/**
 * Os prompts de sistema — spec §5.
 *
 * A Aula 4 abre estes arquivos na tela. Eles precisam ser legíveis por quem não programa, e a
 * montagem precisa ser previsível: preâmbulo, papel, módulos do curso, lembrete final.
 */
import { describe, it, expect } from "vitest";
import { PREAMBULO_COMUM, LEMBRETE_FINAL } from "@/prompts/comum";
import { PROMPT_FINANCEIRO, PROMPT_SETORIAL, PROMPT_JURIDICO } from "@/prompts/especialistas";
import { PROMPT_CONTRARIAN } from "@/prompts/contrarian";
import {
  PROMPT_SUPERVISOR_PLANEJAMENTO,
  PROMPT_SUPERVISOR_CONSOLIDACAO,
  PROMPT_SUPERVISOR_CONSOLIDACAO_SEM_CONTRARIAN,
} from "@/prompts/supervisor";
import { METODOLOGIA } from "@/prompts/curso/metodologia";
import { PROMPT_AULA1 } from "@/prompts/curso/prompt_aula1";
import { MODELO_CREDIT_MEMO } from "@/prompts/curso/modelo_credit_memo";

const TODOS: Array<[string, string]> = [
  ["financeiro", PROMPT_FINANCEIRO],
  ["setorial", PROMPT_SETORIAL],
  ["juridico", PROMPT_JURIDICO],
  ["contrarian", PROMPT_CONTRARIAN],
  ["planejamento", PROMPT_SUPERVISOR_PLANEJAMENTO],
  ["consolidacao", PROMPT_SUPERVISOR_CONSOLIDACAO],
  ["consolidacao_sem", PROMPT_SUPERVISOR_CONSOLIDACAO_SEM_CONTRARIAN],
];

describe("montagem de todos os prompts", () => {
  it("todo prompt começa com o preâmbulo comum", () => {
    for (const [nome, p] of TODOS) expect(p.startsWith(PREAMBULO_COMUM), nome).toBe(true);
  });

  it("todo prompt termina com o lembrete final", () => {
    // Na primeira execução real, uma análise reprovou por síntese acima de 600 caracteres com o
    // limite enunciado só no preâmbulo, a mais de mil linhas do fim. O lembrete é a última coisa
    // que o modelo lê — e este teste garante que continue sendo.
    for (const [nome, p] of TODOS) expect(p.trimEnd().endsWith(LEMBRETE_FINAL), nome).toBe(true);
  });

  it("todo prompt traz a metodologia do curso, de onde vem a escala R1–R7", () => {
    for (const [nome, p] of TODOS) expect(p.includes(METODOLOGIA), nome).toBe(true);
  });
});

describe("os artefatos do curso entram verbatim (§5.8)", () => {
  it("o analista financeiro recebe o prompt estruturado da Aula 1 inteiro", () => {
    expect(PROMPT_FINANCEIRO).toContain(PROMPT_AULA1);
  });

  it("as consolidações recebem o modelo de credit memo", () => {
    expect(PROMPT_SUPERVISOR_CONSOLIDACAO).toContain(MODELO_CREDIT_MEMO);
    expect(PROMPT_SUPERVISOR_CONSOLIDACAO_SEM_CONTRARIAN).toContain(MODELO_CREDIT_MEMO);
  });

  it("a metodologia traz a escala com as fronteiras que o código usa", () => {
    expect(METODOLOGIA).toMatch(/3,5 – 3,9 \| R3/);
    expect(METODOLOGIA).toMatch(/2,5 – 2,9 \| R5/);
  });
});

describe("o que cada papel diz", () => {
  it("o contrarian é instruído a derrubar as três análises", () => {
    expect(PROMPT_CONTRARIAN).toContain("tentar derrubar as três análises");
  });

  it("a consolidação sem contrarian não menciona quatro análises", () => {
    expect(PROMPT_SUPERVISOR_CONSOLIDACAO).toContain("quatro análises independentes");
    expect(PROMPT_SUPERVISOR_CONSOLIDACAO_SEM_CONTRARIAN).not.toContain(
      "quatro análises independentes",
    );
    expect(PROMPT_SUPERVISOR_CONSOLIDACAO_SEM_CONTRARIAN).toContain("Não há\nrevisão contrarian");
  });

  it("o planejamento proíbe antecipar conclusão", () => {
    expect(PROMPT_SUPERVISOR_PLANEJAMENTO).toContain("Não antecipe conclusão");
  });

  it("o preâmbulo diz ao modelo para não preencher modelo nem fornecedor", () => {
    expect(PREAMBULO_COMUM).toMatch(/NÃO preenche "modelo" nem "fornecedor"/);
  });
});
