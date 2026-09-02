# Comitê de Crédito IA

Aplicativo web que executa uma **análise de crédito por arquitetura multiagente** e a submete a
**aprovação humana**. É o material da Aula 4 do curso *IA Aplicada a Finanças com Claude*.

> O aplicativo não é a inteligência. Ele é a interface de distribuição do trabalho feito nas seis
> camadas anteriores.

## Como funciona

```
supervisor planeja
   ↓
analista financeiro · analista setorial · analista jurídico-regulatório   (Claude, em paralelo)
   ↓
revisor contrarian   (OUTRO fornecedor — recebe as três análises e tenta derrubá-las)
   ↓
supervisor consolida DUAS VEZES em paralelo: memo com e sem o contrarian
   ↓
uma pessoa decide: aprovar · devolver · rejeitar
   ↓
log com modelo, esforço, tokens, tempo e custo de cada chamada
```

São **7 chamadas** com o contrarian ligado e **5** sem.

## Rodar

```bash
npm install
cp .env.example .env.local     # preencha as chaves
npm run dev
```

Sem chaves, `FORNECEDORES_SIMULADOS=1 npm run dev` levanta o app inteiro com respostas
canônicas — é o que os testes de ponta a ponta usam.

## Testes

```bash
npm test          # unitários, componente, segurança, fidelidade visual
npm run test:e2e  # ponta a ponta, sempre com fornecedores simulados
npm run evals     # qualidade da análise — GASTA CHAMADAS REAIS
```

Nada é publicado com teste vermelho.

## Documentos

- **`spec.md`** — a especificação de build, fonte canônica de requisitos
- **`CLAUDE.md`** / **`AGENTS.md`** — instruções para os dois agentes que trabalham neste repo
- **`evals/ultimo.json`** — a última rodada de evals, com data e identificadores de modelo
- **`src/prompts/`** — o prompt de sistema de cada agente, em texto legível

## Aviso

A escala R1–R7 é interna e didática. Ela não corresponde a nenhuma escala de agência de
classificação de risco nem à classificação de operações prevista na regulação brasileira, e não
deve ser apresentada como tal. O aplicativo não concede crédito.
