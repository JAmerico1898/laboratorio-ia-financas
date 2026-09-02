/**
 * A interface que os dois fornecedores implementam.
 *
 * O orquestrador só conhece este contrato. É o que permite a Fase 1 inteira rodar com
 * adaptadores simulados, sem gastar uma chamada de API (spec §15, decisão 7).
 */

import type { Fornecedor } from "@/lib/schema";

export interface PedidoModelo {
  /** Prompt de sistema do papel. */
  sistema: string;
  /** Mensagem do usuário: o dossiê, o plano, ou as análises a revisar. */
  usuario: string;
  /** Anexado no reenvio único, quando a primeira resposta não validou. */
  correcao?: string;
  /**
   * O contrato da §4 em JSON Schema. Vai para a saída estruturada dos dois fornecedores — é o
   * "schema fornecido" de que o preâmbulo dos prompts fala.
   */
  schema: Record<string, unknown>;
}

export interface RespostaModelo {
  texto: string;
  modelo: string;
  fornecedor: Fornecedor;
  /** "high" nos papéis Claude, 0.7 no contrarian (§3.2). */
  esforco: string | number;
  tokens_entrada: number;
  tokens_saida: number;
  duracao_ms: number;
}

export interface AdaptadorFornecedor {
  readonly fornecedor: Fornecedor;
  readonly modelo: string;
  gerar(pedido: PedidoModelo): Promise<RespostaModelo>;
  /** Modelo efetivamente servido, para /api/saude (§3.2). */
  verificarSaude(): Promise<{ modelo_servido: string; verificado_em: string }>;
}
