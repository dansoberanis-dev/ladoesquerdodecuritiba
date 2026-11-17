/* =====================================================================
   Pop-up temporário: passamos de 300 mil seguidores
   ---------------------------------------------------------------------
   Aparece uma vez, depois que a página carrega e depois do aviso de
   cookies (para não empilhar as duas caixas).

   Regras:
   - fecha no X, no "Continuar lendo", na tecla Esc ou clicando fora;
   - não reaparece para quem já fechou, por 20 dias (memória no navegador);
   - fecha sozinho depois de 25 segundos, para não atrapalhar a leitura;
   - quem prefere menos movimento vê a caixa aparecer sem animação.

   Para desligar de vez: apagar o bloco #popup300 do index.html.
   Para mostrar de novo a todo mundo: trocar a CHAVE abaixo (ex.: v2).
   ===================================================================== */
(function () {
  'use strict';

  var CHAVE = 'lec-popup300';
  var ESPERA = 1200;    // deixa a página respirar antes de aparecer
  var SOZINHO = 25000;  // fecha sozinho depois disso

  function iniciar() {
    var box = document.getElementById('popup300');
    if (!box) return;

    var jaViu = false;
    try { jaViu = !!window.localStorage.getItem(CHAVE); } catch (e) { jaViu = false; }
    if (jaViu) return;

    var relogio = null;
    var fechado = false;

    function fechar() {
      if (fechado) return;
      fechado = true;
      clearTimeout(relogio);
      box.classList.remove('aberto');
      setTimeout(function () { box.hidden = true; }, 320);
      try { window.localStorage.setItem(CHAVE, String(Date.now())); } catch (e) {}
    }

    function abrir() {
      box.hidden = false;
      requestAnimationFrame(function () {
        box.classList.add('aberto');
        var alvo = box.querySelector('.p300-follow');
        if (alvo) alvo.focus({ preventScroll: true });
      });
      relogio = setTimeout(fechar, SOZINHO);
    }

    box.addEventListener('click', function (ev) {
      var alvo = ev.target.closest ? ev.target.closest('[data-p300-fechar]') : null;
      if (alvo) {
        ev.preventDefault();
        fechar();
        return;
      }
      // clique fora da caixa também fecha
      if (ev.target === box) fechar();
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !box.hidden) fechar();
    });

    // espera o aviso de cookies sair da frente, se ele estiver aberto
    function tentar() {
      var aviso = document.getElementById('avisoCookies');
      var avisoAberto = aviso && !aviso.hidden && aviso.classList.contains('aberto');
      if (avisoAberto) {
        setTimeout(tentar, 1500);
        return;
      }
      abrir();
    }

    setTimeout(tentar, ESPERA);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
