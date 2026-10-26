# PROMPT MASTER — Lado Esquerdo de Curitiba (site + blog)

> Documento de retomada. Serve para você voltar ao projeto depois de meses, ou para entregar a outro assistente/desenvolvedor e continuar exatamente de onde paramos.
> Última atualização: **26/10/2026 — versão 3.1.9**

---

## 0. Histórico recente

- **3.1.9 (26/10/2026)** — cartões de número ("quadro de estatísticas"): 3 colunas com uma Caixa (/callout) em cada viram uma grade de cartões com barra laranja em cima, número grande e legenda em caixa alta (antes era preciso colar print). Caixa (/callout) solta no texto virou caixa destacada, não mais citação.
- **3.1.8 (26/10/2026)** — matéria servida do acervo: capa e imagens nunca expiram (antes usavam links do Notion válidos por 1h) e o texto vai no HTML (SEO/LCP). Novas formatações do Notion: **cores de texto/fundo** e **tabelas** (inclusive coladas do Word), além de colunas, to_do e blocos sincronizados.
- **3.1.7 (23/10/2026)** — aviso de cookies com consentimento real (LGPD): o GA4 só carrega depois do "Aceitar"; nova página `/privacidade`; links "Privacidade" e "Cookies" no rodapé (o de Cookies reabre o aviso).
- **3.1.6 (23/10/2026)** — Google Analytics 4 (`G-K9SEW9QWT7`) ativo nas 4 páginas via `js/analytics.js` (arquivo local, sem script inline), com CSP ajustada para `googletagmanager` e `google-analytics`.
- **3.1.5 (23/10/2026)** — cards menores da home: a categoria saiu de cima da foto (tapava os rostos) e passou para a direita, acima do título. Card de destaque e página do blog seguem como estavam.
- **3.1.4 (23/10/2026)** — véu do card de destaque reposicionado: a imagem respira até ~62% da altura e o degradê só carrega embaixo do texto; travessão removido do texto da seção "Apoie o projeto".
- **3.1.3 (23/10/2026)** — nova seção **“Apoie o projeto”** na home, entre *O projeto* e *Redes sociais*, com o link da campanha no Vakinha, a meta de R$ 6.000, a informação do sorteio de R$ 1.000 e a chave Pix `6310653@vakinha.com.br`. Link “Apoie” acrescentado ao rodapé.
- **3.1.2** — canonical/`og:url` das matérias fixados no domínio oficial (middleware).
- **3.1.1** — correção do hero em produção: CSS/JS com selo de versão + CSS crítico inline.

---

## 1. O que é o projeto

Site institucional + blog do **Lado Esquerdo de Curitiba**, veículo de jornalismo crítico em Curitiba (PR). O dono publica matérias **pelo Notion**; o site lê do Notion e monta home, listagem e página de matéria sozinho. Publicação por git também é possível (modo de emergência, ver §9).

- **Site em produção:** https://ladoesquerdodecuritiba.vercel.app
- **Repositório:** https://github.com/dansoberanis-dev/ladoesquerdodecuritiba (branch `main`)
- **Vercel:** projeto `dansoberanis-7942/ladoesquerdodecuritiba`, Project ID `prj_vYYnWiXhaUDWLfwrFVQdk4zBFqSw`
- **Pasta local (Windows):** `E:\SITES\LADOESQ\SITEARENA`
- **Banco no Notion (MATÉRIAS):** `DATABASE_ID = 401d05176ce380e8b31dd9bfe9fea195`

---

## 2. Stack e restrições (não negociáveis)

- **HTML + CSS + JavaScript puros.** Sem framework, sem build, sem npm install no fluxo normal.
- Vercel: **Framework Preset = Other**, **Build Command vazio**, **Output Directory = `.`**.
- Funções serverless em `/api` (Node, ES modules). Node `>=20` (exigido pelo `@vercel/functions`, usado no middleware).
- **Sem banco de dados próprio.** O Notion é o CMS.
- O site **não pode depender de JS para SEO/prévia**: robôs de prévia de link (WhatsApp, Instagram, Facebook) **não executam JavaScript**.
- Todo texto em **português do Brasil**.
- O dono **não é técnico**: cada entrega tem que ser um **único bloco de comandos PowerShell** para copiar e colar.

---

## 3. Arquitetura de dados

