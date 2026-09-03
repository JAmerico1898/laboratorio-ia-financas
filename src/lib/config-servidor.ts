/**
 * Configuração do servidor: chaves, identificadores de modelo e limites.
 *
 * Este módulo NUNCA pode ser importado por componente de cliente. As chaves existem só como
 * variável de ambiente do servidor, sem prefixo NEXT_PUBLIC_ (§8.1), e um teste da §10.6 falha
 * se qualquer arquivo de `src/app` ou `src/components` referenciar uma delas.
 */

import "server-only";

import { FornecedorAnthropic, ESFORCO_PLANEJAMENTO } from "@/lib/fornecedores/anthropic";
import { FornecedorOpenAI } from "@/lib/fornecedores/openai";
import { FornecedorSimulado } from "@/lib/fornecedores/simulado";
import { respostasDemo } from "@/lib/fornecedores/respostas-demo";
import { ArmazemEmMemoria, type ArmazemExecucao } from "@/lib/armazem";
import { ArmazemRedis } from "@/lib/armazem-redis";
import { credenciaisKV } from "@/lib/credenciais-kv";
import type { AdaptadoresExecucao } from "@/lib/orquestrador";

function exigir(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`variável de ambiente ${nome} não configurada`);
  return valor;
}

/**
 * Modo simulado. Ligado por `FORNECEDORES_SIMULADOS=1`, é o que os testes de ponta a ponta da
 * §10.3 usam: exercita o app inteiro sem gastar uma chamada de API. NUNCA deve estar ligado em
 * produção — a tela de execução mostraria uma análise que ninguém fez.
 */
export function simulacaoLigada(): boolean {
  return process.env.FORNECEDORES_SIMULADOS === "1";
}

export function adaptadoresReais(simularFalhaEm?: string): AdaptadoresExecucao {
  if (simulacaoLigada()) {
    const respostas = respostasDemo(simularFalhaEm);
    return {
      anthropic: new FornecedorSimulado({
        fornecedor: "anthropic",
        modelo: process.env.MODEL_ESPECIALISTA ?? "claude-sonnet-5",
        esforco: "high",
        respostas,
        latencia_ms: 250,
      }),
      contrarian: new FornecedorSimulado({
        fornecedor: "openai",
        modelo: process.env.MODEL_CONTRARIAN ?? "gpt-5.6-luna",
        esforco: 0.7,
        respostas,
        latencia_ms: 250,
      }),
    };
  }

  return {
    anthropic: new FornecedorAnthropic(
      exigir("MODEL_ESPECIALISTA"),
      exigir("ANTHROPIC_API_KEY"),
    ),
    contrarian: new FornecedorOpenAI(exigir("MODEL_CONTRARIAN"), exigir("OPENAI_API_KEY")),
    // O planejamento roda em esforço próprio: ele organiza a análise, não a faz (§3.2).
    planejamento: new FornecedorAnthropic(
      exigir("MODEL_SUPERVISOR"),
      exigir("ANTHROPIC_API_KEY"),
      ESFORCO_PLANEJAMENTO,
    ),
  };
}

/** O supervisor pode usar um modelo diferente dos especialistas (§3.2). */
export function adaptadorSupervisor() {
  if (simulacaoLigada()) return adaptadoresReais().anthropic;
  return new FornecedorAnthropic(exigir("MODEL_SUPERVISOR"), exigir("ANTHROPIC_API_KEY"));
}

/**
 * Armazém de execução (§8.2).
 *
 * Com KV configurado, Redis efêmero com TTL de 2h. Sem ele, o adaptador em memória — que serve o
 * desenvolvimento local e os testes, e **só funciona porque ali há um processo só**. Na Vercel as
 * funções são efêmeras e não compartilham memória: sem Redis, o `GET` da tela pode cair numa
 * instância que nunca viu a execução disparada pelo `POST`.
 */
const armazemLocal = new ArmazemEmMemoria();

let armazemRedis: ArmazemExecucao | null = null;

export function armazem(): ArmazemExecucao {
  const credenciais = credenciaisKV();
  if (!credenciais) return armazemLocal;

  armazemRedis ??= new ArmazemRedis(credenciais.url, credenciais.token);
  return armazemRedis;
}

/** Verdadeiro quando o estado sobrevive entre instâncias. Exibido em /api/saude. */
export function armazemDuravel(): boolean {
  return credenciaisKV() !== null;
}

