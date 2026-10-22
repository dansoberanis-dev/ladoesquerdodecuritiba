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

/**
 * Fontes configuradas. Aceita de 1 a 5 pares token+banco:
 *   NOTION_TOKEN / NOTION_DATABASE_ID
 *   NOTION_TOKEN_2 / NOTION_DATABASE_ID_2   (opcional)
 *   ... até _5
 * Assim é possível somar bancos do mesmo workspace ou de workspaces diferentes
 * (cada workspace exige a SUA própria integração e o seu próprio token).
 */
export function fontes() {
  const lista = [];
  const sufixos = ['', '_2', '_3', '_4', '_5'];
  for (const s of sufixos) {
    const token = process.env[`NOTION_TOKEN${s}`];
    const db = process.env[`NOTION_DATABASE_ID${s}`];
    if (token && db) lista.push({ token, db, indice: s ? Number(s.slice(1)) : 1 });
  }
  return lista;
}

export function configurado() {
  return fontes().length > 0;
}

/**
 * Lista de criadores autorizados a publicar.
 * NOTION_CRIADORES_PERMITIDOS = "nome ou id, nome ou id"
 * Vazio/ausente = sem restrição (todos que têm acesso ao banco publicam).
 * A comparação é por ID de usuário do Notion e por nome (sem acento/maiúsculas).
 */
export function criadoresPermitidos() {
  const bruto = process.env.NOTION_CRIADORES_PERMITIDOS || '';
  return bruto
    .split(',')
    .map((v) => normalizar(v))
    .filter(Boolean);
}

