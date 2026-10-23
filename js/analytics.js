/* ------------------------------------------------------------------
   Google Analytics 4 (gtag.js) — Lado Esquerdo de Curitiba
   ------------------------------------------------------------------
   Por que o código do Google não vai inline no HTML:
   a Content-Security-Policy do site (vercel.json) só permite scripts da
   própria origem e do googletagmanager. Este arquivo é local, então carrega
   sem precisar afrouxar a CSP com 'unsafe-inline'.

   O gtag.js externo é baixado depois que a página fica ociosa, para não
   competir com o carregamento das matérias (LCP).
------------------------------------------------------------------ */
(function () {
  var ID = 'G-K9SEW9QWT7';

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  gtag('js', new Date());
  gtag('config', ID, { anonymize_ip: true });

  function baixarGtag() {
    if (document.querySelector('script[data-gtag]')) return;
    var s = document.createElement('script');
    s.async = true;
    s.setAttribute('data-gtag', '1');
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    s.onerror = function () { /* sem analytics o site continua igual */ };
    document.head.appendChild(s);
  }

  if ('requestIdleCallback' in window) {
    requestIdleCallback(baixarGtag, { timeout: 2500 });
  } else {
    setTimeout(baixarGtag, 1500);
  }
})();
