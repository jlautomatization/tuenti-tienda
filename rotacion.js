/* Rotación de fotos por categoría (carrusel de categorías del inicio).
   Cada tarjeta cambia SU foto, al azar y sin repetir la que acaba de salir, entre fotos de diseños de ESA categoría
   (window.__tuentiFotosCategoria, armado por app.js desde productos[].variantes[].fotos con publicable_web = true).
   - Fundido de 0,6 s cada ~3,5 s, escalonado: las tarjetas no cambian a la vez.
   - Solo se precarga LA SIGUIENTE foto de cada tarjeta (WebP de 400 px, ≈ 20 KB; antes miniatura JPG de 440 px), justo antes del fundido (sin parpadeo en blanco).
   - Empieza después de la primera pantalla (load + espera), y se pausa fuera de pantalla o con la pestaña oculta.
   - No toca el carrusel (scrollLeft) ni el layout: las fotos son absolutas dentro de la tarjeta.
   - prefers-reduced-motion, ahorro de datos o conexión 2g: foto fija, como antes. */
(function () {
  'use strict';
  var FUNDIDO_MS = 600, PERIODO_MS = 3500, JITTER_MS = 600, ESCALON_MS = 750, INICIO_MS = 2500;
  var cont = document.getElementById('cats');
  if (!cont) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var con = navigator.connection || {};
  if (con.saveData || /(^|-)2g$/.test(con.effectiveType || '')) return;

  var fotos = null, estado = {}, visible = true, arrancado = false;

  function barajar(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function categoriaDe(el) {
    var h = el.getAttribute('href') || '', i = h.indexOf('#');
    if (i < 0) return null;
    try { return decodeURIComponent(h.slice(i + 1)); } catch (e) { return null; }
  }
  function siguiente(cat) {
    var st = estado[cat];
    if (!st.bolsa.length) {                       // nueva vuelta: todas menos la que acaba de salir, en otro orden
      st.bolsa = barajar(st.todas.filter(function (f) { return f !== st.actual; }));
    }
    return st.bolsa.shift();
  }
  function precargar(src) {
    return new Promise(function (ok) {
      var im = new Image();
      im.onload = function () { (im.decode ? im.decode() : Promise.resolve()).then(ok, ok); };
      im.onerror = function () { ok(false); };
      im.src = src;
    }).then(function (r) { return r !== false; });
  }
  function cambiarFoto(card, src) {
    var viejo = card.querySelector('img:last-of-type');
    var nuevo = new Image();
    nuevo.alt = ''; nuevo.decoding = 'async'; nuevo.src = src;
    nuevo.style.opacity = '0';
    nuevo.style.transition = 'opacity ' + FUNDIDO_MS + 'ms ease';
    nuevo.style.zIndex = '0';
    if (viejo && viejo.nextSibling) card.insertBefore(nuevo, viejo.nextSibling); else card.insertBefore(nuevo, card.firstChild);
    void nuevo.offsetWidth;
    nuevo.style.opacity = '1';
    setTimeout(function () {
      card.querySelectorAll('img').forEach(function (im) { if (im !== nuevo) im.remove(); });
      nuevo.style.transition = ''; nuevo.style.opacity = ''; nuevo.style.zIndex = '';
    }, FUNDIDO_MS + 80);
  }
  function paso(cat) {
    var st = estado[cat];
    if (!visible || document.hidden) { st.t = setTimeout(function () { paso(cat); }, 800); return; }
    var rel = siguiente(cat);
    var grande = 'img/' + rel;
    // se precarga el WebP de 400 px (≈ 20 KB); si faltara, la foto JPG original
    var mini = (window.__imgw && window.__imgw.existe(grande)) ? window.__imgw.url(grande, 400) : grande.replace(/^img\/oct\//, 'img/oct/rot/');
    precargar(mini).then(function (ok) { return ok ? mini : precargar(grande).then(function (ok2) { return ok2 ? grande : null; }); })
      .then(function (src) {
        if (src) {
          st.actual = rel;
          [].forEach.call(cont.querySelectorAll('.cat'), function (c) { if (categoriaDe(c) === cat) cambiarFoto(c, src); });
        }
        st.t = setTimeout(function () { paso(cat); }, PERIODO_MS + Math.random() * JITTER_MS);
      });
  }
  function arrancar() {
    if (arrancado || !window.__tuentiFotosCategoria) return;
    fotos = window.__tuentiFotosCategoria;
    var cards = [].filter.call(cont.querySelectorAll('.cat:not(.cat--clon)'), function (c) { return categoriaDe(c); });
    if (!cards.length) return;
    arrancado = true;
    cards.forEach(function (c, i) {
      var cat = categoriaDe(c), todas = (fotos[cat] || []).slice();
      var img = c.querySelector('img'), actual = img ? (img.getAttribute('src') || '').replace(/^img\//, '') : null;
      if (todas.length < 2) return;
      estado[cat] = { todas: todas, bolsa: [], actual: actual, t: 0 };
      estado[cat].t = setTimeout(function () { paso(cat); }, INICIO_MS + i * ESCALON_MS + Math.random() * 400);
    });
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0.1 }).observe(cont);
  }
  function esperar() {
    var go = function () { setTimeout(arrancar, 0); };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
  }
  document.addEventListener('tuenti:categorias', esperar);
  if (window.__tuentiFotosCategoria) esperar();
})();
