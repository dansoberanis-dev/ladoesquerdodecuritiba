# Migrar o banco para o Notion do dono — passo a passo

Duas etapas independentes. **Parte 1** você faz quando ele criar o Notion. **Parte 2** você faz depois, já com a conta dele criada, para o site passar a ler do banco dele.

Situação combinada (22/10/2026):
- **GitHub e Vercel:** ficam com você por enquanto. Se você sair do projeto, transfere.
- **Notion:** exclusivamente do dono — a conta, o workspace e o banco são dele.

---

# PARTE 1 — Levar a tabela para o Notion dele

## 1.1 Antes de compartilhar: limpar

No banco MATÉRIAS, apague as matérias de teste (TESTE2, TESTE3, Teste de integração) **ou** deixe que ele apague depois. Recomendado apagar antes: o modelo vai limpo.

> Não apague as colunas. As **9 colunas** e os tipos (Status, Selecionar, Arquivos e mídia, Caixa, Data, Texto) são o que faz o site funcionar.

## 1.2 Publicar como modelo (caminho garantido)

1. Abra o banco MATÉRIAS **em página inteira**.
2. Canto superior direito → **Compartilhar**.
3. Aba **Publicar** → **Publicar na web** (liga).
4. Ligue a opção **Permitir duplicação como modelo**.
5. Clique em **Copiar link**.

## 1.3 O que o dono faz (30 segundos)

1. Abre o link que você mandou.
2. Canto superior direito → **Duplicar**.
3. Escolhe o workspace dele → **Duplicar**.

Pronto: ele tem o banco com as 9 colunas já tipadas, dentro da conta dele. O banco é **dele** — você não precisa estar logado para ele usar.

> Se ele já estiver na sua conta como convidado, existe um atalho: menu `•••` do banco → **Mover para** → a página dele. Também preserva tudo. Se não funcionar, use o modelo (1.2).

## 1.4 O que NÃO fazer

| Não faça | Por quê |
|---|---|
| Exportar CSV / Markdown e importar | perde a propriedade **Capa** (arquivos) e os tipos de Status/Selecionar — a integração quebra |
| Criar o banco do zero no Notion dele | nomes de coluna e tipos divergem e o site não encontra os campos |
| Copiar matéria por matéria (Ctrl+C / Ctrl+V) | funciona, mas o `slug` (endereço) muda se o título mudar — links antigos quebram |

## 1.5 Conferência (1 minuto)

No banco dele, confirme que existem estas colunas, com estes tipos:

| Coluna | Tipo |
|---|---|
| Título | título (padrão do Notion) |
| Resumo | Texto |
| Categoria | Selecionar |
| Capa | Arquivos e mídia |
| Data | Data |
| Autor | Texto |
| Status | Status (Rascunho / Em revisão / Publicado) |
| Destaque | Caixa |
| Crédito da Foto | Texto |

Se algum tipo vier diferente, corrija no Notion dele (clique no nome da coluna → Tipo).

---

# PARTE 2 — Ligar o banco dele no site (fazer depois)

Enquanto ele configura, **o site continua lendo o seu banco**. Você só muda quando ele já tiver o banco e o token dele prontos. A virada não derruba o site em nenhum momento.

## 2.1 Ele cria o token (5 cliques)

1. `notion.so/my-integrations` → **Developer tools** → **Connections** → **New connection**
2. Tipo: **API token** · Nome: `Site Lado Esquerdo`
3. Ele recebe um código começando com **`ntn_`** — **ele te envia esse código** (é a credencial do site dele, não é senha pessoal; evite mandar por grupos ou e-mail público)
4. No banco MATÉRIAS dele: `•••` (canto superior direito) → **Conexões** → adicionar `Site Lado Esquerdo`

> Sem o passo 4 o token não enxerga o banco: a API responde **404** mesmo com o código certo. É o erro mais comum.

## 2.2 Você pega o endereço do banco (DATABASE_ID)

1. Abra o banco MATÉRIAS **em página inteira**, na conta dele.
2. Olhe a barra de endereço. Ela tem algo assim:

```
https://www.notion.so/workspace/MATERIAS-1f3a5c9d8e7b4a6f9d2c1b0a9e8f7d6c?v=2b4c6d8e0f1a3c5e7b9d1f3a5c7e9b0d
                                       └──────────── este é o DATABASE_ID ────────────┘  └── isto é só a VISÃO, não use ──┘
```

3. Copie **só** o trecho de 32 caracteres que vem depois do último hífen do nome, **antes do `?v=`**.

**Teste rápido:** o ID tem que ter exatamente 32 caracteres, só letras e números (sem `?`, sem `-`, sem espaços).

## 2.3 Você configura na Vercel (sem tocar no que já funciona)

