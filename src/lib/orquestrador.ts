/**
 * Orquestrador (spec §3.1).
 *
 * Sequência: planejamento → três especialistas em PARALELO → contrarian (só depois dos três) →
 * duas consolidações em PARALELO. São 7 chamadas com o contrarian ligado e 5 com ele desligado.
 */

import {
  analiseAgenteSchema,
  creditMemoSchema,
  planoDeAnaliseSchema,
  type AnaliseAgente,
  type ChamadaLog,
  type CreditMemo,
  type DossieEntrada,
  type Papel,
  type PlanoDeAnalise,
} from "@/lib/schema";
import { comReenvioUnico } from "@/lib/parser";
import { JSON_SCHEMA_ANALISE, JSON_SCHEMA_MEMO, JSON_SCHEMA_PLANO } from "@/lib/schema-json";
import { custoChamadaUsd } from "@/lib/custo";
import type { AdaptadorFornecedor, PedidoModelo } from "@/lib/fornecedores/tipos";
import type { ArmazemExecucao, EstadoExecucao } from "@/lib/armazem";
import { PROMPT_FINANCEIRO, PROMPT_SETORIAL, PROMPT_JURIDICO } from "@/prompts/especialistas";
import { PROMPT_CONTRARIAN } from "@/prompts/contrarian";
import {
  PROMPT_SUPERVISOR_PLANEJAMENTO,
  PROMPT_SUPERVISOR_CONSOLIDACAO,
  PROMPT_SUPERVISOR_CONSOLIDACAO_SEM_CONTRARIAN,
} from "@/prompts/supervisor";

export type EventoExecucao =
  | { tipo: "agente_iniciou"; agente: string }
  | { tipo: "agente_concluiu"; agente: string; analise?: AnaliseAgente; plano?: PlanoDeAnalise }
  | { tipo: "agente_falhou"; agente: string; erro: string }
  | { tipo: "memo_pronto"; com_contrarian: boolean }
  | { tipo: "execucao_concluida" };

export interface AdaptadoresExecucao {
  /** Os papéis Claude que analisam ou consolidam. */
  anthropic: AdaptadorFornecedor;
  /** O contrarian, em outro fornecedor. */
  contrarian: AdaptadorFornecedor;
  /**
   * O planejamento, quando roda em esforço próprio. O supervisor não analisa nesta etapa: ele
   * organiza. Omitido, cai em `anthropic`.
   */
  planejamento?: AdaptadorFornecedor;
}

export interface OpcoesExecucao {
  execucao_id: string;
  dossie: DossieEntrada;
  incluir_contrarian: boolean;
  adaptadores: AdaptadoresExecucao;
  armazem: ArmazemExecucao;
  aoEvento?: (evento: EventoExecucao) => void;
}

const ESPECIALISTAS: Array<{ papel: Papel; sistema: string }> = [
  { papel: "financeiro", sistema: PROMPT_FINANCEIRO },
  { papel: "setorial", sistema: PROMPT_SETORIAL },
  { papel: "juridico_regulatorio", sistema: PROMPT_JURIDICO },
];

/** O dossiê em texto, um só para os dois fornecedores (§3.1, etapa 1). */
function dossieEmTexto(dossie: DossieEntrada): string {
  const cabecalho = [
    `Contraparte: ${dossie.contraparte.nome} (CNPJ ${dossie.contraparte.cnpj})`,
    `Operação: R$ ${dossie.operacao.valor_reais.toLocaleString("pt-BR")}, ${dossie.operacao.prazo_meses} meses, ${dossie.operacao.modalidade}`,
    `Data-base: ${dossie.operacao.data_base}`,
  ].join("\n");
  const documentos = dossie.documentos
    .map((d) => `### ${d.titulo}\nOrigem: ${d.origem}\n\n${d.texto}`)
    .join("\n\n");
  return `${cabecalho}\n\n--- DOSSIÊ ---\n\n${documentos}`;
}

