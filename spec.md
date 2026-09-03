# spec.md — Comitê de Crédito IA

> Especificação de build. Item 7.4 do plano de produção do curso *IA Aplicada a Finanças com
> Claude*. Este documento é a entrada do **claude-code**: ele deve bastar para construir o
> aplicativo sem adivinhar. O que não estiver aqui, pergunte antes de implementar.
>
> **Versão:** 1.2 — 2 de setembro de 2026 · **Autor:** José Américo · **Revisor do código:** Codex
>
> **O que mudou da 1.1 para a 1.2.** Nove decisões tomadas *durante* a construção, registradas na
> §15.1. Sete corrigem o que só a API real revelou: o identificador do contrarian
> (`gpt-5.6-luna`), o fato de ele **também** recusar `temperature`, o preço dele ser um décimo do
> Claude, a necessidade de **enviar** o contrato em JSON Schema aos modelos, o esforço passando de
> `high` para `medium`, e a saída dos três releases de 4T do dossiê demo — dois terços do contexto
> de cada agente —, com o EBITDA passando a ser calculado do plano padronizado da CVM. A primeira
> execução real do aplicativo custou US$ 4,64 e não produziu memo por causa da quarta.
>
> **O que mudou da 1.0 para a 1.1.** Doze decisões de construção foram tomadas antes da primeira
> linha de código e estão registradas na seção 15. Quatro delas corrigem exigências da 1.0 que a
> API de hoje torna impossíveis ou que não fechavam entre si: o *snapshot* datado de modelo não
> existe (§3.2), `temperature` foi removida dos modelos Claude atuais (§3.2), a contagem de
> chamadas por execução não batia (§10.3) e o preset de `globals.css` foi localizado (§2). Esta é
> a cópia canônica; a de `04_Spec_App/` ficou como ponteiro histórico.

---

## 1. O que é e por que existe


Um aplicativo web público que executa uma **análise de crédito por arquitetura multiagente** e a
submete a **aprovação humana**. Ele é material didático: é o produto que a Aula 4 do curso mostra
pronto, abre por dentro e altera ao vivo.

A tese pedagógica que o app precisa tornar visível é uma só:

> **O aplicativo não é a inteligência. Ele é a interface de distribuição do trabalho feito nas
> seis camadas anteriores.**

O prompt de sistema de cada agente é literalmente o prompt estruturado da Aula 1 mais a skill
`credit-analysis` da Aula 3, recortados por papel. Quem assistiu às três primeiras aulas precisa
**reconhecer** o próprio trabalho dentro do código.

### 1.1 Objetivos

1. Executar a análise completa de uma empresa a partir de demonstrações financeiras e CNPJ.
2. Mostrar **o output intermediário de cada agente**, não apenas o memo final. Sem isso a
   arquitetura fica invisível para a turma e o app vira uma caixa-preta — exatamente o oposto do
   que o curso ensina.
3. Demonstrar independência do revisor: o agente *contrarian* roda em **outro fornecedor**.
4. Exigir decisão humana explícita no fim. O app não conclui sozinho.
5. Exibir o **custo estimado da execução**. É dado de aula.

### 1.2 Não-objetivos (v1)

Autenticação de usuários; banco de dados persistente; múltiplos aprovadores ou alçadas; consulta a
bureaus de crédito; edição de prompt pela interface; mais de quatro especialistas; agentes que
chamam outros agentes; cobrança; histórico entre sessões; aplicativo móvel nativo.

Se durante a construção surgir a tentação de incluir qualquer um desses itens, **pare e pergunte**.
O risco número um deste projeto é o escopo crescer e consumir o tempo de preparação das aulas.

---

## 2. Stack e identidade visual (fixos, não negociáveis)

Idênticos aos demais laboratórios do professor, para que a família de aplicativos tenha a mesma
identidade.

- **TypeScript** + **Next.js (App Router)** + **React** + **Tailwind CSS v4** (configurado por CSS,
  sem `tailwind.config.js`).
- **shadcn/ui**, estilo `base-nova`, `cssVariables: true`, ícones **lucide**.
- **Recharts** para gráficos.
- **GitHub** (repositório público) + **Vercel** (deploy).
- Tipografia: **Manrope** (títulos, `--font-heading`), **Inter** (corpo, `--font-sans`).
- Tokens de cor: primary `#00314a`, primary-container `#134866`, secondary `#006b5f`,
  secondary-container `#8df5e4`, error `#ba1a1a`, background `#f8f9fa`, card `#ffffff`,
  foreground `#191c1d`, muted-foreground `#3f4945`, border `#e1e3e4`, ring `#00314a`.
  Raio base `--radius: 0.625rem`; cards `rounded-xl`.
- Paleta para gráficos: `accent #006b5f`, `green #059669`, `red #dc2626`, `gold #d97706`.

O construtor **não escolhe** paleta, fonte nem raio. Copie o `globals.css` do preset compartilhado,
que fica em `D:\jose_americo\laboratorio-derivativos\src\app\globals.css` — 200 linhas, com os
`--sidebar-*`, os `--radius-*` derivados e um bloco `.dark`, nenhum dos quais está listado acima.
Copie o arquivo inteiro, verbatim; não o reconstrua a partir da lista de cores desta seção.

Versões da família, casadas com aquele laboratório: **Next 16.2.1**, **React 19.2.4**,
**shadcn 4.1**, **Recharts 3.8**, **`@base-ui/react` 1.3**, **Tailwind v4** via
`@tailwindcss/postcss`, **`tw-animate-css`**. O `components.json` é `style: "base-nova"`,
`baseColor: "neutral"`, `cssVariables: true`, `iconLibrary: "lucide"`, com o CSS em
`src/app/globals.css`.

---

## 3. Arquitetura

```
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
                                   │  (4 chamadas em paralelo)
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
                    aprovar · devolver com comentário · rejeitar
                                │
                                ▼
                    LOG DA EXECUÇÃO (modelos, identificadores,
                    tokens, tempo, divergências, custo)
```

### 3.1 Sequência

1. **Preparação (servidor).** Extrai texto das demonstrações, normaliza e monta o `DossieEntrada`.
   Se o arquivo for planilha, converte para tabelas em texto (**SheetJS**); se for PDF, extrai por
   página com **`unpdf`**, marcando cada página como `[p. N]` no texto (a rastreabilidade depende
   disso). Um único dossiê em texto alimenta os dois fornecedores — o contrarian não é Anthropic e
   não receberia um bloco `document` nativo.
