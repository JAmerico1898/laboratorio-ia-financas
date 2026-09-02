# CLAUDE.md

Aplicativo web que executa uma análise de crédito por arquitetura multiagente e a submete a
aprovação humana. É material da Aula 4 do curso *IA Aplicada a Finanças com Claude*.

A fonte canônica de requisitos é o **`spec.md`** deste repositório. O que não estiver lá,
pergunte antes de implementar.

## Comandos

```bash
npm run dev                      # desenvolvimento
npm run build                    # build de produção
npm test                         # vitest: unitários, componente, segurança, fidelidade visual
npm run test:e2e                 # playwright, com FORNECEDORES_SIMULADOS=1
npm run lint                     # eslint
npm run sync:curso               # confere se src/prompts/curso/ diverge do curso
npm run dossie:demo              # regera public/demo/dossie-casas-bahia.json
npm run evals                    # evals de qualidade — GASTA CHAMADAS REAIS DE API
```

`FORNECEDORES_SIMULADOS=1 npm run dev` levanta o app com adaptadores simulados: útil para mexer
em interface sem gastar chamada.

## A arquitetura em uma frase

Supervisor planeja → três especialistas Claude rodam em paralelo → o contrarian, em outro
fornecedor, recebe as três análises e tenta derrubá-las → o supervisor consolida **duas vezes em
paralelo**, com e sem o contrarian → uma pessoa decide. São **7 chamadas** com o contrarian
ligado e **5** sem.

## Metodologia de crédito

- Nunca inventar indicador. Todo indicador exibido tem definição em `src/lib/indicadores.ts`.
- Toda evidência exibida cita a linha da DFP (conta e exercício) ou documento e página.
- Nenhum parecer é emitido sem a saída de todos os agentes habilitados na execução.

## Armadilhas já pagas

- Identificador de modelo Anthropic **não** leva sufixo de data: `claude-sonnet-5` é completo
  como está.
- `temperature` foi removida dos modelos Claude atuais e devolve **HTTP 400**. Use
  `output_config.effort` (os quatro papéis Claude usam `"high"`). O contrarian, em outro
  fornecedor, mantém `temperature: 0.7`.
- Os três `DFP_*.pdf` de 5 MB **não** vão por extenso aos agentes: só como referência de página.
- A planilha adulterada da Aula 2 não é embarcada no aplicativo.

## Instrução versus controle

Este arquivo é **instrução**: o agente pode não seguir. O hook de pre-commit em
`.githooks/pre-commit` é **controle**: o agente não consegue não seguir. É por isso que a regra
"nenhuma chave em código de cliente" existe nos dois lugares — aqui como texto, lá como falha de
commit. A distinção é conteúdo da última meia hora da aula.

@AGENTS.md
