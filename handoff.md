# handoff.md — Comitê de Crédito IA

> Estado do projeto em **2 de setembro de 2026**, ao fim da sessão de construção.
> A Fase 1 do plano está **completa** e o aplicativo roda de ponta a ponta, com fornecedores
> simulados e com os fornecedores reais.

## Como retomar

Abra uma sessão em `D:\Disciplinas\Coppead - Disciplinas\Curso de IA\09_App_Comite_Credito` e
diga: *"leia handoff.md e spec.md"*.

O `spec.md` desta pasta é a **fonte canônica**. A cópia em `04_Spec_App/` é ponteiro histórico e
não deve ser editada.

---

## 1. O que existe

```
09_App_Comite_Credito/          repositório git, 1 commit, ainda NÃO publicado
  spec.md                       versão 1.1 + §15.1 com as correções de campo
  README.md  CLAUDE.md  AGENTS.md  handoff.md
  .env.local                    chaves preenchidas — NÃO versionado
  .env.example                  modelo, valores vazios — versionado
  .githooks/pre-commit          controle: aborta commit com chave em código de cliente
  .github/workflows/ci.yml      lint + tipos + testes + e2e
  evals/ultimo.json             última rodada de evals
  public/demo/dossie-casas-bahia.json   16 documentos, ~97 mil tokens
  src/                          app, componentes, lib, prompts, config
  tests/  e2e/  scripts/
```

**Verificação executada, não impressão:**

| O quê | Resultado |
|---|---|
| `npm test` | **142/142 verdes** em 11 arquivos |
| `npm run test:e2e` | **7/7 verdes**, fornecedores simulados |
| `npm run build` | compila; 6 telas e 5 rotas de API |
| `npm run lint` / `tsc --noEmit` | limpos |
| hook de pre-commit | passa no repo limpo e **aborta** com chave em código de cliente (testado nos dois sentidos) |
| execução real com os dois fornecedores | roda; ver §3 para o problema aberto |

## 2. As quatro correções de campo (§15.1 do spec)

O spec 1.1 errava em quatro pontos que só a API real revelou. Todos corrigidos no código e no
spec — e todos são conteúdo de aula, não erratas.

1. **`gpt-5.6-luna` confirmado** na Models API. A família 5.6 tem `luna`, `sol` e `terra`; a 1.0
   chutava "Sol". Preço: US$ 0,20 / US$ 1,20 por 1M.
2. **O contrarian também recusa `temperature`.** `gpt-5.6-luna` devolve 400 para 0,7 — *"Only
   the default (1) value is supported"*. O parâmetro foi removido; o modelo roda no padrão 1,0,
   que é **mais** variável que os 0,7 pretendidos. O log mostra `padrão (1,0)`.
3. **Os dois fornecedores não custam o mesmo.** O contrarian custa **um décimo** do Claude por
   token. A §9 foi reescrita: a tela de log ficou com uma comparação melhor do que a paridade
   supunha.
4. **O schema nunca ia junto do prompt.** O preâmbulo mandava responder "no schema fornecido",
   mas nenhum schema era enviado — o modelo inventava a própria forma, reprovava na validação e
   o reenvio único dobrava o custo de cada etapa. **A primeira execução real custou US$ 4,64 e
   não produziu memo por causa disso.** Corrigido com saída estruturada nos dois fornecedores
   (`src/lib/schema-json.ts`), mais dois achados no caminho:
   - a saída estruturada da Anthropic recusa `minimum`/`maximum`/`maxLength`; essas restrições
     são removidas do que vai ao modelo e continuam valendo no Zod, que é quem valida;
   - `modelo` e `fornecedor` saíram do schema e passaram a ser **carimbados pelo servidor**.
     Perguntado sobre o próprio identificador, o Sonnet 5 respondeu `"gpt-5-thinking"`.

## 3. O problema aberto: o critério de 3 minutos

A §13.1 exige memo em menos de 3 minutos. A §3.2 fixa `effort: "high"` nos quatro papéis Claude.
**Os dois não fecham juntos** com o dossiê de ~97 mil tokens.

Medido nesta sessão, com um dossiê pequeno (8 mil tokens), uma chamada de especialista:

| Esforço | Tempo | Saída |
|---|---|---|
| `high` | 70 s e 351 s em duas medições | 6.685 e 7.835 tokens |
| `low` | 19,5 s | 1.964 tokens |

