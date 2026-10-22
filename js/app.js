(function(){
  var h = document.getElementById('siteHeader');
  var onScroll = function(){ h.classList.toggle('scrolled', window.scrollY > 14); };
  onScroll(); addEventListener('scroll', onScroll, {passive:true});

  // sparkle timing individual (substitui os --dur/--delay do print)
  document.querySelectorAll('.spark').forEach(function(s){
    var cs = getComputedStyle(s);
    s.style.animation = 'sparkFloat ' + (cs.getPropertyValue('--dur').trim() || '5.5s') + ' linear infinite';
    s.style.animationDelay = cs.getPropertyValue('--delay').trim() || '0s';
  });

  // MENU MOBILE (sanfona lateral)
  var btn = document.getElementById('menuBtn'),
      menu = document.getElementById('mobileMenu'),
      back = document.getElementById('mmBackdrop'),
      icoOpen = btn.querySelector('.ico-open'),
      icoClose = btn.querySelector('.ico-close');

  function setMenu(open){
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    icoOpen.style.display = open ? 'none' : 'inline';
    icoClose.style.display = open ? 'inline' : 'none';
    document.body.style.overflow = open ? 'hidden' : '';
    document.body.classList.toggle('menu-open', open);
    if (open){ back.hidden = false; menu.hidden = false;
      requestAnimationFrame(function(){ back.classList.add('show'); menu.classList.add('open'); });
    } else {
      back.classList.remove('show'); menu.classList.remove('open');
      setTimeout(function(){ back.hidden = true; menu.hidden = true; }, 420);
    }
  }
  btn.addEventListener('click', function(){ setMenu(!menu.classList.contains('open')); });
  back.addEventListener('click', function(){ setMenu(false); });
  menu.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', function(){ setMenu(false); }); });
  addEventListener('keydown', function(e){ if(e.key === 'Escape' && menu.classList.contains('open')) setMenu(false); });
  addEventListener('resize', function(){ if(innerWidth > 980 && menu.classList.contains('open')) setMenu(false); });

  // reveal on scroll
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
    }, {threshold:.14, rootMargin:'0px 0px -8% 0px'});
    els.forEach(function(el){ io.observe(el); });
  } else { els.forEach(function(el){ el.classList.add('in'); }); }
})();