export async function executarAnalise(opcoes: OpcoesExecucao): Promise<EstadoExecucao> {
  const { execucao_id, dossie, incluir_contrarian, adaptadores, armazem } = opcoes;
  const emitir = opcoes.aoEvento ?? (() => {});
  const iniciado = Date.now();
  const chamadas: ChamadaLog[] = [];

  const estado: EstadoExecucao = {
    execucao_id,
    estado: "executando",
    contrarian_habilitado: incluir_contrarian,
    contraparte: dossie.contraparte,
    operacao: dossie.operacao,
    agentes: {
      supervisor: { estado: "aguardando" },
      financeiro: { estado: "aguardando" },
      setorial: { estado: "aguardando" },
      juridico_regulatorio: { estado: "aguardando" },
      ...(incluir_contrarian ? { contrarian: { estado: "aguardando" as const } } : {}),
    },
    analises: [],
    log: {
      execucao_id,
      iniciado_em: new Date(iniciado).toISOString(),
      concluido_em: "",
      duracao_ms: 0,
      chamadas,
      custo_total_usd: 0,
      divergencias_detectadas: 0,
    },
  };
  await armazem.salvar(estado);

  /**
   * Uma etapa: chama o fornecedor, valida, reenvia uma vez se preciso e registra UMA linha de
   * log por etapa. O reenvio não vira linha nova — o log conta etapas da arquitetura, que é o
   * que a §6.5 mostra em aula; os tokens do reenvio entram na mesma linha.
   */
  async function etapa<T>(
    rotulo: string,
    papel: Papel | "supervisor",
    adaptador: AdaptadorFornecedor,
    sistema: string,
    usuario: string,
    schema: Parameters<typeof comReenvioUnico<T>>[0],
    jsonSchema: Record<string, unknown>,
    /** Só as análises de agente têm modelo e fornecedor carimbados pelo servidor. */
    carimbarModelo = false,
    /** Campos que o servidor conhece e não pede ao modelo (ver schema-json.ts). */
    carimboExtra?: () => Record<string, unknown>,
  ): Promise<{ dados?: T; erro?: string }> {
    const inicio = Date.now();
    let entrada = 0;
    let saida = 0;
    let esforco: string | number = "";

    // Um erro do fornecedor — 400 de schema, 429, queda de rede — vira erro DESTA etapa, com a
    // mensagem no log. Ele não pode derrubar a execução inteira: o memo tem de sair com a
    // ausência declarada (§10.3, caso 3), e uma aula não pode acabar em stack trace.
    const { resultado, erroDaPrimeira } = await comReenvioUnico<T>(schema, async (correcao) => {
      const pedido: PedidoModelo = { sistema, usuario, correcao, schema: jsonSchema };
      try {
        const r = await adaptador.gerar(pedido);
        entrada += r.tokens_entrada;
        saida += r.tokens_saida;
        esforco = r.esforco;
        return r.texto;
      } catch (e) {
        return JSON.stringify({
          __erro_do_fornecedor: e instanceof Error ? e.message : String(e),
        });
      }
    },
    carimbarModelo
      ? () => ({
          ...carimboExtra?.(),
          modelo: adaptador.modelo,
          fornecedor: adaptador.fornecedor,
        })
      : carimboExtra,
    );

    chamadas.push({
      papel,
      etapa: rotulo,
      fornecedor: adaptador.fornecedor,
      modelo: adaptador.modelo,
      esforco,
      tokens_entrada: entrada,
      tokens_saida: saida,
      duracao_ms: Date.now() - inicio,
      custo_usd: custoChamadaUsd({
        modelo: adaptador.modelo,
        tokens_entrada: entrada,
        tokens_saida: saida,
      }),
      ...(resultado.ok ? {} : { erro: resultado.erro }),
      ...(erroDaPrimeira ? { reenviado: erroDaPrimeira } : {}),
    });

    return resultado.ok ? { dados: resultado.dados } : { erro: resultado.erro };
  }

  const textoDossie = dossieEmTexto(dossie);

  // 2. Planejamento.
  estado.agentes.supervisor.estado = "executando";
  emitir({ tipo: "agente_iniciou", agente: "supervisor" });
  await armazem.salvar(estado);

  const planejamento = await etapa<PlanoDeAnalise>(
    "planejamento",
    "supervisor",
    adaptadores.planejamento ?? adaptadores.anthropic,
    PROMPT_SUPERVISOR_PLANEJAMENTO,
    textoDossie,
    planoDeAnaliseSchema,
    JSON_SCHEMA_PLANO,
  );
  if (planejamento.dados) {
    estado.plano = planejamento.dados;
    estado.agentes.supervisor.estado = "concluido";
    emitir({ tipo: "agente_concluiu", agente: "supervisor", plano: planejamento.dados });
  } else {
    estado.agentes.supervisor.estado = "erro";
    estado.agentes.supervisor.erro = planejamento.erro;
    emitir({ tipo: "agente_falhou", agente: "supervisor", erro: planejamento.erro! });
  }
  await armazem.salvar(estado);

  // 3. Despacho paralelo dos três especialistas.
  const contextoEspecialista = (papel: Papel) => {
    const perguntas =
      estado.plano?.perguntas_por_especialista[
        papel as keyof PlanoDeAnalise["perguntas_por_especialista"]
      ];
    const bloco = perguntas?.length
      ? `\n\n--- Perguntas do supervisor para você ---\n${perguntas.map((p, i) => `${i + 1}. ${p}`).join("\n")}`
      : "";
    return textoDossie + bloco;
  };

  for (const { papel } of ESPECIALISTAS) {
    estado.agentes[papel].estado = "executando";
    emitir({ tipo: "agente_iniciou", agente: papel });
  }
  await armazem.salvar(estado);

  const resultadosEspecialistas = await Promise.all(
    ESPECIALISTAS.map(({ papel, sistema }) =>
      etapa<AnaliseAgente>(
        papel,
        papel,
        adaptadores.anthropic,
        sistema,
        contextoEspecialista(papel),
        analiseAgenteSchema,
        JSON_SCHEMA_ANALISE,
        true,
      ).then((r) => ({ papel, ...r })),
    ),
  );

  for (const r of resultadosEspecialistas) {
    if (r.dados) {
      estado.analises.push(r.dados);
      estado.agentes[r.papel].estado = "concluido";
      emitir({ tipo: "agente_concluiu", agente: r.papel, analise: r.dados });
    } else {
      estado.agentes[r.papel].estado = "erro";
      estado.agentes[r.papel].erro = r.erro;
      emitir({ tipo: "agente_falhou", agente: r.papel, erro: r.erro! });
    }
  }
  await armazem.salvar(estado);

  // 4. Contrarian. Só começa quando os três terminam, porque recebe as três análises.
  let analiseContrarian: AnaliseAgente | undefined;
  if (incluir_contrarian) {
    estado.agentes.contrarian.estado = "executando";
    emitir({ tipo: "agente_iniciou", agente: "contrarian" });
    await armazem.salvar(estado);

    const r = await etapa<AnaliseAgente>(
      "contrarian",
      "contrarian",
      adaptadores.contrarian,
      PROMPT_CONTRARIAN,
      `${textoDossie}\n\n--- Análises a revisar ---\n${JSON.stringify(estado.analises, null, 2)}`,
      analiseAgenteSchema,
      JSON_SCHEMA_ANALISE,
      true,
    );
    if (r.dados) {
      analiseContrarian = r.dados;
      estado.analises.push(r.dados);
      estado.agentes.contrarian.estado = "concluido";
      emitir({ tipo: "agente_concluiu", agente: "contrarian", analise: r.dados });
    } else {
      estado.agentes.contrarian.estado = "erro";
      estado.agentes.contrarian.erro = r.erro;
      emitir({ tipo: "agente_falhou", agente: "contrarian", erro: r.erro! });
    }
    await armazem.salvar(estado);
  }

  // 5. Consolidação. Duas vezes em paralelo quando o contrarian está ligado; uma quando não.
  const analisesEspecialistas = estado.analises.filter((a) => a.papel !== "contrarian");
  const consolidar = (comContrarian: boolean) =>
    etapa<CreditMemo>(
      comContrarian ? "consolidação (com contrarian)" : "consolidação (sem contrarian)",
      "supervisor",
      adaptadores.anthropic,
      comContrarian ? PROMPT_SUPERVISOR_CONSOLIDACAO : PROMPT_SUPERVISOR_CONSOLIDACAO_SEM_CONTRARIAN,
      JSON.stringify(
        {
          execucao_id,
          contraparte: dossie.contraparte,
          operacao: dossie.operacao,
          analises:
            comContrarian && analiseContrarian
              ? [...analisesEspecialistas, analiseContrarian]
              : analisesEspecialistas,
        },
        null,
        2,
      ),
      creditMemoSchema,
      JSON_SCHEMA_MEMO,
      false,
      () => ({
        execucao_id,
        contraparte: dossie.contraparte,
        operacao: dossie.operacao,
        analises:
          comContrarian && analiseContrarian
            ? [...analisesEspecialistas, analiseContrarian]
            : analisesEspecialistas,
      }),
    );

  if (incluir_contrarian) {
    const [semC, comC] = await Promise.all([consolidar(false), consolidar(true)]);
    estado.memo_sem_contrarian = semC.dados;
    estado.memo_com_contrarian = comC.dados;
    if (semC.dados) emitir({ tipo: "memo_pronto", com_contrarian: false });
    if (comC.dados) emitir({ tipo: "memo_pronto", com_contrarian: true });
  } else {
    const semC = await consolidar(false);
    estado.memo_sem_contrarian = semC.dados;
    if (semC.dados) emitir({ tipo: "memo_pronto", com_contrarian: false });
  }

  // 6. Aguardando decisão humana. O app não conclui sozinho.
  const memoExibido = incluir_contrarian
    ? estado.memo_com_contrarian
    : estado.memo_sem_contrarian;

  estado.estado = memoExibido ? "aguardando_decisao" : "erro";
  estado.log.concluido_em = new Date().toISOString();
  estado.log.duracao_ms = Date.now() - iniciado;
  estado.log.custo_total_usd = chamadas.reduce((t, c) => t + c.custo_usd, 0);
  estado.log.divergencias_detectadas = memoExibido?.divergencias.length ?? 0;
  await armazem.salvar(estado);
  emitir({ tipo: "execucao_concluida" });

  return estado;
}
