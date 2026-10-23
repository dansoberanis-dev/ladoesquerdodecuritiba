/**
 * GET /robots.txt  (reescrito em vercel.json)
 * Libera a indexação das páginas públicas e aponta o sitemap.
 */
const SITE = 'https://www.ladoesquerdodecuritiba.com.br';

export default function handler(req, res) {
  const corpo = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /obrigado',
    '',
    `Sitemap: ${SITE}/sitemap.xml`,
    '',
  ].join('\n');

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(corpo);
}
