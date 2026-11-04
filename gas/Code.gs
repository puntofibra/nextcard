/* =========================================================
   NEXTCARD · servidor (Apps Script)
   Frontend en GitHub Pages: https://puntofibra.github.io/nextcard/
   El archivo «Datos» comparte con el navegador las cartas, cápsulas y precios (NC).
   ========================================================= */
var HOJA_ID = '1QFxrGtQdRMOJQaNH6g0awr7Gvw8pSXTOGqdgxSgbudE';
var ADMIN_EMAIL = 'futurmovil.com@gmail.com';
var GOOGLE_CLIENT = '454055120059-nuhaop4r62urc3u036cc3grpqo71ulg7.apps.googleusercontent.com';
var MYPOS = 'https://mypos.com/@futurmovil/';
var WHATS = '34633200100';
var BOTS = ['NovaKing', 'Astro_42', 'pixelstar7', 'Turbo99', 'VegaPro', 'Orion_13', 'CosmoGG', 'KronoX', 'Lyra_88', 'nitrowolf3', 'Sirius21', 'BlitzZero', 'Quark_57', 'MagmaRex', 'ZetaNinja',
  'GalaxPedro', 'luna_bcn', 'Nebula_x', 'RoboMax', 'StarVlc', 'kaiser_33', 'Plutonio', 'AlexNova', 'cometa22', 'IonStorm', 'Marte_7', 'zeroG', 'DarkAstro', 'Pulsar_9', 'Titan_88'];

var COLS = { Jugadores: ['id', 'usuario', 'email', 'hash', 'token', 'creado', 'ultimo', 'trofeos', 'gemas', 'pase', 'datos'],
  Pedidos: ['id', 'fecha', 'uid', 'usuario', 'producto', 'clave', 'gemas', 'importe', 'estado', 'resuelto'],
  Batallas: ['fecha', 'uid', 'usuario', 'rival', 'res', 'co', 'cr', 'trofeos', 'seg'],
  Config: ['clave', 'valor', 'ayuda'] };

var CONFIG_DEF = [
  ['aviso', '', 'Aviso que ven todos los jugadores en la pantalla principal (vacío = sin aviso)'],
  ['botsRanking', '1', 'Mostrar jugadores bot en el ranking'],
  ['gemasInicio', '20', 'Gemas con las que empieza una cuenta nueva'],
  ['creditosInicio', '100', 'Créditos con los que empieza una cuenta nueva'],
  ['pase_cent', '499', 'Precio del Pase Nova en céntimos'],
  ['pase_dias', '30', 'Días que dura el Pase Nova'],
  ['g1', '80|99', 'Pack gemas 1: gemas|céntimos'],
  ['g2', '500|499', 'Pack gemas 2: gemas|céntimos'],
  ['g3', '1200|999', 'Pack gemas 3: gemas|céntimos'],
  ['g4', '2500|1999', 'Pack gemas 4: gemas|céntimos'],
  ['g5', '6500|4999', 'Pack gemas 5: gemas|céntimos'],
  ['cap_oro', '150', 'Gemas de la Cápsula Oro en la tienda'],
  ['cap_nebulosa', '420', 'Gemas de la Cápsula Nebulosa en la tienda'],
  ['cap_supernova', '1150', 'Gemas de la Cápsula Supernova en la tienda']
];

/* ---------------- entrada ---------------- */
function doGet(e) {
  return salida({ ok: true, juego: 'NEXTCARD', hora: Date.now() });
}
function doPost(e) {
  var p = {};
  try { p = JSON.parse(e.postData.contents || '{}'); } catch (err) { return salida({ ok: false, error: 'Petición no válida' }); }
  try {
    var f = API[p.accion];
    if (!f) return salida({ ok: false, error: 'Acción desconocida' });
    return salida(f(p));
  } catch (err) {
    var m = String(err && err.message || err);
    return salida({ ok: false, error: m });
  }
}
function salida(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ---------------- hojas ---------------- */
var _ss = null;
function ss() { return _ss || (_ss = SpreadsheetApp.openById(HOJA_ID)); }
function hoja(n) {
  var h = ss().getSheetByName(n);
  if (!h) {
    h = ss().insertSheet(n); h.appendRow(COLS[n]); h.setFrozenRows(1);
    h.getRange(1, 1, 1, COLS[n].length).setFontWeight('bold').setBackground('#0b1530').setFontColor('#00e5ff');
    if (n === 'Config') CONFIG_DEF.forEach(function (c) { h.appendRow(c); });
  }
  return h;
}
function instalar() { ['Jugadores', 'Pedidos', 'Batallas', 'Config'].forEach(hoja); var h = ss().getSheetByName('Hoja 1') || ss().getSheetByName('Sheet1'); if (h && h.getLastRow() === 0 && ss().getSheets().length > 1) ss().deleteSheet(h); totpSecreto(); return 'ok'; }

function config() {
  var c = CacheService.getScriptCache(), x = c.get('cfg');
  if (x) return JSON.parse(x);
  var o = {}; CONFIG_DEF.forEach(function (d) { o[d[0]] = d[1]; });
  var v = hoja('Config').getDataRange().getValues();
  for (var i = 1; i < v.length; i++) if (v[i][0]) o[v[i][0]] = String(v[i][1]);
  c.put('cfg', JSON.stringify(o), 300); return o;
}
function precios() {
  var c = config();
  var packs = ['g1', 'g2', 'g3', 'g4', 'g5'].map(function (k, i) { var a = String(c[k] || '').split('|'); return { id: k, gemas: Number(a[0]) || NC.TIENDA.gemas[i].gemas, cent: Number(a[1]) || NC.TIENDA.gemas[i].cent }; });
  return { packs: packs, pase: Number(c.pase_cent) || 499, paseDias: Number(c.pase_dias) || 30,
    capsulas: ['oro', 'nebulosa', 'supernova'].map(function (t, i) { return { tipo: t, gemas: Number(c['cap_' + t]) || NC.TIENDA.capsulas[i].gemas }; }),
    creditos: NC.TIENDA.creditos };
}

/* ---------------- utilidades ---------------- */
function hoy() { return Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM-dd'); }
function sha(t) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, t, Utilities.Charset.UTF_8).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join(''); }
function hashPass(email, pass) { return sha('nextcard|' + String(email).toLowerCase() + '|' + pass); }
function token() { return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''); }
function err(m) { throw new Error(m); }
function bloquear(fn) { var l = LockService.getScriptLock(); l.waitLock(20000); try { return fn(); } finally { l.releaseLock(); } }
function rnd(s) { var a = 0; for (var i = 0; i < s.length; i++) a = (a * 31 + s.charCodeAt(i)) | 0; return function () { a = (a * 1103515245 + 12345) | 0; return ((a >>> 16) & 0x7fff) / 32768; }; }

