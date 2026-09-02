import { Cabecalho } from "@/components/cabecalho";
import { PainelMemo } from "@/components/painel-memo";

export const metadata = { title: "Credit memo — Comitê de Crédito IA" };

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <Cabecalho />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <PainelMemo execucaoId={id} />
      </main>
    </>
  );
}
