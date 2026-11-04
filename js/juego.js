/* =========================================================
   NEXTCARD · Futurmovil — interfaz del juego
   ========================================================= */
'use strict';
const CFG = {
  API: 'https://script.google.com/macros/s/AKfycbw8_-zlUqms9IkTRSt4FqkoPs5JONrjLMhK3rdc1JOd3CsmPSW19rqQMuLDlPCKj4s/exec',
  GOOGLE: '454055120059-nuhaop4r62urc3u036cc3grpqo71ulg7.apps.googleusercontent.com',
  URL: 'https://puntofibra.github.io/nextcard/',
  WHATSAPP: '34633200100'
};

/* ---------- utilidades ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = n => (Number(n) || 0).toLocaleString('es-ES');
const euros = c => ((Number(c) || 0) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const espera = ms => new Promise(r => setTimeout(r, ms));
const vib = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
function store(k, v) { try { localStorage.setItem('nc_' + k, JSON.stringify(v)); } catch (e) {} }
function load(k, d) { try { const v = localStorage.getItem('nc_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
const esMovil = matchMedia('(pointer:coarse)').matches;
function tiempo(ms) {
  if (ms <= 0) return '¡Lista!';
  const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(ss).padStart(2, '0')}s`;
}
const IC = Arte.IC;

/* =========================================================
   FONDO ANIMADO (estrellas y nebulosas)
   ========================================================= */
