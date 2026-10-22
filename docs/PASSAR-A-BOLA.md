# Passar a bola: o que é seu, o que é do cliente

Você é prestador de serviço; ele é o dono do veículo. A regra é simples: **tudo que o site precisa para funcionar tem que estar em nome dele.** Você fica como convidado/colaborador para dar suporte — não como intermediário obrigatório.

---

## 1. O que deve estar no nome de quem

| Peça | Dono | O que você faz |
|---|---|---|
| **Workspace do Notion** + banco MATÉRIAS | **Cliente** | Você entra como **convidado** (guest) na página MATÉRIAS, com permissão de edição. |
| **Token da integração do Notion** | **Cliente** (criado por ele; você recebe o `ntn_...` e nunca publica) | Guarda na Vercel. Se ele revogar o token depois, o site para — então o token deve ser dele e a Vercel também. |
| **Conta da Vercel** + projeto | **Cliente** | Você configura; ele é o titular. Alternativa: você cria uma equipe (Team) na Vercel e o coloca como **Owner**. |
| **Conta do GitHub** + repositório | **Cliente** | Você é colaborador (`Collaborator`). Repositório público ou privado, dele. |
| **Domínio** (quando houver) | **Cliente** | Registro no nome dele, apontado para a Vercel. |
| **Instagram / WhatsApp / e-mail** | **Cliente** | Você só usa links e, se pedir, o feed. |
| **Seu conhecimento do processo** | Você | Manuais em `docs/` + suporte combinado. |

Se qualquer peça ficar no seu nome, o site fica **dependente da sua conta continuar ativa e pagando**. É exatamente o que ele não quer — e é o seu risco também: se você parar de atender, ele fica com um site que não consegue manter.

---

## 2. O jeito certo: montar direto na conta dele

Faça uma sessão (presencial ou por acesso remoto com ele olhando) e siga nesta ordem:

1. **Notion dele**: duplicar o modelo da tabela (ver §3). Ele é o proprietário da página.
2. **Conexão do Notion dele**: `notion.so/my-integrations` → **Developer tools → Connections → New connection**, tipo **API token**, nome "Site Lado Esquerdo". Conectar em `•••` → **Conexões** da página MATÉRIAS.
3. **GitHub dele**: criar o repositório `ladoesquerdodecuritiba` e te adicionar como colaborador.
4. **Vercel dele**: importar o repositório, Framework `Other`, Build Command vazio, Output `.`. Variáveis:
   - `NOTION_TOKEN` = token **dele**
   - `NOTION_DATABASE_ID` = banco **dele**
   - (opcional) `NOTION_CRIADORES_PERMITIDOS` com o ID dele
5. **Apontar o domínio** (se houver) na conta dele.
6. Testar: publicar uma matéria de teste no Notion dele → `Status = Publicado` → conferir no site.

Depois disso, **você não precisa mais da sua conta do Notion** para nada. Se ele pedir uma matéria publicada com urgência, você entra como convidado na página dele e publica.

---

## 3. Duplicar a tabela para o Notion dele

1. Na página do banco MATÉRIAS → **Compartilhar** → aba **Publicar**.
2. Ligar **Permitir duplicação como modelo**.
3. Enviar o link. Ele abre e clica em **Duplicar**, escolhendo o workspace dele.

O banco chega com as **9 colunas tipadas** e as matérias que estiverem nele. Depois ele apaga as de teste (ou você apaga antes de gerar o link).

**Não use exportação CSV/Markdown**: perde a propriedade `Capa` (arquivos) e os tipos de campo, e a integração quebra.

---

## 4. "Passar a bola" depois que o site já está rodando na sua conta

Este é o cenário que você descreveu: começou na sua conta, ele quer autonomia. Roteiro sem perder nada:

1. **Leve o conteúdo para o Notion dele**
   - Duplique o modelo na conta dele (§3).
   - Ou, se ele já for convidado no seu workspace: no banco, menu `•••` → **Mover para** → escolha a página/workspace dele (quando disponível na sua versão do Notion). Mover preserva o conteúdo e a estrutura.
   - Se nenhum dos dois funcionar: duplicar o modelo é o caminho garantido.

