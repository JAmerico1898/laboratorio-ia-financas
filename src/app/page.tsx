/**
 * Tela de entrada — spec §6.1.
 */

import { Cabecalho } from "@/components/cabecalho";
import { FormularioEntrada } from "@/components/formulario-entrada";

export default function Home() {
  return (
    <>
      <Cabecalho />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-heading text-3xl font-extrabold text-foreground">
          Análise de crédito por arquitetura multiagente
        </h1>
        <div className="mt-4 space-y-1 text-sm text-muted-foreground">
          <p>
            Quatro agentes analisam a contraparte em paralelo — financeiro, setorial e
            jurídico-regulatório em um fornecedor, um revisor contrarian em outro.
          </p>
          <p>
            Um supervisor consolida o credit memo e registra onde os agentes divergiram, em vez de
            escolher em silêncio.
          </p>
          <p className="font-medium text-foreground">
            O aplicativo não concede crédito. A decisão final é sempre de uma pessoa.
          </p>
        </div>

        <FormularioEntrada />
      </main>
    </>
  );
}
