# O acervo: como o site guarda tudo (textos e imagens)

Este documento explica a mudança mais importante do projeto: **o site não depende mais do Notion para exibir conteúdo.** O Notion continua sendo onde o dono escreve e decide o que está no ar; o repositório guarda uma cópia completa de tudo — **inclusive as imagens**.

Funciona como um site em WordPress: o material mora dentro do site.

---

## 1. A regra, em uma frase

> **O Notion manda. O git guarda.**

- O dono muda o `Status` para **Publicado** no Notion → a matéria entra no site.
- O dono tira do `Publicado` → a matéria sai do site **mas continua guardada** no repositório (arquivo histórico).
- O Notion cai, expira o token ou fica fora do ar → **nada sai do site**: o site passa a ler o acervo guardado no git, com textos **e imagens**.

---

## 2. O que existe no repositório

```
conteudo/
├── posts.json                  texto completo de todas as matérias
└── img/
    └── <slug-da-materia>/
        ├── capa.png            imagem de capa, baixada do Notion
        ├── corpo-1.webp        primeira imagem do corpo do texto
        ├── corpo-2.webp        segunda…
        └── …
```

- As imagens são **arquivos do próprio site** (nada de link temporário do Notion, que expira em ~1 hora).
- Nome antigo, matéria nova: cada matéria tem sua pasta, nomeada pelo endereço dela (`camara-aprova-orcamento`).
- `posts.json` guarda: título, resumo, categoria, data, autor, crédito da foto, destaque, **o corpo do texto já com os caminhos locais das imagens** e um índice `imagens` com os endereços originais.

---

## 3. Quem mantém o acervo

O **GitHub Actions** roda `scripts/sincronizar.mjs` **a cada 3 horas** e sempre que alguém aperta o botão:

1. Lê o que está publicado (`/api/posts`) e o corpo de cada matéria (`/api/post`).
2. Baixa as imagens que ainda não estão no repositório.
3. Regrava `conteudo/posts.json` e faz commit.

**Botão manual:** GitHub → aba **Actions** → "Acervo do blog" → **Run workflow**.

### Travas de segurança (testadas)

| Situação | O que o sincronizador faz |
|---|---|
| Todas as fontes do Notion falharam | **Não altera nada.** Acervo intacto. |
| Uma fonte falhou (token vencido, por exemplo) | Só acrescenta. **Não despublica** nenhuma matéria. |
| Matéria saiu do "Publicado" no Notion (todas as fontes OK) | Marca `publicado: false`. O texto e as imagens **continuam** no repositório. |
| O corpo veio vazio ou de outra matéria | Mantém o texto que já estava no acervo. |
| Imagem não pôde ser baixada | Mantém o endereço do Notion naquela matéria e tenta de novo no ciclo seguinte. |

---

## 4. O que o site faz com isso

Ao abrir qualquer página, o site:

1. Pede a lista ao Notion (`/api/posts`).
2. Pede o acervo (`conteudo/posts.json`).
3. Combina:

| Estado do Notion | O que aparece no site |
|---|---|
| Respondendo normalmente | As matérias publicadas no Notion, com **texto e imagens do acervo** (carregamento mais rápido, imagens permanentes) |
| Uma fonte fora do ar | As demais + **as matérias da fonte que caiu**, vindas do acervo |
| Fora do ar por completo | **O acervo inteiro** — o blog continua de pé |

Ou seja: o pior cenário deixou de ser "site vazio" e passou a ser "site igual, só um pouco mais velho".

---

## 5. Publicar sem o Notion (emergência ou matéria manual)

Ainda é possível publicar direto pelo repositório. O item entra no `conteudo/posts.json` com `"origem": "manual"` e a sincronização **nunca mexe nele** (não despublica nem apaga).

```json
{
  "slug": "nota-da-redacao",
  "titulo": "Nota da redação",
  "resumo": "Resumo que aparece no card.",
  "categoria": "Nota",
  "capa": "conteudo/img/nota-da-redacao/capa.jpg",
  "capaCredito": "Nome do fotógrafo",
  "data": "2026-10-22",
  "autor": "",
  "destaque": false,
  "status": "publicado",
  "publicado": true,
  "origem": "manual",
  "corpo": "<p>Texto.</p><h2>Subtítulo</h2><p>Mais texto.</p><figure><img src=\"conteudo/img/nota-da-redacao/corpo-1.jpg\" alt=\"\"><figcaption>Legenda</figcaption></figure>",
  "imagens": []
}
```

Passos: salvar a foto em `conteudo/img/<slug>/`, colar o item no `posts.json` (lembre da vírgula entre itens), rodar o bloco de `git push`. Em ~1 minuto está no ar.

---

## 6. Limites e cuidados

- **Tamanho:** `posts.json` precisa ficar **abaixo de 5 MB**. Texto não pesa (milhares de matérias cabem), mas fique de olho. As imagens não entram nesse número.
- **Imagens grandes:** o fluxo compacta automaticamente o que passar de 400 KB (largura máxima 1600px). Se um dia o repositório passar de ~1 GB, vale migrar as imagens para um armazenamento próprio.
- **A pasta `conteudo/` não vai nos ZIPs de atualização.** Quem manda nela é o robô; sobrescrever com uma versão antiga apagaria conteúdo.
- **Notion não é apagado nem alterado** em nenhum momento. O acervo é uma cópia de leitura.
- **Imagem trocada no Notion:** vira um arquivo novo (`capa-1.jpg`) na próxima sincronização; a antiga pode ficar órfã na pasta. Não quebra nada — é só histórico.

---

## O que mudou na versão 3.1.8 (26/10/2026)

Antes, a página da matéria ainda podia buscar capa e imagens no Notion, por **links que expiram em 1 hora**. Agora a ordem é esta:

1. **Acervo primeiro.** A página da matéria é montada a partir de `conteudo/posts.json`: título, resumo, categoria, data, assinatura, capa e corpo com as imagens locais. O texto já vai dentro do HTML, então o Google e as prévias de link (WhatsApp, Instagram) leem tudo sem executar JavaScript.
2. **Notion só como reserva.** Se a matéria ainda não foi espelhada (publicada há menos de 1 hora), a página busca no Notion e continua funcionando normalmente.
3. **`og:image` também vem do acervo.** A imagem de prévia em redes sociais não expira mais em 1 hora.
4. **Espelho de hora em hora.** O Actions deixou de rodar a cada 3 horas e passou a rodar a cada hora, para que a matéria recém-publicada ganhe imagens permanentes rápido.

Regra prática: matéria publicada agora fica **totalmente independente do Notion em cerca de 1 hora**. Se precisar de imediato, abra **Actions → "Acervo do blog" → Run workflow**.
