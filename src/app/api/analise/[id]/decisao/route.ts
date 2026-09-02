/**
 * POST /api/analise/[id]/decisao — registra a decisão humana (§6.4).
 *
 * "Devolver" e "rejeitar" exigem comentário de no mínimo 20 caracteres. A decisão é o requisito,
 * não a decoração: sem ela o log não é liberado (§13.5).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { armazem } from "@/lib/config-servidor";

export const runtime = "nodejs";

const corpoSchema = z
  .object({
    acao: z.enum(["aprovado", "devolvido", "rejeitado"]),
    comentario: z.string().optional(),
  })
  .refine((c) => c.acao === "aprovado" || (c.comentario ?? "").trim().length >= 20, {
    message: "devolver e rejeitar exigem comentário de no mínimo 20 caracteres",
    path: ["comentario"],
  });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const corpo = corpoSchema.safeParse(await req.json());
  if (!corpo.success) {
    return NextResponse.json({ erro: corpo.error.issues[0].message }, { status: 400 });
  }

  const estado = await armazem().ler(id);
  if (!estado) {
    return NextResponse.json({ erro: "execução não encontrada ou expirada" }, { status: 404 });
  }
  if (estado.estado !== "aguardando_decisao") {
    return NextResponse.json(
      { erro: `execução em estado "${estado.estado}" não aceita decisão` },
      { status: 409 },
    );
  }

  estado.log.decisao_humana = {
    acao: corpo.data.acao,
    comentario: corpo.data.comentario?.trim(),
    em: new Date().toISOString(),
  };
  estado.estado = "concluida";
  await armazem().salvar(estado);

  return NextResponse.json(estado.log.decisao_humana);
}
