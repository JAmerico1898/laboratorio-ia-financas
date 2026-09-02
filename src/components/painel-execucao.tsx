"use client";

/**
 * Painel da tela de execução (spec §6.2).
 *
 * Cinco cartões, um por agente. Os três especialistas aparecem lado a lado, com barras
 * simultâneas, para que o paralelismo seja perceptível; o contrarian aparece abaixo, ligado aos
 * três por um traço, deixando claro que ele só começa depois.
 *
 * O primeiro evento do SSE é o estado completo lido do armazém — é o que faz a página se
 * reconstruir quando recarregada no meio da execução.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleDashed, Loader2, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EstadoAgente, EstadoExecucao } from "@/lib/armazem";
import type { AnaliseAgente } from "@/lib/schema";

const ROTULOS: Record<string, string> = {
  supervisor: "Supervisor",
  financeiro: "Analista financeiro",
  setorial: "Analista setorial",
  juridico_regulatorio: "Analista jurídico-regulatório",
  contrarian: "Revisor contrarian",
};

function Estado({ estado }: { estado: EstadoAgente }) {
  if (estado === "executando")
    return (
      <span className="flex items-center gap-1.5 text-xs text-primary">
        <Loader2 className="size-3.5 animate-spin" /> executando
      </span>
    );
  if (estado === "concluido")
    return (
      <span className="flex items-center gap-1.5 text-xs text-secondary">
        <CheckCircle2 className="size-3.5" /> concluído
      </span>
    );
  if (estado === "erro")
    return (
      <span className="flex items-center gap-1.5 text-xs text-destructive">
        <TriangleAlert className="size-3.5" /> erro
      </span>
    );
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <CircleDashed className="size-3.5" /> aguardando
    </span>
  );
}

function CartaoAgente({
  papel,
  estado,
  erro,
  analise,
  modelo,
  fornecedor,
  chamada,
}: {
  papel: string;
  estado: EstadoAgente;
  erro?: string;
  analise?: AnaliseAgente;
  modelo: string;
  fornecedor: string;
  chamada?: { tokens_entrada: number; tokens_saida: number; duracao_ms: number };
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <Card className="h-full">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{ROTULOS[papel] ?? papel}</CardTitle>
          <Estado estado={estado} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={fornecedor === "anthropic" ? "secondary" : "outline"}>
            {fornecedor}
          </Badge>
          <span className="font-mono text-xs text-muted-foreground">{modelo}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {estado === "executando" && (
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
          </div>
        )}

        {chamada && (
          <p className="text-xs text-muted-foreground">
            {chamada.tokens_entrada.toLocaleString("pt-BR")} tokens de entrada ·{" "}
            {chamada.tokens_saida.toLocaleString("pt-BR")} de saída ·{" "}
            {(chamada.duracao_ms / 1000).toFixed(1)} s
          </p>
        )}

        {erro && <p className="text-xs text-destructive">{erro}</p>}

        {analise && (
          <>
            <p className="text-sm text-foreground">{analise.sintese}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {analise.classificacao} · score {analise.score.toFixed(1)}
              </span>
              <span>confiança {(analise.confianca * 100).toFixed(0)}%</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setAberto(!aberto)}>
              {aberto ? "esconder JSON" : "ver JSON da análise"}
            </Button>
            {aberto && (
              <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed">
                {JSON.stringify(analise, null, 2)}
              </pre>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function PainelExecucao({ execucaoId }: { execucaoId: string }) {
  const [estado, setEstado] = useState<EstadoExecucao | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const fonte = new EventSource(`/api/analise/${execucaoId}/stream`);
    const recarregar = async () => {
      const r = await fetch(`/api/analise/${execucaoId}`);
      if (r.ok) setEstado(await r.json());
      setCarregando(false);
    };

    fonte.onmessage = (e) => {
      const evento = JSON.parse(e.data);
      if (evento.tipo === "estado") {
        setEstado(evento.estado);
        setCarregando(false);
        return;
      }
      // Cada evento redesenha a partir da fonte durável: o SSE avisa, o armazém informa.
      void recarregar();
    };
    fonte.onerror = () => {
      fonte.close();
      void recarregar();
    };

    void recarregar();
    return () => fonte.close();
  }, [execucaoId]);

  if (carregando) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> carregando a execução…
      </p>
    );
  }
  if (!estado) {
    return (
      <p className="text-sm text-muted-foreground">
        Execução não encontrada ou expirada. O estado de execução vive por 2 horas.
      </p>
    );
  }

  const analisePor = (papel: string) => estado.analises.find((a) => a.papel === papel);
  const chamadaPor = (etapa: string) => estado.log.chamadas.find((c) => c.etapa === etapa);
  const especialistas = ["financeiro", "setorial", "juridico_regulatorio"];
  const memoPronto = Boolean(estado.memo_com_contrarian ?? estado.memo_sem_contrarian);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold">{estado.contraparte.nome}</h1>
        <p className="text-sm text-muted-foreground">
          CNPJ {estado.contraparte.cnpj} ·{" "}
          {estado.operacao.valor_reais.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            maximumFractionDigits: 0,
          })}{" "}
          · {estado.operacao.prazo_meses} meses · {estado.operacao.modalidade} · data-base{" "}
          {estado.operacao.data_base}
        </p>
      </div>

      <CartaoAgente
        papel="supervisor"
        estado={estado.agentes.supervisor.estado}
        erro={estado.agentes.supervisor.erro}
        modelo={chamadaPor("planejamento")?.modelo ?? "claude-sonnet-5"}
        fornecedor="anthropic"
        chamada={chamadaPor("planejamento")}
      />

      {estado.plano && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plano de análise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Lacunas já identificadas</p>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {estado.plano.lacunas.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium">Divergências esperadas</p>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {estado.plano.divergencias_esperadas.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
          Três especialistas, em paralelo
        </p>
        <div className="grid gap-4 lg:grid-cols-3">
          {especialistas.map((papel) => (
            <CartaoAgente
              key={papel}
              papel={papel}
              estado={estado.agentes[papel]?.estado ?? "aguardando"}
              erro={estado.agentes[papel]?.erro}
              analise={analisePor(papel)}
              modelo={chamadaPor(papel)?.modelo ?? "claude-sonnet-5"}
              fornecedor="anthropic"
              chamada={chamadaPor(papel)}
            />
          ))}
        </div>
      </div>

      {estado.contrarian_habilitado && (
        <div>
          <div className="mx-auto h-6 w-px bg-border" aria-hidden />
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            Só começa depois que os três terminam
          </p>
          <CartaoAgente
            papel="contrarian"
            estado={estado.agentes.contrarian?.estado ?? "aguardando"}
            erro={estado.agentes.contrarian?.erro}
            analise={analisePor("contrarian")}
            modelo={chamadaPor("contrarian")?.modelo ?? "—"}
            fornecedor="openai"
            chamada={chamadaPor("contrarian")}
          />
        </div>
      )}

      {memoPronto && (
        <div className="flex justify-end">
          <Button size="lg" render={<Link href={`/analise/${execucaoId}/memo`} />}>
            Ver o credit memo
          </Button>
        </div>
      )}
    </div>
  );
}