2. **Planejamento.** O supervisor recebe o `DossieEntrada` e devolve um `PlanoDeAnalise`: o que
   cada especialista deve olhar e quais lacunas já detectou.
3. **Despacho paralelo.** Os três especialistas Claude rodam **simultaneamente**, cada um com o
   seu prompt de sistema e o mesmo `DossieEntrada`.
4. **Contrarian.** Só começa quando os três terminam, porque ele recebe as três análises como
   entrada. Roda no fornecedor não-Anthropic definido em `MODEL_CONTRARIAN` (§3.2).
5. **Consolidação, duas vezes.** Quando o contrarian está ligado, o supervisor consolida **duas
   vezes em paralelo**: uma vez com as três análises dos especialistas e outra com as quatro. As
   duas versões do `CreditMemo` ficam prontas ao fim da execução, e é isso que permite ao
   interruptor da §6.3 alternar entre elas sem nova chamada de API. Cada consolidação registra
   explicitamente **onde os agentes divergiram** e qual modelo emitiu cada análise.

   **Chamadas por execução:** 7 com o contrarian ligado (1 planejamento + 3 especialistas +
   1 contrarian + 2 consolidações) e 5 com ele desligado (1 planejamento + 3 especialistas +
   1 consolidação).
6. **Aprovação.** Estado `aguardando_decisao` até a pessoa agir.

### 3.2 Modelos, identificação e esforço

| Papel | Fornecedor | Variável de ambiente | Valor | Determinismo |
|---|---|---|---|---|
| Supervisor — planejamento | Anthropic | `MODEL_SUPERVISOR` | `claude-sonnet-5` | `effort: "low"` |
| Supervisor — consolidação | Anthropic | `MODEL_SUPERVISOR` | `claude-sonnet-5` | `effort: "medium"` |
| Analista financeiro | Anthropic | `MODEL_ESPECIALISTA` | `claude-sonnet-5` | `effort: "medium"` |
| Analista setorial | Anthropic | `MODEL_ESPECIALISTA` | `claude-sonnet-5` | `effort: "medium"` |
| Analista jurídico-regulatório | Anthropic | `MODEL_ESPECIALISTA` | `claude-sonnet-5` | `effort: "medium"` |
| Contrarian | OpenAI | `MODEL_CONTRARIAN` | `gpt-5.6-luna` | padrão do modelo (1,0) |

**Correção à versão 1.1 — o contrarian foi confirmado, e ele também não aceita `temperature`.**
A 1.1 deixava o identificador pendente e fixava `temperature: 0.7` do lado não-Anthropic. Em
2 de setembro de 2026 a Models API da OpenAI confirmou que a família 5.6 tem `gpt-5.6-luna`,
`gpt-5.6-sol` e `gpt-5.6-terra`; o autor escolheu **`gpt-5.6-luna`** (a 1.0 supunha "Sol").
E `gpt-5.6-luna` devolve HTTP 400 para `temperature: 0.7` — *"Only the default (1) value is
supported"*. O parâmetro é omitido e o modelo roda no padrão 1,0, que é **mais** variável que os
0,7 pretendidos: a variabilidade continua exatamente onde o objetivo é gerar objeções. O log
registra `padrão (1,0)` na coluna de esforço.

**Correção à versão 1.1 — os dois fornecedores NÃO custam o mesmo.** A 1.1 afirmava que Sonnet 5
e o contrarian custavam ambos US$ 2,00/10,00, o que tornaria a tela de log uma comparação limpa
de contexto e não de preço de tabela. O preço real de `gpt-5.6-luna` é **US$ 0,20 entrada /
US$ 1,20 saída** por milhão — dez vezes mais barato. A tela de log fica com uma comparação
diferente, e melhor: ela mostra que a linha mais cara da execução é uma escolha de arquitetura
(quanto contexto cada agente recebe) *e* de preço de tabela, e que as duas coisas se somam. A
§9 traz os valores corrigidos, com a data da consulta.

**Correção à versão 1.0 — não existe snapshot datado.** A 1.0 exigia "o identificador com data
(o *snapshot*), nunca o alias móvel". Os identificadores de modelo da API Anthropic hoje são
completos como estão: `claude-sonnet-5`, `claude-opus-5`. Não há forma datada, e anexar um sufixo
de data produz um identificador inválido. A reprodutibilidade que a 1.0 buscava é obtida de outro
modo, em três camadas:

1. O identificador exato fica fixado em variável de ambiente e aparece no log de cada execução e
   na tela "Como foi construído".
2. `/api/saude` consulta a Models API dos dois fornecedores e **registra o modelo efetivamente
   servido**, com data e hora. É esse registro que se compara entre o ensaio e a aula.
3. `evals/ultimo.json` guarda a última rodada de evals com o identificador e a data em que rodou.

**Correção à versão 1.0 — `temperature` foi removida.** A 1.0 fixava `temperature` 0 para os
especialistas e o supervisor e 0,7 para o contrarian. Nos modelos Claude atuais (Sonnet 5, Opus 5
e toda a família 4.6+) o parâmetro `temperature` foi **removido e devolve HTTP 400**. O controle
equivalente é `output_config.effort`, com níveis de `low` a `max`.

**Correção à versão 1.1 — o esforço passou de `high` para `medium`.** A 1.1 fixava `"high"` nos
quatro papéis Claude. Medido em 2 de setembro de 2026, uma chamada de especialista em `"high"`
levou **70 s e 351 s** em duas medições; em `"low"`, 19,5 s, com análise válida. A execução tem
quatro estágios sequenciais (planejamento → especialistas em paralelo → contrarian →
consolidações em paralelo), e mesmo o melhor caso de `"high"` não cabe nos 3 minutos do critério
§13.1. Decisão do autor: **`effort: "medium"`**. A variável de ambiente `ESFORCO_CLAUDE` existe
para o ensaio comparar os níveis sem alterar código, e o padrão do código é o que esta tabela diz.

O contrarian **também** não aceita `temperature` — ver a correção acima. Ele roda no padrão do
modelo, 1,0, que é mais variável que os 0,7 que a 1.1 pretendia: a variabilidade permanece
exatamente onde o objetivo é gerar objeções.

O campo `temperatura` do `LogExecucao` passa a se chamar `esforco` e é `string | number`: o nível
de esforço nos papéis Claude, a temperatura no contrarian. A coluna correspondente da tela de log
(§6.5) muda junto.

---

## 4. Contrato de dados

