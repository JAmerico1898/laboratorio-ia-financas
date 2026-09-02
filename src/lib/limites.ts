/**
 * Limite de uso (spec §8.6).
 *
 * Cinco execuções por IP por hora e um teto global mensal de custo. Ao atingir o teto, a
 * execução é desativada com aviso — nunca uma falha silenciosa.
 */

const JANELA_MS = 60 * 60 * 1000;

/** Lidos a cada chamada, e não uma vez na carga do módulo, para os testes poderem variá-los. */
const LIMITES = {
  get execucoes_por_ip_hora() {
    return Number(process.env.LIMITE_EXECUCOES_POR_IP_HORA ?? 5);
  },
  get teto_custo_mensal_usd() {
    return Number(process.env.TETO_CUSTO_MENSAL_USD ?? 50);
  },
};

const porIp = new Map<string, number[]>();
let custoDoMes = { mes: mesAtual(), usd: 0 };

function mesAtual(): string {
  return new Date().toISOString().slice(0, 7);
}

export function dentroDoLimite(ip: string, agora = Date.now()): boolean {
  const recentes = (porIp.get(ip) ?? []).filter((t) => agora - t < JANELA_MS);
  porIp.set(ip, recentes);
  return recentes.length < LIMITES.execucoes_por_ip_hora;
}

export function registrarExecucao(ip: string, agora = Date.now()): void {
  const recentes = (porIp.get(ip) ?? []).filter((t) => agora - t < JANELA_MS);
  recentes.push(agora);
  porIp.set(ip, recentes);
}

export function registrarCusto(usd: number): void {
  if (custoDoMes.mes !== mesAtual()) custoDoMes = { mes: mesAtual(), usd: 0 };
  custoDoMes.usd += usd;
}

export function tetoAtingido(): boolean {
  if (custoDoMes.mes !== mesAtual()) return false;
  return custoDoMes.usd >= LIMITES.teto_custo_mensal_usd;
}

export function custoDoMesUsd(): number {
  return custoDoMes.mes === mesAtual() ? custoDoMes.usd : 0;
}

/** Só para os testes: zera o estado entre casos. */
export function zerarLimites(): void {
  porIp.clear();
  custoDoMes = { mes: mesAtual(), usd: 0 };
}

/** Valor corrente do limite por IP, para a mensagem de erro da rota. */
export function LIMITE_POR_IP_HORA(): number {
  return LIMITES.execucoes_por_ip_hora;
}
