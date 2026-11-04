/* =========================================================
   NEXTCARD · panel de administración
   Acceso oculto: mantener BATALLA 5 s, mantener ENTRAR 3 s o 10 toques al logo.
   Llave NFC (Android) · QR para el ordenador · Google Authenticator
   ========================================================= */
'use strict';
const Admin = (() => {
  let ADM = null, nfcCtrl = null, leyendo = false, modoQr = '', qrPoll = 0, pest = 'pagos';
  const hayNfc = 'NDEFReader' in window;
  const NFC_SVG = '<svg viewBox="0 0 64 64"><rect x="14" y="6" width="36" height="52" rx="7" fill="none" stroke="currentColor" stroke-width="3"/><path d="M27 24a9 9 0 0 1 0 16M33 19a16 16 0 0 1 0 26M39 14a23 23 0 0 1 0 36" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';

  function abrir() {
    Son.init(); Son.nfc();
    if (!CFG.API) return toast('El panel admin funciona cuando el juego está conectado a Apps Script', 'err');
    if (ADM) return panel();
    const m = modal(`<div class="admLlave"><div class="nfcAnim" id="nfcAnim">${NFC_SVG}<i></i><i></i></div>
      <h2 id="aTit">${modoQr ? 'Autorizar ordenador' : 'Acceso administrador'}</h2><p class="msg" id="aMsg"></p>
      <div id="aQr" class="oculto"><div id="admQrImg"></div><p class="nota" id="aQrT"></p></div>
      <button class="btn cian oculto" id="aNfc">ESCANEAR LLAVE</button>
      <form id="aTotp" class="aTotp"><input id="aCod" inputmode="numeric" maxlength="6" placeholder="Código de Google Authenticator" autocomplete="one-time-code"><button class="btn sec">OK</button></form>
      </div>`, { cls: 'peq', alCerrar: parar });
    $('#aNfc', m).onclick = () => escanear(false);
    $('#aTotp', m).onsubmit = e => { e.preventDefault(); api('admin_totp', { codigo: $('#aCod').value }).then(d => { if (!d.ok) { Son.error(); return msgA(d.error, 'err'); } ok(d.admin); }); };
    if (hayNfc) { $('#aNfc', m).classList.remove('oculto'); msgA(modoQr ? 'Pasa tu llave para dar acceso al ordenador' : 'Acerca tu llave NFC a la parte trasera del móvil'); escanear(true); }
    else if (!modoQr) mostrarQr();
    else msgA('Este navegador no puede leer NFC. Usa Chrome en Android.', 'err');
  }
  function msgA(t, c) { const m = $('#aMsg'); if (m) { m.textContent = t; m.className = 'msg ' + (c || ''); } }
  function anim(c) { const a = $('#nfcAnim'); if (a) a.className = 'nfcAnim ' + (c || ''); }
  function parar() { if (nfcCtrl) { nfcCtrl.abort(); nfcCtrl = null; } leyendo = false; clearInterval(qrPoll); qrPoll = 0; }
  async function escanear(auto) {
    try {
      if (!nfcCtrl) {
        nfcCtrl = new AbortController(); const r = new NDEFReader();
        await r.scan({ signal: nfcCtrl.signal });
        r.onreadingerror = () => { if (!leyendo) { anim('err'); msgA('No pude leer esa llave. Prueba otra vez.', 'err'); } };
        r.onreading = e => leida(e.serialNumber || '');
      }
      anim('busca'); msgA(modoQr ? 'Esperando llave… acércala para autorizar el ordenador' : 'Esperando llave… acércala al móvil');
    } catch (err) {
      parar(); anim('');
      msgA(auto ? 'Pulsa «Escanear llave» y acerca tu llave NFC' : (err && err.name === 'NotAllowedError' ? 'Necesito permiso para usar NFC.' : 'No se pudo activar el NFC. ¿Está encendido?'), auto ? '' : 'err');
    }
  }
  function leida(llave) {
    if (leyendo) return;
    if (!llave) { anim('err'); return msgA('La llave no tiene número de serie legible.', 'err'); }
    leyendo = true; msgA('Comprobando llave…');
    api('admin_entrar', { token: SES && SES.token, llave, qr: modoQr || undefined }).then(d => {
      if (!d.ok) { leyendo = false; anim('err'); vib([80, 60, 80]); Son.error(); return msgA(d.error, 'err'); }
      anim('ok'); vib([30, 30, 120]); Son.sube();
      if (modoQr) { parar(); modoQr = ''; msgA('✓ Ordenador autorizado. Ya puedes seguir en el PC.', 'ok'); $('#aNfc').classList.add('oculto'); return; }
      ok(d.admin, d.nueva);
    });
  }
  function ok(t, nueva) { parar(); ADM = t; anim('ok'); msgA(nueva ? '¡Llave registrada como llave de administrador!' : '¡Acceso concedido!', 'ok'); setTimeout(panel, 600); }
  function mostrarQr() {
    $('#aQr').classList.remove('oculto'); msgA('Generando código…');
    const lib = window.qrcode ? Promise.resolve() : new Promise(r => { const t = setInterval(() => { if (window.qrcode) { clearInterval(t); r(); } }, 100); });
    Promise.all([api('qr_nuevo'), lib]).then(([d]) => {
      if (!d.ok) return msgA(d.error, 'err');
      const q = qrcode(0, 'M'); q.addData(CFG.URL + '?admqr=' + d.code); q.make();
      $('#admQrImg').innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
      msgA('Escanea este código con tu móvil y pasa la llave NFC en el móvil'); anim('busca');
      const finT = Date.now() + d.seg * 1000;
      qrPoll = setInterval(() => {
        const q2 = Math.max(0, Math.round((finT - Date.now()) / 1000)), el = $('#aQrT'); if (!el) return parar();
        el.textContent = q2 ? `Caduca en ${Math.floor(q2 / 60)}:${String(q2 % 60).padStart(2, '0')}` : 'El código ha caducado. Cierra y vuelve a abrir.';
        if (!q2) return parar();
        if (q2 % 2) return;
        api('qr_estado', { code: d.code }).then(r => { if (r.ok && r.admin && qrPoll) { Son.sube(); ok(r.admin, false); } });
      }, 1000);
    });
  }
  const qp = new URLSearchParams(location.search).get('admqr');
  if (qp && /^[A-Za-z0-9]{20,64}$/.test(qp)) { modoQr = qp; history.replaceState(null, '', location.pathname); setTimeout(abrir, 900); }

  function adm(op, datos) {
    return api('admin', Object.assign({ admin: ADM, op }, datos || {})).then(d => {
      if (d.caducada) { ADM = null; toast('La sesión de administrador ha caducado', 'err'); abrir(); }
      else if (!d.ok) toast(d.error, 'err');
      return d;
    });
  }

  /* ---------------- panel ---------------- */
  function panel() {
    const m = modal(`<div class="adm"><h2>⚙ ADMINISTRACIÓN NEXTCARD</h2>
      <div class="pestanas" id="aPest">${[['pagos', 'PAGOS'], ['resumen', 'RESUMEN'], ['jugadores', 'JUGADORES'], ['batallas', 'BATALLAS'], ['ajustes', 'AJUSTES']].map(([k, n]) => `<button data-k="${k}" class="${pest === k ? 'on' : ''}">${n}<span id="b_${k}"></span></button>`).join('')}</div>
      <div id="aCont"></div></div>`, { cls: 'ancha' });
    $$('#aPest button', m).forEach(b => b.onclick = () => { pest = b.dataset.k; Son.tab(); $$('#aPest button').forEach(x => x.classList.toggle('on', x === b)); pinta(); });
    pinta();
  }
  function pinta() { const c = $('#aCont'); if (!c) return; c.innerHTML = '<div class="spin"></div>'; ({ pagos, resumen, jugadores, batallas, ajustes })[pest](c); }
  const kpi = l => `<div class="kpis">${l.map(([n, v]) => `<div class="kpi"><b>${v}</b><small>${n}</small></div>`).join('')}</div>`;

  function resumen(c) {
    adm('resumen').then(d => {
      if (!d.ok) return;
      c.innerHTML = kpi([['Jugadores', fmt(d.jugadores)], ['Han entrado hoy', d.hoyEntraron], ['Cuentas nuevas hoy', d.hoyNuevos], ['Batallas hoy', d.batallasHoy], ['Han jugado hoy', d.jugandoHoy],
        ['Pagos pendientes', d.pendientes], ['Ventas', d.ventas], ['Facturado', euros(d.facturado) + ' €'], ['Facturado hoy', euros(d.facturadoHoy) + ' €'], ['Gemas de jugadores', fmt(d.gemasJugadores)], ['Con Pase Nova', d.conPase]]);
    });
  }
  function pagos(c) {
    adm('pedidos').then(d => {
      if (!d.ok) return;
      const fila = (x, pend) => `<div class="ped ${x.estado}"><div><b>${esc(x.producto)}</b><small>${new Date(x.fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })} · ${esc(x.id)} · <b>${esc(x.usuario)}</b></small></div>
        <span class="pImp">${euros(x.importe)} €</span>${pend ? `<div class="pedBtns"><button class="btn mini verde" data-ok="${x.id}">✓ RECIBIDO</button><button class="btn mini rojo" data-no="${x.id}">✕</button></div>` : `<span class="estado">${x.estado.toUpperCase()}</span>`}</div>`;
      c.innerHTML = `<h3 class="secTit">PENDIENTES (${d.pendientes.length})</h3>${d.pendientes.map(x => fila(x, true)).join('') || '<p class="nota">No hay pagos pendientes. 👌</p>'}
        <p class="nota">Comprueba en tu app de myPOS que ha llegado un pago con ese importe y pulsa «Recibido»: las gemas o el pase llegan al jugador al momento.</p>
        <h3 class="secTit">HISTORIAL</h3>${d.historial.map(x => fila(x, false)).join('') || '<p class="nota">Sin historial.</p>'}`;
      const b = $('#b_pagos'); if (b) b.textContent = d.pendientes.length ? ' (' + d.pendientes.length + ')' : '';
      $$('[data-ok]', c).forEach(b => b.onclick = async () => {
        const x = d.pendientes.find(p => p.id === b.dataset.ok);
        if (!await confirmar('Confirmar pago', `¿Has recibido <b>${euros(x.importe)} €</b> de <b>${esc(x.usuario)}</b> en myPOS? Recibirá: <b>${esc(x.producto)}</b>.`, 'Sí, recibido')) return panel();
        panel(); adm('confirmar', { id: x.id }).then(r => { if (r.ok) { Son.gema(); toast('Entregado a ' + x.usuario, 'ok'); } pinta(); });
      });
      $$('[data-no]', c).forEach(b => b.onclick = async () => {
        const x = d.pendientes.find(p => p.id === b.dataset.no);
        if (!await confirmar('Rechazar pago', `¿Rechazar el pedido de <b>${esc(x.usuario)}</b> (${euros(x.importe)} €)?`, 'Rechazar', 'rojo')) return panel();
        panel(); adm('rechazar', { id: x.id }).then(() => pinta());
      });
    });
  }
  function jugadores(c) {
    c.innerHTML = `<form id="jBus" class="buscar"><input id="jQ" placeholder="Buscar por usuario o correo"><button class="btn sec">Buscar</button></form><div id="jLista"><div class="spin"></div></div>`;
    const carga = () => adm('usuarios', { q: $('#jQ').value }).then(d => {
      const el = $('#jLista'); if (!el || !d.ok) return;
      el.innerHTML = d.lista.map(u => `<div class="jFila"><div><b>${esc(u.usuario)}</b> ${u.pase ? '<span class="tagNova">NOVA</span>' : ''}<small>${esc(u.email)}</small><small>Nv ${u.nivel} · ${IC.trofeo} ${fmt(u.trofeos)} · ${u.v}V ${u.d}D · ${IC.gema} ${fmt(u.gemas)} · ${IC.cred} ${fmt(u.creditos)}</small>
        <small>Último acceso: ${u.ultimo ? new Date(u.ultimo).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</small></div><button class="btn mini gema" data-dar="${u.id}">🎁 Regalar</button></div>`).join('') || '<p class="nota">Nadie.</p>';
      $$('[data-dar]', el).forEach(b => b.onclick = () => regalar(d.lista.find(u => u.id === b.dataset.dar)));
    });
    $('#jBus').onsubmit = e => { e.preventDefault(); carga(); };
    carga();
  }
  function regalar(u) {
    const m = modal(`<h2>🎁 Regalar a ${esc(u.usuario)}</h2><form id="rF" class="formAdm">
      <label>Gemas <input id="rG" type="number" value="0"></label><label>Créditos <input id="rC" type="number" value="0"></label><label>Días de Pase Nova <input id="rP" type="number" value="0"></label>
      <label>Cápsula <select id="rK"><option value="">—</option>${Object.keys(NC.COFRES).filter(k => NC.COFRES[k].horas).map(k => `<option value="${k}">${NC.COFRES[k].nom}</option>`).join('')}</select></label>
      <p class="nota">Pon un número negativo para quitar.</p><div class="acciones"><button type="button" class="btn sec" id="rNo">Volver</button><button class="btn verde">Regalar</button></div></form>`, { cls: 'peq' });
    $('#rNo', m).onclick = () => { pest = 'jugadores'; panel(); };
    $('#rF', m).onsubmit = e => { e.preventDefault(); adm('dar', { id: u.id, gemas: $('#rG').value, creditos: $('#rC').value, paseDias: $('#rP').value, capsula: $('#rK').value }).then(r => { if (r.ok) { Son.gema(); toast('Regalo enviado a ' + u.usuario, 'ok'); pest = 'jugadores'; panel(); } }); };
  }
  function batallas(c) {
    adm('batallas').then(d => {
      if (!d.ok) return;
      c.innerHTML = `<p class="nota">Últimas 60 batallas.</p><div class="tablaW"><table class="tabla"><tr><th>Hora</th><th>Jugador</th><th>Rival</th><th>Resultado</th><th>Coronas</th><th>Trofeos</th><th>Duración</th></tr>
        ${d.lista.map(x => `<tr><td>${new Date(x.f).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</td><td><b>${esc(x.u)}</b></td><td>${esc(x.rival)}</td><td class="r-${x.res}">${x.res}</td><td>${x.co} - ${x.cr}</td><td>${x.t > 0 ? '+' : ''}${x.t}</td><td>${Math.floor(x.seg / 60)}:${String(x.seg % 60).padStart(2, '0')}</td></tr>`).join('')}</table></div>`;
    });
  }
  function ajustes(c) {
    adm('config').then(d => {
      if (!d.ok) return;
      c.innerHTML = `<form id="cfF" class="formAdm">${d.lista.map(x => `<label><span>${esc(x.ayuda)}</span>${x.k === 'botsRanking' ? `<select data-k="${x.k}"><option value="1" ${Number(x.v) ? 'selected' : ''}>Sí</option><option value="0" ${Number(x.v) ? '' : 'selected'}>No</option></select>` : `<input data-k="${x.k}" value="${esc(x.v)}">`}</label>`).join('')}
        <button class="btn verde">Guardar ajustes</button></form>
        <div class="panel"><h3 class="secTit">SEGURIDAD</h3><p class="nota">Si pierdes tu llave NFC, bórralas aquí. La próxima llave que pases (con tu cuenta ${esc('futurmovil.com@gmail.com')} abierta) quedará registrada.</p>
        <div class="acciones"><button class="btn rojo" id="sBor">Borrar llaves NFC</button><button class="btn sec" id="sTotp">Ver QR de Google Authenticator</button></div><div id="totpQr"></div></div>`;
      $('#cfF').onsubmit = e => { e.preventDefault(); const vals = {}; $$('[data-k]', c).forEach(i => vals[i.dataset.k] = i.value); adm('guardarConfig', { vals }).then(r => { if (r.ok) { toast('Ajustes guardados', 'ok'); refrescar(); } }); };
      $('#sBor').onclick = async () => { if (!await confirmar('Borrar llaves', '¿Borrar todas las llaves NFC registradas?', 'Borrar', 'rojo')) return panel(); panel(); adm('borrarLlaves').then(r => { if (r.ok) toast('Llaves borradas', 'ok'); }); };
      $('#sTotp').onclick = () => adm('totp').then(r => { if (!r.ok || !window.qrcode) return; const q = qrcode(0, 'M'); q.addData(r.url); q.make(); $('#totpQr').innerHTML = `<div class="qrBox">${q.createSvgTag({ cellSize: 4, margin: 2, scalable: true })}</div><p class="nota">Escanéalo con Google Authenticator.</p>`; });
    });
  }
  return { abrir };
})();