```
Notion (banco MATÉRIAS)
        │  API REST do Notion (token de integração)
        ▼
api/_notion.js        ← núcleo: listar páginas, mapear campos, converter blocos em HTML
        │
        ├── api/posts.js  → GET /api/posts  (lista publicada, ordenada por data)
        └── api/post.js   → GET /api/post?slug=...  (matéria + corpo completo)
        │
        ▼
js/blog.js            ← renderiza home (manchete + laterais), listagem (busca/filtros) e artigo
        │
        ├── conteudo/posts.json      ← ACERVO: texto de todas as matérias (+ imagens locais)
        ├── conteudo/img/<slug>/     ← imagens baixadas do Notion (nunca expiram)
        └── assets/blog/posts.json   ← matérias de exemplo (prévia offline)
        │
        ▼
middleware.js         ← injeta og:title/og:description/og:image no HTML de /artigo?slug=...
```

### Regras de dados importantes

- **Status** é o campo que publica: só entra no site o que estiver em `Publicado`. (Aceita também o checkbox antigo `Publicado`, por compatibilidade.)
- **Slug** vem do **título**, convertido para ASCII: "Câmara aprova orçamento" → `camara-aprova-orcamento`. O ID da página do Notion **não** é usado.
- **Autor automático está desligado por padrão.** Sem autor preenchido, assina **"Redação Lado Esquerdo de Curitiba"**. Ligar com `NOTION_AUTOR_AUTOMATICO=true`.
- **Multi-fonte:** `NOTION_TOKEN`, `NOTION_TOKEN_2` … `NOTION_TOKEN_5`, cada um com seu `NOTION_DATABASE_ID_N` opcional. Resultados são deduplicados por slug.
- **Filtro de criadores:** `NOTION_CRIADORES_PERMITIDOS` (IDs do Notion, separados por vírgula). Vazio = sem filtro.
- **Categoria** é `multi_select`; o site usa a primeira etiqueta.
- **Imagens do Notion** (capa e corpo) são URLs temporárias da S3 da Amazon, válidas por ~1 hora. O servidor resolve a cada acesso; **não guardar essas URLs em lugar nenhum**.
- Cache das APIs: `s-maxage=60, stale-while-revalidate=300`.

### Colunas do banco MATÉRIAS (9)

`Título` · `Resumo` · `Categoria` (Selecionar) · `Capa` (Arquivos e mídia) · `Data` · `Autor` (Texto) · `Status` (Rascunho / Em revisão / Publicado) · `Destaque` (Caixa) · `Crédito da Foto` (Texto)

**Destaque** decide a manchete: se alguma matéria estiver marcada, é ela; se nenhuma estiver, vale a mais recente pela `Data`.

---

## 4. Estrutura de arquivos

```
SITEARENA/
├── index.html            home (hero, seções, últimas matérias, rodapé)
├── blog.html             listagem completa (busca, filtros de mês/ano/categoria, ordenação)
├── artigo.html           página única de matéria (?slug=...) — preenchida por JS
├── 404.html, obrigado.html
├── css/estilos.css       base do site (hero, header, footer, menu)
├── css/blog.css          cards, listagem, artigo, imagens, chama sem capa
├── js/app.js             menu, hero, animações, reveal
├── js/blog.js            motor do blog (carregar, cards, listagem, artigo)
├── js/stats.js           contadores da seção "O Projeto"
├── api/_notion.js        integração com o Notion (núcleo)
├── api/posts.js          GET /api/posts
├── api/post.js           GET /api/post?slug=
├── middleware.js         metas og dinâmicas por matéria
├── conteudo/             ACERVO: posts.json + imagens (mantido pelo GitHub Actions)
├── scripts/sincronizar.mjs  espelha Notion → acervo (textos e imagens)
├── assets/img/           logo, chama, favicon, og-padrao.jpg, imagens de exemplo
├── assets/blog/          posts.json e posts.js de exemplo
├── docs/                 manuais (editor, alimentação, publicação sem Notion)
├── VERSION               versão atual
├── vercel.json           headers, cache, cleanUrls
└── package.json          dependência @vercel/functions
```

---

## 5. Identidade visual (não alterar sem pedido)

- **A chama** é o símbolo da marca (hero, favicon, cards sem capa). O **lettering** é a tipografia da marca.
- Degradê dos botões remete a fogo. Tema escuro.
- Fontes: **Chakra Petch** (títulos, interface) e **Newsreader** (texto corrido).
- Rodapé: "Desenvolvido por" em peso simples + **Daniel Soberanis** em negrito, degradê laranja, link para `daniel-soberanis.vercel.app`.
- Botão "Seguir" com o ícone do Instagram.
- Menu **não pode ficar sanfonado no desktop**: `.nav-desktop` a partir de 981px, hambúrguer até 980px.

