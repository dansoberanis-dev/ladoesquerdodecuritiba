/* =====================================================================
   Carrossel das artes das empresas apoiadoras
   ---------------------------------------------------------------------
   Cada card com [data-slides] mostra uma arte por vez. As artes se
   dissolvem uma na outra a cada 4 segundos e voltam ao começo.

   Controles:
   - mouse em cima (ou foco pelo teclado) segura a troca;
   - setas e bolinhas vão na mão;
   - no celular, arrastar o dedo para o lado troca a arte, sem atrapalhar
     a rolagem vertical da página;
   - quem pediu menos movimento no sistema vê a primeira arte parada.

   As artes seguintes só carregam quando chegam na vez (loading="lazy"),
   então várias imagens no mesmo card não pesam no site.
   ===================================================================== */
(function () {
  'use strict';

  var ESPERA = 4000;   // tempo de cada arte na tela
  var LIMITE = 26;     // distância mínima do arrasto para trocar

  function iniciar() {
    var cards = document.querySelectorAll('[data-slides]');
    if (!cards.length) return;

    Array.prototype.forEach.call(cards, function (card) {
      var arte = card.querySelector('.apoia-arte');
      if (!arte) return;
      var slides = Array.prototype.slice.call(arte.querySelectorAll('.apoia-slide'));
      if (slides.length < 2) return;

      var caixa = arte.querySelector('.apoia-bolinhas');
      var passo = 0;
      var relogio = null;
      var parado = false;
      var arrastando = false;
      var xIni = 0;
      var yIni = 0;
      var decidiu = false;
      var reduzir = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

      // bolinhas de posição
      var bolinhas = [];
      if (caixa) {
        slides.forEach(function (_, i) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'apoia-bolinha' + (i === 0 ? ' ativa' : '');
          b.setAttribute('aria-label', 'Arte ' + (i + 1) + ' de ' + slides.length);
          b.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            ir(i, true);
          });
          caixa.appendChild(b);
          bolinhas.push(b);
        });
      }

      function ir(i, manual) {
        passo = ((i % slides.length) + slides.length) % slides.length;
        slides.forEach(function (s, k) { s.classList.toggle('ativo', k === passo); });
        bolinhas.forEach(function (b, k) { b.classList.toggle('ativa', k === passo); });
        if (manual) reiniciar();
      }

      function reiniciar() {
        clearInterval(relogio);
        if (reduzir) return;
        relogio = setInterval(function () {
          if (parado || arrastando || document.hidden) return;
          ir(passo + 1, false);
        }, ESPERA);
      }

      // setas
      Array.prototype.forEach.call(arte.querySelectorAll('[data-passo]'), function (b) {
        b.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          ir(passo + Number(b.getAttribute('data-passo')), true);
        });
      });

      // pausas gentis
      card.addEventListener('mouseenter', function () { parado = true; });
      card.addEventListener('mouseleave', function () { parado = false; });
      card.addEventListener('focusin', function () { parado = true; });
      card.addEventListener('focusout', function () { parado = false; });

      // arrastar com o dedo
      // sem isto, o navegador inicia o "arrastar imagem" nativo e engole o gesto
      arte.addEventListener('dragstart', function (ev) { ev.preventDefault(); });
      arte.addEventListener('pointerdown', function (ev) {
        arrastando = true;
        decidiu = false;
        xIni = ev.clientX;
        yIni = ev.clientY;
      });
      arte.addEventListener('pointermove', function (ev) {
        if (!arrastando || decidiu) return;
        var dx = ev.clientX - xIni;
        var dy = ev.clientY - yIni;
        if (Math.abs(dx) > LIMITE && Math.abs(dx) > Math.abs(dy)) {
          decidiu = true;
          ir(passo + (dx < 0 ? 1 : -1), true);
          arrastando = false;
        } else if (Math.abs(dy) > LIMITE) {
          arrastando = false;   // rolagem da página: deixa passar
        }
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) {
        arte.addEventListener(t, function () { arrastando = false; });
      });

      reiniciar();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
