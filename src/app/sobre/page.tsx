/**
 * "Como foi construído" — spec §6.6. Tela de aula, não de produto.
 */

import { Cabecalho } from "@/components/cabecalho";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerificacaoSaude } from "@/components/verificacao-saude";
import { PRECOS } from "@/config/precos";

export const metadata = { title: "Como foi construído — Comitê de Crédito IA" };

const REPO = "https://github.com/JAmerico1898/laboratorio-ia-financas";

const DIAGRAMA = `
                          NAVEGADOR (cliente)
      upload de DFP/planilha + CNPJ + valor + prazo + data-base
                                 │
                                 ▼
                  SERVIDOR (Next.js, rotas de API)
                                 │
                  ┌──────────────┴───────────────┐
                  │        SUPERVISOR            │   Claude
                  │  planeja, despacha, consolida│
                  └──────────────┬───────────────┘
                                 │  (chamadas em paralelo)
      ┌──────────────┬───────────┴────────┬────────────────────┐
      ▼              ▼                    ▼                    ▼
ANALISTA        ANALISTA             ANALISTA             CONTRARIAN
FINANCEIRO      SETORIAL             JURÍDICO-REG.        (outro fornecedor)
(Claude)        (Claude)             (Claude)             recebe as três
      │              │                    │               análises e tenta
      └──────────────┴────────┬───────────┴───────────────derrubá-las
                              ▼
            SUPERVISOR consolida DUAS VEZES, em paralelo:
            memo SEM contrarian  ·  memo COM contrarian
                              ▼
                        CREDIT MEMO
                              │
                              ▼
                  APROVAÇÃO HUMANA (obrigatória)
                              │
                              ▼
                  LOG DA EXECUÇÃO (modelos, tokens,
                  tempo, divergências, custo)
`.trim();

export default function Sobre() {
  return (
    <>
      <Cabecalho />
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
        <h1 className="font-heading text-3xl font-extrabold">Como foi construído</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">A arquitetura</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <pre className="text-[11px] leading-tight text-muted-foreground">{DIAGRAMA}</pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modelos em uso e preço de tabela</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Modelo</th>
                  <th className="py-2 text-right">Entrada US$/1M</th>
                  <th className="py-2 text-right">Saída US$/1M</th>
                  <th className="py-2">Consultado em</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(PRECOS).map(([modelo, p]) => (
                  <tr key={modelo} className="border-t border-border">
                    <td className="py-2 font-mono text-xs">{modelo}</td>
                    <td className="py-2 text-right">{p.entrada.toFixed(2)}</td>
                    <td className="py-2 text-right">{p.saida.toFixed(2)}</td>
                    <td className="py-2 text-xs text-muted-foreground">{p.consultado_em}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground">
              Os identificadores de modelo Anthropic são completos como estão — não existe forma
              datada, e anexar um sufixo de data produz identificador inválido. Nos modelos Claude
              atuais, <code>temperature</code> foi removida e devolve HTTP 400; o controle
              equivalente é <code>output_config.effort</code>, e os quatro papéis Claude usam{" "}
              <code>high</code>. O contrarian roda em outro fornecedor, onde{" "}
              <code>temperature</code> continua existindo, e mantém 0,7 — a variabilidade fica
              onde o objetivo é gerar objeções.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Verificação de modelo servido</CardTitle>
          </CardHeader>
          <CardContent>
            <VerificacaoSaude />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">O que ler no repositório</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {[
                ["spec.md", "a especificação de build que originou este código"],
                ["CLAUDE.md", "as instruções do Claude Code, com @AGENTS.md ao final"],
                ["AGENTS.md", "as convenções de código que o Codex lê ao revisar"],
                ["src/prompts/", "o prompt de sistema de cada agente, em texto legível"],
                ["evals/ultimo.json", "a última rodada de evals, com data e identificadores"],
              ].map(([arquivo, descricao]) => (
                <li key={arquivo}>
                  <a
                    href={`${REPO}/blob/main/${arquivo}`}
                    className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                  >
                    {arquivo}
                  </a>
                  <span className="text-muted-foreground"> — {descricao}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <p className="rounded-xl bg-primary px-6 py-5 font-heading text-lg font-bold text-primary-foreground">
          O aplicativo não é a inteligência. Ele é a interface de distribuição do trabalho feito
          nas seis camadas anteriores.
        </p>
      </main>
    </>
  );
}
