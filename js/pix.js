/* =====================================================================
   Botão "Copiar chave Pix"
   ---------------------------------------------------------------------
   Ao clicar, coloca a chave na área de transferência já no formato que
   os aplicativos de banco entendem: +55 + DDD + número, sem espaço,
   sem parêntese e sem traço.
   Depois avisa a pessoa e volta ao normal em 3 segundos.

   Usa a área de transferência moderna quando existe e, se o navegador
   não deixar, cai no método antigo. Se nada funcionar, mostra a chave
   na tela para a pessoa copiar com o dedo.
   ===================================================================== */
(function () {
  'use strict';

  function copiarAntigo(chave) {
    var campo = document.createElement('textarea');
    campo.value = chave;
    campo.setAttribute('readonly', '');
    campo.style.position = 'fixed';
    campo.style.top = '-1000px';
    campo.style.opacity = '0';
    document.body.appendChild(campo);
    campo.select();
    try { campo.setSelectionRange(0, chave.length); } catch (e) {}
    var deuCerto = false;
    try { deuCerto = document.execCommand('copy'); } catch (e) { deuCerto = false; }
    document.body.removeChild(campo);
    return deuCerto;
  }

  function iniciar() {
    var botoes = document.querySelectorAll('[data-copiar-pix]');
    if (!botoes.length) return;

    Array.prototype.forEach.call(botoes, function (botao) {
      var rotulo = botao.querySelector('[data-pix-rotulo]');
      var aviso = document.querySelector('[data-pix-aviso]');
      var textoPadrao = rotulo ? rotulo.textContent : '';
      var avisoPadrao = aviso ? aviso.textContent : '';
      var relogio = null;

      function falar(texto) {
        if (aviso) aviso.textContent = texto;
      }

      function comemorar() {
        if (rotulo) rotulo.textContent = 'Chave copiada';
        botao.classList.add('copiado');
        falar('Pronto. Abra o aplicativo do seu banco, escolha Pix e cole.');
        clearTimeout(relogio);
        relogio = setTimeout(function () {
          if (rotulo) rotulo.textContent = textoPadrao;
          botao.classList.remove('copiado');
          falar(avisoPadrao);
        }, 4000);
      }

      botao.addEventListener('click', function () {
        var chave = botao.getAttribute('data-chave') || '';

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(chave).then(comemorar, function () {
            if (copiarAntigo(chave)) comemorar();
            else falar('Não consegui copiar sozinho. A chave é ' + chave);
          });
          return;
        }

        if (copiarAntigo(chave)) comemorar();
        else falar('Não consegui copiar sozinho. A chave é ' + chave);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
