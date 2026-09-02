"use client";

/**
 * Botão que chama /api/saude e mostra o modelo efetivamente servido, com data e hora (§3.2).
 *
 * A verificação é sob demanda — ela gasta uma chamada barata a cada fornecedor e serve para o
 * ensaio antes da aula, não para carregar a cada visita.
 */

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Verificacao {
  fornecedor: string;
  modelo_configurado: string;
  modelo_servido?: string;
  verificado_em?: string;
  confere?: boolean;
  erro?: string;
}

export function VerificacaoSaude() {
  const [resultado, setResultado] = useState<{
    ok: boolean;
    verificado_em?: string;
    verificacoes?: Record<string, Verificacao>;
    erro?: string;
  } | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function verificar() {
    setCarregando(true);
    const r = await fetch("/api/saude");
    setResultado(await r.json());
    setCarregando(false);
  }

  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={verificar} disabled={carregando}>
        {carregando && <Loader2 className="animate-spin" />}
        verificar agora
      </Button>

      {resultado?.erro && <p className="text-sm text-destructive">{resultado.erro}</p>}

      {resultado?.verificacoes && (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2">Papel</th>
              <th className="py-2">Configurado</th>
              <th className="py-2">Servido</th>
              <th className="py-2">Verificado em</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(resultado.verificacoes).map(([papel, v]) => (
              <tr key={papel} className="border-t border-border">
                <td className="py-2">{papel}</td>
                <td className="py-2 font-mono text-xs">{v.modelo_configurado}</td>
                <td className="py-2 font-mono text-xs">
                  {v.erro ? (
                    <span className="text-destructive">{v.erro}</span>
                  ) : (
                    <span className={v.confere ? "text-secondary" : "text-destructive"}>
                      {v.modelo_servido}
                    </span>
                  )}
                </td>
                <td className="py-2 text-xs text-muted-foreground">
                  {v.verificado_em ? new Date(v.verificado_em).toLocaleString("pt-BR") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
