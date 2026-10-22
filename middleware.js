/**
 * Prévia de link (WhatsApp, Instagram, Facebook, Telegram, X)
 * ------------------------------------------------------------
 * O site é estático: a página do artigo só descobre qual matéria abrir
 * quando o JavaScript roda — e robôs de prévia não rodam JavaScript.
 * Este middleware resolve isso no servidor: em /artigo?slug=fulano ele
 * busca a matéria no Notion e devolve o HTML já com og:title,
 * og:description e og:image (a capa da matéria) preenchidos.
 *
 * Home e blog usam as metas fixas do próprio HTML (assets/img/og-padrao.jpg).
 * Qualquer outra rota passa direto, sem interferência.
 */

const SITE = 'https://ladoesquerdodecuritiba.vercel.app';
const OG_PADRAO = SITE + '/assets/img/og-padrao.jpg';

export const config = {
  matcher: ['/artigo', '/artigo.html'],
};

/* ---------------------------------------------------------------- utilidades */

function esc(t) {
  return String(t == null ? '' : t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* URLs vão sem escape de & para não quebrar o robô que baixa a imagem */
function escUrl(t) {
  return String(t == null ? '' : t).replace(/"/g, '%22').replace(/\s/g, '%20');
}

function cortar(t, max) {
  const s = String(t == null ? '' : t).replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1).replace(/[\s,;:.\-]+$/, '') + '…';
}

/** Deixa o pedido seguir para o arquivo estático. */
async function seguir() {
  try {
    const mod = await import('@vercel/functions');
    if (typeof mod.next === 'function') return mod.next();
  } catch (e) {
    /* pacote indisponível nesta instalação */
  }
  return new Response(null, { headers: { 'x-middleware-next': '1' } });
}

/** Bloco de <meta> da matéria (ou do site, quando não há dados). */
export function montarMeta(dados, urlFinal) {
  const titulo = dados && dados.titulo ? dados.titulo : null;
  const descricao = cortar(
    (dados && (dados.resumo || dados.linhaFina)) ||
      'Jornalismo crítico, entrevistas e cobertura de rua em Curitiba.',
    200
  );
  const imagem = escUrl((dados && dados.capa) || OG_PADRAO);
  const autor = (dados && dados.autor) || 'Redação Lado Esquerdo de Curitiba';
  const tituloCompleto = titulo ? `${titulo} — Lado Esquerdo de Curitiba` : 'Lado Esquerdo de Curitiba';

  const linhas = [
    `<title>${esc(tituloCompleto)}</title>`,
    `<meta name="description" content="${esc(descricao)}"/>`,
    `<link rel="canonical" href="${esc(urlFinal)}"/>`,
    `<meta property="og:type" content="article"/>`,
    `<meta property="og:site_name" content="Lado Esquerdo de Curitiba"/>`,
    `<meta property="og:locale" content="pt_BR"/>`,
    `<meta property="og:url" content="${esc(urlFinal)}"/>`,
    `<meta property="og:title" content="${esc(titulo || 'Lado Esquerdo de Curitiba')}"/>`,
    `<meta property="og:description" content="${esc(descricao)}"/>`,
    `<meta property="og:image" content="${imagem}"/>`,
    `<meta property="og:image:secure_url" content="${imagem}"/>`,
    `<meta property="article:author" content="${esc(autor)}"/>`,
  ];
  if (dados && dados.data) {
    linhas.push(`<meta property="article:published_time" content="${esc(dados.data)}"/>`);
  }
  linhas.push(
    '<meta name="twitter:card" content="summary_large_image"/>',
    `<meta name="twitter:title" content="${esc(titulo || 'Lado Esquerdo de Curitiba')}"/>`,
    `<meta name="twitter:description" content="${esc(descricao)}"/>`,
    `<meta name="twitter:image" content="${imagem}"/>`
  );
  return linhas.join('\n');
}

/** Troca as metas antigas do HTML pelo bloco novo. */
export function injetar(html, meta) {
  const ini = html.indexOf('<head>');
  const fim = html.indexOf('</head>');
  if (ini === -1 || fim === -1) return html;

  let head = html.slice(ini, fim);
  head = head.replace(/<title>[\s\S]*?<\/title>\s*/gi, '');
  head = head.replace(
    /<meta\s+(?:property|name)="(?:og:[^"]*|twitter:[^"]*|description)"[^>]*>\s*/gi,
    ''
  );
  head = head.replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '');

  if (head.includes('<meta name="theme-color"')) {
    head = head.replace('<meta name="theme-color"', meta + '\n<meta name="theme-color"');
  } else {
    head += '\n' + meta + '\n';
  }
  return html.slice(0, ini) + head + html.slice(fim);
}

/* ------------------------------------------------------------------ entrada */

export default async function middleware(req) {
  const url = new URL(req.url);
  const rota = (url.pathname || '/').replace(/\/+$/, '') || '/';

  // só age na página de matéria; todo o resto do site segue intocado
  if (rota !== '/artigo' && rota !== '/artigo.html') return seguir();

  // pedido interno do próprio middleware: entrega o arquivo como está
  if (url.searchParams.has('_raw') || req.headers.get('x-og-raw') === '1') return seguir();

  const origem = url.origin || SITE;
  const slug = url.searchParams.get('slug');
  const urlFinal = `${origem}/artigo${slug ? `?slug=${encodeURIComponent(slug)}` : ''}`;

  let html;
  try {
    const bruto = await fetch(`${origem}/artigo.html?_raw=1`, {
      headers: { 'x-og-raw': '1' },
      redirect: 'follow',
    });
    if (!bruto.ok) return seguir();
    html = await bruto.text();
    if (!html || html.indexOf('js/blog.js') === -1) return seguir();
  } catch (e) {
    return seguir();
  }

  let dados = null;
  if (slug) {
    try {
      const r = await fetch(`${origem}/api/post?slug=${encodeURIComponent(slug)}`);
      if (r.ok) {
        const j = await r.json();
        dados = j && j.post ? j.post : null;
      }
    } catch (e) {
      /* mantém as metas padrão */
    }
  }

  const corpo = injetar(html, montarMeta(dados, urlFinal));
  return new Response(corpo, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
