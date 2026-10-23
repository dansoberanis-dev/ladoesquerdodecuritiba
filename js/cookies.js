/* ------------------------------------------------------------------
   Aviso de cookies — Lado Esquerdo de Curitiba
   ------------------------------------------------------------------
   Sem escolha salva: mostra o aviso e NÃO carrega o Google Analytics.
   Aceitar: grava a escolha, esconde o aviso e libera a medição.
   Recusar: grava a escolha, esconde o aviso e a medição nunca acontece.
   A escolha vale por navegador; a pessoa pode trocar depois pelo link
   "Cookies" no rodapé.
------------------------------------------------------------------ */
(function () {
  var CHAVE = 'lec-consentimento';
  var box = document.getElementById('avisoCookies');
  if (!box) return;

  function ler() {
    try { return window.localStorage.getItem(CHAVE); } catch (e) { return null; }
  }

  function gravar(v) {
    try { window.localStorage.setItem(CHAVE, v); } catch (e) { /* modo privado */ }
  }

  function fechar() {
    box.classList.remove('aberto');
    setTimeout(function () { box.hidden = true; }, 320);
  }

  function abrir() {
    box.hidden = false;
    // deixa o navegador pintar antes de animar
    requestAnimationFrame(function () { box.classList.add('aberto'); });
  }

  box.addEventListener('click', function (ev) {
    var alvo = ev.target.closest ? ev.target.closest('[data-cookie]') : null;
    if (!alvo) return;
    var acao = alvo.getAttribute('data-cookie');
    gravar(acao);
    fechar();
    window.dispatchEvent(new CustomEvent('lec:consentimento', { detail: acao }));
  });

  // link "Cookies" no rodapé reabre o aviso para trocar a escolha
  document.addEventListener('click', function (ev) {
    var alvo = ev.target.closest ? ev.target.closest('[data-cookie-reabrir]') : null;
    if (!alvo) return;
    ev.preventDefault();
    abrir();
  });

  if (!ler()) abrir();
})();
