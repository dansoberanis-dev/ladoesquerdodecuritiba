/* ------------------------------------------------------------------
   Google Analytics 4 (gtag.js) — Lado Esquerdo de Curitiba
   ------------------------------------------------------------------
   Por que o código do Google não vai inline no HTML:
   a Content-Security-Policy do site (vercel.json) não permite script
   inline. Este arquivo é local e cuida de tudo.

   Consentimento (LGPD):
   a tag só é carregada depois que a pessoa aceita o aviso de cookies.
   Quem recusa navega sem medição e sem cookie de análise.

   Para voltar a medir sem pedir consentimento, troque a constante
   EXIGIR_CONSENTIMENTO para false (uma linha).
------------------------------------------------------------------ */
(function () {
  var ID = 'G-KRSHM9HXMT';
  var CHAVE = 'lec-consentimento';
  var EXIGIR_CONSENTIMENTO = true;

  function escolha() {
    try { return window.localStorage.getItem(CHAVE); } catch (e) { return null; }
  }

  function iniciar() {
    if (window.__lecGA) return;
    window.__lecGA = true;

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = window.gtag || gtag;

    gtag('js', new Date());
    gtag('config', ID, { anonymize_ip: true });

    if (!document.querySelector('script[data-gtag]')) {
      var s = document.createElement('script');
      s.async = true;
      s.setAttribute('data-gtag', '1');
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
      s.onerror = function () { /* sem analytics o site continua igual */ };
      document.head.appendChild(s);
    }
  }

  // quem já aceitou antes não espera nada
  if (!EXIGIR_CONSENTIMENTO || escolha() === 'aceito') iniciar();

  // o aviso de cookies avisa quando a pessoa aceita
  window.addEventListener('lec:consentimento', function (ev) {
    if (ev && ev.detail === 'aceito') iniciar();
  });
})();
