/**
 * GET /api/post?slug=meu-slug
 * Devolve uma matéria completa com o corpo já convertido em HTML
 * (parágrafos, títulos, listas, citações e imagens no meio do texto).
 */
import { configurado, fontes, listarPaginas, blocosDaPagina, blocosParaHtml, tempoLeitura } from './_notion.js';

export default async function handler(req, res) {
  const slug = String(req.query.slug || '').trim();

  if (!slug) { res.status(400).json({ erro: 'Informe ?slug=' }); return; }
  if (!configurado()) { res.status(501).json({ erro: 'Notion não configurado' }); return; }

  try {
    const posts = await listarPaginas();
    const alvo = posts.find((p) => p.slug === slug || p.id === slug);
    if (!alvo) { res.status(404).json({ erro: 'Matéria não encontrada' }); return; }

    // usa o token da mesma fonte de onde a matéria veio
    const fonte = fontes().find((f) => f.indice === alvo.fonte) || fontes()[0];
    const blocos = await blocosDaPagina(alvo.id, fonte ? fonte.token : undefined);
    const corpoHtml = blocosParaHtml(blocos);

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.status(200).json({
      fonte: 'notion',
      post: {
        slug: alvo.slug,
        titulo: alvo.titulo,
        resumo: alvo.resumo,
        categoria: alvo.categoria,
        capa: alvo.capa,
        capaCredito: alvo.capaCredito,
        data: alvo.data,
        autor: alvo.autor,
        autorPadrao: alvo.autorPadrao,
        status: alvo.status,
        corpo: corpoHtml,
        minutos: tempoLeitura(corpoHtml),
      },
    });
  } catch (e) {
    res.status(500).json({ erro: 'Falha ao carregar a matéria', detalhe: String(e.message || e) });
  }
}
