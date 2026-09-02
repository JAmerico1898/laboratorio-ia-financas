/**
 * Escala de classificação R1–R7 (metodologia.md §7, spec §10.1).
 *
 * A escala é interna e didática. Ela não corresponde a nenhuma escala de agência de
 * classificação de risco nem à classificação de operações prevista na regulação brasileira.
 */

export type Classificacao = "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7";
export type Recomendacao = "conceder" | "conceder_com_condicoes" | "nao_conceder";

interface Faixa {
  classificacao: Classificacao;
  /** Piso da faixa, inclusive. R7 não tem piso. */
  piso: number;
  leitura: string;
  recomendacao: Recomendacao;
}

/** As sete faixas da metodologia.md §7, do topo para a base. */
export const FAIXAS: readonly Faixa[] = [
  { classificacao: "R1", piso: 4.5, leitura: "Risco mínimo", recomendacao: "conceder" },
  { classificacao: "R2", piso: 4.0, leitura: "Risco baixo", recomendacao: "conceder" },
  { classificacao: "R3", piso: 3.5, leitura: "Risco baixo a moderado", recomendacao: "conceder" },
  { classificacao: "R4", piso: 3.0, leitura: "Risco moderado", recomendacao: "conceder_com_condicoes" },
  { classificacao: "R5", piso: 2.5, leitura: "Risco moderado a alto", recomendacao: "conceder_com_condicoes" },
  { classificacao: "R6", piso: 2.0, leitura: "Risco alto", recomendacao: "nao_conceder" },
  { classificacao: "R7", piso: -Infinity, leitura: "Risco muito alto", recomendacao: "nao_conceder" },
] as const;

/**
 * Arredonda para uma casa decimal, meio para cima.
 *
 * A metodologia trabalha em uma casa decimal e as faixas são declaradas assim ("3,5 – 3,9").
 * Um score de 3,45 é 3,5 e portanto R3. Sem este arredondamento explícito, 3,45 cairia em R4
 * e a fronteira publicada na metodologia deixaria de valer.
 */
export function arredondar1(score: number): number {
  return Math.round((score + Number.EPSILON) * 10) / 10;
}

/** Mapeia um score de 1,0 a 5,0 para a classificação da metodologia.md §7. */
export function classificar(score: number): Classificacao {
  if (!Number.isFinite(score)) {
    throw new Error(`score precisa ser um número finito; recebido: ${score}`);
  }
  const s = arredondar1(score);
  return FAIXAS.find((f) => s >= f.piso)!.classificacao;
}

/** A recomendação que a escala impõe: R1–R3 conceder, R4–R5 com condições, R6–R7 não conceder. */
export function recomendar(classificacao: Classificacao): Recomendacao {
  return FAIXAS.find((f) => f.classificacao === classificacao)!.recomendacao;
}

export function leitura(classificacao: Classificacao): string {
  return FAIXAS.find((f) => f.classificacao === classificacao)!.leitura;
}

/**
 * Score consolidado do memo (spec §5.3): média dos três especialistas, ajustada em até
 * 0,5 ponto para baixo quando o contrarian apresenta objeção com evidência e severidade alta.
 *
 * Devolve também as parcelas, porque o prompt manda o supervisor mostrar o cálculo e a tela
 * do memo exibe o que foi mostrado.
 */
export function consolidarScore(
  scoresEspecialistas: number[],
  ajusteContrarian = 0,
): { media: number; ajuste: number; score: number; classificacao: Classificacao } {
  if (scoresEspecialistas.length === 0) {
    throw new Error("consolidarScore precisa de ao menos um score de especialista");
  }
  if (ajusteContrarian < 0 || ajusteContrarian > 0.5) {
    throw new Error(`ajuste do contrarian vai de 0 a 0,5; recebido: ${ajusteContrarian}`);
  }
  const media = scoresEspecialistas.reduce((a, b) => a + b, 0) / scoresEspecialistas.length;
  const score = Math.max(1, media - ajusteContrarian);
  return { media, ajuste: ajusteContrarian, score, classificacao: classificar(score) };
}