### Tokens de cor

```
--bg #140d0b      --card #1f1512     --fg #f7efe8       --muted #a99a91
--fire #cc2318    --fire-mid #e8401a --flame #f8691a    --amber #ff8c1a
--amber-soft #ffb763
```

---

## 6. Layout da home

| Matérias publicadas | Exibição |
|---|---|
| 1 | Só a manchete, largura inteira |
| 2 | Manchete grande + 1 card lateral (que estica para preencher a coluna) |
| 3+ | Manchete grande + 2 cards laterais |

Matéria sem capa recebe um fundo de fogo com a chama da marca (nunca um retângulo vazio). Cards são revelados manualmente (`revelar()`), porque são injetados depois do `IntersectionObserver` do `app.js` — isso já causou um bug de "card invisível".

---

## 7. Imagens no artigo

- **Capa:** largura cheia, `object-fit: contain`, altura máxima `min(72vh, 620px)`. **Nunca corta** a imagem: sobra fundo escuro nas laterais quando ela é vertical/quadrada.
- **Imagens do corpo (`figure`):** largura natural até o limite da coluna, altura máxima `min(78vh, 720px)`, centralizadas, borda arredondada, legenda em caixa alta.
- **Imagens soltas** (sem legenda) recebem a mesma trava.
- Recomendação editorial: **capa em formato paisagem** (deitada). Foto de celular em pé vira faixa achatada.
- Itens de lista **vazios** são ignorados na conversão (evita "•" solto).

---

## 8. Prévia de link (WhatsApp / Instagram / Facebook / X)

- **Home e blog:** metas fixas no HTML, imagem `assets/img/og-padrao.jpg` (1200×630, chama + lettering sobre fundo de fogo).
- **Matéria:** `middleware.js` intercepta `/artigo` e `/artigo.html`, busca a matéria em `/api/post?slug=...` e devolve o HTML com `og:title`, `og:description`, `og:image` (a capa da matéria), `og:url`, `article:author`, `article:published_time` e `twitter:card`.
- Qualquer outra rota passa direto (`return next()` de `@vercel/functions`).
- **Sempre usar URLs absolutas** nas metas — caminho relativo não funciona em robô de prévia.
- WhatsApp guarda cache por dias: para testar, usar `?slug=...&v=2` ou o Facebook Sharing Debugger ("Scrape Again").

---

## 9. O acervo (git manda no armazenamento, Notion manda no ar)

Regra: **o Notion decide o que está no ar; o repositório guarda tudo — textos e imagens.**

```
conteudo/posts.json              todas as matérias (publicado: true/false) + corpo com caminhos locais
conteudo/img/<slug>/capa.*       imagem de capa baixada do Notion
conteudo/img/<slug>/corpo-N.*    imagens do corpo do texto
```

- `scripts/sincronizar.mjs` mantém o acervo; `.github/workflows/acervo.yml` roda **a cada 3 horas** (e na mão, aba Actions).
- O site combina Notion + acervo: Notion íntegro → ele manda (mas texto/imagens vêm do acervo); fonte fora → completa com o acervo; Notion inteiro fora → acervo inteiro.
- **Travas:** todas as fontes fora → nada muda; uma fonte fora → só cresce, nada despublicado; matéria removida do Notion com fontes OK → `publicado:false` (fica no git); corpo vazio/trocado → mantém o do acervo.
- **Matérias manuais** (`"origem": "manual"`) nunca são tocadas pela sincronização — é a publicação de emergência, agora com imagens locais.
- `conteudo/` **fica fora do ZIP** de atualização (quem manda nela é o robô).
- Detalhes em **`docs/ACERVO-E-IMAGENS.md`**.

**Consequência no fluxo de entrega:** o GitHub Actions faz commits, então o bloco PowerShell precisa de `git fetch` + `git pull --rebase` antes do `push`.

---

## 10. Fluxo de entrega (o que se combinou com o dono)

1. Toda mudança vira um **ZIP cumulativo** na raiz do workspace: `SITEARENA-vNN.zip` (**só o mais recente fica**; os antigos são apagados).
2. Cada entrega vem com **um único bloco PowerShell**: `Expand-Archive` → valida `index.html` → `robocopy` para `E:\SITES\LADOESQ\SITEARENA` → `git add -A` → commit → **`git fetch` + `git pull --rebase`** → `git push`.
3. A Vercel builda sozinha a partir do push. Conferência é **online, depois do deploy** (não é preciso rodar localmente).
4. **Auditoria antes de publicar é obrigatória**: sintaxe, comportamento nos quatro cenários de layout, mobile e desktop, e checagem do que foi ao ar.
5. Bump de versão: `VERSION`, `package.json` e o selo de cache `?v=NNN` em `css/blog.css` e `js/blog.js` nos três HTMLs.