Um único schema para as quatro análises. É esse contrato que permite ao supervisor consolidar sem
interpretar prosa, e é ele que a Aula 4 mostra na tela para explicar o que significa "contrato de
dados entre agentes".

```ts
// src/lib/schema.ts
export type Probabilidade = "baixa" | "media" | "alta";
export type Severidade    = "baixa" | "media" | "alta";
export type Classificacao = "R1"|"R2"|"R3"|"R4"|"R5"|"R6"|"R7";
export type Papel = "financeiro" | "setorial" | "juridico_regulatorio" | "contrarian";

export interface Evidencia {
  afirmacao: string;      // o que está sendo afirmado, em uma frase
  origem: string;         // "BP consolidado, conta 2.01, exercício 2025" ou "DFP 2025, p. 47"
  valor?: number;         // em R$ milhões, quando aplicável
  exercicio?: string;     // "2023" | "2024" | "2025"
}

export interface Risco {
  descricao: string;
  evidencia: Evidencia;
  probabilidade: Probabilidade;
  severidade: Severidade;
}

export interface AnaliseAgente {
  papel: Papel;
  modelo: string;             // identificador exato usado
  fornecedor: "anthropic" | "openai";
  classificacao: Classificacao;
  score: number;              // 1,0 a 5,0
  sintese: string;            // até 600 caracteres
  evidencias: Evidencia[];    // mínimo 3
  riscos: Risco[];            // 3 a 6
  informacao_ausente: string[];
  confianca: number;          // 0 a 1 — quanto o agente confia na própria conclusão
  divergencias?: string[];    // preenchido apenas pelo contrarian
  verificacoes: {
    balanco_fecha: boolean | null;
    numeros_sem_origem: string[];
    indicadores_invalidos: string[];
  };
}
```

```ts
export interface CreditMemo {
  execucao_id: string;
  contraparte: { nome: string; cnpj: string };
  operacao: { valor_reais: number; prazo_meses: number; modalidade: string; data_base: string };
  recomendacao: "conceder" | "conceder_com_condicoes" | "nao_conceder";
  classificacao: Classificacao;
  score_consolidado: number;
  sintese: string[];                 // 5 marcadores, cada um com um número
  quadro_indicadores: Array<{ indicador: string; v2023?: number; v2024?: number; v2025?: number; origem: string }>;
  leitura_do_negocio: string;        // dois parágrafos
  riscos: Risco[];
  condicoes_sugeridas: string[];     // vazio quando a recomendação é "conceder"
  informacao_ausente: string[];
  divergencias: Array<{ tema: string; posicoes: Array<{ papel: Papel; posicao: string }> }>;
  contrarian_incluido: boolean;
  analises: AnaliseAgente[];
}
```

```ts
export interface LogExecucao {
  execucao_id: string;
  iniciado_em: string; concluido_em: string; duracao_ms: number;
  chamadas: Array<{
    papel: Papel | "supervisor";
    fornecedor: "anthropic" | "openai";
    modelo: string;            // identificador exato
    esforco: string | number;  // "high" nos papéis Claude, 0.7 no contrarian
    tokens_entrada: number; tokens_saida: number;
    duracao_ms: number;
    custo_usd: number;
    erro?: string;
  }>;
  custo_total_usd: number;
  divergencias_detectadas: number;
  modelos_servidos?: Record<string, string>;  // o que /api/saude viu, com data
  decisao_humana?: { acao: "aprovado"|"devolvido"|"rejeitado"; comentario?: string; em: string };
}
```

**Regras de contrato.**

- Toda resposta de agente é validada com **Zod** contra o schema. Resposta que não valida é
  reenviada **uma vez** com o erro de validação anexado; se falhar de novo, a análise entra no memo
  com `erro` preenchido e o supervisor consolida sem ela, dizendo isso no memo.
- `evidencias` com menos de 3 itens reprova a validação. É a tradução, em código, da regra "cada
  número tem endereço".
- O supervisor **nunca inventa** um valor que não esteja em alguma `Evidencia` recebida.

---

## 5. Prompts de sistema

Ficam em `src/prompts/*.ts`, um arquivo por papel, exportados como constantes — **não embutidos em
componentes**. A Aula 4 abre esses arquivos na tela; eles precisam ser legíveis por quem não
programa. Todos compartilham um preâmbulo comum importado de `src/prompts/comum.ts`.

### 5.1 Preâmbulo comum (todos os agentes)

```
Você trabalha em um comitê de crédito. Sua saída não é um texto para leitura humana direta:
é um objeto JSON que será consolidado por um supervisor. Responda APENAS com JSON válido no
schema fornecido, sem cercas de código e sem comentários.

Regras que valem para todos os papéis:
- Cada número que você afirmar precisa vir com a origem: conta e exercício, ou documento e página.
- Não estime, não interpole e não complete valor ausente. Ausência de dado vai para
  "informacao_ausente" — é um achado, não um problema a resolver.
- Não use conhecimento próprio sobre a empresa. Só existe o que está no dossiê fornecido.
- Distinga valor divulgado pela companhia, valor recalculado por você e inferência sua.
- Valores em R$ milhões, uma casa decimal.
- Preencha "confianca" honestamente. Confiança alta com poucas evidências é um erro grave.
- Preencha "verificacoes" sempre, inclusive quando estiver tudo certo.
```

### 5.2 Supervisor — planejamento

```
Você é o supervisor do comitê. Você não analisa: você organiza a análise e depois consolida.

Na etapa de planejamento, a partir do dossiê recebido, produza:
1. As lacunas de informação que você já consegue identificar no material.
2. Para cada um dos três especialistas, duas a quatro perguntas específicas que ele deve
   responder — derivadas deste dossiê, não genéricas.
3. Os dois pontos do caso que você espera que gerem divergência entre os analistas.

Não antecipe conclusão. Se você concluir aqui, contamina os especialistas.
```

### 5.3 Supervisor — consolidação

```
Você recebeu quatro análises independentes: financeira, setorial, jurídico-regulatória e uma
revisão contrarian produzida por um modelo de outro fornecedor.

Produza o credit memo. Regras:
- Não crie número novo. Todo valor do memo tem de estar em alguma evidência recebida.
- Onde os analistas divergirem, registre a divergência em "divergencias" com a posição de cada
  um. NÃO resolva a divergência escolhendo em silêncio: a divergência é informação para quem
  decide.
- O contrarian tem peso próprio: se ele apresentar objeção sustentada em evidência, ela entra no
  memo mesmo que contrarie os outros três. Se a objeção não tiver evidência, registre que a
  objeção foi apresentada sem evidência.
- O score consolidado é a média dos scores dos três especialistas, ajustada em até 0,5 ponto para
  baixo se o contrarian apresentar objeção com evidência e severidade alta. Mostre o cálculo.
- A recomendação segue a escala: R1 a R3 conceder; R4 e R5 conceder com condições; R6 e R7 não
  conceder.
- "condicoes_sugeridas" só é preenchido quando a recomendação for "conceder_com_condicoes".
```

