/* =====================================================================
   Lado Esquerdo de Curitiba — motor do blog
   ---------------------------------------------------------------------
   Fonte de dados (nesta ordem):
     1. /api/posts          -> Notion (quando publicado na Vercel e configurado)
     2. assets/blog/posts.json -> dados de exemplo, funciona offline
   ===================================================================== */
(function () {
  'use strict';

  var AUTOR_PADRAO = 'Redação Lado Esquerdo de Curitiba';

  var CONFIG = {
    apiPosts: '/api/posts',
    apiPost: '/api/post',
    fallback: 'assets/blog/posts.json',
    fallbackJs: 'assets/blog/posts.js',
    acervo: 'conteudo/posts.json',
    destaqueNaHome: 3,
    topoDaListagem: 1
  };

  /* ---------------- utilidades ---------------- */

  function esc(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function autorDe(p) {
    var a = (p && p.autor ? String(p.autor) : '').trim();
    return a.length ? a : AUTOR_PADRAO;
  }

  function ehPadrao(p) {
    return autorDe(p) === AUTOR_PADRAO ||
      (p.autorAssinado === false) ||
      (p.autor && String(p.autor).trim() === '');
  }

  function dataValida(iso) {
    var d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }

  function dataCurta(iso) {
    var d = dataValida(iso);
    if (!d) return '';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  }

  function dataLonga(iso) {
    var d = dataValida(iso);
    if (!d) return '';
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function minutos(corpo, resumo) {
    if (!corpo) return null;
    var html = String(corpo);
    // estimativa pelo texto dos parágrafos (ignora figuras/legendas, que não são leitura corrida)
    var blocos = html.split(/<\/p>/i).concat(String(resumo || '').split(/<\/p>/i));
    var texto = blocos.join(' ').replace(/<[^>]+>/g, ' ');
    var palavras = texto.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(palavras / 200));
  }

  function linkPost(p) {
    return '/artigo?slug=' + encodeURIComponent(p.slug);
  }

  function nomeMes(n) {
    return ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][n];
  }

  function normalizar(txt) {
    return String(txt || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /* ---------------- carga de dados ---------------- */

  var _cache = null;

  function porData(a, b) { return new Date(b.data) - new Date(a.data); }

  /* acervo guardado no git (conteudo/posts.json) — texto e imagens locais.
     É o que mantém o blog no ar quando o Notion não responde. */
  function carregarAcervo() {
    if (location.protocol === 'file:') return Promise.resolve([]);
    return fetch(CONFIG.acervo + '?t=' + Date.now(), { headers: { accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('acervo ' + r.status); return r.json(); })
      .then(function (j) {
        return ((j && j.posts) || []).filter(function (p) { return p && p.slug && p.publicado !== false; });
      })
      ['catch'](function () { return []; });
  }

  /* combina o que veio do Notion com o acervo:
     - Notion completo (todas as fontes OK): ele manda; o acervo só empresta
       texto e imagens locais das matérias que ele mesmo listou.
     - alguma fonte fora: soma o acervo (nada desaparece do site).
     - Notion inteiro fora: mostra o acervo inteiro. */
  function combinar(daApi, acervo, apiOk, temFonteFora) {
    var porSlugAcervo = {};
    (acervo || []).forEach(function (p) { porSlugAcervo[p.slug] = p; });

    if (!apiOk) {
      return (acervo || []).map(function (p) {
        var copia = JSON.parse(JSON.stringify(p));
        copia.doAcervo = true;
        return copia;
      });
    }

    var lista = (daApi || []).map(function (p) {
      var local = porSlugAcervo[p.slug];
      if (!local) return p;
      var junto = Object.assign({}, p);
      if (local.corpo) junto.corpo = local.corpo;
      if (local.capa && String(local.capa).indexOf('conteudo/') === 0) junto.capa = local.capa;
      if (local.capaCredito) junto.capaCredito = local.capaCredito;
      junto.doAcervo = true;
      return junto;
    });

    if (!temFonteFora) return lista; // Notion íntegro: ele é a autoridade

    var vistos = {};
    lista.forEach(function (p) { vistos[p.slug] = true; });
    (acervo || []).forEach(function (p) {
      if (vistos[p.slug]) return;
      vistos[p.slug] = true;
      var copia = JSON.parse(JSON.stringify(p));
      copia.doAcervo = true;
      lista.push(copia);
    });
    return lista;
  }

  function carregar() {
    if (_cache) return Promise.resolve(_cache);

    // 1) Notion (produção). Distingue três casos:
    //    501 -> API existe mas não configurada  => usa exemplo (mostra aviso de prévia)
    //    200 -> usa o Notion (mesmo que venha sem matérias publicadas)
    //    erro -> NÃO usa exemplo: mostra "não foi possível carregar"
    var tentarApi = null;
    if (location.protocol !== 'file:') {
      tentarApi = fetch(CONFIG.apiPosts, { headers: { accept: 'application/json' } })
        .then(function (r) {
          // 501 = funções existem mas sem variáveis; 404 = hospedagem sem /api
          if (r.status === 501 || r.status === 404) return null;   // -> prévia
          if (!r.ok) throw new Error('api ' + r.status);
          return r.json();
        })
        .then(function (j) {
          if (!j) return null;
          j.posts = j.posts || [];
          j._origem = j.posts.length ? 'notion' : 'notion-vazio';
          return j;
        });
    }

    // dados de exemplo: embutidos em posts.js (funciona também abrindo do disco)
    var fallback = function () {
      if (window.POSTS_EXEMPLO && window.POSTS_EXEMPLO.posts && window.POSTS_EXEMPLO.posts.length) {
        var copia = JSON.parse(JSON.stringify(window.POSTS_EXEMPLO));
        copia._origem = 'exemplo';
        return Promise.resolve(copia);
      }
      return fetch(CONFIG.fallback)
        .then(function (r) { if (!r.ok) throw new Error('json ' + r.status); return r.json(); })
        .then(function (j) { j._origem = 'exemplo'; return j; });
    };

    if (!tentarApi) { _cache = fallback(); return _cache; }

    _cache = tentarApi
      .then(function (j) { return j || fallback(); })
      .catch(function (e) {
        // API quebrou: quem assume é o acervo guardado no git
        console.error('[blog] falha ao carregar do Notion', e);
        return { posts: [], _origem: 'erro' };
      })
      .then(function (j) {
        if (j._origem === 'exemplo') { j.posts = (j.posts || []).slice().sort(porData); avisoDeOrigem(j._origem); return j; }

        var apiOk = (j._origem === 'notion' || j._origem === 'notion-vazio');
        var temFonteFora = !!(j.fontesFalhas && j.fontesFalhas.length);

        return carregarAcervo().then(function (acervo) {
          j.posts = combinar(j.posts, acervo, apiOk, temFonteFora);

          // havia fonte fora, mas o acervo cobriu: não é "site vazio"
          if (j._origem === 'notion-vazio' && j.posts.length) j._origem = 'notion';

          if (!apiOk) {
            // Notion fora do ar: o acervo mantém o site de pé
            j._origem = j.posts.length ? 'acervo' : 'erro';
            if (j.posts.length) console.warn('[blog] Notion indisponível: exibindo o acervo (' + j.posts.length + ' matéria[s])');
          }

          j.posts = j.posts.slice().sort(porData);
          avisoDeOrigem(j._origem);
          return j;
        });
      });

    return _cache;
  }

  /* aviso discreto quando o site está exibindo dados de exemplo */
  function avisoDeOrigem(origem) {
    if (origem !== 'exemplo' || location.protocol === 'file:') return;
    if (document.getElementById('avisoPrevia')) return;
    var el = document.createElement('div');
    el.id = 'avisoPrevia';
    el.className = 'aviso-previa';
    el.innerHTML = '<strong>Prévia</strong> · estas são matérias de demonstração. ' +
      'Depois de ligar o Notion, o conteúdo real substitui esta lista automaticamente.';
    var main = document.querySelector('main') || document.body;
    main.insertBefore(el, main.firstChild);
  }

  function avisoDeErro(texto) {
    var el = document.getElementById('avisoErro');
    if (el) { el.textContent = texto; return; }
    var div = document.createElement('div');
    div.id = 'avisoErro';
    div.className = 'aviso-previa aviso-erro';
    div.textContent = texto;
    var main = document.querySelector('main') || document.body;
    main.insertBefore(div, main.firstChild);
  }

  /* ---------------- cartões ---------------- */

  function metaLinha(p, comAutor) {
    var autor = autorDe(p);
    var min = p.minutos || minutos(p.corpo);
    var partes = [];
    if (comAutor) partes.push(esc(autor));
    partes.push(dataLonga(p.data));
    if (min) partes.push(min + ' min de leitura');
    return partes.filter(Boolean).join(' · ');
  }

  function cardDestaque(p) {
    var min = p.minutos || minutos(p.corpo, p.resumo);
    return '' +
      '<a href="' + linkPost(p) + '" class="card reveal destaque-card' + (p.capa ? '' : ' sem-capa') + '">' +
        '<div class="destaque-fundo">' +
          '<div class="ph' + (p.capa ? '' : ' sem-capa') + '"' + (p.capa ? ' style="background-image:url(\'' + esc(p.capa) + '\')"' : '') + '></div>' +
          '<div class="destaque-veu"></div>' +
        '</div>' +
        '<div class="destaque-texto">' +
          '<span class="badge">' + esc(p.categoria || 'Matéria') + '</span>' +
          '<h3 class="font-display destaque-titulo">' + esc(p.titulo) + '</h3>' +
          '<p class="font-serif destaque-resumo">' + esc(p.resumo || '') + '</p>' +
          '<p class="meta">' + metaLinha(p, true) + '</p>' +
        '</div>' +
      '</a>';
  }

  /* categoriaNoTopo: nos cards menores da home a categoria sai de cima da foto
     (ela tapava os rostos) e vai para a direita, acima do título. */
  function cardVertical(p, atraso, categoriaNoTopo) {
    var badgeFora = (categoriaNoTopo && p.categoria)
      ? '<span class="badge badge-canto">' + esc(p.categoria) + '</span>' : '';
    var badgeFoto = (!categoriaNoTopo && p.categoria)
      ? '<span class="badge badge-flutuante">' + esc(p.categoria) + '</span>' : '';
    return '' +
      '<a href="' + linkPost(p) + '" class="card reveal" style="animation-delay:' + (atraso || 0) + 's">' +
        '<div class="thumb" style="aspect-ratio:16/9">' +
          '<div class="ph' + (p.capa ? '' : ' sem-capa') + '"' + (p.capa ? ' style="background-image:url(\'' + esc(p.capa) + '\')"' : '') + '></div>' +
          '<div class="thumb-veu"></div>' +
          badgeFoto +
        '</div>' +
        '<div class="card-corpo">' +
          badgeFora +
          '<h3 class="font-display card-titulo">' + esc(p.titulo) + '</h3>' +
          '<p class="font-serif card-resumo">' + esc(p.resumo || '') + '</p>' +
          '<p class="meta">' + metaLinha(p, true) + '</p>' +
        '</div>' +
      '</a>';
  }

  function cardGrade(p) {
    var min = p.minutos || minutos(p.corpo, p.resumo);
    return '' +
      '<a href="' + linkPost(p) + '" class="card card-grade">' +
        '<div class="thumb" style="aspect-ratio:16/10">' +
          '<div class="ph' + (p.capa ? '' : ' sem-capa') + '"' + (p.capa ? ' style="background-image:url(\'' + esc(p.capa) + '\')"' : '') + '></div>' +
          '<div class="thumb-veu"></div>' +
        '</div>' +
        '<div class="card-corpo">' +
          (p.categoria ? '<span class="badge">' + esc(p.categoria) + '</span>' : '') +
          '<h3 class="font-display card-titulo">' + esc(p.titulo) + '</h3>' +
          '<p class="font-serif card-resumo">' + esc(p.resumo || '') + '</p>' +
          '<p class="meta">' + esc(autorDe(p)) + ' · ' + dataLonga(p.data) +
            (min ? ' · ' + min + ' min' : '') + '</p>' +
        '</div>' +
      '</a>';
  }

  /* os cards chegam depois do IntersectionObserver: revelar na mão */
  function revelar(raiz) {
    raiz.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------------- home ---------------- */

  function montarHome() {
    var alvo = document.getElementById('homeBlog');
    if (!alvo) return;

    carregar().then(function (dados) {
      var posts = dados.posts || [];
      if (!posts.length) {
        var secao = document.getElementById('blog');
        if (secao && dados._origem === 'notion-vazio') secao.hidden = true;
        return;
      }

      var destaque = posts.filter(function (p) { return p.destaque; })[0] || posts[0];
      var resto = posts.filter(function (p) { return p.slug !== destaque.slug; }).slice(0, 2);

      if (!resto.length) {
        alvo.innerHTML = cardDestaque(destaque);
        alvo.style.gridTemplateColumns = '1fr';
        revelar(alvo);
        return;
      }

      alvo.innerHTML = cardDestaque(destaque) +
        '<div class="home-laterais">' +
        resto.map(function (p, i) { return cardVertical(p, .05 * (i + 1), true); }).join('') +
        '</div>';

      revelar(alvo);
    });
  }

  /* ---------------- listagem (/blog) ---------------- */

  function montarListagem() {
    var grade = document.getElementById('gradePosts');
    if (!grade) return;

    var campoBusca = document.getElementById('busca');

    // veio de um link com ?q= (ex.: busca da página 404)
    if (campoBusca) {
      var q0 = new URLSearchParams(location.search).get('q');
      if (q0) campoBusca.value = q0;
    }
    var selMes = document.getElementById('filtroMes');
    var selAno = document.getElementById('filtroAno');
    var selOrdem = document.getElementById('ordem');
    var contador = document.getElementById('contadorPosts');
    var vazio = document.getElementById('semResultados');
    var btnLimpar = document.getElementById('limparFiltros');
    var selCat = document.getElementById('filtroCategoria');

    var params = new URLSearchParams(location.search);
    if (params.get('q')) campoBusca.value = params.get('q');
    if (params.get('ordem')) selOrdem.value = params.get('ordem');

    carregar().then(function (dados) {
      var posts = dados.posts || [];

      if (dados._origem === 'erro') {
        avisoDeErro('Não foi possível carregar as matérias agora. Tente recarregar a página em instantes.');
        contador.textContent = 'Indisponível';
        vazio.hidden = true;
        return;
      }

      if (dados._origem === 'notion-vazio') {
        contador.textContent = '0 matérias';
        vazio.hidden = false;
        vazio.querySelector('h3').textContent = 'Nenhuma matéria publicada ainda';
        vazio.querySelector('p').textContent = 'Assim que a primeira matéria for marcada como “Publicado” no Notion, ela aparece aqui.';
        btnLimpar.style.display = 'none';
        return;
      }

      /* selects de mês, ano e categoria montados a partir do que existe */
      var anos = {}, meses = {}, cats = {};
      posts.forEach(function (p) {
        var d = dataValida(p.data);
        if (d) { anos[d.getFullYear()] = 1; meses[d.getMonth()] = 1; }
        if (p.categoria) cats[p.categoria] = 1;
      });

      Object.keys(anos).sort(function (a, b) { return b - a; }).forEach(function (a) {
        selAno.insertAdjacentHTML('beforeend', '<option value="' + a + '">' + a + '</option>');
      });
      Object.keys(meses).sort(function (a, b) { return a - b; }).forEach(function (m) {
        selMes.insertAdjacentHTML('beforeend', '<option value="' + m + '">' + nomeMes(+m) + '</option>');
      });
      if (selCat) {
        Object.keys(cats).sort().forEach(function (c) {
          selCat.insertAdjacentHTML('beforeend', '<option value="' + esc(c) + '">' + esc(c) + '</option>');
        });
        if (params.get('categoria')) selCat.value = params.get('categoria');
      }
      if (params.get('mes')) selMes.value = params.get('mes');
      if (params.get('ano')) selAno.value = params.get('ano');

      function aplicar() {
        var q = normalizar(campoBusca.value.trim());
        var mes = selMes.value;
        var ano = selAno.value;
        var cat = selCat ? selCat.value : '';
        var ordem = selOrdem.value;

        var filtrados = posts.filter(function (p) {
          var d = dataValida(p.data);
          if (mes !== '' && (!d || String(d.getMonth()) !== mes)) return false;
          if (ano !== '' && (!d || String(d.getFullYear()) !== ano)) return false;
          if (cat && p.categoria !== cat) return false;
          if (!q) return true;
          var alvo = normalizar([p.titulo, p.resumo, p.categoria, autorDe(p)].join(' '));
          return alvo.indexOf(q) !== -1;
        });

        filtrados.sort(function (a, b) {
          if (ordem === 'antigos') return new Date(a.data) - new Date(b.data);
          if (ordem === 'az') return normalizar(a.titulo).localeCompare(normalizar(b.titulo));
          return new Date(b.data) - new Date(a.data);
        });

        grade.innerHTML = filtrados.map(cardGrade).join('');
        if (!filtrados.length) {
          grade.innerHTML = '';
          vazio.hidden = false;
        } else {
          vazio.hidden = true;
        }
        contador.textContent = filtrados.length === 1
          ? '1 matéria encontrada'
          : filtrados.length + ' matérias encontradas';

        var url = new URL(location.href);
        [['q', campoBusca.value.trim()], ['mes', mes], ['ano', ano], ['categoria', cat], ['ordem', ordem === 'recentes' ? '' : ordem]]
          .forEach(function (par) {
            if (par[1]) url.searchParams.set(par[0], par[1]); else url.searchParams.delete(par[0]);
          });
        history.replaceState(null, '', url);
      }

      var debounce;
      campoBusca.addEventListener('input', function () {
        clearTimeout(debounce); debounce = setTimeout(aplicar, 180);
      });
      [selMes, selAno, selOrdem, selCat].forEach(function (el) {
        if (el) el.addEventListener('change', aplicar);
      });
      btnLimpar.addEventListener('click', function () {
        campoBusca.value = ''; selMes.value = ''; selAno.value = ''; selOrdem.value = 'recentes';
        if (selCat) selCat.value = '';
        aplicar();
      });

      aplicar();
    });
  }

  /* ---------------- artigo ---------------- */

  function montarArtigo() {
    var raiz = document.getElementById('artigo');
    if (!raiz) return;

    var slug = new URLSearchParams(location.search).get('slug');

    function falha(msg) {
      raiz.innerHTML = '<div class="artigo-erro">' +
        '<p class="kicker">Matéria não encontrada</p>' +
        '<h1 class="font-display">' + esc(msg) + '</h1>' +
        '<p class="font-serif">O link pode estar desatualizado ou a matéria saiu do ar.</p>' +
        '<a class="btn-fire" href="/blog">Ver todas as matérias</a></div>';
    }

    if (!slug) { falha('Nenhuma matéria indicada'); return; }

    carregar().then(function (dados) {
      var lista = dados.posts || [];
      var post = lista.filter(function (p) { return p.slug === slug; })[0];

      // se o acervo já tem o corpo (com imagens locais), usa ele;
      // senão busca o corpo completo no Notion
      var promessaCorpo = (post && post.corpo) ? Promise.resolve(null)
        : (location.protocol !== 'file:')
        ? fetch(CONFIG.apiPost + '?slug=' + encodeURIComponent(slug))
            .then(function (r) { if (!r.ok) throw new Error('sem api'); return r.json(); })
            .then(function (j) {
              // só aceita se for a matéria pedida (protege matérias do arquivo local)
              var c = j && j.post ? j.post : null;
              return (c && c.slug === slug) ? c : null;
            })
            ['catch'](function () { return null; })
        : Promise.resolve(null);

      promessaCorpo.then(function (completo) {
        if (completo) post = Object.assign({}, post, completo);
        if (!post) { falha('Matéria não encontrada'); return; }

        document.title = post.titulo + ' — Lado Esquerdo de Curitiba';
        var min = post.minutos || minutos(post.corpo);
        var padrao = ehPadrao(post);

        raiz.innerHTML = '' +
          '<nav class="artigo-migalha meta"><a href="/">Início</a> / <a href="/blog">Blog</a> / ' +
            '<span>' + esc(post.categoria || 'Matéria') + '</span></nav>' +
          '<div class="artigo-cabeca">' +
            (post.categoria ? '<span class="badge">' + esc(post.categoria) + '</span>' : '') +
            '<h1 class="font-display artigo-titulo">' + esc(post.titulo) + '</h1>' +
            '<p class="font-serif artigo-linha-fina">' + esc(post.resumo || '') + '</p>' +
            '<div class="artigo-assinatura">' +
              (padrao
                ? '<span class="assinatura-padrao">' + esc(AUTOR_PADRAO) + '</span>'
                : '<span class="assinatura-nome">Por <strong>' + esc(post.autor) + '</strong></span>') +
              '<span class="meta">' + dataLonga(post.data) + (min ? ' · ' + min + ' min de leitura' : '') + '</span>' +
            '</div>' +
          '</div>' +
          (post.capa ? '<figure class="artigo-capa"><img src="' + esc(post.capa) + '" alt="' + esc(post.titulo) + '">' +
            (post.capaCredito ? '<figcaption>' + esc(post.capaCredito) + '</figcaption>' : '') + '</figure>' : '') +
          '<div class="artigo-corpo font-serif">' + (post.corpo || '<p>Conteúdo em preparação.</p>') + '</div>' +
          '<footer class="artigo-rodape">' +
            '<p class="meta">Publicado em ' + dataLonga(post.data) + '</p>' +
            '<div class="artigo-compartilhar">' +
              '<span class="meta">Compartilhar:</span>' +
              '<a class="btn-ghost btn-mini" target="_blank" rel="noopener noreferrer" href="https://wa.me/?text=' + encodeURIComponent(post.titulo + ' ' + location.href) + '">WhatsApp</a>' +
              '<a class="btn-ghost btn-mini" target="_blank" rel="noopener noreferrer" href="https://twitter.com/intent/tweet?text=' + encodeURIComponent(post.titulo) + '&url=' + encodeURIComponent(location.href) + '">X</a>' +
            '</div>' +
          '</footer>' +
          '<div class="artigo-voltar"><a class="link-fire" href="/blog">← Voltar para todas as matérias</a></div>';

        var cat = post.categoria;
        if (cat) {
          var relacionadas = lista.filter(function (p) {
            return p.categoria === cat && p.slug !== post.slug;
          }).slice(0, 3);
          if (relacionadas.length) {
            document.getElementById('relacionadas').hidden = false;
            document.getElementById('gradeRelacionadas').innerHTML = relacionadas.map(cardVertical).join('');
          }
        }
      });
    });
  }

  /* ---------------- início ---------------- */
  function iniciar() {
    montarHome();
    montarListagem();
    montarArtigo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else { iniciar(); }

  window.BlogCore = {
    carregar: carregar, autorDe: autorDe, dataLonga: dataLonga,
    cardVertical: cardVertical, cardGrade: cardGrade, cardDestaque: cardDestaque,
    AUTOR_PADRAO: AUTOR_PADRAO
  };
})();
