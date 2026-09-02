/**
 * Adaptador simulado — a Fase 1 inteira roda com ele, sem gastar uma chamada de API.
 *
 * Ele não imita a inteligência do modelo: devolve respostas canônicas válidas contra o contrato,
 * para que orquestração, telas, log e custo possam ser verificados de ponta a ponta. Os testes
 * injetam as respostas que quiserem, inclusive respostas quebradas, para exercitar o reenvio.
 */

import type { AdaptadorFornecedor, PedidoModelo, RespostaModelo } from "@/lib/fornecedores/tipos";
import type { Fornecedor, Papel } from "@/lib/schema";

/** Descobre o papel a partir do prompt de sistema, que é o que o adaptador real também recebe. */
export function papelDoPrompt(sistema: string): Papel | "supervisor" {
  if (sistema.includes("Você é o supervisor do comitê")) return "supervisor";
  if (sistema.includes("Você recebeu quatro análises") || sistema.includes("Você recebeu três análises"))
    return "supervisor";
  if (sistema.includes("Você é analista de crédito sênior")) return "financeiro";
  if (sistema.includes("Você analisa a posição competitiva")) return "setorial";
  if (sistema.includes("Você examina o que pode impedir")) return "juridico_regulatorio";
  if (sistema.includes("Você é o revisor independente")) return "contrarian";
  throw new Error("prompt de sistema não corresponde a nenhum papel conhecido");
}

export interface OpcoesSimulado {
  fornecedor: Fornecedor;
  modelo: string;
  esforco: string | number;
  /**
   * Respostas por chave. A chave é o papel, ou "consolidacao_com"/"consolidacao_sem" para
   * distinguir as duas consolidações. Uma função recebe o pedido e o número da tentativa.
   */
  respostas: Record<string, (pedido: PedidoModelo, tentativa: number) => string>;
  /** Latência simulada, para que as barras de progresso da §6.2 tenham o que mostrar. */
  latencia_ms?: number;
}

export class FornecedorSimulado implements AdaptadorFornecedor {
  readonly fornecedor: Fornecedor;
  readonly modelo: string;
  private readonly opcoes: OpcoesSimulado;
  private readonly tentativas = new Map<string, number>();

  constructor(opcoes: OpcoesSimulado) {
    this.opcoes = opcoes;
    this.fornecedor = opcoes.fornecedor;
    this.modelo = opcoes.modelo;
  }

  async gerar(pedido: PedidoModelo): Promise<RespostaModelo> {
    const inicio = Date.now();
    if (this.opcoes.latencia_ms) {
      await new Promise((r) => setTimeout(r, this.opcoes.latencia_ms));
    }

    const chave = this.chaveDe(pedido);
    const responder = this.opcoes.respostas[chave];
    if (!responder) {
      throw new Error(`adaptador simulado sem resposta para a chave "${chave}"`);
    }

    const tentativa = (this.tentativas.get(chave) ?? 0) + 1;
    this.tentativas.set(chave, tentativa);
    const texto = responder(pedido, tentativa);

    return {
      texto,
      modelo: this.modelo,
      fornecedor: this.fornecedor,
      esforco: this.opcoes.esforco,
      // Contagem grosseira, suficiente para exercitar a tela de custo sem inventar precisão.
      tokens_entrada: Math.ceil((pedido.sistema.length + pedido.usuario.length) / 4),
      tokens_saida: Math.ceil(texto.length / 4),
      duracao_ms: Date.now() - inicio,
    };
  }

  async verificarSaude() {
    return { modelo_servido: this.modelo, verificado_em: new Date().toISOString() };
  }

  private chaveDe(pedido: PedidoModelo): string {
    const papel = papelDoPrompt(pedido.sistema);
    if (papel !== "supervisor") return papel;
    if (pedido.sistema.includes("Você é o supervisor do comitê")) return "planejamento";
    return pedido.sistema.includes("Você recebeu quatro análises")
      ? "consolidacao_com"
      : "consolidacao_sem";
  }
}
