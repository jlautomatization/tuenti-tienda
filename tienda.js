/* ================================================================
   MÓDULO TIENDA (demo) — carrito + checkout + registro en localStorage.
   Uso en cada sitio:
     <link rel="stylesheet" href="/segmentos/tienda.css">
     <script src="/segmentos/tienda.js" defer></script>
   y tras cargar cliente.json:  Tienda.init({nombre, whatsapp});
   Productos: botón con  data-add data-nombre data-precio data-foto
   WhatsApp por ítem:     data-wa-item data-nombre data-precio
   Botón carrito en nav:  <button class="t-cart-btn">…<span class="t-count"></span></button>
   ================================================================ */
(function(){
  const cfg={nombre:'Tienda',whatsapp:'',moneda:'es-CO',
    regVideo:'/segmentos/animaciones/registro-ilustracion.mp4',
    regPoster:'/segmentos/animaciones/reg-poster.jpg',registro:true};
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const slug=s=>String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const money=n=>'$'+Number(n||0).toLocaleString(cfg.moneda);
  const wa=svg=>'<svg viewBox="0 0 32 32"><path d="M16 3C9 3 3.5 8.5 3.5 15.5c0 2.4.7 4.7 1.9 6.7L3 29l7-1.8c1.9 1 4 1.6 6 1.6 7 0 12.5-5.5 12.5-12.5S23 3 16 3zm0 22c-1.8 0-3.6-.5-5.1-1.4l-.4-.2-4.2 1.1 1.1-4.1-.2-.4C6.4 18.9 6 17.2 6 15.5 6 9.7 10.7 5 16 5s10 4.7 10 10.5S21.3 25 16 25zm5.7-7.3c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2s-.8 1-.9 1.2c-.2.2-.3.2-.6.1-1.7-.8-2.8-1.5-3.9-3.4-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5s-.7-1.7-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.5 1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3z"/></svg>';
  let KEY='t_cart', view='cart', ov, drawer, body, foot, title, regOv;

  const get=()=>{try{return JSON.parse(localStorage.getItem(KEY))||[]}catch(e){return[]}};
  const set=c=>{localStorage.setItem(KEY,JSON.stringify(c));render();};
  const count=()=>get().reduce((a,b)=>a+b.qty,0);
  const total=()=>get().reduce((a,b)=>a+b.precio*b.qty,0);

  function add(it){
    const c=get(),i=c.findIndex(x=>x.nombre===it.nombre);
    if(i>=0)c[i].qty+=it.qty||1; else c.push({nombre:it.nombre,precio:+it.precio||0,foto:it.foto||'',qty:it.qty||1});
    set(c);toast('Añadido: '+it.nombre);
  }
  function chQty(nombre,d){const c=get(),i=c.findIndex(x=>x.nombre===nombre);if(i<0)return;
    c[i].qty+=d;if(c[i].qty<=0)c.splice(i,1);set(c);}
  function quitar(nombre){set(get().filter(x=>x.nombre!==nombre));}

  function waMsg(datos){
    const c=get();let m='Hola '+cfg.nombre+', quiero hacer este pedido:%0A';
    c.forEach(x=>{m+='%0A• '+x.qty+'× '+x.nombre+' — '+money(x.precio*x.qty);});
    m+='%0A%0ATotal: '+money(total());
    if(datos){m+='%0A%0ADatos de envío:%0ANombre: '+datos.nombre+'%0ATeléfono: '+datos.tel+'%0ADirección: '+datos.dir+', '+datos.ciudad;
      if(datos.notas)m+='%0ANotas: '+datos.notas;}
    return 'https://wa.me/'+String(cfg.whatsapp).replace(/[^0-9]/g,'')+'?text='+m.replace(/ /g,'%20');
  }

  /* ---------- render ---------- */
  function render(){
    document.querySelectorAll('.t-count').forEach(e=>{const n=count();e.textContent=n;e.dataset.n=n;});
    if(!drawer)return;
    const c=get();
    if(view==='cart'){
      title.textContent='Tu pedido';
      body.innerHTML = c.length? c.map(x=>
        '<div class="t-item">'+(x.foto?'<img class="t-item-img" src="'+esc(x.foto)+'" alt="">':'<div class="t-item-img"></div>')+
        '<div class="t-item-in"><span class="n">'+esc(x.nombre)+'</span><span class="p">'+money(x.precio)+'</span>'+
        '<span class="t-qty"><button data-q="-" data-n="'+esc(x.nombre)+'">−</button>'+x.qty+'<button data-q="+" data-n="'+esc(x.nombre)+'">+</button></span></div>'+
        '<button class="quitar" data-quitar="'+esc(x.nombre)+'">Quitar</button></div>'
      ).join('') : '<p class="t-vacio">Tu carrito está vacío.<br>Añade productos con «Pedir por página».</p>';
      foot.innerHTML = c.length?
        '<div class="t-total"><span>Total</span><span>'+money(total())+'</span></div>'+
        '<button class="t-cta pri" data-go="checkout">Continuar con el pago</button>'+
        '<button class="t-cta wa" data-wa-cart>'+wa()+'Continuar por WhatsApp</button>' : '';
    } else if(view==='checkout'){
      title.textContent='Datos de envío';
      body.innerHTML =
        '<button class="t-back" data-go="cart">← Volver al carrito</button>'+
        '<form id="t-checkout">'+
        '<label class="t-campo"><span>Nombre completo</span><input name="nombre" required></label>'+
        '<label class="t-campo"><span>Teléfono</span><input name="tel" inputmode="tel" required></label>'+
        '<label class="t-campo"><span>Dirección</span><input name="dir" required></label>'+
        '<div class="t-2"><label class="t-campo"><span>Ciudad</span><input name="ciudad" required></label>'+
        '<label class="t-campo"><span>Barrio (opcional)</span><input name="barrio"></label></div>'+
        '<label class="t-campo"><span>Notas (opcional)</span><textarea name="notas"></textarea></label>'+
        '</form>';
      foot.innerHTML =
        '<div class="t-total"><span>Total</span><span>'+money(total())+'</span></div>'+
        '<button class="t-cta pri" data-confirmar>Confirmar pedido</button>'+
        '<button class="t-cta wa" data-wa-checkout>'+wa()+'Enviar pedido por WhatsApp</button>';
    } else if(view==='conf'){
      title.textContent='Pedido';
      const o=window.__ultimoPedido||{};
      body.innerHTML='<div class="t-conf">'+
        '<div class="ok"><svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></div>'+
        '<h3>¡Pedido guardado!</h3><p>Gracias '+esc((o.datos&&o.datos.nombre)||'')+'. Guardamos tu pedido en este navegador (demo).</p>'+
        '<div class="t-resumen">'+(o.items||[]).map(x=>'<div class="r"><span>'+x.qty+'× '+esc(x.nombre)+'</span><b>'+money(x.precio*x.qty)+'</b></div>').join('')+
        '<div class="r" style="margin-top:.5rem;border-top:1px solid var(--t-line);padding-top:.5rem"><span>Total</span><b>'+money(o.total||0)+'</b></div></div>'+
        '</div>';
      foot.innerHTML='<button class="t-cta wa" data-wa-conf>'+wa()+'Confirmar el pedido por WhatsApp</button>'+
        '<button class="t-cta ghost" data-close>Cerrar</button>';
    }
  }

  function open(v){view=v||'cart';render();ov.classList.add('open');drawer.classList.add('open');document.body.style.overflow='hidden';}
  function close(){ov.classList.remove('open');drawer.classList.remove('open');document.body.style.overflow='';}

  /* ---------- toast ---------- */
  let toEl,toT;
  function toast(m){if(!toEl){toEl=document.createElement('div');toEl.className='t-toast';document.body.appendChild(toEl);}
    toEl.textContent=m;toEl.classList.add('show');clearTimeout(toT);toT=setTimeout(()=>toEl.classList.remove('show'),2200);}

  /* ---------- construir DOM ---------- */
  function build(){
    ov=document.createElement('div');ov.className='t-ov';ov.setAttribute('data-close','');
    drawer=document.createElement('aside');drawer.className='t-drawer';
    drawer.innerHTML='<div class="t-head"><h3 id="t-title">Tu pedido</h3><button class="t-x" data-close aria-label="Cerrar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><div class="t-body" id="t-body"></div><div class="t-foot" id="t-foot"></div>';
    document.body.append(ov,drawer);
    title=drawer.querySelector('#t-title');body=drawer.querySelector('#t-body');foot=drawer.querySelector('#t-foot');

    /* registro */
    regOv=document.createElement('div');regOv.className='t-reg-ov';
    regOv.innerHTML='<div class="t-reg"><div class="t-reg-vid"><video src="'+esc(cfg.regVideo)+'" poster="'+esc(cfg.regPoster)+'" autoplay muted loop playsinline></video></div>'+
      '<div class="t-reg-form"><button class="t-reg-x" data-reg-skip aria-label="Cerrar"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'+
      '<h2 id="t-reg-h">Crea tu cuenta</h2><p class="sub" id="t-reg-sub">Regístrate para pedir más rápido y guardar tus datos.</p>'+
      '<form id="t-reg-form"><label class="t-campo" id="t-reg-nombre"><span>Nombre</span><input name="nombre"></label>'+
      '<label class="t-campo"><span>Correo</span><input type="email" name="email" required></label>'+
      '<label class="t-campo"><span>Contraseña</span><input type="password" name="pass" required minlength="4"></label>'+
      '<button class="t-cta pri" type="submit" id="t-reg-submit">Crear cuenta</button></form>'+
      '<p class="alt" id="t-reg-alt">¿Ya tienes cuenta? <button type="button" id="t-reg-toggle">Entrar</button></p>'+
      '<button class="saltar" data-reg-skip>Seguir sin registrarme</button></div></div>';
    document.body.appendChild(regOv);
    wireReg();
  }

  /* ---------- registro ---------- */
  let modo='signup';
  function wireReg(){
    const h=regOv.querySelector('#t-reg-h'),sub=regOv.querySelector('#t-reg-sub'),nom=regOv.querySelector('#t-reg-nombre'),
      sb=regOv.querySelector('#t-reg-submit'),alt=regOv.querySelector('#t-reg-alt');
    function toggle(){
      modo=modo==='signup'?'login':'signup';
      if(modo==='login'){h.textContent='Bienvenido de nuevo';sub.textContent='Entra para continuar.';nom.classList.add('t-hidden');sb.textContent='Entrar';alt.innerHTML='¿No tienes cuenta? <button type="button" id="t-reg-toggle">Crear cuenta</button>';}
      else{h.textContent='Crea tu cuenta';sub.textContent='Regístrate para pedir más rápido y guardar tus datos.';nom.classList.remove('t-hidden');sb.textContent='Crear cuenta';alt.innerHTML='¿Ya tienes cuenta? <button type="button" id="t-reg-toggle">Entrar</button>';}
    }
    alt.addEventListener('click',e=>{if(e.target.id==='t-reg-toggle')toggle();});
    regOv.querySelector('#t-reg-form').addEventListener('submit',e=>{
      e.preventDefault();const d=Object.fromEntries(new FormData(e.target));
      localStorage.setItem('t_user_'+slug(cfg.nombre),JSON.stringify({nombre:d.nombre||'',email:d.email}));
      cerrarReg();toast('¡Bienvenido'+(d.nombre?', '+d.nombre.split(' ')[0]:'')+'!');
    });
    regOv.querySelectorAll('[data-reg-skip]').forEach(b=>b.addEventListener('click',cerrarReg));
    regOv.addEventListener('click',e=>{if(e.target===regOv)cerrarReg();});
  }
  function cerrarReg(){regOv.classList.remove('open');sessionStorage.setItem('t_reg_seen_'+slug(cfg.nombre),'1');}
  function mostrarReg(){
    if(!cfg.registro)return;
    if(localStorage.getItem('t_user_'+slug(cfg.nombre)))return;
    if(sessionStorage.getItem('t_reg_seen_'+slug(cfg.nombre)))return;
    setTimeout(()=>regOv.classList.add('open'),700);
  }

  /* ---------- eventos (delegación) ---------- */
  function wire(){
    document.addEventListener('click',e=>{
      const add=e.target.closest('[data-add]');
      if(add){e.preventDefault();add.blur&&add.blur();
        Tienda.add({nombre:add.dataset.nombre,precio:add.dataset.precio,foto:add.dataset.foto});return;}
      const wi=e.target.closest('[data-wa-item]');
      if(wi){e.preventDefault();const l='https://wa.me/'+String(cfg.whatsapp).replace(/[^0-9]/g,'')+
        '?text='+encodeURIComponent('Hola '+cfg.nombre+', me interesa: '+wi.dataset.nombre+(wi.dataset.precio?' ('+money(wi.dataset.precio)+')':''));
        window.open(l,'_blank','noopener');return;}
      const cb=e.target.closest('.t-cart-btn');if(cb){e.preventDefault();open('cart');return;}
      if(e.target.closest('[data-close]')){close();return;}
      const q=e.target.closest('[data-q]');if(q){chQty(q.dataset.n,q.dataset.q==='+'?1:-1);return;}
      const qu=e.target.closest('[data-quitar]');if(qu){quitar(qu.dataset.quitar);return;}
      const go=e.target.closest('[data-go]');if(go){view=go.dataset.go;render();return;}
      if(e.target.closest('[data-wa-cart]')){window.open(waMsg(null),'_blank','noopener');return;}
      if(e.target.closest('[data-confirmar]')){confirmar(false);return;}
      if(e.target.closest('[data-wa-checkout]')){confirmar(true);return;}
      if(e.target.closest('[data-wa-conf]')){const o=window.__ultimoPedido;window.open(waMsg(o&&o.datos),'_blank','noopener');return;}
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){close();cerrarReg();}});
  }

  function confirmar(porWa){
    const f=document.getElementById('t-checkout');if(!f)return;
    if(!f.reportValidity())return;
    const datos=Object.fromEntries(new FormData(f));
    const items=get();
    window.__ultimoPedido={items,total:total(),datos,fecha:new Date().toISOString()};
    const okey='t_pedidos_'+slug(cfg.nombre);const arr=JSON.parse(localStorage.getItem(okey)||'[]');
    arr.push(window.__ultimoPedido);localStorage.setItem(okey,JSON.stringify(arr));
    if(porWa)window.open(waMsg(datos),'_blank','noopener');
    localStorage.removeItem(KEY);view='conf';render();
  }

  window.Tienda={
    init(o){Object.assign(cfg,o||{});KEY='t_cart_'+slug(cfg.nombre);
      if(!drawer)build();wire();render();mostrarReg();},
    add,open:()=>open('cart')
  };
})();
