# Como alimentar o blog — Notion + Vercel

## Primeira publicação real — a ordem certa (30 a 40 minutos)

### Etapa 1 · Criar o banco no Notion
1. No Notion: **New page** → **Table – Full page** → nomeie **Matérias**.
2. Renomeie as colunas (a primeira já vem como *Name* → chame de **Título**):

| Coluna | Tipo |
|---|---|
| Título | Title |
| Slug | Text |
| Resumo | Text |
| Categoria | Select |
| Capa | Files & media |
| Data | Date |
| Autor | Text |
| **Status** | Status *(recomendado: Rascunho · Em revisão · Publicado)* |
| Publicado | Checkbox *(opcional, alternativa ao Status)* |
| Destaque | Checkbox |
| Crédito da foto | Text |
| Criado por | Created by *(opcional — preenche o autor automaticamente)* |

3. Nas opções do **Categoria**, cadastre: `Política local`, `Entrevista`, `Mobilidade`, `Direitos humanos`, `Cultura`, `Educação`.

### Etapa 2 · Criar a integração
1. <https://www.notion.so/my-integrations> → **New integration**.
2. Nome: `Lado Esquerdo Site` · Workspace: o seu · Type: **Internal**.
3. Copie o **Internal Integration Secret** (`secret_...`).
   ⚠️ **Esse valor é uma senha.** Cole direto na Vercel. Não mande por chat, não comite.

### Etapa 3 · Conectar o banco à integração
1. Abra a página **Matérias** no Notion.
2. Canto superior direito `•••` → **Connections** → **Connect to** → `Lado Esquerdo Site`.
3. Confirme. (Sem este passo a API responde 404/500.)

### Etapa 4 · Copiar o ID do banco
Na URL da página do banco:

```
https://www.notion.so/SEU-ESPACO/1a2b3c4d5e6f7890abcdef1234567890?v=...
                                    └────────── este é o DATABASE_ID ──────────┘
```

32 caracteres, sem os hífens e sem o `?v=`. Este pode ser compartilhado sem risco — ele não dá acesso a nada sozinho.

### Etapa 5 · Variáveis na Vercel
Projeto → **Settings** → **Environment Variables** → adicione (marque os 3 ambientes):

```
NOTION_TOKEN       = secret_...
NOTION_DATABASE_ID = 1a2b3c4d5e6f7890abcdef1234567890
```

Depois: **Deployments** → no último deploy → `•••` → **Redeploy**. (Variável nova só entra em vigor num deploy novo.)

### Etapa 6 · Conferir
Abra `https://SEU-SITE.vercel.app/api/posts`:

| Resposta | Significado |
|---|---|
| `{"fonte":"notion","total":0,...}` | ✅ funcionando, ainda sem matéria publicada |
| `501` | faltam as variáveis → refaça a etapa 5 + Redeploy |
| `500` | banco não conectado à integração → etapa 3 |
| `404` | `NOTION_DATABASE_ID` errado → etapa 4 |

### Etapa 7 · Publicar o artigo de teste
1. No banco: **New**.
2. Preencha: Título, Slug (`teste-notion`), Resumo, Categoria, **Capa** (arraste uma foto), Data = hoje.
3. Deixe **Autor vazio** (para ver a assinatura padrão).
4. Marque **Publicado** ✅ e **Destaque** ✅.
5. Escreva o corpo arrastando uma imagem no meio do texto.
6. Espere até 60 segundos e recarregue o site.

---

## Os artigos de exemplo saem sozinhos

Não é preciso uma atualização para removê-los. O site consulta o Notion **primeiro**:

| Situação | O que o site mostra |
|---|---|
| Notion configurado e com matérias | **só as matérias do Notion** |
| Notion configurado e vazio | “Nenhuma matéria publicada ainda” |
| Notion configurado mas com erro | aviso “Não foi possível carregar as matérias agora” — **nunca** matérias fictícias |
| Notion ainda não configurado | matérias de demonstração **com uma faixa “Prévia”** no topo |

Ou seja: no segundo em que a primeira matéria real for publicada, os exemplos e a faixa de prévia desaparecem.

---
## Quem pode publicar (dúvidas frequentes)

### Guest pode criar matéria nova? **Sim.**

O que define o que um guest pode fazer é a permissão da página, não o tipo de conta:

| Permissão dada | Guest consegue |
|---|---|
| Pode editar | **criar novas linhas** no banco, editar as existentes, subir imagens |
| Pode comentar | só comentar |
| Pode visualizar | apenas ler |

