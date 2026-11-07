/* Carrusel de categorías (celular): se desliza solo, despacio, de derecha a izquierda, en bucle.
   - Si se toca o se arrastra, se detiene; retoma a los REANUDAR_MS de soltar y de que pare todo movimiento (inercia incluida).
   - La reanudación NO depende de un evento «suelto»: el bucle mira cada cuadro si el dedo sigue puesto (e.touches)
     y si la fila se movió por fuera. Si por cualquier motivo se perdió el «touchend», un guardia lo da por soltado.
   - prefers-reduced-motion: no se mueve solo (la fila se sigue pudiendo deslizar con el dedo).
   - Bucle sin salto: se duplica el juego de tarjetas (copias aria-hidden, sin foco). */
(function () {
  'use strict';
  var VELOCIDAD = 28;        // px por segundo (≈ una tarjeta cada 5,6 s)
  var REANUDAR_MS = 2500;    // ms sin tocar ni moverse antes de retomar solo
  var ESPERA_INICIAL = 1500; // ms quieto al cargar
  var GUARDIA_MS = 12000;    // dedo «puesto» sin ningún evento táctil durante tanto: se da por soltado
  var cont = document.getElementById('cats');
  if (!cont) return;
  var mqCel = window.matchMedia('(max-width:720px)');
  var mqRed = window.matchMedia('(prefers-reduced-motion: reduce)');
  var clones = [], raf = 0, ultimo = 0, pos = 0, base = 0;
  var tocando = false, ultimoToque = 0, ultimaAccion = 0, visible = true, largoJuego = 0;

  function ahora() { return performance.now(); }
  function limpiar() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    clones.forEach(function (c) { c.remove(); });
    clones = [];
    cont.classList.remove('cats--auto');
  }
  function debeMover() {
    return mqCel.matches && !mqRed.matches && visible && !document.hidden && !tocando &&
      (ahora() - ultimaAccion) > REANUDAR_MS;
  }
  function envolver() {
    if (!largoJuego || !clones.length) return;
    if (cont.scrollLeft >= largoJuego) cont.scrollLeft -= largoJuego;
    else if (cont.scrollLeft <= 0) cont.scrollLeft += largoJuego;
  }
  function paso(t) {
    raf = requestAnimationFrame(paso);
    var dt = Math.min(64, t - (ultimo || t)); ultimo = t;
    var n = ahora();
    // guardia: «dedo puesto» sin señales de vida → se da por soltado
    if (tocando && (n - ultimoToque) > GUARDIA_MS) { tocando = false; ultimaAccion = n; }
    var sl = cont.scrollLeft;
    if (Math.abs(sl - base) > 0.75) {          // se movió algo que no escribimos nosotros (dedo o inercia)
      ultimaAccion = n;
      if (!tocando) { envolver(); sl = cont.scrollLeft; }
      pos = sl; base = sl;
    }
    if (!debeMover()) { pos = sl; base = sl; return; }
    pos += VELOCIDAD * dt / 1000;
    if (largoJuego && pos >= largoJuego) pos -= largoJuego;
    cont.scrollLeft = pos;
    base = cont.scrollLeft;                    // lo que el navegador dejó de verdad (redondeo)
  }

  // dedo / mouse: el estado sale del número de toques activos, no de un solo evento
  function evToque(e) {
    ultimoToque = ahora(); ultimaAccion = ultimoToque;
    tocando = !!(e.touches && e.touches.length);
    if (e.type === 'touchstart' && cont.scrollLeft <= 0 && clones.length) cont.scrollLeft += largoJuego;
  }
  window.addEventListener('touchstart', function (e) { if (cont.contains(e.target)) evToque(e); }, { passive: true, capture: true });
  ['touchmove', 'touchend', 'touchcancel'].forEach(function (nm) {
    window.addEventListener(nm, function (e) { if (tocando) evToque(e); }, { passive: true, capture: true });
  });
  cont.addEventListener('mousedown', function () { tocando = true; ultimoToque = ultimaAccion = ahora(); }, { passive: true });
  window.addEventListener('mouseup', function () { if (tocando) { tocando = false; ultimaAccion = ahora(); } }, { passive: true });
  window.addEventListener('blur', function () { tocando = false; ultimaAccion = ahora(); });
  cont.addEventListener('wheel', function () { ultimaAccion = ahora(); }, { passive: true });
  cont.addEventListener('focusin', function () { ultimaAccion = ahora(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { ultimaAccion = ahora() - REANUDAR_MS + 600; } });

  function armar() {
    limpiar();
    var orig = [].slice.call(cont.querySelectorAll('.cat'));
    if (!mqCel.matches || orig.length < 2) return;
    cont.classList.add('cats--auto');
    if (!mqRed.matches) {
      orig.forEach(function (c) {
        var k = c.cloneNode(true);
        k.setAttribute('aria-hidden', 'true'); k.setAttribute('tabindex', '-1'); k.classList.add('cat--clon');
        cont.appendChild(k); clones.push(k);
      });
      largoJuego = clones[0].offsetLeft - orig[0].offsetLeft;
    }
    cont.scrollLeft = 0; pos = 0; base = 0; tocando = false;
    ultimaAccion = ahora() - REANUDAR_MS + ESPERA_INICIAL;
    if (!mqRed.matches) { ultimo = 0; raf = requestAnimationFrame(paso); }
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0.1 }).observe(cont);
  }
  if (mqCel.addEventListener) { mqCel.addEventListener('change', armar); mqRed.addEventListener('change', armar); }
  window.addEventListener('resize', function () {
    if (clones.length) { var o = cont.querySelector('.cat'); largoJuego = clones[0].offsetLeft - o.offsetLeft; }
  });
  new MutationObserver(function () {
    if (!cont.classList.contains('cats--auto') && cont.querySelector('.cat')) armar();
  }).observe(cont, { childList: true });
  if (cont.querySelector('.cat')) armar();
})();
