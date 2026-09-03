/**
 * Armazém de execução em Redis efêmero (spec §8.2).
 *
 * Por que ele é obrigatório em produção, e não um luxo: na Vercel as funções são efêmeras e não
 * compartilham memória. O `POST /api/analise` que dispara a orquestração pode rodar numa
 * instância, e o `GET /api/analise/[id]` que a tela consulta, em outra — que não conheceria a
 * execução. O adaptador em memória serve os testes e o desenvolvimento local; em produção, sem
 * Redis, a tela de execução ficaria em "não encontrada" no meio da aula.
 *
 * Guarda EXCLUSIVAMENTE `LogExecucao`, plano, análises e memos, com TTL de 2 horas — expira
 * sozinho, sem rotina de limpeza. Os arquivos enviados pelo usuário e o texto extraído deles
 * nunca entram aqui. É armazenamento de estado de execução, não banco de dados, e a distinção é
 * a própria matéria da §8.
 *
 * Fala com a API REST do Upstash por `fetch`, sem SDK: são duas rotas.
 */

import type { ArmazemExecucao, EstadoExecucao } from "@/lib/armazem";
import { TTL_MS } from "@/lib/armazem";

const TTL_SEGUNDOS = Math.floor(TTL_MS / 1000);

export class ArmazemRedis implements ArmazemExecucao {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {
    if (!url || !token) {
      throw new Error("ArmazemRedis exige KV_REST_API_URL e KV_REST_API_TOKEN");
    }
  }

  private chave(execucao_id: string): string {
    return `execucao:${execucao_id}`;
  }

  private get cabecalhos(): HeadersInit {
    return { Authorization: `Bearer ${this.token}` };
  }

  async salvar(estado: EstadoExecucao): Promise<void> {
    const resposta = await fetch(
      `${this.url}/set/${encodeURIComponent(this.chave(estado.execucao_id))}?EX=${TTL_SEGUNDOS}`,
      {
        method: "POST",
        headers: { ...this.cabecalhos, "Content-Type": "application/json" },
        body: JSON.stringify(estado),
        cache: "no-store",
      },
    );
    if (!resposta.ok) {
      throw new Error(`Redis recusou a gravação: HTTP ${resposta.status}`);
    }
  }

  async ler(execucao_id: string): Promise<EstadoExecucao | null> {
    const resposta = await fetch(
      `${this.url}/get/${encodeURIComponent(this.chave(execucao_id))}`,
      { headers: this.cabecalhos, cache: "no-store" },
    );
    if (!resposta.ok) return null;

    const { result } = (await resposta.json()) as { result: string | null };
    if (!result) return null;

    try {
      return JSON.parse(result) as EstadoExecucao;
    } catch {
      // Chave corrompida ou de uma versão anterior do formato: trate como inexistente. O TTL a
      // remove sozinha em no máximo duas horas.
      return null;
    }
  }
}
