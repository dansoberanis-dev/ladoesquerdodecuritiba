# Como alimentar o blog — Notion + Vercel

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