/* ---------------- jugadores ---------------- */
function filaDe(col, valor) {
  if (!valor) return 0;
  var h = hoja('Jugadores'), n = h.getLastRow(); if (n < 2) return 0;
  var ci = COLS.Jugadores.indexOf(col) + 1;
  var r = h.getRange(2, ci, n - 1, 1).createTextFinder(String(valor)).matchEntireCell(true).matchCase(col !== 'usuario').findNext();
  return r ? r.getRow() : 0;
}
function leeFila(f) { var v = hoja('Jugadores').getRange(f, 1, 1, COLS.Jugadores.length).getValues()[0]; var u = JSON.parse(v[10] || '{}'); u._f = f; u.hash = v[3]; u.token = v[4]; return u; }
function guardaU(u) {
  var h = hoja('Jugadores'), f = u._f, copia = {};
  Object.keys(u).forEach(function (k) { if (k !== '_f' && k !== 'hash' && k !== 'token') copia[k] = u[k]; });
  var fila = [u.id, u.usuario, u.email, u.hash || '', u.token || '', new Date(u.creado), new Date(), u.trofeos, u.gemas, u.pase > Date.now() ? new Date(u.pase) : '', JSON.stringify(copia)];
  if (f) h.getRange(f, 1, 1, fila.length).setValues([fila]); else { h.appendRow(fila); u._f = h.getLastRow(); }
}
function yoDe(tok) {
  if (!tok || String(tok).length < 20) err('SESION');
  var f = filaDe('token', tok); if (!f) err('SESION');
  var u = leeFila(f); if (u.token !== tok) err('SESION');
  var h = hoy(); if (!u.coronas || u.coronas.d !== h) u.coronas = { d: h, n: 0, ab: 0 };
  return u;
}
function perfil(u) {
  var h = hoy();
  return { id: u.id, usuario: u.usuario, email: u.email, trofeos: u.trofeos, max: u.max, creditos: u.creditos, gemas: u.gemas, victorias: u.victorias, derrotas: u.derrotas, xp: u.xp,
    cartas: u.cartas, mazo: u.mazo, cofres: u.cofres, ciclo: u.ciclo, sumi: u.sumi, arena: NC.arenaDe(u.trofeos), nivel: NC.nivelPorXp(u.xp), siguiente: NC.CICLO[u.ciclo % NC.CICLO.length],
    coronas: u.coronas && u.coronas.d === h ? u.coronas : { d: h, n: 0, ab: 0 }, ahora: Date.now(), pase: u.pase > Date.now() ? u.pase : 0, admin: u.email === ADMIN_EMAIL };
}
function nuevo(usuario, email) {
  var c = config(), cartas = {}; NC.MAZO_INICIAL.forEach(function (id) { cartas[id] = { n: 1, c: 0 }; });
  return { id: 'u' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36), usuario: usuario, email: email, creado: Date.now(), trofeos: 0, max: 0,
    creditos: Number(c.creditosInicio) || 100, gemas: Number(c.gemasInicio) || 20, victorias: 0, derrotas: 0, xp: 0, pase: 0, cartas: cartas, mazo: NC.MAZO_INICIAL.slice(),
    cofres: [{ tipo: 'plata', fin: 0 }, { tipo: 'oro', fin: 0 }, null, null], ciclo: 0, sumi: 0, coronas: { d: '', n: 0, ab: 0 } };
}
function dar(u, cont) {
  cont.cartas.forEach(function (x) { var m = u.cartas[x.id]; if (m) m.c += x.n; else u.cartas[x.id] = { n: 1, c: x.n - 1, nueva: 1 }; });
  u.creditos += cont.cred || 0; u.gemas += cont.gemas || 0;
}
function validaUsuario(usuario) {
  if (!/^[A-Za-z0-9ÑñÁÉÍÓÚáéíóúÜü_.\-]{3,16}$/.test(usuario || '')) err('El nombre de usuario debe tener de 3 a 16 letras o números');
  if (BOTS.some(function (b) { return b.toLowerCase() === usuario.toLowerCase(); }) || filaDe('usuario', usuario)) err('Ese nombre de usuario ya está cogido');
}
function sesionNueva(u) { u.token = token(); guardaU(u); return { ok: true, token: u.token, perfil: perfil(u) }; }