Confira antes o nome exato das variáveis que já existem: são `NOTION_TOKEN` (a sua) e `NOTION_DATABASE_ID` (o seu banco). As novas entram como **número 2**, então as duas fontes convivem.

1. Vercel → projeto `ladoesquerdodecuritiba` → **Settings** → **Environments**
2. Clique em **Production**
3. Em **Environment Variables**, adicione:

| Nome | Valor |
|---|---|
| `NOTION_TOKEN_2` | o código `ntn_...` **dele** |
| `NOTION_DATABASE_ID_2` | o ID de 32 caracteres **do banco dele** |

4. **Save** → aba **Deployments** → no último deploy, `•••` → **Redeploy**

> Redeploy é obrigatório: variável nova não entra em deploy antigo.

## 2.4 Conferência (você faz)

Abra no navegador:

```
https://ladoesquerdodecuritiba.vercel.app/api/posts
```

O que olhar na resposta:

| Campo | O que significa |
|---|---|
| `fontesOk: [1, 2]` | as duas contas responderam ✅ |
| `fontesOk: [1]` + `fontesFalhas: [{fonte: 2, ...}]` | o banco dele falhou: token errado, conexão não adicionada, ID errado |
| `total` maior que antes | apareceram as matérias do banco dele ✅ |

Depois, no site: `/blog` deve listar as matérias dos dois bancos.

## 2.5 Publicar uma matéria de teste **por ele**

Para provar que a conta dele funciona de ponta a ponta:

1. Ele cria uma matéria no banco dele, preenche **Resumo** e **Capa**
2. Marca **Destaque** (para virar manchete)
3. Muda o **Status** para **Publicado**
4. Em ~1 minuto aparece em `/blog` e na home

Se aparecer: a conta dele está no comando. Se não aparecer, o problema é Status, Resumo vazio, ou a conexão (2.1, passo 4).

## 2.6 O acervo continua protegendo

Depois de rodar o Actions "Acervo do blog", as imagens do banco dele entram no repositório também. As imagens antigas (do seu banco) continuam lá como arquivo histórico — nada se perde.

## 2.7 Quando quiser desligar o seu banco (só no fim)

1. **Antes**, confirme que todas as matérias que importam estão no banco dele (duplicadas ou recriadas).
2. Remova `NOTION_TOKEN` e `NOTION_DATABASE_ID` da Vercel (ou renomeie para `NOTION_TOKEN_9`, que o código ignora).
3. **Redeploy**.
4. Rode o Actions "Acervo do blog" e confira `fontesOk: [2]` e o total de matérias.

⚠️ **Atenção:** matéria que só existir no *seu* banco será marcada como despublicada no acervo (sai do site, mas o texto e as imagens ficam guardados no git). Por isso o passo 1 é obrigatório antes de desligar.

### Sobre os endereços das matérias

O `slug` vem do **título**, não do banco. Ao duplicar para o Notion dele, os endereços continuam iguais (`/artigo?slug=camara-aprova-orcamento`) e os links já compartilhados seguem funcionando. Só muda se ele mudar o título da matéria.

---

# Checklist rápido (guardar)

**Parte 1 — agora**
- [ ] Apaguei as matérias de teste do meu banco
- [ ] Compartilhar → Publicar → **Permitir duplicação como modelo** → copiei o link
- [ ] Ele duplicou no workspace dele
- [ ] Conferi as 9 colunas e os tipos no banco dele

**Parte 2 — depois**
- [ ] Ele criou o token (`ntn_...`) e **conectou** ao banco MATÉRIAS dele
- [ ] Peguei o DATABASE_ID (32 caracteres, antes do `?v=`)
- [ ] Adicionei `NOTION_TOKEN_2` e `NOTION_DATABASE_ID_2` em Production
- [ ] Fiz **Redeploy**
- [ ] `/api/posts` mostrou `fontesOk: [1, 2]`
- [ ] Ele publicou uma matéria de teste e ela apareceu no site
- [ ] Rodei o Actions "Acervo do blog"

---

# Se algo der errado

| Sintoma | Causa provável | Solução |
|---|---|---|
| `/api/posts` com `fontesFalhas` na fonte 2 | conexão não adicionada ao banco | `•••` → Conexões → adicionar a conexão dele |
| Erro 401 | token colado errado / espaço no fim | recolar `NOTION_TOKEN_2` |
| Erro 404 | DATABASE_ID errado (pegou o `?v=`) | pegar os 32 caracteres do banco |
| Matéria dele não aparece | Status diferente de **Publicado** | mudar o Status |
| Card sem texto | **Resumo** vazio | preencher o Resumo |
| Variável nova não tem efeito | faltou redeploy | Deployments → Redeploy |
| Home com manchete trocada | matéria dele com **Destaque** marcado | deixar só uma marcada |
