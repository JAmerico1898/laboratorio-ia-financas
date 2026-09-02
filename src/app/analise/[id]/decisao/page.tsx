import { Cabecalho } from "@/components/cabecalho";
import { PainelDecisao } from "@/components/painel-decisao";

export const metadata = { title: "Aprovação humana — Comitê de Crédito IA" };

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <Cabecalho />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <PainelDecisao execucaoId={id} />
      </main>
    </>
  );
}
