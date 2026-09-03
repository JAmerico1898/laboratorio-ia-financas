# handoff.md — Comitê de Crédito IA

> Estado em **2 de setembro de 2026**, ao fim da sessão de construção.
> O aplicativo está **no ar, verificado em produção com chamadas reais**.
> `https://laboratorio-ia-financas.vercel.app`

## Como retomar

Abra uma sessão em `D:\Disciplinas\Coppead - Disciplinas\Curso de IA\09_App_Comite_Credito` e
diga: *"leia handoff.md e spec.md"*. O `spec.md` desta pasta é a fonte canônica; a cópia em
`04_Spec_App/` é ponteiro histórico e não deve ser editada.

---

## 1. Verificação executada

| O quê | Resultado |
|---|---|
| `npm test` | **211/211 verdes**, 16 arquivos |
| `npm run test:e2e` | **7/7 verdes**, fornecedores simulados |
| CI no GitHub Actions | verde nos 13 passos |
| `npm run build` · `tsc --noEmit` · `npm run lint` | limpos |
| Hook de pre-commit | testado nos dois sentidos: passa limpo, **aborta** com chave em código de cliente |
| `/api/saude` em produção | `ok: true`, `armazem_duravel: true`, três modelos com `confere: true` |
| **Fluxo completo em produção** | demo → 7 chamadas → memo → log travado → decisão → log liberado |

O ciclo em produção, medido: planejamento 26,5 s → três especialistas **em paralelo** (o mais
lento, 103,9 s) → contrarian 22,0 s → duas consolidações em paralelo (43,5 s). Memo `R7 /
não conceder`, score 1,55, **5 divergências registradas**, US$ 1,16, 197 s.

## 2. A medição da §9 — o número que você queria

Dez execuções completas do caso Casas Bahia, na configuração que está no ar:

| | Custo (US$) | Duração (s) |
|---|---|---|
| **Média** | **0,9737** | 162,7 |
| **Desvio padrão** | **0,0591** | — |
| Mínimo · mediana · máximo | 0,9238 · 0,9744 · 1,1404 | 143 · 161 · 196 |

Durações, em segundos: 143 · 146 · 148 · 154 · 159 · 161 · 172 · 173 · 174 · 196.

**Para o item de ressarcimento:** US$ 0,97 por execução. Um teto de **US$ 1,20** cobre a cauda
observada — a execução mais cara custou US$ 1,14 e foi a única com reenvio. O teto mensal de
US$ 50 da §8.6 comporta ~50 execuções.

Sete chamadas em todas as dez, **zero erros**, um único reenvio em setenta chamadas. As dez
classificaram **R7**: variação zero entre execuções.

O contrarian custa **US$ 0,016** — 1,7% da execução, lendo o dossiê *mais* as três análises. É o
dado de aula: o revisor independente em outro fornecedor custa quase nada; o que pesa é quanto
contexto cada agente recebe.

## 3. Cinco defeitos que só a execução real revelou

Nenhum aparecia em teste. Todos estão no spec, §15.1.

1. **O schema nunca era enviado ao modelo.** O preâmbulo mandava responder "no schema fornecido"
   e nada ia junto. **A primeira execução real custou US$ 4,64 e não produziu memo.** Corrigido
   com saída estruturada nos dois fornecedores.
2. **O contrarian também recusa `temperature`.** `gpt-5.6-luna` devolve 400 para 0,7. Roda no
   padrão 1,0 — mais variável que os 0,7 pretendidos, o que serve melhor ao papel.
3. **Não há paridade de preço.** O contrarian custa **um décimo** do Claude por token.
4. **O KV estava provisionado e o app não o via.** A integração Upstash foi conectada com o
   prefixo `KV_REST_API_TOKEN`, criando `KV_REST_API_TOKEN_KV_REST_API_URL`, enquanto as
   variáveis canônicas existiam à mão e **vazias** — e eram as que o app lia.
   `src/lib/credenciais-kv.ts` resolve a família inteira e nunca escolhe o token só de leitura.
