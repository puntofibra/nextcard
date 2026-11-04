/* =========================================================
   NEXTCARD · batalla en tiempo real (motor + dibujo + IA rival)
   Campo de 18 x 32 casillas. Equipo 0 = jugador (abajo), 1 = rival (arriba).
   ========================================================= */
'use strict';
const Batalla = (() => {
  const AN = 18, AL = 32, RIO0 = 15, RIO1 = 17, PUENTES = [3.5, 14.5], DT = 1 / 30;
  const DURACION = 180, PRORROGA = 60, RECARGA = 2.8;
  let cv, cx, W, H, S, OX, OY, dpr = 1, raf = 0, ultimo = 0, acum = 0, corriendo = false, pausado = false;
  let B = null, opts = null, suelo = null, sueloKey = '', fondoEsp = null;
  let arrastre = null, seleccion = -1, raton = null, VEL = 1;
  const $ = (s, r) => (r || document).querySelector(s);

  /* ---------------- utilidades ---------------- */
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const azar = (a, b) => a + Math.random() * (b - a);
  function barajar(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function posTorres(eq) {
    const f = y => eq ? AL - y : y;
    return { rey: { x: 9, y: f(29) }, izq: { x: 3.5, y: f(26) }, der: { x: 14.5, y: f(26) } };
  }

  // torres ilustradas (img/torre-*.webp): tamaño en casillas, base apoyada en la plataforma
  const TORRE_IMG = { rey: { w: 1.62, asp: 640 / 425, canon: 0.11 }, lat: { w: 1.55, asp: 640 / 345, canon: 0.11 } };
  function geoTorre(e) {
    const g = TORRE_IMG[e.torre === 'rey' ? 'rey' : 'lat'], w = e.r * g.w, h = w * g.asp, bot = e.y + e.r * 0.5;
    return { w, h, bot, top: bot - h, canon: bot - h * (1 - g.canon) };
  }
  function imgTorre(e) {
    const i = Arte.img('img/torre-' + (e.torre === 'rey' ? 'rey' : 'lateral') + '-' + (e.eq ? 'roja' : 'verde') + '.webp');
    return i.complete && i.naturalWidth ? i : null;
  }

  /* ---------------- creación ---------------- */
  function nuevaEntidad(o) { o.k = ++B.idc; o.t = 0; o.cd = 0.35; o.golpe = 0; o.slow = 0; o.stun = 0; o.dir = o.eq ? -1 : 1; o.anim = 0; B.ent.push(o); return o; }
  function crearTorres(eq, nivel) {
    const p = posTorres(eq), m = NC.multTorre(nivel);
    [['izq', 1450, 52, 0.8, 7.5, 1.45], ['der', 1450, 52, 0.8, 7.5, 1.45], ['rey', 2500, 56, 1.0, 7.0, 1.95]].forEach(([n, hp, dmg, hit, rango, r]) => {
      nuevaEntidad({ eq, tipo: 'torre', torre: n, x: p[n].x, y: p[n].y, hp: Math.round(hp * m), max: Math.round(hp * m), dmg: Math.round(dmg * m), hit, rango, r, obj: 'todo', activa: n !== 'rey', ang: eq ? Math.PI / 2 : -Math.PI / 2 });
    });
  }
  function statsCarta(id, nivel) {
    const c = id === 'cadete' ? NC.CADETE : NC.MAPA[id], m = NC.multNivel(nivel);
    return { c, hp: Math.round((c.hp || 0) * m), dmg: Math.round((c.dmg || 0) * m) };
  }
  function crearTropa(id, eq, x, y, nivel, retraso) {
    const s = statsCarta(id, nivel), c = s.c, n = c.num || 1, out = [];
    for (let i = 0; i < n; i++) {
      const a = n > 1 ? i / n * Math.PI * 2 + (eq ? Math.PI : 0) : 0, d = n > 1 ? (c.vuela ? 0.75 : 0.65) : 0;
      const e = nuevaEntidad({ eq, tipo: c.tipo === 'edificio' ? 'edificio' : 'tropa', id: c.id, c, nivel, x: clamp(x + Math.cos(a) * d, 0.4, AN - 0.4), y: clamp(y + Math.sin(a) * d, 0.4, AL - 0.4),
        hp: s.hp, max: s.hp, dmg: s.dmg, hit: c.hit, rango: c.rango, r: c.radio, vel: c.vel, vuela: !!c.vuela, obj: c.obj, desp: retraso == null ? 1 : retraso, invT: c.cada || 0, cargado: !!c.carga, ang: eq ? Math.PI / 2 : -Math.PI / 2 });
      out.push(e);
    }
    return out;
  }

  function iniciar(o) {
    ['rey', 'lateral'].forEach(n => ['verde', 'roja'].forEach(c => Arte.img('img/torre-' + n + '-' + c + '.webp'))); Arte.img('img/lucas/espalda.webp'); Arte.rojo('img/lucas/vuela.webp');
    opts = o;
    B = { idc: 0, ent: [], proy: [], part: [], zonas: [], textos: [], t: 0, fin: null, prorroga: false, coronas: [0, 0], plasma: [5, 5], temblor: 0, flash: 0,
      mazo: [barajar(o.yo.mazo), barajar(o.rival.mazo)], mano: [[], []], niveles: [{}, {}], nivelRey: [o.yo.nivel, o.rival.nivel], arena: o.arena || 0, cuenta: 3.2, ia: { t: 1.5, empuje: null }, jugadas: 0 };
    o.yo.mazo.forEach(x => B.niveles[0][x.id] = x.n); o.rival.mazo.forEach(x => B.niveles[1][x.id] = x.n);
    [0, 1].forEach(eq => { B.mano[eq] = B.mazo[eq].slice(0, 4).map(x => x.id); B.mazo[eq] = B.mazo[eq].slice(4).map(x => x.id).concat(B.mano[eq].slice(0, 0)); });
    crearTorres(0, o.yo.nivel); crearTorres(1, o.rival.nivel);
    montarDom();
    corriendo = true; pausado = false; ultimo = performance.now(); acum = 0;
    Son.modo('batalla'); Son.cuenta(1);
    cancelAnimationFrame(raf); raf = requestAnimationFrame(bucle);
  }
  function siguienteCarta(eq, idx) {
    const jugada = B.mano[eq][idx], sig = B.mazo[eq].shift();
    B.mazo[eq].push(jugada); B.mano[eq][idx] = sig;
  }

  /* ---------------- reglas de colocación ---------------- */
  function torre(eq, n) { return B.ent.find(e => e.tipo === 'torre' && e.eq === eq && e.torre === n && e.hp > 0); }
  function zonaValida(eq, id, x, y) {
    const c = NC.MAPA[id]; if (!c) return false;
    if (x < 0.3 || x > AN - 0.3 || y < 0.3 || y > AL - 0.3) return false;
    if (c.tipo === 'hechizo') return true;
    const rival = 1 - eq;
    let lim = eq ? RIO0 - 0.5 : RIO1 + 0.5;   // propio lado
    const ladoIzq = x < AN / 2;
    const caida = !torre(rival, ladoIzq ? 'izq' : 'der');
    if (eq === 0) { if (y < lim && !(caida && y >= 10.5)) return false; }
    else { if (y > lim && !(caida && y <= AL - 10.5)) return false; }
    if (y > RIO0 - 0.2 && y < RIO1 + 0.2) return false;
    // no encima de torres
    for (const e of B.ent) if (e.tipo === 'torre' && e.hp > 0 && Math.abs(e.x - x) < e.r + 0.3 && Math.abs(e.y - y) < e.r + 0.3) return false;
    return true;
  }
  function ajustaZona(eq, id, x, y) {
    if (zonaValida(eq, id, x, y)) return { x, y };
    // busca el punto válido más cercano
    let mejor = null, md = 1e9;
    for (let dy = -6; dy <= 6; dy += 0.5) for (let dx = -3; dx <= 3; dx += 0.5) {
      const nx = x + dx, ny = y + dy; if (!zonaValida(eq, id, nx, ny)) continue;
      const d = dx * dx + dy * dy; if (d < md) { md = d; mejor = { x: nx, y: ny }; }
    }
    return mejor;
  }
  function jugar(eq, idx, x, y) {
    const id = B.mano[eq][idx], c = NC.MAPA[id];
    if (!c || B.fin || B.cuenta > 0) return false;
    if (B.plasma[eq] < c.coste) { if (!eq) { Son.sinPlasma(); avisoPlasma(); } return false; }
    if (!zonaValida(eq, id, x, y)) return false;
    B.plasma[eq] -= c.coste;
    const nivel = B.niveles[eq][id] || 1;
    if (c.tipo === 'hechizo') lanzarHechizo(eq, c, x, y, nivel);
    else { crearTropa(id, eq, x, y, nivel); fxDespliegue(x, y, eq, c); if (!eq) Son.despliega(c.coste); }
    siguienteCarta(eq, idx);
    if (!eq) { B.jugadas++; pintaMano(); const tu = $('#bTuto', dom); if (tu) tu.classList.add('oculto'); }
    else textoFlotante(x, y - 1.5, c.nom, '#ff8aa0', 1.4);
    return true;
  }

  /* ---------------- hechizos ---------------- */
  function lanzarHechizo(eq, c, x, y, nivel) {
    const dmg = Math.round(c.dmg * NC.multNivel(nivel));
    if (c.id === 'meteoro') {
      for (let k = 0; k < 7; k++) { const a = Math.random() * 7, d = Math.random() * c.radioArea * 0.8; B.proy.push({ tipo: 'meteoro', eq, x: x + Math.cos(a) * d + 5, y: y + Math.sin(a) * d - 9, tx: x + Math.cos(a) * d, ty: y + Math.sin(a) * d, vel: 16, dmg: 0, retraso: k * 0.07, rastro: [] }); }
      B.zonas.push({ tipo: 'impacto', eq, x, y, r: c.radioArea, dmg, torre: c.torre, t: 0, en: 0.62, c });
      Son.meteoros();
    } else if (c.id === 'misil') {
      const rey = posTorres(eq).rey;
      B.proy.push({ tipo: 'misil', eq, x: rey.x, y: rey.y + (eq ? 1 : -1), sx: rey.x, sy: rey.y, tx: x, ty: y, vel: 11, dmg, area: c.radioArea, torre: c.torre, empuje: c.empuje, rastro: [], arco: 1 });
      Son.misil();
    } else if (c.id === 'emp') {
      areaDanio(eq, x, y, c.radioArea, dmg, c.torre, { aturde: c.aturde });
      fxEmp(x, y, c.radioArea); Son.emp(); B.flash = 0.25;
    } else if (c.id === 'agujero') {
      B.zonas.push({ tipo: 'agujero', eq, x, y, r: c.radioArea, dps: dmg, torre: c.torre, t: 0, dura: c.dura });
      Son.agujero();
    }
    if (eq) textoFlotante(x, y - 1.5, c.nom, '#ff8aa0', 1.4);
  }
  function areaDanio(eq, x, y, r, dmg, factorTorre, o) {
    o = o || {};
    for (const e of B.ent) {
      if (e.eq === eq || e.hp <= 0) continue;
      if (o.soloObj === 'tierra' && e.vuela) continue;
      if (Math.hypot(e.x - x, e.y - y) > r + e.r * 0.6) continue;
      danar(e, e.tipo === 'torre' ? Math.round(dmg * (factorTorre || 1)) : dmg, eq);
      if (o.aturde && e.tipo !== 'torre') { e.stun = Math.max(e.stun, o.aturde); e.cd = Math.max(e.cd, 0.4); }
      if (o.empuje && e.tipo === 'tropa') { const a = Math.atan2(e.y - y, e.x - x); e.x = clamp(e.x + Math.cos(a) * o.empuje, 0.4, AN - 0.4); e.y = clamp(e.y + Math.sin(a) * o.empuje, 0.4, AL - 0.4); }
    }
  }

  /* ---------------- daño y muerte ---------------- */
  function danar(e, d, deEq) {
    if (e.hp <= 0 || d <= 0) return;
    e.hp -= d; e.golpe = 0.12;
    if (e.tipo === 'torre') { if (e.torre === 'rey' && !e.activa) { e.activa = true; textoFlotante(e.x, e.y - 2.6, '¡ACTIVADA!', e.eq ? '#ff8aa0' : '#7dffb0', 1.2); } }
    if (e.hp <= 0) morir(e, deEq);
  }
  function morir(e, deEq) {
    e.hp = 0;
    if (e.tipo === 'torre') {
      const rival = 1 - e.eq;
      B.coronas[rival] += e.torre === 'rey' ? 3 - B.coronas[rival] : 1;
      if (e.torre !== 'rey') { const rey = torre(e.eq, 'rey'); if (rey) rey.activa = true; }
      fxExplosion(e.x, e.y, 3.2, e.eq, true); B.temblor = 0.9; B.flash = 0.35;
      Son.torreCae(e.torre === 'rey'); Son.corona(rival === 0);
      animaCorona(rival);
      if (e.torre === 'rey') { B.coronas[rival] = 3; acabar(); }
      else if (B.prorroga) acabar();
      return;
    }
    if (e.c && e.c.muerte) { areaDanio(e.eq, e.x, e.y, 3, Math.round(e.c.muerte * NC.multNivel(e.nivel)), 1); fxExplosion(e.x, e.y, 3, e.eq, true); B.temblor = 0.6; Son.explosion(1.5); }
    else { fxMuerte(e); }
  }

  /* ---------------- objetivos y movimiento ---------------- */
  function puedeAtacar(a, b) {
    if (b.hp <= 0 || b.eq === a.eq) return false;
    if (a.obj === 'edificios') return b.tipo === 'torre' || b.tipo === 'edificio';
    if (a.obj === 'tierra' && b.vuela) return false;
    return true;
  }
  function buscarObjetivo(a) {
    let mejor = null, md = 1e9;
    const vista = a.tipo === 'torre' ? a.rango : a.tipo === 'edificio' ? a.rango : Math.max(5.5, a.rango + 1);
    for (const b of B.ent) {
      if (!puedeAtacar(a, b) || (b.desp > 0.6 && b.tipo !== 'torre')) continue;
      const d = dist(a, b) - b.r;
      if (a.obj === 'edificios' || d <= vista) { if (d < md) { md = d; mejor = b; } }
    }
    if (mejor || a.tipo !== 'tropa') return mejor;
    // sin nada cerca: a por la torre más cercana del rival
    for (const b of B.ent) { if (b.eq === a.eq || b.hp <= 0 || b.tipo !== 'torre') continue; const d = dist(a, b); if (d < md) { md = d; mejor = b; } }
    return mejor;
  }
  function enRio(y) { return y > RIO0 && y < RIO1; }
  function destino(u, tx, ty) {
    if (u.vuela || u.c.salta) return [tx, ty];
    const arriba = u.y < 16, arribaT = ty < 16;
    if (enRio(u.y) || (u.y >= RIO0 - 0.35 && u.y <= RIO1 + 0.35 && PUENTES.some(p => Math.abs(u.x - p) < 0.7))) {
      const bx = PUENTES.reduce((a, b) => Math.abs(u.x - a) < Math.abs(u.x - b) ? a : b);
      if (arriba === arribaT && !enRio(u.y)) return [tx, ty];
      return [bx, arribaT ? RIO0 - 0.45 : RIO1 + 0.45];
    }
    if (arriba === arribaT) return [tx, ty];
    const bx = PUENTES.reduce((a, b) => (Math.abs(u.x - a) + Math.abs(a - tx)) <= (Math.abs(u.x - b) + Math.abs(b - tx)) ? a : b);
    return [bx, arriba ? RIO0 - 0.3 : RIO1 + 0.3];
  }
  function mover(u, tx, ty, dt) {
    const [dx0, dy0] = destino(u, tx, ty);
    let dx = dx0 - u.x, dy = dy0 - u.y; const d = Math.hypot(dx, dy); if (d < 0.01) return;
    let v = u.vel * (u.slow > 0 ? (u.slowF || 0.65) : 1) * (u.cargado && u.c.carga ? 1.25 : 1);
    const paso = Math.min(d, v * dt);
    u.x += dx / d * paso; u.y += dy / d * paso;
    if (Math.abs(dx) > 0.05) u.dir = dx > 0 ? 1 : -1;
    u.ang = Math.atan2(dy, dx);
    u.andando = true;
  }

  /* ---------------- ataque ---------------- */
  function atacar(a, b) {
    a.anim = 0.25;
    let dmg = a.dmg;
    if (a.cargado && a.c && a.c.carga) { dmg *= 2; a.cargado = false; textoFlotante(b.x, b.y - 1.6, '¡SUPERSÓNICO!', '#ffe14d', 1); B.temblor = Math.max(B.temblor, 0.35); }
    const id = a.tipo === 'torre' ? 'torre' : a.id;
    if (a.tipo === 'torre') {
      B.proy.push({ tipo: 'laser', eq: a.eq, x: a.x, y: geoTorre(a).canon, tx: b.x, ty: b.y, obj: b, vel: 20, dmg, rastro: [], col: Arte.EQ[a.eq].b, grueso: a.torre === 'rey' ? 1.4 : 1 });
      Son.laser(a.torre !== 'rey');
      return;
    }
    if (a.rango <= 1.6 && !a.vuela || a.id === 'superlucas') {   // cuerpo a cuerpo
      danar(b, dmg, a.eq); fxGolpe(b.x, b.y, a.eq, a.id === 'mecha' || a.id === 'tanque' || a.id === 'coloso');
      if (a.id === 'mecha') Son.corte(); else if (a.id === 'tanque' || a.id === 'coloso') Son.impacto(1.3); else Son.golpeMetal();
      if (a.id === 'superlucas') fxSupersonico(a, b);
      return;
    }
    if (a.id === 'dragon') { B.proy.push({ tipo: 'fuego', eq: a.eq, x: a.x + a.dir * 0.8, y: a.y - 1.6, tx: b.x, ty: b.y, obj: b, vel: 9, dmg, area: a.c.area, rastro: [] }); Son.fuego(); return; }
    if (a.id === 'gamer') { cadena(a, b, dmg); Son.rayo(); return; }
    if (a.id === 'comandante') { B.proy.push({ tipo: 'laser', eq: a.eq, x: a.x + a.dir * 0.6, y: a.y - 1.2, tx: b.x, ty: b.y, obj: b, vel: 22, dmg, rastro: [], col: Arte.EQ[a.eq].a, grueso: 1.3 }); Son.blaster(); return; }
    if (a.id === 'drones') { B.proy.push({ tipo: 'laser', eq: a.eq, x: a.x, y: a.y - 1.4, tx: b.x, ty: b.y, obj: b, vel: 18, dmg, rastro: [], col: Arte.EQ[a.eq].a, grueso: 0.6 }); Son.laser(true); return; }
    if (a.tipo === 'edificio') { B.proy.push({ tipo: 'laser', eq: a.eq, x: a.x, y: a.y - 0.9, tx: b.x, ty: b.y, obj: b, vel: 20, dmg, rastro: [], col: Arte.EQ[a.eq].b, grueso: 1 }); Son.laser(); return; }
    B.proy.push({ tipo: 'laser', eq: a.eq, x: a.x + a.dir * 0.9, y: a.y - 0.9, tx: b.x, ty: b.y, obj: b, vel: 20, dmg, rastro: [], col: Arte.EQ[a.eq].b, grueso: 0.9 });
    Son.laser();
  }
  function cadena(a, b, dmg) {
    const tocados = [b]; let ult = b;
    for (let k = 0; k < (a.c.cadena || 0); k++) {
      let sig = null, md = 3.2;
      for (const e of B.ent) { if (tocados.indexOf(e) >= 0 || !puedeAtacar(a, e)) continue; const d = dist(ult, e); if (d < md) { md = d; sig = e; } }
      if (!sig) break; tocados.push(sig); ult = sig;
    }
    let px = a.x + a.dir * 0.5, py = a.y - 1.2;
    tocados.forEach((e, i) => {
      danar(e, i ? Math.round(dmg * 0.7) : dmg, a.eq);
      if (e.tipo !== 'torre') { e.slow = 2; e.slowF = 1 - (a.c.ralentiza || 0.35); }
      B.part.push({ tipo: 'rayo', x: px, y: py, x2: e.x, y2: e.y - (e.vuela ? 1.4 : 0.6), vida: 0.22, max: 0.22, col: '#c77dff' });
      px = e.x; py = e.y - (e.vuela ? 1.4 : 0.6);
      chispas(e.x, e.y - 0.6, '#d9a8ff', 6);
    });
  }

  /* ---------------- simulación ---------------- */
  function paso(dt) {
    if (B.fin) { B.t += dt; actualizaParticulas(dt); return; }
    if (B.cuenta > 0) { const antes = Math.ceil(B.cuenta); B.cuenta -= dt; const ahora = Math.ceil(B.cuenta); if (ahora !== antes && ahora > 0) Son.cuenta(1); if (B.cuenta <= 0) { Son.cuenta(0); pintaCuenta(); } actualizaParticulas(dt); return; }
    B.t += dt;
    const resta = (B.prorroga ? DURACION + PRORROGA : DURACION) - B.t;
    const doble = B.prorroga || resta <= 60;
    if (doble && !B.avisoDoble) { B.avisoDoble = true; anuncio('¡PLASMA x2!', '#ff7bf2'); Son.urgente(true); }
    for (let eq = 0; eq < 2; eq++) B.plasma[eq] = Math.min(10, B.plasma[eq] + dt / RECARGA * (doble ? 2 : 1));
    if (B.plasma[0] >= 10) Son.plasmaLleno();
    if (resta <= 0) {
      if (!B.prorroga && B.coronas[0] === B.coronas[1]) { B.prorroga = true; anuncio('PRÓRROGA', '#ffe14d', 'La primera corona gana'); Son.prorroga(); }
      else { acabar(); return; }
    }
    // entidades
    for (const e of B.ent) {
      if (e.hp <= 0) continue;
      e.t += dt; e.golpe = Math.max(0, e.golpe - dt); e.anim = Math.max(0, e.anim - dt); e.slow = Math.max(0, e.slow - dt); e.andando = false;
      if (e.desp > 0) { e.desp -= dt; continue; }
      if (e.stun > 0) { e.stun -= dt; continue; }
      if (e.tipo === 'edificio') { e.hp -= e.max / e.c.vida * dt; if (e.hp <= 0) { morir(e); continue; } }
      if (e.tipo === 'torre' && !e.activa) continue;
      // invocaciones del comandante
      if (e.c && e.c.invoca) {
        e.invT -= dt;
        if (e.invT <= 0) {
          e.invT = e.c.cada;
          const mios = B.ent.filter(x => x.hp > 0 && x.padre === e.k).length;
          if (mios < 4) { const t = crearTropa('cadete', e.eq, e.x + azar(-0.8, 0.8), e.y + (e.eq ? -0.8 : 0.8), e.nivel, 0.5); t.forEach(x => x.padre = e.k); fxDespliegue(t[0].x, t[0].y, e.eq, NC.CADETE, true); }
        }
      }
      e.cd -= dt;
      // objetivo
      if (!e.obj_ || e.obj_.hp <= 0 || (e.tipo !== 'tropa' && dist(e, e.obj_) - e.obj_.r > e.rango) || (e.tipo === 'tropa' && !e.fijado && (e.reb = (e.reb || 0) - dt) <= 0)) {
        e.obj_ = buscarObjetivo(e); e.reb = 0.4; e.fijado = false;
      }
      const b = e.obj_;
      if (!b) continue;
      const d = dist(e, b) - b.r - e.r * 0.5;
      if (e.tipo === 'torre' || e.tipo === 'edificio') e.ang = Math.atan2(b.y - e.y, b.x - e.x);
      if (d <= e.rango) {
        e.fijado = true;
        if (Math.abs(b.x - e.x) > 0.1) e.dir = b.x > e.x ? 1 : -1;
        if (e.cd <= 0) { e.cd = e.hit; atacar(e, b); }
      } else if (e.tipo === 'tropa') { e.fijado = false; mover(e, b.x, b.y, dt); if (e.cd < 0.35) e.cd = 0.35; }
    }
    separar();
    // proyectiles
    for (let i = B.proy.length - 1; i >= 0; i--) {
      const p = B.proy[i];
      if (p.retraso > 0) { p.retraso -= dt; continue; }
      if (p.obj && p.obj.hp > 0) { p.tx = p.obj.x; p.ty = p.obj.y - (p.obj.vuela ? 1.3 : p.obj.tipo === 'torre' ? 1.2 : 0.5); }
      p.rastro.push([p.x, p.y]); if (p.rastro.length > (p.tipo === 'misil' ? 18 : 7)) p.rastro.shift();
      const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), v = p.vel * dt;
      if (p.tipo === 'misil') { humo(p.x, p.y); }
      if (d <= v) {
        B.proy.splice(i, 1);
        if (p.tipo === 'laser') { if (p.obj && p.obj.hp > 0) danar(p.obj, p.dmg, p.eq); chispas(p.tx, p.ty, p.col, 5); }
        else if (p.tipo === 'fuego') { areaDanio(p.eq, p.tx, p.ty + (p.obj && p.obj.vuela ? 1.3 : 0.5), p.area, p.dmg, 1); fxFuego(p.tx, p.ty, p.eq); }
        else if (p.tipo === 'misil') { areaDanio(p.eq, p.tx, p.ty, p.area, p.dmg, p.torre, { empuje: p.empuje }); fxExplosion(p.tx, p.ty, p.area, p.eq, false); B.temblor = 0.6; Son.explosion(1.3); }
        else if (p.tipo === 'meteoro') { fxExplosion(p.tx, p.ty, 1.2, 1, false, true); }
        continue;
      }
      p.x += dx / d * v; p.y += dy / d * v;
    }
    // zonas (meteoritos, agujero negro)
    for (let i = B.zonas.length - 1; i >= 0; i--) {
      const z = B.zonas[i]; z.t += dt;
      if (z.tipo === 'impacto' && z.t >= z.en) { areaDanio(z.eq, z.x, z.y, z.r, z.dmg, z.torre); B.temblor = 0.5; B.zonas.splice(i, 1); continue; }
      if (z.tipo === 'agujero') {
        if (Math.random() < 0.9) for (let k = 0; k < 2; k++) { const a = Math.random() * 7, r = z.r * azar(0.7, 1.2); B.part.push({ tipo: 'espiral', cx: z.x, cy: z.y, a, r, vida: 1, max: 1, col: Math.random() < 0.5 ? '#ffb45a' : '#c77dff', tam: azar(0.06, 0.14) }); }
        for (const e of B.ent) {
          if (e.eq === z.eq || e.hp <= 0) continue;
          const d = Math.hypot(e.x - z.x, e.y - z.y); if (d > z.r + e.r * 0.5) continue;
          danar(e, z.dps * dt * (e.tipo === 'torre' ? z.torre : 1), z.eq);
          if (e.tipo === 'tropa' && d > 0.2) { const f = Math.min(d, 1.3 * dt); e.x -= (e.x - z.x) / d * f; e.y -= (e.y - z.y) / d * f; e.slow = Math.max(e.slow, 0.2); e.slowF = 0.5; }
        }
        if (z.t >= z.dura) { B.zonas.splice(i, 1); fxExplosion(z.x, z.y, 1.4, z.eq, false); }
      }
    }
    // limpieza
    B.ent = B.ent.filter(e => e.hp > 0 || (e.tipo === 'torre'));
    actualizaParticulas(dt);
    ia(dt);
  }
  function separar() {
    const lista = B.ent.filter(e => e.hp > 0 && e.tipo !== 'torre');
    for (let i = 0; i < lista.length; i++) {
      const a = lista[i];
      for (let j = i + 1; j < lista.length; j++) {
        const b = lista[j]; if (a.vuela !== b.vuela) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, min = (a.r + b.r) * 0.85;
        if (d >= min) continue;
        const sol = min - d, ma = a.tipo === 'edificio' ? 1e9 : a.max, mb = b.tipo === 'edificio' ? 1e9 : b.max, fa = mb / (ma + mb), fb = ma / (ma + mb);
        a.x -= dx / d * sol * fa; a.y -= dy / d * sol * fa; b.x += dx / d * sol * fb; b.y += dy / d * sol * fb;
      }
      // torres sólidas para las tropas de tierra
      if (!a.vuela && a.tipo === 'tropa') for (const t of B.ent) {
        if (t.tipo !== 'torre' || t.hp <= 0) continue; const dx = a.x - t.x, dy = a.y - t.y, d = Math.hypot(dx, dy) || 0.01, min = t.r + a.r * 0.6;
        if (d < min) { a.x = t.x + dx / d * min; a.y = t.y + dy / d * min; }
      }
      // río: solo se cruza por los puentes
      if (!a.vuela && !(a.c && a.c.salta) && enRio(a.y)) {
        const bx = PUENTES.reduce((p, q) => Math.abs(a.x - p) < Math.abs(a.x - q) ? p : q);
        if (Math.abs(a.x - bx) > 0.85) a.x = bx + Math.sign(a.x - bx) * 0.85;
      }
      a.x = clamp(a.x, 0.35, AN - 0.35); a.y = clamp(a.y, 0.35, AL - 0.35);
    }
  }
  function acabar() {
    if (B.fin) return;
    const c = B.coronas; B.fin = { res: c[0] > c[1] ? 'gana' : c[0] < c[1] ? 'pierde' : 'empate', t: B.t };
    Son.urgente(false);
    setTimeout(() => finPantalla(), B.coronas[0] === 3 || B.coronas[1] === 3 ? 1800 : 900);
  }

  /* ---------------- IA del rival ---------------- */
  function ia(dt) {
    const I = B.ia, listo = opts.rival.listo || 0.5;
    I.t -= dt; if (I.t > 0) return;
    I.t = azar(0.45, 1.1) * (1.6 - listo);
    const eq = 1, pl = B.plasma[eq], mano = B.mano[eq].map((id, i) => ({ id, i, c: NC.MAPA[id] }));
    const asequibles = mano.filter(m => m.c.coste <= pl);
    if (!asequibles.length) return;
    const mias = B.ent.filter(e => e.eq === 1 && e.hp > 0 && e.tipo !== 'torre');
    const amenazas = B.ent.filter(e => e.eq === 0 && e.hp > 0 && e.tipo !== 'torre' && e.y < 20.5 && e.desp <= 0.5);
    // 1) rematar torres con hechizos
    const torresJ = B.ent.filter(e => e.eq === 0 && e.tipo === 'torre' && e.hp > 0);
    for (const m of asequibles) if (m.c.tipo === 'hechizo' && m.c.id !== 'agujero') {
      const d = Math.round(m.c.dmg * NC.multNivel(B.niveles[1][m.id]) * m.c.torre);
      const t = torresJ.find(t => t.hp <= d); if (t && Math.random() < listo + 0.2) { jugar(eq, m.i, t.x, t.y); return; }
    }
    // 2) defensa
    if (amenazas.length) {
      const fuerza = amenazas.reduce((a, e) => a + e.hp * 0.002 + e.dmg * 0.01, 0);
      const defensa = mias.filter(m => amenazas.some(a => dist(a, m) < 6)).reduce((a, e) => a + e.hp * 0.002 + e.dmg * 0.01, 0);
      if (defensa < fuerza * 1.1 || pl >= 9.5) {
        const peor = amenazas.sort((a, b) => (a.y - b.y))[0];   // la más adentrada
        // grupo de tropas débiles: hechizo de área
        const grupo = amenazas.filter(a => dist(a, peor) < 2.8);
        const hz = asequibles.find(m => m.c.tipo === 'hechizo' && (m.c.id === 'meteoro' || m.c.id === 'emp' || m.c.id === 'agujero' || m.c.id === 'misil') && grupo.length >= 3 && grupo.reduce((a, g) => a + g.hp, 0) > 400);
        if (hz && Math.random() < 0.4 + listo * 0.5) { const cx = grupo.reduce((a, g) => a + g.x, 0) / grupo.length, cy = grupo.reduce((a, g) => a + g.y, 0) / grupo.length; jugar(eq, hz.i, cx, cy - 0.5); return; }
        let opciones = asequibles.filter(m => m.c.tipo !== 'hechizo');
        if (peor.vuela) opciones = opciones.filter(m => m.c.obj === 'todo');
        if (peor.c && peor.c.obj === 'edificios') { const tb = opciones.find(m => m.c.tipo === 'edificio'); if (tb && Math.random() < listo) { const p = ajustaZona(1, tb.id, 9, 9.5); if (p) { jugar(eq, tb.i, p.x, p.y); return; } } }
        opciones.sort((a, b) => (b.c.dmg || 0) * (b.c.num || 1) / b.c.coste - (a.c.dmg || 0) * (a.c.num || 1) / a.c.coste);
        const el = Math.random() < listo ? opciones[0] : opciones[Math.floor(Math.random() * opciones.length)];
        if (el) {
          let x = peor.x + azar(-1, 1), y = peor.y - (el.c.rango > 3 ? 4 : 1.8);
          const p = ajustaZona(1, el.id, clamp(x, 1, 17), Math.min(y, RIO0 - 0.8));
          if (p) { jugar(eq, el.i, p.x, p.y); return; }
        }
      }
    }
    // 3) ataque
    if (pl >= 9 || (pl >= 6.5 && Math.random() < 0.25 * listo) || (I.empuje && pl >= 3 && I.empuje.t > B.t - 6)) {
      const tI = torre(0, 'izq'), tD = torre(0, 'der');
      let lado = I.empuje ? I.empuje.x : (!tI ? 3.5 : !tD ? 14.5 : (tI.hp <= tD.hp ? 3.5 : 14.5));
      if (!I.empuje || I.empuje.t < B.t - 8) {
        const tanque = asequibles.filter(m => m.c.obj === 'edificios').sort((a, b) => b.c.hp - a.c.hp)[0];
        const otro = asequibles.filter(m => m.c.tipo === 'tropa').sort((a, b) => b.c.hp - a.c.hp)[0];
        const el = tanque || otro; if (!el) return;
        const y = el.c.vel < 1 ? 3 : RIO0 - 1.2;
        const p = ajustaZona(1, el.id, lado + azar(-0.5, 0.5), y); if (p && jugar(eq, el.i, p.x, p.y)) I.empuje = { x: lado, t: B.t, id: el.id };
        return;
      }
      // apoyo detrás del tanque
      const lider = mias.filter(m => m.id === I.empuje.id).sort((a, b) => b.y - a.y)[0];
      const apoyo = asequibles.filter(m => m.c.tipo === 'tropa' && m.c.obj !== 'edificios').sort((a, b) => b.c.rango - a.c.rango)[0];
      if (lider && apoyo) { const p = ajustaZona(1, apoyo.id, lider.x + azar(-0.8, 0.8), Math.min(lider.y - 1.8, RIO0 - 0.8)); if (p) jugar(eq, apoyo.i, p.x, p.y); I.empuje.t = B.t - 4; }
      else if (!lider) I.empuje = null;
    }
  }

  /* ---------------- efectos ---------------- */
  function lim() { if (B.part.length > 700) B.part.splice(0, B.part.length - 700); }
  function chispas(x, y, col, n) { for (let k = 0; k < n; k++) { const a = Math.random() * 7, v = azar(2, 7); B.part.push({ tipo: 'chispa', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, vida: azar(0.2, 0.45), max: 0.45, col, tam: azar(0.06, 0.12) }); } lim(); }
  function humo(x, y) { B.part.push({ tipo: 'humo', x: x + azar(-0.1, 0.1), y: y + azar(-0.1, 0.1), vx: azar(-0.3, 0.3), vy: azar(-0.6, 0), vida: 0.9, max: 0.9, col: '#9aa6b8', tam: azar(0.25, 0.45) }); lim(); }
  function fxGolpe(x, y, eq, fuerte) { chispas(x, y - 0.6, fuerte ? '#ffffff' : Arte.EQ[eq].a, fuerte ? 12 : 6); B.part.push({ tipo: 'tajo', x, y: y - 0.6, vida: 0.18, max: 0.18, col: Arte.EQ[eq].b, a: Math.random() * 3, tam: fuerte ? 1.5 : 0.9 }); if (fuerte) B.temblor = Math.max(B.temblor, 0.2); }
  function fxSupersonico(a, b) { for (let k = 0; k < 10; k++) B.part.push({ tipo: 'chispa', x: b.x, y: b.y - 1, vx: azar(-6, 6), vy: azar(-6, 2), vida: 0.5, max: 0.5, col: '#ffe14d', tam: 0.12 }); B.part.push({ tipo: 'anillo', x: b.x, y: b.y - 0.8, r0: 0.2, r1: 1.8, vida: 0.3, max: 0.3, col: '#ffe14d', ancho: 0.15 }); }
  function fxFuego(x, y, eq) { for (let k = 0; k < 14; k++) { const a = Math.random() * 7, v = azar(0.5, 3); B.part.push({ tipo: 'llama', x: x + Math.cos(a) * 0.3, y: y + Math.sin(a) * 0.3, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, vida: azar(0.3, 0.6), max: 0.6, col: eq ? '#ff5a2a' : '#19ff6a', tam: azar(0.25, 0.5) }); } Son.impacto(0.7); lim(); }
  function fxExplosion(x, y, r, eq, grande, meteoro) {
    B.part.push({ tipo: 'destello', x, y, r: r * 1.2, vida: 0.25, max: 0.25, col: '#ffffff' });
    B.part.push({ tipo: 'anillo', x, y, r0: 0.2, r1: r * 1.3, vida: 0.45, max: 0.45, col: meteoro ? '#ff9d3c' : Arte.EQ[eq].b, ancho: 0.25 });
    const n = grande ? 60 : meteoro ? 14 : 30;
    for (let k = 0; k < n; k++) { const a = Math.random() * 7, v = azar(1, grande ? 9 : 6); B.part.push({ tipo: 'llama', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7 - 1, vida: azar(0.3, 0.8), max: 0.8, col: Math.random() < 0.5 ? '#ffb45a' : (meteoro ? '#ff5a2a' : Arte.EQ[eq].a), tam: azar(0.3, grande ? 0.9 : 0.6) }); }
    if (grande) for (let k = 0; k < 18; k++) { const a = Math.random() * 7, v = azar(3, 8); B.part.push({ tipo: 'escombro', x, y: y - 1, vx: Math.cos(a) * v, vy: -azar(4, 9), g: 16, vida: azar(0.8, 1.3), max: 1.3, col: '#8d99ad', tam: azar(0.12, 0.25), rot: Math.random() * 7 }); }
    if (!meteoro && !grande) Son.explosion(0.8);
    lim();
  }
  function fxEmp(x, y, r) {
    B.part.push({ tipo: 'anillo', x, y, r0: 0.2, r1: r * 1.2, vida: 0.4, max: 0.4, col: '#7fe9ff', ancho: 0.35 });
    B.part.push({ tipo: 'destello', x, y, r: r, vida: 0.3, max: 0.3, col: '#bff6ff' });
    for (let k = 0; k < 10; k++) { const a = Math.random() * 7; B.part.push({ tipo: 'rayo', x, y, x2: x + Math.cos(a) * r, y2: y + Math.sin(a) * r, vida: 0.3, max: 0.3, col: '#7fe9ff' }); }
  }
  function fxDespliegue(x, y, eq, c, peq) {
    B.part.push({ tipo: 'haz', x, y, vida: 0.7, max: 0.7, col: Arte.EQ[eq].a, tam: peq ? 0.6 : 1 + (c.radio || 0.5) * 0.6 });
    B.part.push({ tipo: 'anillo', x, y, r0: 0.3, r1: peq ? 1 : 2, vida: 0.5, max: 0.5, col: Arte.EQ[eq].a, ancho: 0.12, suelo: 1 });
  }
  function fxMuerte(e) {
    const col = Arte.EQ[e.eq].a;
    B.part.push({ tipo: 'destello', x: e.x, y: e.y - (e.vuela ? 1.3 : 0.5), r: e.r * 1.6, vida: 0.2, max: 0.2, col: '#fff' });
    for (let k = 0; k < 14 + e.r * 10; k++) { const a = Math.random() * 7, v = azar(1, 5); B.part.push({ tipo: 'chispa', x: e.x, y: e.y - (e.vuela ? 1.3 : 0.5), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, vida: azar(0.3, 0.7), max: 0.7, col: Math.random() < 0.5 ? col : '#fff', tam: azar(0.08, 0.16) }); }
    for (let k = 0; k < 4 + e.r * 4; k++) { const a = Math.random() * 7, v = azar(2, 5); B.part.push({ tipo: 'escombro', x: e.x, y: e.y - 0.4, vx: Math.cos(a) * v, vy: -azar(3, 6), g: 14, vida: azar(0.6, 1), max: 1, col: '#9aa6b8', tam: azar(0.08, 0.16), rot: Math.random() * 7 }); }
    Son.impacto(0.6); lim();
  }
  function textoFlotante(x, y, txt, col, vida) { B.part.push({ tipo: 'texto', x, y, txt, col, vida: vida || 1, max: vida || 1 }); }
  function actualizaParticulas(dt) {
    for (let i = B.part.length - 1; i >= 0; i--) {
      const p = B.part[i]; p.vida -= dt; if (p.vida <= 0) { B.part.splice(i, 1); continue; }
      if (p.vx != null) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy += p.g * dt; else { p.vx *= 0.92; p.vy *= 0.92; } }
      if (p.tipo === 'espiral') { p.a += dt * (2 + 3 / p.r); p.r = Math.max(0.05, p.r - dt * 0.9); }
      if (p.tipo === 'texto') p.y -= dt * 0.8;
      if (p.rot != null) p.rot += dt * 8;
    }
    B.temblor = Math.max(0, B.temblor - dt * 1.6); B.flash = Math.max(0, B.flash - dt);
  }

  /* ---------------- dibujo ---------------- */
  const X = x => OX + x * S, Y = y => OY + y * S;
  function preparaFondo() {
    const a = NC.ARENAS[B.arena] || NC.ARENAS[0];
    fondoEsp = document.createElement('canvas'); fondoEsp.width = W; fondoEsp.height = H; const x = fondoEsp.getContext('2d');
    const g = x.createRadialGradient(W * 0.5, H * 0.45, 10, W * 0.5, H * 0.5, Math.max(W, H) * 0.8); g.addColorStop(0, '#0d1433'); g.addColorStop(1, '#02030a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let k = 0; k < 3; k++) { const n = x.createRadialGradient(W * (0.15 + k * 0.4), H * (0.25 + (k % 2) * 0.5), 0, W * (0.15 + k * 0.4), H * (0.25 + (k % 2) * 0.5), Math.max(W, H) * 0.35); n.addColorStop(0, (k % 2 ? a.col2 : a.col) + '30'); n.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = n; x.fillRect(0, 0, W, H); }
    for (let k = 0; k < 260; k++) { x.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.9 + ')'; const z = Math.random() * 1.8 * dpr; x.fillRect(Math.random() * W, Math.random() * H, z, z); }
    // suelo del campo
    suelo = document.createElement('canvas'); suelo.width = Math.ceil(AN * S); suelo.height = Math.ceil(AL * S); const s = suelo.getContext('2d');
    s.save(); rrC(s, 0, 0, AN * S, AL * S, S * 0.6); s.clip();
    const gs = s.createLinearGradient(0, 0, 0, AL * S); gs.addColorStop(0, '#2a1626'); gs.addColorStop(0.47, '#161a2c'); gs.addColorStop(0.53, '#161a2c'); gs.addColorStop(1, '#122a24'); s.fillStyle = gs; s.fillRect(0, 0, AN * S, AL * S);
    // losas hexagonales
    const hx = S * 1.1;
    for (let row = 0, yy = 0; yy < AL * S + hx; row++, yy += hx * 0.866) for (let xx = (row % 2) * hx / 2; xx < AN * S + hx; xx += hx) {
      s.beginPath(); for (let k = 0; k < 6; k++) { const an = k / 6 * Math.PI * 2 + Math.PI / 6; s.lineTo(xx + Math.cos(an) * hx * 0.52, yy + Math.sin(an) * hx * 0.52); } s.closePath();
      const lado = yy < AL * S / 2 ? 1 : 0; s.fillStyle = `rgba(255,255,255,${0.025 + ((row * 7 + Math.floor(xx)) % 5) * 0.008})`; s.fill();
      s.strokeStyle = lado ? 'rgba(255,59,92,.10)' : 'rgba(25,255,106,.10)'; s.lineWidth = 1; s.stroke();
    }
    // caminos de los carriles
    [3.5, 14.5].forEach(lx => { const gl = s.createLinearGradient((lx - 1.4) * S, 0, (lx + 1.4) * S, 0); gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(0.5, 'rgba(255,255,255,.05)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); s.fillStyle = gl; s.fillRect((lx - 1.4) * S, 2 * S, 2.8 * S, 28 * S); });
    // líneas de despliegue
    s.setLineDash([S * 0.4, S * 0.3]); s.lineWidth = 2;
    s.strokeStyle = 'rgba(25,255,106,.25)'; s.beginPath(); s.moveTo(0, (RIO1 + 0.5) * S); s.lineTo(AN * S, (RIO1 + 0.5) * S); s.stroke();
    s.strokeStyle = 'rgba(255,59,92,.25)'; s.beginPath(); s.moveTo(0, (RIO0 - 0.5) * S); s.lineTo(AN * S, (RIO0 - 0.5) * S); s.stroke(); s.setLineDash([]);
    // plataformas de las torres
    [0, 1].forEach(eq => { const p = posTorres(eq); ['izq', 'der', 'rey'].forEach(n => { const r = n === 'rey' ? 2.9 : 2.2; const gp = s.createRadialGradient(p[n].x * S, p[n].y * S, 0, p[n].x * S, p[n].y * S, r * S); gp.addColorStop(0, eq ? 'rgba(255,59,92,.18)' : 'rgba(25,255,106,.18)'); gp.addColorStop(1, 'rgba(0,0,0,0)'); s.fillStyle = gp; s.beginPath(); s.arc(p[n].x * S, p[n].y * S, r * S, 0, 7); s.fill(); }); });
    s.restore();
    s.strokeStyle = 'rgba(160,190,255,.35)'; s.lineWidth = 3; rrC(s, 1.5, 1.5, AN * S - 3, AL * S - 3, S * 0.6); s.stroke();
  }
  function rrC(x, X0, Y0, w, h, r) { x.beginPath(); x.moveTo(X0 + r, Y0); x.arcTo(X0 + w, Y0, X0 + w, Y0 + h, r); x.arcTo(X0 + w, Y0 + h, X0, Y0 + h, r); x.arcTo(X0, Y0 + h, X0, Y0, r); x.arcTo(X0, Y0, X0 + w, Y0, r); x.closePath(); }
  function dibujaRio(t) {
    const a = NC.ARENAS[B.arena] || NC.ARENAS[0];
    const y0 = Y(RIO0), h = (RIO1 - RIO0) * S;
    cx.save(); cx.beginPath(); cx.rect(X(0), y0, AN * S, h); cx.clip();
    cx.fillStyle = '#02030a'; cx.fillRect(X(0), y0, AN * S, h);
    for (let k = 0; k < 40; k++) { const sx = ((k * 97.3 + t * (8 + k % 5 * 6)) % (AN + 2)) - 1, sy = RIO0 + ((k * 37.7) % 20) / 10; cx.fillStyle = `rgba(255,255,255,${0.3 + (k % 4) * 0.15})`; cx.fillRect(X(sx), Y(sy), 1.5 * dpr, 1.5 * dpr); }
    cx.globalCompositeOperation = 'lighter';
    for (let w = 0; w < 3; w++) {
      cx.beginPath(); for (let xx = 0; xx <= AN; xx += 0.25) { const yy = 16 + Math.sin(xx * 0.8 + t * (1.5 + w * 0.6) + w * 2) * 0.35 + Math.sin(xx * 2.1 - t * 2) * 0.12; xx ? cx.lineTo(X(xx), Y(yy)) : cx.moveTo(X(xx), Y(yy)); }
      cx.strokeStyle = w === 1 ? a.col2 : a.col; cx.globalAlpha = 0.45 - w * 0.1; cx.lineWidth = (3 - w) * dpr; cx.shadowColor = a.col; cx.shadowBlur = 12 * dpr; cx.stroke();
    }
    cx.shadowBlur = 0; cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
    const gb = cx.createLinearGradient(0, y0, 0, y0 + h); gb.addColorStop(0, 'rgba(0,0,0,.6)'); gb.addColorStop(0.2, 'rgba(0,0,0,0)'); gb.addColorStop(0.8, 'rgba(0,0,0,0)'); gb.addColorStop(1, 'rgba(0,0,0,.6)'); cx.fillStyle = gb; cx.fillRect(X(0), y0, AN * S, h);
    cx.restore();
    // puentes de luz
    PUENTES.forEach(bx => {
      const x0 = X(bx - 1), w = 2 * S;
      const g = cx.createLinearGradient(x0, 0, x0 + w, 0); g.addColorStop(0, 'rgba(120,200,255,.5)'); g.addColorStop(0.15, 'rgba(40,70,120,.85)'); g.addColorStop(0.85, 'rgba(40,70,120,.85)'); g.addColorStop(1, 'rgba(120,200,255,.5)');
      cx.fillStyle = g; cx.fillRect(x0, y0 - S * 0.2, w, h + S * 0.4);
      cx.save(); cx.beginPath(); cx.rect(x0, y0 - S * 0.2, w, h + S * 0.4); cx.clip(); cx.globalCompositeOperation = 'lighter';
      for (let k = -1; k < 5; k++) { const yy = y0 + ((k * 0.6 + (t * 1.2) % 0.6) * S); cx.strokeStyle = 'rgba(0,229,255,.35)'; cx.lineWidth = 2 * dpr; cx.beginPath(); cx.moveTo(x0 + S * 0.3, yy); cx.lineTo(x0 + S, yy - S * 0.25); cx.lineTo(x0 + S * 1.7, yy); cx.stroke(); }
      cx.restore();
      cx.strokeStyle = '#7fe9ff'; cx.lineWidth = 2 * dpr; cx.shadowColor = '#00e5ff'; cx.shadowBlur = 10 * dpr;
      cx.beginPath(); cx.moveTo(x0, y0 - S * 0.2); cx.lineTo(x0, y0 + h + S * 0.2); cx.moveTo(x0 + w, y0 - S * 0.2); cx.lineTo(x0 + w, y0 + h + S * 0.2); cx.stroke(); cx.shadowBlur = 0;
    });
  }
  function dibujaTorre(e, t) {
    const eq = e.eq, col = Arte.EQ[eq], px = X(e.x), py = Y(e.y), r = e.r * S, rey = e.torre === 'rey';
    if (e.hp <= 0) {   // ruinas
      cx.fillStyle = 'rgba(0,0,0,.45)'; cx.beginPath(); cx.ellipse(px, py + r * 0.3, r * 1.1, r * 0.5, 0, 0, 7); cx.fill();
      cx.fillStyle = '#2b3140'; for (let k = 0; k < 6; k++) { const a = k * 1.1 + e.k; cx.beginPath(); cx.arc(px + Math.cos(a) * r * 0.6, py + Math.sin(a) * r * 0.3, r * 0.22, 0, 7); cx.fill(); }
      cx.strokeStyle = col.a + '55'; cx.lineWidth = 2 * dpr; cx.beginPath(); cx.arc(px, py, r * 0.8, 0, 7); cx.stroke();
      return;
    }
    const ti = imgTorre(e);
    if (ti) { dibujaTorreImg(e, t, ti); return; }
    const alto = r * (rey ? 1.15 : 1.05);
    cx.fillStyle = 'rgba(0,0,0,.5)'; cx.beginPath(); cx.ellipse(px, py + r * 0.45, r * 1.15, r * 0.55, 0, 0, 7); cx.fill();
    // base hexagonal
    const hex = (cy, rx, ry) => { cx.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + Math.PI / 6; cx.lineTo(px + Math.cos(a) * rx, cy + Math.sin(a) * ry); } cx.closePath(); };
    hex(py + r * 0.25, r * 1.05, r * 0.55); cx.fillStyle = '#1a2030'; cx.fill();
    hex(py + r * 0.1, r * 1.0, r * 0.5); let g = cx.createLinearGradient(px - r, 0, px + r, 0); g.addColorStop(0, '#5b677c'); g.addColorStop(0.5, '#c9d4e4'); g.addColorStop(1, '#4b5568'); cx.fillStyle = g; cx.fill();
    // cuerpo
    g = cx.createLinearGradient(px - r * 0.7, 0, px + r * 0.7, 0); g.addColorStop(0, '#3a4456'); g.addColorStop(0.45, '#e8eef7'); g.addColorStop(1, '#3a4456');
    cx.fillStyle = g; cx.beginPath(); cx.moveTo(px - r * 0.7, py + r * 0.1); cx.lineTo(px - r * 0.55, py - alto); cx.lineTo(px + r * 0.55, py - alto); cx.lineTo(px + r * 0.7, py + r * 0.1); cx.closePath(); cx.fill();
    // franjas de energía
    const pulso = 0.6 + Math.sin(t * 3 + e.k) * 0.25 + (e.golpe > 0 ? 0.4 : 0);
    cx.save(); cx.globalCompositeOperation = 'lighter'; cx.shadowColor = col.a; cx.shadowBlur = 14 * dpr; cx.fillStyle = col.a; cx.globalAlpha = pulso;
    cx.fillRect(px - r * 0.62, py - alto * 0.35, r * 1.24, r * 0.09); cx.fillRect(px - r * 0.58, py - alto * 0.7, r * 1.16, r * 0.07); cx.restore();
    // cúpula
    g = cx.createRadialGradient(px - r * 0.2, py - alto - r * 0.15, 1, px, py - alto, r * 0.7); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#6d7b92');
    cx.fillStyle = g; cx.beginPath(); cx.ellipse(px, py - alto, r * 0.62, r * 0.38, 0, 0, 7); cx.fill();
    if (rey) {
      // Lucas (o su versión roja) sobre la nave nodriza
      const lu = eq ? Arte.rojo('img/lucas/vuela.webp') : Arte.img('img/lucas/vuela.webp');
      const lw = lu.naturalWidth || lu.width;
      if (lw && (eq ? lu.listo : true)) {
        const h = r * 1.9, w = h * (lw / (lu.naturalHeight || lu.height)), flota = Math.sin(t * 2.2 + eq) * r * 0.08;
        cx.save(); if (eq) { cx.translate(px, 0); cx.scale(-1, 1); cx.translate(-px, 0); }
        if (!e.activa) cx.globalAlpha = 0.85;
        cx.drawImage(lu, px - w / 2, py - alto - h * 0.92 + flota, w, h); cx.restore();
      }
      // corona encima
      cx.fillStyle = eq ? '#ff8aa0' : '#ffe14d'; const cyc = py - alto - r * 1.95;
      cx.save(); cx.translate(px, cyc); cx.scale(r / 26, r / 26); cx.beginPath(); cx.moveTo(-12, 4); cx.lineTo(-14, -8); cx.lineTo(-6, -2); cx.lineTo(0, -11); cx.lineTo(6, -2); cx.lineTo(14, -8); cx.lineTo(12, 4); cx.closePath(); cx.fill(); cx.restore();
    } else {
      // cañón
      cx.save(); cx.translate(px, py - alto); cx.rotate(e.ang); cx.fillStyle = '#2b3342'; cx.fillRect(0, -r * 0.13, r * 0.95, r * 0.26);
      cx.fillStyle = col.b; cx.shadowColor = col.b; cx.shadowBlur = (e.anim > 0 ? 18 : 8) * dpr; cx.beginPath(); cx.arc(r * 0.95, 0, r * (e.anim > 0 ? 0.17 : 0.12), 0, 7); cx.fill(); cx.restore();
      cx.save(); cx.shadowColor = col.a; cx.shadowBlur = 12 * dpr; cx.fillStyle = col.a; cx.beginPath(); cx.arc(px, py - alto, r * 0.18, 0, 7); cx.fill(); cx.restore();
    }
    if (e.golpe > 0) { cx.save(); cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = e.golpe * 4; cx.fillStyle = '#fff'; cx.beginPath(); cx.ellipse(px, py - alto * 0.5, r * 0.8, alto * 0.7, 0, 0, 7); cx.fill(); cx.restore(); }
    // vida
    const bw = r * (rey ? 2.4 : 2), bh = Math.max(6 * dpr, S * 0.32), bx = px - bw / 2, by = rey ? py + r * 0.75 : py - alto - r * 0.9;
    if (rey && !e.activa && e.hp === e.max) {} else {
      cx.fillStyle = 'rgba(0,0,0,.7)'; rrC(cx, bx - 2, by - 2, bw + 4, bh + 4, 4 * dpr); cx.fill();
      const f = e.hp / e.max; cx.fillStyle = eq ? (f < 0.3 ? '#ff2244' : '#ff4d6d') : (f < 0.3 ? '#ffcc00' : '#19ff6a'); rrC(cx, bx, by, Math.max(2, bw * f), bh, 3 * dpr); cx.fill();
      cx.fillStyle = 'rgba(255,255,255,.35)'; cx.fillRect(bx, by, bw * f, bh * 0.35);
      cx.font = `700 ${Math.round(bh * 0.95)}px Rajdhani, sans-serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillStyle = '#fff'; cx.fillText(Math.ceil(e.hp), px, by + bh / 2 + 1);
    }
    if (rey && !e.activa) { cx.font = `700 ${Math.round(S * 0.45)}px Orbitron, sans-serif`; cx.textAlign = 'center'; cx.fillStyle = 'rgba(255,255,255,.55)'; cx.fillText('z z z', px + r * 0.9, py - alto - r * 1.2 + Math.sin(t * 2) * 3); }
  }
  // Lucas flotando sobre la torre del rey: de espaldas en tu torre (si existe la imagen) y en rojo de frente en la del rival
  function dibujaLucasRey(e, t, px, yTop, r) {
    const eq = e.eq, esp = Arte.img('img/lucas/espalda.webp'), espOk = !eq && esp.complete && esp.naturalWidth;
    const lu = espOk ? esp : eq ? Arte.rojo('img/lucas/vuela.webp') : Arte.img('img/lucas/vuela.webp');
    const lw = lu.naturalWidth || lu.width, lh = lu.naturalHeight || lu.height;
    if (!lw || (eq && !lu.listo)) return;
    const h = r * 1.15, w = h * lw / lh, flota = Math.sin(t * 2.2 + eq) * r * 0.08;
    cx.save(); if (!e.activa) cx.globalAlpha = 0.9;
    if (eq) { cx.translate(px, 0); cx.scale(-1, 1); cx.translate(-px, 0); }
    cx.drawImage(lu, px - w / 2, yTop - h * 0.6 + flota, w, h); cx.restore();
  }
  function dibujaTorreImg(e, t, ti) {
    const eq = e.eq, px = X(e.x), py = Y(e.y), r = e.r * S, rey = e.torre === 'rey', g = geoTorre(e);
    const w = g.w * S, h = g.h * S, x0 = px - w / 2, y0 = Y(g.top);
    // sombra en el suelo
    cx.fillStyle = 'rgba(0,0,0,.5)'; cx.beginPath(); cx.ellipse(px, py + r * 0.38, r * 1.1, r * 0.45, 0, 0, 7); cx.fill();
    // retroceso al disparar
    const k = e.anim > 0 ? Math.sin(e.anim / 0.25 * Math.PI) * S * 0.06 : 0;
    cx.save(); if (rey && !e.activa) cx.globalAlpha = 0.9;
    cx.drawImage(ti, x0, y0 + k, w, h);
    if (e.golpe > 0) { cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = Math.min(1, e.golpe * 4) * 0.6; cx.drawImage(ti, x0, y0 + k, w, h); }
    cx.restore();
    if (rey) dibujaLucasRey(e, t, px, y0, r);
    // vida
    const bw = r * (rey ? 2.4 : 2), bh = Math.max(6 * dpr, S * 0.32), bx = px - bw / 2, by = rey ? py + r * 0.75 : y0 - bh - S * 0.25;
    if (!(rey && !e.activa && e.hp === e.max)) {
      cx.fillStyle = 'rgba(0,0,0,.7)'; rrC(cx, bx - 2, by - 2, bw + 4, bh + 4, 4 * dpr); cx.fill();
      const f = e.hp / e.max; cx.fillStyle = eq ? (f < 0.3 ? '#ff2244' : '#ff4d6d') : (f < 0.3 ? '#ffcc00' : '#19ff6a'); rrC(cx, bx, by, Math.max(2, bw * f), bh, 3 * dpr); cx.fill();
      cx.fillStyle = 'rgba(255,255,255,.35)'; cx.fillRect(bx, by, bw * f, bh * 0.35);
      cx.font = `700 ${Math.round(bh * 0.95)}px Rajdhani, sans-serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillStyle = '#fff'; cx.fillText(Math.ceil(e.hp), px, by + bh / 2 + 1);
    }
    if (rey && !e.activa) { cx.font = `700 ${Math.round(S * 0.45)}px Orbitron, sans-serif`; cx.textAlign = 'center'; cx.fillStyle = 'rgba(255,255,255,.6)'; cx.fillText('z z z', px + w * 0.45, y0 + h * 0.3 + Math.sin(t * 2) * 3); }
  }
  function dibujaUnidad(e, t) {
    const col = Arte.EQ[e.eq], px = X(e.x), py = Y(e.y), alto = e.vuela ? S * 1.3 + Math.sin(t * 3 + e.k) * S * 0.12 : 0;
    const tam = Math.max(1.9, e.r * (e.id === 'superlucas' || e.id === 'comandante' || e.id === 'gamer' ? 4 : 3.6)) * S;
    // sombra
    cx.fillStyle = 'rgba(0,0,0,' + (e.vuela ? 0.3 : 0.45) + ')'; cx.beginPath(); cx.ellipse(px, py + S * 0.15, e.r * S * 0.95, e.r * S * 0.42, 0, 0, 7); cx.fill();
    // aro del equipo
    cx.strokeStyle = col.a; cx.globalAlpha = 0.5; cx.lineWidth = 1.5 * dpr; cx.beginPath(); cx.ellipse(px, py + S * 0.15, e.r * S * 0.9, e.r * S * 0.38, 0, 0, 7); cx.stroke(); cx.globalAlpha = 1;
    let a = 1; if (e.desp > 0) a = clamp(1 - e.desp, 0.15, 1);
    const spE = e.tipo === 'edificio' && e.c && e.c.img ? Arte.sprite(e.id, e.eq) : null;
    if (e.tipo === 'edificio' && !(spE && spE.listo)) {
      cx.save(); cx.globalAlpha = a; const s = tam / 100 * 1.2; cx.translate(px - 50 * s, py - 72 * s); cx.scale(s, s); Arte.dibujaTorreta(cx, e.eq, e.ang); cx.restore();
    } else if (e.tipo === 'edificio') {
      // torreta ilustrada: mira hacia donde apunta y retrocede al disparar
      const tw = tam * 1.25, k = e.anim > 0 ? Math.sin(e.anim / 0.25 * Math.PI) * S * 0.08 : 0, izq = Math.cos(e.ang || 0) < 0;
      cx.save(); cx.globalAlpha = a; cx.translate(px - (izq ? -k : k), py);
      const ga = cx.createRadialGradient(0, -tw * 0.1, 0, 0, -tw * 0.1, tw * 0.5); ga.addColorStop(0, col.a + '66'); ga.addColorStop(1, 'rgba(0,0,0,0)');
      cx.save(); cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = a * (0.25 + Math.sin(t * 4 + e.k) * 0.08); cx.fillStyle = ga; cx.beginPath(); cx.arc(0, -tw * 0.1, tw * 0.5, 0, 7); cx.fill(); cx.restore();
      if (izq) cx.scale(-1, 1);
      cx.drawImage(spE, -tw / 2, -tw * 0.78, tw, tw);
      if (e.golpe > 0) { cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = e.golpe * 5; cx.drawImage(spE, -tw / 2, -tw * 0.78, tw, tw); }
      cx.restore();
    } else {
      const sp = Arte.sprite(e.id, e.eq);
      const bob = e.andando ? Math.abs(Math.sin(t * 9 + e.k)) * S * 0.12 : 0, ataque = e.anim > 0 ? Math.sin(e.anim / 0.25 * Math.PI) : 0;
      const lucas = !!(e.c && e.c.img);
      let dir = e.dir; if (lucas && e.id === 'superlucas') dir = e.dir;   // imágenes de Lucas: miran a la derecha
      cx.save(); cx.globalAlpha = a; cx.translate(px + ataque * dir * S * 0.25, py - alto - bob);
      if (e.id === 'moto' && enRio(e.y)) cx.translate(0, -S * 0.9 * Math.sin((e.y - RIO0) / (RIO1 - RIO0) * Math.PI));
      if (dir < 0) cx.scale(-1, 1);
      if (e.stun > 0) cx.rotate(Math.sin(t * 40) * 0.05);
      if (lucas) {   // aura de energía del equipo que late detrás de las tropas ilustradas
        const pul = 0.22 + Math.sin(t * 4 + e.k) * 0.08, ga = cx.createRadialGradient(0, -tam * 0.45, 0, 0, -tam * 0.45, tam * 0.55);
        ga.addColorStop(0, col.a + '88'); ga.addColorStop(1, 'rgba(0,0,0,0)');
        cx.save(); cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = pul * a; cx.fillStyle = ga; cx.beginPath(); cx.arc(0, -tam * 0.45, tam * 0.55, 0, 7); cx.fill(); cx.restore();
      }
      cx.drawImage(sp, -tam / 2, -tam * 0.92, tam, tam);
      if (e.golpe > 0) { cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = e.golpe * 5; cx.drawImage(sp, -tam / 2, -tam * 0.92, tam, tam); }
      cx.restore();
      // propulsores de los voladores
      if (e.vuela && e.id !== 'dragon') { cx.save(); cx.globalCompositeOperation = 'lighter'; const fg = cx.createRadialGradient(px, py - alto + S * 0.2, 0, px, py - alto + S * 0.2, S * 0.6); fg.addColorStop(0, col.a + 'aa'); fg.addColorStop(1, 'rgba(0,0,0,0)'); cx.fillStyle = fg; cx.beginPath(); cx.arc(px, py - alto + S * 0.2, S * 0.6, 0, 7); cx.fill(); cx.restore(); }
    }
    if (e.stun > 0) { cx.save(); cx.globalCompositeOperation = 'lighter'; cx.strokeStyle = '#7fe9ff'; cx.lineWidth = 1.5 * dpr; for (let k = 0; k < 3; k++) { const a1 = t * 6 + k * 2.1; cx.beginPath(); cx.moveTo(px + Math.cos(a1) * S * 0.6, py - alto - tam * 0.5 + Math.sin(a1) * S * 0.3); cx.lineTo(px + Math.cos(a1 + 0.6) * S * 0.9, py - alto - tam * 0.6); cx.stroke(); } cx.restore(); }
    if (e.slow > 0) { cx.strokeStyle = '#c77dff'; cx.lineWidth = 2 * dpr; cx.globalAlpha = 0.7; cx.beginPath(); cx.ellipse(px, py + S * 0.1, e.r * S * 1.1, e.r * S * 0.5, 0, 0, 7); cx.stroke(); cx.globalAlpha = 1; }
    // vida
    if (e.hp < e.max || e.desp > 0) {
      const bw = Math.max(S * 1.1, e.r * S * 1.6), bh = Math.max(4 * dpr, S * 0.18), bx = px - bw / 2, by = py - alto - tam * 0.95 - bh;
      cx.fillStyle = 'rgba(0,0,0,.7)'; cx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      cx.fillStyle = e.eq ? '#ff4d6d' : '#19ff6a'; cx.fillRect(bx, by, bw * clamp(e.hp / e.max, 0, 1), bh);
      if (e.desp > 0 || e.t < 1.6) { cx.font = `700 ${Math.round(S * 0.42)}px Orbitron`; cx.textAlign = 'right'; cx.textBaseline = 'middle'; cx.fillStyle = e.eq ? '#ff8aa0' : '#7dffb0'; cx.fillText(e.nivel, bx - 3 * dpr, by + bh / 2); }
    }
  }
  function dibujaProyectil(p) {
    if (p.retraso > 0) return;
    cx.save(); cx.globalCompositeOperation = 'lighter';
    if (p.tipo === 'laser') {
      const col = p.col; cx.strokeStyle = col; cx.shadowColor = col; cx.shadowBlur = 10 * dpr; cx.lineCap = 'round';
      cx.lineWidth = S * 0.16 * p.grueso; cx.beginPath(); const r0 = p.rastro[0] || [p.x, p.y]; cx.moveTo(X(r0[0]), Y(r0[1])); cx.lineTo(X(p.x), Y(p.y)); cx.stroke();
      cx.strokeStyle = '#fff'; cx.lineWidth = S * 0.06 * p.grueso; cx.stroke();
    } else if (p.tipo === 'fuego') {
      p.rastro.forEach((r, i) => { const f = i / p.rastro.length; cx.fillStyle = `rgba(255,${120 + f * 100},60,${f * 0.6})`; cx.beginPath(); cx.arc(X(r[0]), Y(r[1]), S * (0.2 + f * 0.25), 0, 7); cx.fill(); });
      const g = cx.createRadialGradient(X(p.x), Y(p.y), 0, X(p.x), Y(p.y), S * 0.55); g.addColorStop(0, '#fff'); g.addColorStop(0.3, p.eq ? '#ff7a2a' : '#7dffb0'); g.addColorStop(1, 'rgba(0,0,0,0)'); cx.fillStyle = g; cx.beginPath(); cx.arc(X(p.x), Y(p.y), S * 0.55, 0, 7); cx.fill();
    } else if (p.tipo === 'misil' || p.tipo === 'meteoro') {
      const lift = p.tipo === 'misil' ? Math.sin(clamp(1 - Math.hypot(p.tx - p.x, p.ty - p.y) / Math.max(1, Math.hypot(p.tx - p.sx, p.ty - p.sy)), 0, 1) * Math.PI) * S * 3 : 0;
      p.rastro.forEach((r, i) => { const f = i / p.rastro.length; cx.fillStyle = p.tipo === 'misil' ? `rgba(255,${150 + f * 80},80,${f * 0.7})` : `rgba(255,${90 + f * 120},40,${f * 0.8})`; cx.beginPath(); cx.arc(X(r[0]), Y(r[1]) - lift * f, S * (0.12 + f * 0.25), 0, 7); cx.fill(); });
      cx.globalCompositeOperation = 'source-over';
      if (p.tipo === 'meteoro') { const g = cx.createRadialGradient(X(p.x) - S * 0.1, Y(p.y) - S * 0.1, 1, X(p.x), Y(p.y), S * 0.4); g.addColorStop(0, '#ffe2a0'); g.addColorStop(0.5, '#c3602a'); g.addColorStop(1, '#4a2a22'); cx.fillStyle = g; cx.beginPath(); cx.arc(X(p.x), Y(p.y), S * 0.38, 0, 7); cx.fill(); }
      else { cx.translate(X(p.x), Y(p.y) - lift); cx.rotate(Math.atan2(p.ty - p.y, p.tx - p.x) + Math.PI / 2); cx.fillStyle = '#e8eef7'; cx.fillRect(-S * 0.13, -S * 0.5, S * 0.26, S * 0.9); cx.fillStyle = '#ff3b5c'; cx.beginPath(); cx.moveTo(-S * 0.13, -S * 0.5); cx.lineTo(0, -S * 0.8); cx.lineTo(S * 0.13, -S * 0.5); cx.fill(); }
    }
    cx.restore();
  }
  function dibujaParticula(p) {
    const f = p.vida / p.max;
    if (p.tipo === 'texto') {
      cx.save(); cx.globalAlpha = Math.min(1, f * 2); cx.font = `900 ${Math.round(S * 0.6)}px Orbitron, sans-serif`; cx.textAlign = 'center'; cx.lineWidth = 4 * dpr; cx.strokeStyle = 'rgba(0,0,0,.8)'; cx.strokeText(p.txt, X(p.x), Y(p.y)); cx.fillStyle = p.col; cx.fillText(p.txt, X(p.x), Y(p.y)); cx.restore(); return;
    }
    if (p.tipo === 'escombro' || p.tipo === 'humo') {
      cx.save(); cx.globalAlpha = f * (p.tipo === 'humo' ? 0.4 : 1); cx.fillStyle = p.col; cx.translate(X(p.x), Y(p.y));
      if (p.rot != null) { cx.rotate(p.rot); cx.fillRect(-p.tam * S, -p.tam * S * 0.6, p.tam * S * 2, p.tam * S * 1.2); } else { cx.beginPath(); cx.arc(0, 0, p.tam * S * (2 - f), 0, 7); cx.fill(); }
      cx.restore(); return;
    }
    cx.save(); cx.globalCompositeOperation = 'lighter';
    if (p.tipo === 'chispa') { cx.globalAlpha = f; cx.fillStyle = p.col; cx.beginPath(); cx.arc(X(p.x), Y(p.y), p.tam * S, 0, 7); cx.fill(); }
    else if (p.tipo === 'llama') { const r = p.tam * S * (0.5 + (1 - f)); const g = cx.createRadialGradient(X(p.x), Y(p.y), 0, X(p.x), Y(p.y), r); g.addColorStop(0, `rgba(255,255,230,${f})`); g.addColorStop(0.35, p.col); g.addColorStop(1, 'rgba(0,0,0,0)'); cx.globalAlpha = f; cx.fillStyle = g; cx.beginPath(); cx.arc(X(p.x), Y(p.y), r, 0, 7); cx.fill(); }
    else if (p.tipo === 'anillo') {
      const r = (p.r0 + (p.r1 - p.r0) * (1 - f)) * S; cx.globalAlpha = f; cx.strokeStyle = p.col; cx.lineWidth = p.ancho * S * (0.4 + f); cx.shadowColor = p.col; cx.shadowBlur = 12 * dpr;
      cx.beginPath(); cx.ellipse(X(p.x), Y(p.y), r, r * (p.suelo ? 0.45 : 0.7), 0, 0, 7); cx.stroke();
    }
    else if (p.tipo === 'destello') { const r = p.r * S; const g = cx.createRadialGradient(X(p.x), Y(p.y), 0, X(p.x), Y(p.y), r); g.addColorStop(0, `rgba(255,255,255,${f})`); g.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = g; cx.beginPath(); cx.arc(X(p.x), Y(p.y), r, 0, 7); cx.fill(); }
    else if (p.tipo === 'tajo') { cx.globalAlpha = f; cx.strokeStyle = p.col; cx.lineWidth = S * 0.18 * f; cx.shadowColor = p.col; cx.shadowBlur = 10 * dpr; cx.beginPath(); cx.arc(X(p.x), Y(p.y), p.tam * S, p.a, p.a + 2.2); cx.stroke(); }
    else if (p.tipo === 'rayo') {
      cx.globalAlpha = f; cx.strokeStyle = p.col; cx.lineWidth = 2.2 * dpr; cx.shadowColor = p.col; cx.shadowBlur = 14 * dpr; cx.beginPath(); cx.moveTo(X(p.x), Y(p.y));
      for (let k = 1; k < 6; k++) { const q = k / 6; cx.lineTo(X(p.x + (p.x2 - p.x) * q + azar(-0.3, 0.3)), Y(p.y + (p.y2 - p.y) * q + azar(-0.3, 0.3))); } cx.lineTo(X(p.x2), Y(p.y2)); cx.stroke();
      cx.strokeStyle = '#fff'; cx.lineWidth = 1 * dpr; cx.stroke();
    }
    else if (p.tipo === 'haz') {
      const w = p.tam * S, h = S * 9, x0 = X(p.x), y0 = Y(p.y); const g = cx.createLinearGradient(x0 - w, 0, x0 + w, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, p.col); g.addColorStop(1, 'rgba(0,0,0,0)');
      cx.globalAlpha = Math.sin(f * Math.PI) * 0.8; cx.fillStyle = g; cx.fillRect(x0 - w, y0 - h, w * 2, h); cx.fillStyle = '#fff'; cx.globalAlpha *= 0.6; cx.fillRect(x0 - w * 0.12, y0 - h, w * 0.24, h);
    }
    else if (p.tipo === 'espiral') { const x = p.cx + Math.cos(p.a) * p.r, y = p.cy + Math.sin(p.a) * p.r * 0.6; cx.globalAlpha = Math.min(1, f * 1.5); cx.fillStyle = p.col; cx.beginPath(); cx.arc(X(x), Y(y), p.tam * S, 0, 7); cx.fill(); }
    cx.restore();
  }
  function dibujaZona(z, t) {
    if (z.tipo === 'impacto') { const f = z.t / z.en; cx.save(); cx.strokeStyle = 'rgba(255,140,60,' + (0.3 + f * 0.5) + ')'; cx.lineWidth = 2 * dpr; cx.setLineDash([6 * dpr, 6 * dpr]); cx.beginPath(); cx.ellipse(X(z.x), Y(z.y), z.r * S, z.r * S * 0.75, 0, 0, 7); cx.stroke(); cx.restore(); return; }
    if (z.tipo === 'agujero') {
      const f = Math.min(1, z.t * 3, (z.dura - z.t) * 3), r = z.r * S * f;
      cx.save(); cx.translate(X(z.x), Y(z.y));
      const g = cx.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.25, 'rgba(0,0,0,.95)'); g.addColorStop(0.32, 'rgba(255,190,110,.9)'); g.addColorStop(0.45, 'rgba(199,125,255,.35)'); g.addColorStop(1, 'rgba(60,0,90,0)');
      cx.fillStyle = g; cx.beginPath(); cx.ellipse(0, 0, r, r * 0.7, 0, 0, 7); cx.fill();
      cx.globalCompositeOperation = 'lighter'; cx.rotate(t * 2.5);
      for (let k = 0; k < 4; k++) { cx.rotate(Math.PI / 2); cx.strokeStyle = k % 2 ? 'rgba(255,180,90,.55)' : 'rgba(199,125,255,.55)'; cx.lineWidth = 3 * dpr; cx.beginPath(); for (let q = 0; q < 1; q += 0.05) { const rr = r * (0.25 + q * 0.75), aa = q * 3; q ? cx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr * 0.7) : cx.moveTo(Math.cos(aa) * rr, Math.sin(aa) * rr * 0.7); } cx.stroke(); }
      cx.restore();
    }
  }
  function dibujaFantasma() {
    if (!raton || (seleccion < 0 && !arrastre)) return;
    const idx = arrastre ? arrastre.idx : seleccion, id = B.mano[0][idx], c = NC.MAPA[id]; if (!c) return;
    const p = aCampo(raton.x, raton.y); if (!p) return;
    // zonas prohibidas
    if (c.tipo !== 'hechizo') {
      cx.save(); cx.fillStyle = 'rgba(255,40,60,.16)';
      const izqC = !torre(1, 'izq'), derC = !torre(1, 'der');
      cx.fillRect(X(0), Y(0), AN / 2 * S, ((izqC ? 10.5 : RIO1 + 0.5)) * S); cx.fillRect(X(AN / 2), Y(0), AN / 2 * S, ((derC ? 10.5 : RIO1 + 0.5)) * S);
      if (izqC) cx.fillRect(X(0), Y(RIO0 - 0.2), AN / 2 * S, (RIO1 + 0.7 - RIO0) * S); if (derC) cx.fillRect(X(AN / 2), Y(RIO0 - 0.2), AN / 2 * S, (RIO1 + 0.7 - RIO0) * S);
      cx.restore();
    }
    const ok = zonaValida(0, id, p.x, p.y);
    cx.save();
    if (c.tipo === 'hechizo') {
      cx.strokeStyle = ok ? '#7fe9ff' : '#ff4d6d'; cx.fillStyle = ok ? 'rgba(0,229,255,.12)' : 'rgba(255,77,109,.12)'; cx.lineWidth = 2.5 * dpr;
      cx.beginPath(); cx.ellipse(X(p.x), Y(p.y), c.radioArea * S, c.radioArea * S * 0.75, 0, 0, 7); cx.fill(); cx.stroke();
    } else {
      if (c.rango > 2) { cx.strokeStyle = 'rgba(255,255,255,.35)'; cx.setLineDash([5 * dpr, 5 * dpr]); cx.lineWidth = 1.5 * dpr; cx.beginPath(); cx.ellipse(X(p.x), Y(p.y), c.rango * S, c.rango * S * 0.8, 0, 0, 7); cx.stroke(); cx.setLineDash([]); }
      cx.globalAlpha = 0.55; const sp = Arte.sprite(id, 0), tam = Math.max(1.9, c.radio * 3.6) * S * (c.tipo === 'edificio' ? 1.2 : 1);
      const n = c.num || 1; for (let k = 0; k < n; k++) { const a = n > 1 ? k / n * Math.PI * 2 : 0, d = n > 1 ? 0.7 : 0; cx.drawImage(sp, X(p.x + Math.cos(a) * d) - tam / 2, Y(p.y + Math.sin(a) * d) - tam * 0.92 - (c.vuela ? S * 1.3 : 0), tam, tam); }
      cx.globalAlpha = 1; cx.strokeStyle = ok ? '#19ff6a' : '#ff4d6d'; cx.lineWidth = 2 * dpr; cx.beginPath(); cx.ellipse(X(p.x), Y(p.y), S * 0.9, S * 0.4, 0, 0, 7); cx.stroke();
    }
    cx.restore();
  }
  function dibujar(t) {
    const tx = B.temblor > 0 ? azar(-1, 1) * B.temblor * S * 0.35 : 0, ty = B.temblor > 0 ? azar(-1, 1) * B.temblor * S * 0.35 : 0;
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.drawImage(fondoEsp, 0, 0);
    cx.save(); cx.translate(tx, ty);
    cx.drawImage(suelo, OX, OY);
    dibujaRio(t);
    B.zonas.forEach(z => dibujaZona(z, t));
    dibujaFantasma();
    const orden = B.ent.slice().sort((a, b) => (a.y + (a.vuela ? 3 : 0)) - (b.y + (b.vuela ? 3 : 0)));
    orden.forEach(e => e.tipo === 'torre' ? dibujaTorre(e, t) : (e.hp > 0 && dibujaUnidad(e, t)));
    B.proy.forEach(dibujaProyectil);
    B.part.forEach(dibujaParticula);
    cx.restore();
    if (B.flash > 0) { cx.fillStyle = `rgba(255,255,255,${B.flash * 0.6})`; cx.fillRect(0, 0, W, H); }
    // viñeta
    if (B.t > DURACION - 10 && !B.fin && !B.prorroga || (B.prorroga && !B.fin)) { const v = 0.18 + Math.sin(t * 6) * 0.08; const g = cx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(255,0,60,${v})`); cx.fillStyle = g; cx.fillRect(0, 0, W, H); }
  }

  /* ---------------- bucle ---------------- */
  function bucle(now) {
    if (!corriendo) return;
    raf = requestAnimationFrame(bucle);
    let d = (now - ultimo) / 1000; ultimo = now; if (d > 0.25) d = 0.25;
    if (!pausado) { acum += d * VEL; while (acum >= DT) { paso(DT); acum -= DT; } }
    dibujar(now / 1000);
    pintaHud();
  }

  /* ---------------- DOM / HUD ---------------- */
  let dom = null, manoEls = [];
  function montarDom() {
    dom = document.getElementById('batalla');
    dom.innerHTML = `<canvas id="bcv"></canvas>
      <div class="bTop">
        <div class="bRival"><div class="bNom"><span class="bNiv">${opts.rival.nivel}</span><b>${esc(opts.rival.nombre)}</b></div><div class="bTrof">${Arte.IC.trofeo}${opts.rival.trofeos}<div class="bCor rojo" id="bCorR"></div></div></div>
        <div class="bReloj" id="bReloj"><small>TIEMPO</small><b>3:00</b></div>
      </div>
      <button class="bRendir" id="bRendir" aria-label="Rendirse"><svg viewBox="0 0 24 24"><path d="M5 21V4M5 4h11l-2 4 2 4H5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button>
      <div class="bAnuncio" id="bAnuncio"></div>
      <div class="bCuenta" id="bCuenta"></div>
      <div class="bBottom">
        <div class="bCor verde" id="bCorV"></div>
        <div class="bMano">
          <div class="bSig"><small>SIGUIENTE</small><div class="bSigC" id="bSig"></div></div>
          <div class="bCartas" id="bCartas"></div>
        </div>
        <div class="bPlasma"><div class="bPlasmaIc">${Arte.IC.plasma}<b id="bPlN">5</b></div><div class="bPlBar" id="bPlBar">${'<i></i>'.repeat(10)}<span id="bPlFill"></span></div></div>
      </div>
      <div class="bTuto oculto" id="bTuto"><div class="mano">👆</div><p>Arrastra una carta al campo para desplegarla</p></div>
      <div class="bFin oculto" id="bFin"></div>`;
    dom.classList.remove('oculto');
    cv = $('#bcv', dom); cx = cv.getContext('2d');
    redimensionar();
    pintaMano(); pintaCoronas(); pintaCuenta();
    $('#bRendir', dom).onclick = () => { if (B.fin) return; pausado = true; confirmar('¿Rendirte?', 'Perderás la batalla y los trofeos.', 'Rendirse', 'rojo').then(ok => { pausado = false; if (ok) { B.rendido = true; B.coronas[1] = 3; acabar(); } }); };
    cv.addEventListener('pointerdown', tocaCampo);
    addEventListener('pointermove', muevePuntero, { passive: false });
    addEventListener('pointerup', sueltaPuntero);
    addEventListener('resize', redimensionar);
    if (!ld('tutoBat', false)) { $('#bTuto', dom).classList.remove('oculto'); setTimeout(() => { const tu = $('#bTuto', dom); if (tu) tu.classList.add('oculto'); }, 9000); }
  }
  function ld(k, d) { try { const v = localStorage.getItem('nc_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function sv(k, v) { try { localStorage.setItem('nc_' + k, JSON.stringify(v)); } catch (e) {} }
  function redimensionar() {
    if (!dom) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = dom.clientWidth, h = dom.clientHeight;
    W = Math.round(w * dpr); H = Math.round(h * dpr); cv.width = W; cv.height = H; cv.style.width = w + 'px'; cv.style.height = h + 'px';
    const arriba = 54, abajo = Math.min(170, Math.max(132, w * 0.36)), extra = 2.6;   // extra: hueco para Lucas sobre la nave rival
    const aw = w - 12, ah = h - arriba - abajo;
    const s = Math.min(aw / AN, ah / (AL + extra));
    S = s * dpr; OX = Math.round((W - AN * S) / 2); OY = Math.round((arriba + extra * s + (ah - (AL + extra) * s) / 2) * dpr);
    dom.style.setProperty('--campoW', Math.round(AN * s) + 'px');
    preparaFondo();
  }
  function aCampo(cxp, cyp) { const r = cv.getBoundingClientRect(); const x = ((cxp - r.left) * dpr - OX) / S, y = ((cyp - r.top) * dpr - OY) / S; return { x, y }; }
  function pintaMano() {
    const cont = $('#bCartas', dom); if (!cont) return;
    if (!manoEls.length || manoEls[0].parentNode !== cont) {
      cont.innerHTML = ''; manoEls = [];
      for (let i = 0; i < 4; i++) {
        const el = document.createElement('div'); el.className = 'bCarta'; el.dataset.i = i;
        el.addEventListener('pointerdown', ev => cogeCarta(ev, i));
        cont.appendChild(el); manoEls.push(el);
      }
    }
    B.mano[0].forEach((id, i) => {
      const el = manoEls[i]; if (el.dataset.id === id) return;
      el.dataset.id = id; el.innerHTML = cartaMini(id, B.niveles[0][id]); el.classList.remove('entra'); void el.offsetWidth; el.classList.add('entra');
    });
    const sig = B.mazo[0][0]; $('#bSig', dom).innerHTML = cartaMini(sig, B.niveles[0][sig], true);
    manoEls.forEach((el, i) => el.classList.toggle('sel', i === seleccion));
  }
  function cartaMini(id, nivel, peq) {
    const c = NC.MAPA[id]; if (!c) return '';
    const a = Arte.arteCarta(id); if (!a.src) a.listo.then(() => { if (dom) { manoEls.forEach(el => { if (el.dataset.id === id) el.querySelector('img').src = a.src; }); const s = $('#bSig img', dom); if (s && B.mazo[0][0] === id) s.src = a.src; } });
    return `<div class="cm r-${c.rar}"><img src="${a.src || ''}" alt=""><span class="cmCoste">${c.coste}</span>${peq ? '' : `<span class="cmNiv">Nv ${nivel || 1}</span>`}</div>`;
  }
  function cogeCarta(ev, i) {
    ev.preventDefault(); if (B.fin || B.cuenta > 0) return;
    Son.init(); Son.cogeCarta();
    arrastre = { idx: i, x0: ev.clientX, y0: ev.clientY, movido: false }; raton = { x: ev.clientX, y: ev.clientY };
    seleccion = i; pintaMano();
    $('#bTuto', dom).classList.add('oculto');
  }
  function muevePuntero(ev) {
    if (!dom || dom.classList.contains('oculto')) return;
    raton = { x: ev.clientX, y: ev.clientY };
    if (arrastre) { if (Math.hypot(ev.clientX - arrastre.x0, ev.clientY - arrastre.y0) > 12) { arrastre.movido = true; manoEls[arrastre.idx].classList.add('arrastra'); } ev.preventDefault(); }
  }
  function sueltaPuntero(ev) {
    if (!arrastre) return;
    const a = arrastre; arrastre = null; manoEls[a.idx] && manoEls[a.idx].classList.remove('arrastra');
    if (!a.movido) return;   // fue un toque: queda seleccionada
    const p = aCampo(ev.clientX, ev.clientY);
    if (p.x >= 0 && p.x <= AN && p.y >= 0 && p.y <= AL) {
      const id = B.mano[0][a.idx], q = ajustaZona(0, id, p.x, p.y);
      if (q && Math.hypot(q.x - p.x, q.y - p.y) < 2.5 && jugar(0, a.idx, q.x, q.y)) { seleccion = -1; sv('tutoBat', true); }
    }
    raton = null; pintaMano();
  }
  function tocaCampo(ev) {
    if (seleccion < 0 || arrastre) return;
    const p = aCampo(ev.clientX, ev.clientY), id = B.mano[0][seleccion], q = ajustaZona(0, id, p.x, p.y);
    if (q && Math.hypot(q.x - p.x, q.y - p.y) < 2.5 && jugar(0, seleccion, q.x, q.y)) { seleccion = -1; raton = null; sv('tutoBat', true); pintaMano(); }
  }
  let hudCache = {};
  function pintaHud() {
    if (!dom || !B) return;
    const pl = B.plasma[0], n = Math.floor(pl);
    if (hudCache.pl !== n) { hudCache.pl = n; $('#bPlN', dom).textContent = n; manoEls.forEach((el, i) => { const c = NC.MAPA[B.mano[0][i]]; el.classList.toggle('cara', c && c.coste > n); }); }
    $('#bPlFill', dom).style.width = (pl * 10) + '%';
    const total = (B.prorroga ? DURACION + PRORROGA : DURACION), resta = Math.max(0, Math.ceil(total - B.t));
    const txt = Math.floor(resta / 60) + ':' + String(resta % 60).padStart(2, '0');
    if (hudCache.t !== txt) { hudCache.t = txt; const r = $('#bReloj', dom); r.querySelector('b').textContent = txt; r.querySelector('small').textContent = B.prorroga ? 'PRÓRROGA' : (B.t >= DURACION - 60 ? 'PLASMA x2' : 'TIEMPO'); r.classList.toggle('urge', resta <= 10 || B.prorroga); if (resta <= 10 && resta > 0 && !B.fin && B.cuenta <= 0) Son.tic(); }
    const cc = B.coronas.join(); if (hudCache.c !== cc) { hudCache.c = cc; pintaCoronas(); }
  }
  function pintaCoronas() {
    const f = (n, rojo) => [0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}">${Arte.IC.corona}</i>`).join('');
    $('#bCorV', dom).innerHTML = f(B.coronas[0]); $('#bCorR', dom).innerHTML = f(B.coronas[1], 1);
  }
  function animaCorona(eq) {
    const el = $(eq ? '#bCorR' : '#bCorV', dom); if (!el) return;
    setTimeout(() => { const i = el.querySelectorAll('i')[Math.min(2, B.coronas[eq] - 1)]; if (i) { i.classList.remove('pop'); void i.offsetWidth; i.classList.add('pop'); } }, 50);
    anuncio(eq ? '¡TORRE PERDIDA!' : '¡TORRE DESTRUIDA!', eq ? '#ff4d6d' : '#19ff6a');
  }
  function pintaCuenta() {
    const el = $('#bCuenta', dom); if (!el) return;
    if (B.cuenta > 0) { el.innerHTML = `<b>¡PREPÁRATE!</b><small>VS ${esc(opts.rival.nombre)}</small>`; el.className = 'bCuenta on'; }
    else { el.innerHTML = '<b>¡BATALLA!</b>'; el.className = 'bCuenta on fuera'; setTimeout(() => el.className = 'bCuenta', 900); }
  }
  let anT = 0;
  function anuncio(txt, col, sub) {
    const el = $('#bAnuncio', dom); if (!el) return;
    el.innerHTML = `<b>${esc(txt)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`; el.style.setProperty('--ac', col || '#fff');
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); clearTimeout(anT); anT = setTimeout(() => el.classList.remove('on'), 2200);
  }
  let avT = 0;
  function avisoPlasma() { const b = $('#bPlBar', dom); b.classList.remove('falta'); void b.offsetWidth; b.classList.add('falta'); clearTimeout(avT); avT = setTimeout(() => b.classList.remove('falta'), 500); }
  function finPantalla() {
    const r = B.fin.res, el = $('#bFin', dom);
    if (r === 'gana') Son.victoria(); else if (r === 'pierde') Son.derrota(); else Son.cuenta(0);
    Son.modo('');
    const img = r === 'gana' ? 'celebra' : r === 'pierde' ? 'caido' : 'duda';
    el.innerHTML = `<div class="bfCaja ${r}">
      <div class="bfRayos"></div>
      <img class="bfLucas" src="img/lucas/${img}.webp" alt="">
      <h1>${r === 'gana' ? '¡VICTORIA!' : r === 'pierde' ? 'DERROTA' : 'EMPATE'}</h1>
      <div class="bfMarcador"><div class="bfLado yo"><small>${esc(opts.yoNombre || 'Tú')}</small><div class="bfCor">${[0, 1, 2].map(i => `<i class="${i < B.coronas[0] ? 'on' : ''}" style="--d:${i * 0.25 + 0.4}s">${Arte.IC.corona}</i>`).join('')}</div></div>
      <span class="bfVs">VS</span><div class="bfLado el"><small>${esc(opts.rival.nombre)}</small><div class="bfCor rojo">${[0, 1, 2].map(i => `<i class="${i < B.coronas[1] ? 'on' : ''}" style="--d:${i * 0.25 + 0.4}s">${Arte.IC.corona}</i>`).join('')}</div></div></div>
      <div class="bfPremios" id="bfPremios"><div class="spin"></div></div>
      <button class="btn grande verde" id="bfOk" disabled>CONTINUAR</button></div>`;
    el.classList.remove('oculto');
    const fin = { coronas: B.coronas[0], coronasRival: B.coronas[1], rendido: !!B.rendido, res: r, jugadas: B.jugadas };
    Promise.resolve(opts.alTerminar(fin)).then(premio => {
      const p = $('#bfPremios', el); if (!p) return;
      if (!premio || !premio.ok) { p.innerHTML = `<p class="nota">${esc(premio && premio.error || 'No se pudo guardar el resultado')}</p>`; }
      else {
        p.innerHTML = `<div class="prem trof ${premio.trofeos >= 0 ? 'mas' : 'menos'}">${Arte.IC.trofeo}<b>${premio.trofeos >= 0 ? '+' : ''}${premio.trofeos}</b></div>
          ${premio.cred ? `<div class="prem">${Arte.IC.cred}<b>+${premio.cred}</b></div>` : ''}
          ${premio.cofre ? `<div class="prem cap">${Arte.capsula(premio.cofre)}<small>${NC.COFRES[premio.cofre].nom}</small></div>` : (r === 'gana' ? '<div class="prem"><small>Huecos de cápsula llenos</small></div>' : '')}`;
        if (premio.cred) Son.moneda();
      }
      const b = $('#bfOk', el); b.disabled = false; b.onclick = () => cerrar(premio);
    });
  }
  function cerrar(premio) {
    corriendo = false; cancelAnimationFrame(raf);
    removeEventListener('pointermove', muevePuntero); removeEventListener('pointerup', sueltaPuntero); removeEventListener('resize', redimensionar);
    dom.classList.add('oculto'); dom.innerHTML = ''; manoEls = []; hudCache = {}; seleccion = -1; arrastre = null; raton = null;
    Son.modo('menu');
    if (opts.alCerrar) opts.alCerrar(premio);
  }
  document.addEventListener('visibilitychange', () => { if (corriendo && B && !B.fin) pausado = document.hidden; ultimo = performance.now(); });
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  return { iniciar, get activa() { return corriendo; }, _B: () => B, _vel: v => VEL = v, _jugar: (i, x, y) => jugar(0, i, x, y) };
})();
