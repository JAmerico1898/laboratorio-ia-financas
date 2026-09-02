"use client";

/**
 * Credit memo (spec §6.3).
 *
 * O interruptor com/sem contrarian não faz nova chamada de API: as duas versões foram
 * consolidadas em paralelo durante a execução (§3.1, etapa 5) e já estão nesta página.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Loader2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { EstadoExecucao } from "@/lib/armazem";
import type { CreditMemo, Evidencia } from "@/lib/schema";
import { leitura } from "@/lib/escala";
import { memoEmMarkdown } from "@/lib/memo-markdown";

const FAIXA: Record<CreditMemo["recomendacao"], { texto: string; classe: string }> = {
  conceder: { texto: "Conceder", classe: "bg-secondary text-secondary-foreground" },
  conceder_com_condicoes: {
    texto: "Conceder com condições",
    classe: "bg-[#d97706] text-white",
  },
  nao_conceder: { texto: "Não conceder", classe: "bg-destructive text-white" },
};

function baixar(nome: string, conteudo: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

export function PainelMemo({ execucaoId }: { execucaoId: string }) {
  const [estado, setEstado] = useState<EstadoExecucao | null>(null);
  const [comContrarian, setComContrarian] = useState(true);
  const [evidencia, setEvidencia] = useState<Evidencia | null>(null);

  useEffect(() => {
    void fetch(`/api/analise/${execucaoId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((e: EstadoExecucao | null) => {
        setEstado(e);
        setComContrarian(Boolean(e?.memo_com_contrarian));
      });
  }, [execucaoId]);

  if (!estado) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> carregando o memo…
      </p>
    );
  }

  const memo = comContrarian ? estado.memo_com_contrarian : estado.memo_sem_contrarian;
  if (!memo) {
    return <p className="text-sm text-muted-foreground">Esta execução não produziu memo.</p>;
  }

  const faixa = FAIXA[memo.recomendacao];
  const temAsDuas = Boolean(estado.memo_com_contrarian && estado.memo_sem_contrarian);

  return (
    <div className="space-y-6">
      <div className={`rounded-xl px-6 py-5 ${faixa.classe}`}>
        <p className="font-heading text-2xl font-extrabold">
          {faixa.texto} — {memo.classificacao}
        </p>
        <p className="mt-1 text-sm opacity-90">
          {leitura(memo.classificacao)} · score consolidado {memo.score_consolidado.toFixed(1)} ·{" "}
          {memo.contraparte.nome}
        </p>
      </div>

      {temAsDuas && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div>
            <Label htmlFor="alternar">Exibir o memo com a revisão contrarian</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              As duas versões foram consolidadas durante a execução. Alternar não faz nova chamada
              de API.
            </p>
          </div>
          <Switch id="alternar" checked={comContrarian} onCheckedChange={setComContrarian} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Síntese</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {memo.sintese.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quadro de indicadores</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2">Indicador</th>
                <th className="py-2 text-right">2023</th>
                <th className="py-2 text-right">2024</th>
                <th className="py-2 text-right">2025</th>
                <th className="py-2">Origem</th>
              </tr>
            </thead>
            <tbody>
              {memo.quadro_indicadores.map((q, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-2">{q.indicador}</td>
                  <td className="py-2 text-right">{q.v2023?.toFixed(1) ?? "—"}</td>
                  <td className="py-2 text-right">{q.v2024?.toFixed(1) ?? "—"}</td>
                  <td className="py-2 text-right">{q.v2025?.toFixed(1) ?? "—"}</td>
                  <td className="py-2 text-xs text-muted-foreground">{q.origem}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leitura do negócio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-line text-sm">{memo.leitura_do_negocio}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riscos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {memo.riscos.map((r, i) => (
            <div key={i} className="rounded-lg border border-border p-3">
              <p className="text-sm">{r.descricao}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline">probabilidade {r.probabilidade}</Badge>
                <Badge variant="outline">severidade {r.severidade}</Badge>
                <button
                  onClick={() => setEvidencia(r.evidencia)}
                  className="text-xs text-primary underline-offset-4 hover:underline"
                >
                  ver evidência
                </button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Divergências</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {memo.divergencias.length === 0 ? (
            <p className="text-muted-foreground">
              Nenhuma divergência registrada. A ausência também é informação.
            </p>
          ) : (
            memo.divergencias.map((d, i) => (
              <div key={i}>
                <p className="font-medium">{d.tema}</p>
                <ul className="mt-1 space-y-1 text-muted-foreground">
                  {d.posicoes.map((p, j) => (
                    <li key={j}>
                      <span className="font-medium text-foreground">{p.papel}</span>: {p.posicao}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Condições sugeridas</CardTitle>
          </CardHeader>
          <CardContent>
            {memo.condicoes_sugeridas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Não aplicável para esta recomendação.
              </p>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {memo.condicoes_sugeridas.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informação ausente</CardTitle>
          </CardHeader>
          <CardContent>
            {memo.informacao_ausente.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada registrado como ausente.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {memo.informacao_ausente.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              baixar(`credit-memo-${execucaoId}.md`, memoEmMarkdown(memo), "text/markdown")
            }
          >
            <Download /> memo em Markdown
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              baixar(
                `log-${execucaoId}.json`,
                JSON.stringify(estado.log, null, 2),
                "application/json",
              )
            }
          >
            <Download /> log em JSON
          </Button>
        </div>
        <Button size="lg" render={<Link href={`/analise/${execucaoId}/decisao`} />}>
          Ir para a decisão
        </Button>
      </div>

      {evidencia && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-foreground/20"
          onClick={() => setEvidencia(null)}
        >
          <aside
            className="h-full w-full max-w-md overflow-auto bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="font-heading text-lg font-bold">Evidência</h2>
              <button onClick={() => setEvidencia(null)} aria-label="fechar">
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-4 text-sm">{evidencia.afirmacao}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Origem</dt>
                <dd>{evidencia.origem}</dd>
              </div>
              {evidencia.valor !== undefined && (
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Valor</dt>
                  <dd>R$ {evidencia.valor.toFixed(1)} milhões</dd>
                </div>
              )}
              {evidencia.exercicio && (
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Exercício</dt>
                  <dd>{evidencia.exercicio}</dd>
                </div>
              )}
            </dl>
          </aside>
        </div>
      )}
    </div>
  );
}
