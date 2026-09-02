/**
 * Adaptador OpenAI — o contrarian (spec §3.2).
 *
 * O contrarian roda em outro fornecedor por exigência do §1.1: a independência do revisor é o
 * ponto pedagógico.
 *
 * **Correção de campo, 2026-09-02.** A §3.2 do spec 1.1 supunha que `temperature` continuaria
 * existindo do lado não-Anthropic e fixava 0,7. Não é o caso de `gpt-5.6-luna`, que responde
 * HTTP 400 — `Unsupported value: 'temperature' does not support 0.7 with this model. Only the
 * default (1) value is supported.` O parâmetro é omitido, e o modelo roda no padrão 1,0, que é
 * MAIS variável do que os 0,7 pretendidos: a variabilidade continua exatamente onde o objetivo é
 * gerar objeções. O log registra "padrão (1,0)" na coluna de esforço.
 */

import OpenAI from "openai";
import type { AdaptadorFornecedor, PedidoModelo, RespostaModelo } from "@/lib/fornecedores/tipos";
import { paraOpenAIEstrito, limparNulos } from "@/lib/schema-json";

const ESFORCO = "padrão (1,0)";

/** Reserializa o JSON sem os nulos que o modo estrito obriga a emitir. */
function limparTextoJson(bruto: string): string {
  try {
    return JSON.stringify(limparNulos(JSON.parse(bruto)));
  } catch {
    return bruto;
  }
}

export class FornecedorOpenAI implements AdaptadorFornecedor {
  readonly fornecedor = "openai" as const;
  readonly modelo: string;
  private readonly cliente: OpenAI;

  constructor(modelo: string, apiKey: string) {
    if (!modelo) {
      throw new Error(
        "MODEL_CONTRARIAN não configurado. Confirme o identificador na Models API antes de usar — não adivinhe (§15, decisão 3).",
      );
    }
    this.modelo = modelo;
    this.cliente = new OpenAI({ apiKey });
  }

  async gerar(pedido: PedidoModelo): Promise<RespostaModelo> {
    const inicio = Date.now();
    const usuario = pedido.correcao
      ? `${pedido.usuario}\n\n--- Correção ---\n${pedido.correcao}`
      : pedido.usuario;

    const resposta = await this.cliente.chat.completions.create({
      model: this.modelo,
      messages: [
        { role: "system", content: pedido.sistema },
        { role: "user", content: usuario },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "analise_agente",
          strict: true,
          schema: paraOpenAIEstrito(pedido.schema),
        },
      },
    });

    return {
      // O modo estrito obriga o modelo a emitir null nos campos opcionais; o contrato da §4 usa
      // ausência. A limpeza acontece aqui, na fronteira do fornecedor.
      texto: limparTextoJson(resposta.choices[0]?.message?.content ?? ""),
      modelo: this.modelo,
      fornecedor: this.fornecedor,
      esforco: ESFORCO,
      tokens_entrada: resposta.usage?.prompt_tokens ?? 0,
      tokens_saida: resposta.usage?.completion_tokens ?? 0,
      duracao_ms: Date.now() - inicio,
    };
  }

  async verificarSaude() {
    const m = await this.cliente.models.retrieve(this.modelo);
    return { modelo_servido: m.id, verificado_em: new Date().toISOString() };
  }
}