5. **`waitUntil` não é detalhe.** A rota devolvia 202 e disparava a orquestração com `void`. A
   Vercel congela a instância assim que a resposta sai: a execução ficou **oito minutos em
   "aguardando", com zero chamadas no log**. Os testes de ponta a ponta não pegam isso — rodam
   contra `next start`, um processo só, onde `void promessa` funciona.

## 4. O que continua aberto

| # | Item | Situação |
|---|---|---|
| 1 | **Vídeo de 5 minutos** (§13.10) | Só falta gravar: o app está no ar e os identificadores fixados |
| 2 | **O supervisor deriva números** | Decisão sua — ver §4.1 abaixo |
| 3 | **Critério de 3 minutos** | Atendido em **9 de 10**; a cauda vai a ~196 s |
| 4 | Limpar duas variáveis vazias na Vercel | Opcional: `KV_REST_API_URL` e `KV_REST_API_TOKEN` não são mais lidas |

### 4.1 A pergunta que sobrou para você

O supervisor calculou `CCL = 14.403,0 − 21.822,0 = −7.419,0`. Os dois insumos estão citados com a
conta e a aritmética está certa — mas a **§5.3 diz "Não crie número novo. Todo valor do memo tem
de estar em alguma evidência recebida."**

Acontece em **5 das 10 execuções**, em 7 de 45 valores citados nos riscos do memo. Ou o supervisor
está violando a regra, ou a regra é apertada demais e deveria permitir aritmética sobre evidência
já citada. É a diferença entre **inventar** um número e **derivar** um — e dá meia hora de aula.

Enquanto não for decidido, o eval "nenhum valor do memo é inexistente nas evidências" reprova de
propósito. Os outros cinco limiares da §10.4 passam: origem 100%, alavancagem nas duas versões
10/10, classificação estável, contrarian com objeção 10/10, verificações 100%.

## 5. Onde está o material de origem

| O que | Onde |
|---|---|
| Dossiê do caso, 18 arquivos | `../02_Dossie_Caso/dossie/` |
| Gabarito do erro deliberado da Aula 2 (**fora do app**) | `../02_Dossie_Caso/erro.md` |
| Prompt estruturado da Aula 1 | `../03_Prompt_e_Skill/Prompt_Estruturado_Analise_Credito.md` |
| Metodologia: indicadores, pesos, escala R1–R7 | `../03_Prompt_e_Skill/credit-analysis/references/metodologia.md` |
| Modelo de credit memo | `../03_Prompt_e_Skill/credit-analysis/references/modelo_credit_memo.md` |
| Preset de tokens e versões da família | `D:\jose_americo\laboratorio-derivativos\src\app\globals.css` |

`npm run sync:curso` confere se `src/prompts/curso/` divergiu do curso. É script local: o
repositório é autônomo e o CI não enxerga `03_Prompt_e_Skill/`.

## 6. Armadilhas conhecidas

- **Não** acrescentar sufixo de data a identificador de modelo Anthropic.
- **Não** enviar `temperature` a nenhum dos dois modelos — os dois devolvem 400.
- **Não** pedir ao modelo que preencha `modelo` ou `fornecedor`: perguntado sobre o próprio
  identificador, o Sonnet 5 respondeu `"gpt-5-thinking"`.
- **Não** enviar JSON Schema com `minimum`/`maximum`/`maxLength` à saída estruturada da Anthropic,
  nem embutir as análises no schema do memo — estoura a gramática compilada.
- **Não** disparar trabalho de fundo em rota da Vercel sem `waitUntil`.
- **Não** devolver os releases de 4T ao dossiê demo: eram dois terços do contexto de cada agente.
- **Não** embarcar a planilha adulterada da Aula 2 no aplicativo.
- **Não** persistir arquivo enviado pelo usuário. O armazém guarda só log, plano, análises e memos.
- A §1.2 é contrato. Qualquer inclusão fora dela exige decisão explícita do autor.
