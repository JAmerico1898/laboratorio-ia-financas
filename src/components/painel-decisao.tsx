"use client";

/**
 * Aprovação humana (spec §6.4). Etapa obrigatória, sem atalho.
 *
 * "O aplicativo não concede crédito. A decisão registrada abaixo é sua." Essa frase não é
 * decorativa: ela é o requisito (§8.7).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { EstadoExecucao } from "@/lib/armazem";

type Acao = "aprovado" | "devolvido" | "rejeitado";

const EXIGE_COMENTARIO: Record<Acao, boolean> = {
  aprovado: false,
  devolvido: true,
  rejeitado: true,
};

const ROTULO: Record<Acao, string> = {
  aprovado: "Aprovar",
  devolvido: "Devolver com comentário",
  rejeitado: "Rejeitar",
};

export function PainelDecisao({ execucaoId }: { execucaoId: string }) {
  const [estado, setEstado] = useState<EstadoExecucao | null>(null);
  const [acao, setAcao] = useState<Acao>("aprovado");
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = () =>
    fetch(`/api/analise/${execucaoId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setEstado);

  useEffect(() => {
    // `recarregar` fecha sobre execucaoId e nada mais; recriá-la a cada render não muda nada.
    void fetch(`/api/analise/${execucaoId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setEstado);
  }, [execucaoId]);

  if (!estado) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> carregando…
      </p>
    );
  }

  const decisao = estado.log.decisao_humana;
  if (decisao) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Decisão registrada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="font-medium">{ROTULO[decisao.acao]}</span> em{" "}
            {new Date(decisao.em).toLocaleString("pt-BR")}.
          </p>
          {decisao.comentario && (
            <p className="rounded-lg bg-muted p-3 text-muted-foreground">{decisao.comentario}</p>
          )}
          <Button render={<Link href={`/analise/${execucaoId}/log`} />}>
            Ver o log e o custo da execução
          </Button>
        </CardContent>
      </Card>
    );
  }

  const comentarioOk = !EXIGE_COMENTARIO[acao] || comentario.trim().length >= 20;

  async function registrar() {
    setEnviando(true);
    setErro(null);
    const r = await fetch(`/api/analise/${execucaoId}/decisao`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao, comentario: comentario.trim() || undefined }),
    });
    if (!r.ok) {
      setErro((await r.json()).erro ?? "não foi possível registrar a decisão");
      setEnviando(false);
      return;
    }
    await recarregar();
    setEnviando(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Decisão</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
          O aplicativo não concede crédito. A decisão registrada abaixo é sua.
        </p>

        <div className="flex flex-wrap gap-2">
          {(["aprovado", "devolvido", "rejeitado"] as Acao[]).map((a) => (
            <Button
              key={a}
              variant={acao === a ? "default" : "outline"}
              onClick={() => setAcao(a)}
            >
              {ROTULO[a]}
            </Button>
          ))}
        </div>

        <div>
          <Label htmlFor="comentario">
            {EXIGE_COMENTARIO[acao]
              ? "Justificativa (obrigatória, mínimo 20 caracteres)"
              : "Comentário (opcional)"}
          </Label>
          <textarea
            id="comentario"
            rows={4}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-sm"
          />
          {EXIGE_COMENTARIO[acao] && !comentarioOk && (
            <p className="mt-1 text-xs text-muted-foreground">
              {comentario.trim().length} de 20 caracteres.
            </p>
          )}
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <Button size="lg" disabled={!comentarioOk || enviando} onClick={registrar}>
          {enviando && <Loader2 className="animate-spin" />}
          Registrar decisão
        </Button>
      </CardContent>
    </Card>
  );
}
