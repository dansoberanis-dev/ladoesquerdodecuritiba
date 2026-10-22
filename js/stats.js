/* =====================================================================
   Números das redes sociais
   ---------------------------------------------------------------------
   Tenta /api/instagram (Instagram Graph API, configurada na Vercel).
   Se não existir / falhar / não estiver configurada, MANTÉM os números
   escritos no HTML — nada quebra e nada fica em branco.
   ===================================================================== */
(function () {
  'use strict';

  var API = '/api/instagram';

  /* 277123 -> "277 mil" | 5111 -> "5.111" | 1200000 -> "1,2 mi" */
  function formatar(n, compacto) {
    n = Number(n);
    if (!isFinite(n) || n < 0) return null;
    if (compacto) {
      if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.', ',') + ' mi';
      if (n >= 10000) return Math.floor(n / 1000) + ' mil';
    }
    return n.toLocaleString('pt-BR');
  }

  function preencher(dados) {
    var mapa = {
      seguidores: [dados.seguidores, true],
      publicacoes: [dados.publicacoes, false],
      seguindo: [dados.seguindo, false]
    };

    Object.keys(mapa).forEach(function (chave) {
      var alvo = document.querySelector('[data-stat="' + chave + '"]');
      if (!alvo) return;
      var valor = formatar(mapa[chave][0], mapa[chave][1]);
      if (!valor) return;

      // se o número muda, faz uma transição suave em vez de "pular"
      if (alvo.textContent.trim() !== valor) {
        alvo.style.transition = 'opacity .35s ease';
        alvo.style.opacity = '0';
        setTimeout(function () {
          alvo.textContent = valor;
          alvo.style.opacity = '1';
        }, 350);
      }
    });

    var selo = document.getElementById('statFonte');
    if (selo && dados.atualizadoEm) {
      var d = new Date(dados.atualizadoEm);
      if (!isNaN(d.getTime())) {
        selo.hidden = false;
        selo.textContent = ' · ' + d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      }
    }
  }

  function carregar() {
    if (!document.querySelector('[data-stat]')) return;
    if (location.protocol === 'file:') return;   // aberto do disco: mantém os números do HTML

    fetch(API, { headers: { accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('sem api'); return r.json(); })
      .then(function (j) { if (j && j.ok) preencher(j); })
      .catch(function () { /* silencioso: fica o número do HTML */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', carregar);
  } else { carregar(); }
})();
