/**
 * GET /api/instagram
 * ---------------------------------------------------------------------
 * Devolve seguidores / publicações / seguindo do perfil do Instagram.
 *
 * Variáveis de ambiente (Vercel → Settings → Environment Variables):
 *   INSTAGRAM_TOKEN    = token de longa duração do Instagram Graph API
 *   INSTAGRAM_USER_ID  = ID da conta profissional (não é o @)
 *
 * Opcional:
 *   INSTAGRAM_CACHE    = segundos de cache na CDN (padrão 3600)
 *
 * Requisitos: conta do Instagram Business ou Creator vinculada a uma
 * Página do Facebook + app no Meta for Developers com a permissão
 * instagram_basic (e instagram_manage_insights para alcance).
 *
 * Sem as variáveis: devolve { ok:false } e o site mantém os números
 * escritos no HTML (fallback silencioso).
 */

const VERSAO = process.env.INSTAGRAM_API_VERSAO || 'v21.0';
const CACHE = Number(process.env.INSTAGRAM_CACHE || 3600);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const token = process.env.INSTAGRAM_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;

  if (!token || !userId) {
    res.status(200).json({
      ok: false,
      motivo: 'não configurado',
      detalhe: 'Defina INSTAGRAM_TOKEN e INSTAGRAM_USER_ID nas variáveis de ambiente.',
    });
    return;
  }

  try {
    const url =
      `https://graph.facebook.com/${VERSAO}/${encodeURIComponent(userId)}` +
      `?fields=followers_count,media_count,follows_count,username&access_token=${encodeURIComponent(token)}`;

    const r = await fetch(url);
    const j = await r.json();

    if (j.error) {
      res.status(200).json({
        ok: false,
        motivo: 'erro do Instagram',
        detalhe: j.error.message,
        codigo: j.error.code,
      });
      return;
    }

    res.setHeader('Cache-Control', `public, s-maxage=${CACHE}, stale-while-revalidate=86400`);
    res.status(200).json({
      ok: true,
      fonte: 'instagram',
      usuario: j.username || null,
      seguidores: j.followers_count ?? null,
      publicacoes: j.media_count ?? null,
      seguindo: j.follows_count ?? null,
      atualizadoEm: new Date().toISOString(),
    });
  } catch (e) {
    res.status(200).json({ ok: false, motivo: 'falha na consulta', detalhe: String(e.message || e) });
  }
}
