# Revisão completa do site — 22/10/2026

Auditoria feita **no site publicado** (`ladoesquerdodecuritiba.vercel.app`), medindo desempenho, SEO, acessibilidade, navegação e estrutura. Versão auditada: **3.0.1**.

> Contexto: o dono já divulga o site e o domínio próprio está para ser liberado pelo registro.br. **Dois itens desta lista (P0-1 e P0-5) precisam ser resolvidos antes do domínio entrar no ar.**

---

## Resumo em uma tela

| Área | Nota | Situação |
|---|---|---|
| Desempenho | **9/10** | Excelente. FCP de 200–360 ms, brotli, cache agressivo |
| Identidade visual | **9/10** | Consistente, forte, memorável |
| Estrutura de dados / robustez | **9/10** | Acervo no git, multi-fonte, prévia por matéria |
| Navegação | **7/10** | Funciona bem; falta página 404 própria e alguns refinamentos |
| Mobile | **8/10** | Sem rolagem horizontal; filtros e menu funcionam |
| Acessibilidade | **6/10** | Bom contraste no principal; faltam detalhes (skip link, contraste de textos pequenos) |
| **SEO** | **3/10** | **Grave: o site está bloqueando o Google de indexar as matérias** |

O site está tecnicamente saudável e rápido. O problema é que hoje ele **não é encontrável no Google**, e isso é justamente o que sustenta um veículo de imprensa no longo prazo.

---

## Pontos fortes (o que está bem feito)

1. **Desempenho muito acima da média de portais.** Home carrega em ~300 ms com 520 KB; blog em ~200 ms com 214 KB. Compressão brotli ativa, cache de 7 dias em CSS/JS, 1 ano em imagens.
2. **Identidade visual coesa.** Chama, lettering, degradê de fogo, tipografia — nada genérico. O site comunica a marca em 2 segundos.
3. **Robustez de conteúdo.** Acervo com textos e imagens dentro do git; se o Notion cair, o site continua no ar. Isso é raro em site feito sob medida.
4. **Prévia de link por matéria** funcionando (WhatsApp/Instagram com capa e título corretos) — é o canal que mais importa para esse público.
5. **Segurança configurada.** CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Permissions-Policy`, `rel="noopener noreferrer"` em todos os links externos.
6. **Mobile sem rolagem horizontal** em home e blog; menu sanfona com `aria-expanded` correto; filtros utilizáveis no celular.
7. **Contraste do que importa.** Texto principal 16,9:1; corpo secundário 7:1; laranja da marca 8,3:1 — bem acima do mínimo AA (4,5:1).
8. **Experiência de leitura do artigo** muito boa: capa sem corte, imagens centralizadas, subtítulo, lista, citação, assinatura, tempo de leitura, botões de compartilhamento.

---

## P0 — Resolver ANTES do domínio entrar (bloqueiam crescimento)

### P0-1. `noindex, nofollow` no blog e nas matérias ⛔ o mais grave

`blog.html` e `artigo.html` têm:

```html
<meta name="robots" content="noindex, nofollow"/>
```

Efeito: **o Google está proibido de indexar a listagem e todas as matérias.** Só a home é indexável hoje. Isso faz sentido para uma prévia, não para um site que está sendo divulgado.

**Correção:** remover a meta (ou trocar por `index, follow` com `max-image-preview:large`) e deixar o bloqueio apenas em páginas que não devem aparecer (nenhuma, no caso).

### P0-2. Não existe `robots.txt` nem `sitemap.xml`

Ambos respondem **404**. Sem sitemap, o Google descobre as matérias por acaso, link a link. Com um site que publica toda semana, isso atrasa a indexação em dias.

**Correção:** gerar os dois no servidor (funções `/api/robots` e `/api/sitemap`, com rewrite em `vercel.json`), lendo a lista de matérias do Notion + acervo. Automático: matéria nova entra no sitemap sozinha.

### P0-3. A home não tem `<h1>`

A página mais importante do site não tem título principal na estrutura. A marca aparece só como **imagem** (logo), e o Google não lê texto em imagem.

**Correção:** um `<h1>` real, visualmente discreto, com o nome do veículo + a frase de posicionamento.

### P0-4. Erro 404 é a página padrão da Vercel

Quem clica num link antigo (vai acontecer muito com divulgação em rede social) vê uma tela branca com `NOT_FOUND`. Quebra a marca no pior momento: o da frustração.

**Correção:** página 404 própria, com a chama, busca e link para as últimas matérias.

### P0-5. Migração para o domínio próprio

Quando o domínio entrar, quatro coisas precisam mudar **juntas**, senão o Google passa a ver dois sites:

1. **Canonical** de todas as páginas apontando para o domínio novo (hoje aponta para `vercel.app`).
2. **`og:url` / `og:image`** apontando para o domínio novo (o middleware tem o endereço antigo fixo no código).
3. **Redirecionamento 301** de `ladoesquerdodecuritiba.vercel.app` para o domínio novo.
4. **Domínio principal** marcado na Vercel + `sitemap.xml` com os endereços novos.

Sem isso, links compartilhados antes do domínio continuam funcionando, mas cada matéria passa a existir em dois endereços — o pior cenário para SEO.

**Passo a passo do registro.br (quando liberar):**
- No painel do registro.br: **DNS** → apontar o domínio para a Vercel:
  - `A` `@` → `76.76.21.21`
  - `CNAME` `www` → `cname.vercel-dns.com`
- Na Vercel: **Settings → Domains** → adicionar o domínio → seguir a verificação.
- Escolher o domínio principal (com ou sem `www`) e deixar o outro redirecionando.
- Esperar a propagação (de minutos a algumas horas) e só então publicar a correção do item P0-5.

---

## P1 — Ganhos grandes de alcance (próximos 30 dias)

### P1-1. O texto das matérias não está no HTML

A página de matéria é montada por JavaScript no navegador. O Google consegue executar JS, mas com atraso e sem garantia; agregadores, LinkedIn, Facebook e leitores de feed **não executam**. Hoje o HTML entregue tem só o "esqueleto".

**Correção:** usar o mesmo mecanismo do middleware que já injeta as metas de prévia para **injetar também o corpo da matéria** no HTML. Ganho duplo: SEO real e a matéria aparece pronta (melhora o LCP).

### P1-2. Sem dados estruturados (JSON-LD)

Não há marcação `NewsArticle`, `Organization` nem `BreadcrumbList`. Isso é o que habilita aparições diferenciadas no Google (Discover, Notícias, painel do veículo).

**Correção:** JSON-LD na matéria (título, autor, data, imagem, editoria) e na home (organização + logo).

### P1-3. Sem medição nenhuma

Não há analytics nem verificação do Google Search Console. Ou seja: **ninguém sabe quantas pessoas leem**, de onde vêm, nem se as matérias foram indexadas. Com o dono divulgando, isso é voar às cegas.

**Correção mínima:** Search Console + analytics leve, respeitando a CSP (que hoje bloqueia qualquer domínio externo de script). Sugestão: Vercel Analytics (já incluído no plano) ou Plausible/Umami. Importante: precisa liberar o domínio na CSP.

### P1-4. Sem feed RSS

Veículos de imprensa são acompanhados por agregadores e newsletters via RSS. Uma função gerando `/feed.xml` custa pouco e amplia o alcance.

### P1-5. Imagens sem `width`/`height`

As imagens do corpo não declaram dimensões, o que causa "pulo" de layout (CLS) ao carregar. Também não têm `srcset`, então celular baixa a mesma imagem do desktop.

### P1-6. Textos pequenos abaixo do mínimo de contraste

O cinza `--muted-2` (#8c7e76) sobre o fundo escuro dá **3,72:1**, abaixo dos 4,5:1 exigidos para texto normal. Ele é usado em legendas, créditos e datas — textos pequenos, justamente onde a leitura é mais difícil.

**Correção:** clarear para algo em torno de `#a3958c` (atinge ~4,9:1) mantendo a hierarquia visual.

