/**
 * Ponte com o Notion — usada pelas funções /api/posts e /api/post
 * -----------------------------------------------------------------
 * Variáveis de ambiente (Vercel → Settings → Environment Variables):
 *   NOTION_TOKEN        = secret_...  (integração interna do Notion)
 *   NOTION_DATABASE_ID  = id do banco de dados das matérias
 *
 * Opcionais:
 *   NOTION_VERSAO_API   = 2022-06-28 (padrão)
 */

const API = 'https://api.notion.com/v1';
const VERSAO = process.env.NOTION_VERSAO_API || '2022-06-28';

export const AUTOR_PADRAO = 'Redação Lado Esquerdo de Curitiba';

export function configurado() {
  return Boolean(process.env.NOTION_TOKEN && process.env.NOTION_DATABASE_ID);
}

async function notion(caminho, opcoes = {}) {
  const r = await fetch(`${API}${caminho}`, {
    ...opcoes,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': VERSAO,
      'Content-Type': 'application/json',
      ...(opcoes.headers || {}),
    },
  });
  if (!r.ok) {
    const corpo = await r.text();
    throw new Error(`Notion ${r.status}: ${corpo.slice(0, 300)}`);
  }
  return r.json();
}

/* ------------------------------------------------------------------ */
/* propriedades                                                        */
/* ------------------------------------------------------------------ */

/** acha uma propriedade ignorando acentos/maiúsculas e espaços */
function prop(props, ...nomes) {
  const chaves = Object.keys(props || {});
  const limpar = (s) =>
    String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  for (const nome of nomes) {
    const alvo = limpar(nome);
    const achou = chaves.find((k) => limpar(k) === alvo);
    if (achou) return props[achou];
  }
  return null;
}

function textoSimples(p) {
  if (!p) return '';
  const lista = p.type === 'title' ? p.title
    : p.type === 'rich_text' ? p.rich_text
    : p.type === 'select' ? (p.select ? [{ plain_text: p.select.name }] : [])
    : p.type === 'status' ? (p.status ? [{ plain_text: p.status.name }] : [])
    : p.type === 'people' ? (p.people || []).map((u) => ({ plain_text: u.name || '' }))
    : p.type === 'created_by' ? (p.created_by ? [{ plain_text: p.created_by.name || '' }] : [])
    : p.type === 'number' ? [{ plain_text: String(p.number ?? '') }]
    : p.type === 'url' ? [{ plain_text: p.url || '' }]
    : [];
  return (lista || []).map((t) => t.plain_text || '').join('').trim();
}

function urlArquivo(p) {
  if (!p) return '';
  const arr = p.type === 'files' ? p.files : p.type === 'url' ? [{ external: { url: p.url } }] : [];
  if (!arr || !arr.length) return '';
  const f = arr[0];
  return (f.type === 'external' ? f.external?.url : f.file?.url) || '';
}

function dataDe(p, fallback) {
  if (p && p.type === 'date' && p.date) return p.date.start;
  if (p && p.type === 'created_time' && p.created_time) return p.created_time;
  if (p && p.type === 'last_edited_time' && p.last_edited_time) return p.last_edited_time;
  return fallback;
}

export function mapearPagina(page) {
  const p = page.properties || {};
  const titulo = textoSimples(prop(p, 'Título', 'Titulo', 'Título da matéria', 'Name', 'Nome')) ||
    textoSimples(prop(p, 'title')) || 'Sem título';
  const slugBase = textoSimples(prop(p, 'Slug', 'slug'));
  const capa = urlArquivo(prop(p, 'Capa', 'Imagem', 'Imagem de capa', 'Cover', 'Foto')) ||
    (page.cover ? (page.cover.type === 'external' ? page.cover.external.url : page.cover.file?.url) : '');
  const autor = textoSimples(prop(p, 'Autor', 'Autor(a)', 'Autoria', 'Author', 'Jornalista', 'Assinatura', 'Repórter'));
  const publicadoEm = dataDe(prop(p, 'Data', 'Data de publicação', 'Publicado em', 'Data publicação', 'Date'), page.created_time);
  const publicado = prop(p, 'Publicado', 'Publish', 'Publicar', 'Ativo');
  const destaque = prop(p, 'Destaque', 'Featured', 'Manchete');

  return {
    id: page.id,
    slug: slugBase || page.id.replace(/-/g, '').slice(0, 12),
    titulo,
    resumo: textoSimples(prop(p, 'Resumo', 'Descrição', 'Descricao', 'Linha fina', 'Subtítulo', 'Summary')),
    categoria: textoSimples(prop(p, 'Categoria', 'Editoria', 'Seção', 'Secao', 'Category')) || 'Matéria',
    capa,
    capaCredito: textoSimples(prop(p, 'Crédito da foto', 'Credito da foto', 'Foto', 'Crédito', 'Credito')),
    data: publicadoEm,
    autor: autor || '',
    autorPadrao: !autor,
    destaque: destaque ? Boolean(destaque.checkbox) : false,
    publicado: publicado ? (publicado.type === 'checkbox' ? Boolean(publicado.checkbox) : true) : true,
  };
}

/* ------------------------------------------------------------------ */
/* rich text / blocos → HTML                                           */
/* ------------------------------------------------------------------ */