### 5.4 Analista financeiro

```
Você é analista de crédito sênior. Seu escopo é exclusivamente o que está nas demonstrações.

Execute, nesta ordem, e reflita o resultado nas evidências:
1. Reconciliação: ativo total = passivo + patrimônio líquido, em cada exercício.
2. Liquidez corrente, liquidez seca e capital circulante líquido.
3. Ciclo de caixa: prazos médios de estoque, recebimento e pagamento; ciclo de conversão.
4. Alavancagem em DUAS versões — (a) dívida financeira apenas; (b) dívida financeira mais
   arrendamentos mais risco sacado a fornecedores. Reporte as duas e explicite a diferença.
5. Cobertura de juros e cobertura do serviço da dívida.
6. Qualidade do resultado: separe resultado contábil de geração de caixa e identifique itens sem
   efeito caixa relevantes.
7. Score pelos pesos: liquidez 20%, alavancagem 25%, cobertura 25%, geração de caixa 20%,
   qualidade da informação e eventos de crédito 10%.

Se a companhia divulga um EBITDA ajustado, reporte o divulgado e o seu, e liste os ajustes dela.
```

### 5.5 Analista setorial

```
Você analisa a posição competitiva e a dinâmica do setor da contraparte, usando SOMENTE o que o
dossiê contém — inclusive comparação com os pares, quando houver dados de pares no dossiê.

Cubra: modelo de negócio e como ele consome caixa; sensibilidade a juros, câmbio e emprego;
sazonalidade e o que ela faz com o capital de giro nos 24 meses da operação; posição relativa aos
pares nos indicadores disponíveis; e concentração de fornecedores ou de clientes, se houver
evidência.

Se o dossiê não trouxer dado de pares, diga isso em "informacao_ausente" e não invente referência
de mercado. Uma média setorial que você "sabe" não é evidência.
```

### 5.6 Analista jurídico-regulatório

```
Você examina o que pode impedir ou subordinar o pagamento, a partir do que está no dossiê:
eventos de reestruturação e seus efeitos sobre credores novos; garantias já concedidas a terceiros
e o grau de subordinação de um credor quirografário novo; covenants existentes; contingências
tributárias, trabalhistas e cíveis com provisão ou divulgação; ressalvas e ênfases do auditor;
partes relacionadas.

Para cada ponto, a evidência é a nota explicativa ou o documento e a página. Sem isso, o ponto vai
para "informacao_ausente".

Você não emite parecer jurídico e não cita legislação que não esteja no dossiê. Você identifica o
que um advogado precisaria olhar antes da assinatura.
```

### 5.7 Contrarian (outro fornecedor)

```
Você é o revisor independente do comitê e trabalha para OUTRA instituição que a dos três analistas
cuja produção você recebe. Sua função não é concordar: é tentar derrubar as três análises.

Faça, nesta ordem:
1. Procure afirmações sem evidência. Liste cada uma em "divergencias".
2. Procure números que não batem entre as três análises. Números diferentes para o mesmo
   indicador são achado de primeira ordem.
3. Procure a conclusão confortável: onde os três convergiram rápido demais e a convergência pode
   ser efeito de todos terem lido o mesmo material do mesmo jeito.
4. Construa o cenário adverso plausível que derruba a operação nos 24 meses, ancorado em uma
   evidência do dossiê.
5. Só então emita a sua própria classificação e score.

Restrição que vale contra você também: objeção sem evidência no dossiê é opinião, e você deve
marcá-la como tal. Discordar por discordar destrói o valor do seu papel.
```

### 5.8 Os artefatos do curso entram verbatim

O §1 afirma que o prompt de cada agente é *"literalmente o prompt estruturado da Aula 1 mais a
skill `credit-analysis` da Aula 3, recortados por papel"*. Os textos de 5.1 a 5.7 sozinhos não
cumprem isso: não trazem as definições de indicador nem a escala R1–R7, sem as quais os agentes
não têm como aplicar a metodologia canônica nem devolver `classificacao` de forma consistente.

Três arquivos do curso são copiados **verbatim** para `src/prompts/curso/`, como módulos
versionados:

| Origem no curso | Destino no repositório |
|---|---|
| `03_Prompt_e_Skill/Prompt_Estruturado_Analise_Credito.md` | `src/prompts/curso/prompt_aula1.ts` |
| `03_Prompt_e_Skill/credit-analysis/references/metodologia.md` | `src/prompts/curso/metodologia.ts` |
| `03_Prompt_e_Skill/credit-analysis/references/modelo_credit_memo.md` | `src/prompts/curso/modelo_credit_memo.ts` |

Cada prompt de papel é uma concatenação simples e legível — preâmbulo 5.1, mais o texto do papel,
mais os módulos do curso de que aquele papel precisa. Nada de montagem dinâmica engenhosa: a §11.5
vale aqui com força total.

A escala R1–R7 e as fronteiras de score vêm da `metodologia.md` e **batem exatamente** com as
fronteiras que a §10.1 manda testar (3,4/3,5 separam R4 de R3; 2,4/2,5 separam R6 de R5).

O repositório é público e autônomo: a cópia em `src/prompts/curso/` **é** a fonte de verdade do
código. A comparação com a pasta do curso é um script local, `npm run sync:curso`, que reporta
divergência — não um teste de CI, porque a Vercel e o GitHub Actions não enxergam
`03_Prompt_e_Skill/`.

---

## 6. Telas

Seis telas. A ordem é o fluxo da demonstração da Aula 4 — a navegação não deve permitir pular a
aprovação.

### 6.1 Entrada — `/`

Cabeçalho curto explicando o que o app é (três linhas) e o formulário:

- Upload de arquivos (PDF ou XLSX, até 5 arquivos, 20 MB cada) com área de arrastar e soltar.
- CNPJ (com máscara e validação de dígito verificador) e nome da contraparte.
- Valor da operação (R$), prazo (meses), modalidade (select), data-base (date).
- Interruptor **"incluir revisão contrarian"**, ligado por padrão. É ele que permite a
  demonstração "memo com e sem o contrarian".
