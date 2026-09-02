/**
 * Barramento de eventos da execução, em processo.
 *
 * O SSE da §6.2 lê daqui enquanto a execução está viva. Se a página for recarregada e o
 * barramento não tiver mais o histórico — outra instância, outro processo —, a tela se
 * reconstrói a partir do armazém (§8.2), que é a fonte durável. O barramento é conveniência de
 * baixa latência, nunca a fonte de verdade.
 */

import type { EventoExecucao } from "@/lib/orquestrador";

type Ouvinte = (evento: EventoExecucao) => void;

const ouvintes = new Map<string, Set<Ouvinte>>();
const historico = new Map<string, EventoExecucao[]>();

export function publicar(execucao_id: string, evento: EventoExecucao): void {
  const lista = historico.get(execucao_id) ?? [];
  lista.push(evento);
  historico.set(execucao_id, lista);
  for (const ouvinte of ouvintes.get(execucao_id) ?? []) ouvinte(evento);
}

/** Assina os eventos futuros e devolve o que já passou, para o cliente não perder nada. */
export function assinar(
  execucao_id: string,
  ouvinte: Ouvinte,
): { anteriores: EventoExecucao[]; cancelar: () => void } {
  const conjunto = ouvintes.get(execucao_id) ?? new Set<Ouvinte>();
  conjunto.add(ouvinte);
  ouvintes.set(execucao_id, conjunto);
  return {
    anteriores: [...(historico.get(execucao_id) ?? [])],
    cancelar: () => {
      conjunto.delete(ouvinte);
      if (conjunto.size === 0) ouvintes.delete(execucao_id);
    },
  };
}

export function esquecer(execucao_id: string): void {
  ouvintes.delete(execucao_id);
  historico.delete(execucao_id);
}
