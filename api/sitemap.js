/**
 * GET /sitemap.xml  (reescrito em vercel.json)
 * Gera o mapa do site a partir das matérias publicadas (Notion).
 * Matéria nova entra sozinha na próxima visita do robô do Google.
 */
import { configurado, listarPaginas } from './_notion.js';

const SITE = 'https://www.ladoesquerdodecuritiba.com.br';

function esc(t) {
  return String(t == null ? '' : t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function url(loc, lastmod, prioridade, freq) {
  return [
    '  <url>',
    `    <loc>${esc(loc)}</loc>`,
    lastmod ? `    <lastmod>${esc(lastmod)}</lastmod>` : '',
    `    <changefreq>${freq}</changefreq>`,
    `    <priority>${prioridade}</priority>`,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

export default async function handler(req, res) {
  const hoje = new Date().toISOString().slice(0, 10);
  const partes = [
    url(`${SITE}/`, hoje, '1.0', 'daily'),
    url(`${SITE}/blog`, hoje, '0.9', 'daily'),
    url(`${SITE}/privacidade`, hoje, '0.3', 'yearly'),
  ];

  if (configurado()) {
    try {
      const posts = await listarPaginas();
      for (const p of posts) {
        const lastmod = p.data ? String(p.data).slice(0, 10) : hoje;
        partes.push(url(`${SITE}/artigo?slug=${encodeURIComponent(p.slug)}`, lastmod, '0.8', 'monthly'));
      }
    } catch (e) {
      // sitemap parcial é melhor que sitemap quebrado
      console.error('[sitemap] falha ao listar matérias:', e.message);
    }
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    partes.join('\n') +
    '\n</urlset>\n';

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  res.status(200).send(xml);
}
