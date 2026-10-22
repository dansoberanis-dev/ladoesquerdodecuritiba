# Passar o blog para o dono — decisões e passo a passo

Três perguntas práticas: **como duplicar a tabela**, **como configurar a conta dele** e **se a Vercel suporta mais de um Notion**.

---

## 1. Duplicar a tabela MATÉRIAS para o Notion do dono

O caminho **sem erro** é o modelo:

1. Na página do banco MATÉRIAS, clique em **Compartilhar** (canto superior direito).
2. Aba **Publicar** → **Publicar na web**.
3. Ligue **Permitir duplicação como modelo**.
4. Copie o link e envie ao dono. Ele abre → **Duplicar** (canto superior) → escolhe o workspace dele.

O banco chega com as **9 colunas** e os tipos certos (Status, Selecionar, Arquivos e mídia, Caixa, Data, Texto). As matérias de teste também vão — ele apaga.

**Alternativa dentro da mesma conta:** menu `•••` do banco → **Duplicar** → arraste para a página do dono. Só funciona se ele for membro/convidado do seu workspace.

**O que NÃO fazer:** exportar em Markdown/CSV e reimportar. Perde a propriedade `Capa` (arquivos), os tipos de Status e Selecionar, e o resultado quebra a integração.

---

## 2. Como o dono passa a publicar

### Opção A — ele publica pela própria conta, em workspace dele (recomendada para o dia a dia)

1. Ele duplica o modelo (passo 1).
2. Ele cria a **conexão** dele: `notion.so/my-integrations` → **Developer tools → Connections → New connection**, tipo **API token** → copia o `ntn_...`.
3. `•••` na página MATÉRIAS → **Conexões** → adiciona a conexão dele.
4. Você pega o **DATABASE_ID** do banco dele (está na URL: `notion.so/.../<DATABASE_ID>?v=...` — o `?v=` é só a visão).
5. Na Vercel, adiciona as variáveis **dele** como fonte adicional:
   ```
   NOTION_TOKEN_2 = ntn_...        (token dele)
   NOTION_DATABASE_ID_2 = <id do banco dele>
   ```
6. Redeploy.

O site passa a ler **as duas contas** e junta tudo numa lista só. Cada um publica no seu Notion.

### Opção B — ele é convidado no seu workspace e publica no seu banco

- Você convida como **convidado (guest)** na página MATÉRIAS, com permissão de edição.
- Guest **não é assento pago**: no plano Free são até 10 convidados; no Plus são ilimitados.
- Ele edita as linhas, mas **o token e o banco continuam seus**.
- Vantagem: nada a configurar na Vercel. Desvantagem: a operação fica dependente da sua conta.

> Como a matéria passa pela mão de vocês dois, a Opção B (convidado) costuma ser a mais simples para começar; a Opção A é melhor se ele quiser autonomia total.

---

## 3. A Vercel suporta mais de um Notion?

**Sim.** O site foi feito para ler de **até 5 contas/workspaces** ao mesmo tempo:

| Variável | Conta |
|---|---|
| `NOTION_TOKEN` + `NOTION_DATABASE_ID` | conta 1 (a sua) |
| `NOTION_TOKEN_2` + `NOTION_DATABASE_ID_2` | conta 2 (a do dono) |
| `NOTION_TOKEN_3.._5` | contas 3 a 5 |

Regras:
- Os resultados são **juntados e deduplicados por slug** (se a mesma matéria existir nas duas contas, aparece uma vez só).
- **Você não precisa tirar o seu Notion** para colocar o dele. As duas fontes convivem.
- Só entra no ar o que estiver com **Status = Publicado** em cada conta.
- Se um token falhar, o site ignora aquela fonte e mostra as outras (não derruba o blog).
- Depois de salvar as variáveis: **redeploy obrigatório** (Settings → Environments → Production → Environment Variables; a UI nova não tem mais o item "Environment Variables" solto no menu).

### Como cancelar uma fonte depois

Basta apagar/desativar a variável correspondente e fazer redeploy. As matérias daquela conta saem do site; as da outra continuam.
