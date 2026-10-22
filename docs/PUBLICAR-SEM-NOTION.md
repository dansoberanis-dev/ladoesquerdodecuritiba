# Publicar sem o Notion (modo de emergência)

Serve para quando o Notion estiver fora do ar, o token vencer, ou for preciso publicar rápido sem passar pelo banco. O texto entra por arquivo, direto no repositório.

O site **continua lendo o Notion normalmente**: o arquivo só acrescenta matérias que não existem lá.

---

## Para o dono: receita de 1 minuto

1. Abra a pasta `E:\SITES\LADOESQ\SITEARENA\dados` e edite o arquivo `posts.json` no Bloco de Notas.
2. Dentro de `"posts": [ ]`, cole o modelo abaixo (entre os colchetes).
3. Troque o texto, salve, e rode o mesmo bloco PowerShell de sempre (o do `git push`).
4. Em ~1 minuto a matéria está no ar.

---

## Modelo pronto (copiar e colar)

```json
{
  "slug": "nota-da-redacao",
  "titulo": "Título da matéria",
  "resumo": "Uma ou duas frases que aparecem no card da home e do blog.",
  "categoria": "Cidade",
  "capa": "assets/img/blog/nome-da-foto.jpg",
  "capaCredito": "Nome do fotógrafo",
  "data": "2026-10-22",
  "autor": "",
  "autorAssinado": true,
  "destaque": false,
  "corpo": "<p>Primeiro parágrafo.</p><h2>Um subtítulo</h2><p>Segundo parágrafo.</p><p>Terceiro parágrafo.</p>"
}
```

Se for a segunda matéria do arquivo, separe as duas por **vírgula**:

```json
"posts": [
  { "slug": "primeira", ... },
  { "slug": "segunda", ... }
]
```

---

## Regras de cada campo

| Campo | Regra |
|---|---|
| `slug` | Endereço da matéria. Minúsculo, sem acento, sem espaço (use hífen). Precisa ser único. |
| `titulo` | Como aparece no site. |
| `resumo` | Texto do card. **Não deixe vazio.** |
| `categoria` | Uma só palavra/expressão: Cidade, Política, Entrevista… |
| `capa` | Caminho da imagem dentro do site. Precisa ser uma foto **deitada** (paisagem). |
| `capaCredito` | Quem fotografou. Aparece embaixo da imagem. |
| `data` | Sempre `AAAA-MM-DD` (ex.: `2026-10-22`). Ordena o site. |
| `autor` | Vazio = "Redação Lado Esquerdo de Curitiba". |
| `destaque` | `true` = vira a manchete grande da home. Só **uma** matéria deve ter `true`. |
| `corpo` | O texto em HTML (veja abaixo). |

### HTML aceito no corpo

```html
<p>Parágrafo normal.</p>
<h2>Subtítulo de seção</h2>
<h3>Subtítulo menor</h3>
<ul><li>item</li><li>item</li></ul>
<ol><li>primeiro</li><li>segundo</li></ol>
<blockquote>Uma citação em destaque.</blockquote>
<strong>negrito</strong> e <a href="https://exemplo.com">link</a>
<figure><img src="assets/img/blog/foto.jpg" alt=""><figcaption>Legenda da foto</figcaption></figure>
```

---

## Como colocar a imagem

1. Salve a foto dentro de `E:\SITES\LADOESQ\SITEARENA\assets\img\blog\` (a pasta existe; crie subpastas se quiser).
2. Use o caminho relativo ao site: `assets/img/blog/nome-do-arquivo.jpg`.
3. Formatos: `.jpg`, `.png`, `.webp`. Evite arquivos acima de 1 MB (deixe a foto com ~1200px de largura).

---

## Cuidados

- **Vírgula e chaves**: um erro de vírgula no JSON faz o arquivo inteiro ser ignorado. Se a matéria não aparecer, rode o bloco de novo e confira as vírgulas no site `jsonlint.com`.
- **Aspas dentro do texto**: dentro do `corpo`, use `\"` para aspas duplas.
- **Duplicidade**: se existir uma matéria com o mesmo `slug` no Notion, o Notion ganha e a do arquivo é ignorada.
- **Quando o Notion voltar**: as matérias do arquivo continuam no ar. Para tirar uma, apague o item do arquivo e publique de novo.

---

## O que NÃO muda

- A página da matéria, os cards, a busca e os filtros funcionam igual.
- A prévia de link (WhatsApp) também funciona: o middleware lê o arquivo quando o Notion não tem a matéria.
- Nada do Notion é alterado.