- Botão **Executar análise**, desabilitado enquanto faltar campo obrigatório.
- Link discreto para carregar o **caso de demonstração** (Casas Bahia, dossiê embarcado no
  repositório) — para a aula não depender de upload ao vivo.

O dossiê demo é **curado e pré-extraído**, comitado como `public/demo/dossie-casas-bahia.json`:
balanço, DRE e fluxo de caixa dos exercícios de 2023 a 2025 extraídos da planilha da Aula 2 (com
conta e exercício preservados), os sete fatos relevantes do evento de crédito por extenso e os
indicadores dos pares do varejo. Os três `DFP_*.pdf` (5 MB cada, centenas de páginas) **não**
entram como texto integral — só como referência de página nas evidências. Enviar os três inteiros
a cada agente ameaçaria o critério 13.1 (memo em menos de 3 minutos) e o teto de custo da §8.6,
sem acrescentar nada que a planilha já não traga de forma estruturada.

**Correção à versão 1.1 — os três releases de 4T saíram do dossiê.** A 1.1 os incluía. Medido em
2 de setembro de 2026, com eles cada agente recebia **207 mil tokens** — não os 97 mil que a
conta de "quatro caracteres por token" sugeria, porque tabela numérica tokeniza a menos de dois —
e a execução completa levava **255 s** e custava **US$ 2,62**. Os três respondiam por 260 dos 387
mil caracteres e eram o material menos estruturado do conjunto: prosa de relações com
investidores, com tabelas achatadas pela extração de PDF. Sem eles o dossiê tem 126 mil
caracteres e ~32 mil tokens por agente.

O que se perde é o **EBITDA ajustado divulgado pela companhia**, que a §5.4 manda reportar ao
lado do recalculado. Isso não é suprido em silêncio, em duas frentes:

1. Um módulo de app, `src/prompts/contas-cvm.ts`, define o EBITDA a partir do plano padronizado —
   **conta 3.05 (resultado antes do resultado financeiro e dos tributos) + conta 6.01.01.03
   (depreciação e amortização, da DFC)** — e mapeia em quais contas mora cada insumo da
   metodologia, inclusive as duas versões de dívida. Sem uma definição única, cada agente montaria
   a sua e o supervisor registraria como divergência de análise o que seria divergência de
   definição.
2. O mesmo módulo e o documento de referência do dossiê mandam registrar em `informacao_ausente`
   que o ajustado da companhia não está disponível e que, por isso, os ajustes dela não puderam
   ser confrontados. É exatamente o comportamento que a §5.4 pede quando o dado falta.

Os releases continuam no dossiê da Aula 2, em `02_Dossie_Caso/dossie/`.

Fica **um único** caso de demonstração, com os dados conferidos. A planilha adulterada da Aula 2
(`casas_bahia_DFP_bruto_com_erro.xlsx`) permanece assunto exclusivo daquela aula e não é embarcada
no aplicativo.

### 6.2 Execução — `/analise/[id]`

A tela mais importante do curso. Cinco cartões, um por agente (supervisor, financeiro, setorial,
jurídico-regulatório, contrarian), cada um com:

- estado: `aguardando` · `executando` · `concluído` · `erro`;
- fornecedor e identificador do modelo, visíveis (badge com o nome do fornecedor);
- tempo decorrido e tokens consumidos, atualizados em tempo real;
- ao concluir, **o JSON da análise, expansível** — não só a síntese. É isso que torna a
  arquitetura visível.

Os três especialistas aparecem lado a lado, com barras de progresso simultâneas, para que o
paralelismo seja perceptível. O contrarian aparece abaixo, com um traço ligando os três a ele,
deixando claro que ele só começa depois.

Streaming via **Server-Sent Events**; a página se reconstrói a partir do log se for recarregada.

### 6.3 Credit memo — `/analise/[id]/memo`

O memo renderizado na ordem do modelo de credit memo do curso. Elementos obrigatórios:

- Faixa de recomendação no topo (cor conforme a decisão: `secondary` conceder, `gold` com
  condições, `error` não conceder).
- Toda evidência é clicável: abre um painel lateral com a origem (conta e exercício, ou documento
  e página).
- Bloco **Divergências**, sempre presente. Quando não houver divergência, o texto é
  "nenhuma divergência registrada" — a ausência também é informação.
- Interruptor **com/sem contrarian** que reexibe o memo **sem nova chamada de API**: as duas
  versões foram consolidadas em paralelo durante a execução (§3.1, etapa 5), então o interruptor
  apenas alterna entre dois `CreditMemo` já prontos. A comparação é real — muda o texto do memo,
  não só o score — e é nesse momento que a turma vê o que o revisor independente acrescentou.
- Botão de exportar o memo em Markdown e o log em JSON.

### 6.4 Aprovação — `/analise/[id]/decisao`

Etapa obrigatória, sem atalho. Três ações: **aprovar**, **devolver com comentário** (comentário
obrigatório, mínimo 20 caracteres), **rejeitar** (justificativa obrigatória). Antes dos botões,
uma linha em destaque:

> *O aplicativo não concede crédito. A decisão registrada abaixo é sua.*

Após a decisão, a tela mostra o registro com data, hora e ação, e libera o log.

### 6.5 Log e custo — `/analise/[id]/log`

Tabela por chamada: papel, fornecedor, identificador do modelo, esforço, tokens de entrada e de
saída, tempo, custo em dólares. São 7 linhas com o contrarian ligado e 5 com ele desligado; as duas
consolidações aparecem como linhas distintas, rotuladas "consolidação (sem contrarian)" e
"consolidação (com contrarian)". Rodapé com o total e o custo por execução. Um pequeno gráfico de barras
(Recharts) com a distribuição de custo por agente. Botão para baixar o `LogExecucao` em JSON.

### 6.6 Como foi construído — `/sobre`

Tela de aula, não de produto. Conteúdo: o diagrama da arquitetura; a lista dos identificadores de
modelo em uso, com o resultado da última verificação de `/api/saude`;
os links para o `spec.md`, o `CLAUDE.md`, o `AGENTS.md` e o repositório; e a frase que fecha o
curso — *o aplicativo não é a inteligência, é a interface de distribuição do trabalho das seis
camadas anteriores*.

---

## 7. Rotas de API

