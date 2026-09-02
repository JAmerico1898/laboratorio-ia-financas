# handoff.md — Comitê de Crédito IA

> Estado do projeto em **2 de setembro de 2026**, ao fim da sessão de especificação.
> Este arquivo existe para que uma janela de contexto nova possa retomar do zero.
> **Nenhuma linha de código do aplicativo foi escrita ainda.**

## Como retomar

Abra uma sessão em `D:\Disciplinas\Coppead - Disciplinas\Curso de IA\09_App_Comite_Credito`
e diga: *"leia handoff.md e spec.md e comece a Fase 1"*.

O `spec.md` desta pasta é a **fonte canônica**. A cópia em `04_Spec_App/` é só um ponteiro
histórico do item 7.4 do plano de produção e não deve ser editada.

---

## 1. O que é

Aplicativo web público que executa uma análise de crédito por arquitetura multiagente e a
submete a aprovação humana. É o material da **Aula 4** do curso *IA Aplicada a Finanças com
Claude*: o produto que a aula mostra pronto, abre por dentro e altera ao vivo.

A tese que o app precisa tornar visível: *o aplicativo não é a inteligência, é a interface de
distribuição do trabalho feito nas seis camadas anteriores.*

## 2. O que já está decidido

Doze decisões foram tomadas em entrevista e estão registradas na **§15 do `spec.md`**, com o
ponto do spec que cada uma alterou. Quatro corrigem a versão 1.0:

- **§3.2 — não existe snapshot datado.** Os IDs Anthropic são completos como estão
  (`claude-sonnet-5`). Acrescentar sufixo de data produz identificador inválido.
- **§3.2 — `temperature` foi removida** dos modelos Claude atuais e devolve HTTP 400. O
  substituto é `output_config.effort`. Os quatro papéis Claude usam `effort: "high"`; o
  contrarian, em outro fornecedor, mantém `temperature: 0.7`.
- **§10.3 — a contagem de chamadas não fechava.** São **7** com contrarian (planejamento +
  3 especialistas + contrarian + **duas** consolidações em paralelo) e **5** sem. A 1.0 dizia
  "5 e 4".
- **§2 — o preset de tokens foi localizado**, em
  `D:\jose_americo\laboratorio-derivativos\src\app\globals.css`. Copiar verbatim, 200 linhas.
  Ele traz `--sidebar-*`, `--radius-*` derivados e um bloco `.dark` que a §2 não lista.

## 3. Estado dos arquivos

```
09_App_Comite_Credito/
  spec.md               versão 1.1, canônica, 779 linhas
  handoff.md            este arquivo
  .env.local            variáveis prontas, valores vazios — NÃO versionado
  .env.example          idem, versionado
  .gitignore            pronto
  package.json          versões da família casadas com laboratorio-derivativos
  tsconfig.json  next.config.ts  postcss.config.mjs  components.json  vitest.config.ts
  src/app/globals.css   cópia verbatim do preset (md5 confere, 200 linhas)
  src/app/layout.tsx    Manrope + Inter, pt-BR
  src/app/page.tsx      placeholder — a tela de entrada da §6.1 vem no passo 5
  src/lib/utils.ts      `cn`, copiado do preset
  src/config/graficos.ts  paleta de gráficos da §2 (ver nota abaixo)
  tests/fidelidade-visual.test.ts  §10.5, 19 casos
```

Ainda **não** existem: `git init`, `evals/`, `CLAUDE.md`, `AGENTS.md`, `public/demo/`,
`src/lib/schema.ts`, `src/prompts/`.

**Nota sobre a paleta de gráficos.** A §2 lista `accent #006b5f`, `green #059669`, `red #dc2626`,
`gold #d97706`, e nenhum desses quatro está no preset — que é copiado verbatim e não pode ser
reconstruído. Eles vivem em `src/config/graficos.ts`, e o teste de fidelidade visual verifica os
dois lados: os tokens do CSS contra a lista canônica, e a paleta contra a §2.

## 4. Plano da Fase 1 — tudo com fornecedores simulados

Nenhum passo abaixo gasta uma chamada de API. Cada um termina com uma verificação executada,
não com a impressão de que funcionou.

