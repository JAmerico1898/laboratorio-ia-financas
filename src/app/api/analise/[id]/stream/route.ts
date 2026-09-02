/**
 * GET /api/analise/[id]/stream — Server-Sent Events com o progresso da execução (§6.2).
 *
 * O primeiro evento é sempre o estado completo lido do armazém: é isso que faz a página se
 * reconstruir quando recarregada no meio da execução (§10.3, caso 4).
 */

import { assinar } from "@/lib/barramento";
import { armazem } from "@/lib/config-servidor";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const codificador = new TextEncoder();

  const corpo = new ReadableStream({
    async start(controlador) {
      const enviar = (dados: unknown) => {
        try {
          controlador.enqueue(codificador.encode(`data: ${JSON.stringify(dados)}\n\n`));
        } catch {
          // Cliente desconectou entre o evento e o enqueue; nada a fazer.
        }
      };

      const estado = await armazem().ler(id);
      enviar({ tipo: "estado", estado });

      const { anteriores, cancelar } = assinar(id, (evento) => {
        enviar(evento);
        if (evento.tipo === "execucao_concluida") {
          cancelar();
          try {
            controlador.close();
          } catch {
            // já fechado
          }
        }
      });

      for (const evento of anteriores) enviar(evento);

      if (estado?.estado && estado.estado !== "executando") {
        cancelar();
        try {
          controlador.close();
        } catch {
          // já fechado
        }
      }
    },
  });

  return new Response(corpo, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