| Rota | Método | Faz |
|---|---|---|
| `/api/analise` | POST | Recebe arquivos e parâmetros, cria `execucao_id`, dispara a orquestração, devolve o id |
| `/api/analise/[id]/stream` | GET | SSE com os eventos de progresso e as análises concluídas |
| `/api/analise/[id]` | GET | Estado atual, memo e log |
| `/api/analise/[id]/decisao` | POST | Registra a decisão humana |
| `/api/saude` | GET | Verifica se as duas chaves respondem — usado no ensaio, antes da aula |

Nenhuma chamada a fornecedor de modelo parte do navegador. **Nunca.**

---

## 8. Governança embutida

Esta seção não é acessória: é o conteúdo da última meia hora do curso.

1. **Chaves.** `ANTHROPIC_API_KEY` e `OPENAI_API_KEY` apenas como variáveis de ambiente do
   servidor na Vercel. Sem prefixo `NEXT_PUBLIC_`. Um teste automatizado falha se qualquer
   arquivo em `src/app`/`src/components` referenciar uma chave.
2. **Dados.** Nada do que o usuário envia é persistido. Os arquivos enviados vivem **apenas em
   memória** durante a execução e nunca são gravados em lugar nenhum. A tela de entrada avisa isso
   em uma linha, antes do upload. É a tradução prática do bloco "sigilo e LGPD" da Aula 2.

   **Onde o estado da execução mora.** A §1.2 proíbe banco de dados persistente, mas a §6.2 exige
   que a página se reconstrua ao ser recarregada e a §10.3 testa isso. Na Vercel, funções são
   efêmeras e sem estado compartilhado: um `Map` em memória do processo não sobrevive a um reload,
   porque a requisição seguinte pode cair em outra instância. Os dois requisitos só fecham com um
   armazenamento efêmero externo.

   A solução é **Vercel KV / Upstash Redis com TTL de 2 horas**, guardando exclusivamente o
   `LogExecucao` e as análises já concluídas, em JSON. Expira sozinho, sem rotina de limpeza. Os
   arquivos enviados pelo usuário e o texto extraído deles **nunca** entram ali — é armazenamento
   de estado de execução, não banco de dados, e a distinção é a própria matéria da §8. O acesso
   fica atrás de uma interface `ArmazemExecucao` em `src/lib/armazem.ts`, com um adaptador em
   memória usado pelos testes e pelo desenvolvimento local.
3. **Log.** Toda execução gera `LogExecucao` completo, incluindo qual modelo emitiu cada análise e
   onde houve divergência. Rastreabilidade é o que permite responder "por que este parecer disse
   isso" três meses depois.
4. **Repositório público** no GitHub, com `CLAUDE.md` (instruções para o Claude Code) e
   `AGENTS.md` (instruções para o Codex). O `CLAUDE.md` **importa** o `AGENTS.md`: dois agentes,
   uma fonte de instruções. Essa importação é demonstrada em aula.
5. **Identificação de modelo verificada**, como na seção 3.2: identificador fixo em variável de
   ambiente, modelo servido registrado por `/api/saude`, ambos exibidos no log.
6. **Limite de uso.** Se o app ficar público após o curso: limite por IP (5 execuções por hora) e
   um teto global mensal de custo que, ao ser atingido, desativa a execução e mostra um aviso —
   nunca uma falha silenciosa.
7. **Responsabilidade.** A frase da tela de decisão não é decorativa. Ela é o requisito.

---

## 9. Custo por execução

Fórmula, por chamada:

```
custo_usd = (tokens_entrada / 1e6) * preco_entrada + (tokens_saida / 1e6) * preco_saida
```

Os preços ficam em `src/config/precos.ts`, uma constante por identificador de modelo, **com a data
em que o preço foi consultado**. Nunca leia preço de API em tempo de execução.

| Modelo | Entrada US$/1M | Saída US$/1M | Consultado em |
|---|---|---|---|
| `claude-sonnet-5` | 2,00 | 10,00 | 2026-09-02, docs.claude.com/en/docs/about-claude/pricing |
| `gpt-5.6-luna` | 0,20 | 1,20 | 2026-09-02, developers.openai.com/api/docs/pricing |

O contrarian custa um décimo do Claude por token. A tela de log mostra, portanto, duas coisas ao
mesmo tempo: quanto de contexto cada agente recebeu e quanto vale o token de cada fornecedor. A
linha mais cara da execução é sempre uma consolidação ou um especialista Claude, e a mais barata
é sempre o contrarian — mesmo ele recebendo o dossiê **mais** as três análises. É um dado de aula
melhor do que a paridade que a versão 1.1 supunha: mostra que arquitetura e preço de tabela se
somam, e que "colocar o revisor em outro fornecedor" pode custar quase nada.

O log exibe o custo em dólares e o equivalente em reais por uma taxa de câmbio fixa também
declarada em `precos.ts` (com data). Câmbio estimado é melhor que câmbio invisível.

**Medição feita em 2 de setembro de 2026.** Dez execuções completas do caso Casas Bahia, com o
dossiê já sem os releases de 4T, `effort: "medium"` nos papéis que analisam e `"low"` no
planejamento. Sete chamadas em todas as dez, nenhum erro, um único reenvio em setenta chamadas.

| | Custo por execução (US$) | Duração (s) |
|---|---|---|
| Média | **0,9737** | 162,7 |
| Desvio padrão | **0,0591** | — |
| Mínimo | 0,9238 | 143 |
| Mediana | 0,9744 | 161 |
| Máximo | 1,1404 | 196 |

Distribuição das durações, em segundos: 143 · 146 · 148 · 154 · 159 · 161 · 172 · 173 · 174 · 196.

**Para o item de ressarcimento:** US$ 0,97 por execução, com desvio de US$ 0,06. Um teto de
**US$ 1,20 por execução** cobre a cauda observada com folga — a execução mais cara da amostra
custou US$ 1,14, e foi justamente a única que precisou de reenvio. O teto mensal de US$ 50 da
§8.6 comporta cerca de **50 execuções**, o que dá margem confortável para ensaios e para a aula.

O custo é dominado pelo contexto de entrada: os quatro papéis Claude que leem o dossiê inteiro
respondem por cerca de 85% do total, e o contrarian, que lê o dossiê **mais** as três análises,
custa US$ 0,016 — 1,7% da execução. É o dado de aula da §9: pôr o revisor independente em outro
fornecedor custa quase nada, e o que pesa é quanto contexto cada agente recebe.

---

## 10. Testes, evals e portão de entrega

Nada é publicado com teste vermelho. O portão é quantitativo, não "no olho".

### 10.1 Testes unitários (Vitest)

