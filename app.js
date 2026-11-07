/* ================================================================
   TUENTI · app.js
   Carga marca.json y renderiza. Sirve tres páginas, detectadas por
   los contenedores presentes en el DOM:
     · index.html     → portada
     · catalogo.html  → grilla completa con filtro por categoría
     · producto.html  → ficha, con selector de color por hex

   Reglas duras:
   · Campo faltante o vacío → [[campo]] visible (.ds-missing).
   · Filtro de publicables  → fuera licenciado=true o publicable_web=false,
     PERO hoy desactivado: MODO_MAQUETA=true muestra los 131 (ver más abajo).
   · Fotos de producto a full: nada se superpone a la prenda.
   ================================================================ */
(function () {
  'use strict';

  /* ---------- utilidades ---------- */
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const falta = campo => '<span class="ds-missing">[[' + esc(campo) + ']]</span>';
  const vacio = v => v == null || (typeof v === 'string' && !v.trim()) ||
    (Array.isArray(v) && !v.length);

  function txt(el, valor, campo) {
    if (!el) return;
    if (vacio(valor)) el.innerHTML = falta(campo);
    else el.textContent = valor;
  }

  /* Formato de precio: "$ 45.000" — signo, espacio y punto de miles, sin
     decimales y sin mención de IVA en ninguna parte. El espacio es duro
     ( ) para que el signo nunca se separe de la cifra al saltar de línea. */
  const money = n => '$ ' + Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });
  const waLink = (num, msg) => 'https://wa.me/' + String(num).replace(/[^0-9]/g, '') +
    (msg ? '?text=' + encodeURIComponent(msg) : '');
  const slug = s => String(s).toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const pagina = () => $('legal-docs') ? 'legal'
    : ($('catalogo-lista') ? 'catalogo' : ($('pdp') ? 'producto' : 'index'));

  /* En catálogo y ficha los anclas de la portada vuelven a index.html */
  function href(h) {
    if (!h) return '#';
    if (pagina() !== 'index' && h.charAt(0) === '#' && h !== '#top') return 'index.html' + h;
    return h;
  }

  const tocable = () => window.matchMedia &&
    matchMedia('(hover: none), (pointer: coarse)').matches;

  /* ---------- pantalla de error ---------- */
  function mostrarError(archivo, err) {
    const detalle = err && err.message ? err.message : String(err);
    const box = document.createElement('div');
    box.setAttribute('role', 'alert');
    box.style.cssText = 'position:fixed;inset:0;z-index:999;display:grid;place-items:center;' +
      'padding:2rem;background:var(--c-bg)';
    box.innerHTML =
      '<div style="max-width:48ch;text-align:center;border:1px solid var(--c-alert);' +
      'padding:2rem 1.8rem;background:var(--c-surface)">' +
      '<p style="font-size:var(--fs-eyebrow);text-transform:uppercase;letter-spacing:var(--tr-eyebrow);' +
      'color:var(--c-alert);margin-bottom:1rem">Error de datos</p>' +
      '<h2 style="font-family:var(--font-display);font-weight:var(--w-bold);font-size:1.6rem;' +
      'line-height:var(--lh-tight);margin-bottom:.8rem">No se pudo cargar ' + esc(archivo) + '</h2>' +
      '<p style="font-size:.9rem;color:var(--c-muted)">Revisa que <b>' + esc(archivo) +
      '</b> exista junto a la página y que se abra desde un servidor (http://), no con doble clic.</p>' +
      '<p style="font-family:var(--font-mono);font-size:.72rem;color:var(--c-faint);' +
      'margin-top:1rem;word-break:break-word">Detalle: ' + esc(detalle) + '</p></div>';
    document.body.appendChild(box);
  }

  /* ---------- tokens de marca ---------- */
  function aplicarTokens(tokens) {
    if (!tokens) return;
    const r = document.documentElement;
    Object.keys(tokens).forEach(k => {
      if (k.indexOf('--') === 0 && tokens[k]) r.style.setProperty(k, tokens[k]);
    });
  }

  /* ---------- modo maqueta ----------
     El sitio es hoy una MAQUETA COMPLETA para revisión y aprobación: se
     muestran los 131 diseños, licenciados incluidos. Qué se publica se decide
     después, sobre la maqueta terminada.

     El campo `licenciado` de marca.json SÍ lleva ya la clasificación
     (true = licenciado · false = sin marca · null = dudoso, pendiente de ver
     la prenda). Está como DATO, no como filtro: sirve para el día que se
     decida. Poner MODO_MAQUETA en false reactiva el filtro real de una vez.

     ⚠ Mientras esto sea true, el sitio NO debe indexarse. Las tres páginas
     llevan <meta name="robots" content="noindex, nofollow">. */
  const MODO_MAQUETA = true;

  /* ---------- filtro de publicables (por código, no manual) ---------- */
  const filtroReal = p => p.licenciado !== true && p.publicable_web !== false;
  const publicables = ps => MODO_MAQUETA ? (ps || []).slice() : (ps || []).filter(filtroReal);

  /* Cuántos se ocultarían el día que se apague el modo maqueta. */
  const ocultablesCount = ps => (ps || []).length - (ps || []).filter(filtroReal).length;

  const variantesConFoto = p => (p.variantes || []).filter(v => (v.fotos || [])[0]);
  /* r4 (28/10/2026): tomas de producto = prenda lisa hecha con IA + estampado REAL pegado por código
     (web_tienda/propuestas/rediseno_4_mockup/imagenes_web, solo las aprobadas por Jose; las conecta
     herramientas/conectar_web.py). Si la variante trae `tomas`, la ficha las muestra: primero la prenda
     sola y con flechas las demás (decisión de Jose 15/10/2026). La tarjeta del catálogo y el carrito usan
     la prenda sola cuadrada (`tarjeta`). Donde no hay tomas todo sigue igual, con las fotos reales. */
  const tomasDe = v => (v && Array.isArray(v.tomas) && v.tomas.length) ? v.tomas : null;
  const fotoTarjeta = v => 'img/' + (v.tarjeta || (tomasDe(v) ? tomasDe(v)[0].foto : v.fotos[0]));

  /* ---------- wordmark: TU + ENTI ----------
     La identidad juega con TU-EN-TI: «EN TI» va en el verde de acento y el
     resto en blanco. Es el uso principal del acento en toda la página.
     Se parte por posición, no por texto fijo: si marca.nombre cambia y deja
     de encajar, se pinta entero en blanco en vez de inventar un corte. */
  function wordmark(el, nombre) {
    if (!el) return;
    if (vacio(nombre)) { el.innerHTML = falta('marca.nombre'); return; }
    const n = String(nombre);
    /* El logo oficial (brief p.1) pinta de verde SOLO las dos letras «EN»:
       TU | EN | TI. Antes se pintaban cuatro («ENTI»), que es el doble. */
    const i = n.toUpperCase().indexOf('EN', 1);
    if (i < 1) { el.textContent = n; return; }
    el.innerHTML = esc(n.slice(0, i)) +
      '<span class="wm-acento">' + esc(n.slice(i, i + 2)) + '</span>' +
      esc(n.slice(i + 2));
  }

  /* ================================================================
     CARRITO Y PEDIDO

     Carrito propio, escrito aquí. NO se usa el del módulo `tienda.js`:
     ese guarda solo {nombre, precio, foto, qty} — descarta la talla y la
     referencia—, agrupa por el nombre visible, no tiene «vaciar» ni campo
     de cantidad ni subtotal por línea, y sus funciones internas (chQty,
     quitar) no están expuestas. Además su pie empuja a un checkout con
     formulario de envío, que es F4 y no va en esta fase.
     `tienda.js` queda intacto en disco y ya no se carga.

     ── ALCANCE ──────────────────────────────────────────────────────
     Envío y pasarela de pago son **F4**, no esta fase. El carrito cierra
     por WhatsApp. La costura para meter la pasarela después es
     `cerrarPedido()`: hoy abre WhatsApp; mañana decide entre eso y una
     pasarela sin que haya que rehacer el carrito ni las líneas.

     ── LO QUE EVITA EL FALLO DEL COLOR ──────────────────────────────
     Nada se congela en el marcado. Los botones no llevan data-nombre ni
     data-foto escritos en el render: reciben `activa()` y la llaman EN EL
     CLIC, así que leen la variante seleccionada en ese instante.
     ================================================================ */
  let DATOS = null;

  /* El cajón, el popup de registro y los avisos viven en catalogo.css. Las
     páginas del catálogo lo enlazan; el inicio no, así que se pide aquí. */
  function asegurarCSS() {
    if (document.querySelector('link[href*="catalogo.css"]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = 'catalogo.css';
    document.head.appendChild(l);
  }
  let carVaciarPend = false;

  const ICONO_WA = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3C9 3 3.5 8.5 3.5 15.5c0 2.4.7 4.7 1.9 6.7L3 29l7-1.8c1.9 1 4 1.6 6 1.6 7 0 12.5-5.5 12.5-12.5S23 3 16 3zm0 22c-1.8 0-3.6-.5-5.1-1.4l-.4-.2-4.2 1.1 1.1-4.1-.2-.4C6.4 18.9 6 17.2 6 15.5 6 9.7 10.7 5 16 5s10 4.7 10 10.5S21.3 25 16 25z"/></svg>';

  /* ---------------- almacén ----------------
     Una línea = referencia + color + talla. Esa es la clave: agregar dos
     veces lo mismo suma cantidad; el mismo diseño en otro color o en otra
     talla es otra línea. Se guarda el id, no el nombre visible, para que
     dos diseños homónimos de categorías distintas no se confundan
     («Nirvana in utero» existe en cuatro categorías, con precios distintos). */
  const CAR_KEY = 'tuenti_carrito_v1';
  const claveLinea = it => [it.id, it.color || '', it.talla || ''].join('|');

  function carLeer() {
    try {
      const a = JSON.parse(localStorage.getItem(CAR_KEY) || '[]');
      return Array.isArray(a) ? a.filter(x => x && x.id) : [];
    } catch (e) { return []; }
  }
  function carGuardar(items) {
    try { localStorage.setItem(CAR_KEY, JSON.stringify(items)); } catch (e) { }
    carPintar();
  }
  const carTotal = () => carLeer().reduce((a, x) => a + (+x.precio || 0) * (+x.qty || 0), 0);
  const carUnidades = () => carLeer().reduce((a, x) => a + (+x.qty || 0), 0);

  function carAgregar(p, v, talla) {
    if (!p || !v) return;
    const it = {
      id: p.id, diseno: p.diseno, categoria: p.categoria,
      color: v.color || '', talla: talla || '',
      precio: +p.precio_unidad || 0, foto: fotoTarjeta(v), qty: 1
    };
    const c = carLeer();
    const i = c.findIndex(x => claveLinea(x) === claveLinea(it));
    if (i >= 0) c[i].qty = (+c[i].qty || 0) + 1; else c.push(it);
    carGuardar(c);
    avisar(((DATOS.carrito || {}).aviso_agregado || 'Agregado al carrito') + ': ' +
      p.diseno + (v.color ? ' · ' + v.color : ''));
  }
  function carFijarQty(clave, n) {
    const c = carLeer();
    const i = c.findIndex(x => claveLinea(x) === clave);
    if (i < 0) return;
    const q = Math.max(0, Math.floor(Number(n) || 0));
    if (q === 0) c.splice(i, 1); else c[i].qty = q;
    carGuardar(c);
  }
  const carQuitar = clave => carGuardar(carLeer().filter(x => claveLinea(x) !== clave));
  const carVaciar = () => carGuardar([]);

  /* ---------------- avisos ---------------- */
  function avisar(msg) {
    let t = document.getElementById('aviso-pedido');
    if (!t) {
      t = document.createElement('div');
      t.id = 'aviso-pedido'; t.className = 'aviso-pedido';
      t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('ver');
    clearTimeout(avisar._t);
    avisar._t = setTimeout(() => t.classList.remove('ver'), 2200);
  }

  /* ---------------- mensajes de WhatsApp ---------------- */
  function waItem(p, v, talla) {
    const ped = (DATOS.pedido || {}), marca = (DATOS.marca || {}).nombre || '';
    const L = [];
    L.push((ped.wa_item_intro || 'Hola {marca}, me interesa esta referencia:').replace('{marca}', marca));
    L.push('');
    L.push('• ' + p.diseno + ' · ' + p.categoria);
    if (v && v.color) L.push('  ' + (ped.wa_label_color || 'Color') + ': ' + v.color);
    if (talla) L.push('  ' + (ped.wa_label_talla || 'Talla') + ': ' + talla);
    L.push('  ' + (ped.wa_label_ref || 'Referencia') + ': ' + p.id);
    if (!vacio(p.precio_unidad)) L.push('  ' + money(p.precio_unidad));
    return L.join('\n');
  }

  function waCarrito() {
    const ped = (DATOS.pedido || {}), marca = (DATOS.marca || {}).nombre || '';
    const items = carLeer();
    if (!items.length) return null;
    const L = [];
    L.push((ped.wa_lista_intro || 'Hola {marca}, quiero hacer este pedido:').replace('{marca}', marca));
    items.forEach(it => {
      L.push('');
      L.push('• ' + it.qty + '× ' + it.diseno + ' · ' + it.categoria);
      if (it.color) L.push('  ' + (ped.wa_label_color || 'Color') + ': ' + it.color);
      if (it.talla) L.push('  ' + (ped.wa_label_talla || 'Talla') + ': ' + it.talla);
      L.push('  ' + (ped.wa_label_ref || 'Referencia') + ': ' + it.id);
      L.push('  ' + money((+it.precio || 0) * (+it.qty || 0)));
    });
    L.push('');
    L.push((ped.wa_label_total || 'Total') + ': ' + money(carTotal()));
    return L.join('\n');
  }

  function abrirWa(texto) {
    const num = (DATOS.contacto || {}).whatsapp;
    if (!num) { avisar('Falta el número de WhatsApp'); return; }
    window.open('https://wa.me/' + String(num).replace(/[^0-9]/g, '') +
      '?text=' + encodeURIComponent(texto), '_blank', 'noopener');
  }

  /* ── COSTURA F4 ──────────────────────────────────────────────────
     Único punto de cierre del pedido. Hoy: WhatsApp. Cuando entre la
     pasarela (F4), se decide aquí dentro y ni el carrito ni las líneas
     ni los botones cambian. */
  function cerrarPedido() {
    const texto = waCarrito();
    if (!texto) { avisar((DATOS.carrito || {}).vacio || 'El carrito está vacío.'); return; }
    abrirWa(texto);
  }

  /* ---------------- cajón del carrito ---------------- */
  function carMontar() {
    if (document.getElementById('car')) return;
    asegurarCSS();
    const c = (DATOS.carrito || {});
    const fondo = document.createElement('div');
    fondo.className = 'car-fondo'; fondo.id = 'car-fondo';
    const aside = document.createElement('aside');
    aside.className = 'car'; aside.id = 'car';
    aside.setAttribute('aria-label', c.titulo || 'Carrito');
    aside.innerHTML =
      '<header class="car__cab"><h2 class="car__t">' + esc(c.titulo || 'Tu carrito') + '</h2>' +
      '<button class="car__x" id="car-x" type="button" aria-label="' + esc(c.cerrar || 'Cerrar') + '">&times;</button></header>' +
      '<div class="car__cuerpo" id="car-cuerpo"></div>' +
      '<footer class="car__pie" id="car-pie"></footer>';
    document.body.appendChild(fondo);
    document.body.appendChild(aside);

    fondo.addEventListener('click', carCerrar);
    document.getElementById('car-x').addEventListener('click', carCerrar);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') carCerrar(); });

    /* delegación: +, −, campo editable, quitar, vaciar y enviar */
    aside.addEventListener('click', e => {
      const b = e.target.closest('[data-acc]');
      if (!b) return;
      const clave = b.dataset.k;
      const acc = b.dataset.acc;
      if (acc === 'mas' || acc === 'menos') {
        const it = carLeer().filter(x => claveLinea(x) === clave)[0];
        if (it) carFijarQty(clave, (+it.qty || 0) + (acc === 'mas' ? 1 : -1));
      } else if (acc === 'quitar') carQuitar(clave);
      else if (acc === 'vaciar') { carVaciarPend = true; carPintar(); }
      else if (acc === 'vaciar-no') { carVaciarPend = false; carPintar(); }
      else if (acc === 'vaciar-si') { carVaciarPend = false; carVaciar(); }
      else if (acc === 'enviar') cerrarPedido();
    });
    aside.addEventListener('change', e => {
      const i = e.target.closest('input[data-qty]');
      if (i) carFijarQty(i.dataset.k, i.value);
    });
  }

  function carAbrir() { carMontar(); carPintar(); document.getElementById('car').classList.add('abierto'); document.getElementById('car-fondo').classList.add('abierto'); }
  function carCerrar() {
    carVaciarPend = false;
    const a = document.getElementById('car'), f = document.getElementById('car-fondo');
    if (a) a.classList.remove('abierto');
    if (f) f.classList.remove('abierto');
  }

  function carPintar() {
    /* el contador del nav vive en las tres páginas */
    const n = carUnidades();
    document.querySelectorAll('.t-count').forEach(e => { e.textContent = n; e.dataset.n = n; });

    const cuerpo = document.getElementById('car-cuerpo'), pie = document.getElementById('car-pie');
    if (!cuerpo || !pie) return;
    const c = (DATOS.carrito || {});
    const items = carLeer();

    if (!items.length) {
      cuerpo.innerHTML = '<p class="car-vacio">' + esc(c.vacio || 'Todavía no has agregado nada.') +
        '</p><a class="ds-btn ds-btn--acento-linea" href="catalogo.html">' +
        esc(c.vacio_boton || 'Ver el catálogo') + '</a>';
      pie.innerHTML = '';
      return;
    }

    cuerpo.innerHTML = items.map(it => {
      const k = claveLinea(it);
      const sub = (+it.precio || 0) * (+it.qty || 0);
      const meta = [it.color, it.talla ? (c.label_talla || 'Talla') + ' ' + it.talla : (c.sin_talla || 'Sin talla'), it.categoria]
        .filter(Boolean).map(esc).join(' · ');
      return '<div class="car-item">' +
        '<img class="car-item__foto" src="' + esc(it.foto) + '"' + (window.__imgw ? window.__imgw.attrs(it.foto, 'mini') : '') + ' alt="" loading="lazy" decoding="async">' +
        '<div class="car-item__in">' +
        '<span class="car-item__t">' + esc(it.diseno) + '</span>' +
        '<span class="car-item__m">' + meta + '</span>' +
        '<span class="car-item__ref">' + esc(it.id) + '</span>' +
        '<div class="car-qty" role="group" aria-label="' + esc(c.label_cantidad || 'Cantidad') + '">' +
        '<button type="button" data-acc="menos" data-k="' + esc(k) + '" aria-label="Quitar uno">&minus;</button>' +
        '<input type="number" min="0" step="1" value="' + (+it.qty || 0) + '" data-qty data-k="' + esc(k) + '" aria-label="' + esc(c.label_cantidad || 'Cantidad') + '">' +
        '<button type="button" data-acc="mas" data-k="' + esc(k) + '" aria-label="Añadir uno">+</button>' +
        '</div></div>' +
        '<div class="car-item__der">' +
        '<span class="car-item__sub">' + money(sub) + '</span>' +
        '<button class="car-item__quitar" type="button" data-acc="quitar" data-k="' + esc(k) + '">' +
        esc(c.quitar || 'Quitar') + '</button>' +
        '</div></div>';
    }).join('');

    pie.innerHTML =
      '<div class="car-total"><span>' + esc(c.label_total || 'Total') + '</span>' +
      '<span class="car-total__n">' + money(carTotal()) + '</span></div>' +
      '<button class="ds-btn ds-btn--acento car-enviar" type="button" data-acc="enviar">' +
      ICONO_WA + '<span>' + esc(c.boton_whatsapp || 'Enviar pedido por WhatsApp') + '</span></button>' +
      (carVaciarPend
        ? '<div class="car-confirma" role="alert"><span>' + esc(c.vaciar_confirmar || '¿Vaciar todo el carrito?') + '</span>' +
          '<button class="ds-btn ds-btn--outline" type="button" data-acc="vaciar-no">' + esc(c.vaciar_no || 'No, dejarlo') + '</button>' +
          '<button class="ds-btn ds-btn--acento-linea car-confirma__si" type="button" data-acc="vaciar-si">' + esc(c.vaciar_si || 'Sí, vaciar') + '</button></div>'
        : '<button class="car-vaciar" type="button" data-acc="vaciar">' + esc(c.vaciar || 'Vaciar carrito') + '</button>');
  }

  /* ---------------- botones de acción ----------------
     `activa()` devuelve la variante seleccionada AHORA.
     `tallaActiva()` la talla marcada AHORA (solo la ficha la tiene). */
  function accionesPedido(p, activa, opciones) {
    const o = opciones || {};
    const ped = (DATOS.pedido || {});
    const talla = () => (o.tallaActiva ? o.tallaActiva() : '');
    const caja = document.createElement('div');
    caja.className = 'pedido-acc' + (o.ficha ? ' pedido-acc--ficha' : '');

    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'ds-btn ds-btn--acento-linea pedido-add';
    add.textContent = ped.boton_agregar || 'Agregar al carrito';
    add.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      carAgregar(p, activa(), talla());
    });
    caja.appendChild(add);

    const wa = document.createElement('button');
    wa.type = 'button';
    wa.className = o.ficha ? 'ds-btn ds-btn--acento pedido-wa' : 'pedido-wa pedido-wa--icono';
    wa.setAttribute('aria-label', ped.boton_whatsapp || 'Pedir por WhatsApp');
    wa.innerHTML = ICONO_WA + (o.ficha ? '<span>' + esc(ped.boton_whatsapp || 'Pedir por WhatsApp') + '</span>' : '');
    wa.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      abrirWa(waItem(p, activa(), talla()));
    });
    caja.appendChild(wa);
    return caja;
  }

  /* ================================================================
     TARJETA DE PRODUCTO
     Una tarjeta por DISEÑO. Las fotos de todas sus variantes de color
     se apilan y rotan: con el cursor en escritorio, con los círculos
     o deslizando en móvil. La foto va limpia, sin capa encima.
     ================================================================ */
  /* La foto principal de cada tarjeta se pide solo cuando está a ~300 px de la
     pantalla: la primera vista no baja las 24 de la tanda. */
  const obsFoto = ('IntersectionObserver' in window)
    ? new IntersectionObserver(es => es.forEach(e => {
        if (!e.isIntersecting) return;
        const im = e.target;
        obsFoto.unobserve(im);
        if (im.dataset.src) { im.src = im.dataset.src; delete im.dataset.src; }
      }), { rootMargin: '300px 0px' })
    : null;

  function tarjeta(p, i, colorPref) {
    const vs = variantesConFoto(p);
    /* r4 (29/10/2026): si el catálogo está filtrado por color, la tarjeta arranca en ese color */
    const idx0 = Math.max(0, vs.findIndex(v => colorPref && colorPref.indexOf(v.color) >= 0));
    /* r4e (29/10/2026 14:12:43): catálogo «como las referencias» de Jose (Strada, Wanaawaa, Navissi): foto de la modelo grande,
       nombre y precio debajo, sin etiqueta, sin botones; la prenda sola al pasar el cursor. Solo en catalogo.html (body.cat-ref). */
    const REF = document.body.classList.contains('cat-ref');
    const art = document.createElement('article');
    art.className = 'ds-card';
    art.setAttribute('data-reveal', '');
    if (i % 3) art.setAttribute('data-delay', String(i % 3));

    const media = document.createElement('div');
    media.className = 'ds-card__media';
    vs.forEach((v, k) => {
      const im = new Image();
      im.className = 'ds-card__img' + (k === 0 ? ' is-on' : '');
      im.alt = p.diseno + ' · ' + (v.color || '');
      im.loading = 'lazy'; im.decoding = 'async';
      /* r4f: en el catálogo «como las referencias» la prenda sola de cada tarjeta se pide de una («eager»: con «lazy» y fuera
         de la página puede no cargar nunca); son 24 por tanda, ≈ 20-60 KB cada una */
      if (k === 0 && REF) { im.loading = 'eager'; im.src = fotoTarjeta(v); }
      /* solo la primera foto se pide al pintar; las demás al cambiar de color */
      else if (k === 0 && !obsFoto) im.src = fotoTarjeta(v);
      else im.dataset.src = fotoTarjeta(v);
      if (k === 0 && obsFoto && !REF) obsFoto.observe(im);
      im.onerror = () => { im.remove(); };
      media.appendChild(im);
    });

    const body = document.createElement('div');
    body.className = 'ds-card__body';

    const precioHTML = vacio(p.precio_unidad) ? falta('precio_unidad') : money(p.precio_unidad);
    const nombreColor = () => vs[idx] ? (vs[idx].color || '') : '';

    body.innerHTML =
      '<span class="ds-card__tag">' + esc(p.categoria || '') + '</span>' +
      '<h3 class="ds-card__title"><a href="producto.html?id=' + encodeURIComponent(p.id) + '">' + esc(p.diseno || '') + '</a></h3>' +
      '<div class="ds-card__price">' + precioHTML + '</div>' +
      '<div class="ds-card__desc"><span class="ds-card__color"></span></div>';

    /* un solo control de color (alto táctil 48 px): cambia a la foto siguiente */
    const dots = document.createElement('div');
    dots.className = 'ds-card__dots';
    const cambiar = document.createElement('button');
    cambiar.type = 'button';
    cambiar.className = 'ds-card__cambiar';
    cambiar.innerHTML = '<span class="ds-card__sw" aria-hidden="true"></span><span class="ds-card__sw-t"></span>';
    cambiar.addEventListener('click', e => { e.stopPropagation(); parar(); ver(idx + 1); });
    dots.appendChild(cambiar);
    if (REF) {
      const d = body.querySelector('.ds-card__desc');
      if (d && vs.length > 1) d.innerHTML = '<span class="ds-card__ncol">' + vs.length + ' colores</span>';
    } else if (vs.length > 1) {
      body.appendChild(dots);
      const d = body.querySelector('.ds-card__desc'); if (d) d.remove();
    }

    /* Acciones. Antes iban con data-nombre/data-foto ESCRITOS AQUÍ desde
       vs[0]: tienda.js los leía en el clic, pero ver() nunca los tocaba, así
       que el pedido salía siempre con la primera variante y sin color.
       Ahora se le pasa una función que lee `idx` en el momento del clic. */
    if (!REF) body.appendChild(accionesPedido(p, () => vs[idx]));

    art.appendChild(media); art.appendChild(body);

    /* --- rotación de color --- */
    let idx = 0, timer = null, listo = false;
    /* r4 (29/10/2026): las fotos «puesta» también llevan .ds-card__img; la rotación de colores solo cuenta las de la prenda */
    const imgs = () => media.querySelectorAll('.ds-card__img:not(.ds-card__img--puesta)');
    const etiqueta = body.querySelector('.ds-card__color');

    function ver(k) {
      const n = imgs().length; if (!n) return;
      idx = (k + n) % n;
      imgs().forEach((im, j) => im.classList.toggle('is-on', j === idx));
      const imAct = imgs()[idx];
      if (listo && imAct && imAct.dataset.src) { imAct.src = imAct.dataset.src; delete imAct.dataset.src; }
      const cv = vs[idx] || {};
      if (vs.length > 1) {
        const sw = cambiar.querySelector('.ds-card__sw');
        sw.style.background = cv.hex || '';
        sw.classList.toggle('ds-card__sw--sin', !cv.hex);
        cambiar.querySelector('.ds-card__sw-t').textContent = (cv.color || '') + ' · ' + (idx + 1) + ' de ' + vs.length;
        cambiar.setAttribute('aria-label', 'Cambiar color de ' + (p.diseno || '') + ': ahora ' + (cv.color || '') +
          ', ' + (idx + 1) + ' de ' + vs.length);
      }
      if (etiqueta && !(REF && vs.length > 1)) etiqueta.textContent = nombreColor();
      if (typeof sincronizarPuesta === 'function') sincronizarPuesta();
    }
    function arrancar() {
      if (vs.length < 2 || timer) return;
      timer = setInterval(() => ver(idx + 1), 900);
    }
    function parar() { clearInterval(timer); timer = null; }

    /* r4 (29/10/2026): «puesta» = la toma «En modelo» de CADA color (antes solo si el diseño tenía un color).
       Escritorio: con el cursor encima; celular: botón «Puesta / Prenda» sobre la foto. La foto se pide solo al usarla. */
    const puestaDe = v => ((v && tomasDe(v)) || []).filter(t => t.vista === 'En modelo')[0];
    const puestas = vs.map(v => {
      const t = puestaDe(v); if (!t) return null;
      const im2 = new Image(); im2.className = 'ds-card__img ds-card__img--puesta'; im2.alt = p.diseno + ' · en modelo';
      /* r4e: en el catálogo «como las referencias» esta foto se pide antes de que la tarjeta entre a la página;
         con loading="lazy" una imagen fuera del documento puede no cargar nunca (tarjeta en blanco): ahí va «eager» */
      im2.loading = REF ? 'eager' : 'lazy'; im2.decoding = 'async'; im2.dataset.src = 'img/' + t.foto; im2.onerror = () => { im2.remove(); };
      media.appendChild(im2); return im2;
    });
    const etq = (DATOS && DATOS.catalogo) || {};
    let btnPuesta = null;
    if (puestas.some(Boolean)) {
      btnPuesta = document.createElement('button');
      btnPuesta.type = 'button'; btnPuesta.className = 'ds-card__puesta'; btnPuesta.setAttribute('aria-pressed', 'false');
      btnPuesta.textContent = etq.boton_puesta || 'Puesta';
      btnPuesta.setAttribute('aria-label', 'Ver ' + (p.diseno || '') + ' puesta en la modelo');
      btnPuesta.addEventListener('click', e => { e.stopPropagation(); mostrarPuesta(!media.classList.contains('ver-puesta')); });
      media.appendChild(btnPuesta);
    }
    function sincronizarPuesta() {
      puestas.forEach((im2, j) => { if (im2) im2.classList.toggle('is-on', j === idx); });
      const hay = !!puestas[idx];
      if (!hay) media.classList.remove('ver-puesta');
      if (btnPuesta) { btnPuesta.hidden = !hay; if (!hay) btnPuesta.setAttribute('aria-pressed', 'false'); }
      if (hay && media.classList.contains('ver-puesta')) cargarPuesta();
    }
    function cargarPuesta() {
      const im2 = puestas[idx]; if (im2 && im2.dataset.src) { im2.src = im2.dataset.src; delete im2.dataset.src; }
    }
    function mostrarPuesta(on) {
      if (on && !puestas[idx]) return;
      if (on) cargarPuesta();
      media.classList.toggle('ver-puesta', on);
      if (btnPuesta) { btnPuesta.setAttribute('aria-pressed', String(on)); btnPuesta.textContent = on ? (etq.boton_prenda || 'Prenda') : (etq.boton_puesta || 'Puesta'); }
    }

    ver(idx0);
    listo = true;

    if (REF && !tocable()) {
      /* r4f (29/10/2026 14:21:49): decisión de Jose del 15/10/2026 22:52:02, que él recordó hoy: la foto de entrada es la PRENDA SOLA;
         la modelo sale al pasar el cursor (en celular, en la ficha con las flechas). Sin rotación de colores. */
      art.addEventListener('mouseenter', () => { if (puestas[idx]) mostrarPuesta(true); });
      art.addEventListener('mouseleave', () => mostrarPuesta(false));
    } else if (!tocable()) {
      art.addEventListener('mouseenter', arrancar);
      art.addEventListener('mouseleave', () => { parar(); ver(idx0); });
      if (puestas.some(Boolean)) {
        art.addEventListener('mouseenter', () => mostrarPuesta(true));
        art.addEventListener('mouseleave', () => mostrarPuesta(false));
      }
    } else {
      /* móvil: deslizar sobre la foto cambia de color */
      let x0 = null;
      media.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
      media.addEventListener('touchend', e => {
        if (x0 == null) return;
        const dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 30) { ver(idx + (dx < 0 ? 1 : -1)); }
        x0 = null;
      }, { passive: true });
    }

    /* abrir la ficha del diseño (foto y título) con el color que se está viendo */
    const irFicha = () => {
      location.href = 'producto.html?id=' + encodeURIComponent(p.id) + '&color=' + encodeURIComponent((vs[idx] || {}).color || '');
    };
    media.style.cursor = 'pointer';
    media.addEventListener('click', irFicha);
    const enlaceT = body.querySelector('.ds-card__title a');
    if (enlaceT) enlaceT.addEventListener('click', e => { e.preventDefault(); irFicha(); });

    return art;
  }

  /* ---------- estado abierto/cerrado ----------
     r3 (15/10/2026): usa la hora de BOGOTÁ (Intl, timeZone America/Bogota), no la del
     aparato; sabe «hoy / mañana / el <día>» y devuelve la fila de horario de hoy.
     `fecha` es opcional (para probar con horas simuladas). */
  function estadoApertura(hs, fecha) {
    if (!Array.isArray(hs) || !hs.length) return null;
    const NOMBRES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const mapa = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, 'miércoles': 3, jueves: 4, viernes: 5, sabado: 6, 'sábado': 6 };
    const f = fecha instanceof Date ? fecha : new Date();
    const pt = {};
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', weekday: 'short',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(f).forEach(x => { pt[x.type] = x.value; });
    const hoy = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(pt.weekday);
    const ahora = (Number(pt.hour) % 24) * 60 + Number(pt.minute);
    const dias = t => {
      t = (t || '').toLowerCase();
      const fnd = Object.keys(mapa).filter(k => t.includes(k));
      if (t.includes(' a ') && fnd.length >= 2) {
        let a = mapa[fnd[0]], b = mapa[fnd[fnd.length - 1]], r = [];
        for (let i = a; ; i = (i + 1) % 7) { r.push(i); if (i === b) break; }
        return r;
      }
      return fnd.map(k => mapa[k]);
    };
    /* Lee «8:30 a.m. – 6:00 p.m.» y también «8:30 – 18:00». */
    const horas = t => {
      const m = (t || '').match(/(\d{1,2}):(\d{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?)?/gi);
      if (!m || m.length < 2) return null;
      const p = s => {
        const x = s.match(/(\d{1,2}):(\d{2})/);
        let h = +x[1];
        const suf = (s.match(/([ap])\.?\s*m\.?/i) || [])[1];
        if (suf) {
          const pm = suf.toLowerCase() === 'p';
          if (pm && h < 12) h += 12;
          if (!pm && h === 12) h = 0;
        }
        return h * 60 + (+x[2]);
      };
      return [p(m[0]), p(m[1])];
    };
    const fmt = x => {
      const h = Math.floor(x / 60) % 24, m = x % 60;
      return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + (h >= 12 ? 'p. m.' : 'a. m.');
    };
    const tabla = [[], [], [], [], [], [], []], filaDe = [-1, -1, -1, -1, -1, -1, -1];
    hs.forEach((fila, i) => {
      const hr = horas(fila.horas); if (!hr) return;
      dias(fila.dias).forEach(d => { tabla[d].push(hr); if (filaDe[d] < 0) filaDe[d] = i; });
    });
    const base = { fila: filaDe[hoy], dia: hoy };
    const win = tabla[hoy].filter(w => ahora >= w[0] && ahora < w[1])[0];
    if (win) return Object.assign(base, { abierto: true, texto: 'Abierto ahora · cierra a las ' + fmt(win[1]) });
    const prox = tabla[hoy].filter(w => w[0] > ahora).sort((a, b) => a[0] - b[0])[0];
    if (prox) return Object.assign(base, { abierto: false, texto: 'Cerrado · abre hoy a las ' + fmt(prox[0]) });
    for (let i = 1; i <= 7; i++) {
      const d = (hoy + i) % 7;
      if (!tabla[d].length) continue;
      const w = tabla[d].slice().sort((a, b) => a[0] - b[0])[0];
      const cuando = i === 1 ? 'mañana' : 'el ' + NOMBRES[d];
      return Object.assign(base, { abierto: false, texto: 'Cerrado · abre ' + cuando + ' a las ' + fmt(w[0]) });
    }
    return Object.assign(base, { abierto: false, texto: 'Cerrado' });
  }

  /* ---------- héroe rotativo ---------- */
  function heroBanner(fotos, intervalo) {
    const cont = $('hero-foto'); if (!cont) return;
    const cands = (fotos || []).filter((v, i, a) => v && a.indexOf(v) === i);
    const A = document.createElement('div'), B = document.createElement('div');
    A.className = 'hero-capa'; B.className = 'hero-capa';
    cont.append(A, B);
    const L = [A, B]; let cur = 0, idx = 0; const ok = []; let pend = cands.length;
    if (!pend) return;
    /* r3 (peso): el héroe pide primero SOLO su primera foto, en WebP y con prioridad alta; las demás se piden de a una,
       justo antes de cada cambio (antes se bajaban todas de golpe). */
    const urlH = s => (window.__imgw ? window.__imgw.url(s, 800) : s);
    const cargar = (s, alta) => new Promise(res => {
      const im = new Image(); im.decoding = 'async';
      if (alta) im.fetchPriority = 'high';
      im.onload = () => res(urlH(s)); im.onerror = () => { if (urlH(s) !== s) { const i2 = new Image(); i2.onload = () => res(s); i2.onerror = () => res(null); i2.src = s; } else res(null); };
      im.src = urlH(s);
    });
    const rm = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
    (async () => {
      let primera = null, i0 = 0;
      for (; i0 < cands.length && !primera; i0++) primera = await cargar(cands[i0], true);
      if (!primera) return;
      L[0].style.backgroundImage = 'url("' + primera + '")'; L[0].classList.add('on');
      if (cands.length < 2 || rm) return;
      let idx = i0 - 1;
      setInterval(async () => {
        for (let n = 0; n < cands.length; n++) {
          idx = (idx + 1) % cands.length;
          const u = await cargar(cands[idx], false);
          if (!u) continue;
          const nx = L[1 - cur];
          nx.style.backgroundImage = 'url("' + u + '")';
          nx.classList.add('on'); L[cur].classList.remove('on'); cur = 1 - cur;
          break;
        }
      }, Number(intervalo) > 1000 ? Number(intervalo) : 4500);
    })();
  }

  /* ---------- menú móvil ---------- */
  function menuMovil() {
    const b = $('burger'), m = $('menu'), bd = $('menu-bd'), x = $('menu-x');
    if (!b || !m) return;
    const abrir = v => {
      m.classList.toggle('is-open', v);
      bd.classList.toggle('is-open', v);
      b.setAttribute('aria-expanded', String(v));
      document.body.style.overflow = v ? 'hidden' : '';
    };
    b.addEventListener('click', () => abrir(!m.classList.contains('is-open')));
    x.addEventListener('click', () => abrir(false));
    bd.addEventListener('click', () => abrir(false));
    m.addEventListener('click', e => { if (e.target.closest('a')) abrir(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') abrir(false); });
  }

  /* ---------- reveal por scroll ---------- */
  let io;
  function observarReveal() {
    const els = document.querySelectorAll('[data-reveal]:not(.in)');
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
    if (!io) io = new IntersectionObserver(es => {
      es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    els.forEach(e => io.observe(e));
  }

  /* ================================================================
     PARTES COMPARTIDAS
     ================================================================ */
  function pintarComunes(d) {
    aplicarTokens(d.tokens);
    const marca = d.marca || {}, nombre = marca.nombre || '';
    const wa = (d.contacto || {}).whatsapp;
    const red = d.redes || {};

    const md = document.querySelector('meta[name="description"]');
    if (md) md.content = marca.descripcion_seo || '';

    txt($('anuncio'), d.anuncio, 'anuncio');
    wordmark($('nav-logo'), nombre);
    wordmark($('menu-logo'), nombre);

    const nav = d.nav || {};
    const pintarEnlaces = (cont, arr) => {
      if (!cont) return;
      if (vacio(arr)) { cont.innerHTML = falta('nav.enlaces'); return; }
      cont.innerHTML = arr.map(l =>
        '<a href="' + esc(href(l.href)) + '">' + esc(l.texto || '') + '</a>').join('');
    };
    pintarEnlaces($('nav-links'), nav.enlaces);
    pintarEnlaces($('menu-links'), nav.enlaces);
    const cta = nav.cta || {};
    txt($('nav-cta'), cta.texto, 'nav.cta.texto');
    txt($('menu-cta'), cta.texto, 'nav.cta.texto');
    if (cta.href) { $('nav-cta').href = href(cta.href); $('menu-cta').href = href(cta.href); }
    menuMovil();

    /* pie */
    wordmark($('pie-logo'), nombre);
    const pie = d.pie || {}, cols = $('pie-cols');
    (pie.columnas || []).forEach(cl => {
      const div = document.createElement('div');
      div.className = 'ds-footer__col';
      div.innerHTML = '<b>' + esc(cl.titulo || '') + '</b>' +
        (cl.enlaces || []).map(l => '<a href="' + esc(href(l.href)) + '">' + esc(l.texto || '') + '</a>').join('');
      cols.appendChild(div);
    });
    const colRedes = document.createElement('div');
    colRedes.className = 'ds-footer__col';
    colRedes.innerHTML = '<b>' + esc(pie.titulo_redes || 'Síguenos') + '</b>';
    ['instagram', 'tiktok', 'facebook'].forEach(k => {
      if (red[k]) colRedes.insertAdjacentHTML('beforeend',
        '<a href="' + esc(red[k]) + '" target="_blank" rel="noopener">' +
        k.charAt(0).toUpperCase() + k.slice(1) + '</a>');
    });
    if (!red.instagram && !red.tiktok && !red.facebook) colRedes.insertAdjacentHTML('beforeend', falta('redes'));
    cols.appendChild(colRedes);
    txt($('pie-nombre'), [nombre, marca.ciudad].filter(Boolean).join(' · '), 'marca.nombre');
    txt($('pie-legal'), pie.linea_legal, 'pie.linea_legal');

    /* flotantes */
    const arr = $('arriba');
    if (arr) {
      arr.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
      const ref = document.querySelector('.hero') || document.querySelector('.ds-nav');
      if ('IntersectionObserver' in window && ref) {
        new IntersectionObserver(es => arr.classList.toggle('ver', !es[0].isIntersecting),
          { threshold: .02 }).observe(ref);
      }
    }
    const waf = $('wa-flota');
    if (waf) {
      if (wa) waf.href = waLink(wa, 'Hola ' + nombre + ', tengo una consulta.');
      else {
        waf.removeAttribute('href');
        waf.setAttribute('aria-disabled', 'true');
        waf.title = 'Falta contacto.whatsapp en marca.json';
      }
    }

    if (window.Tienda) {
      Tienda.init({
        nombre: nombre, whatsapp: wa || '',
        /* El módulo abre un overlay de registro a los 700 ms de cargar
           (tienda.js: cfg.registro por defecto true → mostrarReg()). Ocupa el
           viewport ENTERO y es lo primero que ve quien entra. En una maqueta
           para revisión estorba, y además el registro no lleva a ninguna parte:
           guarda en localStorage y no hay backend. Se apaga por su propia API,
           sin tocar tienda.js (que es módulo del export). */
        registro: false,
        regVideo: 'animaciones/registro-ilustracion.mp4',
        regPoster: 'animaciones/reg-poster.jpg'
      });
    }
  }

  /* ================================================================
     TEMPORIZADOR DEL PRÓXIMO LANZAMIENTO
     Se calcula solo desde la fecha actual: no hay fecha fija que expire.
     ================================================================ */
  function proximoLanzamiento(dias, hhmm) {
    const validos = (Array.isArray(dias) && dias.length ? dias : [3, 6])
      .map(Number).filter(n => n >= 0 && n <= 6);
    const partes = String(hhmm || '00:00').split(':');
    const H = Number(partes[0]) || 0, M = Number(partes[1]) || 0;
    const ahora = new Date();
    for (let i = 0; i <= 7; i++) {
      const c = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + i, H, M, 0, 0);
      if (validos.indexOf(c.getDay()) >= 0 && c.getTime() > ahora.getTime()) return c;
    }
    return null;
  }

  function pintarProximo(d) {
    const px = d.proximo || {};
    /* rediseño 14/10/2026: «Diseños nuevos» en blanco y «cada …» en verde */
    const pt = $('prox-titulo'), mt = !vacio(px.titulo) && String(px.titulo).match(/^(.*?)\s+(cada\s.+)$/i);
    if (mt) pt.innerHTML = esc(mt[1]) + '<span>' + esc(mt[2]) + '</span>';
    else txt(pt, px.titulo, 'proximo.titulo');
    txt($('prox-label'), px.candado_texto, 'proximo.candado_texto');

    /* fotos borrosas */
    const cf = $('prox-fotos');
    if (vacio(px.fotos)) cf.innerHTML = '<div><b>?</b></div><div><b>?</b></div><div><b>?</b></div>';
    else px.fotos.slice(0, 3).forEach(src => {
      const div = document.createElement('div');
      const im = new Image(); im.alt = ''; im.src = src; im.loading = 'lazy';
      div.appendChild(im);
      const q = document.createElement('b'); q.textContent = '?'; div.appendChild(q);
      cf.appendChild(div);
    });

    /* reloj */
    const reloj = $('prox-reloj'), capa = document.querySelector('.prox-capa');
    const et = px.etiquetas_tiempo || {};
    let objetivo = proximoLanzamiento(px.dias_lanzamiento, px.hora_lanzamiento);

    function llegaron() {
      capa.innerHTML =
        '<div class="prox-llego">' +
        '<h3>' + (vacio(px.llegaron_titulo) ? falta('proximo.llegaron_titulo') : esc(px.llegaron_titulo)) + '</h3>' +
        '<p>' + (vacio(px.llegaron_texto) ? falta('proximo.llegaron_texto') : esc(px.llegaron_texto)) + '</p>' +
        '<a class="ds-btn ds-btn--light" href="' + esc(px.llegaron_href || 'catalogo.html') + '">' +
        (vacio(px.llegaron_boton) ? falta('proximo.llegaron_boton') : esc(px.llegaron_boton)) + '</a></div>';
    }

    function tic() {
      if (!objetivo) { llegaron(); return; }
      let ms = objetivo.getTime() - Date.now();
      if (ms <= 0) {
        /* al llegar a cero no se muestra un contador en negativo:
           se pasa al estado «ya llegaron» y se recalcula el siguiente */
        llegaron();
        setTimeout(() => {
          objetivo = proximoLanzamiento(px.dias_lanzamiento, px.hora_lanzamiento);
        }, 60000);
        return;
      }
      const s = Math.floor(ms / 1000);
      const p = [[Math.floor(s / 86400), et.dias || 'días'],
                 [Math.floor(s / 3600) % 24, et.horas || 'horas'],
                 [Math.floor(s / 60) % 60, et.minutos || 'min'],
                 [s % 60, et.segundos || 'seg']];
      reloj.innerHTML = p.map(x =>
        '<div class="prox-caja"><b>' + String(x[0]).padStart(2, '0') + '</b><span>' + esc(x[1]) + '</span></div>'
      ).join('');
    }
    tic(); setInterval(tic, 1000);

    /* La rejilla de 6 huecos de «ropa puesta» se retiró: eran seis
       marcadores vacíos justo debajo del contador, que es lo que esta
       sección tiene que hacer protagonista. Ese contenido lo cubre ahora
       el bloque de redes con los reels reales. */
  }

  /* ================================================================
     r3 · INICIO: anuncio en una línea, historia aprobada, ubicación
     ================================================================ */
  const reducido = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* Anuncio: una sola línea. Si el texto no cabe, rueda lento (CSS) y se
     detiene con prefers-reduced-motion; el texto no se acorta ni cambia. */
  function anuncioMarquesina() {
    const box = $('anuncio'); if (!box) return;
    const t = (box.textContent || '').trim(); if (!t || box.querySelector('.ds-announce__pista')) return;
    const armar = () => {
      box.textContent = '';
      box.classList.remove('rueda');
      const pista = document.createElement('div'); pista.className = 'ds-announce__pista';
      const s1 = document.createElement('span'); s1.className = 'ds-announce__t'; s1.textContent = t;
      pista.appendChild(s1); box.appendChild(pista);
      if (s1.offsetWidth > box.clientWidth - 32) {
        const s2 = s1.cloneNode(true); s2.setAttribute('aria-hidden', 'true'); pista.appendChild(s2);
        pista.style.setProperty('--dur', Math.max(18, Math.round(s1.offsetWidth / 38)) + 's');
        box.classList.add('rueda');
      }
    };
    armar();
    let w = box.clientWidth, tm;
    window.addEventListener('resize', () => {
      clearTimeout(tm);
      tm = setTimeout(() => { if (box.clientWidth !== w) { w = box.clientWidth; armar(); } }, 150);
    });
  }

  /* El botón flotante de WhatsApp se aparta mientras el héroe (que ya trae su
     propio botón de WhatsApp) está a la vista: no tapa la foto. */
  function waFlotaEnHero() {
    const hero = document.querySelector('.hero'), wa = $('wa-flota');
    if (!hero || !wa || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(es => wa.classList.toggle('en-hero', es[0].isIntersecting),
      { threshold: .35 }).observe(hero);
  }

  /* Historia: diseño aprobado por Jose (marco lima inclinado, «Veinte, / veinte»,
     TU-EN-TI en negrita, cierre manuscrito). Texto SIEMPRE el de marca.json. */
  function pintarHistoria(h) {
    h = h || {};
    const tt = $('hist-titulo');
    const m = !vacio(h.titulo) && String(h.titulo).match(/^([^,]+,)\s*(.+)$/);
    if (m) tt.innerHTML = esc(m[1]) + '<span>' + esc(m[2]) + '</span>';
    else txt(tt, h.titulo, 'historia.titulo');
    const cu = $('hist-texto');
    if (vacio(h.texto)) cu.innerHTML = falta('historia.texto');
    else cu.innerHTML = String(h.texto).split(/\n\s*\n/).filter(s => s.trim()).map(par => {
      let x = esc(par.trim());
      x = x.replace(/TU-EN-TI/g, '<b>TU-EN-TI</b>');
      x = x.replace(/(Eso es saber ponerse la camiseta\.)\s*$/, '<span class="cierre">$1</span>');
      return '<p>' + x + '</p>';
    }).join('');
    txt($('hist-btn'), h.boton, 'historia.boton');
    const fo = $('hist-foto');
    if (fo) {
      if (h.foto) { const im = new Image(); im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; im.src = h.foto; fo.appendChild(im); }
      else fo.innerHTML = falta('historia.foto');
    }
  }

  /* Ubicación «Dónde y cuándo»: solo datos de marca.json (+ «2.º piso», dicho por
     Jose en el encargo; no está en marca.json → ver lista de pendientes). */
  function pintarLocal(d) {
    const loc = d.local || {}, c = d.contacto || {}, nombre = (d.marca || {}).nombre || '';
    txt($('local-titulo'), loc.titulo, 'local.titulo');
    $('dir-label').textContent = 'Dirección';
    txt($('dir-val'), loc.direccion, 'local.direccion');

    /* horario + estado en vivo (hora de Bogotá) */
    const hor = $('horario');
    if (vacio(loc.horario_semana)) hor.innerHTML = '<div class="hfila">' + falta('local.horario_semana') + '</div>';
    else loc.horario_semana.forEach(f => hor.insertAdjacentHTML('beforeend',
      '<div class="hfila"><span class="d">' + esc(f.dias) + '</span><span class="h">' + esc(f.horas) + '</span></div>'));
    const a = $('abre');
    const refrescar = () => {
      const est = estadoApertura(loc.horario_semana);
      if (!est) return;
      a.style.display = 'inline-flex';
      a.classList.toggle('abierto', est.abierto); a.classList.toggle('cerrado', !est.abierto);
      $('abre-txt').textContent = est.texto;
      Array.prototype.forEach.call(hor.children, (el, i) => el.classList.toggle('hoy', i === est.fila));
    };
    refrescar(); setInterval(refrescar, 30000);

    /* WhatsApp «voy en camino» */
    const dir = loc.direccion, btnV = $('btn-voy');
    if (c.whatsapp) {
      btnV.href = waLink(c.whatsapp, 'Hola ' + nombre + ', voy en camino al local');
      btnV.textContent = 'Voy en camino';
      btnV.setAttribute('aria-label', 'Avisar por WhatsApp que voy en camino al local');
    } else btnV.style.display = 'none';

    /* UN solo dibujo propio = el mapa. Al tocarlo abre Google Maps con la dirección de marca.json
       (búsqueda por dirección, sin coordenadas). El recorrido (dirección → centro comercial → piso → locales)
       se dibuja dentro del mismo dibujo; sin calles ni puntos de referencia inventados. */
    const dib = $('loc-mapa');
    if (dib && !dir) dib.style.display = 'none';
    if (dib && dir) {
      dib.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(dir);
      dib.setAttribute('aria-label', 'Abrir en Google Maps: ' + dir);
      const partes = String(dir).split(',').map(s => s.trim());
      const pasos = [
        ['Dirección', partes[0]],
        ['Llegas a', partes[1]],
        ['Subes al', '2.º piso'],
        ['Locales', (partes[2] || '').replace(/^Locales\s+/i, '')]
      ].filter(p => p[1]);
      const ruta = document.getElementById('lm-ruta'), nodos = document.getElementById('lm-nodos'), pinG = document.getElementById('lm-pin');
      if (ruta && nodos && pinG && pasos.length) {
        const L = ruta.getTotalLength();
        ruta.style.setProperty('--len', L.toFixed(1));
        const n = pasos.length;
        let html = '';
        pasos.forEach((p, i) => {
          const pt = ruta.getPointAtLength(L * (n === 1 ? 1 : i / (n - 1)));
          const x = pt.x.toFixed(1), y = pt.y.toFixed(1), ult = i === n - 1;
          const lado = ult ? 'end' : 'start', dx = ult ? -16 : 12;
          html += '<g class="lm-nodo" style="--i:' + i + '">' + (ult ? '' : '<circle cx="' + x + '" cy="' + y + '" r="6"/>') +
            '<text class="lm-cap" text-anchor="' + lado + '" x="' + (pt.x + dx).toFixed(1) + '" y="' + (pt.y + (ult ? -15 : 14)).toFixed(1) + '">' + esc(p[0]) + '</text>' +
            '<text class="lm-val" text-anchor="' + lado + '" x="' + (pt.x + dx).toFixed(1) + '" y="' + (pt.y + (ult ? 0 : 27)).toFixed(1) + '">' + esc(p[1]) + '</text></g>';
          if (ult) {
            pinG.setAttribute('transform', 'translate(' + (pt.x - 13.2).toFixed(1) + ',' + (pt.y - 35.2).toFixed(1) + ') scale(.55)');
            pinG.querySelectorAll('.lm-onda').forEach(o => { o.setAttribute('cx', 24); o.setAttribute('cy', 64); o.setAttribute('r', 10); });
          }
        });
        nodos.innerHTML = html;
      }
    }

    /* pin animado: cae y pulsa al entrar en pantalla */
    const pin = $('loc-mapa');
    if (pin) {
      if (!('IntersectionObserver' in window) || reducido()) pin.classList.add('on');
      else {
        const ioP = new IntersectionObserver(es => {
          if (es[0].isIntersecting) { pin.classList.add('on'); ioP.disconnect(); }
        }, { threshold: .5 });
        ioP.observe(pin);
      }
    }

    /* recorrido de 4 pasos que se dibuja al hacer scroll */
    const caja = $('ruta'), lista = $('ruta-pasos');
    if (caja && lista) {
      const partes = String(dir || '').split(',').map(s => s.trim());
      const pasos = [
        ['Dirección', partes[0] || 'Carrera 10 #9-37'],
        ['Llegas a', partes[1] || 'Centro Comercial El Gran San'],
        ['Subes al', '2.º piso'],
        ['Locales', (partes[2] || 'Locales 2152 y 2153').replace(/^Locales\s+/i, '')]
      ];
      lista.innerHTML = pasos.map((p, i) =>
        '<li class="ruta__paso"><span class="ruta__n" aria-hidden="true">' + (i + 1) + '</span>' +
        '<span class="ruta__t"><small>' + esc(p[0]) + '</small><b>' + esc(p[1]) + '</b></span></li>').join('');
      const items = Array.prototype.slice.call(lista.children);
      const poner = p => {
        caja.style.setProperty('--p', p.toFixed(3));
        items.forEach((li, i) => li.classList.toggle('on', p >= i / (items.length - 1) - 0.001));
      };
      if (reducido() || !('IntersectionObserver' in window)) poner(1);
      else {
        poner(0);
        let raf = 0;
        const calc = () => {
          raf = 0;
          const r = caja.getBoundingClientRect(), vh = window.innerHeight || 800;
          poner(Math.max(0, Math.min(1, (vh * 0.85 - r.top) / Math.max(r.height, vh * 0.45))));
        };
        const pedir = () => { if (!raf) raf = requestAnimationFrame(calc); };
        window.addEventListener('scroll', pedir, { passive: true });
        window.addEventListener('resize', pedir);
        pedir();
      }
    }
  }

  /* ================================================================
     PORTADA
     ================================================================ */
  function pintarIndex(d) {
    const marca = d.marca || {}, nombre = marca.nombre || '';
    const wa = (d.contacto || {}).whatsapp;
    document.title = [nombre, marca.tipo].filter(Boolean).join(' — ') || '—';
    anuncioMarquesina(); waFlotaEnHero();

    const hero = d.hero || {};
    txt($('hero-titulo'), hero.titulo, 'hero.titulo');
    txt($('hero-baja'), hero.bajada, 'hero.bajada');
    txt($('hero-btn'), hero.boton, 'hero.boton');
    heroBanner(hero.fotos, hero.intervalo_ms);
    /* rediseño 13/10/2026: antetítulo manuscrito, sello, botón de WhatsApp */
    const kick = $('hero-kicker'); if (kick) { if (hero.antetitulo) kick.textContent = hero.antetitulo; else kick.style.display = 'none'; }
    const sello = $('hero-sello'); if (sello) { if (hero.sello) sello.textContent = hero.sello; else sello.style.display = 'none'; }
    const heroWa = $('hero-wa'), flotaWa = $('wa-flota');
    if (heroWa) { txt(heroWa, (d.contacto || {}).boton_whatsapp, 'contacto.boton_whatsapp'); if (flotaWa && flotaWa.href) heroWa.href = flotaWa.href; else heroWa.style.display = 'none'; }

    const visibles = publicables(d.productos);
    const ocultos = (d.productos || []).length - visibles.length;
    if (MODO_MAQUETA) {
      console.info('[TUENTI] MODO MAQUETA: se muestran los ' + visibles.length +
        ' diseños, licenciados incluidos. Al apagarlo se ocultarían ' +
        ocultablesCount(d.productos) + '. No indexar todavía.');
    } else if (ocultos > 0) {
      console.info('[TUENTI] ' + ocultos + ' de ' + (d.productos || []).length +
        ' productos ocultos por licenciado=true o publicable_web=false.');
    }

    const grupos = {};
    visibles.forEach(p => { const c = p.categoria || 'Sin categoría'; (grupos[c] = grupos[c] || []).push(p); });
    const orden = (d.categorias || []).filter(c => grupos[c] && grupos[c].length);
    Object.keys(grupos).forEach(c => { if (orden.indexOf(c) < 0) orden.push(c); });

    /* franja: las seis categorías */
    const cats = $('cats');
    orden.forEach(cat => {
      const a = document.createElement('a');
      a.className = 'cat'; a.href = 'catalogo.html#' + encodeURIComponent(cat);
      const precioCat = grupos[cat][0] && !vacio(grupos[cat][0].precio_unidad) ? money(grupos[cat][0].precio_unidad) : '';
      a.innerHTML = '<span class="cat-n">' + esc(cat) + '</span>' + (precioCat ? '<span class="cat-p">' + precioCat + '</span>' : '');
      const fotoCat = (d.categorias_fotos || {})[cat];
      const v = variantesConFoto(grupos[cat][0])[0];
      if (fotoCat) {
        const im = new Image();
        im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; im.dataset.sz = 'cat';
        im.onerror = () => im.remove();
        a.insertBefore(im, a.firstChild);
        im.src = fotoCat;
      } else if (v) {
        /* la imagen se inserta YA y carga dentro del DOM: una imagen con
           loading="lazy" que aún no está en el documento nunca dispara onload. */
        const im = new Image();
        im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; im.dataset.sz = 'cat';
        im.onerror = () => im.remove();
        a.insertBefore(im, a.firstChild);
        im.src = 'img/' + v.fotos[0];
      }
      cats.appendChild(a);
    });

    /* r3: fotos de cada categoría para que cada tarjeta del carrusel rote SU foto (rotacion.js).
       Solo diseños de ESA categoría y con publicable_web = true; la marca de terceros no se filtra (riesgo asumido por Jose). */
    window.__tuentiFotosCategoria = {};
    orden.forEach(cat => {
      const lista = [], puestas = [];
      (grupos[cat] || []).forEach(p => {
        if (p.publicable_web !== true) return;
        variantesConFoto(p).forEach(v => {
          (v.fotos || []).forEach(f => { if (f && lista.indexOf(f) < 0) lista.push(f); });
          /* r4 (29/10/2026): si el diseño tiene tomas, la tarjeta rota entre las fotos EN MODELO (fondo blanco) */
          (tomasDe(v) || []).forEach(t => { if (t.vista === 'En modelo' && puestas.indexOf(t.foto) < 0) puestas.push(t.foto); });
        });
      });
      window.__tuentiFotosCategoria[cat] = puestas.length >= 2 ? puestas : lista;
    });
    document.dispatchEvent(new CustomEvent('tuenti:categorias'));

    /* destacado — SOLO LA PRENDA.
       Sin antetítulo, sin título, sin texto, sin precio y sin botón: la foto
       sola. Se elige la variante de color que fija destacado.color; si no
       existe, cae en la primera con foto. La foto enlaza a la ficha, que no
       añade ruido visual pero evita que sea un callejón sin salida. */
    const dest = d.destacado || {};
    const prodDest = visibles.filter(p => p.id === dest.producto_id)[0];
    const cajaDest = $('dest-prenda');
    if (cajaDest) {
      if (prodDest) {
        const vsD = variantesConFoto(prodDest);
        const vD = vsD.filter(v => v.color === dest.color)[0] || vsD[0];
        if (vD) {
          const im = new Image();
          im.alt = prodDest.diseno + ' · ' + (vD.color || '');
          im.loading = 'lazy'; im.decoding = 'async'; im.dataset.sz = 'dest';
          im.onerror = () => im.remove();
          cajaDest.appendChild(im);
          im.src = 'img/' + vD.fotos[0];
          cajaDest.href = 'producto.html?id=' + encodeURIComponent(prodDest.id) +
            (vD.color ? '&color=' + encodeURIComponent(vD.color) : '');
        }
      } else {
        cajaDest.innerHTML = falta('destacado.producto_id');
      }
    }

    /* r4 (29/10/2026): vitrina «así se ven puestas» (tomas en modelo, 0 créditos) */
    pintarVitrina(d, visibles);

    /* próximo diseño */
    pintarProximo(d);

    /* historia */
    const h = d.historia || {};
    pintarHistoria(h);

    /* promesas */
    const pr = $('promesas');
    if (vacio(d.promesas)) pr.innerHTML = '<div class="promesa">' + falta('promesas') + '</div>';
    else pr.innerHTML = d.promesas.map(p =>
      '<div class="promesa"><b>' + esc(p.titulo || '') + '</b><span>' + esc(p.texto || '') + '</span></div>').join('');

    /* local (r3) */
    pintarLocal(d);

    /* contacto */
    const c = d.contacto || {};
    txt($('cont-titulo'), c.titulo, 'contacto.titulo');
    txt($('cont-texto'), c.texto, 'contacto.texto');
    txt($('cont-wa-txt'), c.boton_whatsapp, 'contacto.boton_whatsapp');
    if (wa) $('contacto-wa').href = waLink(wa, 'Hola ' + nombre + ', tengo una consulta.');
    else { $('contacto-wa').removeAttribute('href'); $('contacto-wa').insertAdjacentHTML('afterend', falta('contacto.whatsapp')); }
    if (c.telefono) {
      $('contacto-tel').href = 'tel:' + String(c.telefono).replace(/[^0-9+]/g, '');
      $('contacto-tel').textContent = c.boton_telefono || 'Llamar';
    } else $('contacto-tel').innerHTML = falta('contacto.telefono');

    /* instagram: reels incrustados + perfil (rediseño 13/10/2026) */
    const red = d.redes || {};
    const kickR = $('red-kicker');
    if (kickR) { if (red.antetitulo) kickR.textContent = red.antetitulo; else kickR.style.display = 'none'; }
    txt($('red-titulo'), red.titulo, 'redes.titulo');
    const ru = $('red-usuario');
    if (ru) {
      if (red.usuario) { ru.textContent = red.usuario; ru.href = red.instagram || '#'; }
      else ru.innerHTML = falta('redes.usuario');
    }
    const reelsEl = $('reels');
    const idsReel = (red.reels_destacados || [])
      .map(u => (String(u).match(/\/reel\/([^\/?#]+)/) || [])[1]).filter(Boolean);
    if (reelsEl) {
      if (!idsReel.length) reelsEl.style.display = 'none';
      idsReel.forEach(id => {
        const f = document.createElement('div');
        f.className = 'reel';
        f.dataset.src = 'https://www.instagram.com/reel/' + id + '/embed/';
        f.innerHTML = '<a class="reel__ph" href="https://www.instagram.com/reel/' + id + '/" target="_blank" rel="noopener">Ver en Instagram</a>';
        reelsEl.appendChild(f);
      });
    }
    const pe = $('perfil-embed');
    if (pe) {
      if (red.usuario) pe.dataset.src = 'https://www.instagram.com/' + String(red.usuario).replace('@', '') + '/embed/';
      else pe.closest('.perfil-wrap').style.display = 'none';
    }
    /* los iframes de Instagram pesan: se montan al acercarse a la sección */
    const diferidos = Array.prototype.slice.call(document.querySelectorAll('.reel[data-src], #perfil-embed[data-src]'));
    const montar = el => {
      if (el.querySelector('iframe')) return;
      const fr = document.createElement('iframe');
      fr.src = el.dataset.src; fr.title = 'Publicación de Instagram';
      fr.setAttribute('scrolling', 'no'); fr.setAttribute('allowtransparency', 'true');
      const ph = el.querySelector('.reel__ph');
      fr.addEventListener('load', () => { if (ph) ph.style.display = 'none'; });
      el.appendChild(fr);
    };
    if ('IntersectionObserver' in window) {
      const ioIg = new IntersectionObserver(es => es.forEach(en => {
        if (en.isIntersecting) { montar(en.target); ioIg.unobserve(en.target); }
      }), { rootMargin: '500px 0px' });
      diferidos.forEach(e => ioIg.observe(e));
    } else diferidos.forEach(montar);

    const rc = $('redes-cta');
    const svgIg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>';
    const svgTk = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c.4 2.3 1.9 3.9 4 4.1v2.8c-1.5.1-2.9-.4-4-1.2v5.6a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.1v2.9a2.8 2.8 0 1 0 2 2.7V3h2.9z"/></svg>';
    const svgFb = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.6 22v-8.1h2.7l.5-3.3h-3.2V8.6c0-1 .4-1.7 1.8-1.7h1.5V4.1c-.3 0-1.2-.1-2.3-.1-2.5 0-4.1 1.5-4.1 4.2v2.4H7.3v3.3H10V22h3.6z"/></svg>';
    if (red.instagram) rc.insertAdjacentHTML('beforeend',
      '<a class="ds-btn ds-btn--solid-ig" href="' + esc(red.instagram) + '" target="_blank" rel="noopener">' + svgIg + esc(red.boton_perfil || 'Instagram') + '</a>');
    else rc.insertAdjacentHTML('beforeend', falta('redes.instagram'));
    if (red.tiktok) rc.insertAdjacentHTML('beforeend',
      '<a class="ds-btn ds-btn--outline" href="' + esc(red.tiktok) + '" target="_blank" rel="noopener">' + svgTk + 'TikTok</a>');
    else rc.insertAdjacentHTML('beforeend', falta('redes.tiktok'));
    if (red.facebook) rc.insertAdjacentHTML('beforeend',
      '<a class="ds-btn ds-btn--outline" href="' + esc(red.facebook) + '" target="_blank" rel="noopener">' + svgFb + 'Facebook</a>');
  }

  /* r4 (29/10/2026): vitrina del inicio. Lee inicio.vitrina.items ({id, color}) de marca.json: por cada uno, la toma
     «Cuerpo entero» (o «En modelo») y, con el cursor encima, la prenda sola. Sin tomas no se pinta; sin items la sección se oculta. */
  function pintarVitrina(d, visibles) {
    const sec = $('vitrina'), pista = $('vit-pista'); if (!sec || !pista) return;
    const vit = (d.inicio || {}).vitrina || {};
    const items = [];
    (vit.items || []).forEach(it => {
      const p = visibles.filter(x => x.id === it.id)[0]; if (!p) return;
      const v = (p.variantes || []).filter(x => x.color === it.color)[0] || variantesConFoto(p)[0]; if (!v) return;
      const tm = tomasDe(v) || [];
      const puesta = tm.filter(t => t.vista === 'Cuerpo entero')[0] || tm.filter(t => t.vista === 'En modelo')[0];
      if (!puesta) return;
      items.push({ p, v, puesta, sola: tm[0] !== puesta ? tm[0] : null });
    });
    if (!items.length) { sec.hidden = true; return; }
    const kick = $('vit-kicker'); if (kick) { if (vit.antetitulo) kick.textContent = vit.antetitulo; else kick.style.display = 'none'; }
    txt($('vit-titulo'), vit.titulo, 'inicio.vitrina.titulo');
    const btn = $('vit-btn'); if (btn) { if (vit.boton) btn.textContent = vit.boton; else btn.style.display = 'none'; }
    const at = (f, t) => (window.__imgw ? window.__imgw.attrs('img/' + f, t) : '');
    pista.innerHTML = items.map((it, i) =>
      '<a class="vit-item" data-reveal' + (i % 4 ? ' data-delay="' + Math.min(2, i % 4) + '"' : '') +
      ' href="producto.html?id=' + encodeURIComponent(it.p.id) + '&color=' + encodeURIComponent(it.v.color || '') + '">' +
        '<img class="vit-puesta" src="img/' + esc(it.puesta.foto) + '"' + at(it.puesta.foto, 'card') +
        ' alt="' + esc(it.p.diseno + ' · ' + it.puesta.vista.toLowerCase()) + '" loading="lazy" decoding="async">' +
        (it.sola ? '<img class="vit-sola" src="img/' + esc(it.sola.foto) + '"' + at(it.sola.foto, 'card') + ' alt="" loading="lazy" decoding="async" aria-hidden="true">' : '') +
        '<span class="vit-txt"><b>' + esc(it.p.diseno || '') + '</b><small>' + esc(it.p.categoria || '') +
        (vacio(it.p.precio_unidad) ? '' : ' · ' + money(it.p.precio_unidad)) + '</small></span></a>').join('');
  }

  /* ================================================================
     CATÁLOGO
     ================================================================ */
  function pintarCatalogo(d) {
    anuncioMarquesina();
    const marca = d.marca || {}, nombre = marca.nombre || '';
    const cat = d.catalogo || {};
    document.title = [nombre, cat.titulo || 'Catálogo'].filter(Boolean).join(' — ');

    txt($('cat-titulo'), cat.titulo, 'catalogo.titulo');
    txt($('cat-buscar-label'), cat.buscador_label, 'catalogo.buscador_label');
    txt($('cat-toggle-txt'), cat.filtros_titulo, 'catalogo.filtros_titulo');
    txt($('cat-limpiar'), cat.filtros_limpiar, 'catalogo.filtros_limpiar');
    if ($('cat-aplicar')) $('cat-aplicar').textContent = cat.filtros_aplicar || 'Aplicar';
    if ($('cat-mas-btn')) $('cat-mas-btn').textContent = cat.ver_mas || 'Ver más diseños';
    const inputBuscar = $('cat-buscar');
    if (inputBuscar) inputBuscar.placeholder = cat.buscador_placeholder || '';

    const visibles = publicables(d.productos);
    const ocultos = (d.productos || []).length - visibles.length;
    if (MODO_MAQUETA) {
      console.info('[TUENTI] MODO MAQUETA: se muestran los ' + visibles.length +
        ' diseños, licenciados incluidos. Al apagarlo se ocultarían ' +
        ocultablesCount(d.productos) + '. No indexar todavía.');
    } else if (ocultos > 0) {
      console.info('[TUENTI] ' + ocultos + ' de ' + (d.productos || []).length +
        ' productos ocultos por licenciado=true o publicable_web=false.');
    }

    /* El género no es un dato aparte: sale de la categoría. Todo lo que no
       es «Hombre» es «Mujer». Así no hay un campo más que mantener. */
    const genero = p => p.categoria === 'Hombre' ? 'Hombre' : 'Mujer';

    /* Búsqueda sin tildes ni mayúsculas, por coincidencia parcial:
       «nirvana» devuelve todo lo que contenga nirvana. Se busca en el
       nombre del diseño, la categoría, el tema y los colores. */
    const plano = t => String(t == null ? '' : t).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
    const heno = p => plano([p.diseno, p.categoria, p.tema,
      (p.variantes || []).map(v => v.color).join(' ')].join(' '));
    const indice = new Map(visibles.map(p => [p, heno(p)]));

    const generosHay = (cat.generos || ['Mujer', 'Hombre']).filter(g => visibles.some(p => genero(p) === g));
    /* r4 (29/10/2026): filtro por COLOR. Un diseño tiene varios colores (variantes), así que `de` devuelve una lista;
       los colores se ordenan por cuántos diseños los tienen. Es dato de marca.json, no se inventa. */
    const coloresDe = p => (p.variantes || []).map(v => v.color).filter(Boolean).filter((c, i, arr) => arr.indexOf(c) === i);
    const cuentaColor = {};
    visibles.forEach(p => coloresDe(p).forEach(c => { cuentaColor[c] = (cuentaColor[c] || 0) + 1; }));
    const coloresHay = Object.keys(cuentaColor).sort((x, y) => cuentaColor[y] - cuentaColor[x] || x.localeCompare(y, 'es'));
    const GRUPOS = [
      { id: 'genero',    label: cat.label_genero    || 'Género',    valores: generosHay,                de: genero },
      { id: 'categoria', label: cat.label_categoria || 'Categoría', valores: d.categorias || [],                 de: p => p.categoria },
      { id: 'tema',      label: cat.label_tema      || 'Tema',      valores: cat.temas || [],                    de: p => p.tema },
      { id: 'color',     label: cat.label_color     || 'Color',     valores: coloresHay,                de: coloresDe }
    ];
    if (generosHay.length < 2) GRUPOS.shift();
    const sel = { genero: new Set(), categoria: new Set(), tema: new Set(), color: new Set() };
    const valsDe = (g, p) => { const v = g.de(p); return Array.isArray(v) ? v : [v]; };
    let texto = '';
    const gCategoria = GRUPOS.filter(g => g.id === 'categoria')[0];

    /* r4: los filtros viven en la dirección (?categoria=…&tema=…&color=…&q=…): recargar o compartir conserva lo elegido.
       El #Categoría que manda la portada se sigue aceptando. */
    function leerUrl() {
      const q = new URLSearchParams(location.search);
      GRUPOS.forEach(g => (q.get(g.id) || '').split(',').map(s => s.trim()).filter(Boolean).forEach(v => { if (g.valores.indexOf(v) >= 0) sel[g.id].add(v); }));
      return q.get('q') || '';
    }
    function escribirUrl() {
      const q = new URLSearchParams();
      GRUPOS.forEach(g => { if (sel[g.id].size) q.set(g.id, Array.from(sel[g.id]).join(',')); });
      if (inputBuscar && inputBuscar.value.trim()) q.set('q', inputBuscar.value.trim());
      const s = q.toString();
      history.replaceState(null, '', location.pathname + (s ? '?' + s : ''));
    }

    const lista = $('catalogo-lista'), conteo = $('cat-conteo');

    /* Los filtros se COMBINAN: dentro de un grupo suman (o), entre grupos
       restringen (y). Un grupo sin nada marcado no filtra. */
    function pasa(p, saltar) {
      for (const g of GRUPOS) {
        if (g.id === saltar) continue;
        const s = sel[g.id];
        if (s.size && !valsDe(g, p).some(x => s.has(x))) return false;
      }
      if (texto && indice.get(p).indexOf(texto) < 0) return false;
      return true;
    }
    const filtrados = () => visibles.filter(p => pasa(p, null));

    /* Cuántos quedarían al marcar esa opción: el número de al lado de cada
       casilla. Se calcula ignorando su propio grupo, que es lo que evita
       que las opciones de un mismo grupo se anulen entre sí. */
    function cuantos(g, valor) {
      return visibles.filter(p => valsDe(g, p).indexOf(valor) >= 0 && pasa(p, g.id)).length;
    }

    /* r4: fila de categorías siempre a la vista (una a la vez; «Todas» la quita). Sincronizada con las casillas del panel. */
    function pintarChips() {
      const fila = $('cat-chips'); if (!fila || !gCategoria) return;
      const una = sel.categoria.size === 1 ? Array.from(sel.categoria)[0] : null;
      const chip = (valor, label, n, on) =>
        '<button type="button" class="cat-chip" data-cat="' + esc(valor) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
        esc(label) + (n == null ? '' : '<small>' + n + '</small>') + '</button>';
      fila.innerHTML = chip('', cat.filtro_todas || 'Todas', null, !sel.categoria.size) +
        gCategoria.valores.map(v => chip(v, v, cuantos(gCategoria, v), una === v || (sel.categoria.size > 1 && sel.categoria.has(v)))).join('');
    }

    function pintarGrupos() {
      GRUPOS.forEach(g => {
        const caja = $('cat-g-' + g.id);
        if (!caja) return;
        caja.innerHTML = '<p class="ds-pdp__label">' + esc(g.label) + '</p>' +
          g.valores.map(v => {
            const n = cuantos(g, v);
            return '<label class="cat-op">' +
              '<input type="checkbox" data-g="' + esc(g.id) + '" value="' + esc(v) + '"' +
              (sel[g.id].has(v) ? ' checked' : '') + (n ? '' : ' disabled') + '>' +
              '<span class="cat-op__caja"></span>' +
              '<span class="cat-op__txt">' + esc(v) + '</span>' +
              '<span class="cat-op__n">' + n + '</span></label>';
          }).join('');
      });
      const n = sel.genero.size + sel.categoria.size + sel.tema.size + sel.color.size + (texto ? 1 : 0);
      const badge = $('cat-activos'), limpiarBtn = $('cat-limpiar');
      if (badge) { badge.hidden = !n; badge.textContent = String(n); }
      if (limpiarBtn) limpiarBtn.hidden = !n;
    }

    function render() {
      /* r4e: en el catálogo «como las referencias» van primero los diseños con la foto en modelo (orden de siempre dentro de cada grupo) */
      const conModelo = p => variantesConFoto(p).some(v => (tomasDe(v) || []).some(t => t.vista === 'En modelo'));
      const items0 = filtrados();
      const items = document.body.classList.contains('cat-ref')
        ? items0.filter(conModelo).concat(items0.filter(p => !conModelo(p))) : items0;
      const marcados = [].concat(
        Array.from(sel.genero), Array.from(sel.categoria), Array.from(sel.tema), Array.from(sel.color));
      $('cat-grupo-h').textContent = marcados.length ? marcados.join(' · ')
        : (texto ? '«' + inputBuscar.value.trim() + '»' : (cat.filtro_todas || 'Todas'));
      /* r4: el precio de lo que se ve (dato de cada diseño): si todos valen lo mismo, «$ X cada una»; si no, «desde $ X» */
      const precioEl = $('cat-precio');
      if (precioEl) {
        const precios = items.map(p => p.precio_unidad).filter(x => !vacio(x)).map(Number);
        const mn = precios.length ? Math.min.apply(null, precios) : null, mx = precios.length ? Math.max.apply(null, precios) : null;
        precioEl.textContent = mn == null ? '' : (mn === mx ? money(mn) + ' ' + (cat.precio_cada || 'cada una') : (cat.precio_desde || 'desde') + ' ' + money(mn));
      }
      document.title = [nombre, sel.categoria.size === 1 ? Array.from(sel.categoria)[0] : (cat.titulo || 'Catálogo')].filter(Boolean).join(' — ');
      /* tandas: 24 diseños y «Ver más»; el conteo dice cuántos van de cuántos */
      const TANDA = 24;
      let mostrados = Math.min(TANDA, items.length);
      conteo.textContent = (cat.mostrando || 'Mostrando') + ' ' + mostrados + ' de ' + items.length + ' ' +
        (items.length === 1 ? 'diseño' : 'diseños');
      const masBox = $('cat-mas');

      lista.innerHTML = '';
      if (!items.length && $('cat-mas')) $('cat-mas').hidden = true;
      if (!items.length) {
        lista.innerHTML =
          '<div class="cat-vacio">' +
          '<h3>' + (vacio(cat.vacio_titulo) ? falta('catalogo.vacio_titulo') : esc(cat.vacio_titulo)) + '</h3>' +
          '<p>' + (vacio(cat.vacio_texto) ? falta('catalogo.vacio_texto') : esc(cat.vacio_texto)) + '</p>' +
          '<button class="ds-btn ds-btn--outline" type="button" id="cat-vacio-limpiar">' +
          esc(cat.vacio_boton || 'Limpiar') + '</button></div>';
      } else {
        const g = document.createElement('div');
        g.className = 'ds-grid';
        const colorPref = Array.from(sel.color);
        items.slice(0, mostrados).forEach((p, i) => g.appendChild(tarjeta(p, i, colorPref)));
        lista.appendChild(g);
        if (masBox) {
          const btnMas = $('cat-mas-btn');
          masBox.hidden = mostrados >= items.length;
          btnMas.onclick = () => {
            const desde = mostrados;
            mostrados = Math.min(mostrados + TANDA, items.length);
            items.slice(desde, mostrados).forEach((p, i) => g.appendChild(tarjeta(p, i, colorPref)));
            conteo.textContent = (cat.mostrando || 'Mostrando') + ' ' + mostrados + ' de ' + items.length + ' diseños';
            masBox.hidden = mostrados >= items.length;
            observarReveal();
          };
        }
      }
      pintarGrupos();
      pintarChips();
      escribirUrl();
      observarReveal();
    }

    function limpiar() {
      sel.genero.clear(); sel.categoria.clear(); sel.tema.clear(); sel.color.clear();
      texto = '';
      if (inputBuscar) inputBuscar.value = '';
      render();
    }

    /* Todo sin recargar: delegación sobre el panel. */
    const panel = $('cat-panel');
    if (panel) panel.addEventListener('change', e => {
      const el = e.target.closest('input[data-g]');
      if (!el) return;
      const s = sel[el.dataset.g];
      if (el.checked) s.add(el.value); else s.delete(el.value);
      render();
    });

    if (inputBuscar) {
      let t;
      inputBuscar.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => { texto = plano(inputBuscar.value.trim()); render(); }, 140);
      });
    }
    const btnLimpiar = $('cat-limpiar');
    if (btnLimpiar) btnLimpiar.addEventListener('click', limpiar);
    const chips = $('cat-chips');
    if (chips) chips.addEventListener('click', e => {
      const b = e.target.closest('.cat-chip'); if (!b) return;
      sel.categoria.clear();
      if (b.dataset.cat) sel.categoria.add(b.dataset.cat);
      render();
    });
    lista.addEventListener('click', e => {
      if (e.target.closest('#cat-vacio-limpiar')) { e.preventDefault(); limpiar(); }
    });

    /* Panel colapsable en móvil. En escritorio el CSS lo deja siempre abierto. */
    const tog = $('cat-toggle'), panelIn = $('cat-panel-in'), fondoHoja = $('cat-fondo');
    const hoja = ab => {
      panelIn.classList.toggle('abierto', ab);
      if (fondoHoja) fondoHoja.classList.toggle('abierto', ab);
      document.body.classList.toggle('hoja-abierta', ab);
      tog.setAttribute('aria-expanded', String(ab));
    };
    if (tog && panelIn) {
      tog.addEventListener('click', () => hoja(!panelIn.classList.contains('abierto')));
      if (fondoHoja) fondoHoja.addEventListener('click', () => hoja(false));
      const ap = $('cat-aplicar');
      if (ap) ap.addEventListener('click', () => hoja(false));
      document.addEventListener('keydown', e => { if (e.key === 'Escape') hoja(false); });
    }

    /* La portada enlaza a #Categoría: se respeta como filtro de entrada. r4: también ?categoria=…&color=…&tema=…&q=… */
    if (location.hash) {
      const h = decodeURIComponent(location.hash.slice(1));
      if ((d.categorias || []).indexOf(h) >= 0) sel.categoria.add(h);
    }
    const q0 = leerUrl();
    if (q0 && inputBuscar) { inputBuscar.value = q0; texto = plano(q0); }
    render();
  }

  /* ================================================================
     FICHA DE PRODUCTO  ·  selector de color por hex
     ================================================================ */
  /* Foto grande de la ficha: la ruta sale de marca.json tal como viene.
     Las nuevas («oct/…») ya están a 900 px en img/oct/; las viejas tienen
     versión grande en img/full/ y, si falta, se cae a img/ sin romperse. */
  function fotoGrande(cont, src, alt) {
    const im = new Image();
    im.alt = alt || ''; im.decoding = 'async'; im.dataset.sz = 'ficha';
    if (/^oct\//.test(src)) im.src = 'img/' + src;
    else {
      im.src = 'img/full/' + src;
      im.onerror = () => { im.onerror = null; im.src = 'img/' + src; };
    }
    cont.innerHTML = '';
    cont.appendChild(im);
  }

  /* Galería de tomas de la ficha: una pista que se desliza (dedo o flechas), la primera es la prenda sola.
     Miniaturas abajo para saltar; teclado ← → cuando la pista tiene el foco; contador y nombre de la vista. */
  const FLECHA_IZQ = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  const FLECHA_DER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  function galeriaTomas(main, thumbs, tomas, nombre) {
    const n = tomas.length;
    const reducida = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    main.innerHTML =
      '<div class="gal">' +
        '<div class="gal__pista" tabindex="0" role="group" aria-roledescription="galería" aria-label="' + esc(nombre) + ': ' + n + (n === 1 ? ' foto' : ' fotos') + '">' +
          tomas.map((t, j) =>
            '<figure class="gal__item"><img src="img/' + esc(t.foto) + '"' +
            (window.__imgw ? window.__imgw.attrs('img/' + t.foto, 'ficha') : '') +
            ' alt="' + esc(nombre + ' · ' + t.vista) + '" decoding="async"' + (j > 1 ? ' loading="lazy"' : '') + '></figure>').join('') +
        '</div>' +
        (n > 1
          ? '<button type="button" class="gal__flecha gal__flecha--izq" aria-label="Foto anterior">' + FLECHA_IZQ + '</button>' +
            '<button type="button" class="gal__flecha gal__flecha--der" aria-label="Siguiente foto">' + FLECHA_DER + '</button>'
          : '') +
        '<div class="gal__pie"><span class="gal__vista"></span>' + (n > 1 ? '<span class="gal__n" aria-live="polite"></span>' : '') + '</div>' +
      '</div>';
    const pista = main.querySelector('.gal__pista'), vista = main.querySelector('.gal__vista'), num = main.querySelector('.gal__n');
    const izq = main.querySelector('.gal__flecha--izq'), der = main.querySelector('.gal__flecha--der');
    thumbs.innerHTML = '';
    const mins = n > 1 ? tomas.map((t, j) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ds-gallery__thumb' + (j === 0 ? ' is-on' : '');
      b.setAttribute('aria-label', 'Ver ' + t.vista.toLowerCase() + ', foto ' + (j + 1) + ' de ' + n);
      b.innerHTML = '<img src="img/' + esc(t.foto) + '"' + (window.__imgw ? window.__imgw.attrs('img/' + t.foto, 'mini') : '') + ' alt="" loading="lazy" decoding="async">';
      b.addEventListener('click', () => ir(j));
      thumbs.appendChild(b);
      return b;
    }) : [];
    let i = 0, t = null;
    const ancho = () => pista.clientWidth || 1;
    function pintar(k) {
      i = Math.max(0, Math.min(n - 1, k));
      vista.textContent = tomas[i].vista;
      if (num) num.textContent = (i + 1) + ' / ' + n;
      mins.forEach((b, j) => b.classList.toggle('is-on', j === i));
      if (izq) { izq.disabled = i === 0; der.disabled = i === n - 1; }
    }
    function ir(k) {
      k = Math.max(0, Math.min(n - 1, k));
      pista.scrollTo({ left: k * ancho(), behavior: reducida ? 'auto' : 'smooth' });
      pintar(k);
    }
    if (izq) { izq.addEventListener('click', () => ir(i - 1)); der.addEventListener('click', () => ir(i + 1)); }
    pista.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(() => pintar(Math.round(pista.scrollLeft / ancho())), 80); }, { passive: true });
    pista.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); ir(i + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); ir(i - 1); }
    });
    /* lupa: un clic sobre la foto la acerca 2x donde está el puntero (o el dedo); otro clic la suelta.
       Mientras está acercada, mover el puntero recorre la foto. Al cambiar de foto se suelta. */
    function origen(fig, e) {
      const r = fig.getBoundingClientRect(), pt = (e.touches && e.touches[0]) || e;
      const x = Math.max(0, Math.min(100, (pt.clientX - r.left) / r.width * 100));
      const y = Math.max(0, Math.min(100, (pt.clientY - r.top) / r.height * 100));
      fig.querySelector('img').style.transformOrigin = x + '% ' + y + '%';
    }
    pista.querySelectorAll('.gal__item').forEach(fig => {
      fig.addEventListener('click', e => {
        const on = fig.classList.toggle('is-zoom');
        pista.classList.toggle('is-zoom', on);
        if (on) origen(fig, e);
      });
      fig.addEventListener('mousemove', e => { if (fig.classList.contains('is-zoom')) origen(fig, e); });
      fig.addEventListener('touchmove', e => { if (fig.classList.contains('is-zoom')) origen(fig, e); }, { passive: true });
    });
    pista.addEventListener('scroll', () => {
      pista.querySelectorAll('.gal__item.is-zoom').forEach(f => f.classList.remove('is-zoom'));
      pista.classList.remove('is-zoom');
    }, { passive: true });
    pintar(0);
  }

  function pintarProducto(d) {
    anuncioMarquesina();
    const marca = d.marca || {}, nombre = marca.nombre || '';
    const wa = (d.contacto || {}).whatsapp;
    const f = d.ficha || {};
    const par = new URLSearchParams(location.search);
    const visibles = publicables(d.productos);
    const p = visibles.filter(x => x.id === par.get('id'))[0];

    txt($('pdp-volver'), f.volver, 'ficha.volver');

    if (!p) {
      /* Enlace viejo o diseño retirado «por ahora» (decisión de Jose 15/10 17:07:13):
         mensaje amable, vuelta al catálogo y WhatsApp. Nunca página en blanco ni [[campo]]. */
      const tit = vacio(f.no_encontrado_titulo) ? 'Este diseño ya no está en la web por ahora' : f.no_encontrado_titulo;
      const tex = vacio(f.no_encontrado_texto) ? 'Mira lo que sí está en el catálogo o escríbenos por WhatsApp y te contamos.' : f.no_encontrado_texto;
      document.title = nombre + ' — ' + tit;
      const num = String(wa || '').replace(/\D/g, '');
      const msg = encodeURIComponent('Hola TUENTI, busco un diseño que ya no veo en la web');
      $('pdp').innerHTML =
        '<div class="cat-vacio ficha-retirada" style="grid-column:1/-1">' +
        '<h3>' + esc(tit) + '</h3>' +
        '<p>' + esc(tex) + '</p>' +
        '<div class="ficha-retirada__btns">' +
        '<a class="ds-btn ds-btn--light" href="catalogo.html">Ver el catálogo</a>' +
        (num ? '<a class="ds-btn ds-btn--outline" target="_blank" rel="noopener" href="https://wa.me/' + num + '?text=' + msg + '">Escribir por WhatsApp</a>' : '') +
        '</div></div>';
      return;
    }

    document.title = [nombre, p.diseno].filter(Boolean).join(' — ');
    const vs = variantesConFoto(p);
    let idx = Math.max(0, vs.findIndex(v => v.color === par.get('color')));

    $('pdp-cat').textContent = p.categoria || '';
    $('pdp-titulo').textContent = p.diseno || '';
    $('pdp-precio').innerHTML = vacio(p.precio_unidad) ? falta('precio_unidad') : money(p.precio_unidad);

    /* Precio mayorista — CARGADO COMO DATO, OCULTO EN PANTALLA.
       Ver docs/TRASPASO_WEB.md §0.5.

       El dato existe en marca.json (tarifa de 12+ unidades) pero NO se muestra:
       el mayorista es canal de WhatsApp y la regla dura nº2 de CLAUDE.md prohíbe
       venderlo desde la web. Que no se vea es una DECISIÓN, no una carencia, así
       que el interruptor es explícito y no depende de que el campo esté vacío:
       si dependiera del valor, cargar el dato lo destaparía solo. */
    const MOSTRAR_MAYORISTA = false;
    const pm = $('pdp-precio-mayor');
    if (pm) {
      const hay = !vacio(p.precio_mayor);
      pm.hidden = !(MOSTRAR_MAYORISTA && hay);
      pm.textContent = (MOSTRAR_MAYORISTA && hay)
        ? ((d.ficha || {}).label_precio_mayor || 'Al por mayor') + ' ' + money(p.precio_mayor)
        : '';
    }

    $('pdp-ref').textContent = p.id;
    txt($('pdp-label-color'), f.label_color, 'ficha.label_color');
    txt($('pdp-label-talla'), f.label_talla, 'ficha.label_talla');

    const main = $('pdp-main'), thumbs = $('pdp-thumbs'), colores = $('pdp-colores'), tallas = $('pdp-tallas');

    /* círculos de color: el color sale del hex de marca.json, no de la foto */
    vs.forEach((v, k) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ds-color' + (v.hex ? '' : ' ds-color--texto');
      if (v.hex) b.style.background = v.hex; else b.textContent = v.color || '';
      b.title = v.color || '';
      b.setAttribute('aria-label', v.color || '');
      b.addEventListener('click', () => ver(k));
      colores.appendChild(b);
    });
    const nombreColor = document.createElement('span');
    nombreColor.className = 'ds-colors__nombre';
    colores.appendChild(nombreColor);

    function ver(k) {
      idx = k;
      const v = vs[idx];
      const tm = tomasDe(v);
      main.classList.toggle('gal-on', !!tm);
      thumbs.classList.toggle('is-tomas', !!tm);
      if (tm) galeriaTomas(main, thumbs, tm, p.diseno + ' · ' + (v.color || ''));
      else fotoGrande(main, v.fotos[0], p.diseno + ' · ' + (v.color || ''));
      colores.querySelectorAll('.ds-color').forEach((b, j) => b.classList.toggle('is-on', j === idx));
      /* si a este color le falta el hex, se dice cuál falta */
      nombreColor.textContent = v.color || '';
      /* r4i: ficha «como las referencias»: «COLOR: BEIGE» en una sola línea */
      if (document.body.classList.contains('ficha-ref')) {
        const lc = $('pdp-label-color');
        if (lc) lc.innerHTML = esc(f.label_color || 'Color') + ': <b>' + esc(v.color || '') + '</b>';
      }

      if (!tm) thumbs.innerHTML = '';
      (!tm && (v.fotos || []).length > 1 ? v.fotos : []).forEach((src, j) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ds-gallery__thumb' + (j === 0 ? ' is-on' : '');
        const nom = p.diseno + ' · ' + (v.color || '') + ' · foto ' + (j + 1) + ' de ' + v.fotos.length;
        b.setAttribute('aria-label', 'Ver ' + nom);
        b.innerHTML = '<img src="img/' + esc(src) + '"' + (window.__imgw ? window.__imgw.attrs('img/' + src, 'mini') : '') + ' alt="' + esc(nom) + '" loading="lazy" decoding="async">';
        b.addEventListener('click', () => {
          fotoGrande(main, src, nom);
          thumbs.querySelectorAll('.ds-gallery__thumb').forEach((t, q) => t.classList.toggle('is-on', q === j));
        });
        thumbs.appendChild(b);
      });

      /* sin tallas en el dato = no se muestra la fila (nunca «[[tallas]]») */
      const bloqueTalla = tallas.closest('.ds-pdp__block');
      if (bloqueTalla) bloqueTalla.hidden = vacio(v.tallas);
      tallas.innerHTML = vacio(v.tallas)
        ? ''
        : v.tallas.map((t, j) => '<button class="ds-size' + (j === 0 ? ' is-on' : '') + '" type="button">' + esc(t) + '</button>').join('');

      const precio = vacio(p.precio_unidad) ? falta('precio_unidad') : money(p.precio_unidad);
      $('pdp-wa-precio').innerHTML = precio;
      /* Los botones NO se reconstruyen aquí: leen la variante en el clic. */
      history.replaceState(null, '', '?id=' + encodeURIComponent(p.id) + '&color=' + encodeURIComponent(v.color || ''));
    }

    tallas.addEventListener('click', e => {
      const b = e.target.closest('.ds-size'); if (!b) return;
      tallas.querySelectorAll('.ds-size').forEach(x => x.classList.toggle('is-on', x === b));
    });

    /* detalles */
    const dl = $('pdp-detalles');
    (f.detalles || []).forEach(row => {
      dl.insertAdjacentHTML('beforeend',
        '<div class="ds-pdp__row"><dt>' + esc(row.clave || '') + '</dt><dd>' +
        (vacio(row.valor) ? falta('ficha.detalles.' + slug(row.clave || '')) : esc(row.valor)) + '</dd></div>');

      /* La tela depende de la CATEGORÍA, no del diseño: Clásicas es algodón
         liviano y Oversize algodón pesado. Se inserta justo después de
         «Material», que es su sitio natural. Las categorías que no están en
         el mapa no pintan la fila: no hay dato que falte, es que no aplica. */
      if (slug(row.clave || '') === 'material') {
        const tela = (f.tela_por_categoria || {})[p.categoria];
        if (tela) {
          dl.insertAdjacentHTML('beforeend',
            '<div class="ds-pdp__row"><dt>' + esc(f.label_tela || 'Tela') +
            '</dt><dd>' + esc(tela) + '</dd></div>');
        }
      }
    });

    /* r4i (29/10/2026 14:37:55): ficha «como las referencias» (Jose: «debes de rediseñar también la otra parte»): los detalles pasan a
       desplegables como en Strada: «Detalles de la prenda» (abierto: material, tela, estampado…), «Envíos» y «Cambios».
       Se MUEVEN las mismas filas (mismo dato de marca.json); no se escribe ningún texto nuevo salvo los títulos. */
    if (document.body.classList.contains('ficha-ref') && dl) {
      const filas = Array.from(dl.querySelectorAll('.ds-pdp__row'));
      const clave = r => slug((r.querySelector('dt') || {}).textContent || '');
      const caja = document.createElement('div'); caja.className = 'pdp-acord';
      const grupo = (titulo, rows, abierto) => {
        if (!rows.length) return;
        const d = document.createElement('details'); d.className = 'pdp-acord__i'; if (abierto) d.open = true;
        d.innerHTML = '<summary>' + esc(titulo) + '</summary>';
        const cont = document.createElement('dl'); cont.className = 'pdp-acord__c';
        rows.forEach(r => cont.appendChild(r)); d.appendChild(cont); caja.appendChild(d);
      };
      const esEnvio = r => /^env/.test(clave(r)), esCambio = r => /^cambio/.test(clave(r));
      const prenda = filas.filter(r => !esEnvio(r) && !esCambio(r));
      const envio = filas.filter(esEnvio), cambio = filas.filter(esCambio);
      grupo(f.acordeon_prenda || 'Detalles de la prenda', prenda, true);
      grupo(envio.length ? (envio[0].querySelector('dt') || {}).textContent : '', envio, false);
      grupo(cambio.length ? (cambio[0].querySelector('dt') || {}).textContent : '', cambio, false);
      dl.parentNode.appendChild(caja);
    }
    const host = $('pdp-acciones');
    if (host) {
      host.appendChild(accionesPedido(p, () => vs[idx], {
        ficha: true,
        /* la talla también se lee en el clic, no en el render */
        tallaActiva: () => {
          const b = tallas.querySelector('.ds-size.is-on');
          return b && !b.disabled ? b.textContent.trim() : '';
        }
      }));
      if (!wa) host.insertAdjacentHTML('beforeend', ' ' + falta('contacto.whatsapp'));
    }

    ver(idx);

    /* r4 (29/10/2026): «Más <categoría>»: hasta 4 diseños de la misma categoría, primero los que tienen tomas,
       en el orden del catálogo a partir de este (así cada ficha muestra otros). Tarjetas iguales a las del catálogo. */
    const masBox = $('pdp-mas'), masGrid = $('pdp-mas-grid');
    if (masBox && masGrid) {
      const mismos = visibles.filter(x => x.categoria === p.categoria && x.id !== p.id);
      const desde = Math.max(0, visibles.indexOf(p));
      const orden = visibles.slice(desde + 1).concat(visibles.slice(0, desde)).filter(x => mismos.indexOf(x) >= 0);
      const conTomas = orden.filter(x => variantesConFoto(x).some(v => tomasDe(v)));
      const lista = conTomas.concat(orden.filter(x => conTomas.indexOf(x) < 0)).slice(0, 4);
      if (lista.length) {
        masBox.hidden = false;
        $('pdp-mas-t').textContent = (f.mas_titulo || 'Más') + ' ' + String(p.categoria || '').toLowerCase();
        lista.forEach((x, i) => masGrid.appendChild(tarjeta(x, i)));
        const b = $('pdp-mas-btn');
        if (b) { b.textContent = f.mas_boton || 'Ver toda la categoría'; b.href = 'catalogo.html?categoria=' + encodeURIComponent(p.categoria || ''); }
        observarReveal();
      }
    }
  }

  /* ================================================================
     PÁGINA LEGAL
     El contenido vive en legal.json, no en el HTML. Son tres documentos
     BORRADOR pendientes de revisión por abogado.
     ================================================================ */
  async function pintarLegal(d) {
    anuncioMarquesina();
    const marca = d.marca || {}, nombre = marca.nombre || '';
    let L;
    try {
      const r = await fetch('legal.json', { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      L = await r.json();
    } catch (err) { mostrarError('legal.json', err); return; }

    document.title = [nombre, L.titulo || 'Legal'].filter(Boolean).join(' — ');
    txt($('legal-titulo'), L.titulo, 'legal.titulo');
    txt($('legal-bajada'), L.bajada, 'legal.bajada');
    txt($('legal-aviso'), L.aviso_borrador, 'legal.aviso_borrador');
    txt($('legal-fecha'), L.actualizado_texto, 'legal.actualizado_texto');

    const docs = L.documentos || [];
    $('legal-indice').innerHTML = docs.map(x =>
      '<a href="#' + esc(x.id) + '">' + esc(x.titulo) + '</a>').join('');

    const cont = $('legal-docs');
    cont.innerHTML = docs.map(doc => {
      const secs = (doc.secciones || []).map(sec => {
        const p1 = (sec.parrafos || []).map(t => '<p>' + esc(t) + '</p>').join('');
        const lt = sec.lista_titulo ? '<p class="legal-lt">' + esc(sec.lista_titulo) + '</p>' : '';
        const li = (sec.lista || []).length
          ? '<ul>' + sec.lista.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>' : '';
        const p2 = (sec.parrafos_final || []).map(t => '<p>' + esc(t) + '</p>').join('');
        return '<div class="legal-sec' + (sec.destacado ? ' legal-sec--destacada' : '') + '">' +
          '<h3>' + esc(sec.titulo || '') + '</h3>' + p1 + lt + li + p2 + '</div>';
      }).join('');
      return '<article class="legal-doc" id="' + esc(doc.id) + '" data-reveal>' +
        '<h2 class="ds-title">' + esc(doc.titulo || '') + '</h2>' +
        (doc.intro ? '<p class="ds-intro">' + esc(doc.intro) + '</p>' : '') +
        secs + '</article>';
    }).join('');
    observarReveal();
  }

  /* ================================================================
     REGISTRO
     Reactivado el 2026-08-05: ahora tiene propósito (10% de la primera
     compra y aviso de diseños nuevos).

     Dos cosas deliberadas:
     · NO salta al cargar. El módulo del export lo hacía a los 700 ms y
       tapaba el viewport entero, que fue justo la queja. Aquí aparece
       una sola vez, y solo cuando la visitante ya pasó del 60% de la
       página: si llegó hasta ahí, el registro le puede interesar.
     · La casilla de datos NO viene premarcada y es obligatoria, como
       exige la Ley 1581 de 2012. Sin marcarla no se completa nada.

     ⚠ Guarda en localStorage. NO hay captura real de datos: para KPIs y
     mercadeo hace falta backend. Es F4/F5. Ver TRASPASO §0.16.
     ================================================================ */
  const REG_KEY = 'tuenti_registro_v1';
  const REG_VISTO = 'tuenti_registro_visto_v1';
  const registrado = () => { try { return !!localStorage.getItem(REG_KEY); } catch (e) { return false; } };

  function regMontar() {
    if (document.getElementById('reg') || !DATOS) return;
    asegurarCSS();
    const r = (DATOS.registro || {});
    const fondo = document.createElement('div');
    fondo.className = 'reg-fondo'; fondo.id = 'reg-fondo';
    const caja = document.createElement('div');
    caja.className = 'reg'; caja.id = 'reg';
    caja.setAttribute('role', 'dialog');
    caja.setAttribute('aria-modal', 'true');
    caja.setAttribute('aria-label', r.titulo || 'Registro');
    caja.innerHTML =
      '<button class="reg__x" id="reg-x" type="button" aria-label="' + esc(r.cerrar || 'Cerrar') + '">&times;</button>' +
      '<h2 class="reg__t">' + esc(r.titulo || '') + '</h2>' +
      '<p class="reg__p">' + esc(r.texto || '').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') + '</p>' +
      '<form id="reg-form" novalidate>' +
      '<label class="reg-campo"><span>' + esc(r.label_nombre || 'Nombre') + '</span>' +
      '<input name="nombre" autocomplete="name" required></label>' +
      '<label class="reg-campo"><span>' + esc(r.label_whatsapp || 'WhatsApp') + '</span>' +
      '<input name="whatsapp" inputmode="tel" autocomplete="tel" required></label>' +
      '<label class="reg-campo"><span>' + esc(r.label_email || 'Correo') + '</span>' +
      '<input name="email" type="email" autocomplete="email"></label>' +
      /* casilla de datos: obligatoria y SIN premarcar */
      '<label class="reg-datos"><input type="checkbox" name="datos" id="reg-datos">' +
      '<span class="reg-datos__caja"></span>' +
      '<span class="reg-datos__txt">' + esc(r.label_datos || '') +
      ' <a href="' + esc(r.enlace_datos || 'legal.html#datos') + '" target="_blank" rel="noopener">' +
      esc(r.enlace_datos_texto || 'Leer la política') + '</a></span></label>' +
      '<p class="reg-error" id="reg-error" role="alert" hidden></p>' +
      '<button class="ds-btn ds-btn--acento reg-enviar" type="submit">' +
      esc(r.boton || 'Crear mi cuenta') + '</button>' +
      '<button class="reg-luego" id="reg-luego" type="button">' + esc(r.cerrar || 'Ahora no') + '</button>' +
      '</form>';
    document.body.appendChild(fondo);
    document.body.appendChild(caja);

    const cerrar = () => {
      caja.classList.remove('abierto'); fondo.classList.remove('abierto');
      try { localStorage.setItem(REG_VISTO, '1'); } catch (e) { }
    };
    fondo.addEventListener('click', cerrar);
    document.getElementById('reg-x').addEventListener('click', cerrar);
    document.getElementById('reg-luego').addEventListener('click', cerrar);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(); });

    document.getElementById('reg-form').addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target, err = document.getElementById('reg-error');
      const datos = Object.fromEntries(new FormData(f));
      const marcado = document.getElementById('reg-datos').checked;
      const mostrar = m => { err.textContent = m; err.hidden = false; };
      if (!String(datos.nombre || '').trim() || !String(datos.whatsapp || '').trim()) {
        mostrar(r.error_campos || 'Falta el nombre o el WhatsApp.'); return;
      }
      /* sin autorización expresa no se guarda nada */
      if (!marcado) { mostrar(r.error_datos || 'Necesitas autorizar el tratamiento de datos.'); return; }
      err.hidden = true;
      try {
        localStorage.setItem(REG_KEY, JSON.stringify({
          nombre: datos.nombre, whatsapp: datos.whatsapp, email: datos.email || '',
          autoriza_datos: true, fecha: new Date().toISOString()
        }));
      } catch (e) { }
      cerrar();
      avisar(r.exito || 'Listo.');
    });
  }

  function regAbrir() {
    regMontar();
    if (registrado()) { avisar((DATOS.registro || {}).ya_registrado || 'Ya tienes cuenta.'); return; }
    const c = document.getElementById('reg'), f = document.getElementById('reg-fondo');
    if (c) c.classList.add('abierto');
    if (f) f.classList.add('abierto');
  }

  /* Se ofrece una sola vez, y no al cargar: cuando pasa del 60% de la página. */
  function regVigilar() {
    let visto = false;
    try { visto = !!localStorage.getItem(REG_VISTO); } catch (e) { }
    if (visto || registrado()) return;
    const mirar = () => {
      const alto = document.documentElement.scrollHeight - window.innerHeight;
      if (alto > 0 && (window.scrollY / alto) > 0.6) {
        window.removeEventListener('scroll', mirar);
        regAbrir();
      }
    };
    window.addEventListener('scroll', mirar, { passive: true });
  }

  /* ---------- arranque ---------- */
  (async function () {
    let datos;
    try {
      const r = await fetch('marca.json', { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      datos = await r.json();
    } catch (err) { mostrarError('marca.json', err); return; }
    DATOS = datos;
    /* Retirados «por ahora» (Jose 15/10/2026 17:19:09): con retirados_por_ahora.mostrar = true
       vuelven sus productos, su categoría y su foto. Una sola línea de marca.json. */
    const rp = datos.retirados_por_ahora;
    if (rp && rp.mostrar === true) {
      datos.productos = (datos.productos || []).concat(rp.productos || []);
      datos.categorias = datos.categorias || [];
      (rp.categorias || []).forEach(c => { if (datos.categorias.indexOf(c) < 0) datos.categorias.push(c); });
      datos.categorias_fotos = Object.assign(datos.categorias_fotos || {}, rp.categorias_fotos || {});
    }

    /* El icono del carrito del nav abre el cajón, que es donde se edita.
       Va en fase de captura por si quedara algún otro escucha en burbuja. */
    carMontar();
    carPintar();
    document.addEventListener('click', e => {
      const cb = e.target.closest('.t-cart-btn');
      if (!cb) return;
      e.preventDefault();
      e.stopPropagation();
      carAbrir();
    }, true);

    try {
      pintarComunes(datos);
      const p = pagina();
      if (p === 'legal') pintarLegal(datos);
      else if (p === 'catalogo') pintarCatalogo(datos);
      else if (p === 'producto') pintarProducto(datos);
      else pintarIndex(datos);
      observarReveal();

      /* Registro: se monta siempre (para el botón del pie) pero solo se
         ofrece solo en la portada, y no al cargar. Ver el comentario del
         módulo: nunca al arrancar, nunca dos veces. */
      regMontar();
      if (p === 'index') regVigilar();
    } catch (err) { mostrarError('marca.json', err); }
  })();
})();
