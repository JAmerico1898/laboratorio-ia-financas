"use client";

/**
 * Log e custo (spec §6.5).
 *
 * Não é possível chegar aqui sem passar pela decisão humana (§13.5): enquanto a execução estiver
 * em "aguardando_decisao", esta tela redireciona para a decisão.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EstadoExecucao } from "@/lib/armazem";
import { formatarUsd, formatarBrl } from "@/lib/custo";
import { CORES_GRAFICO } from "@/config/graficos";
import { CAMBIO_USD_BRL } from "@/config/precos";

export function PainelLog({ execucaoId }: { execucaoId: string }) {
  const [estado, setEstado] = useState<EstadoExecucao | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    void fetch(`/api/analise/${execucaoId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((e) => {
        setEstado(e);
        setCarregando(false);
      });
  }, [execucaoId]);

  if (carregando) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> carregando o log…
      </p>
    );
  }
  if (!estado) {
    return <p className="text-sm text-muted-foreground">Execução não encontrada ou expirada.</p>;
  }

  if (!estado.log.decisao_humana) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">O log ainda não está liberado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            A decisão humana é etapa obrigatória. O log da execução só é liberado depois dela.
          </p>
          <Button render={<Link href={`/analise/${execucaoId}/decisao`} />}>
            Ir para a decisão
          </Button>
        </CardContent>
      </Card>
    );
  }

  const dados = estado.log.chamadas.map((c) => ({
    etapa: c.etapa,
    custo: Number(c.custo_usd.toFixed(5)),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold">Log da execução</h1>
        <p className="text-sm text-muted-foreground">
          {estado.log.chamadas.length} chamadas ·{" "}
          {(estado.log.duracao_ms / 1000).toFixed(1)} s ·{" "}
          {estado.log.divergencias_detectadas} divergências registradas
        </p>
      </div>

      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2">Etapa</th>
                <th className="py-2">Fornecedor</th>
                <th className="py-2">Modelo</th>
                <th className="py-2">Esforço</th>
                <th className="py-2 text-right">Entrada</th>
                <th className="py-2 text-right">Saída</th>
                <th className="py-2 text-right">Tempo</th>
                <th className="py-2 text-right">Custo</th>
              </tr>
            </thead>
            <tbody>
              {estado.log.chamadas.map((c, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-2">
                    {c.etapa}
                    {c.erro && <span className="ml-2 text-xs text-destructive">erro</span>}
                  </td>
                  <td className="py-2">{c.fornecedor}</td>
                  <td className="py-2 font-mono text-xs">{c.modelo}</td>
                  <td className="py-2">{String(c.esforco)}</td>
                  <td className="py-2 text-right">{c.tokens_entrada.toLocaleString("pt-BR")}</td>
                  <td className="py-2 text-right">{c.tokens_saida.toLocaleString("pt-BR")}</td>
                  <td className="py-2 text-right">{(c.duracao_ms / 1000).toFixed(1)} s</td>
                  <td className="py-2 text-right">{formatarUsd(c.custo_usd)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-medium">
                <td className="py-2" colSpan={7}>
                  Custo total da execução
                </td>
                <td className="py-2 text-right">{formatarUsd(estado.log.custo_total_usd)}</td>
              </tr>
              <tr>
                <td className="py-1 text-xs text-muted-foreground" colSpan={7}>
                  Equivalente em reais pela taxa fixa de {CAMBIO_USD_BRL.taxa} declarada em{" "}
                  <code>precos.ts</code> ({CAMBIO_USD_BRL.consultado_em})
                </td>
                <td className="py-1 text-right text-xs text-muted-foreground">
                  {formatarBrl(estado.log.custo_total_usd)}
                </td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custo por etapa</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} margin={{ left: 8, right: 8, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="etapa" angle={-35} textAnchor="end" interval={0} fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v) => formatarUsd(Number(v))} />
              <Bar dataKey="custo" fill={CORES_GRAFICO.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        onClick={() => {
          const url = URL.createObjectURL(
            new Blob([JSON.stringify(estado.log, null, 2)], { type: "application/json" }),
          );
          const a = document.createElement("a");
          a.href = url;
          a.download = `log-${execucaoId}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }}
      >
        <Download /> baixar o LogExecucao em JSON
      </Button>
    </div>
  );
}
