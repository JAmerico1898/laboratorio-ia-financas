/**
 * GET /api/analise/[id]/stream — Server-Sent Events com o progresso da execução (§6.2).
 *
 * Duas fontes, de propósito:
 *
 * 1. O **barramento em processo**, que dá latência baixa quando a conexão do SSE caiu na mesma
 *    instância que está executando a análise.
 * 2. Uma **leitura periódica do armazém**, que é a fonte durável. Na Vercel as funções são
 *    efêmeras: o `POST` que disparou a orquestração pode estar noutra instância, e então o
 *    barramento desta aqui nunca recebe evento nenhum. Sem esta segunda fonte, a tela ficaria
 *    parada em "aguardando" durante a aula inteira.
 *
 * O primeiro evento é sempre o estado completo lido do armazém: é isso que faz a página se
 * reconstruir quando recarregada no meio da execução (§10.3, caso 4).
 */

import { assinar } from "@/lib/barramento";
import { armazem } from "@/lib/config-servidor";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Intervalo da leitura de reserva. Curto o bastante para a tela parecer viva. */
const INTERVALO_MS = 2_000;
/** Teto de segurança: nenhuma execução legítima passa disso, e o SSE não pode vazar para sempre. */
const LIMITE_MS = 290_000;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const codificador = new TextEncoder();

  const corpo = new ReadableStream({
    async start(controlador) {
      let fechado = false;
      let temporizador: ReturnType<typeof setInterval> | undefined;

      const enviar = (dados: unknown) => {
        if (fechado) return;
        try {
          controlador.enqueue(codificador.encode(`data: ${JSON.stringify(dados)}\n\n`));
        } catch {
          fechado = true;
        }
      };

      const encerrar = () => {
        if (fechado) return;
        fechado = true;
        clearInterval(temporizador);
        cancelar();
        try {
          controlador.close();
        } catch {
          // já fechado pelo cliente
        }
      };

      const estadoInicial = await armazem().ler(id);
      enviar({ tipo: "estado", estado: estadoInicial });

      const { anteriores, cancelar } = assinar(id, (evento) => {
        enviar(evento);
        if (evento.tipo === "execucao_concluida") encerrar();
      });
      for (const evento of anteriores) enviar(evento);

      if (estadoInicial && estadoInicial.estado !== "executando") {
        encerrar();
        return;
      }

      // Leitura de reserva: funciona mesmo quando a execução roda em outra instância.
      const comecou = Date.now();
      let assinaturaAnterior = JSON.stringify(estadoInicial ?? null);

      temporizador = setInterval(async () => {
        if (fechado) return;
        if (Date.now() - comecou > LIMITE_MS) {
          encerrar();
          return;
        }
        try {
          const estado = await armazem().ler(id);
          const assinatura = JSON.stringify(estado ?? null);
          if (assinatura !== assinaturaAnterior) {
            assinaturaAnterior = assinatura;
            enviar({ tipo: "estado", estado });
          }
          if (estado && estado.estado !== "executando") encerrar();
        } catch {
          // Falha de leitura é transitória: a próxima tentativa resolve.
        }
      }, INTERVALO_MS);
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
