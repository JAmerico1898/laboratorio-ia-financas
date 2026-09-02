# AGENTS.md — convenções deste repositório

Instruções para agentes que escrevem ou revisam código aqui. O `CLAUDE.md` importa este arquivo
ao final: **dois agentes, uma fonte de instruções.**

A fonte canônica de requisitos é o `spec.md`. Este arquivo trata de *como* escrever, não de *o
que* construir. Quando os dois divergirem, o `spec.md` vence e este arquivo é corrigido.

## Estrutura de pastas

```
src/app/          rotas do App Router e rotas de API
src/components/   componentes de interface; ui/ é shadcn base-nova, não editar à mão
src/lib/          domínio e infraestrutura (schema, escala, custo, orquestrador, armazém)
src/lib/fornecedores/  um adaptador por fornecedor, mais o simulado
src/prompts/      um arquivo por papel; curso/ é gerado, não editar à mão
src/config/       preços, câmbio e paleta de gráficos — tudo com data de consulta
tests/            vitest: unitários, componente, segurança e fidelidade visual
e2e/              playwright, sempre com fornecedores simulados
scripts/          utilitários locais (sync:curso, dossie:demo)
```

## Nomes

**Português no domínio, inglês na infraestrutura.** `analise`, `evidencia`, `classificacao`,
`custoChamadaUsd` são domínio de crédito e ficam em português — quem assiste à aula precisa
reconhecer o vocabulário do curso dentro do código. `fetch`, `stream`, `runtime`, `test`, `build`
são infraestrutura e ficam em inglês, como no ecossistema.

Sem acento em identificador. Nos textos, comentários e strings de interface, português correto,
com acento.

## Regras que não se negociam

1. **Nenhuma chave de fornecedor em código de cliente.** Um teste da §10.6 e o hook de pre-commit
   falham se `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` ou `KV_REST_API_TOKEN` aparecerem em arquivo
   com `"use client"`. Chaves só existem em `src/lib/config-servidor.ts`, que importa
   `server-only`.
2. **Nenhuma chamada a fornecedor de modelo parte do navegador.** Nunca.
3. **Nada do que o usuário envia é persistido.** Os bytes do arquivo vivem em uma variável local
   durante a extração e acabam ali. O armazém guarda `LogExecucao`, plano, análises e memos — e
   só isso.
4. **`src/prompts/curso/` é gerado.** Edite o original no curso e rode
   `npm run sync:curso -- --escrever`. Editar a cópia à mão faz o repositório divergir do que a
   aula ensina, em silêncio.
5. **`src/app/globals.css` é cópia verbatim do preset da família.** Não reconstrua a partir da
   lista de cores; o teste de fidelidade visual compara o arquivo com a §2 do spec.
6. **Nenhum indicador é exibido sem definição em `src/lib/indicadores.ts`.**
7. **Preço e câmbio nunca são lidos de API em tempo de execução.** Ficam em `src/config/`, com a
   data da consulta e a fonte.
8. **Identificador de modelo Anthropic não leva sufixo de data**, e modelo Claude atual não
   aceita `temperature` — o controle é `output_config.effort`.

## Estilo

- TypeScript estrito. Sem `any`; quando o tipo vier de fora, valide com Zod na fronteira.
- Tipos derivados do schema Zod (`z.infer`), não declarados duas vezes.
- Comentário explica **por quê**, não o quê. Se o comentário repete o código, apague o comentário.
- Erro de configuração ou de contrato **lança**; nunca devolva zero, string vazia ou `undefined`
  em silêncio.
- Componente que toca o servidor é Server Component por padrão; `"use client"` só quando houver
  estado ou evento.

## Testes

- Todo comportamento novo entra com teste. O portão da §10.7 é 100% verde em 10.1, 10.2, 10.3,
  10.5 e 10.6.
- Os testes de ponta a ponta rodam **sempre** com `FORNECEDORES_SIMULADOS=1`. Nenhum teste gasta
  chamada de API.
- Teste de segurança nunca imprime o segredo que encontrou: compare comprimento ou nome, não
  valor.

## Commits

- Mensagem em português, imperativo, uma linha de assunto até 72 caracteres.
- Um assunto por commit. Refatoração não viaja junto com mudança de comportamento.
- O hook de pre-commit roda `npm test` e a varredura de chaves. Não use `--no-verify`.