/* ---------------- ofertas del día ---------------- */
function ofertas(u) {
  var r = rnd(u.id + hoy()), ar = NC.arenaDe(u.trofeos), pool = NC.CARTAS.filter(function (c) { return c.arena <= ar; }), out = [{ i: 0, gratis: 1, cred: 40 + 10 * ar }], us = {};
  for (var k = 1; k <= 5; k++) {
    var rar = k <= 2 ? 'c' : k <= 4 ? 'r' : (r() < 0.15 ? 'l' : 'e');
    var l = pool.filter(function (c) { return c.rar === rar && !us[c.id]; }); if (!l.length) l = pool.filter(function (c) { return !us[c.id]; });
    var c = l[Math.floor(r() * l.length)]; us[c.id] = 1; var n = NC.TIENDA.paqueteCarta[c.rar];
    out.push({ i: k, id: c.id, n: n, precio: NC.TIENDA.precioCarta[c.rar] * n * (k === 3 ? 0.8 : 1) | 0, desc: k === 3 ? 20 : 0 });
  }
  var t = u.tienda && u.tienda.d === hoy() ? u.tienda : { d: hoy(), c: [] };
  out.forEach(function (o) { o.comprada = t.c.indexOf(o.i) >= 0 ? 1 : 0; }); return out;
}

