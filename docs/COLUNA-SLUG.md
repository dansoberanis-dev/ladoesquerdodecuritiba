# Coluna "Slug" no Notion: endereços de matéria sob controle

> Passo a passo para o dono (ou para você fazer por ele).
> Objetivo: parar de depender do corte automático de 70 caracteres que mutila a última palavra do link.

---

## Por que isso importa

Hoje o endereço da matéria é gerado a partir do título, cortado em 70 caracteres. O resultado aparece assim:

```
/artigo?slug=...dario-vellozo-sofr
/artigo?slug=...flavio-bolsonaro-repetir-c
/artigo?slug=praca-19-...-no-2-tur
```

Palavra cortada no meio. Esse link é o que circula no WhatsApp, no Stories e no resultado do Google. Com a coluna `Slug`, quem escreve define o endereço.

---

## Passo 1 — criar a coluna (3 minutos)

1. Abra o banco **MATÉRIAS** no Notion.
2. Clique no **+** no fim da lista de colunas (ou em qualquer cabeçalho → "Inserir coluna à direita").
3. Nome da coluna: **`Slug`** (com essa grafia, S maiúsculo).
4. Tipo: **Texto** (a opção que aceita texto livre, não "ID", não "Seleção").
5. Confirme.

Pronto. A coluna fica vazia em todas as matérias, e **nada muda no site** até você preencher. O site já sabe ler esse campo: quando ele está vazio, continua usando o título; quando está preenchido, usa o que você escreveu.

---

## Passo 2 — preencher as matérias (só as que valem)

Regras para o endereço:

- **minúsculas**, sem acento, sem cedilha
- **hífen** entre as palavras (nunca espaço, nunca underline)
- **40 a 60 caracteres** é o tamanho ideal
- **termine sempre com palavra completa**
- sem número de edição, sem data, sem "materia-"

### Sugestões para as três matérias de eleição

| Título (início) | Slug sugerido |
|---|---|
| "Após virada histórica, Lula é reeleito presidente do Brasil" | `lula-reeleito-presidente-do-brasil` |
| "Enquanto prefeito foca na campanha, escola municipal Dario Vellozo sofre…" | `escola-municipal-dario-vellozo-abandonada` |
| "SUS pode enfrentar filas de até 188 dias se Flávio Bolsonaro repetir…" | `sus-filas-de-188-dias-com-flavio-bolsonaro` |
| "Praça 19 de Dezembro será palco do último grande ato pró-Lula no 2º turno" | `praca-19-de-dezembro-ato-pro-lula` |

As duas antigas já estão com palavra completa (`empate-tecnico-na-reta-final` e `reta-final`) e podem ficar como estão.

**Importante:** só preencha o campo e saia da página. O Notion salva sozinho. Não precisa clicar em nada.

---

## Passo 3 — mandar o site ler (2 minutos)

O acervo sincroniza sozinho a cada 3 horas. Para não esperar:

1. GitHub → aba **Actions** → workflow **acervo** → botão **Run workflow** → **Run workflow** (confirme)
2. Espere cerca de 1 minuto, até o item ficar verde
3. Abra `https://www.ladoesquerdodecuritiba.com.br/sitemap.xml` e recarregue: os endereços novos devem aparecer

Na Vercel, o deploy começa sozinho quando o acervo é atualizado.

---

## Passo 4 — o que acontece com os endereços antigos

O sincronizador **não apaga** a matéria antiga: ele marca a antiga como não publicada. Então:

- o endereço novo passa a funcionar
- o antigo **sai da listagem e do sitemap**
- o antigo **deixa de abrir a matéria**

Se algum link antigo já circulou (Instagram, WhatsApp), ele precisa de um **redirecionamento** para o novo endereço, senão quem clicar vê "não encontrada".

**Nesse caso, não é trabalho manual:** me diga os pares (endereço antigo → endereço novo) e eu gero o bloco único com os redirecionamentos permanentes no `vercel.json`, mais o teste das duas pontas. São 3 linhas de configuração por matéria, e a partir daí link antigo cai no novo automaticamente.

---

## Passo 5 — como conferir que deu certo

1. Abra o endereço novo: a matéria tem que abrir com capa, texto e imagens
2. Abra o endereço antigo: deve **redirecionar** para o novo (se aplicamos o redirecionamento)
3. Abra o blog: a matéria aparece **uma vez só**, com o link novo
4. Confira o sitemap: só o endereço novo na lista

Se aparecer a matéria duas vezes na listagem, me avise na hora: significa que o acervo guardou as duas versões e eu limpo pelo terminal.

---

## Regra para o futuro (vale para o dono)

- O endereço **nunca mais precisa ser preenchido** se o título já gera um link bom.
- Preencha o `Slug` quando o título for muito longo, tiver número no meio, ou terminar em palavra que o corte estragaria.
- **Nunca mude o `Slug` de uma matéria que já foi divulgada.** Depois de publicada e compartilhada, o endereço é permanente. Se precisar mesmo mudar, o redirecionamento resolve, mas é trabalho extra.
