/**
 * GET /api/posts
 * Lista as matérias publicadas (Notion).
 * Sem tokens configurados devolve 501 e o site usa o JSON de exemplo.
 */
import { configurado, listarComEstado } from './_notion.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (!configurado()) {
    res.status(501).json({
      erro: 'Notion não configurado',
      detalhe: 'Defina NOTION_TOKEN e NOTION_DATABASE_ID nas variáveis de ambiente.',
      posts: [],
    });
    return;
  }

  try {
    const { posts, falhas, ok } = await listarComEstado();
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.status(200).json({
      fonte: 'notion',
      atualizadoEm: new Date().toISOString(),
      total: posts.length,
      // fontes que responderam e fontes que falharam: o site completa as que
      // falharam com o retrato guardado em dados/cache-notion.json
      fontesOk: ok,
      fontesFalhas: falhas,
      posts: posts.map(({ id, ...resto }) => resto),
    });
  } catch (e) {
    res.status(500).json({ erro: 'Falha ao consultar o Notion', detalhe: String(e.message || e), posts: [] });
  }
}
