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

/* Cores do Notion. O Notion usa nomes fixos (red, blue_background, ...);
   aqui cada um vira uma classe CSS do site (ver css/blog.css). */
const CORES = new Set([
  'gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red',
  'gray_background', 'brown_background', 'orange_background', 'yellow_background',
  'green_background', 'blue_background', 'purple_background', 'pink_background',
  'red_background',
]);

function classeCor(cor) {
  if (!cor || cor === 'default' || !CORES.has(cor)) return '';
  return cor.endsWith('_background') ? `lec-bg-${cor.replace('_background', '')}` : `lec-txt-${cor}`;
}

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
    const cor = classeCor(a.color);
    if (cor) txt = `<span class="${cor}">${txt}</span>`;
    if (t.href) txt = `<a href="${esc(t.href)}" target="_blank" rel="noopener noreferrer">${txt}</a>`;
    return txt;
  }).join('');
}

/* cor escolhida no bloco inteiro (parágrafo, título, citação) */
function comCor(html, cor) {
  const c = classeCor(cor);
  if (!c || !String(html || '').trim()) return html;
  return `<span class="${c}">${html}</span>`;
}

/* ---------- tabelas ---------- */
function linhasDaTabela(b) {
  const filhos = Array.isArray(b.children) ? b.children : [];
  return filhos.filter((f) => f && f.type === 'table_row');
}

