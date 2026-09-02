/**
 * Armazém de execução (spec §8.2).
 *
 * Guarda EXCLUSIVAMENTE o LogExecucao e as análises concluídas. Os arquivos enviados pelo
 * usuário e o texto extraído deles nunca entram aqui — é armazenamento de estado de execução,
 * não banco de dados, e a distinção é a própria matéria da §8.
 *
 * O adaptador em memória serve os testes e o desenvolvimento local; em produção entra o Redis
 * efêmero com TTL de 2 horas, que expira sozinho, sem rotina de limpeza.
 */

import type { AnaliseAgente, CreditMemo, LogExecucao, PlanoDeAnalise } from "@/lib/schema";

export type EstadoAgente = "aguardando" | "executando" | "concluido" | "erro";

export interface EstadoExecucao {
  execucao_id: string;
  estado: "executando" | "aguardando_decisao" | "concluida" | "erro";
  contrarian_habilitado: boolean;
  contraparte: { nome: string; cnpj: string };
  operacao: { valor_reais: number; prazo_meses: number; modalidade: string; data_base: string };
  agentes: Record<string, { estado: EstadoAgente; erro?: string }>;
  plano?: PlanoDeAnalise;
  analises: AnaliseAgente[];
  /** As duas versões, consolidadas em paralelo (§3.1, etapa 5). */
  memo_com_contrarian?: CreditMemo;
  memo_sem_contrarian?: CreditMemo;
  log: LogExecucao;
}

export interface ArmazemExecucao {
  salvar(estado: EstadoExecucao): Promise<void>;
  ler(execucao_id: string): Promise<EstadoExecucao | null>;
}

/** TTL de 2 horas, como no Redis de produção. Aqui serve para o teste de expiração. */
export const TTL_MS = 2 * 60 * 60 * 1000;

export class ArmazemEmMemoria implements ArmazemExecucao {
  private readonly dados = new Map<string, { estado: EstadoExecucao; expira_em: number }>();
  private readonly agora: () => number;

  constructor(agora: () => number = Date.now) {
    this.agora = agora;
  }

  async salvar(estado: EstadoExecucao): Promise<void> {
    // Cópia profunda: o armazém não compartilha referência com quem escreveu, do mesmo modo
    // que o Redis não compartilharia.
    this.dados.set(estado.execucao_id, {
      estado: structuredClone(estado),
      expira_em: this.agora() + TTL_MS,
    });
  }

  async ler(execucao_id: string): Promise<EstadoExecucao | null> {
    const registro = this.dados.get(execucao_id);
    if (!registro) return null;
    if (this.agora() >= registro.expira_em) {
      this.dados.delete(execucao_id);
      return null;
    }
    return structuredClone(registro.estado);
  }
}
