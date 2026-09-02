/**
 * Como ler as demonstrações padronizadas da CVM (spec §5.8, módulo de app).
 *
 * Não é artefato do curso: a `metodologia.md` define os indicadores, e este arquivo diz em quais
 * contas do plano padronizado da CVM cada insumo daquela definição mora. Os dois se completam.
 *
 * Existe por uma razão concreta. Ao tirar os três releases de 4T do dossiê demo — que eram 260
 * dos 387 mil caracteres e o material menos estruturado do conjunto —, o EBITDA divulgado pela
 * companhia deixou de estar disponível. Sem uma definição única, cada agente montaria a sua a
 * partir das contas, e o supervisor registraria como divergência de análise o que na verdade
 * seria divergência de definição. A §3 da metodologia é explícita: quando um indicador tem mais
 * de uma definição, vale a definição escrita.
 */

export const CONTAS_CVM = `
--- Como ler as demonstrações padronizadas da CVM ---

O dossiê traz as demonstrações no plano de contas padronizado da CVM: cada linha é
"conta | descrição | exercício | valor em R$ milhões".

**Toda origem que você escrever precisa conter o código da conta.** O código é o endereço; o nome
da demonstração não é. "DFP consolidada, DRE_con" reprova — a aba tem centenas de linhas e
ninguém consegue conferir o número a partir dela. As formas que valem:

    "conta 2.01, exercício 2025"
    "contas 1.01 e 2.01, exercício 2025"
    "cálculo próprio: 2.01.04 + 2.02.01 + 2.01.05.02.09, exercício 2025"
    "DFP 2025, p. 47"           (para nota explicativa)

Quando o número for cálculo seu, cite as contas que entraram nele. Melhor ainda, cite os valores:
"cálculo próprio: 3.05 (1.343,0) + 6.01.01.03 (1.037,0) = 2.380,0, exercício 2025" permite a quem
lê refazer a conta sem abrir o dossiê.

EBITDA — a definição que vale nesta análise:

    EBITDA = conta 3.05 (Resultado Antes do Resultado Financeiro e dos Tributos)
           + conta 6.01.01.03 (Depreciação e Amortização, da DFC)

A conta 3.05 é o resultado operacional depois da depreciação; somar a conta 6.01.01.03 a devolve.
Não existe conta "EBITDA" no plano padronizado — é uma medida não contábil, e é por isso que ela
precisa ser calculada e ter o cálculo mostrado. Reporte o EBITDA que você calculou, com as duas
contas e o exercício.

**O EBITDA ajustado divulgado pela companhia NÃO está neste dossiê.** Ele aparece nos releases de
resultado, que não fazem parte deste material. A §5.4 pede que você reporte o divulgado e o seu,
lado a lado: registre em "informacao_ausente" que o divulgado não está disponível e que, por isso,
os ajustes da companhia não puderam ser confrontados com os seus. Não estime o ajustado, e não
trate o seu como se fosse o dela.

Onde mora cada insumo da metodologia:

| Insumo | Contas |
|---|---|
| Ativo circulante · passivo circulante | 1.01 · 2.01 |
| Estoques · contas a receber | dentro de 1.01 (ver descrição da conta) |
| Caixa e equivalentes | 1.01.01 |
| Ativo total · passivo total · patrimônio líquido | 1 · 2 · 2.03 |
| Receita líquida · CMV · resultado bruto | 3.01 · 3.02 · 3.03 |
| Resultado operacional (antes do financeiro e dos tributos) | 3.05 |
| Resultado financeiro · receitas financeiras · despesas financeiras | 3.06 · 3.06.01 · 3.06.02 |
| Resultado líquido | 3.11 |
| Depreciação e amortização | 6.01.01.03 |
| Caixa das atividades operacionais | 6.01 |
| Capex (aquisição de imobilizado e intangível) | 6.02.01 |
| Fornecedores | 2.01.02 |
| Empréstimos e financiamentos (curto · longo prazo) | 2.01.04 · 2.02.01 |
| Passivo de arrendamento (curto · longo prazo) | 2.01.05.02.09 · 2.02.02.02.06 |
| Fornecedores risco sacado (convênio) | 2.01.05.02.07 |

As duas versões de dívida da §3 da metodologia, nestas contas:

    Dívida restrita = 2.01.04 + 2.02.01
    Dívida ampla    = dívida restrita
                    + 2.01.05.02.09 + 2.02.02.02.06   (arrendamento)
                    + 2.01.05.02.07                    (risco sacado a fornecedores)

    Dívida líquida = dívida bruta − 1.01.01

Cobertura de juros usa a despesa financeira da conta 3.06.02; se você usar o resultado financeiro
líquido (3.06) em vez dela, diga qual usou.

Duas advertências sobre sinal e sobre ausência:

- Contas de despesa vêm com sinal negativo no plano padronizado (3.02, 3.06.02, 6.02.01). Use o
  valor absoluto onde a fórmula pede uma despesa, e diga que fez isso.
- Conta que vale 0,0 no dossiê **é zero divulgado**, e não dado ausente. Dado ausente é a conta
  que não aparece.
`.trim();
