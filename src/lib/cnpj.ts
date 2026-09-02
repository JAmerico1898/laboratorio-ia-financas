/**
 * CNPJ: normalização, dígito verificador e máscara (spec §6.1, §10.1).
 */

const PESOS_PRIMEIRO = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_SEGUNDO = [6, ...PESOS_PRIMEIRO];

/** Remove tudo que não for dígito. */
export function apenasDigitos(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

function digito(base: string, pesos: number[]): number {
  const soma = pesos.reduce((acc, peso, i) => acc + Number(base[i]) * peso, 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/**
 * Valida um CNPJ pelos dois dígitos verificadores.
 *
 * Rejeita comprimento diferente de 14 e as sequências de dígito repetido, que passam no
 * cálculo mas não são CNPJ de ninguém.
 */
export function cnpjValido(cnpj: string): boolean {
  const d = apenasDigitos(cnpj);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;
  const dv1 = digito(d, PESOS_PRIMEIRO);
  const dv2 = digito(d, PESOS_SEGUNDO);
  return Number(d[12]) === dv1 && Number(d[13]) === dv2;
}

/** Aplica a máscara 00.000.000/0000-00 sobre o que já for dígito. */
export function formatarCnpj(cnpj: string): string {
  const d = apenasDigitos(cnpj).slice(0, 14);
  const partes = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 8), d.slice(8, 12), d.slice(12, 14)];
  let saida = partes[0];
  if (partes[1]) saida += "." + partes[1];
  if (partes[2]) saida += "." + partes[2];
  if (partes[3]) saida += "/" + partes[3];
  if (partes[4]) saida += "-" + partes[4];
  return saida;
}
