/**
 * Sincronizador do acervo — Notion → git
 * --------------------------------------
 * Lê o que está publicado no Notion e espelha TUDO dentro do repositório:
 *
 *   conteudo/posts.json                 texto completo de cada matéria
 *   conteudo/img/<slug>/capa.jpg        imagem de capa
 *   conteudo/img/<slug>/corpo-1.jpg     imagens do corpo do texto
 *
 * A partir daí o site não depende do Notion para exibir nada: as imagens
 * ficam no próprio site (como um site em WordPress) e nunca expiram.
 *
 * Regras de segurança:
 *   - Se todas as fontes do Notion falharem, NADA é alterado.
 *   - Se alguma fonte falhou, o acervo só CRESCE (nada é despublicado).
 *   - Só despublica (publicado:false) quando todas as fontes responderam e a
 *     matéria sumiu da lista de publicadas. Mesmo assim o texto e as imagens
 *     continuam guardados no git, como arquivo histórico.
 *
 * Uso: node scripts/sincronizar.mjs [url-do-site]
 *      node scripts/sincronizar.mjs [url] --forcar     (ignora checagens de falha)
 */

import { mkdirSync, writeFileSync, existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ARGS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const FORCAR = process.argv.includes('--forcar');
const SITE = (ARGS[0] || process.env.SITE_URL || 'https://ladoesquerdodecuritiba.vercel.app').replace(/\/+$/, '');

const ARQUIVO = 'conteudo/posts.json';
const PASTA_IMG = 'conteudo/img';

const agora = () => new Date().toISOString();

function lerAcervo() {
  if (!existsSync(ARQUIVO)) return { posts: [] };
  try {
    const j = JSON.parse(readFileSync(ARQUIVO, 'utf8'));
    return { posts: Array.isArray(j.posts) ? j.posts : [] };
  } catch (e) {
    console.error('Acervo atual ilegível, será refeito:', e.message);
    return { posts: [] };
  }
}

async function pegarJson(url) {
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

function extensaoDe(url, tipo) {
  const t = (tipo || '').toLowerCase();
  if (t.includes('png')) return 'png';
  if (t.includes('webp')) return 'webp';
  if (t.includes('gif')) return 'gif';
  if (t.includes('avif')) return 'avif';
  if (t.includes('jpeg') || t.includes('jpg')) return 'jpg';
  const m = /\.(png|webp|gif|avif|jpe?g)(\?|$)/i.exec(url);
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
}

/** Baixa uma imagem para o repositório e devolve o caminho local. */
async function baixarImagem(url, slug, nomeBase, reaproveitar) {
  if (!url || !/^https?:/i.test(url)) return url || '';

  // já está no acervo: reaproveita o arquivo existente
  if (reaproveitar) {
    for (const ext of ['jpg', 'png', 'webp', 'gif', 'avif']) {
      const caminho = `${PASTA_IMG}/${slug}/${nomeBase}.${ext}`;
      if (existsSync(caminho)) return caminho;
    }
  }

  try {
    const r = await fetch(url, { headers: { 'user-agent': 'LadoEsquerdoAcervo/1.0' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length) throw new Error('arquivo vazio');
    const ext = extensaoDe(url, r.headers.get('content-type'));
    const caminho = `${PASTA_IMG}/${slug}/${nomeBase}.${ext}`;
    mkdirSync(dirname(caminho), { recursive: true });
    writeFileSync(caminho, buf);
    return caminho;
  } catch (e) {
    console.error(`  ! imagem não baixada (${nomeBase}): ${e.message}`);
    return ''; // sem imagem local: mantém o endereço original do Notion
  }
}

/** Troca as imagens do corpo por cópias locais. */
async function localizarImagensDoCorpo(corpo, slug, anteriores) {
  if (!corpo || corpo.indexOf('<img') === -1) return { corpo, imagens: [] };

  const urls = [];
  corpo.replace(/<img[^>]+src="([^"]+)"/gi, (_, src) => {
    const limpa = src.replace(/&amp;/g, '&');
    if (/^https?:/i.test(limpa)) urls.push(limpa);
    return _;
  });

  const imagens = [];
  let saida = corpo;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const nomeBase = `corpo-${i + 1}`;
    const local = await baixarImagem(url, slug, nomeBase, anteriores.includes(url) || anteriores.some((u) => u && u.includes(`/${slug}/${nomeBase}.`)));
    if (!local) continue;
    imagens.push(url);
    const escapada = url.replace(/&/g, '&amp;');
    saida = saida.split(escapada).join(local).split(url).join(local);
  }

  return { corpo: saida, imagens };
}