O que um guest **não** consegue: ver o resto do seu workspace (outras páginas, bases, finanças),
criar páginas fora do que foi compartilhado, ou mudar configurações. Escopo, não capacidade.

### Quantas pessoas podem postar na mesma conta?

| | Quantidade | Custo |
|---|---|---|
| **Membros** (workspace) | sem limite técnico | Free: com 2+ membros o workspace cai no teto de 1.000 blocos. Plus US$ 10/membro/mês, Business US$ 20 |
| **Guests** | 10 no Free · ilimitado no Plus em diante | nunca são cobrados |

Na prática para o Lado Esquerdo: **1 membro (o dono) + colaboradores como guests** na página
"Matérias". Todos postam, ninguém paga assento, e o workspace continua ilimitado.

### E se cada colaborador tiver a própria conta/workspace do Notion?

Tecnicamente **dá** — o site suporta mais de uma fonte. Cada workspace precisa da **sua própria
integração** conectada ao **seu próprio banco**, e aí você configura:

```
NOTION_TOKEN       = secret_...        (workspace 1)
NOTION_DATABASE_ID = 1a2b3c...
NOTION_TOKEN_2     = secret_...        (workspace 2)
NOTION_DATABASE_ID_2 = 4d5e6f...
```

O site junta as matérias das duas fontes, ordena por data e remove duplicados de mesmo slug.

**Mas eu não recomendo**, por quatro motivos concretos:

1. **moderação vira arqueologia** — para barrar um texto você precisa abrir o Notion de cada pessoa;
2. **categorias duplicadas** — “Política local” e “política local” viram duas no site;
3. **imagens em workspaces diferentes** — se alguém sair do projeto, as fotos dele podem cair;
4. **você depende de 5 integrações e 5 tokens** para manter no ar.

**O caminho recomendado:** um único banco "Matérias", colaboradores como guests, e a aprovação
feita pelo campo **Status** (abaixo). Todo mundo posta no mesmo lugar, e você libera com um clique.

---

## Travar quem pode publicar (só o dono e 1 pessoa)

Duas camadas, e as duas são simples:

**Camada 1 — convite (a mais importante).** Só entra no banco quem foi convidado. Se o dono convidar
**uma** pessoa como guest com permissão *Pode editar*, então existem exatamente duas contas capazes de
criar matérias. Ninguém mais consegue, porque ninguém mais vê a página. É uma decisão de acesso, não
depende de plano, configuração ou código.

**Camada 2 — trava no servidor (opcional, para garantia).** Se quiser blindagem extra — por exemplo,
alguém que foi convidado em outro momento e você não lembra —, defina a variável:

```
NOTION_CRIADORES_PERMITIDOS = "Daniel Soberanis, Nome do Colaborador"
```

O site compara com quem **criou** cada linha no Notion (nome ou ID de usuário) e **descarta
silenciosamente** qualquer matéria criada por outra conta, mesmo que esteja como *Publicado*.
Aceita nomes (sem acento/maiúsculas) ou IDs de usuário do Notion:

```
NOTION_CRIADORES_PERMITIDOS = "d4e5f6a7-1234-5678-9abc-def012345678, Daniel Soberanis"
```

Sem essa variável, não há filtro por criador — publica qualquer um que tenha acesso ao banco.

> **Como achar o seu nome no Notion:** abra uma linha que você criou → a propriedade **Criado por**
> mostra o nome. É exatamente esse texto que vai na lista.

**Resumo da configuração recomendada:**

| Item | Valor |
|---|---|
| Membros do workspace | 1 (o dono) |
| Guests com *Pode editar* | 1 (o colaborador direto) |
| Guests com *Pode visualizar* | quantos quiser (se algum dia precisar) |
| `NOTION_CRIADORES_PERMITIDOS` | opcional: nome do dono + nome do colaborador |

---
## Moderação: o dono audita antes de ir ao ar

Crie a coluna **Status** (tipo *Status* ou *Select*) com três opções:

```
Rascunho  →  Em revisão  →  Publicado
```

**O site publica somente o que estiver em `Publicado`.** Qualquer outro valor fica invisível —
nem no blog, nem na home, nem por link direto.

O fluxo fica assim:

1. Colaborador cria a linha, escreve, sobe a capa e deixa em **Rascunho** (ou **Em revisão**).
2. Você (dono) recebe, lê, ajusta o que quiser e muda para **Publicado**.
3. Em até 60 segundos está no ar.