/* ---------------- acciones con usuario (se guardan con bloqueo) ---------------- */
var CON_USUARIO = {
  mazo: function (p, u) {
    var m = p.mazo; if (!m || m.length !== 8) err('El mazo debe tener 8 cartas');
    var vistas = {}; m.forEach(function (id) { if (!u.cartas[id] || vistas[id]) err('El mazo debe tener 8 cartas distintas que tengas'); vistas[id] = 1; });
    u.mazo = m;
  },
  mejorar: function (p, u) {
    var c = NC.MAPA[p.id], m = u.cartas[p.id]; if (!c || !m) err('No tienes esa carta');
    if (m.n >= NC.NIVEL_MAX) err('Ya está al nivel máximo');
    var cop = NC.copiasPara(c.rar, m.n), cr = NC.creditosPara(c.rar, m.n);
    if (m.c < cop) err('Te faltan cartas'); if (u.creditos < cr) err('Te faltan créditos');
    u.creditos -= cr; m.c -= cop; m.n++; m.nueva = 0; u.xp += 4 * m.n * NC.RAREZAS[c.rar].mul; return { nivel: m.n };
  },
  desbloquear: function (p, u) {
    var c = u.cofres[p.slot]; if (!c) err('No hay cápsula ahí'); if (c.fin) err('Esa cápsula ya se está abriendo');
    var ab = u.cofres.filter(function (x) { return x && x.fin && x.fin > Date.now(); }).length, pase = u.pase > Date.now();
    if (ab >= (pase ? 2 : 1)) err(pase ? 'Ya hay dos cápsulas abriéndose' : 'Ya hay una cápsula abriéndose');
    c.fin = Date.now() + NC.COFRES[c.tipo].horas * 3600000 * (pase ? 0.7 : 1);
  },
  abrir: function (p, u) {
    var c = u.cofres[p.slot]; if (!c) err('No hay cápsula ahí');
    var r = c.fin ? c.fin - Date.now() : NC.COFRES[c.tipo].horas * 3600000;
    if (r > 0) { var g = NC.gemasPorTiempo(r); if (u.gemas < g) err('No tienes gemas suficientes'); u.gemas -= g; }
    var cont = NC.generarCofre(c.tipo, NC.arenaDe(u.trofeos)); dar(u, cont); u.cofres[p.slot] = null; return { cofre: c.tipo, contenido: cont };
  },
  suministros: function (p, u) {
    if (u.sumi && Date.now() - u.sumi < NC.HORAS_SUMINISTROS * 3600000) err('Los suministros aún no han llegado');
    var cont = NC.generarCofre('suministros', NC.arenaDe(u.trofeos)); dar(u, cont); u.sumi = Date.now(); return { cofre: 'suministros', contenido: cont };
  },
  corona: function (p, u) {
    if (u.coronas.n < NC.CORONAS_DIA || u.coronas.ab) err('Aún no has conseguido las coronas de hoy');
    var cont = NC.generarCofre('corona', NC.arenaDe(u.trofeos)); dar(u, cont); u.coronas.ab = 1; return { cofre: 'corona', contenido: cont };
  },
  resultado: function (p, u) {
    var cache = CacheService.getScriptCache(), k = 'bt_' + u.id, b = JSON.parse(cache.get(k) || 'null');
    if (!b || b.id !== p.id) err('Esa batalla ya no existe'); cache.remove(k);
    var seg = Math.round((Date.now() - b.t0) / 1000);
    var co = Math.max(0, Math.min(3, Number(p.coronas) || 0)), cr = Math.max(0, Math.min(3, Number(p.coronasRival) || 0));
    if (seg < 20 && co > 0) co = Math.min(co, 1);   // anti-trampas: una batalla real dura más
    var res = Number(p.rendido) ? 'pierde' : co > cr ? 'gana' : co < cr ? 'pierde' : 'empate', ar = NC.arenaDe(u.trofeos);
    var dT = 0, cred = 0, cofre = null, slot = -1, pase = u.pase > Date.now();
    if (res === 'gana') {
      dT = Math.max(20, Math.min(40, 30 + Math.round((b.rival.trofeos - u.trofeos) / 25)));
      cred = Math.round((18 + 6 * ar) * (pase ? 1.5 : 1));
      slot = u.cofres.indexOf(null);
      if (slot >= 0) { cofre = NC.CICLO[u.ciclo % NC.CICLO.length]; u.cofres[slot] = { tipo: cofre, fin: 0 }; u.ciclo++; }
      u.victorias++; u.xp += 10;
    } else if (res === 'pierde') {
      dT = -27; var s = NC.ARENAS[ar].min; if (u.trofeos + dT < s) dT = s - u.trofeos; u.derrotas++; u.xp += 3;
    } else u.xp += 5;
    u.trofeos = Math.max(0, u.trofeos + dT); u.max = Math.max(u.max || 0, u.trofeos); u.creditos += cred; u.coronas.n = Math.min(NC.CORONAS_DIA, u.coronas.n + co);
    hoja('Batallas').appendRow([new Date(), u.id, u.usuario, b.rival.nombre, res, co, cr, dT, seg]);
    var an = NC.arenaDe(u.trofeos);
    return { res: res, trofeos: dT, cred: cred, cofre: cofre, slot: slot, coronas: co, subeArena: an > ar ? an : -1 };
  },
  comprarOferta: function (p, u) {
    var o = ofertas(u)[p.i]; if (!o) err('Esa oferta no existe'); if (o.comprada) err('Ya la has comprado hoy');
    if (!u.tienda || u.tienda.d !== hoy()) u.tienda = { d: hoy(), c: [] };
    var cont;
    if (o.gratis) cont = { cartas: [], cred: o.cred, gemas: 0 };
    else { if (u.creditos < o.precio) err('Te faltan créditos'); u.creditos -= o.precio; cont = { cartas: [{ id: o.id, n: o.n }], cred: 0, gemas: 0 }; }
    dar(u, cont); u.tienda.c.push(o.i); return { contenido: cont };
  },
  comprarCapsula: function (p, u) {
    var x = precios().capsulas.filter(function (c) { return c.tipo === p.tipo; })[0]; if (!x) err('Esa cápsula no existe');
    if (u.gemas < x.gemas) err('No tienes gemas suficientes'); u.gemas -= x.gemas;
    var cont = NC.generarCofre(x.tipo, NC.arenaDe(u.trofeos)); dar(u, cont); return { cofre: x.tipo, contenido: cont };
  },
  comprarCreditos: function (p, u) {
    var x = NC.TIENDA.creditos[Number(p.i)]; if (!x) err('Ese paquete no existe');
    if (u.gemas < x.gemas) err('No tienes gemas suficientes'); u.gemas -= x.gemas; u.creditos += x.cred; return { cred: x.cred };
  }
};

