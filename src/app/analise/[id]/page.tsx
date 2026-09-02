/**
 * Tela de execução — spec §6.2. A tela mais importante do curso.
 */

import { Cabecalho } from "@/components/cabecalho";
import { PainelExecucao } from "@/components/painel-execucao";

export default async function Execucao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <Cabecalho />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <PainelExecucao execucaoId={id} />
      </main>
    </>
  );
}