Se a coluna `Status` **não** existir, o site continua aceitando o checkbox **Publicado** — então dá
para migrar sem pressa. Regras aplicadas pelo código:

| O que está no banco | Vai para o site? |
|---|---|
| Status = `Publicado` (aceita `publicada`, `published`, `live`) | ✅ |
| Status = `Em revisão`, `Rascunho`, `Aprovado`, vazio… | ❌ |
| Sem coluna Status, checkbox `Publicado` marcado | ✅ |
| Sem coluna Status, checkbox desmarcado | ❌ |
| Sem nenhum dos dois (banco simples) | ✅ (comportamento antigo) |

### Autor automático

Ordem de prioridade para a assinatura:

1. campo **Autor** preenchido → assina esse nome;
2. campo **Autor** vazio, mas existe **Criado por** / **Pessoa** → assina quem criou a linha no Notion;
3. nenhum dos dois → **Redação Lado Esquerdo de Curitiba**.

Isso elimina erro de digitação de nome quando há muitos colaboradores.

---
## Em 30 segundos (a versão simples)

1. O editor abre o **banco de matérias no Notion** e clica em **New**.
2. Preenche: **Título, Slug, Resumo, Categoria, Capa, Data, Autor**.
3. Escreve o texto na página e **arrasta as fotos** para o lugar onde elas devem aparecer.
4. Marca **Publicado** ✅ (e **Destaque** se for a manchete).
5. Em até **60 segundos** o card aparece na home e em `blog.html`, e a matéria abre em `artigo.html`.

Não existe “enviar para o site”. **Salvar no Notion já é publicar.** Desmarcar *Publicado* tira do ar.

```
        você escreve            Notion guarda         uma função na Vercel lê        site monta
        ────────────            ─────────────         ──────────────────────        ──────────
   Notion (New) ─────────►  Banco "Matérias"  ────►  /api/posts  /api/post  ────►  cards + página
      campos + fotos            com campos           (só traduz p/ HTML)          de cada matéria
```

**Por que precisa de uma “função na Vercel”:** o Notion não deixa o navegador de qualquer site ler
seu banco — é preciso uma chave secreta. Essa chave não pode ficar no HTML (qualquer pessoa veria).
Então ela fica em uma função no servidor, que recebe o pedido do site e devolve só o que é público.

---

## 1. Por que Notion (e não WordPress, Ghost, Strapi…)

Para **uma pessoa** alimentando o blog, o Notion é a melhor relação entre zero manutenção e flexibilidade:

| Opção | Prós | Contras |
|---|---|---|
| **Notion (escolhido)** | editor excelente, imagens por arrastar, tabela com campos, histórico de versões, grátis, sem servidor para manter | precisa de uma função serverless só como ponte (já está pronta em `api/`) |
| WordPress | ecossistema enorme | hospedagem, atualizações, plugins, banco, backup, alvo de ataque |
| Ghost | ótimo editor | mensalidade, segundo login/site, tema próprio |
| Sanity/Contentful | muito poderoso | complexo demais para 1 pessoa, painel em inglês |
| Markdown + GitHub | simples | editor precisa saber Git; subir imagem é chato |

Quando o projeto crescer (vários editores, agendamento, e-mail), a troca natural é Ghost ou Sanity — e a
estrutura atual continua valendo: só muda o que a API devolve.

---

## 2. Criar o banco no Notion

1. Crie uma página no Notion → **Table – Full page**.
2. Nomeie as colunas **exatamente assim** (o código também aceita variações sem acento/maiúsculas):

| Propriedade | Tipo | Para que serve |
|---|---|---|
| **Título** | Title | título da matéria |
| **Slug** | Text | endereço da matéria (ex.: `camara-aprova-orcamento`). Se ficar vazio, o site cria um automático |
| **Resumo** | Text | linha fina que aparece no card e abaixo do título |
| **Categoria** | Select | vira o selo do card (`Política local`, `Entrevista`, `Mobilidade`…) |
| **Capa** | Files & media | imagem principal do card |
| **Data** | Date | data de publicação (ordena a home e o blog) |
| **Autor** | Text | **vazio = “Redação Lado Esquerdo de Curitiba”** |
| **Publicado** | Checkbox | só aparece no site quando estiver marcado |
| **Destaque** | Checkbox | força a matéria como manchete da home (opcional) |
| **Crédito da foto** | Text | legenda de crédito embaixo da capa (opcional) |