---

## 11. Armadilhas já enfrentadas (não repetir)

- **Cards invisíveis na home:** `app.js` registra o `IntersectionObserver` antes dos cards existirem. Solução: `revelar()` marca `.in` na mão.
- **`.ph` com `position: relative`** quebra o card de capa (a camada fica com altura 0). O `.ph` precisa continuar `absolute`.
- **Meta og com caminho relativo** não gera prévia. Sempre absoluto.
- **JSON-LD / HTML do Notion:** `&` na URL da imagem quebra o atributo se não for tratado; usar escape só para texto, e `%22`/`%20` para URL.
- **`cleanUrls: true`** faz `/artigo.html` redirecionar para `/artigo`. O middleware precisa casar **as duas** rotas e ignorar o pedido interno (`_raw`).
- **Seletores CSS genéricos** (`header{...}`) já quebraram a página de artigo — escopar em `header#siteHeader`.
- **`file://`** não executa `fetch` nem `/api`; o site cai nas matérias de exemplo.
- **Cache do navegador** já mascarou correções: por isso o selo `?v=NNN` — em **todos** os arquivos (CSS, JS e blog). **Regra dura:** qualquer CSS/JS novo tem que ser testado simulando o arquivo antigo em cache; e regra de acessibilidade que altera layout (`.sr-only`, skip link) vai **também** em `<style>` crítico no `<head>`, para não depender do CSS externo.
- **robocopy** não existe no PowerShell do Linux (só importa para testes no sandbox); no Windows do dono funciona normalmente.

---

## 12. Variáveis de ambiente (Vercel → Settings → Environments → Production)

| Variável | Para que serve |
|---|---|
| `NOTION_TOKEN` | token da integração do Notion (`ntn_...`) — **nunca** compartilhar |
| `NOTION_DATABASE_ID` | `401d05176ce380e8b31dd9bfe9fea195` |
| `NOTION_TOKEN_2.._5` + `NOTION_DATABASE_ID_2.._5` | outras contas/workspaces do Notion |
| `NOTION_CRIADORES_PERMITIDOS` | IDs autorizados a publicar (vazio = sem filtro) |
| `NOTION_AUTOR_AUTOMATICO` | `true` assina com o criador da página (padrão: desligado) |
| `INSTAGRAM_TOKEN` / `INSTAGRAM_USER_ID` / `INSTAGRAM_CACHE` | feed do Instagram (reservado) |

Depois de mexer em variáveis: **redeploy obrigatório**. Na UI nova: Settings → Environments → Production → Environment Variables.

---

## 13. Estado atual (22/10/2026)

**Funcionando em produção:** home, blog com busca/filtros/ordenação, artigo com capa, subtítulo, lista, citação e imagens com legenda; prévia de link com capa por matéria; publicação pelo Notion (Status = Publicado); autor padrão "Redação Lado Esquerdo de Curitiba"; **acervo em git com imagens locais** (site não depende do Notion para exibir).

**Conteúdo de teste em produção:** TESTE2, TESTE3 e "Teste de integração" (apagar quando o site entrar no ar de verdade).

**Pendências / próximos passos:**
1. Entregar a tabela ao dono (`Compartilhar` → `Publicar` → **Permitir duplicação como modelo**) e configurar a conta dele.
2. Decidir se o dono publica pela conta dele (workspace próprio, token 2) ou como convidado na conta atual.
3. Instagram automático — hoje é link fixo no HTML.
4. Substituir matérias de teste por conteúdo real e revisar textos institucionais.
5. Avaliar capa de matéria gerada automaticamente para quem não tem foto.
6. Se o repositório crescer muito (imagens), avaliar armazenamento de imagens próprio.

---

## 14. Como pedir uma mudança (texto para reusar)

> "Projeto: Lado Esquerdo de Curitiba (HTML/CSS/JS puro, blog alimentado pelo Notion, deploy Vercel a partir do GitHub). Antes de mexer, leia `docs/PROMPT-MASTER.md`. Quero a mudança X. Entregue um ZIP cumulativo novo e **um único bloco de comandos PowerShell** (extrair, robocopy, commit e push), com bump de versão e do selo `?v=NNN`. Faça a auditoria completa antes de entregar e me diga o que conferir depois do deploy."
