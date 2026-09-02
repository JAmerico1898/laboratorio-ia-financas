/**
 * Contrato de dados entre os agentes (spec §4).
 *
 * É este contrato que permite ao supervisor consolidar sem interpretar prosa. Os tipos são
 * derivados dos schemas Zod, não declarados duas vezes: se o schema mudar, o tipo muda junto.
 */

import { z } from "zod";

export const probabilidadeSchema = z.enum(["baixa", "media", "alta"]);
export const severidadeSchema = z.enum(["baixa", "media", "alta"]);
export const papelSchema = z.enum([
  "financeiro",
  "setorial",
  "juridico_regulatorio",
  "contrarian",
]);
export const fornecedorSchema = z.enum(["anthropic", "openai"]);
/** As sete faixas da escala. Um teste garante que esta lista e `FAIXAS` não se separem. */
export const classificacaoSchema = z.enum(["R1", "R2", "R3", "R4", "R5", "R6", "R7"]);
export const recomendacaoSchema = z.enum([
  "conceder",
  "conceder_com_condicoes",
  "nao_conceder",
]);

export const evidenciaSchema = z.object({
  /** O que está sendo afirmado, em uma frase. */
  afirmacao: z.string().min(1),
  /** "BP consolidado, conta 2.01, exercício 2025" ou "DFP 2025, p. 47". */
  origem: z.string().min(1),
  /** Em R$ milhões, quando aplicável. */
  valor: z.number().optional(),
  exercicio: z.string().optional(),
});

export const riscoSchema = z.object({
  descricao: z.string().min(1),
  evidencia: evidenciaSchema,
  probabilidade: probabilidadeSchema,
  severidade: severidadeSchema,
});

export const verificacoesSchema = z.object({
  balanco_fecha: z.boolean().nullable(),
  numeros_sem_origem: z.array(z.string()),
  indicadores_invalidos: z.array(z.string()),
});

export const analiseAgenteSchema = z.object({
  papel: papelSchema,
  /** Identificador exato do modelo usado. */
  modelo: z.string().min(1),
  fornecedor: fornecedorSchema,
  classificacao: classificacaoSchema,
  score: z.number().min(1).max(5),
  sintese: z.string().max(600),
  /**
   * Mínimo de três evidências. É a tradução, em código, da regra "cada número tem endereço"
   * — e é o motivo pelo qual uma análise pobre reprova na validação em vez de entrar no memo.
   */
  evidencias: z.array(evidenciaSchema).min(3),
  riscos: z.array(riscoSchema).min(3).max(6),
  informacao_ausente: z.array(z.string()),
  confianca: z.number().min(0).max(1),
  /** Preenchido apenas pelo contrarian. */
  divergencias: z.array(z.string()).optional(),
  verificacoes: verificacoesSchema,
});

export const creditMemoSchema = z.object({
  execucao_id: z.string().min(1),
  contraparte: z.object({ nome: z.string().min(1), cnpj: z.string().min(1) }),
  operacao: z.object({
    valor_reais: z.number().positive(),
    prazo_meses: z.number().int().positive(),
    modalidade: z.string().min(1),
    data_base: z.string().min(1),
  }),
  recomendacao: recomendacaoSchema,
  classificacao: classificacaoSchema,
  score_consolidado: z.number().min(1).max(5),
  /** Cinco marcadores, cada um com um número. */
  sintese: z.array(z.string()).length(5),
  quadro_indicadores: z.array(
    z.object({
      indicador: z.string().min(1),
      v2023: z.number().optional(),
      v2024: z.number().optional(),
      v2025: z.number().optional(),
      origem: z.string().min(1),
    }),
  ),
  /** Dois parágrafos. */
  leitura_do_negocio: z.string().min(1),
  riscos: z.array(riscoSchema),
  /** Vazio quando a recomendação é "conceder". */
  condicoes_sugeridas: z.array(z.string()),
  informacao_ausente: z.array(z.string()),
  divergencias: z.array(
    z.object({
      tema: z.string().min(1),
      posicoes: z.array(z.object({ papel: papelSchema, posicao: z.string().min(1) })),
    }),
  ),
  contrarian_incluido: z.boolean(),
  analises: z.array(analiseAgenteSchema),
});

export const planoDeAnaliseSchema = z.object({
  lacunas: z.array(z.string()),
  perguntas_por_especialista: z.object({
    financeiro: z.array(z.string()).min(2).max(4),
    setorial: z.array(z.string()).min(2).max(4),
    juridico_regulatorio: z.array(z.string()).min(2).max(4),
  }),
  /** Os dois pontos do caso que devem gerar divergência. */
  divergencias_esperadas: z.array(z.string()).length(2),
});

export const chamadaLogSchema = z.object({
  papel: z.union([papelSchema, z.literal("supervisor")]),
  /** Rótulo da linha na tela de log; distingue as duas consolidações. */
  etapa: z.string().min(1),
  fornecedor: fornecedorSchema,
  modelo: z.string().min(1),
  /** "high" nos papéis Claude, 0.7 no contrarian (§3.2). */
  esforco: z.union([z.string(), z.number()]),
  tokens_entrada: z.number().int().nonnegative(),
  tokens_saida: z.number().int().nonnegative(),
  duracao_ms: z.number().nonnegative(),
  custo_usd: z.number().nonnegative(),
  erro: z.string().optional(),
  /** Por que a primeira resposta foi rejeitada, quando houve reenvio. Diagnóstico, não falha. */
  reenviado: z.string().optional(),
});

export const logExecucaoSchema = z.object({
  execucao_id: z.string().min(1),
  iniciado_em: z.string(),
  concluido_em: z.string(),
  duracao_ms: z.number().nonnegative(),
  chamadas: z.array(chamadaLogSchema),
  custo_total_usd: z.number().nonnegative(),
  divergencias_detectadas: z.number().int().nonnegative(),
  /** O que /api/saude viu, com data. */
  modelos_servidos: z.record(z.string(), z.string()).optional(),
  decisao_humana: z
    .object({
      acao: z.enum(["aprovado", "devolvido", "rejeitado"]),
      comentario: z.string().optional(),
      em: z.string(),
    })
    .optional(),
});

export const dossieEntradaSchema = z.object({
  contraparte: z.object({ nome: z.string().min(1), cnpj: z.string().min(1) }),
  operacao: z.object({
    valor_reais: z.number().positive(),
    prazo_meses: z.number().int().positive(),
    modalidade: z.string().min(1),
    data_base: z.string().min(1),
  }),
  /** Texto já extraído e normalizado; um só dossiê alimenta os dois fornecedores (§3.1). */
  documentos: z.array(
    z.object({
      titulo: z.string().min(1),
      origem: z.string().min(1),
      texto: z.string().min(1),
    }),
  ),
});

export type Probabilidade = z.infer<typeof probabilidadeSchema>;
export type Severidade = z.infer<typeof severidadeSchema>;
export type Papel = z.infer<typeof papelSchema>;
export type Fornecedor = z.infer<typeof fornecedorSchema>;
export type Evidencia = z.infer<typeof evidenciaSchema>;
export type Risco = z.infer<typeof riscoSchema>;
export type AnaliseAgente = z.infer<typeof analiseAgenteSchema>;
export type CreditMemo = z.infer<typeof creditMemoSchema>;
export type PlanoDeAnalise = z.infer<typeof planoDeAnaliseSchema>;
export type ChamadaLog = z.infer<typeof chamadaLogSchema>;
export type LogExecucao = z.infer<typeof logExecucaoSchema>;
export type DossieEntrada = z.infer<typeof dossieEntradaSchema>;
