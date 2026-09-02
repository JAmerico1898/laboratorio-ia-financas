import Link from "next/link";

export function Cabecalho() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-heading text-lg font-extrabold text-primary">
          Comitê de Crédito IA
        </Link>
        <Link
          href="/sobre"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Como foi construído
        </Link>
      </div>
    </header>
  );
}