(function fondo() {
  const cv = $('#bg'), x = cv.getContext('2d'); let w, h, est = [], fug = [];
  function rs() { const d = Math.min(2, devicePixelRatio || 1); w = cv.width = innerWidth * d; h = cv.height = innerHeight * d; est = Array.from({ length: Math.min(260, (innerWidth * innerHeight) / 5000) }, () => ({ x: Math.random() * w, y: Math.random() * h, z: Math.random() * 1 + 0.2, f: Math.random() * 7 })); }
  rs(); addEventListener('resize', rs);
  function frame(t) {
    if (!Batalla.activa) {
      x.clearRect(0, 0, w, h);
      const a = NC.ARENAS[(SES && SES.perfil && SES.perfil.arena) || 0];
      const g = x.createRadialGradient(w * 0.7, h * 0.2, 0, w * 0.7, h * 0.2, Math.max(w, h) * 0.6); g.addColorStop(0, a.col + '22'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      const g2 = x.createRadialGradient(w * 0.15, h * 0.85, 0, w * 0.15, h * 0.85, Math.max(w, h) * 0.5); g2.addColorStop(0, a.col2 + '1c'); g2.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g2; x.fillRect(0, 0, w, h);
      est.forEach(s => { s.y += s.z * 0.25; if (s.y > h) { s.y = 0; s.x = Math.random() * w; } x.globalAlpha = 0.35 + Math.sin(t / 600 + s.f) * 0.3 + s.z * 0.2; x.fillStyle = '#fff'; x.fillRect(s.x, s.y, s.z * 1.7, s.z * 1.7); });
      if (Math.random() < 0.006) fug.push({ x: Math.random() * w, y: Math.random() * h * 0.5, v: 12 + Math.random() * 10, l: 1 });
      fug = fug.filter(f => (f.l -= 0.02) > 0); fug.forEach(f => { f.x += f.v; f.y += f.v * 0.45; x.globalAlpha = f.l; x.strokeStyle = '#bff6ff'; x.lineWidth = 2; x.beginPath(); x.moveTo(f.x, f.y); x.lineTo(f.x - f.v * 6, f.y - f.v * 2.7); x.stroke(); });
      x.globalAlpha = 1;
    }
    if (!document.hidden) requestAnimationFrame(frame); else setTimeout(() => requestAnimationFrame(frame), 500);
  }
  requestAnimationFrame(frame);
})();

/* =========================================================
   API Y SESIÓN
   ========================================================= */
let SES = load('ses', null), PRECIOS = load('precios', null), AVISO = '', VISTA = '', OFFSET = 0;
function api(accion, datos) {
  if (!CFG.API || /[?&]demo=1/.test(location.search)) return Demo.api(accion, datos || {});
  return fetch(CFG.API, { method: 'POST', body: JSON.stringify(Object.assign({ accion }, datos || {})) })
    .then(r => r.json())
    .then(d => { if (!d.ok && d.error === 'SESION') { cerrarSesion(true); d.error = 'Tu sesión ha caducado. Vuelve a entrar.'; } return d; })
    .catch(() => ({ ok: false, error: 'Sin conexión. Inténtalo otra vez.' }));
}
function conSes(accion, datos) { return api(accion, Object.assign({ token: SES && SES.token }, datos || {})); }
const P = () => (SES && SES.perfil) || {};
const ahora = () => Date.now() + OFFSET;
function aplicaPerfil(p) {
  if (!p || !SES) return;
  const antes = SES.perfil || {};
  if (p.ahora) OFFSET = p.ahora - Date.now();
  SES.perfil = p; store('ses', SES); pintaTop();
  [['creditos', '#tCred'], ['gemas', '#tGemas'], ['trofeos', '#tTrof']].forEach(([k, s]) => { if (antes[k] != null && p[k] !== antes[k]) { const el = $(s); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } });
  if (antes.nivel && p.nivel > antes.nivel) setTimeout(() => subeNivel(p.nivel), 600);
}
function refrescar() { return conSes('yo').then(d => { if (!d.ok) return d; AVISO = d.aviso || ''; if (d.tienda) { PRECIOS = d.tienda; store('precios', PRECIOS); } aplicaPerfil(d.perfil); if (VISTA === 'inicio' && $('#modal').classList.contains('oculto')) ir('inicio', true); return d; }); }
function pintaTop() {
  if (!SES) return; const p = P();
  $('#tNiv').textContent = p.nivel || 1;
  $('#tNom').textContent = p.usuario || '';
  const xp0 = NC.XP_NIVEL[(p.nivel || 1) - 1] || 0, xp1 = NC.XP_NIVEL[p.nivel || 1];
  $('#tXp').style.width = xp1 ? Math.min(100, (p.xp - xp0) / (xp1 - xp0) * 100) + '%' : '100%';
  $('#tTrof span').textContent = fmt(p.trofeos);
  $('#tCred span').textContent = fmt(p.creditos);
  $('#tGemas span').textContent = fmt(p.gemas);
  $('#tPase').classList.toggle('oculto', !p.pase);
}
function entrarSesion(d) {
  SES = { token: d.token, perfil: d.perfil }; store('ses', SES);
  Son.init();
  toast('¡Hola, ' + d.perfil.usuario + '!', 'ok');
  aplicaPerfil(d.perfil);
  refrescar(); ir('inicio');
}
function cerrarSesion(silencio) {
  if (SES && !silencio) api('salir', { token: SES.token });
  SES = null; store('ses', null); ir('login');
}

/* =========================================================
   INTERFAZ COMÚN
   ========================================================= */
function toast(t, tipo) { const d = document.createElement('div'); d.className = 'toast ' + (tipo || ''); d.textContent = t; $('#toasts').appendChild(d); setTimeout(() => d.remove(), 3500); if (tipo === 'err') Son.error(); }
let alCerrarModal = null;
function modal(html, opts) {
  opts = opts || {};
  const m = $('#modal'); $('.mCont', m).innerHTML = html; $('.mCaja', m).className = 'mCaja ' + (opts.cls || '');
  m.classList.remove('oculto'); $('.mCaja', m).scrollTop = 0; alCerrarModal = opts.alCerrar || null;
  $('.mCerrar', m).classList.toggle('oculto', !!opts.sinCerrar);
  pintaArtes($('.mCont', m));
  return $('.mCont', m);
}
function cerrarModal() { $('#modal').classList.add('oculto'); $('.mCont', $('#modal')).innerHTML = ''; if (alCerrarModal) { const f = alCerrarModal; alCerrarModal = null; f(); } }
$('#modal .mFondo').onclick = () => { if (!$('#modal .mCerrar').classList.contains('oculto')) cerrarModal(); };
$('#modal .mCerrar').onclick = () => { Son.click(); cerrarModal(); };
function confirmar(tit, txt, si, cls) {
  return new Promise(res => {
    const c = modal(`<h2>${esc(tit)}</h2><p class="nota">${txt}</p><div class="acciones"><button class="btn sec" id="cNo">Cancelar</button><button class="btn ${cls || 'verde'}" id="cSi">${esc(si || 'Aceptar')}</button></div>`, { cls: 'peq', alCerrar: () => res(false) });
    $('#cNo', c).onclick = () => cerrarModal();
    $('#cSi', c).onclick = () => { alCerrarModal = null; cerrarModal(); res(true); };
  });
}
function ocupado(b, si) { if (!b) return; b.disabled = si; b.classList.toggle('ocupado', si); }

/* cartas */
function pintaArtes(root) {
  $$('img[data-arte]', root).forEach(im => {
    const a = Arte.arteCarta(im.dataset.arte);
    if (a.src) { im.src = a.src; im.removeAttribute('data-arte'); }
    else a.listo.then(src => { im.src = src; im.removeAttribute('data-arte'); });
  });
}
function cartaHTML(id, o) {
  o = o || {}; const c = NC.MAPA[id], mia = (P().cartas || {})[id];
  const nivel = o.nivel || (mia ? mia.n : 1), cop = mia ? mia.c : 0, nec = NC.copiasPara(c.rar, nivel);
  const bloq = !mia && !o.libre, mejora = mia && nec && cop >= nec;
  return `<div class="carta r-${c.rar} ${bloq ? 'bloq' : ''} ${mejora ? 'mejorable' : ''} ${o.cls || ''}" data-id="${id}">
    <div class="cMarco"><img data-arte="${id}" alt=""><span class="cCoste">${c.coste}</span>${c.rar === 'l' ? '<i class="holo"></i>' : ''}
    ${mia && mia.nueva ? '<span class="cNueva">NUEVA</span>' : ''}</div>
    ${o.sinPie ? '' : `<div class="cPie">${bloq ? `<span class="cBloq">Galaxia ${c.arena + 1}</span>` : `<span class="cNiv">Nivel ${nivel}</span>
    ${o.sinBarra ? '' : `<div class="cBarra ${mejora ? 'lista' : ''}"><i style="width:${nec ? Math.min(100, cop / nec * 100) : 100}%"></i><span>${nec ? (mejora ? '▲ ' : '') + cop + '/' + nec : 'MÁX'}</span></div>`}`}</div>`}
  </div>`;
}

/* =========================================================
   NAVEGACIÓN
   ========================================================= */
const VISTAS = {};
function ir(v, sinSonido) {
  if (!SES && v !== 'login') v = 'login';
  if (v !== VISTA && !sinSonido) Son.tab();
  VISTA = v; store('vista', v === 'login' ? 'inicio' : v);
  const enJuego = v !== 'login';
  $('#top').classList.toggle('oculto', !enJuego); $('#nav').classList.toggle('oculto', !enJuego);
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  document.body.dataset.vista = v;
  const app = $('#app'); app.classList.remove('entra'); void app.offsetWidth; app.classList.add('entra');
  clearInterval(relojVista); relojVista = 0;
  VISTAS[v]();
  pintaArtes(app);
  app.scrollTop = 0;
}
let relojVista = 0;
$$('#nav button').forEach(b => b.onclick = () => { Son.init(); ir(b.dataset.v); });

/* =========================================================
   LOGIN
   ========================================================= */
VISTAS.login = () => {
  Son.modo('menu');
  $('#app').innerHTML = `<div class="login">
    <div class="lHero">
      <div class="lPlaneta"></div>
      <img class="lLucas" src="img/lucas/vuela.webp" alt="Lucas">
      <h1 class="logo" id="lLogo"><span>NEXT</span><b>CARD</b></h1>
      <p class="lSub">Batallas de cartas en el espacio · por <img src="img/futurmovil.webp" alt="FuturMovil" class="fmLogo"></p>
    </div>
    <div class="lForm panel">
      <div class="lTabs"><button class="on" data-f="entrar">Entrar</button><button data-f="crear">Crear cuenta</button></div>
      <form id="fEntrar" autocomplete="on">
        <input id="eId" name="username" autocomplete="username" placeholder="Correo o usuario" required>
        <input id="ePass" name="password" type="password" autocomplete="current-password" placeholder="Contraseña" required>
        <button class="btn grande verde" id="bEntrar">ENTRAR</button>
        <button type="button" class="enlace" id="bOlvido">¿Has olvidado la contraseña?</button>
      </form>
      <form id="fCrear" class="oculto" autocomplete="on">
        <input id="rUsu" name="nickname" autocomplete="nickname" placeholder="Nombre de jugador (único)" required maxlength="16"><small class="uMsg" id="rUsuMsg"></small>
        <input id="rEmail" name="email" type="email" autocomplete="email" placeholder="Correo" required>
        <input id="rPass" name="new-password" type="password" autocomplete="new-password" placeholder="Contraseña (mín. 6)" required minlength="6">
        <button class="btn grande verde">CREAR CUENTA</button>
      </form>
      <form id="fRec" class="oculto"><p class="nota">Te mandamos un código a tu correo.</p><input id="cEmail" type="email" placeholder="Tu correo" required><button class="btn cian">ENVIAR CÓDIGO</button></form>
      <form id="fRes" class="oculto"><input id="cCod" inputmode="numeric" placeholder="Código de 6 cifras" required><input id="cPass" type="password" autocomplete="new-password" placeholder="Contraseña nueva" required minlength="6"><button class="btn verde">CAMBIAR Y ENTRAR</button></form>
      <form id="fUsu" class="oculto"><p class="nota">Elige tu nombre de jugador:</p><input id="gUsu" placeholder="Nombre de jugador" required maxlength="16"><small class="uMsg" id="gUsuMsg"></small><button class="btn verde">EMPEZAR</button></form>
      <div class="sep"><span>o</span></div>
      <div id="gBtn" class="gBtn"></div>
      <p class="msg" id="lMsg"></p>
    </div>
    <div class="lExtra"><button class="btn sec" id="bInstalar">⤓ Instalar app</button><button class="btn sec" id="bCompartir">↗ Compartir</button></div>
    <p class="lPie">© FuturMovil · NEXTCARD ${CFG.API ? '' : '<b class="demo">MODO DEMO</b>'}</p>
  </div>`;
  const msg = (t, c) => { const m = $('#lMsg'); m.textContent = t || ''; m.className = 'msg ' + (c || ''); };
  const vista = f => { ['fEntrar', 'fCrear', 'fRec', 'fRes', 'fUsu'].forEach(id => $('#' + id).classList.toggle('oculto', id !== 'f' + f[0].toUpperCase() + f.slice(1))); msg(''); };
  $$('.lTabs button').forEach(b => b.onclick = () => { Son.init(); Son.tab(); $$('.lTabs button').forEach(x => x.classList.toggle('on', x === b)); vista(b.dataset.f); });
  $('#bOlvido').onclick = () => vista('rec');
  let tU = 0;
  const compruebaUsu = (inp, out) => { clearTimeout(tU); const v = inp.value.trim(); if (v.length < 3) { out.textContent = ''; return; } tU = setTimeout(() => api('disponible', { usuario: v }).then(d => { if (inp.value.trim() !== v) return; out.textContent = d.disponible ? '✓ Disponible' : '✗ No disponible'; out.className = 'uMsg ' + (d.disponible ? 'ok' : 'err'); }), 400); };
  $('#rUsu').oninput = () => compruebaUsu($('#rUsu'), $('#rUsuMsg'));
  $('#gUsu').oninput = () => compruebaUsu($('#gUsu'), $('#gUsuMsg'));
  let largo = false;
  $('#fEntrar').onsubmit = e => {
    e.preventDefault(); if (largo) return; Son.init(); const b = $('#bEntrar'); ocupado(b, true);
    api('entrar', { id: $('#eId').value.trim(), pass: $('#ePass').value }).then(d => { ocupado(b, false); if (!d.ok) return msg(d.error, 'err'); guardaPass($('#eId').value.trim(), $('#ePass').value); entrarSesion(d); });
  };
  $('#fCrear').onsubmit = e => {
    e.preventDefault(); Son.init(); const b = $('button', e.target); ocupado(b, true);
    api('registrar', { usuario: $('#rUsu').value.trim(), email: $('#rEmail').value.trim(), pass: $('#rPass').value }).then(d => { ocupado(b, false); if (!d.ok) return msg(d.error, 'err'); guardaPass($('#rEmail').value.trim(), $('#rPass').value); entrarSesion(d); setTimeout(bienvenida, 700); });
  };
  let recEmail = '';
  $('#fRec').onsubmit = e => {
    e.preventDefault(); const b = $('button', e.target); ocupado(b, true); recEmail = $('#cEmail').value;
    api('recuperar', { email: recEmail }).then(d => { ocupado(b, false); if (!d.ok) return msg(d.error, 'err'); vista('res'); msg('Si el correo existe, te hemos enviado un código. Mira también en spam.', 'ok'); $('#cCod').focus(); });
  };
  $('#fRes').onsubmit = e => {
    e.preventDefault(); const b = $('button', e.target); ocupado(b, true);
    api('restablecer', { email: recEmail, codigo: $('#cCod').value, pass: $('#cPass').value }).then(d => { ocupado(b, false); if (!d.ok) return msg(d.error, 'err'); guardaPass(recEmail, $('#cPass').value); entrarSesion(d); });
  };
  let credGoogle = null;
  $('#fUsu').onsubmit = e => {
    e.preventDefault(); const b = $('button', e.target); ocupado(b, true);
    api('google', { credential: credGoogle, usuario: $('#gUsu').value.trim() }).then(d => { ocupado(b, false); if (!d.ok) return msg(d.error, 'err'); entrarSesion(d); setTimeout(bienvenida, 700); });
  };
  window.alGoogle = r => {
    credGoogle = r.credential; msg('Comprobando tu cuenta de Google…');
    api('google', { credential: credGoogle }).then(d => {
      if (!d.ok) return msg(d.error, 'err');
      if (d.necesitaUsuario) { vista('usu'); $('#gUsu').value = d.sugerido || ''; compruebaUsu($('#gUsu'), $('#gUsuMsg')); return; }
      entrarSesion(d);
    });
  };
  if (CFG.API) cargaGoogle(() => {
    google.accounts.id.initialize({ client_id: CFG.GOOGLE, callback: window.alGoogle, ux_mode: 'popup' });
    const w = Math.min(360, $('.lForm').clientWidth - 40);
    google.accounts.id.renderButton($('#gBtn'), { theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', locale: 'es', width: w });
  });
  // acceso admin oculto: mantener ENTRAR 3 s o 10 toques en el logo
  let tL = 0; const bE = $('#bEntrar');
  bE.addEventListener('pointerdown', () => { largo = false; bE.classList.add('cargando'); tL = setTimeout(() => { largo = true; bE.classList.remove('cargando'); vib([30, 40, 30]); Admin.abrir(); }, 3000); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => bE.addEventListener(ev, () => { clearTimeout(tL); bE.classList.remove('cargando'); setTimeout(() => largo = false, 60); }));
  bE.addEventListener('contextmenu', e => e.preventDefault());
  let toques = [];
  $('#lLogo').onclick = () => { const t = performance.now(); toques = toques.filter(x => t - x < 5000); toques.push(t); if (toques.length >= 10) { toques = []; Admin.abrir(); } };
  $('#bInstalar').onclick = instalar; $('#bCompartir').onclick = compartir;
};
function cargaGoogle(fn) {
  if (window.google && google.accounts) return fn();
  if (!document.getElementById('gsi')) { const s = document.createElement('script'); s.id = 'gsi'; s.src = 'https://accounts.google.com/gsi/client'; s.async = true; document.head.appendChild(s); }
  const t = setInterval(() => { if (window.google && google.accounts) { clearInterval(t); fn(); } }, 200); setTimeout(() => clearInterval(t), 15000);
}
function guardaPass(id, pass) { try { if (window.PasswordCredential) navigator.credentials.store(new PasswordCredential({ id, password: pass })).catch(() => {}); } catch (e) {} }
function bienvenida() {
  modal(`<div class="bienv"><img src="img/lucas/saluda.webp" alt=""><h2>¡BIENVENIDO, COMANDANTE!</h2>
    <p>Soy <b>Lucas</b>, el robot de FuturMovil. Te he preparado un <b>mazo de 8 cartas</b>, <b>${fmt(P().creditos)} créditos</b>, <b>${fmt(P().gemas)} gemas</b> y <b>dos cápsulas</b> de regalo.</p>
    <p>Destruye las torres del rival, gana trofeos y viaja por las galaxias para desbloquear cartas legendarias… ¡incluido yo!</p>
    <div class="acciones"><button class="btn sec" onclick="cerrarModal();ir('guia')">CÓMO SE JUEGA</button><button class="btn verde" onclick="cerrarModal()">¡VAMOS!</button></div></div>`, { cls: 'peq' });
}

/* instalar y compartir */
let promptInstalar = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); promptInstalar = e; });
function instalado() { return matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true; }
function instalar() {
  Son.init(); Son.click();
  if (instalado()) return toast('Ya tienes NEXTCARD instalado ✓', 'ok');
  if (promptInstalar) { promptInstalar.prompt(); promptInstalar.userChoice.then(() => promptInstalar = null); return; }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  modal(`<h2>Instalar NEXTCARD</h2>${ios ? `<ol class="pasos"><li>Abre esta página en <b>Safari</b>.</li><li>Pulsa el botón <b>Compartir</b> (el cuadrado con la flecha hacia arriba).</li><li>Elige <b>«Añadir a pantalla de inicio»</b> y pulsa <b>Añadir</b>.</li></ol>`
    : `<ol class="pasos"><li>Abre el menú del navegador (⋮ arriba a la derecha).</li><li>Pulsa <b>«Instalar aplicación»</b> o <b>«Añadir a pantalla de inicio»</b>.</li></ol>`}<p class="nota">Así lo tendrás como una app más, a pantalla completa.</p>`, { cls: 'peq' });
}
function compartir() {
  Son.init(); Son.click();
  const txt = '¡Juega conmigo a NEXTCARD! 🚀🃏 Batallas de cartas en el espacio con Lucas, el robot de FuturMovil.', url = CFG.URL;
  if (navigator.share) return navigator.share({ title: 'NEXTCARD', text: txt, url }).catch(() => {});
  const c = modal(`<h2>Compartir NEXTCARD</h2><div class="acciones col">
    <a class="btn verde" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt + ' ' + url)}">WhatsApp</a>
    <a class="btn cian" href="mailto:?subject=NEXTCARD&body=${encodeURIComponent(txt + '\n' + url)}">Correo</a>
    <a class="btn sec" target="_blank" rel="noopener" href="https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(txt)}">Telegram</a>
    <button class="btn sec" id="bCopiar">Copiar enlace</button></div>`, { cls: 'peq' });
  $('#bCopiar', c).onclick = () => navigator.clipboard.writeText(url).then(() => toast('Enlace copiado', 'ok'));
}

/* =========================================================
   INICIO (BATALLA)
   ========================================================= */
VISTAS.inicio = () => {
  Son.modo('menu');
  const p = P(), a = NC.ARENAS[p.arena || 0], sig = NC.ARENAS[(p.arena || 0) + 1];
  const prog = sig ? Math.max(0, Math.min(100, (p.trofeos - a.min) / (sig.min - a.min) * 100)) : 100;
  $('#app').innerHTML = `<div class="inicio">
    ${AVISO ? `<div class="aviso">📡 ${esc(AVISO)}</div>` : ''}
    <div class="arenaCard" style="--ac:${a.col};--ac2:${a.col2}">
      <div class="planeta p${p.arena || 0}"><i></i></div>
      <div class="arenaTxt"><small>GALAXIA ${(p.arena || 0) + 1}</small><h2>${a.nom}</h2>
        <div class="arenaProg"><i style="width:${prog}%"></i><span>${IC.trofeo} ${fmt(p.trofeos)}${sig ? ' / ' + fmt(sig.min) : ''}</span></div>
        ${sig ? `<p class="nota">Siguiente: <b>${sig.nom}</b></p>` : '<p class="nota">¡Galaxia máxima!</p>'}</div>
    </div>
    <div class="heroe">
      <div class="heroeLuz"></div>
      <img class="heroeLucas" src="img/lucas/vuela.webp" alt="Lucas">
      <div class="heroeFuego"><i></i><i></i><i></i></div>
    </div>
    <div class="extrasCofre">
      <button class="sumi" id="bSumi"><div class="sumiIc">${Arte.capsula('suministros', 'mini')}</div><div><b>Suministros</b><small id="sumiT">…</small></div></button>
      <button class="corona" id="bCorona"><div class="sumiIc corIc">${IC.corona}</div><div><b>Cápsula Corona</b><div class="corBar"><i style="width:${Math.min(100, p.coronas.n / NC.CORONAS_DIA * 100)}%"></i><span>${p.coronas.ab ? '✓ Abierta hoy' : p.coronas.n + '/' + NC.CORONAS_DIA}</span></div></div></button>
    </div>
    <button class="btnBatalla" id="bBatalla"><span class="bbBrillo"></span><span class="bbTxt">BATALLA</span><span class="bbCarga"></span></button>
    <div class="cofres" id="cofres"></div>
  </div>`;
  pintaCofres();
  const tick = () => {
    const pp = P(), restaS = pp.sumi ? pp.sumi + NC.HORAS_SUMINISTROS * 3600000 - ahora() : 0, el = $('#sumiT'); if (!el) return;
    el.textContent = restaS > 0 ? 'en ' + tiempo(restaS) : '¡Listos para recoger!'; $('#bSumi').classList.toggle('lista', restaS <= 0);
    $$('.cofre[data-fin]').forEach(c => { const r = Number(c.dataset.fin) - ahora(); const t = $('.cfT', c); if (r <= 0) { if (!c.classList.contains('lista')) pintaCofres(); } else { t.textContent = tiempo(r); $('.cfG b', c).textContent = NC.gemasPorTiempo(r); } });
  };
  tick(); relojVista = setInterval(tick, 1000);
  $('#bSumi').onclick = () => { Son.click(); const pp = P(); if (pp.sumi && pp.sumi + NC.HORAS_SUMINISTROS * 3600000 > ahora()) return toast('Los suministros llegan cada ' + NC.HORAS_SUMINISTROS + ' horas', ''); conSes('suministros').then(d => { if (!d.ok) return toast(d.error, 'err'); aplicaPerfil(d.perfil); abrirCapsula(d.cofre, d.contenido); }); };
  $('#bCorona').onclick = () => {
    Son.click(); const pp = P();
    if (pp.coronas.ab) return toast('Ya abriste la Cápsula Corona de hoy. ¡Mañana más!', '');
    if (pp.coronas.n < NC.CORONAS_DIA) return modal(`<h2>Cápsula Corona</h2><div class="centro">${Arte.capsula('corona')}</div><p class="nota">Consigue <b>${NC.CORONAS_DIA} coronas</b> hoy destruyendo torres para abrirla. Siempre trae <b>gemas</b>.</p><p class="nota">Llevas <b>${pp.coronas.n}</b>.</p>`, { cls: 'peq' });
    conSes('corona').then(d => { if (!d.ok) return toast(d.error, 'err'); aplicaPerfil(d.perfil); abrirCapsula(d.cofre, d.contenido); });
  };
  // BATALLA (mantener 5 s = acceso admin oculto)
  const bb = $('#bBatalla'); let tA = 0, largo = false;
  bb.addEventListener('pointerdown', () => { largo = false; Son.init(); tA = setTimeout(() => { largo = true; vib([20, 30, 20]); Admin.abrir(); }, 5000); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => bb.addEventListener(ev, () => clearTimeout(tA)));
  bb.addEventListener('contextmenu', e => e.preventDefault());
  bb.onclick = () => { if (largo) return; buscarBatalla(); };
};
function pintaCofres() {
  const el = $('#cofres'); if (!el) return;
  const p = P(), abriendo = p.cofres.filter(c => c && c.fin && c.fin > ahora()).length, max = p.pase ? 2 : 1;
  el.innerHTML = p.cofres.map((c, i) => {
    if (!c) return `<div class="cofre vacio"><span>Hueco libre</span></div>`;
    const d = NC.COFRES[c.tipo], resta = c.fin ? c.fin - ahora() : 0;
    if (c.fin && resta <= 0) return `<button class="cofre lista" data-i="${i}" style="--cc:${d.col}">${Arte.capsula(c.tipo)}<b>¡ABRIR!</b><small>${d.nom}</small></button>`;
    if (c.fin) return `<button class="cofre abriendo" data-i="${i}" data-fin="${c.fin}" style="--cc:${d.col}">${Arte.capsula(c.tipo)}<span class="cfT">${tiempo(resta)}</span><span class="cfG">${IC.gema}<b>${NC.gemasPorTiempo(resta)}</b></span></button>`;
    return `<button class="cofre cerrada ${abriendo >= max ? '' : 'puede'}" data-i="${i}" style="--cc:${d.col}">${Arte.capsula(c.tipo)}<small>${d.nom}</small><span class="cfH">${IC.reloj} ${d.horas} h</span>${abriendo >= max ? '' : '<span class="cfDesb">DESBLOQUEAR</span>'}</button>`;
  }).join('');
  $$('.cofre[data-i]', el).forEach(b => b.onclick = () => clickCofre(Number(b.dataset.i)));
}
function clickCofre(i) {
  Son.click();
  const p = P(), c = p.cofres[i]; if (!c) return; const d = NC.COFRES[c.tipo], resta = c.fin ? c.fin - ahora() : d.horas * 3600000 * (p.pase ? 0.7 : 1);
  if (c.fin && resta <= 0) return conSes('abrir', { slot: i }).then(r => { if (!r.ok) return toast(r.error, 'err'); aplicaPerfil(r.perfil); abrirCapsula(r.cofre, r.contenido); });
  const gemas = NC.gemasPorTiempo(resta), abriendo = p.cofres.filter(x => x && x.fin && x.fin > ahora()).length, puede = !c.fin && abriendo < (p.pase ? 2 : 1);
  const a = NC.arenaDe(p.trofeos), tot = d.cartas + d.cartasA * a, m = 1 + 0.5 * a;
  const m2 = modal(`<div class="capInfo" style="--cc:${d.col}"><div class="capGrande">${Arte.capsula(c.tipo, 'flota')}</div><h2>${d.nom}</h2>
    <div class="capCont"><div><b>${tot}</b><small>cartas</small></div><div>${IC.cred}<b>${Math.round(d.cred[0] * m)}-${Math.round(d.cred[1] * m)}</b></div>
    ${d.epicas ? `<div><b class="ep">${d.epicas}+</b><small>épica</small></div>` : d.raras ? `<div><b class="ra">${d.raras}+</b><small>raras</small></div>` : ''}${d.legendarias ? '<div><b class="le">1</b><small>legendaria</small></div>' : ''}
    ${d.gemas[0] >= 1 ? `<div>${IC.gema}<b>${d.gemas[1]}-${d.gemas[2]}</b></div>` : ''}</div>
    <p class="nota">${c.fin ? 'Se está abriendo: queda <b>' + tiempo(resta) + '</b>.' : 'Tarda <b>' + tiempo(resta) + '</b> en abrirse.' + (p.pase ? ' (Pase Nova: -30%)' : '')}</p>
    <div class="acciones col">${puede ? '<button class="btn verde grande" id="cDesb">DESBLOQUEAR</button>' : ''}
    <button class="btn gema grande" id="cYa">ABRIR YA · ${IC.gema} ${gemas}</button></div>
    ${!c.fin && !puede ? `<p class="nota">Ya hay ${p.pase ? 'dos cápsulas' : 'una cápsula'} abriéndose.${p.pase ? '' : ' Con el <b>Pase Nova</b> puedes abrir dos a la vez.'}</p>` : ''}</div>`, { cls: 'peq' });
  if ($('#cDesb', m2)) $('#cDesb', m2).onclick = () => { conSes('desbloquear', { slot: i }).then(r => { if (!r.ok) return toast(r.error, 'err'); Son.sube(); aplicaPerfil(r.perfil); cerrarModal(); pintaCofres(); }); };
  $('#cYa', m2).onclick = e => {
    if (P().gemas < gemas) return sinGemas(gemas);
    ocupado(e.currentTarget, true);
    conSes('abrir', { slot: i }).then(r => { if (!r.ok) { ocupado(e.target, false); return toast(r.error, 'err'); } Son.gema(); aplicaPerfil(r.perfil); cerrarModal(); abrirCapsula(r.cofre, r.contenido); });
  };
}
function sinGemas(n) {
  const c = modal(`<h2>Te faltan gemas</h2><p class="nota">Necesitas <b>${n}</b> gemas y tienes <b>${P().gemas}</b>.</p><div class="acciones"><button class="btn sec" onclick="cerrarModal()">Ahora no</button><button class="btn gema" id="aTienda">Conseguir gemas</button></div>`, { cls: 'peq' });
  $('#aTienda', c).onclick = () => { cerrarModal(); ir('tienda'); setTimeout(() => { const g = $('#secGemas'); g && g.scrollIntoView({ behavior: 'smooth' }); }, 200); };
}
function subeNivel(n) {
  Son.victoria();
  modal(`<div class="subeNiv"><div class="snHex"><b>${n}</b></div><h2>¡NIVEL ${n}!</h2><p class="nota">Tus torres son más fuertes: <b>+${Math.round((NC.multTorre(n) - 1) * 100)}%</b> de vida y daño.</p><button class="btn verde" onclick="cerrarModal()">¡GENIAL!</button></div>`, { cls: 'peq' });
}

/* =========================================================
   APERTURA DE CÁPSULAS
   ========================================================= */
function abrirCapsula(tipo, cont) {
  const d = NC.COFRES[tipo], ov = $('#apertura');
  const cartas = cont.cartas.slice(), premios = [];
  if (cont.cred) premios.push({ t: 'cred', n: cont.cred });
  if (cont.gemas) premios.push({ t: 'gema', n: cont.gemas });
  cartas.forEach(c => premios.push({ t: 'carta', id: c.id, n: c.n }));
  ov.innerHTML = `<div class="apFondo" style="--cc:${d.col}"><div class="apRayos"></div></div>
    <div class="apCaps" id="apCaps">${Arte.capsula(tipo, 'apCap')}<p class="apTit">${d.nom}</p><p class="apToca">TOCA PARA ABRIR</p></div>
    <div class="apCarta oculto" id="apCarta"></div>
    <div class="apResto oculto" id="apResto"><small>QUEDAN</small><b id="apN">${premios.length}</b></div>
    <div class="apResumen oculto" id="apResumen"></div>`;
  ov.classList.remove('oculto'); Son.init();
  let golpes = 0, i = -1, abierta = false;
  const caps = $('#apCaps', ov);
  const toca = () => {
    if (!abierta) {
      golpes++; Son.capsulaGolpe(golpes); vib(20);
      caps.classList.remove('golpe'); void caps.offsetWidth; caps.classList.add('golpe'); caps.style.setProperty('--g', golpes);
      if (golpes >= 3) { abierta = true; Son.capsulaAbre(); vib([40, 30, 80]); caps.classList.add('abre'); ov.classList.add('flash'); setTimeout(() => { caps.classList.add('oculto'); ov.classList.remove('flash'); siguiente(); }, 650); }
      return;
    }
    siguiente();
  };
  const siguiente = () => {
    i++;
    const el = $('#apCarta', ov);
    if (i >= premios.length) return resumen();
    $('#apResto', ov).classList.remove('oculto'); $('#apN', ov).textContent = premios.length - i - 1;
    const pr = premios[i];
    if (pr.t === 'cred' || pr.t === 'gema') {
      el.innerHTML = `<div class="apMoneda ${pr.t}">${pr.t === 'cred' ? IC.cred : IC.gema}<b>+${fmt(pr.n)}</b><small>${pr.t === 'cred' ? 'CRÉDITOS' : 'GEMAS'}</small></div>`;
      pr.t === 'cred' ? Son.moneda() : Son.gema();
    } else {
      const c = NC.MAPA[pr.id], mia = P().cartas[pr.id], nueva = mia && mia.nueva;
      el.innerHTML = `<div class="apC r-${c.rar}">${c.rar === 'l' || c.rar === 'e' ? '<div class="apAura"></div>' : ''}${cartaHTML(pr.id, { sinPie: true, libre: true })}
        <div class="apInfo"><small style="color:${NC.RAREZAS[c.rar].col}">${NC.RAREZAS[c.rar].nom.toUpperCase()}</small><h3>${esc(c.nom)}</h3><b class="apX">x${pr.n}</b>${nueva ? '<span class="apNueva">¡NUEVA CARTA!</span>' : ''}</div></div>`;
      pintaArtes(el); Son.cartaSale(c.rar); if (c.rar === 'l') { ov.classList.add('legend'); vib([60, 40, 60, 40, 200]); } else ov.classList.remove('legend');
    }
    el.classList.remove('oculto', 'sale'); void el.offsetWidth; el.classList.add('sale');
  };
  const resumen = () => {
    $('#apCarta', ov).classList.add('oculto'); $('#apResto', ov).classList.add('oculto'); ov.classList.remove('legend');
    const r = $('#apResumen', ov); r.classList.remove('oculto');
    r.innerHTML = `<h2>${d.nom}</h2><div class="apMonedas">${cont.cred ? `<span>${IC.cred}<b>+${fmt(cont.cred)}</b></span>` : ''}${cont.gemas ? `<span>${IC.gema}<b>+${cont.gemas}</b></span>` : ''}</div>
      <div class="apLista">${cartas.map(c => `<div class="apMini">${cartaHTML(c.id, { sinPie: true, libre: true })}<b>x${c.n}</b></div>`).join('')}</div>
      <button class="btn verde grande" id="apOk">¡GENIAL!</button>`;
    pintaArtes(r);
    $('#apOk', r).onclick = e => { e.stopPropagation(); Son.click(); ov.classList.add('oculto'); ov.innerHTML = ''; ov.onclick = null; if (VISTA) ir(VISTA, true); };
  };
  ov.onclick = e => { if ($('#apResumen', ov).classList.contains('oculto')) toca(); };
}

/* =========================================================
   BATALLA: búsqueda, VS y resultado
   ========================================================= */
function buscarBatalla() {
  Son.init(); Son.click();
  const p = P();
  const ov = $('#busqueda');
  ov.innerHTML = `<div class="bsCaja"><div class="radar"><i></i><i></i><i></i><img src="img/lucas/vuela.webp" alt=""></div><h2>Buscando rival…</h2><p class="nota" id="bsTxt">Escaneando la ${esc(NC.ARENAS[p.arena].nom)}</p><button class="btn sec" id="bsNo">Cancelar</button></div>`;
  ov.classList.remove('oculto');
  let cancel = false; $('#bsNo', ov).onclick = () => { cancel = true; ov.classList.add('oculto'); };
  const t0 = Date.now();
  conSes('batalla').then(async d => {
    if (cancel) return;
    if (!d.ok) { ov.classList.add('oculto'); return toast(d.error, 'err'); }
    await espera(Math.max(0, 1800 + Math.random() * 1600 - (Date.now() - t0)));
    if (cancel) return;
    // pantalla VS
    Son.capsulaAbre();
    ov.innerHTML = `<div class="vs">
      <div class="vsLado yo"><img src="img/lucas/senala.webp" alt=""><div><span class="vsNiv">${p.nivel}</span><b>${esc(p.usuario)}</b><small>${IC.trofeo} ${fmt(p.trofeos)}</small></div></div>
      <div class="vsX">VS</div>
      <div class="vsLado el"><canvas id="vsRojo" width="300" height="340"></canvas><div><span class="vsNiv">${d.rival.nivel}</span><b>${esc(d.rival.nombre)}</b><small>${IC.trofeo} ${fmt(d.rival.trofeos)}</small></div></div></div>`;
    const rc = Arte.rojo('img/lucas/senala.webp'), cv = $('#vsRojo', ov), cx = cv.getContext('2d');
    const pinta = () => { if (!rc.listo) return setTimeout(pinta, 80); const s = Math.min(300 / rc.width, 340 / rc.height); cx.save(); cx.translate(300, 0); cx.scale(-1, 1); cx.drawImage(rc, (300 - rc.width * s) / 2, 340 - rc.height * s, rc.width * s, rc.height * s); cx.restore(); };
    pinta();
    await espera(2300);
    ov.classList.add('oculto'); ov.innerHTML = '';
    Batalla.iniciar({
      yo: d.yo, rival: d.rival, arena: d.arena, yoNombre: p.usuario,
      alTerminar: fin => conSes('resultado', { id: d.id, coronas: fin.coronas, coronasRival: fin.coronasRival, rendido: fin.rendido ? 1 : 0 }).then(r => { if (r.ok) aplicaPerfil(r.perfil); return r; }),
      alCerrar: r => {
        ir('inicio', true);
        if (r && r.ok && r.subeArena >= 0) setTimeout(() => nuevaArena(r.subeArena), 400);
        else if (r && r.ok && r.cofre) setTimeout(() => { const c = $$('.cofre')[r.slot]; if (c) { c.classList.add('llega'); } }, 100);
      }
    });
  });
}
function nuevaArena(a) {
  const ar = NC.ARENAS[a], nuevas = NC.CARTAS.filter(c => c.arena === a);
  Son.victoria();
  modal(`<div class="nuevaArena" style="--ac:${ar.col};--ac2:${ar.col2}"><small>¡NUEVA GALAXIA DESBLOQUEADA!</small><div class="planeta grande p${a}"><i></i></div><h2>${ar.nom}</h2>
    ${nuevas.length ? `<p class="nota">Ya pueden salirte en las cápsulas:</p><div class="filaCartas">${nuevas.map(c => cartaHTML(c.id, { sinPie: true, libre: true })).join('')}</div>` : ''}
    <button class="btn verde grande" onclick="cerrarModal()">¡A POR ELLA!</button></div>`, { cls: 'peq' });
}

/* =========================================================
   CARTAS (mazo y colección)
   ========================================================= */
let mazoEdit = null;
VISTAS.cartas = () => {
  const p = P(); mazoEdit = null;
  const mias = NC.CARTAS.filter(c => p.cartas[c.id]), fuera = NC.CARTAS.filter(c => !p.cartas[c.id] && p.mazo.indexOf(c.id) < 0);
  const coste = (p.mazo.reduce((a, id) => a + NC.MAPA[id].coste, 0) / 8).toFixed(1);
  $('#app').innerHTML = `<div class="cartasV">
    <div class="panel mazo"><div class="mazoCab"><h2>TU MAZO</h2><span class="costeMedio">${IC.plasma} Coste medio <b>${coste}</b></span></div>
      <div class="rejilla mazoG" id="mazoG">${p.mazo.map(id => cartaHTML(id)).join('')}</div>
      <p class="nota centro" id="mazoNota">Toca una carta para verla, mejorarla o cambiarla.</p></div>
    <h3 class="secTit">COLECCIÓN <small>${mias.length}/${NC.CARTAS.length}</small></h3>
    <div class="rejilla" id="colG">${mias.filter(c => p.mazo.indexOf(c.id) < 0).map(c => cartaHTML(c.id)).join('') || '<p class="nota">Todas tus cartas están en el mazo.</p>'}</div>
    ${fuera.length ? `<h3 class="secTit">POR DESCUBRIR</h3><div class="rejilla">${fuera.map(c => cartaHTML(c.id)).join('')}</div>` : ''}
  </div>`;
  $$('.cartasV .carta').forEach(el => el.onclick = () => { Son.click(); detalleCarta(el.dataset.id); });
};
function detalleCarta(id) {
  const c = NC.MAPA[id], p = P(), mia = p.cartas[id], nivel = mia ? mia.n : 1, m = NC.multNivel(nivel), m2 = NC.multNivel(nivel + 1);
  const nec = mia ? NC.copiasPara(c.rar, nivel) : 0, cred = NC.creditosPara(c.rar, nivel), puede = mia && nec && mia.c >= nec, enMazo = p.mazo.indexOf(id) >= 0;
  const st = [];
  const mas = (v) => puede ? `<i class="mas">+${Math.round(v * (m2 / m - 1))}</i>` : '';
  if (c.hp) st.push(['Vida', Math.round(c.hp * m), mas(c.hp * m)]);
  if (c.dmg) st.push([c.tipo === 'hechizo' ? (c.dura ? 'Daño/s' : 'Daño') : 'Daño', Math.round(c.dmg * m), mas(c.dmg * m)]);
  if (c.hit) st.push(['Ataque cada', c.hit + ' s']);
  if (c.tipo !== 'hechizo') st.push(['Alcance', c.rango > 1.6 ? c.rango + ' casillas' : 'Cuerpo a cuerpo']);
  if (c.vel) st.push(['Velocidad', c.vel >= 1.9 ? 'Muy rápida' : c.vel >= 1.3 ? 'Rápida' : c.vel >= 0.9 ? 'Media' : 'Lenta']);
  st.push(['Objetivo', c.tipo === 'hechizo' ? 'Zona' : c.obj === 'edificios' ? 'Edificios' : c.obj === 'tierra' ? 'Tierra' : 'Aire y tierra']);
  if (c.num > 1) st.push(['Cantidad', 'x' + c.num]);
  if (c.radioArea) st.push(['Radio', c.radioArea + ' casillas']);
  if (c.vida) st.push(['Duración', c.vida + ' s']);
  if (c.vuela) st.push(['Tipo', 'Voladora']);
  const box = modal(`<div class="detC r-${c.rar}">
    <div class="detIzq">${cartaHTML(id, { sinBarra: false })}</div>
    <div class="detDer"><small style="color:${NC.RAREZAS[c.rar].col}">${NC.RAREZAS[c.rar].nom.toUpperCase()} · ${c.tipo.toUpperCase()}</small><h2>${esc(c.nom)}</h2><p class="nota">${esc(c.desc)}</p>
    <div class="stats">${st.map(s => `<div><small>${s[0]}</small><b>${s[1]}${s[2] || ''}</b></div>`).join('')}</div></div>
    <div class="acciones col">${mia ? `${nec ? `<button class="btn ${puede ? 'verde' : 'sec'} grande" id="dMej" ${puede ? '' : 'disabled'}>MEJORAR · ${IC.cred} ${fmt(cred)}</button>${puede ? '' : `<p class="nota centro">Te faltan ${nec - mia.c} cartas para mejorarla.</p>`}` : '<p class="nota centro">Nivel máximo ✦</p>'}
      ${enMazo ? '' : '<button class="btn cian" id="dUsar">USAR EN EL MAZO</button>'}` : `<p class="nota centro">Aún no la tienes. Sale en las cápsulas desde la <b>Galaxia ${c.arena + 1}: ${NC.ARENAS[c.arena].nom}</b>.</p>`}</div></div>`, { cls: 'det' });
  if (mia && mia.nueva) { mia.nueva = 0; store('ses', SES); }
  const bM = $('#dMej', box); if (bM) bM.onclick = () => {
    if (P().creditos < cred) return toast('Te faltan créditos', 'err');
    ocupado(bM, true);
    conSes('mejorar', { id }).then(d => { if (!d.ok) { ocupado(bM, false); return toast(d.error, 'err'); } aplicaPerfil(d.perfil); animMejora(id, d.nivel); });
  };
  const bU = $('#dUsar', box); if (bU) bU.onclick = () => { cerrarModal(); elegirHueco(id); };
}
function animMejora(id, nivel) {
  Son.mejora(); vib([30, 40, 30, 40, 120]);
  const c = modal(`<div class="mejoraAnim"><div class="mjRayos"></div>${cartaHTML(id, { sinPie: true })}<h2>¡NIVEL ${nivel}!</h2><p class="nota">${esc(NC.MAPA[id].nom)} es ahora más fuerte.</p><button class="btn verde" onclick="cerrarModal()">¡GENIAL!</button></div>`, { cls: 'peq', alCerrar: () => ir('cartas', true) });
}
function elegirHueco(id) {
  Son.click();
  const g = $('#mazoG'); g.classList.add('eligiendo'); $('#mazoNota').innerHTML = `Toca la carta del mazo que quieres cambiar por <b>${esc(NC.MAPA[id].nom)}</b>. <button class="enlace" id="mzNo">Cancelar</button>`;
  g.scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('#mzNo').onclick = () => ir('cartas', true);
  $$('.carta', g).forEach(el => el.onclick = e => {
    e.stopPropagation(); const m = P().mazo.slice(), k = m.indexOf(el.dataset.id); m[k] = id;
    conSes('mazo', { mazo: m }).then(d => { if (!d.ok) return toast(d.error, 'err'); Son.despliega(3); aplicaPerfil(d.perfil); ir('cartas', true); toast('Mazo actualizado', 'ok'); });
  });
}

/* =========================================================
   TIENDA
   ========================================================= */
VISTAS.tienda = () => {
  const pr = PRECIOS || { packs: NC.TIENDA.gemas, pase: NC.TIENDA.pase.cent, capsulas: NC.TIENDA.capsulas, creditos: NC.TIENDA.creditos };
  const p = P();
  $('#app').innerHTML = `<div class="tienda">
    <div class="pase ${p.pase ? 'activo' : ''}" id="pase"><div class="paseBrillo"></div><img src="img/lucas/capa.webp" alt="">
      <div class="paseTxt"><small>PASE NOVA · 30 DÍAS</small><h2>${p.pase ? 'ACTIVO ✓' : 'Hazte NOVA'}</h2>
      <ul><li>⚡ Abre <b>2 cápsulas</b> a la vez</li><li>⏱ Cápsulas un <b>30% más rápidas</b></li><li>${IC.cred} <b>+50% créditos</b> por victoria</li><li>✦ Marco dorado en el ranking</li></ul>
      ${p.pase ? `<p class="nota">Hasta el ${new Date(p.pase).toLocaleDateString('es-ES')}</p>` : ''}<button class="btn oro" id="bPase">${p.pase ? 'AMPLIAR' : 'CONSEGUIR'} · ${euros(pr.pase)} €</button></div></div>
    <h3 class="secTit">OFERTAS DEL DÍA <small id="tReloj"></small></h3>
    <div class="ofertas" id="ofertas"><div class="spin"></div></div>
    <h3 class="secTit">CÁPSULAS</h3>
    <div class="filaTienda">${pr.capsulas.map(x => `<button class="itemT capT" data-cap="${x.tipo}" style="--cc:${NC.COFRES[x.tipo].col}">${Arte.capsula(x.tipo)}<b>${NC.COFRES[x.tipo].nom}</b><span class="precio">${IC.gema} ${fmt(x.gemas)}</span></button>`).join('')}</div>
    <h3 class="secTit" id="secGemas">GEMAS</h3>
    <div class="filaTienda gemas">${pr.packs.map((x, i) => `<button class="itemT gemT" data-pack="${x.id}">${x.extra || (i === 1 ? '<span class="cinta">Popular</span>' : i === pr.packs.length - 1 ? '<span class="cinta">Mejor precio</span>' : '')}<div class="montonGemas g${i}">${IC.gema.repeat(Math.min(6, i + 1))}</div><b>${fmt(x.gemas)}</b><span class="precio eur">${euros(x.cent)} €</span></button>`).join('')}</div>
    <p class="nota centro">Pago seguro con myPOS. Las gemas llegan en cuanto se confirma el pago.</p>
    <h3 class="secTit">CRÉDITOS</h3>
    <div class="filaTienda">${pr.creditos.map((x, i) => `<button class="itemT credT" data-cred="${i}"><div class="montonCred c${i}">${IC.cred.repeat(i + 2)}</div><b>${fmt(x.cred)}</b><span class="precio">${IC.gema} ${fmt(x.gemas)}</span></button>`).join('')}</div>
    <h3 class="secTit">MIS COMPRAS</h3><div id="misPed" class="panel"><div class="spin"></div></div>
  </div>`;
  cargaOfertas(); cargaPedidos();
  $('#bPase').onclick = () => { Son.click(); comprarReal('pase', 'Pase Nova · 30 días', pr.pase); };
  $$('[data-pack]').forEach(b => b.onclick = () => { Son.click(); const x = pr.packs.find(k => k.id === b.dataset.pack); comprarReal(x.id, fmt(x.gemas) + ' gemas', x.cent); });
  $$('[data-cap]').forEach(b => b.onclick = () => {
    Son.click(); const x = pr.capsulas.find(k => k.tipo === b.dataset.cap);
    confirmar('Comprar ' + NC.COFRES[x.tipo].nom, `Se abre al momento. Cuesta <b>${fmt(x.gemas)} gemas</b>.`, 'Comprar', 'gema').then(ok => {
      if (!ok) return; if (P().gemas < x.gemas) return sinGemas(x.gemas);
      conSes('comprarCapsula', { tipo: x.tipo }).then(d => { if (!d.ok) return toast(d.error, 'err'); Son.gema(); aplicaPerfil(d.perfil); abrirCapsula(d.cofre, d.contenido); });
    });
  });
  $$('[data-cred]').forEach(b => b.onclick = () => {
    Son.click(); const i = Number(b.dataset.cred), x = pr.creditos[i];
    confirmar('Comprar créditos', `<b>${fmt(x.cred)} créditos</b> por <b>${fmt(x.gemas)} gemas</b>.`, 'Comprar', 'gema').then(ok => {
      if (!ok) return; if (P().gemas < x.gemas) return sinGemas(x.gemas);
      conSes('comprarCreditos', { i }).then(d => { if (!d.ok) return toast(d.error, 'err'); Son.moneda(); aplicaPerfil(d.perfil); toast('+' + fmt(d.cred) + ' créditos', 'ok'); });
    });
  });
};
function cargaOfertas() {
  conSes('tienda').then(d => {
    const el = $('#ofertas'); if (!el) return;
    if (!d.ok) { el.innerHTML = `<p class="nota">${esc(d.error)}</p>`; return; }
    if (d.precios) { PRECIOS = d.precios; store('precios', PRECIOS); }
    el.innerHTML = d.ofertas.map(o => o.gratis
      ? `<button class="oferta gratis ${o.comprada ? 'hecha' : ''}" data-i="${o.i}"><div class="ofArte">${IC.cred}</div><b>${fmt(o.cred)} créditos</b><span class="precio">${o.comprada ? '✓ Recogido' : 'GRATIS'}</span></button>`
      : `<button class="oferta ${o.comprada ? 'hecha' : ''}" data-i="${o.i}">${o.desc ? `<span class="cinta">-${o.desc}%</span>` : ''}${cartaHTML(o.id, { sinPie: true, libre: true })}<b>x${o.n}</b><span class="precio">${o.comprada ? '✓ Comprada' : IC.cred + ' ' + fmt(o.precio)}</span></button>`).join('');
    pintaArtes(el);
    $$('.oferta', el).forEach(b => b.onclick = () => {
      Son.click(); const o = d.ofertas[Number(b.dataset.i)]; if (o.comprada) return;
      const hacer = () => conSes('comprarOferta', { i: o.i }).then(r => { if (!r.ok) return toast(r.error, 'err'); aplicaPerfil(r.perfil); if (o.gratis) { Son.moneda(); toast('+' + o.cred + ' créditos', 'ok'); } else { Son.cartaSale(NC.MAPA[o.id].rar); toast('+' + o.n + ' ' + NC.MAPA[o.id].nom, 'ok'); } cargaOfertas(); });
      if (o.gratis) return hacer();
      if (P().creditos < o.precio) return toast('Te faltan créditos', 'err');
      confirmar('Comprar ' + NC.MAPA[o.id].nom, `<b>x${o.n}</b> por <b>${fmt(o.precio)} créditos</b>.`, 'Comprar').then(ok => ok && hacer());
    });
    const fin = d.manana; clearInterval(relojVista);
    const t = () => { const r = $('#tReloj'); if (r) r.textContent = 'Nuevas en ' + tiempo(fin - Date.now()); }; t(); relojVista = setInterval(t, 1000);
  });
}
function cargaPedidos() {
  conSes('pedidos').then(d => {
    const el = $('#misPed'); if (!el) return;
    if (!d.ok || !d.lista.length) { el.innerHTML = '<p class="nota">Aún no has hecho compras.</p>'; return; }
    el.innerHTML = d.lista.map(x => `<div class="ped ${x.estado}"><div><b>${esc(x.producto)}</b><small>${new Date(x.fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })} · ${euros(x.importe)} €</small></div>
      <span class="estado">${{ pendiente: '⏳ Pendiente', pagado: '✓ Entregado', cancelado: 'Cancelado', rechazado: '✗ Rechazado' }[x.estado] || x.estado}</span>
      ${x.estado === 'pendiente' ? `<div class="pedBtns"><a class="btn mini verde" target="_blank" rel="noopener" href="${waPedido(x)}">WhatsApp</a><button class="btn mini sec" data-can="${x.id}">Cancelar</button></div>` : ''}</div>`).join('');
    $$('[data-can]', el).forEach(b => b.onclick = () => confirmar('Cancelar compra', '¿Cancelar este pedido? Si ya lo has pagado, NO lo canceles: escríbenos por WhatsApp.', 'Cancelar pedido', 'rojo').then(ok => ok && conSes('cancelar', { id: b.dataset.can }).then(r => { if (!r.ok) return toast(r.error, 'err'); cargaPedidos(); })));
  });
}
function waPedido(x) { return 'https://wa.me/' + CFG.WHATSAPP + '?text=' + encodeURIComponent(`Hola, he pagado en NEXTCARD: ${x.producto} (${euros(x.importe)} €). Pedido ${x.id}, jugador ${P().usuario}. ¿Me lo confirmas?`); }
function comprarReal(producto, nombre, cent) {
  const c = modal(`<div class="compraReal"><h2>${esc(nombre)}</h2><div class="crPrecio">${euros(cent)} €</div>
    <ol class="pasos"><li>Pulsa <b>PAGAR</b>: se abrirá la pasarela segura de <b>myPOS</b> con el importe ya puesto.</li><li>Paga con tarjeta, Google Pay o Apple Pay.</li><li>En cuanto confirmemos el pago, lo recibirás en tu cuenta.</li></ol>
    <button class="btn oro grande" id="crPagar">PAGAR ${euros(cent)} €</button></div>`, { cls: 'peq' });
  $('#crPagar', c).onclick = e => {
    const b = e.currentTarget; ocupado(b, true);
    const w = window.open('', '_blank');
    conSes('pedir', { producto }).then(d => {
      if (!d.ok) { ocupado(b, false); if (w) w.close(); return toast(d.error, 'err'); }
      if (w) w.location.href = d.url; else location.href = d.url;
      modal(`<div class="compraReal"><div class="crOk">⏳</div><h2>Pago en curso</h2><p class="nota">Cuando termines de pagar en myPOS, <b>${esc(nombre)}</b> llegará a tu cuenta en cuanto el administrador confirme el pago (normalmente en pocos minutos).</p>
        <p class="nota">¿Ya has pagado? Avísanos por WhatsApp para recibirlo antes:</p>
        <a class="btn verde grande" target="_blank" rel="noopener" href="${waPedido(d.pedido)}">AVISAR POR WHATSAPP</a>
        <p class="nota">¿No se abrió la pasarela? <a href="${d.url}" target="_blank" rel="noopener">Pulsa aquí</a>.</p>
        <button class="btn sec" onclick="cerrarModal();cargaPedidos()">Hecho</button></div>`, { cls: 'peq' });
    });
  };
}

/* =========================================================
   RANKING
   ========================================================= */
VISTAS.ranking = () => {
  $('#app').innerHTML = `<div class="ranking"><h2 class="titV">${IC.trofeo} RANKING GALÁCTICO</h2><div class="panel" id="rLista"><div class="spin"></div></div></div>`;
  api('ranking').then(d => {
    const el = $('#rLista'); if (!el) return;
    if (!d.ok) { el.innerHTML = `<p class="nota">${esc(d.error)}</p>`; return; }
    const yo = P().usuario;
    el.innerHTML = d.lista.length ? d.lista.map((r, i) => `<div class="rFila ${r.usuario === yo ? 'yo' : ''} ${i < 3 ? 'top' + i : ''} ${r.pase ? 'nova' : ''}">
      <span class="rPos">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span><span class="rNiv">${r.nivel}</span><div class="rNom"><b>${esc(r.usuario)}</b><small>${NC.ARENAS[NC.arenaDe(r.trofeos)].nom} · ${r.v}V ${r.d}D</small></div>
      <span class="rTrof">${IC.trofeo}<b>${fmt(r.trofeos)}</b></span></div>`).join('') : '<p class="nota">Todavía no hay nadie. ¡Sé el primero!</p>';
  });
};

/* =========================================================
   CÓMO SE JUEGA
   ========================================================= */
VISTAS.guia = () => {
  const sec = (ic, tit, html, cls) => `<section class="gSec ${cls || ''}"><div class="gIc">${ic}</div><div><h3>${tit}</h3>${html}</div></section>`;
  $('#app').innerHTML = `<div class="guia">
    <div class="gHero"><img src="img/lucas/ayuda.webp" alt=""><div><small>MANUAL DEL COMANDANTE</small><h2>Cómo se juega</h2><p>Todo lo que necesitas para conquistar la galaxia en 2 minutos de lectura.</p></div></div>
    ${sec('🎯', 'El objetivo', `<p>Cada batalla dura <b>3 minutos</b>. Tú defiendes la parte de <b style="color:#19ff6a">abajo</b> y el rival la de <b style="color:#ff4d6d">arriba</b>. Cada uno tiene <b>2 torres laterales</b> y una <b>torre del rey</b> en el centro.</p>
      <div class="gTorres"><div><i class="tIc">🛡</i><b>Torre destruida</b><span>= 1 corona</span></div><div><i class="tIc">👑</i><b>Torre del rey</b><span>= 3 coronas y victoria</span></div></div>
      <p>Gana quien tenga <b>más coronas</b> al acabar. Si hay empate, hay <b>1 minuto de prórroga</b>: la primera corona gana.</p>`)}
    ${sec(IC.plasma, 'El plasma', `<p>Las cartas cuestan <b>plasma</b> (el número morado). Empiezas con 5 y se recarga solo hasta 10. En el <b>último minuto</b> y en la prórroga se recarga <b>el doble de rápido</b>.</p><div class="gBarra"><i></i><span>5 / 10</span></div><p class="nota">Truco: no dejes que la barra se quede llena, ¡estás desperdiciando plasma!</p>`)}
    ${sec('🃏', 'Tus cartas', `<p>Llevas un <b>mazo de 8 cartas</b>. En la batalla tienes <b>4 en la mano</b>; cuando juegas una, entra la siguiente. <b>Arrástrala al campo</b> (o tócala y luego toca el campo).</p>
      <div class="gTipos"><div><b>Tropas</b><span>Caminan solas hacia las torres enemigas y atacan lo que encuentran.</span></div><div><b>Hechizos</b><span>Efecto instantáneo en cualquier parte del campo.</span></div><div><b>Estructuras</b><span>Defensas fijas que duran un tiempo.</span></div></div>
      <div class="filaCartas">${['tanque', 'misil', 'torreta', 'superlucas'].map(id => cartaHTML(id, { sinPie: true, libre: true })).join('')}</div>`)}
    ${sec('🌌', 'La grieta de plasma', `<p>El campo está partido por una <b>grieta de plasma</b>. Las tropas de tierra solo pueden cruzarla por los <b>dos puentes de luz</b>. Las <b>voladoras</b> (drones, dragón, Súper Lucas) pasan por encima y la <b>Moto Cuántica</b> la salta.</p>
      <p>Solo puedes desplegar en <b>tu mitad</b>. Si destruyes una torre enemiga, puedes desplegar más adelante en ese lado.</p>`)}
    ${sec('⚔️', 'Aire, tierra y edificios', `<p>Fíjate en el <b>objetivo</b> de cada carta: algunas solo atacan <b>tierra</b> (no pueden con voladores), otras atacan <b>aire y tierra</b>, y los tanques como el <b>Tanque Orbital</b> o el <b>Coloso</b> solo van a por <b>edificios</b>. Combínalas: un tanque delante y tiradores detrás.</p>`)}
    ${sec(Arte.capsula('oro', 'mini'), 'Cápsulas', `<p>Cada victoria te da una <b>cápsula</b> si tienes un hueco libre (hay 4). Para abrirla hay que <b>desbloquearla</b> y esperar su tiempo (de 3 a 24 horas), o abrirla al momento con <b>gemas</b>.</p>
      <div class="gCaps">${['plata', 'oro', 'nebulosa', 'supernova'].map(t => `<div>${Arte.capsula(t, 'mini')}<b>${NC.COFRES[t].nom}</b><small>${NC.COFRES[t].horas} h</small></div>`).join('')}</div>
      <p>Además: <b>Suministros gratis</b> cada ${NC.HORAS_SUMINISTROS} horas y la <b>Cápsula Corona</b> al conseguir ${NC.CORONAS_DIA} coronas en el día (¡siempre trae gemas!).</p>`)}
    ${sec(IC.cred + IC.gema, 'Créditos y gemas', `<p><b>Créditos</b>: se ganan en cada victoria y en las cápsulas. Sirven para <b>mejorar cartas</b> y comprar en las ofertas del día.</p>
      <p><b>Gemas</b>: la moneda premium. Se consiguen <b>poco a poco gratis</b> (Cápsula Corona, suministros y cápsulas grandes) o en la <b>tienda</b>. Sirven para abrir cápsulas al instante, comprar cápsulas y créditos.</p>`)}
    ${sec('⬆️', 'Mejorar cartas', `<p>Junta <b>copias</b> de una carta y paga créditos para subirla de nivel (hasta el ${NC.NIVEL_MAX}). Cada nivel da <b>+10% de vida y daño</b>. Al mejorar ganas experiencia y subes tu <b>nivel de comandante</b>, que hace más fuertes tus torres.</p>`)}
    ${sec(IC.trofeo, 'Trofeos y galaxias', `<p>Ganar da unos <b>+30 trofeos</b>; perder los quita. Con trofeos viajas a nuevas <b>galaxias</b>, y cada una desbloquea cartas nuevas en las cápsulas:</p>
      <div class="gArenas">${NC.ARENAS.map((a, i) => `<div style="--ac:${a.col}"><span class="planeta mini p${i}"><i></i></span><b>${a.nom}</b><small>${IC.trofeo} ${a.min}</small></div>`).join('')}</div>`)}
    ${sec('✦', 'Pase Nova', `<p>El pase premium de 30 días: abre <b>2 cápsulas a la vez</b>, cápsulas <b>30% más rápidas</b>, <b>+50% de créditos</b> por victoria y marco dorado en el ranking.</p>`)}
    ${sec('💡', 'Consejos de Lucas', `<ul class="tips"><li>Defiende en tu lado y contraataca con lo que sobreviva: es la forma más barata de ganar.</li><li>El <b>Pulso EMP</b> paraliza: úsalo cuando el rival lance su tropa más fuerte.</li><li>El <b>Agujero Negro</b> junta a las tropas: combínalo con un <b>Misil Nova</b>.</li><li>La torre del rey se activa si la tocas: ¡no la despiertes antes de tiempo!</li><li>Pon la <b>Torreta Pulsar</b> en el centro para desviar a los tanques.</li></ul>`)}
    <div class="centro"><button class="btn verde grande" onclick="ir('inicio')">¡A LA BATALLA!</button></div>
  </div>`;
};

/* =========================================================
   PERFIL
   ========================================================= */
function perfil() {
  Son.click();
  const p = P(), tot = p.victorias + p.derrotas;
  const c = modal(`<div class="perfil"><div class="pfCab"><div class="pfHex"><b>${p.nivel}</b></div><div><h2>${esc(p.usuario)}</h2><small>${esc(p.email)}</small>${p.pase ? '<span class="tagNova">✦ NOVA</span>' : ''}</div></div>
    <div class="stats"><div><small>Trofeos</small><b>${fmt(p.trofeos)}</b></div><div><small>Récord</small><b>${fmt(p.max)}</b></div><div><small>Victorias</small><b>${p.victorias}</b></div><div><small>Derrotas</small><b>${p.derrotas}</b></div><div><small>% victorias</small><b>${tot ? Math.round(p.victorias / tot * 100) : 0}%</b></div><div><small>Cartas</small><b>${Object.keys(p.cartas).length}/${NC.CARTAS.length}</b></div></div>
    <div class="ajustes"><button class="btn sec" id="pSon">${Son.on ? '🔊 Sonido ON' : '🔇 Sonido OFF'}</button><button class="btn sec" id="pMus">${Son.musica ? '🎵 Música ON' : '🎵 Música OFF'}</button></div>
    <div class="acciones col"><button class="btn cian" id="pIns">⤓ Instalar app</button><button class="btn sec" id="pCom">↗ Compartir NEXTCARD</button><button class="btn sec" onclick="cerrarModal();ir('guia')">📘 Cómo se juega</button><button class="btn rojo" id="pSalir">Cerrar sesión</button></div></div>`, { cls: 'peq' });
  $('#pSon', c).onclick = e => { const on = Son.alternar(); e.target.textContent = on ? '🔊 Sonido ON' : '🔇 Sonido OFF'; };
  $('#pMus', c).onclick = e => { const on = Son.alternarMusica(); e.target.textContent = on ? '🎵 Música ON' : '🎵 Música OFF'; };
  $('#pIns', c).onclick = instalar; $('#pCom', c).onclick = compartir;
  $('#pSalir', c).onclick = () => { cerrarModal(); cerrarSesion(); };
}
$('#tYo').onclick = perfil;
$('#tGemas').onclick = () => { Son.click(); ir('tienda'); setTimeout(() => { const g = $('#secGemas'); g && g.scrollIntoView({ behavior: 'smooth' }); }, 250); };
$('#tCred').onclick = () => { Son.click(); ir('tienda'); };

/* =========================================================
   ARRANQUE
   ========================================================= */
document.addEventListener('pointerdown', () => Son.init(), { once: true });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
if (SES) { pintaTop(); ir(load('vista', 'inicio') === 'login' ? 'inicio' : load('vista', 'inicio'), true); refrescar(); }
else ir('login', true);
setInterval(() => { if (SES && !Batalla.activa && document.visibilityState === 'visible') refrescar(); }, 90000);

/* ---- actualización automática: si hay una versión nueva, se recarga sola cuando no estás en batalla ---- */
const VERSION = 6;   // subir este número (y version.json) en cada actualización
let nuevaVersion = 0, actualizando = false, ultVer = 0;
function compruebaVersion(forzar) {
  if (actualizando || (!forzar && Date.now() - ultVer < 30000)) return; ultVer = Date.now();
  fetch('version.json?n=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.json() : null)
    .then(d => { if (d && Number(d.v) > VERSION) { nuevaVersion = Number(d.v); intentaActualizar(); } }).catch(() => {});
}
function libreParaActualizar() {
  return !Batalla.activa && ['#batalla', '#busqueda', '#apertura', '#modal'].every(s => { const el = $(s); return !el || el.classList.contains('oculto'); });
}
function intentaActualizar() {
  if (!nuevaVersion || actualizando || !libreParaActualizar()) return;
  actualizando = true;
  const ov = document.createElement('div'); ov.className = 'actualiza'; ov.innerHTML = '<div class="aRueda"></div><b>ACTUALIZANDO</b><small>Nueva versión de NEXTCARD</small>'; document.body.appendChild(ov);
  (async () => {
    try { const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (reg) await reg.update(); } catch (e) {}
    try { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } catch (e) {}
  })().finally(() => setTimeout(() => location.reload(), 1400));
}
setTimeout(() => compruebaVersion(true), 4000);
setInterval(() => compruebaVersion(true), 120000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') compruebaVersion(); });
setInterval(intentaActualizar, 3000);   // si llega durante una batalla, se aplica al salir