/* ---------------- API ---------------- */
var API = {
  disponible: function (p) {
    var u = String(p.usuario || '');
    return { ok: true, disponible: /^[A-Za-z0-9ÑñÁÉÍÓÚáéíóúÜü_.\-]{3,16}$/.test(u) && !BOTS.some(function (b) { return b.toLowerCase() === u.toLowerCase(); }) && !filaDe('usuario', u) };
  },
  registrar: function (p) {
    var email = String(p.email || '').trim().toLowerCase(), usuario = String(p.usuario || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) err('El correo no es válido');
    if (String(p.pass || '').length < 6) err('La contraseña debe tener al menos 6 caracteres');
    return bloquear(function () {
      if (filaDe('email', email)) err('Ya existe una cuenta con ese correo');
      validaUsuario(usuario);
      var u = nuevo(usuario, email); u.hash = hashPass(email, p.pass); return sesionNueva(u);
    });
  },
  entrar: function (p) {
    var id = String(p.id || '').trim(), f = id.indexOf('@') > 0 ? filaDe('email', id.toLowerCase()) : filaDe('usuario', id);
    if (!f) err('Correo o contraseña incorrectos');
    var u = leeFila(f); if (!u.hash || u.hash !== hashPass(u.email, p.pass || '')) err('Correo o contraseña incorrectos');
    return bloquear(function () { u = leeFila(f); return sesionNueva(u); });
  },
  salir: function (p) {
    return bloquear(function () { try { var u = yoDe(p.token); u.token = ''; guardaU(u); } catch (e) {} return { ok: true }; });
  },
  recuperar: function (p) {
    var email = String(p.email || '').trim().toLowerCase(), f = filaDe('email', email);
    if (f) {
      var cod = String(Math.floor(100000 + Math.random() * 900000));
      CacheService.getScriptCache().put('rec_' + email, JSON.stringify({ cod: cod, n: 0 }), 900);
      MailApp.sendEmail({ to: email, name: 'NEXTCARD', subject: 'NEXTCARD · tu código: ' + cod,
        htmlBody: '<div style="font-family:Arial;background:#050a1a;color:#fff;padding:24px;border-radius:12px"><h2 style="color:#00e5ff">NEXTCARD</h2><p>Tu código para cambiar la contraseña es:</p><p style="font-size:32px;letter-spacing:6px;color:#19ff6a"><b>' + cod + '</b></p><p style="color:#9ab">Caduca en 15 minutos. Si no lo has pedido tú, ignora este correo.</p></div>' });
    }
    return { ok: true };
  },
  restablecer: function (p) {
    var email = String(p.email || '').trim().toLowerCase(), c = CacheService.getScriptCache(), k = 'rec_' + email, r = JSON.parse(c.get(k) || 'null');
    if (!r) err('El código ha caducado. Pide otro.');
    if (String(p.codigo).trim() !== r.cod) { r.n++; if (r.n >= 5) c.remove(k); else c.put(k, JSON.stringify(r), 900); err('Código incorrecto'); }
    if (String(p.pass || '').length < 6) err('La contraseña debe tener al menos 6 caracteres');
    c.remove(k);
    return bloquear(function () { var f = filaDe('email', email); if (!f) err('No existe esa cuenta'); var u = leeFila(f); u.hash = hashPass(email, p.pass); return sesionNueva(u); });
  },
  google: function (p) {
    var r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(p.credential || ''), { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) err('No se pudo comprobar tu cuenta de Google');
    var g = JSON.parse(r.getContentText());
    if (g.aud !== GOOGLE_CLIENT || String(g.email_verified) !== 'true') err('Cuenta de Google no válida');
    var email = String(g.email).toLowerCase();
    return bloquear(function () {
      var f = filaDe('email', email);
      if (f) return sesionNueva(leeFila(f));
      if (!p.usuario) return { ok: true, necesitaUsuario: true, sugerido: String(g.given_name || email.split('@')[0]).replace(/[^A-Za-z0-9_]/g, '').slice(0, 14) };
      var usuario = String(p.usuario).trim(); validaUsuario(usuario);
      var u = nuevo(usuario, email); u.google = 1; return sesionNueva(u);
    });
  },
  yo: function (p) {
    var u = yoDe(p.token);
    return { ok: true, perfil: perfil(u), aviso: config().aviso || '', tienda: precios() };
  },
  batalla: function (p) {
    var u = yoDe(p.token), ar = NC.arenaDe(u.trofeos), r = Math.random;
    var media = u.mazo.reduce(function (a, id) { return a + u.cartas[id].n; }, 0) / 8;
    var pool = NC.CARTAS.filter(function (c) { return c.arena <= ar; }), mazo = [];
    var coge = function (l) { var x = l.filter(function (c) { return mazo.indexOf(c) < 0; }); if (x.length) mazo.push(x[Math.floor(r() * x.length)]); };
    coge(pool.filter(function (c) { return c.obj === 'edificios'; })); coge(pool.filter(function (c) { return c.tipo === 'hechizo'; })); coge(pool.filter(function (c) { return c.tipo === 'hechizo'; }));
    coge(pool.filter(function (c) { return c.obj === 'todo' && c.tipo === 'tropa'; })); coge(pool.filter(function (c) { return c.obj === 'todo' && c.tipo === 'tropa'; }));
    while (mazo.length < 8) coge(pool);
    var rival = { nombre: BOTS[Math.floor(r() * BOTS.length)], trofeos: Math.max(0, u.trofeos + Math.round((r() - 0.5) * 80)), nivel: Math.max(1, NC.nivelPorXp(u.xp) + Math.round((r() - 0.5) * 2)),
      mazo: mazo.map(function (c) { return { id: c.id, n: Math.max(1, Math.min(NC.NIVEL_MAX, Math.round(media + (r() - 0.55) * 1.6))) }; }), listo: Math.min(1, 0.35 + u.trofeos / 2600) };
    var b = { id: 'B' + Date.now().toString(36) + Math.floor(r() * 1e6), t0: Date.now(), rival: rival };
    CacheService.getScriptCache().put('bt_' + u.id, JSON.stringify(b), 900);
    return { ok: true, id: b.id, rival: rival, arena: ar, yo: { mazo: u.mazo.map(function (id) { return { id: id, n: u.cartas[id].n }; }), nivel: NC.nivelPorXp(u.xp) } };
  },
  tienda: function (p) {
    var u = yoDe(p.token), hms = Utilities.formatDate(new Date(), 'Europe/Madrid', 'HH:mm:ss').split(':').map(Number);
    var manana = Date.now() + (86400 - hms[0] * 3600 - hms[1] * 60 - hms[2]) * 1000;
    return { ok: true, ofertas: ofertas(u), manana: manana, precios: precios() };
  },
  pedir: function (p) {
    var u = yoDe(p.token), pr = precios(), ped;
    var k = pr.packs.filter(function (x) { return x.id === p.producto; })[0];
    if (p.producto === 'pase') ped = { producto: 'Pase Nova ' + pr.paseDias + ' días', gemas: 0, importe: pr.pase };
    else if (k) ped = { producto: k.gemas.toLocaleString('es-ES') + ' gemas', gemas: k.gemas, importe: k.cent };
    else err('Ese producto no existe');
    return bloquear(function () {
      var h = hoja('Pedidos'), v = h.getDataRange().getValues(), n = 0;
      for (var i = 1; i < v.length; i++) if (v[i][2] === u.id && v[i][8] === 'pendiente') n++;
      if (n >= 5) err('Tienes demasiadas compras pendientes. Espera a que se confirmen.');
      ped.id = 'N' + Date.now().toString(36).toUpperCase(); ped.fecha = Date.now(); ped.estado = 'pendiente';
      h.appendRow([ped.id, new Date(ped.fecha), u.id, u.usuario, ped.producto, p.producto, ped.gemas, ped.importe / 100, 'pendiente', '']);
      avisoAdmin(u, ped);
      return { ok: true, pedido: ped, url: MYPOS + (ped.importe / 100).toFixed(2).replace('.', ',') };
    });
  },
  pedidos: function (p) {
    var u = yoDe(p.token), v = hoja('Pedidos').getDataRange().getValues(), out = [];
    for (var i = v.length - 1; i >= 1 && out.length < 30; i--) if (v[i][2] === u.id) out.push(pedObj(v[i]));
    return { ok: true, lista: out };
  },
  cancelar: function (p) {
    var u = yoDe(p.token);
    return bloquear(function () {
      var h = hoja('Pedidos'), v = h.getDataRange().getValues();
      for (var i = 1; i < v.length; i++) if (v[i][0] === p.id && v[i][2] === u.id && v[i][8] === 'pendiente') { h.getRange(i + 1, 9, 1, 2).setValues([['cancelado', new Date()]]); return { ok: true }; }
      err('No se puede cancelar ese pedido');
    });
  },
  ranking: function () {
    var c = CacheService.getScriptCache(), x = c.get('rank'); if (x) return JSON.parse(x);
    var v = hoja('Jugadores').getDataRange().getValues(), l = [];
    for (var i = 1; i < v.length; i++) { try { var u = JSON.parse(v[i][10]); l.push({ usuario: u.usuario, trofeos: u.trofeos, nivel: NC.nivelPorXp(u.xp), v: u.victorias, d: u.derrotas, pase: u.pase > Date.now() ? 1 : 0 }); } catch (e) {} }
    if (Number(config().botsRanking)) l = l.concat(botsRanking());
    l.sort(function (a, b) { return b.trofeos - a.trofeos; });
    var o = { ok: true, lista: l.slice(0, 100) }; c.put('rank', JSON.stringify(o), 60); return o;
  },
  admin_entrar: function (p) { return adminEntrar(p); },
  admin_totp: function (p) {
    if (!totpValido(p.codigo)) err('Código incorrecto');
    return { ok: true, admin: adminToken() };
  },
  qr_nuevo: function () {
    var code = token().slice(0, 40); CacheService.getScriptCache().put('qr_' + code, JSON.stringify({ admin: '' }), 300);
    return { ok: true, code: code, seg: 300 };
  },
  qr_estado: function (p) {
    var c = CacheService.getScriptCache(), k = 'qr_' + p.code, x = JSON.parse(c.get(k) || 'null');
    if (!x) return { ok: true, caducado: true };
    if (x.admin) { c.remove(k); return { ok: true, admin: x.admin }; }
    return { ok: true };
  },
  admin: function (p) {
    var c = CacheService.getScriptCache(); if (!p.admin || !c.get('adm_' + p.admin)) return { ok: false, caducada: true, error: 'Sesión caducada' };
    c.put('adm_' + p.admin, '1', 21600);
    var f = ADMIN_OPS[p.op]; if (!f) err('Operación desconocida');
    return f(p);
  }
};
// las acciones de CON_USUARIO cargan, modifican y guardan al jugador bajo bloqueo
Object.keys(CON_USUARIO).forEach(function (k) {
  API[k] = function (p) {
    return bloquear(function () { var u = yoDe(p.token), out = CON_USUARIO[k](p, u) || {}; guardaU(u); out.ok = true; out.perfil = perfil(u); return out; });
  };
});

