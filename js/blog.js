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
    return 'artigo.html?slug=' + encodeURIComponent(p.slug);
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

  function carregar() {
    if (_cache) return Promise.resolve(_cache);

    var tentarApi = location.protocol !== 'file:' &&
      fetch(CONFIG.apiPosts, { headers: { accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('api ' + r.status); return r.json(); })
        .then(function (j) {
          if (!j || !j.posts || !j.posts.length) throw new Error('api vazia');
          j._origem = 'notion';
          return j;
        });

    // 1º: dados embutidos em posts.js (funciona também abrindo o arquivo direto, sem servidor)
    // 2º: posts.json (via fetch, quando servido por http)
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

    _cache = tentarApi['catch'](function () { return fallback(); })
      .then(function (j) {
        j.posts = (j.posts || []).slice().sort(function (a, b) {
          return new Date(b.data) - new Date(a.data);
        });
        return j;
      })
      .catch(function (e) {
        console.error('[blog] nao foi possivel carregar as materias', e);
        return { posts: [], _origem: 'erro' };
      });

    return _cache;
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
      '<a href="' + linkPost(p) + '" class="card reveal destaque-card">' +
        '<div class="destaque-fundo">' +
          '<div class="ph" style="background-image:url(\'' + esc(p.capa || '') + '\')"></div>' +
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

  function cardVertical(p, atraso) {
    return '' +
      '<a href="' + linkPost(p) + '" class="card reveal" style="animation-delay:' + (atraso || 0) + 's">' +
        '<div class="thumb" style="aspect-ratio:16/9">' +
          '<div class="ph" style="background-image:url(\'' + esc(p.capa || '') + '\')"></div>' +
          '<div class="thumb-veu"></div>' +
          (p.categoria ? '<span class="badge badge-flutuante">' + esc(p.categoria) + '</span>' : '') +
        '</div>' +
        '<div class="card-corpo">' +
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
          '<div class="ph" style="background-image:url(\'' + esc(p.capa || '') + '\')"></div>' +
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

  /* ---------------- home ---------------- */

  function montarHome() {
    var alvo = document.getElementById('homeBlog');
    if (!alvo) return;

    carregar().then(function (dados) {
      var posts = dados.posts || [];
      if (!posts.length) return;

      var destaque = posts.filter(function (p) { return p.destaque; })[0] || posts[0];
      var resto = posts.filter(function (p) { return p.slug !== destaque.slug; }).slice(0, 2);

      if (!resto.length) {
        alvo.innerHTML = cardDestaque(destaque);
        alvo.style.gridTemplateColumns = '1fr';
        return;
      }

      alvo.innerHTML = cardDestaque(destaque) +
        '<div class="home-laterais">' +
        resto.map(function (p, i) { return cardVertical(p, .05 * (i + 1)); }).join('') +
        '</div>';

      alvo.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
    });
  }

  /* ---------------- listagem (blog.html) ---------------- */

  function montarListagem() {
    var grade = document.getElementById('gradePosts');
    if (!grade) return;

    var campoBusca = document.getElementById('busca');
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
        '<a class="btn-fire" href="blog.html">Ver todas as matérias</a></div>';
    }

    if (!slug) { falha('Nenhuma matéria indicada'); return; }

    carregar().then(function (dados) {
      var lista = dados.posts || [];
      var post = lista.filter(function (p) { return p.slug === slug; })[0];

      // tenta o corpo completo pela API (Notion); senão usa o do JSON
      var promessaCorpo = (location.protocol !== 'file:')
        ? fetch(CONFIG.apiPost + '?slug=' + encodeURIComponent(slug))
            .then(function (r) { if (!r.ok) throw new Error('sem api'); return r.json(); })
            .then(function (j) { return j && j.post ? j.post : null; })
            ['catch'](function () { return null; })
        : Promise.resolve(null);

      promessaCorpo.then(function (completo) {
        if (completo) post = Object.assign({}, post, completo);
        if (!post) { falha('Matéria não encontrada'); return; }

        document.title = post.titulo + ' — Lado Esquerdo de Curitiba';
        var min = post.minutos || minutos(post.corpo);
        var padrao = ehPadrao(post);

        raiz.innerHTML = '' +
          '<nav class="artigo-migalha meta"><a href="index.html">Início</a> / <a href="blog.html">Blog</a> / ' +
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
          '<div class="artigo-voltar"><a class="link-fire" href="blog.html">← Voltar para todas as matérias</a></div>';

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