function tabelaParaHtml(b) {
  const dados = b.table || {};
  const linhas = linhasDaTabela(b);
  if (!linhas.length) return '';
  const cabecalho = !!dados.has_column_header;
  const primeiraColunaCabecalho = !!dados.has_row_header;

  const celula = (conteudo, tag) => `<${tag}>${conteudo || ''}</${tag}>`;
  const corpo = linhas.map((linha, i) => {
    const celulas = (linha.table_row && linha.table_row.cells) || [];
    const tag = cabecalho && i === 0 ? 'th' : 'td';
    const tds = celulas.map((c, j) => {
      const tagFinal = tag === 'th' || (primeiraColunaCabecalho && j === 0) ? 'th' : 'td';
      return celula(richText(c), tagFinal);
    }).join('');
    return `<tr>${tds}</tr>`;
  });

  const thead = cabecalho ? `<thead>${corpo[0]}</thead>` : '';
  const tbody = `<tbody>${(cabecalho ? corpo.slice(1) : corpo).join('')}</tbody>`;
  return `<div class="lec-tabela"><table>${thead}${tbody}</table></div>`;
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
/**
 * Cartões de número (o "quadro de estatísticas" que o dono usa nas matérias).
 *
 * No Notion o desenho é: 3 colunas, cada uma com uma CAIXA (/callout) contendo
 * o número em negrito e, na linha de baixo (Shift+Enter), a legenda.
 * A API entrega isso como column_list > column > callout, e aqui vira uma
 * grade de cartões com a barra laranja em cima, como no documento original.
 */
function linhasDoTexto(rich) {
  const linhas = [];
  (rich || []).forEach((t) => {
    String(t.plain_text || '').split('\n').forEach((l) => {
      const limpo = l.trim();
      if (limpo) linhas.push(limpo);
    });
  });
  return linhas;
}

function cartaoDaColuna(coluna) {
  const filhos = (coluna && coluna.children) || [];
  const caixa = filhos.find((f) => f.type === 'callout');
  if (!caixa) return null;
  const dados = caixa.callout || {};
  const linhas = linhasDoTexto(dados.rich_text);
  // parágrafos soltos dentro da caixa ou na mesma coluna também entram
  const extras = (caixa.children || []).concat(filhos.filter((f) => f !== caixa));
  extras.forEach((f) => {
    if (f.type !== 'paragraph') return;
    linhasDoTexto((f.paragraph || {}).rich_text).forEach((l) => linhas.push(l));
  });
  if (!linhas.length) return null;
  return { numero: linhas[0], legenda: linhas.slice(1).join(' ') };
}

/** devolve a lista de cartões só quando TODAS as colunas estão em formato de caixa */
function cartoesDaLista(lista) {
  const colunas = ((lista && lista.children) || [])
    .filter((c) => c.type === 'column' && (c.children || []).length > 0);
  if (colunas.length < 2) return null;
  const cartoes = [];
  for (const coluna of colunas) {
    const cartao = cartaoDaColuna(coluna);
    if (!cartao) return null;
    cartoes.push(cartao);
  }
  return cartoes;
}

function cartoesParaHtml(cartoes) {
  const itens = cartoes
    .map(
      (c) =>
        '<div class="lec-card">' +
        `<p class="lec-card-numero">${esc(c.numero)}</p>` +
        (c.legenda ? `<p class="lec-card-legenda">${esc(c.legenda)}</p>` : '') +
        '</div>'
    )
    .join('');
  return `<div class="lec-cards">${itens}</div>`;
}

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
        if (t.trim()) html += `<p>${comCor(t, dados.color)}</p>`;
        break;
      }
      case 'heading_1':
        html += `<h2>${comCor(richText(dados.rich_text), dados.color)}</h2>`;
        break;
      case 'heading_2':
        html += `<h2>${comCor(richText(dados.rich_text), dados.color)}</h2>`;
        break;
      case 'heading_3':
        html += `<h3>${comCor(richText(dados.rich_text), dados.color)}</h3>`;
        break;
      case 'table':
        html += tabelaParaHtml(b);
        break;
      case 'table_row': {
        // só aparece aqui se vier solta (sem o bloco "table" acima)
        const celulas = (dados.cells || []).map((c) => `<td>${richText(c)}</td>`).join('');
        if (celulas) html += `<div class="lec-tabela"><table><tbody><tr>${celulas}</tr></tbody></table></div>`;
        break;
      }
      case 'to_do': {
        const t = richText(dados.rich_text);
        if (t.trim()) html += `<p class="lec-tarefa">${dados.checked ? '☑' : '☐'} ${t}</p>`;
        break;
      }
      case 'column_list': {
        // 3 colunas com uma caixa em cada viram cartões de número
        const cartoes = cartoesDaLista(b);
        if (cartoes) {
          html += cartoesParaHtml(cartoes);
          break;
        }
        // colunas comuns: junta o conteúdo na ordem em que aparece
        html += blocosParaHtml(b.children || []);
        break;
      }
      case 'column':
      case 'synced_block':
        html += blocosParaHtml(b.children || []);
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
        html += `<blockquote>${comCor(richText(dados.rich_text), dados.color)}</blockquote>`;
        break;
      case 'callout': {
        const texto = richText(dados.rich_text);
        const dentro = blocosParaHtml(b.children || []);
        if (!texto.trim() && !dentro) break;
        const icone = dados.icon?.emoji ? `<span class="lec-caixa-icone">${esc(dados.icon.emoji)}</span>` : '';
        html +=
          `<div class="lec-caixa">${icone}<div class="lec-caixa-texto">` +
          (texto.trim() ? `<p>${comCor(texto, dados.color)}</p>` : '') +
          dentro +
          '</div></div>';
        break;
      }
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
        // tipo desconhecido (bloco novo do Notion): não perde o conteúdo,
        // desenha os filhos e, se houver texto solto, mostra como parágrafo
        if (dados.rich_text && dados.rich_text.length) {
          const t = richText(dados.rich_text);
          if (t.trim()) html += `<p>${comCor(t, dados.color)}</p>`;
        }
        if (b.children && b.children.length) html += blocosParaHtml(b.children);
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

/** blocos filhos que a API não devolve junto (tabelas, colunas, blocos sincronizados) */
const COM_FILHOS = new Set(['table', 'column_list', 'column', 'synced_block']);

async function filhosDoBloco(id, token) {
  let blocos = [];
  let cursor;
  do {
    const q = cursor ? `?page_size=100&start_cursor=${cursor}` : '?page_size=100';
    const r = await notion(`/blocks/${id}/children${q}`, { token });
    blocos = blocos.concat(r.results || []);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return blocos;
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

  // busca os filhos de tabelas e colunas (até 3 níveis: coluna_list > column > conteúdo)
  async function completar(lista, nivel) {
    if (!lista || !lista.length || nivel > 3) return;
    for (const b of lista) {
      if (!b || !COM_FILHOS.has(b.type) || !b.has_children) continue;
      try {
        b.children = await filhosDoBloco(b.id, token);
        await completar(b.children, nivel + 1);
      } catch (e) {
        b.children = [];
      }
    }
  }
  await completar(blocos, 1);
  return blocos;
}

export function tempoLeitura(html) {
  const palavras = String(html || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(palavras / 200));
}