const esc = (s) => String(s || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function richText(rt) {
  return (rt || []).map((t) => {
    let txt = esc(t.plain_text);
    if (!txt) return '';
    const a = t.annotations || {};
    if (a.code) txt = `<code>${txt}</code>`;
    if (a.bold) txt = `<strong>${txt}</strong>`;
    if (a.italic) txt = `<em>${txt}</em>`;
    if (a.strikethrough) txt = `<s>${txt}</s>`;
    if (a.underline) txt = `<u>${txt}</u>`;
    if (t.href) txt = `<a href="${esc(t.href)}" target="_blank" rel="noopener noreferrer">${txt}</a>`;
    return txt;
  }).join('');
}

function imagemDoBloco(b) {
  const dados = b.image || b.video || b.file;
  if (!dados) return '';
  const url = dados.type === 'external' ? dados.external?.url : dados.file?.url;
  if (!url) return '';
  const legenda = richText(dados.caption);
  if (b.type === 'video') {
    return `<figure><video controls preload="metadata" src="${esc(url)}" style="width:100%;border-radius:12px"></video>${legenda ? `<figcaption>${legenda}</figcaption>` : ''}</figure>`;
  }
  return `<figure><img src="${esc(url)}" alt="${esc(legenda.replace(/<[^>]+>/g, ''))}" loading="lazy">${legenda ? `<figcaption>${legenda}</figcaption>` : ''}</figure>`;
}

/** converte blocos do Notion em HTML, preservando ordem, listas e imagens */
export function blocosParaHtml(blocos) {
  let html = '';
  let lista = null; // 'ul' | 'ol'

  const fecharLista = () => { if (lista) { html += `</${lista}>`; lista = null; } };

  for (const b of blocos || []) {
    const tipo = b.type;
    const dados = b[tipo] || {};

    if (tipo !== 'bulleted_list_item' && tipo !== 'numbered_list_item') fecharLista();

    switch (tipo) {
      case 'paragraph': {
        const t = richText(dados.rich_text);
        if (t.trim()) html += `<p>${t}</p>`;
        break;
      }
      case 'heading_1':
        html += `<h2>${richText(dados.rich_text)}</h2>`;
        break;
      case 'heading_2':
        html += `<h2>${richText(dados.rich_text)}</h2>`;
        break;
      case 'heading_3':
        html += `<h3>${richText(dados.rich_text)}</h3>`;
        break;
      case 'bulleted_list_item':
        if (lista !== 'ul') { fecharLista(); html += '<ul>'; lista = 'ul'; }
        html += `<li>${richText(dados.rich_text)}</li>`;
        break;
      case 'numbered_list_item':
        if (lista !== 'ol') { fecharLista(); html += '<ol>'; lista = 'ol'; }
        html += `<li>${richText(dados.rich_text)}</li>`;
        break;
      case 'quote':
        html += `<blockquote>${richText(dados.rich_text)}</blockquote>`;
        break;
      case 'callout':
        html += `<blockquote>${dados.icon?.emoji ? dados.icon.emoji + ' ' : ''}${richText(dados.rich_text)}</blockquote>`;
        break;
      case 'image':
        html += imagemDoBloco(b);
        break;
      case 'video':
      case 'file':
        html += imagemDoBloco(b);
        break;
      case 'divider':
        html += '<hr>';
        break;
      case 'code':
        html += `<pre><code>${esc((dados.rich_text || []).map((t) => t.plain_text).join(''))}</code></pre>`;
        break;
      case 'bookmark':
      case 'link_preview':
        if (dados.url) {
          html += `<p><a href="${esc(dados.url)}" target="_blank" rel="noopener noreferrer">${esc(dados.url)}</a></p>`;
        }
        break;
      case 'embed':
        if (dados.url) {
          html += `<figure><iframe src="${esc(dados.url)}" loading="lazy" style="width:100%;aspect-ratio:16/9;border:0;border-radius:12px" allowfullscreen></iframe></figure>`;
        }
        break;
      case 'toggle': {
        const t = richText(dados.rich_text);
        if (t) html += `<p><strong>${t}</strong></p>`;
        break;
      }
      default:
        break;
    }
  }
  fecharLista();
  return html;
}

/* ------------------------------------------------------------------ */
/* consultas                                                           */
/* ------------------------------------------------------------------ */

export async function listarPaginas() {
  const corpo = {
    page_size: 100,
    sorts: [{ property: 'Data', direction: 'descending' }],
  };

  let resultados = [];
  try {
    let resposta = await notion(`/databases/${process.env.NOTION_DATABASE_ID}/query`, {
      method: 'POST',
      body: JSON.stringify(corpo),
    });
    resultados = resultados.concat(resposta.results);
    while (resposta.has_more) {
      resposta = await notion(`/databases/${process.env.NOTION_DATABASE_ID}/query`, {
        method: 'POST',
        body: JSON.stringify({ ...corpo, start_cursor: resposta.next_cursor }),
      });
      resultados = resultados.concat(resposta.results);
    }
  } catch (e) {
    // se a propriedade "Data" não existir, tenta sem ordenação
    let resposta = await notion(`/databases/${process.env.NOTION_DATABASE_ID}/query`, {
      method: 'POST',
      body: JSON.stringify({ page_size: 100 }),
    });
    resultados = resposta.results;
  }

  return resultados
    .map(mapearPagina)
    .filter((p) => p.publicado)
    .sort((a, b) => new Date(b.data) - new Date(a.data));
}

export async function blocosDaPagina(pageId) {
  let blocos = [];
  let cursor;
  do {
    const q = cursor ? `?page_size=100&start_cursor=${cursor}` : '?page_size=100';
    const r = await notion(`/blocks/${pageId}/children${q}`);
    blocos = blocos.concat(r.results || []);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return blocos;
}

export function tempoLeitura(html) {
  const palavras = String(html || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(palavras / 200));
}