function botsRanking() {
  var props = PropertiesService.getScriptProperties(), desde = Number(props.getProperty('botsDesde')) || 0;
  if (!desde) { desde = Date.now(); props.setProperty('botsDesde', String(desde)); }
  var dias = (Date.now() - desde) / 86400000;
  return BOTS.map(function (n, i) {
    var r = rnd(n), ritmo = 8 + r() * 45, base = 30 + Math.floor(r() * 250), t = Math.floor(base + ritmo * dias * (0.7 + 0.3 * Math.sin(i + dias / 3)));
    var v = 3 + Math.floor(t / 22), d = Math.floor(v * (0.5 + r() * 0.5));
    return { usuario: n, trofeos: Math.min(3400, t), nivel: Math.min(13, NC.nivelPorXp(v * 10 + d * 3)), v: v, d: d, pase: r() < 0.18 ? 1 : 0 };
  });
}
function pedObj(r) { return { id: r[0], fecha: new Date(r[1]).getTime(), uid: r[2], usuario: r[3], producto: r[4], clave: r[5], gemas: r[6], importe: Math.round(Number(r[7]) * 100), estado: r[8] }; }
function avisoAdmin(u, ped) {
  try {
    MailApp.sendEmail({ to: ADMIN_EMAIL, name: 'NEXTCARD', subject: '💎 NEXTCARD · pago pendiente ' + (ped.importe / 100).toFixed(2) + ' € · ' + u.usuario,
      htmlBody: '<p><b>' + u.usuario + '</b> (' + u.email + ') va a pagar <b>' + (ped.importe / 100).toFixed(2).replace('.', ',') + ' €</b> en myPOS por <b>' + ped.producto + '</b>.</p><p>Pedido ' + ped.id + '. Cuando veas el pago en myPOS, confírmalo en el panel admin de NEXTCARD.</p>' });
  } catch (e) {}
}