2. **Ligue a conta dele no site, mantendo a sua como reserva**
   Na Vercel, adicione:
   ```
   NOTION_TOKEN_2        = (token dele)
   NOTION_DATABASE_ID_2  = (banco dele)
   ```
   Redeploy. Agora o site lê **as duas** contas ao mesmo tempo, sem duplicar matérias.

3. **Confira** que todas as matérias aparecem (as antigas vindas da sua fonte, as novas da dele).

4. **Desligue a sua fonte**
   Remova `NOTION_TOKEN` e `NOTION_DATABASE_ID` (ou renomeie para `NOTION_TOKEN_9`, que o código ignora) e faça redeploy. O site passa a viver só da conta dele.

5. **Transfira as contas**: repositório do GitHub (transferir para a conta dele), projeto da Vercel (transferir para a conta/equipe dele), domínio.

### O que acontece com o que já foi publicado

| Item | O que acontece |
|---|---|
| **Endereços das matérias** | **Não mudam.** O slug vem do título (`camara-aprova-orcamento`), não do ID da página. Links já compartilhados continuam abrindo. |
| **Textos e datas** | Preservados na duplicação. |
| **Imagens** | O Notion reenvia os arquivos ao duplicar: ganham endereços novos. Como o site busca a imagem a cada acesso, isso é transparente — nenhuma ação necessária. |
| **Nomes de arquivo das fotos** | Podem mudar; irrelevante para o site. |
| **Contagem de visualizações / histórico da página** | Não vem na duplicação (é do Notion, não do site). |
| **Acervo no git (textos e imagens)** | Continua servindo de reserva durante a troca; atualiza sozinho em até 3h depois da migração. |

---

## 5. Se ele começar na sua conta e você NÃO puder estar presente depois

Evite essa situação. Se for inevitável:

- Deixe o site lendo **as duas fontes** (sua conta + a dele) até a migração acontecer.
- Deixe o **acervo no git** ativo (§6) — é a rede de segurança caso seu token caia.
- Escreva no combinado de serviço, por escrito, quem paga o quê: Notion (plano do workspace), Vercel, domínio.
- Deixe o manual `docs/ACERVO-E-IMAGENS.md` com ele: mesmo sem Notion, o site publica por git.

---

## 6. Rede de segurança: o acervo no git (textos E imagens)

Todo o conteúdo publicado é espelhado dentro do repositório a cada 3 horas (`scripts/sincronizar.mjs` via GitHub Actions):

```
conteudo/posts.json           texto completo de cada matéria
conteudo/img/<slug>/…         capa e imagens do corpo, guardadas no próprio site
```

- Fonte do Notion fora do ar → o site completa com o acervo e **não perde matéria**.
- Notion inteiro fora do ar → o site mostra o acervo completo, **com as imagens**.
- Quando o Notion volta → atualiza no ciclo seguinte, sem ninguém fazer nada.
- Matéria tirada do "Publicado" → sai do site, **mas o texto e as imagens continuam no git** (arquivo histórico).

É por isso que a migração de conta é segura: mesmo que algo dê errado no caminho, o acervo está no repositório e o site continua no ar.

---

## 7. Checklist final de entrega

- [ ] Banco MATÉRIAS na conta dele, com as 9 colunas
- [ ] Conexão (token) criada por ele e conectada à página
- [ ] Repositório no GitHub dele, você como colaborador
- [ ] Projeto na Vercel dele com `NOTION_TOKEN` e `NOTION_DATABASE_ID` dele
- [ ] Domínio (se houver) no nome dele
- [ ] Uma matéria de teste publicada **por ele** e vista no site
- [ ] Acervo rodando (aba Actions → "Acervo do blog" com execuções verdes)
- [ ] Ele sabe publicar sozinho (docs `GUIA-DO-EDITOR.md` e `BLOG-COMO-ALIMENTAR.md`)
- [ ] Ele sabe o plano B (docs `ACERVO-E-IMAGENS.md`)
- [ ] Sua conta antiga desconectada do site
