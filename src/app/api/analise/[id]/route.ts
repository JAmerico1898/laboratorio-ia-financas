/**
 * GET /api/analise/[id] — estado atual, memo e log.
 *
 * Nunca devolve o conteúdo bruto dos arquivos enviados: o armazém guarda só LogExecucao e
 * análises (§8.2, §10.6).
 */

import { NextResponse } from "next/server";
import { armazem } from "@/lib/config-servidor";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const estado = await armazem().ler(id);
  if (!estado) {
    return NextResponse.json(
      { erro: "execução não encontrada ou expirada (o estado vive por 2 horas)" },
      { status: 404 },
    );
  }
  return NextResponse.json(estado);
}
