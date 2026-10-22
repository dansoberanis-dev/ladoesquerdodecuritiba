# Lado Esquerdo de Curitiba

Site do **Lado Esquerdo de Curitiba** — jornalismo crítico e posicionado na capital paranaense.

Site estático (HTML + CSS + JS, sem framework) com blog alimentado por **Notion** e publicado na **Vercel**.

## Páginas

| Arquivo | Conteúdo |
|---|---|
| `index.html` | home: hero com a chama animada, últimas matérias, o projeto, redes sociais |
| `blog.html` | todas as matérias — busca, filtro por mês/ano/categoria e ordenação |
| `artigo.html?slug=…` | matéria completa, com imagens no meio do texto |
| `api/` | funções serverless (Notion e Instagram) que rodam na Vercel |

## Como editar e publicar

```powershell
# extrai o ZIP mais novo de Downloads, atualiza a pasta local e publica no GitHub
cd E:\SITES\LADOESQ\SITEARENA
# (bloco de comandos fornecido junto com cada entrega)
```

## Conteúdo do blog

O blog lê as matérias de um banco de dados no **Notion**. O editor escreve, marca **Publicado** e o
site atualiza em até 60 segundos.

Passo a passo completo: [`BLOG-COMO-ALIMENTAR.md`](BLOG-COMO-ALIMENTAR.md)

- Autor vazio → assina **Redação Lado Esquerdo de Curitiba**
- Autor preenchido → **Por Nome do Autor**
- Imagens no meio do texto: basta arrastar a foto no ponto exato do Notion

## Estrutura

```
index.html · blog.html · artigo.html
css/     estilos.css (base) + blog.css (cartões, filtros, artigo)
js/      app.js (menu/scroll) · blog.js (dados e render) · stats.js (redes)
api/     _notion.js · posts.js · post.js · instagram.js
assets/  img/ · fontes/ · blog/ (dados de exemplo)
```

## Rodar localmente

```powershell
npx serve . -l 3000     # abra http://localhost:3000
```

Abrir `index.html` direto também funciona: o blog usa os dados de exemplo de `assets/blog/posts.js`.

## Deploy

- **GitHub:** `dansoberanis-dev/ladoesquerdodecuritiba`
- **Vercel:** importar o repositório, framework *Other*, sem build command, output `.`
- **Variáveis** (opcionais, para blog e números do Instagram): veja `.env.example`

## Créditos

Desenvolvido por [Daniel Soberanis](https://daniel-soberanis.vercel.app).