A execução tem **quatro estágios sequenciais** (planejamento → especialistas em paralelo →
contrarian → consolidações em paralelo). Mesmo no melhor caso de `high`, quatro estágios de
70 s já dão 4 min 40 s.

`src/lib/fornecedores/anthropic.ts` ganhou a variável `ESFORCO_CLAUDE`, que **continua com padrão
`"high"`**, como o spec manda. A escolha entre baixar o esforço, encolher o dossiê ou revisar o
critério é do autor — está registrada como decisão pendente, não tomada em silêncio.

Encolher o dossiê é a alternativa com melhor relação custo-benefício: os três releases de 4T
respondem por **260 mil dos 387 mil caracteres** e são o material menos estruturado do conjunto.

## 4. Fase 2 — o que falta

| # | Pendência | Estado |
|---|---|---|
| 1 | Identificador do contrarian e `OPENAI_API_KEY` | ✅ resolvida |
| 2 | `ANTHROPIC_API_KEY` | ✅ resolvida |
| 3 | Repositório público | ✅ público desde 2/9/2026 |
| 4 | **Publicar o commit** no GitHub | ⬜ aguarda sua autorização — o repo é público |
| 5 | `vercel login` + provisionar o KV | ⬜ **só você pode**: `! vercel login` (fluxo de dispositivo) |
| 6 | Decidir o esforço / tamanho do dossiê (§3 acima) | ⬜ decisão sua |
| 7 | Dez execuções de medição de custo (§9) | ⬜ ~US$ 1,30 cada; aguarda sua autorização |
| 8 | Vídeo de 5 minutos (§13.10) | ⬜ depende do app publicado |

## 5. Segurança — uma coisa que você precisa saber

As chaves estavam preenchidas também no **`.env.example`**, que é versionado. O teste da §10.6
pegou isso e o arquivo foi limpo antes de qualquer commit — nenhuma chave entrou no histórico do
git. Mas a `ANTHROPIC_API_KEY` **apareceu por extenso na saída daquele teste**, nesta sessão.

**Recomendação: gire a `ANTHROPIC_API_KEY` no console da Anthropic** e atualize o `.env.local`.
O teste foi corrigido para comparar comprimento, nunca valor — uma falha dele não imprime mais o
segredo que acabou de encontrar. O hook de pre-commit também passou a barrar `sk-ant-…` e
`sk-proj-…` por extenso em qualquer arquivo do commit.

## 6. Onde está o material de origem

| O que | Onde |
|---|---|
| Dossiê do caso, 18 arquivos | `../02_Dossie_Caso/dossie/` |
| Gabarito do erro deliberado da Aula 2 (**fora do app**) | `../02_Dossie_Caso/erro.md` |
| Prompt estruturado da Aula 1 | `../03_Prompt_e_Skill/Prompt_Estruturado_Analise_Credito.md` |
| Metodologia: indicadores, pesos, escala R1–R7 | `../03_Prompt_e_Skill/credit-analysis/references/metodologia.md` |
| Modelo de credit memo | `../03_Prompt_e_Skill/credit-analysis/references/modelo_credit_memo.md` |
| Preset de tokens e versões da família | `D:\jose_americo\laboratorio-derivativos\src\app\globals.css` |
| Plano de produção do curso | `../00_LEIAME.md` |

`npm run sync:curso` confere se `src/prompts/curso/` divergiu do curso. É script local: o
repositório é autônomo e o CI não enxerga `03_Prompt_e_Skill/`.

## 7. Armadilhas conhecidas

- **Não** acrescentar sufixo de data a identificador de modelo Anthropic.
- **Não** enviar `temperature` a nenhum dos dois modelos — os dois devolvem 400.
- **Não** pedir ao modelo que preencha `modelo` ou `fornecedor`: ele inventa.
- **Não** enviar JSON Schema com `minimum`/`maximum`/`maxLength` à saída estruturada da Anthropic.
- **Não** mandar os três `DFP_*.pdf` (5 MB cada) por extenso aos agentes.
- **Não** embarcar a planilha adulterada da Aula 2 no aplicativo.
- **Não** deixar `src/prompts/curso/` divergir do curso em silêncio.
- **Não** persistir arquivo enviado pelo usuário. O armazém guarda só log, plano, análises e memos.
- A §1.2 é contrato. Qualquer inclusão fora dela exige decisão explícita do autor.
