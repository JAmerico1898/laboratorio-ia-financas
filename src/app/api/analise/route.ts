/**
 * POST /api/analise — recebe arquivos e parâmetros, cria a execução e dispara a orquestração.
 *
 * Nenhuma chamada a fornecedor de modelo parte do navegador (§7). Os arquivos enviados vivem
 * apenas em memória durante a extração e nunca são gravados (§8.2).
 */

import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { executarAnalise } from "@/lib/orquestrador";
import { adaptadoresReais, armazem, simulacaoLigada } from "@/lib/config-servidor";
import { publicar } from "@/lib/barramento";
import { extrair } from "@/lib/extracao";
import { dossieEntradaSchema, type DossieEntrada } from "@/lib/schema";
import { cnpjValido } from "@/lib/cnpj";
import { registrarExecucao, dentroDoLimite, tetoAtingido, registrarCusto, LIMITE_POR_IP_HORA } from "@/lib/limites";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_ARQUIVOS = 5;
const MAX_BYTES = 20 * 1024 * 1024;

async function dossieDemo(): Promise<DossieEntrada> {
  const caminho = path.join(process.cwd(), "public", "demo", "dossie-casas-bahia.json");
  return dossieEntradaSchema.parse(JSON.parse(await readFile(caminho, "utf8")));
}

export async function POST(req: Request) {
  // Teto global de custo: ao ser atingido, desativa a execução e avisa — nunca falha em
  // silêncio (§8.6).
  if (tetoAtingido()) {
    return NextResponse.json(
      {
        erro: "O teto mensal de custo deste aplicativo foi atingido. A execução está desativada até o próximo mês.",
      },
      { status: 503 },
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!dentroDoLimite(ip)) {
    return NextResponse.json(
      {
        erro: `Limite de ${LIMITE_POR_IP_HORA()} execuções por hora atingido. Tente novamente mais tarde.`,
      },
      { status: 429 },
    );
  }

  const form = await req.formData();
  const usarDemo = form.get("demo") === "true";
  const incluir_contrarian = form.get("incluir_contrarian") !== "false";

  let dossie: DossieEntrada;

  if (usarDemo) {
    dossie = await dossieDemo();
  } else {
    const nome = String(form.get("nome") ?? "").trim();
    const cnpj = String(form.get("cnpj") ?? "").trim();
    if (!nome) return NextResponse.json({ erro: "nome da contraparte é obrigatório" }, { status: 400 });
    if (!cnpjValido(cnpj)) return NextResponse.json({ erro: "CNPJ inválido" }, { status: 400 });

    const arquivos = form.getAll("arquivos").filter((a): a is File => a instanceof File);
    if (arquivos.length === 0) {
      return NextResponse.json({ erro: "envie ao menos um arquivo" }, { status: 400 });
    }
    if (arquivos.length > MAX_ARQUIVOS) {
      return NextResponse.json({ erro: `no máximo ${MAX_ARQUIVOS} arquivos` }, { status: 400 });
    }
    for (const a of arquivos) {
      if (a.size > MAX_BYTES) {
        return NextResponse.json({ erro: `"${a.name}" passa de 20 MB` }, { status: 400 });
      }
    }

    const documentos = [];
    for (const arquivo of arquivos) {
      const bytes = new Uint8Array(await arquivo.arrayBuffer());
      documentos.push({
        titulo: arquivo.name,
        origem: `arquivo enviado: ${arquivo.name}`,
        texto: await extrair(arquivo.name, bytes),
      });
      // `bytes` sai de escopo aqui: o conteúdo do arquivo não é guardado em lugar nenhum.
    }

    const bruto = {
      contraparte: { nome, cnpj },
      operacao: {
        valor_reais: Number(form.get("valor_reais")),
        prazo_meses: Number(form.get("prazo_meses")),
        modalidade: String(form.get("modalidade") ?? "capital de giro"),
        data_base: String(form.get("data_base") ?? ""),
      },
      documentos,
    };

    const validado = dossieEntradaSchema.safeParse(bruto);
    if (!validado.success) {
      return NextResponse.json(
        { erro: validado.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
        { status: 400 },
      );
    }
    dossie = validado.data;
  }

  const execucao_id = randomUUID();
  registrarExecucao(ip);

  // Dispara e não espera: o cliente acompanha por SSE. Um erro aqui não pode derrubar a rota.
  //
  // `waitUntil` NÃO é detalhe: sem ele a orquestração não acontece em produção. A Vercel congela
  // a instância assim que a resposta sai, e um `void promessa` morre no 202 — medido em
  // 2 de setembro de 2026, a execução ficava oito minutos em "aguardando", com zero chamadas no
  // log. `waitUntil` mantém a função viva até a promessa terminar, dentro do `maxDuration`.
  const execucao = executarAnalise({
    execucao_id,
    dossie,
    incluir_contrarian,
    // Campo de teste: só existe efeito quando FORNECEDORES_SIMULADOS=1. Em produção o valor
    // é ignorado, porque adaptadoresReais() nem olha para ele fora do modo simulado.
    adaptadores: adaptadoresReais(
      simulacaoLigada() ? String(form.get("simular_falha_em") ?? "") || undefined : undefined,
    ),
    armazem: armazem(),
    aoEvento: (evento) => publicar(execucao_id, evento),
  })
    .then((estado) => registrarCusto(estado.log.custo_total_usd))
    .catch(async (e: unknown) => {
      const erro = e instanceof Error ? e.message : String(e);
      publicar(execucao_id, { tipo: "agente_falhou", agente: "supervisor", erro });
      // Marca a execução como falha no armazém: sem isto a tela ficaria "executando" para sempre.
      const estado = await armazem().ler(execucao_id);
      if (estado) {
        estado.estado = "erro";
        estado.agentes.supervisor = { estado: "erro", erro };
        await armazem().salvar(estado);
      }
    });

  waitUntil(execucao);

  return NextResponse.json({ execucao_id }, { status: 202 });
}
