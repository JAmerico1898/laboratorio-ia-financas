import { Cabecalho } from "@/components/cabecalho";
import { PainelLog } from "@/components/painel-log";

export const metadata = { title: "Log e custo — Comitê de Crédito IA" };

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <Cabecalho />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <PainelLog execucaoId={id} />
      </main>
    </>
  );
}
