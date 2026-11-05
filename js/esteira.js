/* =====================================================================
   Esteira de apoiadores
   ---------------------------------------------------------------------
   Regra combinada: a esteira só gira quando os cards NÃO cabem na
   largura da tela. Se couberem, fica parada, alinhada à esquerda.

   Como funciona:
   1. mede a largura real dos cards + espaços;
   2. se sobrar espaço, para a animação e não duplica nada;
   3. se faltar espaço, clona os cards uma vez (para o laço não ter
      buraco) e gira com duração proporcional à largura, para a
      velocidade ser sempre a mesma, no desktop e no celular;
   4. recalcula ao girar o celular, ao redimensionar e quando a fonte
      terminar de carregar.

   Sem JavaScript, a faixa aparece parada e com rolagem lateral.
   ===================================================================== */
(function () {
  'use strict';

  function iniciar() {
    var faixa = document.querySelector('[data-esteira]');
    if (!faixa) return;
    var trilha = faixa.querySelector('[data-trilha]');
    if (!trilha) return;

    var originais = Array.prototype.slice.call(trilha.children);
    if (!originais.length) return;

    var clonados = [];
    var timer = null;

    function limparClones() {
      clonados.forEach(function (n) {
        if (n.parentNode) n.parentNode.removeChild(n);
      });
      clonados = [];
      trilha.style.removeProperty('--larg');
      trilha.style.removeProperty('--dur');
      faixa.classList.remove('girando');
    }

    function medir() {
      var gap = parseFloat(getComputedStyle(trilha).columnGap || getComputedStyle(trilha).gap) || 0;
      var total = 0;
      originais.forEach(function (el, i) {
        total += el.getBoundingClientRect().width + (i ? gap : 0);
      });
      return { larguraCards: total, gap: gap, disponivel: faixa.clientWidth };
    }

    function ajustar() {
      limparClones();
      var m = medir();
      if (!m.larguraCards || !m.disponivel) return;

      // cabe na tela: fica parada
      if (m.larguraCards <= m.disponivel) return;

      // não cabe: clona uma vez para o laço ficar contínuo
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

      // o deslocamento é exatamente a largura do bloco original + o gap
      var deslocamento = m.larguraCards + m.gap;
      var velocidade = 42; // pixels por segundo, igual em qualquer tela
      trilha.style.setProperty('--larg', deslocamento + 'px');
      trilha.style.setProperty('--dur', Math.max(18, Math.round(deslocamento / velocidade)) + 's');
      faixa.classList.add('girando');
    }

    function agendar() {
      clearTimeout(timer);
      timer = setTimeout(ajustar, 140);
    }

    ajustar();
    window.addEventListener('resize', agendar);
    window.addEventListener('orientationchange', agendar);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(agendar);
    // imagens das logos podem mudar a largura depois de carregar
    window.addEventListener('load', agendar);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