async function principal() {
  console.log(`Acervo: ${SITE}`);

  // 1) o que o Notion diz que está publicado
  let lista;
  try {
    lista = await pegarJson(`${SITE}/api/posts`);
  } catch (e) {
    console.error(`Não foi possível ler a lista (${e.message}). Acervo intacto.`);
    return;
  }

  const doNotion = Array.isArray(lista.posts) ? lista.posts : [];
  const falhas = Array.isArray(lista.fontesFalhas) ? lista.fontesFalhas : [];
  const tudoFalhou = falhas.length > 0 && (lista.fontesOk || []).length === 0;

  if (!doNotion.length && (tudoFalhou || falhas.length)) {
    console.error('Fontes do Notion fora do ar. Acervo intacto.');
    return;
  }
  if (falhas.length && !FORCAR) {
    console.log(`Atenção: ${falhas.length} fonte(s) fora do ar — o acervo só vai crescer, nada será despublicado.`);
  }

  // 2) acervo atual
  const antigo = lerAcervo();
  const manuais = antigo.posts.filter((p) => p.origem === 'manual');
  const porSlug = new Map(
    antigo.posts.filter((p) => p.origem !== 'manual').map((p) => [p.slug, p])
  );

  // 3) espelha cada matéria publicada
  let baixadas = 0;
  let atualizadas = 0;

  for (const post of doNotion) {
    const slug = post.slug;
    if (!slug) continue;

    const anterior = porSlug.get(slug) || {};

    // corpo completo (com as imagens da matéria).
    // Começa com o que já está no acervo: resposta errada nunca apaga texto.
    let corpo = anterior.corpo || '';
    try {
      const detalhe = await pegarJson(`${SITE}/api/post?slug=${encodeURIComponent(slug)}`);
      if (detalhe && detalhe.post && detalhe.post.slug === slug && detalhe.post.corpo) {
        corpo = detalhe.post.corpo;
      } else if (!corpo) {
        console.error(`  ! corpo de ${slug} veio vazio ou trocado`);
      }
    } catch (e) {
      console.error(`  ! corpo de ${slug} não obtido (${e.message}) — mantido o do acervo`);
    }

    // capa
    let capa = anterior.capa && anterior.capa.startsWith('conteudo/') ? anterior.capa : '';
    if (post.capa) {
      const local = await baixarImagem(post.capa, slug, 'capa', capa.startsWith('conteudo/'));
      if (local.startsWith('conteudo/')) {
        if (local !== capa) baixadas++;
        capa = local;
      } else if (!capa) {
        capa = post.capa; // não deu para baixar: usa o endereço do Notion
      }
    }

    // imagens do corpo
    const anteriores = Array.isArray(anterior.imagens) ? anterior.imagens : [];
    const resultado = await localizarImagensDoCorpo(corpo, slug, anteriores);
    if (resultado.corpo && resultado.corpo !== corpo) {
      corpo = resultado.corpo;
      baixadas += resultado.imagens.length;
    }

    const novo = {
      slug,
      titulo: post.titulo || anterior.titulo || slug,
      resumo: post.resumo || anterior.resumo || '',
      categoria: post.categoria || anterior.categoria || '',
      capa,
      capaCredito: post.capaCredito || anterior.capaCredito || '',
      data: post.data || anterior.data || '',
      autor: post.autor || '',
      autorPadrao: post.autorPadrao !== false,
      destaque: !!post.destaque,
      status: 'publicado',
      publicado: true,
      fonte: post.fonte || anterior.fonte || 1,
      corpo,
      imagens: resultado.imagens.length ? resultado.imagens : anteriores,
      publicadoEm: anterior.publicadoEm || post.data || agora(),
      espelhadoEm: agora(),
    };

    const mudou = JSON.stringify({ ...anterior, espelhadoEm: null }) !== JSON.stringify({ ...novo, espelhadoEm: null });
    if (mudou) atualizadas++;
    porSlug.set(slug, novo);
  }

  // 4) despublicar quem saiu do Notion (só com todas as fontes respondendo)
  let despublicadas = 0;
  const slugsDoNotion = new Set(doNotion.map((p) => p.slug));

  if (!falhas.length || FORCAR) {
    for (const [slug, item] of porSlug) {
      if (slugsDoNotion.has(slug)) continue;
      if (item.origem === 'manual') continue;   // publicadas à mão: nunca mexer
      if (item.publicado === false) continue;
      porSlug.set(slug, {
        ...item,
        publicado: false,
        status: 'despublicado',
        despublicadoEm: agora(),
      });
      despublicadas++;
    }
  }

  // 5) grava
  const posts = [...porSlug.values(), ...manuais]
    .sort((a, b) => new Date(b.data) - new Date(a.data));

  const saida = {
    _aviso:
      'Acervo do blog, gerado automaticamente por scripts/sincronizar.mjs. ' +
      'O Notion decide o que está no ar (publicado: true/false); este arquivo guarda o conteúdo e as imagens. ' +
      'Itens com "origem": "manual" são publicados à mão e nunca são alterados pela sincronização.',
    atualizadoEm: agora(),
    site: SITE,
    total: posts.filter((p) => p.publicado !== false).length,
    arquivadas: posts.filter((p) => p.publicado === false).length,
    posts,
  };

  const texto = JSON.stringify(saida, null, 2) + '\n';
  const anteriorTexto = existsSync(ARQUIVO) ? readFileSync(ARQUIVO, 'utf8') : '';

  if (anteriorTexto === texto) {
    console.log('Acervo já estava atualizado.');
    return;
  }

  mkdirSync(dirname(ARQUIVO), { recursive: true });
  writeFileSync(ARQUIVO, texto, 'utf8');

  const tamanho = (statSync(ARQUIVO).size / 1024).toFixed(0);
  console.log(
    `Acervo atualizado: ${saida.total} no ar, ${saida.arquivadas} arquivadas, ` +
      `${atualizadas} alterada(s), ${baixadas} imagem(ns) localizada(s), ${despublicadas} despublicada(s). ` +
      `posts.json ${tamanho} KB.`
  );
}

principal().catch((e) => {
  console.error('Falha na sincronização:', e);
  process.exitCode = 0; // nunca derruba o fluxo por causa do acervo
});