function normalizar(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/** um post é permitido se não houver lista, ou se o criador estiver nela */
export function criadorPermitido(post, lista) {
  if (!lista || !lista.length) return true;
  const chaves = [normalizar(post.criadoPorId), normalizar(post.criadoPorNome)].filter(Boolean);
  if (!chaves.length) return false;       // sem informação de criador: não publica
  return chaves.some((c) => lista.includes(c));
}

async function notion(caminho, opcoes = {}) {
  const token = opcoes.token || process.env.NOTION_TOKEN;
  const r = await fetch(`${API}${caminho}`, {
    ...opcoes,
    headers: {
      Authorization: `Bearer ${token}`,
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
    : p.type === 'multi_select' ? (p.multi_select || []).slice(0, 1).map((o) => ({ plain_text: o.name }))
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

function slugDe(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
    .replace(/-+$/g, '');
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
  const autorManual = textoSimples(prop(p, 'Autor', 'Autor(a)', 'Autoria', 'Author', 'Jornalista', 'Assinatura', 'Repórter'));
  // "Criado por" / "Pessoa" preenchem o autor se o campo Autor estiver vazio
  const usarAutorAutomatico = ['1', 'true', 'sim', 'yes'].includes(
    String(process.env.NOTION_AUTOR_AUTOMATICO || '').toLowerCase()
  );
  const autorAutomatico = usarAutorAutomatico
    ? textoSimples(prop(p, 'Criado por', 'Criado Por', 'Pessoa', 'Autor do Notion', 'Created by'))
    : '';
  const autor = autorManual || autorAutomatico || '';
  const publicadoEm = dataDe(prop(p, 'Data', 'Data de publicação', 'Publicado em', 'Data publicação', 'Date'), page.created_time);
  const destaque = prop(p, 'Destaque', 'Featured', 'Manchete');

  // ---- publicação: Status (select/status) tem prioridade sobre o checkbox ----
  const statusProp = prop(p, 'Status', 'Situação', 'Situacao', 'Estado', 'Fase', 'Etapa');
  const statusTexto = textoSimples(statusProp).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  const checkboxPub = prop(p, 'Publicado', 'Publish', 'Publicar', 'Ativo');

  let publicado;
  let status = '';
  if (statusProp) {
    status = statusTexto;
    publicado = ['publicado', 'publicada', 'published', 'no ar', 'live'].includes(statusTexto);
  } else if (checkboxPub) {
    publicado = checkboxPub.type === 'checkbox' ? Boolean(checkboxPub.checkbox) : true;
    status = publicado ? 'publicado' : 'rascunho';
  } else {
    publicado = true;             // banco sem nenhum controle: publica (comportamento antigo)
    status = 'publicado';
  }

  return {
    id: page.id,
    slug: slugBase || slugDe(titulo) || page.id.replace(/-/g, '').slice(0, 12),
    titulo,
    resumo: textoSimples(prop(p, 'Resumo', 'Descrição', 'Descricao', 'Linha fina', 'Subtítulo', 'Summary')),
    categoria: textoSimples(prop(p, 'Categoria', 'Editoria', 'Seção', 'Secao', 'Category')) || 'Matéria',
    capa,
    capaCredito: textoSimples(prop(p, 'Crédito da foto', 'Credito da foto', 'Foto', 'Crédito', 'Credito')),
    data: publicadoEm,
    autor: autor || '',
    autorPadrao: !autorManual,
    autorOrigem: autorManual ? 'campo' : (autorAutomatico ? 'notion' : 'padrao'),
    destaque: destaque ? Boolean(destaque.checkbox) : false,
    status,
    publicado,
    fonte: page._fonte || 1,
    criadoPorId: page.created_by?.id || '',
    criadoPorNome: textoSimples(prop(p, 'Criado por', 'Pessoa', 'Autor do Notion', 'Created by')) || page._criadoPorNome || '',
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
      case 'bulleted_list_item': {
        const item = richText(dados.rich_text);
        if (!item.trim()) break;
        if (lista !== 'ul') { fecharLista(); html += '<ul>'; lista = 'ul'; }
        html += `<li>${item}</li>`;
        break;
      }
        break;
      case 'numbered_list_item': {
        const item = richText(dados.rich_text);
        if (!item.trim()) break;
        if (lista !== 'ol') { fecharLista(); html += '<ol>'; lista = 'ol'; }
        html += `<li>${item}</li>`;
        break;
      }
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

const _cacheUsuarios = new Map();

async function nomeUsuario(id, token) {
  if (!id) return '';
  if (_cacheUsuarios.has(id)) return _cacheUsuarios.get(id);
  try {
    const u = await notion(`/users/${id}`, { method: 'GET', token });
    const nome = u?.name || u?.person?.email || '';
    _cacheUsuarios.set(id, nome);
    return nome;
  } catch {
    _cacheUsuarios.set(id, '');
    return '';
  }
}

async function consultarBanco(fonte) {
  const corpo = { page_size: 100, sorts: [{ property: 'Data', direction: 'descending' }] };
  const opcoes = { method: 'POST', body: JSON.stringify(corpo), token: fonte.token };
  let resultados = [];

  try {
    let resposta = await notion(`/databases/${fonte.db}/query`, opcoes);
    resultados = resultados.concat(resposta.results || []);
    while (resposta.has_more) {
      resposta = await notion(`/databases/${fonte.db}/query`, {
        ...opcoes,
        body: JSON.stringify({ ...corpo, start_cursor: resposta.next_cursor }),
      });
      resultados = resultados.concat(resposta.results || []);
    }
  } catch (e) {
    // banco sem a propriedade "Data": consulta sem ordenação
    const resposta = await notion(`/databases/${fonte.db}/query`, {
      method: 'POST', body: JSON.stringify({ page_size: 100 }), token: fonte.token,
    });
    resultados = resposta.results || [];
  }

  const posts = resultados.map((pagina) => {
    pagina._fonte = fonte.indice;
    return { pagina, post: mapearPagina(pagina) };
  });

  // resolve o nome de quem criou (para assinatura automática e para a lista de autorizados)
  await Promise.all(
    posts.map(async ({ pagina, post }) => {
      if (!pagina.created_by?.id) return;
      const nome = await nomeUsuario(pagina.created_by.id, fonte.token);
      if (!nome) return;
      if (!post.criadoPorNome) { post.criadoPorNome = nome; pagina._criadoPorNome = nome; }
      const autorAuto = ['1', 'true', 'sim', 'yes'].includes(String(process.env.NOTION_AUTOR_AUTOMATICO || '').toLowerCase());
      if (autorAuto && !post.autor) { post.autor = nome; post.autorOrigem = 'notion'; post.autorPadrao = false; }
    })
  );

  return posts.map(({ post }) => post);
}

export async function listarComEstado() {
  const lista = fontes();
  if (!lista.length) return { posts: [], falhas: [], ok: [] };

  const falhas = [];

  const resultadosPorFonte = await Promise.all(
    lista.map((fonte) =>
      consultarBanco(fonte).catch((e) => {
        console.error(`[notion] fonte ${fonte.indice} falhou: ${e.message}`);
        falhas.push({ fonte: fonte.indice, erro: String(e.message || e).slice(0, 160) });
        return [];
      })
    )
  );

  const todos = resultadosPorFonte.flat();

  // remove duplicados (mesmo slug em bancos diferentes: vence o mais recente)
  const porSlug = new Map();
  for (const post of todos) {
    const anterior = porSlug.get(post.slug);
    if (!anterior || new Date(post.data) > new Date(anterior.data)) porSlug.set(post.slug, post);
  }

  const permitidos = criadoresPermitidos();

  const posts = [...porSlug.values()]
    .filter((p) => p.publicado)
    .filter((p) => criadorPermitido(p, permitidos))
    .sort((a, b) => new Date(b.data) - new Date(a.data));

  const ok = lista.map((f) => f.indice).filter((i) => !falhas.some((f) => f.fonte === i));
  return { posts, falhas, ok };
}

/** Compatibilidade: só a lista. */
export async function listarPaginas() {
  const { posts } = await listarComEstado();
  return posts;
}

export async function blocosDaPagina(pageId, token) {
  let blocos = [];
  let cursor;
  do {
    const q = cursor ? `?page_size=100&start_cursor=${cursor}` : '?page_size=100';
    const r = await notion(`/blocks/${pageId}/children${q}`, { token });
    blocos = blocos.concat(r.results || []);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return blocos;
}

export function tempoLeitura(html) {
  const palavras = String(html || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(palavras / 200));
}