- Validação de CNPJ (dígito verificador, casos válidos e inválidos).
- Cálculo de custo por chamada e total.
- Consolidação de score: média dos três especialistas e o ajuste do contrarian.
- Mapeamento de score para classificação R1–R7 nas fronteiras exatas (3,4 / 3,5 / 2,4 / 2,5).
- Parser de resposta de agente: JSON válido, JSON com cerca de código, JSON truncado, JSON com
  campo faltando — os três últimos precisam disparar o reenvio único.
- Redator do memo: memo com contrarian e sem contrarian a partir do mesmo conjunto de análises.
- Contagem de chamadas do orquestrador: 7 com contrarian ligado, 5 com ele desligado.
- Extrator de PDF: o texto produzido preserva o marcador `[p. N]` de cada página.

### 10.2 Testes de componente

- A tela de execução renderiza os cinco cartões e reflete cada estado.
- O JSON de cada agente é expansível e mostra o conteúdo integral.
- A tela de decisão não avança sem comentário nas ações "devolver" e "rejeitar".

### 10.3 Testes de ponta a ponta (Playwright), com fornecedores simulados

1. Caminho feliz: carregar o caso de demonstração, executar, ver o memo, aprovar, ver o log.
2. Caminho sem contrarian: interruptor desligado; o memo não traz seção de objeções e o log traz
   **cinco chamadas em vez de sete** (a versão 1.0 dizia "quatro em vez de cinco", contagem que não
   fecha com a consolidação dupla da §3.1 — ver §15, decisão 11).
3. Falha de um especialista: o memo é emitido com a ausência declarada e o log registra o erro.
4. Recarregar a página no meio da execução: o estado é reconstruído a partir do log.

### 10.4 Evals de qualidade da análise (com chamadas reais, rodados sob demanda)

Cinco execuções sobre o dossiê de referência:

| Eval | Limiar |
|---|---|
| Toda evidência do memo tem origem (conta e exercício, ou documento e página) | 100% |
| Nenhum valor do memo é inexistente nas evidências dos agentes | 100% |
| Alavancagem aparece nas duas versões (restrita e ampla) | 5 de 5 execuções |
| Classificação estável entre execuções | variação máxima de 1 faixa |
| O contrarian produz ao menos uma objeção com evidência | 5 de 5 |
| Seção "Verificações" presente em todas as análises | 100% |

### 10.5 Fidelidade visual

Tokens de cor, fontes e raio idênticos aos da seção 2, verificados por teste automatizado que lê o
`globals.css` e compara com a lista canônica.

### 10.6 Segurança

- Teste que falha se alguma chave aparecer em código de cliente.
- Teste que falha se `NEXT_PUBLIC_` prefixar qualquer variável sensível.
- Verificação de que nenhuma rota devolve o conteúdo bruto dos arquivos enviados.

### 10.7 Portão

O app **só publica com 100% verde** em 10.1, 10.2, 10.3, 10.5 e 10.6, e com os limiares de 10.4
atendidos na última rodada de evals. O resultado da última rodada fica em `evals/ultimo.json`,
versionado.

---

## 11. Regras de trabalho para o construtor

1. **Pense antes de escrever.** Se houver duas interpretações razoáveis de um requisito deste
   spec, exponha as duas e pergunte. Não escolha em silêncio.
2. **Simplicidade primeiro.** O mínimo que resolve. Nada de tela "que seria legal", abstração
   antecipada ou flexibilidade que ninguém pediu. A lista de não-objetivos da seção 1.2 é dura.
3. **Mudanças cirúrgicas.** Ao editar, mexa só no necessário; preserve estrutura e estilo.
4. **Execução orientada a objetivo.** Termine cada etapa com o critério de sucesso verificado, não
   com a impressão de que funcionou.
5. **Legibilidade acima de esperteza nos prompts.** Os arquivos de `src/prompts/` serão projetados
   em uma sala de aula para pessoas que não programam. Nada de concatenação dinâmica engenhosa:
   texto claro, em português, com o mínimo de interpolação.

---

## 12. `CLAUDE.md` e `AGENTS.md` (a criar no repositório)

O `CLAUDE.md` é conteúdo de aula — a Aula 4 gera com `/init`, lê o que foi gerado e **acrescenta
ao vivo** três regras de metodologia de crédito:

```
- Nunca inventar indicador. Todo indicador exibido tem definição em src/lib/indicadores.ts.
- Toda evidência exibida cita a linha da DFP (conta e exercício) ou documento e página.
- Nenhum parecer é emitido sem a saída de todos os agentes habilitados na execução.
```

E, ao final, a linha que faz os dois agentes lerem a mesma fonte:

```
@AGENTS.md
```

O `AGENTS.md` traz as convenções de código do repositório (estrutura de pastas, padrão de nomes em
português para o domínio e em inglês para a infraestrutura, política de commits, o que nunca vai
para o cliente). É o arquivo que o Codex lê quando revisa.

**Distinção a demonstrar em aula:** `CLAUDE.md` é **instrução** — o agente pode não seguir. *Hook*
é **controle** — o agente não consegue não seguir. Um hook de pre-commit que falha se uma chave
aparecer em código de cliente é o exemplo a mostrar.

---

## 13. Critérios de aceitação

O aplicativo está pronto quando:

1. Uma pessoa que nunca o viu carrega o caso de demonstração e chega ao memo em menos de 3 minutos.
   **Medido em 10 execuções (2 de setembro de 2026): mediana de 161 s, e 9 das 10 abaixo dos
   180 s.** A única que passou levou 196 s, e foi a única com reenvio. O critério é atendido na
   ampla maioria das vezes, não em todas — quem for demonstrar ao vivo deve saber que existe uma
   cauda de ~20 s acima do limite, e que o plano B da §13.10 é o vídeo gravado.
2. A tela de execução mostra os três especialistas rodando em paralelo, com o contrarian esperando.
3. O JSON completo de cada agente é visível na interface, sem abrir o console do navegador.
4. O memo pode ser exibido com e sem contrarian sem nova chamada de API.
5. Não é possível chegar ao log sem passar pela decisão humana.
6. O log mostra identificador de modelo, esforço, tokens, tempo e custo de cada chamada, e o custo
   total — 7 linhas com contrarian, 5 sem.
7. Nenhuma chave aparece em código de cliente, verificado por teste.
8. Os testes de 10.1 a 10.3, 10.5 e 10.6 passam em 100% e os evals de 10.4 atingem os limiares.
9. O repositório é público e contém `spec.md`, `CLAUDE.md`, `AGENTS.md` e `evals/ultimo.json`.
10. Existe um vídeo de 5 minutos da execução completa, gravado com os identificadores de modelo
    fixados e o `/api/saude` registrado, guardado como plano B da Aula 4.

