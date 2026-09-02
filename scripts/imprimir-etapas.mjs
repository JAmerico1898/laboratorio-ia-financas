/** Impressão das etapas de uma execução, usada pelo runner de evals. */
export function imprimirEtapas(chamadas) {
  for (const c of chamadas) {
    const tempo = String((c.duracao_ms / 1000).toFixed(1)).padStart(6);
    const tokens = `${String(c.tokens_entrada).padStart(7)}→${String(c.tokens_saida).padStart(6)}`;
    console.log(
      `    ${c.etapa.padEnd(30)} ${tempo}s  ${tokens}  US$ ${c.custo_usd.toFixed(4)}`,
    );
    if (c.erro) console.log(`        ERRO: ${c.erro.slice(0, 200)}`);
    if (c.reenviado) console.log(`        reenviou porque: ${c.reenviado.slice(0, 200)}`);
  }
}
