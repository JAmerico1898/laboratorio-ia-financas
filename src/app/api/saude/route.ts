/**
 * GET /api/saude — verifica se as duas chaves respondem e registra o modelo EFETIVAMENTE
 * servido, com data e hora (§3.2, camada 2 da reprodutibilidade).
 *
 * É esse registro que se compara entre o ensaio e a aula. Usado antes da aula, não em produção
 * a cada execução.
 */

import { NextResponse } from "next/server";
import { adaptadoresReais, adaptadorSupervisor, armazemDuravel } from "@/lib/config-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const verificacoes: Record<string, unknown> = {};
  let tudoBem = true;

  const alvos = () => {
    const { anthropic, contrarian } = adaptadoresReais();
    return {
      supervisor: adaptadorSupervisor(),
      especialistas: anthropic,
      contrarian,
    };
  };

  let papeis: ReturnType<typeof alvos>;
  try {
    papeis = alvos();
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }

  for (const [papel, adaptador] of Object.entries(papeis)) {
    try {
      const saude = await adaptador.verificarSaude();
      verificacoes[papel] = {
        fornecedor: adaptador.fornecedor,
        modelo_configurado: adaptador.modelo,
        ...saude,
        confere: saude.modelo_servido === adaptador.modelo,
      };
    } catch (e) {
      tudoBem = false;
      verificacoes[papel] = {
        fornecedor: adaptador.fornecedor,
        modelo_configurado: adaptador.modelo,
        erro: e instanceof Error ? e.message : String(e),
      };
    }
  }

  return NextResponse.json(
    {
      ok: tudoBem && armazemDuravel(),
      verificado_em: new Date().toISOString(),
      // Sem Redis, o estado não sobrevive entre instâncias e a tela de execução quebra em
      // produção. É condição de saúde, não detalhe de infraestrutura (§8.2).
      armazem_duravel: armazemDuravel(),
      verificacoes,
    },
    { status: tudoBem && armazemDuravel() ? 200 : 503 },
  );
}
