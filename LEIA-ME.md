# Lado Esquerdo de Curitiba — SITEARENA

Site do **Lado Esquerdo de Curitiba** (jornalismo crítico e posicionado, Curitiba/PR).

Projeto **novo, criado do zero**: sem framework, sem `node_modules`, sem dependências externas.
Abre direto no navegador e sobe em qualquer hospedagem estática (Vercel, Netlify, Hostinger, etc.).

---

## Estrutura

```
SITEARENA/
├─ index.html                  ← a página inteira (hero, matérias, projeto, redes, rodapé)
├─ css/
│  └─ estilos.css              ← todo o visual (tokens de cor, hero, chama, menu, responsivo)
├─ js/
│  └─ app.js                   ← menu mobile, header ao rolar, fagulhas, animações de entrada
├─ assets/
│  ├─ img/
│  │  ├─ chama.webp / .png     ← logo-chama recortada (transparente)
│  │  ├─ logo-texto.webp / .png← lettering "Lado Esquerdo de Curitiba"
│  │  ├─ favicon.png           ← chama no formato de ícone
│  │  ├─ hero-bg.webp          ← foto de manifestação do hero
│  │  └─ materia-1/2/3.webp    ← capas das matérias
│  └─ fontes/                  ← Chakra Petch (600/700) e Newsreader (400), .woff2 locais
├─ atualizar-site.ps1          ← script de atualização (NÃO apagar — usado em toda edição)
├─ vercel.json                 ← cabeçalhos de segurança/cache quando for publicar
├─ .gitignore
└─ LEIA-ME.md
```

---

## Como editar (fluxo de cada alteração)

1. **Baixar** o ZIP novo que eu te envio (vai para `Downloads`).
2. **Abrir o PowerShell** e rodar:

```powershell
cd E:\SITES\LADOESQ\SITEARENA
powershell -ExecutionPolicy Bypass -File .\atualizar-site.ps1 -Abrir
```

O script:
- pega automaticamente o `SITEARENA*.zip` **mais recente** da pasta Downloads;
- valida se o pacote tem `index.html` (se não tiver, **não altera nada**);
- faz **backup** da versão anterior em `E:\SITES\LADOESQ\_backups\SITEARENA_AAAAMMDD_HHMMSS`;
- copia os arquivos por cima;
- abre o site no navegador.

**Variações úteis**

| Situação | Comando |
|---|---|
| ZIP específico | `.\atualizar-site.ps1 -Zip "$env:USERPROFILE\Downloads\SITEARENA-v4.zip"` |
| Deixar a pasta idêntica ao ZIP (remove arquivos que saíram do projeto) | `.\atualizar-site.ps1 -Espelhar -Abrir` |
| Atualizar sem criar backup | `.\atualizar-site.ps1 -SemBackup` |

> **Voltar uma versão:** copie a pasta de `_backups\SITEARENA_...` desejada de volta para `E:\SITES\LADOESQ\SITEARENA`.

---

## Ver o site sem atualizar nada

```powershell
start "E:\SITES\LADOESQ\SITEARENA\index.html"
```

Abrir no VS Code já na pasta certa:

```powershell
code "E:\SITES\LADOESQ\SITEARENA"
```

---

## Editar texto sem precisar de ZIP

Dá para editar `index.html` direto no VS Code (ou Notepad++), salvar e recarregar com `F5` no navegador.
O ZIP só é necessário quando **eu** altero algo (estrutura, CSS, imagens).

---

## Quando for publicar

Ainda **não** tem repositório Git nem Vercel ligados a esta pasta — isso entra numa etapa separada,
depois do layout fechado. Quando chegarmos lá, eu te passo os comandos (`git init`, `git push`, `vercel --prod`)
e o `vercel.json` já está pronto com CSP, cache e compressão.

---

## Pendências / próximos ajustes

- [ ] Revisar textos das 3 matérias de exemplo (títulos, resumos, datas)
- [x] Listagem do blog com busca, filtros e página de matéria
- [ ] Ligar o blog ao Notion (`NOTION_TOKEN` + `NOTION_DATABASE_ID`) — ver `BLOG-COMO-ALIMENTAR.md`
- [ ] Página própria "O Projeto" (hoje é uma seção da home)
- [ ] Meta tags finais (`og:image` com a logo), `sitemap.xml`, `robots.txt`
- [ ] Ligar domínio na Vercel

---

## Blog (novo)

O blog agora tem **3 páginas** e é alimentado pelo **Notion**:

| Arquivo | O que é |
|---|---|
| `index.html` | home — destaque grande (última matéria) + 2 cards laterais |
| `blog.html` | todas as matérias: busca por texto, filtro por **mês**, **ano** e **categoria**, ordenação (recentes / antigas / A–Z) e contador |
| `artigo.html?slug=…` | a matéria: categoria, título, linha fina, assinatura, capa, corpo com imagens no meio e “na mesma editoria” |

**Assinatura automática:** campo `Autor` vazio → aparece *Redação Lado Esquerdo de Curitiba*;
preenchido → aparece *Por Nome do Autor*.

**Como alimentar:** veja **`BLOG-COMO-ALIMENTAR.md`** (passo a passo do Notion + variáveis na Vercel).

**Enquanto o Notion não está ligado**, o site usa os posts de exemplo de `assets/blog/posts.js` —
funciona até com duplo clique no `index.html`, sem servidor.

**Artigo de teste:** abra `artigo.html?slug=artigo-de-teste-veja-como-o-blog-funciona`
(ou clique no card grande de “Últimas matérias”). Ele existe para você ver exatamente como um post
publicado aparece. Para removê-lo quando o Notion entrar no ar: apague ou desmarque a caixa
**Publicado** da matéria correspondente.

## Redes sociais (números automáticos)

Os números de **seguidores / publicações / seguindo** têm um valor escrito no HTML e passam a ser
atualizados sozinhos quando a API estiver configurada:

- Rota: `GET /api/instagram` (usa a Instagram Graph API)
- Variáveis: `INSTAGRAM_TOKEN` e `INSTAGRAM_USER_ID` (veja `.env.example`)
- Cache de 1 hora na CDN (`INSTAGRAM_CACHE`)
- Se a API não estiver configurada ou falhar, **os números do HTML continuam aparecendo** — nada quebra

O rodapé traz o crédito “Desenvolvido por Daniel Soberanis”, com link para
<https://daniel-soberanis.vercel.app>, centralizado entre o copyright e o lema do site.

### Testar localmente com servidor (opcional)

```powershell
cd E:\SITES\LADOESQ\SITEARENA
npx serve . -l 3000
# abra http://localhost:3000
```

---

## Histórico do instalador

| Versão | Mudança |
|---|---|
| **2.1** | Corrige o erro *“O contêiner não pode ser copiado para um item folha existente”* (o backup era copiado para uma pasta que ainda não existia). Agora o backup e a aplicação usam `robocopy`, com alternativa manual item por item. O `atualizar-site.ps1` nunca é sobrescrito por um ZIP — assim uma versão quebrada no pacote não derruba o instalador. |
| 2.0 | Backup automático, validação do ZIP, `-Espelhar`, `-SemBackup`, `-Abrir` |

**Se aparecer erro de script antigo:** rode uma vez o comando de emergência (sem usar o `.ps1`) descrito na
mensagem do assistente — ele extrai o ZIP com `robocopy` e já instala o instalador novo.