| # | Passo | Verificação |
|---|---|---|
| 1 | ✅ **feito** — Esqueleto Next 16.2.1 + React 19.2.4 + Tailwind v4 + shadcn `base-nova`; `globals.css` copiado verbatim do preset | 19/19 verdes em `tests/fidelidade-visual.test.ts`; `npm run build` compila |
| 2 | `src/lib/schema.ts` (Zod), `indicadores.ts`, `custo.ts`, escala R1–R7 | testes da §10.1 verdes, incluindo as fronteiras 3,4/3,5 e 2,4/2,5 |
| 3 | `src/prompts/*.ts` + `src/prompts/curso/*` verbatim; orquestrador com adaptadores de fornecedor mockados | memo gerado ponta a ponta a partir do dossiê demo |
| 4 | `public/demo/dossie-casas-bahia.json` extraído do dossiê da Aula 2 | dossiê carrega e alimenta os 4 agentes |
| 5 | As 6 telas + SSE + `ArmazemExecucao` com adaptador em memória | testes §10.2 e §10.3 verdes, inclusive reload no meio da execução |
| 6 | `CLAUDE.md` (com `@AGENTS.md`), `AGENTS.md`, hook de pre-commit, CI no Actions, limites da §8.6 | testes §10.6 verdes; push vermelho não publica |

## 5. Fase 2 — depende de você

Nada da Fase 1 está bloqueado por estes itens. Todos bloqueiam a Fase 2.

1. **Identificador exato do modelo contrarian.** O spec 1.0 diz "GPT-5.6 Sol"; a string de API
   não foi confirmada e **não deve ser adivinhada**. Para descobrir:
   ```
   ! curl -s https://api.openai.com/v1/models -H "Authorization: Bearer $env:OPENAI_API_KEY" | Select-String sol
   ```
   Preencher `MODEL_CONTRARIAN` no `.env.local` e confirmar o preço na página oficial,
   atualizando a tabela da §9 com a data da consulta.
2. **`OPENAI_API_KEY` e `ANTHROPIC_API_KEY`** no `.env.local`.
3. **Vercel**: `! vercel login` (fluxo de dispositivo, interativo), depois provisionar o KV e
   recriar as variáveis em Settings > Environment Variables.
4. **Medição de custo** (§9): dez execuções completas do caso Casas Bahia, registrando o custo
   de cada uma. Média e desvio entram no item de ressarcimento.
5. **Vídeo de 5 minutos** (§13.10): plano B da Aula 4. Só pode ser gravado com o app publicado
   e os identificadores de modelo fixados.

## 5.1 Repositório

`https://github.com/JAmerico1898/laboratorio-ia-financas` — **público** desde 2 de setembro de
2026, conforme §8.4 e §13.9. Contém apenas um `README.md`; nada foi publicado ainda.

A decisão de mantê-lo público foi tomada com o autor sabendo que o repositório conterá, por força
da decisão 9 da §15, o prompt da Aula 1 e a `metodologia.md` da Aula 3 verbatim — isto é, parte do
conteúdo do curso fica visível para qualquer pessoa. É decisão dele, não descuido. Reversível com
`gh repo edit ... --visibility private --accept-visibility-change-consequences`.

## 6. Onde está o material de origem

| O que | Onde |
|---|---|
| Dossiê do caso, 18 arquivos | `../02_Dossie_Caso/dossie/` |
| Gabarito do erro deliberado da Aula 2 (**fora do app**) | `../02_Dossie_Caso/erro.md` |
| Prompt estruturado da Aula 1 | `../03_Prompt_e_Skill/Prompt_Estruturado_Analise_Credito.md` |
| Metodologia: indicadores, pesos, escala R1–R7 | `../03_Prompt_e_Skill/credit-analysis/references/metodologia.md` |
| Modelo de credit memo | `../03_Prompt_e_Skill/credit-analysis/references/modelo_credit_memo.md` |
| Preset de tokens e versões da família | `D:\jose_americo\laboratorio-derivativos\` |
| Plano de produção do curso | `../00_LEIAME.md` |

## 7. Armadilhas conhecidas

- **Não** acrescentar sufixo de data a identificador de modelo Anthropic.
- **Não** enviar `temperature` para modelo Claude atual — 400.
- **Não** mandar os três `DFP_*.pdf` (5 MB cada) por extenso aos agentes: ameaça o critério de
  3 minutos e o teto de custo.
- **Não** embarcar a planilha adulterada da Aula 2 no aplicativo.
- **Não** deixar `src/prompts/curso/` divergir do curso em silêncio: existe `npm run sync:curso`
  para reportar divergência, e ele é script local, não teste de CI — o repo é autônomo e não
  enxerga `03_Prompt_e_Skill/`.
- **Não** persistir arquivo enviado pelo usuário. O KV guarda só `LogExecucao` e análises.
- A §1.2 é contrato. Qualquer inclusão fora dela exige decisão explícita do autor.