---

## 14. Riscos do projeto

| Risco | Efeito na aula | Mitigação |
|---|---|---|
| Indisponibilidade de um dos fornecedores durante a aula | A demonstração da camada 7 cai | Vídeo de 5 min gravado e um `LogExecucao` salvo em JSON, ambos citados no critério 10 |
| Latência alta com cinco chamadas | A turma espera em silêncio | Streaming desde o primeiro token; o bloco tem 25 min e a execução deve caber em 2 a 3 min |
| Mudança de modelo entre o ensaio e a aula | Resultado diferente do ensaiado | Identificador fixo em variável de ambiente, modelo servido registrado por `/api/saude` e exibido no log, `evals/ultimo.json` datado |
| Escopo crescendo durante a construção | Consome o tempo de produção dos decks | A seção 1.2 é contrato; qualquer inclusão exige decisão explícita |
| Custo dos ensaios acima do previsto | Impacto no ressarcimento | Teto global de custo e medição das dez execuções da seção 9 |

---

## 15. Registro de decisões de construção

Doze decisões tomadas antes da primeira linha de código, em entrevista com o autor em 2 de
setembro de 2026. Quatro delas (2, 3, 8 e 11) corrigem exigências da versão 1.0. Este registro
existe para que a Aula 4 possa mostrar **por que** um spec muda — que é conteúdo, não erratas.

| # | Decisão | Onde vive no spec |
|---|---|---|
| 1 | Estado da execução em Redis efêmero com TTL de 2h; arquivos do usuário só em memória | §8.2 |
| 2 | `claude-sonnet-5` nos quatro papéis Claude com `effort: "high"`; **snapshot datado não existe** e **`temperature` devolve 400** | §3.2 |
| 3 | Contrarian permanece em outro fornecedor (OpenAI); identificador exato **pendente de confirmação** — não deve ser adivinhado | §3.2, §9 |
| 4 | Dossiê demo curado e pré-extraído em JSON; DFPs de 5 MB só como referência de página | §6.1 |
| 5 | Um único caso de demonstração, com dados conferidos; a planilha adulterada da Aula 2 fica fora do app | §6.1 |
| 6 | Repositório `JAmerico1898/laboratorio-ia-financas`; o `spec.md` do repo é a cópia canônica | §12, §13.9 |
| 7 | Construção em duas fases: tudo com fornecedores simulados e testes verdes antes de gastar uma chamada de API | §10.7 |
| 8 | `globals.css` copiado verbatim do preset localizado; versões da família casadas | §2 |
| 9 | Metodologia, modelo de memo e prompt da Aula 1 importados verbatim para `src/prompts/curso/` | §5.8 |
| 10 | Extração server-side com `unpdf` (marcando `[p. N]`) e SheetJS; um só dossiê de texto para os dois fornecedores | §3.1 |
| 11 | 7 chamadas com contrarian, 5 sem; **a contagem "5 e 4" da versão 1.0 não fechava** com a consolidação dupla | §3.1, §6.5, §10.3 |
| 12 | CI no GitHub Actions, hook de pre-commit e limites da §8.6 entram na Fase 1; o vídeo da §13.10 depende do app publicado e fica na Fase 2 | §8.6, §12, §13.10 |

### 15.1 Decisões da construção (2 de setembro de 2026, depois da Fase 1)

Quatro decisões tomadas durante a construção, três delas forçadas por comportamento real da API
que o spec 1.1 não previa. Elas estão registradas aqui pelo mesmo motivo das doze anteriores: a
Aula 4 mostra **por que** um spec muda.

| # | Decisão | Onde vive |
|---|---|---|
| 13 | Contrarian confirmado como `gpt-5.6-luna` na Models API; a família 5.6 tem luna, sol e terra | §3.2, §9 |
| 14 | `gpt-5.6-luna` **também** devolve 400 para `temperature` — o parâmetro é omitido e o modelo roda no padrão 1,0 | §3.2 |
| 15 | O contrarian custa 1/10 do Claude por token; a paridade de preço que a 1.1 supunha não existe | §9 |
| 16 | A paleta de gráficos da §2 vive em `src/config/graficos.ts`, e não no `globals.css`, que é cópia verbatim | §2, §10.5 |
| 17 | O contrato em JSON Schema passa a ser **enviado** aos dois fornecedores por saída estruturada; sem isso o modelo inventa a própria forma | §4, §5.1 |
| 18 | `modelo`, `fornecedor` e os campos de entrada do memo são carimbados pelo servidor, não pedidos ao modelo | §4 |
| 19 | Esforço dos papéis Claude passa de `high` para `medium`, para caber no critério de 3 minutos da §13.1 | §3.2, §13.1 |
| 20 | Os três releases de 4T saem do dossiê demo: eram 260 dos 387 mil caracteres e 2/3 do contexto de cada agente | §6.1 |
| 21 | EBITDA passa a ser calculado do plano padronizado da CVM (3.05 + 6.01.01.03), com o ajustado da companhia declarado ausente | §5.4, §6.1 |
| 22 | O **planejamento** roda em `effort: "low"`: ele organiza a análise, não a faz. Era o estágio mais lento do caminho crítico | §3.2, §13.1 |
| 23 | `waitUntil` na rota que dispara a orquestração; sem ele a Vercel congela a instância no 202 e nada executa | §7, §8.2 |
| 24 | As credenciais do KV são descobertas sob qualquer nome que a integração da Vercel crie, e nunca o token só de leitura | §8.2 |

### Pendências do autor

| # | Pendência | Estado |
|---|---|---|
| 1 | Identificador do modelo contrarian e `OPENAI_API_KEY` | **resolvida** — `gpt-5.6-luna`, confirmado na Models API |
| 2 | `ANTHROPIC_API_KEY` | **resolvida** |
| 3 | `vercel login` e provisionamento do KV | **resolvida** — app no ar, `/api/saude` com `ok: true` e `armazem_duravel: true` |
| 4 | Tornar o repositório público | **resolvida** — público desde 2 de setembro de 2026 |
| 5 | Medição de custo: dez execuções completas (§9) | **resolvida** — US$ 0,9737 de média, desvio US$ 0,0591; ver §9 |
| 6 | Vídeo de 5 minutos (§13.10) | **aberta** — depende do app publicado |
