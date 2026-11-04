/* =========================================================
   NEXTCARD · modo demo (sin servidor): imita la API de Apps Script
   guardando todo en este navegador. Solo se usa si CFG.API está vacío
   o con ?demo=1 en la dirección.
   ========================================================= */
'use strict';
const Demo = (() => {
  const K = 'nc_demo';
  const db = () => { try { return JSON.parse(localStorage.getItem(K)) || { u: {}, ped: [] }; } catch (e) { return { u: {}, ped: [] }; } };
  const guarda = d => { try { localStorage.setItem(K, JSON.stringify(d)); } catch (e) {} };
  const hoy = () => new Date().toISOString().slice(0, 10);
  const BOTS = ['NovaKing', 'Astro_42', 'pixelstar7', 'Turbo99', 'VegaPro', 'Orion_13', 'CosmoGG', 'KronoX', 'Lyra_88', 'nitrowolf3', 'Sirius21', 'BlitzZero', 'Quark_57', 'MagmaRex', 'ZetaNinja'];
  function perfil(u) {
    const h = hoy(); return Object.assign({}, u, { arena: NC.arenaDe(u.trofeos), nivel: NC.nivelPorXp(u.xp), siguiente: NC.CICLO[u.ciclo % NC.CICLO.length], coronas: u.coronas.d === h ? u.coronas : { d: h, n: 0, ab: 0 }, ahora: Date.now(), pase: u.pase > Date.now() ? u.pase : 0 });
  }
  function nuevo(usuario, email, pass) {
    const cartas = {}; NC.MAZO_INICIAL.forEach(id => cartas[id] = { n: 1, c: 0 });
    return { id: 'u' + Date.now().toString(36), usuario, email, pass, token: 'demo-' + Math.random().toString(36).slice(2) + Date.now().toString(36) + 'xxxxxxxxxxxxxxxxx',
      trofeos: 0, max: 0, creditos: 100, gemas: 20, victorias: 0, derrotas: 0, xp: 0, pase: 0, cartas, mazo: NC.MAZO_INICIAL.slice(),
      cofres: [{ tipo: 'plata', fin: 0 }, { tipo: 'oro', fin: 0 }, null, null], ciclo: 0, sumi: 0, coronas: { d: '', n: 0, ab: 0 }, admin: false };
  }
  function yoDe(d, token) { const u = Object.values(d.u).find(x => x.token === token); if (!u) throw new Error('SESION'); const h = hoy(); if (u.coronas.d !== h) u.coronas = { d: h, n: 0, ab: 0 }; return u; }
  function dar(u, cont) { cont.cartas.forEach(x => { const m = u.cartas[x.id]; if (m) m.c += x.n; else u.cartas[x.id] = { n: 1, c: x.n - 1, nueva: 1 }; }); u.creditos += cont.cred; u.gemas += cont.gemas; }
  function rnd(s) { let a = 0; for (let i = 0; i < s.length; i++) a = (a * 31 + s.charCodeAt(i)) | 0; return () => { a = (a * 1103515245 + 12345) | 0; return ((a >>> 16) & 0x7fff) / 32768; }; }
  function ofertas(u) {
    const r = rnd(u.id + hoy()), ar = NC.arenaDe(u.trofeos), pool = NC.CARTAS.filter(c => c.arena <= ar), out = [{ i: 0, gratis: 1, cred: 40 + 10 * ar }], us = {};
    for (let k = 1; k <= 5; k++) { const rar = k <= 2 ? 'c' : k <= 4 ? 'r' : (r() < 0.15 ? 'l' : 'e'); let l = pool.filter(c => c.rar === rar && !us[c.id]); if (!l.length) l = pool.filter(c => !us[c.id]); const c = l[Math.floor(r() * l.length)]; us[c.id] = 1; const n = NC.TIENDA.paqueteCarta[c.rar]; out.push({ i: k, id: c.id, n, precio: NC.TIENDA.precioCarta[c.rar] * n * (k === 3 ? 0.8 : 1) | 0, desc: k === 3 ? 20 : 0 }); }
    const t = u.tienda && u.tienda.d === hoy() ? u.tienda : { d: hoy(), c: [] }; out.forEach(o => o.comprada = t.c.indexOf(o.i) >= 0 ? 1 : 0); return out;
  }
  const A = {
    disponible: (d, p) => ({ ok: true, disponible: !Object.values(d.u).some(u => u.usuario.toLowerCase() === String(p.usuario).toLowerCase()) }),
    registrar: (d, p) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.email || '')) throw new Error('El correo no es válido');
      if (!/^[A-Za-z0-9ÑñÁÉÍÓÚáéíóúÜü_.\-]{3,16}$/.test(p.usuario || '')) throw new Error('El nombre de usuario debe tener de 3 a 16 letras o números');
      if (String(p.pass || '').length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
      if (Object.values(d.u).some(u => u.email === p.email.toLowerCase())) throw new Error('Ya existe una cuenta con ese correo');
      if (A.disponible(d, p).disponible === false) throw new Error('Ese nombre de usuario ya está cogido');
      const u = nuevo(p.usuario, p.email.toLowerCase(), p.pass); d.u[u.id] = u; return { ok: true, token: u.token, perfil: perfil(u) };
    },
    entrar: (d, p) => { const id = String(p.id || '').toLowerCase(); const u = Object.values(d.u).find(x => (x.email === id || x.usuario.toLowerCase() === id) && x.pass === p.pass); if (!u) throw new Error('Correo o contraseña incorrectos'); return { ok: true, token: u.token, perfil: perfil(u) }; },
    salir: () => ({ ok: true }), recuperar: () => ({ ok: true }), restablecer: () => { throw new Error('En el modo demo no hay correo'); },
    google: () => { throw new Error('Google no está disponible en el modo demo'); },
    yo: (d, p) => ({ ok: true, perfil: perfil(yoDe(d, p.token)), aviso: '', tienda: { packs: NC.TIENDA.gemas, pase: NC.TIENDA.pase.cent, capsulas: NC.TIENDA.capsulas, creditos: NC.TIENDA.creditos } }),
    mazo: (d, p, u) => { if (p.mazo.length !== 8 || new Set(p.mazo).size !== 8) throw new Error('El mazo debe tener 8 cartas distintas'); u.mazo = p.mazo; },
    mejorar: (d, p, u) => { const c = NC.MAPA[p.id], m = u.cartas[p.id]; const cop = NC.copiasPara(c.rar, m.n), cr = NC.creditosPara(c.rar, m.n); if (m.c < cop) throw new Error('Te faltan cartas'); if (u.creditos < cr) throw new Error('Te faltan créditos'); u.creditos -= cr; m.c -= cop; m.n++; u.xp += 4 * m.n * NC.RAREZAS[c.rar].mul; return { nivel: m.n }; },
    desbloquear: (d, p, u) => { const c = u.cofres[p.slot]; const ab = u.cofres.filter(x => x && x.fin && x.fin > Date.now()).length; if (ab >= (u.pase > Date.now() ? 2 : 1)) throw new Error('Ya hay una cápsula abriéndose'); c.fin = Date.now() + NC.COFRES[c.tipo].horas * 3600000 * (u.pase > Date.now() ? 0.7 : 1); },
    abrir: (d, p, u) => { const c = u.cofres[p.slot]; const r = c.fin ? c.fin - Date.now() : NC.COFRES[c.tipo].horas * 3600000; if (r > 0) { const g = NC.gemasPorTiempo(r); if (u.gemas < g) throw new Error('No tienes gemas suficientes'); u.gemas -= g; } const cont = NC.generarCofre(c.tipo, NC.arenaDe(u.trofeos)); dar(u, cont); u.cofres[p.slot] = null; return { cofre: c.tipo, contenido: cont }; },
    suministros: (d, p, u) => { if (u.sumi && Date.now() - u.sumi < NC.HORAS_SUMINISTROS * 3600000) throw new Error('Aún no'); const cont = NC.generarCofre('suministros', NC.arenaDe(u.trofeos)); dar(u, cont); u.sumi = Date.now(); return { cofre: 'suministros', contenido: cont }; },
    corona: (d, p, u) => { if (u.coronas.n < NC.CORONAS_DIA || u.coronas.ab) throw new Error('Aún no'); const cont = NC.generarCofre('corona', NC.arenaDe(u.trofeos)); dar(u, cont); u.coronas.ab = 1; return { cofre: 'corona', contenido: cont }; },
    batalla: (d, p) => {
      const u = yoDe(d, p.token), ar = NC.arenaDe(u.trofeos), r = Math.random, media = u.mazo.reduce((a, id) => a + u.cartas[id].n, 0) / 8;
      const pool = NC.CARTAS.filter(c => c.arena <= ar), mazo = [];
      const coge = l => { const x = l.filter(c => mazo.indexOf(c) < 0); if (x.length) mazo.push(x[Math.floor(r() * x.length)]); };
      coge(pool.filter(c => c.obj === 'edificios')); coge(pool.filter(c => c.tipo === 'hechizo')); coge(pool.filter(c => c.tipo === 'hechizo')); coge(pool.filter(c => c.obj === 'todo' && c.tipo === 'tropa')); coge(pool.filter(c => c.obj === 'todo' && c.tipo === 'tropa'));
      while (mazo.length < 8) coge(pool);
      const rival = { nombre: BOTS[Math.floor(r() * BOTS.length)], trofeos: Math.max(0, u.trofeos + Math.round((r() - 0.5) * 80)), nivel: Math.max(1, NC.nivelPorXp(u.xp) + Math.round((r() - 0.5) * 2)), mazo: mazo.map(c => ({ id: c.id, n: Math.max(1, Math.round(media + (r() - 0.55) * 1.6)) })), listo: Math.min(1, 0.35 + u.trofeos / 2600) };
      d.bt = { id: 'B' + Date.now(), t0: Date.now(), rival };
      return { ok: true, id: d.bt.id, rival, arena: ar, yo: { mazo: u.mazo.map(id => ({ id, n: u.cartas[id].n })), nivel: NC.nivelPorXp(u.xp) } };
    },
    resultado: (d, p, u) => {
      const b = d.bt; if (!b || b.id !== p.id) throw new Error('Esa batalla ya no existe'); d.bt = null;
      const co = +p.coronas || 0, cr = +p.coronasRival || 0, res = p.rendido ? 'pierde' : co > cr ? 'gana' : co < cr ? 'pierde' : 'empate', ar = NC.arenaDe(u.trofeos);
      let dT = 0, cred = 0, cofre = null, slot = -1;
      if (res === 'gana') { dT = Math.max(20, Math.min(40, 30 + Math.round((b.rival.trofeos - u.trofeos) / 25))); cred = Math.round((18 + 6 * ar) * (u.pase > Date.now() ? 1.5 : 1)); slot = u.cofres.indexOf(null); if (slot >= 0) { cofre = NC.CICLO[u.ciclo % NC.CICLO.length]; u.cofres[slot] = { tipo: cofre, fin: 0 }; u.ciclo++; } u.victorias++; u.xp += 10; }
      else if (res === 'pierde') { dT = -27; const s = NC.ARENAS[ar].min; if (u.trofeos + dT < s) dT = s - u.trofeos; u.derrotas++; u.xp += 3; } else u.xp += 5;
      u.trofeos = Math.max(0, u.trofeos + dT); u.max = Math.max(u.max, u.trofeos); u.creditos += cred; u.coronas.n = Math.min(NC.CORONAS_DIA, u.coronas.n + co);
      const an = NC.arenaDe(u.trofeos); return { res, trofeos: dT, cred, cofre, slot, coronas: co, subeArena: an > ar ? an : -1 };
    },
    tienda: (d, p) => { const u = yoDe(d, p.token); const m = new Date(); m.setHours(24, 0, 0, 0); return { ok: true, ofertas: ofertas(u), manana: m.getTime() }; },
    comprarOferta: (d, p, u) => { const o = ofertas(u)[p.i]; if (o.comprada) throw new Error('Ya la has comprado hoy'); if (!u.tienda || u.tienda.d !== hoy()) u.tienda = { d: hoy(), c: [] }; let cont; if (o.gratis) cont = { cartas: [], cred: o.cred, gemas: 0 }; else { if (u.creditos < o.precio) throw new Error('Te faltan créditos'); u.creditos -= o.precio; cont = { cartas: [{ id: o.id, n: o.n }], cred: 0, gemas: 0 }; } dar(u, cont); u.tienda.c.push(o.i); return { contenido: cont }; },
    comprarCapsula: (d, p, u) => { const x = NC.TIENDA.capsulas.find(c => c.tipo === p.tipo); if (u.gemas < x.gemas) throw new Error('No tienes gemas suficientes'); u.gemas -= x.gemas; const cont = NC.generarCofre(x.tipo, NC.arenaDe(u.trofeos)); dar(u, cont); return { cofre: x.tipo, contenido: cont }; },
    comprarCreditos: (d, p, u) => { const x = NC.TIENDA.creditos[p.i]; if (u.gemas < x.gemas) throw new Error('No tienes gemas suficientes'); u.gemas -= x.gemas; u.creditos += x.cred; return { cred: x.cred }; },
    pedir: (d, p) => { const u = yoDe(d, p.token); const k = NC.TIENDA.gemas.find(x => x.id === p.producto); const ped = { id: 'N' + Date.now().toString(36).toUpperCase(), fecha: Date.now(), producto: p.producto === 'pase' ? 'Pase Nova 30 días' : k.gemas + ' gemas', gemas: k ? k.gemas : 0, importe: k ? k.cent : NC.TIENDA.pase.cent, estado: 'pendiente', uid: u.id }; d.ped.push(ped); return { ok: true, pedido: ped, url: 'https://mypos.com/@futurmovil/' + (ped.importe / 100).toFixed(2).replace('.', ',') }; },
    pedidos: (d, p) => { const u = yoDe(d, p.token); return { ok: true, lista: d.ped.filter(x => x.uid === u.id).reverse() }; },
    cancelar: (d, p) => { const x = d.ped.find(x => x.id === p.id); if (x) x.estado = 'cancelado'; return { ok: true }; },
    ranking: d => ({ ok: true, lista: Object.values(d.u).map(u => ({ usuario: u.usuario, trofeos: u.trofeos, nivel: NC.nivelPorXp(u.xp), v: u.victorias, d: u.derrotas, pase: 0 })).concat(BOTS.map((n, i) => ({ usuario: n, trofeos: 40 + i * 37 % 400, nivel: 1 + i % 4, v: 3 + i, d: 2 + i % 5, pase: i % 5 === 0 ? 1 : 0 }))).sort((a, b) => b.trofeos - a.trofeos) }),
    admin_entrar: () => { throw new Error('El panel admin necesita el servidor'); }, qr_nuevo: () => { throw new Error('El panel admin necesita el servidor'); }
  };
  const CON_USUARIO = ['mazo', 'mejorar', 'desbloquear', 'abrir', 'suministros', 'corona', 'resultado', 'comprarOferta', 'comprarCapsula', 'comprarCreditos'];
  function api(accion, p) {
    return new Promise(res => setTimeout(() => {
      const d = db();
      try {
        const f = A[accion]; if (!f) return res({ ok: true, juego: 'NEXTCARD demo' });
        let out;
        if (CON_USUARIO.indexOf(accion) >= 0) { const u = yoDe(d, p.token); out = f(d, p, u) || {}; out.ok = true; out.perfil = perfil(u); }
        else out = f(d, p);
        guarda(d); res(JSON.parse(JSON.stringify(out)));
      } catch (e) { res({ ok: false, error: e.message }); }
    }, 120));
  }
  return { api };
})();