/* ---------------- administración ---------------- */
function adminToken() { var t = token(); CacheService.getScriptCache().put('adm_' + t, '1', 21600); return t; }
function adminEntrar(p) {
  var llave = String(p.llave || '').toLowerCase().replace(/[^0-9a-f:]/g, ''); if (!llave) err('Llave no válida');
  var props = PropertiesService.getScriptProperties(), lista = JSON.parse(props.getProperty('llaves') || '[]'), h = sha('llave|' + llave), nueva = false;
  if (lista.indexOf(h) < 0) {
    var u = null; try { u = yoDe(p.token); } catch (e) {}
    if (!u || u.email !== ADMIN_EMAIL) err('Esta llave no está autorizada');
    lista.push(h); props.setProperty('llaves', JSON.stringify(lista)); nueva = true;
  }
  var t = adminToken();
  if (p.qr) {
    var c = CacheService.getScriptCache(), k = 'qr_' + p.qr; if (!c.get(k)) err('El código QR ha caducado');
    c.put(k, JSON.stringify({ admin: t }), 120);
  }
  return { ok: true, admin: t, nueva: nueva };
}
function totpSecreto() {
  var props = PropertiesService.getScriptProperties(), s = props.getProperty('totp');
  if (!s) { var a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; s = ''; for (var i = 0; i < 32; i++) s += a[Math.floor(Math.random() * 32)]; props.setProperty('totp', s); }
  return s;
}
function base32(s) { var a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', bits = '', out = []; s.split('').forEach(function (ch) { bits += ('00000' + a.indexOf(ch).toString(2)).slice(-5); }); for (var i = 0; i + 8 <= bits.length; i += 8) { var b = parseInt(bits.substr(i, 8), 2); out.push(b > 127 ? b - 256 : b); } return out; }
function totp(t) {
  var key = base32(totpSecreto()), msg = [], c = t;
  for (var i = 7; i >= 0; i--) { msg[i] = c & 255; c = Math.floor(c / 256); }
  msg = msg.map(function (b) { return b > 127 ? b - 256 : b; });
  var h = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_1, msg, key).map(function (b) { return b & 255; });
  var o = h[19] & 15, n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return ('000000' + (n % 1000000)).slice(-6);
}
function totpValido(cod) { cod = String(cod || '').replace(/\D/g, ''); if (cod.length !== 6) return false; var t = Math.floor(Date.now() / 30000); for (var d = -1; d <= 1; d++) if (totp(t + d) === cod) return true; return false; }

