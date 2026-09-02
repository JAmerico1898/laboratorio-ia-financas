/**
 * Adaptador Anthropic — os quatro papéis Claude (spec §3.2).
 *
 * Duas armadilhas que a §3.2 documenta e este arquivo respeita:
 * - o identificador de modelo é completo como está (`claude-sonnet-5`); acrescentar sufixo de
 *   data produz identificador inválido;
 * - `temperature` foi removida dos modelos Claude atuais e devolve HTTP 400. O controle
 *   equivalente é `output_config.effort`.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { AdaptadorFornecedor, PedidoModelo, RespostaModelo } from "@/lib/fornecedores/tipos";

export type Esforco = "low" | "medium" | "high" | "xhigh" | "max";

/**
 * Esforço padrão dos papéis que **analisam**.
 *
 * A versão 1.1 do spec fixava "high". Medido em 2 de setembro de 2026, "high" leva de 70 s a
 * 351 s por chamada, e a execução tem quatro estágios sequenciais — o critério de 3 minutos da
 * §13.1 não fecha. Decisão do autor: "medium". A variável de ambiente existe para o ensaio
 * comparar níveis sem mexer no código.
 */
export const ESFORCO_ANALISE = (process.env.ESFORCO_CLAUDE ?? "medium") as Esforco;

/**
 * Esforço do **planejamento**, que é a exceção deliberada.
 *
 * O supervisor, na etapa de planejamento, não analisa: ele lê o dossiê e devolve as perguntas de
 * cada especialista e as lacunas que já enxerga. Medido: 61,2 s em "medium" para produzir 5,3 mil
 * tokens de perguntas — o estágio mais lento do caminho crítico, e o único cujo produto não é
 * juízo de crédito. Com ele em "low", a execução cabe nos 180 s da §13.1 com folga, e nenhuma
 * análise perde profundidade, porque nenhuma análise acontece aqui.
 */
export const ESFORCO_PLANEJAMENTO = (process.env.ESFORCO_PLANEJAMENTO ?? "low") as Esforco;

const MAX_TOKENS = 16_000;

export class FornecedorAnthropic implements AdaptadorFornecedor {
  readonly fornecedor = "anthropic" as const;
  readonly modelo: string;
  private readonly cliente: Anthropic;
  private readonly esforco: Esforco;

  constructor(modelo: string, apiKey: string, esforco: Esforco = ESFORCO_ANALISE) {
    if (!modelo) throw new Error("identificador do modelo Anthropic não configurado");
    if (/-\d{8}$/.test(modelo)) {
      throw new Error(
        `"${modelo}" tem sufixo de data. Os IDs Anthropic são completos como estão (§3.2).`,
      );
    }
    this.modelo = modelo;
    this.esforco = esforco;
    this.cliente = new Anthropic({ apiKey });
  }

  async gerar(pedido: PedidoModelo): Promise<RespostaModelo> {
    const inicio = Date.now();
    const usuario = pedido.correcao
      ? `${pedido.usuario}\n\n--- Correção ---\n${pedido.correcao}`
      : pedido.usuario;

    // Streaming, não `create`: o dossiê tem ~100 mil tokens e o pensamento adaptativo pode
    // levar minutos. Sem streaming, a requisição corre o risco de estourar o timeout HTTP do
    // SDK e ser repetida — o que colocaria em risco o critério de 3 minutos da §13.1.
    const resposta = await this.cliente.messages
      .stream({
        model: this.modelo,
        max_tokens: MAX_TOKENS,
        system: pedido.sistema,
        output_config: { effort: this.esforco, format: { type: "json_schema", schema: pedido.schema } },
        thinking: { type: "adaptive" },
        messages: [{ role: "user", content: usuario }],
      })
      .finalMessage();

    const texto = resposta.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    return {
      texto,
      modelo: this.modelo,
      fornecedor: this.fornecedor,
      esforco: this.esforco,
      tokens_entrada: resposta.usage.input_tokens,
      tokens_saida: resposta.usage.output_tokens,
      duracao_ms: Date.now() - inicio,
    };
  }

  /** Registra o modelo efetivamente servido, com data e hora (§3.2, camada 2). */
  async verificarSaude() {
    const m = await this.cliente.models.retrieve(this.modelo);
    return { modelo_servido: m.id, verificado_em: new Date().toISOString() };
  }
}
