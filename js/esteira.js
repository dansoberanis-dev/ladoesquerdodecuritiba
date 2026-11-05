/* =====================================================================
   Esteira de apoiadores
   ---------------------------------------------------------------------
   Regra combinada: a esteira só se mexe quando os cards NÃO cabem na
   largura da tela. Se couberem, fica parada, alinhada à esquerda, e os
   botões de avançar/voltar nem aparecem.

   Quando não cabem:
   1. os cards são clonados uma vez (aria-hidden) para o laço não ter
      buraco nenhum;
   2. a faixa gira sozinha a 42 px/s, no desktop e no celular;
   3. dá para arrastar com o dedo (ou com o mouse), sem perder a rolagem
      vertical da página;
   4. aparecem os botões de avançar e voltar, um card por clique;
   5. qualquer toque na mão (arrastar ou botão) segura a esteira por
      alguns segundos, para não brigar com a pessoa.

   Sem JavaScript, a faixa aparece parada e com rolagem lateral.
   Quem pediu menos movimento vê a faixa parada, mas continua podendo
   arrastar e usar os botões.
   ===================================================================== */
(function () {
  'use strict';

  function iniciar() {
    var faixa = document.querySelector('[data-esteira]');
    if (!faixa) return;
    var trilha = faixa.querySelector('[data-trilha]');
    if (!trilha) return;
    var nav = document.querySelector('[data-nav]');

    var originais = Array.prototype.slice.call(trilha.children).filter(function (el) {
      return !el.hasAttribute('data-clone');
    });
    if (!originais.length) return;

    var VELOCIDADE = 42;      // pixels por segundo, igual em qualquer tela
    var DURACAO_CLIQUE = 340; // tempo do deslize de um clique nos botões
    var ESPERA = 3500;        // tempo parado depois de arrastar
    var ESPERA_BOTAO = 4000;  // tempo parado depois de clicar

    var clonados = [];
    var timerMedida = null;
    var bloco = 0;      // largura de um conjunto de cards + o espaço do laço
    var passo = 0;      // largura de um card + o espaço entre cards
    var pos = 0;        // deslocamento atual, em pixels
    var ativo = false;  // existe conteúdo sobrando para rolar?
    var arrastando = false;
    var arrastou = false;
    var xInicial = 0;
    var posInicial = 0;
    var sobre = false;  // mouse em cima da faixa
    var pausaAte = 0;
    var tween = null;   // animação de um clique
    var ultimoQuadro = 0;
    var raf = null;
    var reduzir = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    function norm(p) {
      if (!bloco) return 0;
      return ((p % bloco) + bloco) % bloco;
    }

    function aplicar() {
      trilha.style.transform = 'translate3d(' + (-pos).toFixed(3) + 'px,0,0)';
    }

    function quadro(t) {
      raf = requestAnimationFrame(quadro);
      var dt = ultimoQuadro ? Math.min(64, t - ultimoQuadro) / 1000 : 0;
      ultimoQuadro = t;

      // deslize de um clique nos botões
      if (tween) {
        if (!tween.t0) tween.t0 = t;
        var k = Math.min(1, (t - tween.t0) / tween.dur);
        var e = 1 - Math.pow(1 - k, 3); // desacelera no fim
        pos = tween.ini + (tween.destino - tween.ini) * e;
        aplicar();
        if (k >= 1) {
          pos = norm(tween.destino);
          tween = null;
          aplicar();
        }
        return;
      }

      if (!ativo || reduzir) return;
      if (arrastando || sobre) return;
      if (document.hidden) return;
      if (t < pausaAte) return;

      pos = norm(pos + VELOCIDADE * dt);
      aplicar();
    }

    function animarPara(destino) {
      tween = { ini: pos, destino: destino, dur: DURACAO_CLIQUE, t0: 0 };
    }

    /* ---------- botões de avançar e voltar ---------- */
    function andar(dir) {
      if (!ativo) return;
      var destino = pos + dir * passo;

      // voltando do começo: gira para o fim antes, sem salto visual
      if (destino < 0) {
        pos += bloco;
        aplicar();
        destino += bloco;
      }
      animarPara(destino);
      pausaAte = performance.now() + ESPERA_BOTAO;
    }

    if (nav) {
      nav.addEventListener('click', function (ev) {
        var botao = ev.target.closest ? ev.target.closest('[data-dir]') : null;
        if (!botao) return;
        ev.preventDefault();
        andar(Number(botao.getAttribute('data-dir')));
      });
    }

    /* ---------- arrastar com o dedo ou com o mouse ---------- */
    trilha.addEventListener('pointerdown', function (ev) {
      if (!ativo) return;
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      arrastando = true;
      arrastou = false;
      xInicial = ev.clientX;
      posInicial = pos;
      tween = null;
      trilha.classList.add('arrastando');
      try { trilha.setPointerCapture(ev.pointerId); } catch (e) {}
    });

    trilha.addEventListener('pointermove', function (ev) {
      if (!arrastando) return;
      var dx = ev.clientX - xInicial;
      if (Math.abs(dx) > 4) arrastou = true;
      pos = norm(posInicial - dx);
      aplicar();
    });

    function soltar() {
      if (!arrastando) return;
      arrastando = false;
      trilha.classList.remove('arrastando');
      pausaAte = performance.now() + ESPERA;
    }
    trilha.addEventListener('pointerup', soltar);
    trilha.addEventListener('pointercancel', soltar);

    // depois de arrastar, o clique não deve abrir nada do card
    trilha.addEventListener('click', function (ev) {
      if (!arrastou) return;
      ev.preventDefault();
      ev.stopPropagation();
      arrastou = false;
    }, true);

    /* ---------- pausas gentis ---------- */
    faixa.addEventListener('pointerenter', function (ev) {
      if (ev.pointerType === 'mouse') sobre = true;
    });
    faixa.addEventListener('pointerleave', function () { sobre = false; });

    /* ---------- medição ---------- */
    function limparClones() {
      clonados.forEach(function (n) {
        if (n.parentNode) n.parentNode.removeChild(n);
      });
      clonados = [];
      faixa.classList.remove('girando');
    }

    function medir() {
      var cs = getComputedStyle(trilha);
      var gap = parseFloat(cs.columnGap || cs.gap) || 0;
      var total = 0;
      originais.forEach(function (el, i) {
        total += el.getBoundingClientRect().width + (i ? gap : 0);
      });
      return { larguraCards: total, gap: gap, disponivel: faixa.clientWidth };
    }

    function ajustar() {
      limparClones();
      tween = null;
      arrastando = false;
      pos = 0;
      aplicar();

      var m = medir();
      ativo = false;
      bloco = 0;
      passo = 0;
      if (nav) nav.hidden = true;
      faixa.removeAttribute('data-pronto');

      if (!m.larguraCards || !m.disponivel) return;

      // cabe na tela: fica parada, sem clones e sem botões
      if (m.larguraCards <= m.disponivel) {
        faixa.setAttribute('data-pronto', '1');
        return;
      }

      originais.forEach(function (el) {
        var copia = el.cloneNode(true);
        copia.setAttribute('aria-hidden', 'true');
        copia.setAttribute('data-clone', '1');
        copia.querySelectorAll('a,button,input').forEach(function (f) {
          f.setAttribute('tabindex', '-1');
        });
        trilha.appendChild(copia);
        clonados.push(copia);
      });

      bloco = m.larguraCards + m.gap;
      passo = bloco / originais.length;
      ativo = true;
      pos = 0;
      aplicar();
      faixa.setAttribute('data-pronto', '1');
      faixa.classList.add('girando');
      if (nav) nav.hidden = false;
    }

    function agendar() {
      clearTimeout(timerMedida);
      timerMedida = setTimeout(ajustar, 140);
    }

    ajustar();

    // a faixa só começa a andar depois que a página termina de montar
    ultimoQuadro = 0;
    raf = requestAnimationFrame(quadro);

    window.addEventListener('resize', agendar);
    window.addEventListener('orientationchange', agendar);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(agendar);
    window.addEventListener('load', agendar);

    // se a pessoa mudar a preferência de movimento, respeita na hora
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mq.addEventListener) {
        mq.addEventListener('change', function (e) { reduzir = e.matches; });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