var ADMIN_OPS = {
  resumen: function () {
    var h = hoy(), vj = hoja('Jugadores').getDataRange().getValues(), vp = hoja('Pedidos').getDataRange().getValues(), vb = hoja('Batallas').getDataRange().getValues();
    var d = { ok: true, jugadores: vj.length - 1, hoyEntraron: 0, hoyNuevos: 0, batallasHoy: 0, jugandoHoy: 0, pendientes: 0, ventas: 0, facturado: 0, facturadoHoy: 0, gemasJugadores: 0, conPase: 0 };
    var dia = function (x) { return x ? Utilities.formatDate(new Date(x), 'Europe/Madrid', 'yyyy-MM-dd') : ''; };
    for (var i = 1; i < vj.length; i++) { if (dia(vj[i][6]) === h) d.hoyEntraron++; if (dia(vj[i][5]) === h) d.hoyNuevos++; d.gemasJugadores += Number(vj[i][8]) || 0; if (vj[i][9] && new Date(vj[i][9]).getTime() > Date.now()) d.conPase++; }
    var jug = {}; for (i = 1; i < vb.length; i++) if (dia(vb[i][0]) === h) { d.batallasHoy++; jug[vb[i][1]] = 1; } d.jugandoHoy = Object.keys(jug).length;
    for (i = 1; i < vp.length; i++) { var c = Math.round(Number(vp[i][7]) * 100); if (vp[i][8] === 'pendiente') d.pendientes++; if (vp[i][8] === 'pagado') { d.ventas++; d.facturado += c; if (dia(vp[i][9]) === h) d.facturadoHoy += c; } }
    return d;
  },
  pedidos: function () {
    var v = hoja('Pedidos').getDataRange().getValues(), pend = [], hist = [];
    for (var i = v.length - 1; i >= 1; i--) { var x = pedObj(v[i]); if (x.estado === 'pendiente') pend.push(x); else if (hist.length < 60) hist.push(x); }
    return { ok: true, pendientes: pend, historial: hist };
  },
  confirmar: function (p) { return resolverPedido(p.id, true); },
  rechazar: function (p) { return resolverPedido(p.id, false); },
  usuarios: function (p) {
    var q = String(p.q || '').toLowerCase(), v = hoja('Jugadores').getDataRange().getValues(), l = [];
    for (var i = v.length - 1; i >= 1 && l.length < 80; i--) {
      if (q && String(v[i][1]).toLowerCase().indexOf(q) < 0 && String(v[i][2]).toLowerCase().indexOf(q) < 0) continue;
      var u = JSON.parse(v[i][10] || '{}');
      l.push({ id: u.id, usuario: u.usuario, email: u.email, nivel: NC.nivelPorXp(u.xp), trofeos: u.trofeos, v: u.victorias, d: u.derrotas, gemas: u.gemas, creditos: u.creditos, pase: u.pase > Date.now(), ultimo: v[i][6] ? new Date(v[i][6]).getTime() : 0 });
    }
    return { ok: true, lista: l };
  },
  dar: function (p) {
    return bloquear(function () {
      var f = filaDe('id', p.id); if (!f) err('No existe ese jugador');
      var u = leeFila(f), g = Math.round(Number(p.gemas) || 0), c = Math.round(Number(p.creditos) || 0), dias = Number(p.paseDias) || 0;
      u.gemas = Math.max(0, u.gemas + g); u.creditos = Math.max(0, u.creditos + c);
      if (dias) u.pase = Math.max(Date.now(), u.pase || 0) + dias * 86400000;
      if (p.capsula && NC.COFRES[p.capsula]) { var s = u.cofres.indexOf(null); if (s < 0) err('No tiene huecos libres para la cápsula'); u.cofres[s] = { tipo: p.capsula, fin: 0 }; }
      guardaU(u); return { ok: true };
    });
  },
  batallas: function () {
    var v = hoja('Batallas').getDataRange().getValues(), l = [];
    for (var i = v.length - 1; i >= 1 && l.length < 60; i--) l.push({ f: new Date(v[i][0]).getTime(), u: v[i][2], rival: v[i][3], res: v[i][4], co: v[i][5], cr: v[i][6], t: v[i][7], seg: v[i][8] });
    return { ok: true, lista: l };
  },
  config: function () {
    var c = config(); return { ok: true, lista: CONFIG_DEF.map(function (d) { return { k: d[0], v: c[d[0]], ayuda: d[2] }; }) };
  },
  guardarConfig: function (p) {
    var h = hoja('Config'), v = h.getDataRange().getValues(), vals = p.vals || {};
    Object.keys(vals).forEach(function (k) {
      if (!CONFIG_DEF.some(function (d) { return d[0] === k; })) return;
      var fila = 0; for (var i = 1; i < v.length; i++) if (v[i][0] === k) fila = i + 1;
      if (k === 'botsRanking' && String(vals[k]) === '1' && String(config().botsRanking) !== '1') PropertiesService.getScriptProperties().setProperty('botsDesde', String(Date.now()));
      if (fila) h.getRange(fila, 2).setValue(String(vals[k])); else h.appendRow([k, String(vals[k]), '']);
    });
    CacheService.getScriptCache().removeAll(['cfg', 'rank']); return { ok: true };
  },
  borrarLlaves: function () { PropertiesService.getScriptProperties().deleteProperty('llaves'); return { ok: true }; },
  totp: function () { return { ok: true, url: 'otpauth://totp/NEXTCARD:' + ADMIN_EMAIL + '?secret=' + totpSecreto() + '&issuer=NEXTCARD' }; }
};
function resolverPedido(id, ok) {
  return bloquear(function () {
    var h = hoja('Pedidos'), v = h.getDataRange().getValues();
    for (var i = 1; i < v.length; i++) if (v[i][0] === id) {
      if (v[i][8] !== 'pendiente') err('Ese pedido ya no está pendiente');
      if (ok) {
        var f = filaDe('id', v[i][2]); if (!f) err('El jugador ya no existe');
        var u = leeFila(f);
        if (v[i][5] === 'pase') u.pase = Math.max(Date.now(), u.pase || 0) + (precios().paseDias || 30) * 86400000;
        else u.gemas += Number(v[i][6]) || 0;
        guardaU(u);
      }
      h.getRange(i + 1, 9, 1, 2).setValues([[ok ? 'pagado' : 'rechazado', new Date()]]);
      return { ok: true };
    }
    err('No existe ese pedido');
  });
}
