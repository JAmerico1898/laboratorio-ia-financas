/**
 * Paleta dos gráficos (spec §2).
 *
 * Fica separada do `globals.css` de propósito: aquele arquivo é cópia verbatim do preset
 * compartilhado da família de laboratórios e não deve ser reconstruído nem editado. Estes
 * quatro valores são específicos deste aplicativo e o teste de fidelidade visual (§10.5)
 * verifica os dois lados.
 */
export const CORES_GRAFICO = {
  accent: "#006b5f",
  green: "#059669",
  red: "#dc2626",
  gold: "#d97706",
} as const;

export type CorGrafico = keyof typeof CORES_GRAFICO;