3. O **corpo** da matéria é o conteúdo da própria página (o que você escreve ao abrir o item), com
   parágrafos, títulos, listas, citações, imagens, vídeos, divisórias — tudo na ordem em que você escrever.

### Assinatura (regra automática)

- Coluna **Autor** preenchida → aparece **“Por Nome do Autor”** no topo da matéria.
- Coluna **Autor** vazia → aparece **“Redação Lado Esquerdo de Curitiba”**.
- Nos cards, o nome do autor aparece na linha de data; se estiver vazio, sai o nome da redação.

---

## 3. Conectar o Notion ao site (uma vez só)

1. **Criar a integração:** <https://www.notion.so/my-integrations> → **New integration** →
   nome `Lado Esquerdo Site` → tipo *Internal* → copie o **Internal Integration Secret** (`secret_...`).
2. **Dar acesso ao banco:** abra a página do banco no Notion → menu `•••` (canto superior direito) →
   **Connections** → **Connect to** → escolha `Lado Esquerdo Site`.
3. **Copiar o ID do banco:** na URL do banco, o trecho de 32 caracteres antes do `?v=`:
   `notion.so/SEU-ESPACO/`**`1a2b3c4d5e6f7890abcdef1234567890`**`?v=...`
4. **Na Vercel:** projeto → *Settings* → *Environment Variables* → adicione:

```
NOTION_TOKEN       = secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID = 1a2b3c4d5e6f7890abcdef1234567890
```

Marque para os três ambientes (*Production*, *Preview*, *Development*) e faça **Redeploy**.

Para testar antes de publicar, crie um `.env` na raiz (não comite — já está no `.gitignore`):

```
NOTION_TOKEN=secret_...
NOTION_DATABASE_ID=...
```

---

## 4. Como testar

| Situação | O que acontece |
|---|---|
| Abrindo `index.html`/`blog.html` direto do disco (`file://`) | usa os **dados de exemplo** de `assets/blog/posts.js` |
| Servido por http (`npx serve .`) sem variáveis | tenta `/api/posts`, não existe → **dados de exemplo** |
| Na Vercel com as variáveis configuradas | **matérias do Notion** |

Verificação rápida da API: acesse `https://SEU-SITE.vercel.app/api/posts` → deve devolver um JSON
com `"fonte": "notion"`. Se devolver `501`, faltam as variáveis; se devolver `401/404` do Notion,
a integração não foi conectada à página do banco.

---

## 5. Imagens no meio do texto

O editor simplesmente **arrasta a foto para dentro da página, no ponto exato do texto**. A função
`api/_notion.js` percorre os blocos na ordem e gera:

```html
<figure>
  <img src="…" alt="legenda" loading="lazy">
  <figcaption>Legenda que o editor escreveu na imagem</figcaption>
</figure>
```

Também são convertidos: `heading_1/2/3` → `<h2>/<h3>`, listas com marcadores e numeradas,
`quote` → `<blockquote>`, `divider` → `<hr>`, `code` → `<pre><code>`, `video` → player,
`bookmark`/`embed` → link ou iframe.

> **Importante:** a imagem do Notion é servida por uma URL temporária do S3 da própria Notion
> (expira em ~1 hora), mas a API gera uma nova a cada requisição e a página tem cache curto —
> na prática carrega sempre. Se um dia precisar de imagens permanentes, o caminho é copiar os
> arquivos para `assets/blog/img/` num passo de build — me avise que eu monto isso.

---

## 6. Fluxo diário do editor

1. Abre o banco no Notion → **New**.
2. Preenche Título, Slug, Resumo, Categoria, Capa, Data e Autor (ou deixa vazio).
3. Escreve o corpo na página, arrastando as imagens no lugar.
4. Marca **Publicado** ✅ (e **Destaque** se for manchete).
5. Em até **60 segundos** a matéria aparece no site.

Despublicar = desmarcar a caixa **Publicado**.

---

## 7. Arquivos envolvidos

```
api/_notion.js            ponte com o Notion (propriedades, blocos → HTML)
api/posts.js              GET /api/posts        → lista
api/post.js               GET /api/post?slug=… → matéria completa
js/blog.js                render da home, da listagem (busca/filtros) e do artigo
assets/blog/posts.js      dados de exemplo (fallback offline)
assets/blog/posts.json    mesmos dados, para quando servido por http
css/blog.css              cartões, filtros e tipografia do artigo
```