---

## P2 — Refinamentos (quando der)

1. **Skip link** ("pular para o conteúdo") para quem navega por teclado — hoje o primeiro Tab cai num link sem texto visível.
2. **`aria-current`** no item de menu da página atual.
3. **Menu mobile:** confirmar o fechamento ao tocar fora (no teste automatizado o backdrop não fechou; vale testar no celular real).
4. **Links internos com `.html`** geram redirecionamento 308 a cada clique (`blog.html` → `/blog`). Convém apontar direto para `/blog`.
5. **`canonical` ausente** na home e no blog.
6. **Página "O Projeto"** hoje é uma âncora na home; para SEO e para o dono divulgar, pode virar página própria (`/projeto`) com texto sobre o veículo.
7. **Política de privacidade / termos** — recomendável (LGPD) assim que houver analytics ou formulário.
8. **Busca na home** não existe: quem chega pela bio do Instagram vê a manchete e precisa ir para o blog para buscar.
9. **Paginação no blog**: hoje mostra tudo de uma vez; a partir de ~50 matérias convém paginar ou carregar em blocos.
10. **Aviso de "matéria publicada em…"** no artigo já existe; falta revisão de datas futuras (as de teste estão com 22/10/2026).

---

## Navegabilidade — o que está bom e o que ajustar

**Bom:**
- Menu enxuto (Início · Blog · O Projeto) — decidir é fácil.
- "Ver todas" na home e o blog com busca por título/resumo/categoria/autor, filtro de mês, ano e categoria, e ordenação.
- Migalha de pão nas matérias (Início / Blog / Editoria).
- Botões de compartilhamento no fim da matéria.
- Rodapé com navegação, redes e crédito.

**Ajustar:**
- A home não tem busca própria (só o blog tem).
- Sem "matérias relacionadas" visíveis quando existe só uma matéria — a seção fica escondida (comportamento correto, mas vale conferir com mais conteúdo).
- Falta página 404 útil (P0-4).
- Falta um caminho claro de volta ao topo em matérias longas.

---

## Estrutura geral — está sólida

```
Notion (escrita)  →  API na Vercel  →  acervo no git (textos + imagens)  →  site
```

- Não há banco de dados para manter, não há build quebrável, não há dependência de plugin.
- Três camadas independentes: se o Notion cair, o acervo sustenta; se a Vercel falhar, o repositório é a fonte.
- Documentação no próprio repositório (`docs/`) com runbooks de migração, acervo e passagem de bastão.
- O ponto único de fragilidade **técnica** hoje é justamente o SEO (P0) — é o que precisa de atenção, não a infraestrutura.

---

## Ordem recomendada

| Etapa | O que fazer | Quando |
|---|---|---|
| **Agora** | P0-1 (`noindex`), P0-2 (robots + sitemap), P0-3 (h1), P0-4 (404) | antes do domínio |
| **No dia do domínio** | P0-5 completo (canonical, og, 301, domínio principal) | junto com o registro.br |
| **Semana seguinte** | P1-3 (Search Console + analytics), P1-2 (JSON-LD) | depois de indexar |
| **Próximas semanas** | P1-1 (corpo no HTML), P1-4 (RSS), P1-5, P1-6 | incremental |
| **Quando der** | P2 (acessibilidade, busca na home, paginação) | polimento |

**Estimativa:** a etapa "Agora" é uma única entrega (v3.1.0) e resolve o que impede o site de ser encontrado. A etapa "no dia do domínio" é outra entrega pequena e cirúrgica.
