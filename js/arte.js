/* =========================================================
   NEXTCARD · arte procedural (tropas, cartas, cápsulas, iconos)
   Cuando Manu pase imágenes, basta con poner «img» en la carta (js/datos.js)
   ========================================================= */
'use strict';
const Arte = (() => {
  const EQ = [{ a: '#19ff6a', b: '#00e5ff', o: '#0a3d22' }, { a: '#ff3b5c', b: '#ff9d3c', o: '#4a0c18' }];
  const IMGS = {};
  function img(src) {
    if (IMGS[src]) return IMGS[src];
    const i = new Image(); i.crossOrigin = 'anonymous'; i.src = src; IMGS[src] = i;
    i.listo = new Promise(r => { i.onload = () => r(i); i.onerror = () => r(null); });
    return i;
  }
  // Lucas en rojo (versión rival): pasa los verdes a rojo
  const ROJOS = {};
  function rojo(src) {
    if (ROJOS[src]) return ROJOS[src];
    const i = img(src), c = document.createElement('canvas'); ROJOS[src] = c; c.listo = false;
    i.listo.then(im => {
      if (!im) return; c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
      try {
        const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
        for (let k = 0; k < p.length; k += 4) { const r = p[k], g = p[k + 1], b = p[k + 2]; if (g > r + 18 && g > b) { p[k] = g; p[k + 1] = r * 0.5; p[k + 2] = b * 0.4; } }
        x.putImageData(d, 0, 0);
      } catch (e) {}
      c.listo = true;
    });
    return c;
  }
  function lg(x, x0, y0, x1, y1, stops) { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => g.addColorStop(s[0], s[1])); return g; }
  function rg(x, cx, cy, r0, r1, stops) { const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1); stops.forEach(s => g.addColorStop(s[0], s[1])); return g; }
  function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
  function brillo(x, col, b) { x.shadowColor = col; x.shadowBlur = b; }
  function sinBrillo(x) { x.shadowBlur = 0; }
  const METAL = x => lg(x, 0, 20, 0, 90, [[0, '#f4f8ff'], [0.45, '#b9c6d8'], [1, '#5d6b80']]);
  const OSCURO = x => lg(x, 0, 20, 0, 90, [[0, '#4b5568'], [1, '#161b26']]);

  /* --- tropas: se dibujan en una caja de 100 x 100, con los pies en y≈88 --- */
  const D = {
    dron(x, e) {
      x.fillStyle = rg(x, 50, 74, 2, 24, [[0, e.a], [1, 'rgba(0,0,0,0)']]); x.globalAlpha = 0.7; x.beginPath(); x.ellipse(50, 74, 22, 9, 0, 0, 7); x.fill(); x.globalAlpha = 1;
      x.fillStyle = OSCURO(x); x.beginPath(); x.ellipse(50, 58, 38, 13, 0, 0, 7); x.fill();
      x.fillStyle = METAL(x); x.beginPath(); x.ellipse(50, 54, 38, 12, 0, 0, 7); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 1.5; x.beginPath(); x.ellipse(50, 52, 30, 7, 0, Math.PI, 0); x.stroke();
      brillo(x, e.a, 10); x.fillStyle = e.a; for (let k = -3; k <= 3; k++) { x.beginPath(); x.arc(50 + k * 10, 58 + Math.abs(k) * -0.6, 2.4, 0, 7); x.fill(); }
      sinBrillo(x); x.fillStyle = lg(x, 0, 30, 0, 52, [[0, '#ffffff'], [1, '#8da2bd']]); x.beginPath(); x.ellipse(50, 50, 17, 16, 0, Math.PI, 0); x.fill();
      x.fillStyle = '#121826'; x.beginPath(); x.ellipse(50, 44, 11, 7, 0, 0, 7); x.fill();
      brillo(x, e.a, 14); x.fillStyle = e.a; x.beginPath(); x.ellipse(50, 44, 6, 4.5, 0, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(48, 43, 1.6, 0, 7); x.fill(); sinBrillo(x);
    },
    cadete(x, e) {
      x.fillStyle = OSCURO(x); rr(x, 37, 66, 10, 22, 4); x.fill(); rr(x, 53, 66, 10, 22, 4); x.fill();
      x.fillStyle = METAL(x); rr(x, 30, 40, 40, 32, 12); x.fill();
      x.fillStyle = e.a; brillo(x, e.a, 8); rr(x, 34, 56, 32, 5, 2.5); x.fill(); sinBrillo(x);
      x.fillStyle = '#2a3242'; rr(x, 42, 46, 16, 7, 3); x.fill(); x.fillStyle = e.b; x.beginPath(); x.arc(50, 49.5, 2, 0, 7); x.fill();
      x.fillStyle = METAL(x); x.beginPath(); x.arc(50, 30, 16, 0, 7); x.fill();
      x.fillStyle = '#121826'; rr(x, 38, 24, 24, 11, 5.5); x.fill();
      brillo(x, e.a, 12); x.fillStyle = e.a; rr(x, 41, 27, 18, 5, 2.5); x.fill(); sinBrillo(x);
      x.strokeStyle = '#8e9bb0'; x.lineWidth = 2; x.beginPath(); x.moveTo(58, 16); x.lineTo(62, 8); x.stroke(); brillo(x, e.a, 8); x.fillStyle = e.a; x.beginPath(); x.arc(62, 8, 2.5, 0, 7); x.fill(); sinBrillo(x);
      // porra de iones
      x.save(); x.translate(74, 58); x.rotate(-0.6); x.fillStyle = '#3a4456'; rr(x, -3, -4, 6, 14, 2); x.fill();
      brillo(x, e.b, 14); x.fillStyle = e.b; rr(x, -3.5, -24, 7, 21, 3.5); x.fill(); x.fillStyle = '#fff'; rr(x, -1.2, -21, 2.4, 15, 1.2); x.fill(); x.restore(); sinBrillo(x);
      x.fillStyle = METAL(x); x.beginPath(); x.arc(72, 60, 5, 0, 7); x.fill(); x.beginPath(); x.arc(28, 58, 5, 0, 7); x.fill();
    },
    tirador(x, e) {
      x.fillStyle = OSCURO(x); rr(x, 38, 64, 9, 24, 4); x.fill(); rr(x, 53, 64, 9, 24, 4); x.fill();
      x.fillStyle = lg(x, 0, 36, 0, 70, [[0, '#2e3a4f'], [1, '#121826']]); rr(x, 32, 36, 36, 32, 10); x.fill();
      x.strokeStyle = e.a; x.lineWidth = 2; brillo(x, e.a, 6); x.beginPath(); x.moveTo(36, 44); x.lineTo(64, 44); x.stroke(); sinBrillo(x);
      x.fillStyle = METAL(x); x.beginPath(); x.moveTo(34, 22); x.quadraticCurveTo(50, 6, 66, 22); x.lineTo(64, 36); x.lineTo(36, 36); x.closePath(); x.fill();
      x.fillStyle = '#0b0f18'; rr(x, 37, 23, 26, 9, 4); x.fill(); brillo(x, e.a, 12); x.fillStyle = e.a; rr(x, 44, 25.5, 14, 4, 2); x.fill(); sinBrillo(x);
      // rifle largo
      x.fillStyle = '#596479'; rr(x, 22, 50, 62, 7, 3); x.fill(); x.fillStyle = '#2b3342'; rr(x, 30, 52, 20, 10, 2); x.fill();
      x.fillStyle = '#8d99ad'; rr(x, 50, 46, 14, 4, 2); x.fill();
      brillo(x, e.b, 14); x.fillStyle = e.b; rr(x, 80, 51, 10, 5, 2.5); x.fill(); x.beginPath(); x.arc(91, 53.5, 3, 0, 7); x.fill(); sinBrillo(x);
    },
    torreta(x, e, ang) {
      x.fillStyle = OSCURO(x); x.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + Math.PI / 6; x.lineTo(50 + Math.cos(a) * 40, 70 + Math.sin(a) * 20); } x.closePath(); x.fill();
      x.fillStyle = METAL(x); x.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + Math.PI / 6; x.lineTo(50 + Math.cos(a) * 34, 64 + Math.sin(a) * 16); } x.closePath(); x.fill();
      brillo(x, e.a, 10); x.strokeStyle = e.a; x.lineWidth = 2.5; x.beginPath(); x.ellipse(50, 64, 22, 10, 0, 0, 7); x.stroke(); sinBrillo(x);
      x.save(); x.translate(50, 50); x.rotate(ang || 0);
      x.fillStyle = '#3c4659'; rr(x, 4, -5, 34, 10, 4); x.fill(); x.fillStyle = '#1b2130'; rr(x, 30, -6, 8, 12, 3); x.fill();
      brillo(x, e.b, 12); x.fillStyle = e.b; x.beginPath(); x.arc(39, 0, 3, 0, 7); x.fill(); sinBrillo(x);
      x.restore();
      x.fillStyle = lg(x, 0, 34, 0, 66, [[0, '#ffffff'], [1, '#7c8aa0']]); x.beginPath(); x.arc(50, 50, 15, 0, 7); x.fill();
      brillo(x, e.a, 16); x.fillStyle = rg(x, 50, 50, 1, 9, [[0, '#fff'], [0.4, e.a], [1, e.o]]); x.beginPath(); x.arc(50, 50, 8, 0, 7); x.fill(); sinBrillo(x);
    },
    tanque(x, e) {
      x.fillStyle = '#141924'; rr(x, 6, 66, 88, 20, 10); x.fill();
      x.fillStyle = '#2b3342'; for (let k = 0; k < 7; k++) { x.beginPath(); x.arc(16 + k * 11.3, 76, 5, 0, 7); x.fill(); }
      x.strokeStyle = e.a; x.lineWidth = 2; brillo(x, e.a, 8); x.beginPath(); x.moveTo(12, 86); x.lineTo(88, 86); x.stroke(); sinBrillo(x);
      x.fillStyle = METAL(x); x.beginPath(); x.moveTo(10, 66); x.lineTo(18, 42); x.lineTo(82, 42); x.lineTo(92, 66); x.closePath(); x.fill();
      x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(14, 58, 74, 8);
      x.fillStyle = e.a; brillo(x, e.a, 10); rr(x, 22, 50, 12, 4, 2); x.fill(); rr(x, 66, 50, 12, 4, 2); x.fill(); sinBrillo(x);
      x.fillStyle = '#4a556b'; rr(x, 52, 30, 44, 9, 4); x.fill(); x.fillStyle = '#20283a'; rr(x, 90, 29, 8, 11, 3); x.fill();
      x.fillStyle = lg(x, 0, 18, 0, 46, [[0, '#ffffff'], [1, '#8696ad']]); x.beginPath(); x.ellipse(46, 42, 24, 20, 0, Math.PI, 0); x.fill();
      x.fillStyle = '#0d121c'; x.beginPath(); x.ellipse(46, 34, 14, 7, 0, 0, 7); x.fill();
      brillo(x, e.a, 14); x.fillStyle = e.a; x.beginPath(); x.ellipse(46, 34, 9, 4, 0, 0, 7); x.fill(); sinBrillo(x);
    },
    mecha(x, e) {
      x.fillStyle = OSCURO(x); x.beginPath(); x.moveTo(32, 60); x.lineTo(22, 88); x.lineTo(36, 88); x.lineTo(44, 62); x.fill(); x.beginPath(); x.moveTo(56, 62); x.lineTo(64, 88); x.lineTo(78, 88); x.lineTo(68, 60); x.fill();
      x.fillStyle = METAL(x); x.beginPath(); x.moveTo(26, 36); x.lineTo(74, 36); x.lineTo(68, 66); x.lineTo(32, 66); x.closePath(); x.fill();
      brillo(x, e.a, 16); x.fillStyle = rg(x, 50, 50, 1, 9, [[0, '#fff'], [0.5, e.a], [1, e.o]]); x.beginPath(); x.arc(50, 50, 7, 0, 7); x.fill(); sinBrillo(x);
      x.fillStyle = '#2a3242'; rr(x, 38, 18, 24, 18, 6); x.fill(); brillo(x, e.a, 12); x.fillStyle = e.a; x.fillRect(42, 25, 16, 3); sinBrillo(x);
      x.fillStyle = METAL(x); x.beginPath(); x.arc(24, 40, 9, 0, 7); x.fill(); x.beginPath(); x.arc(76, 40, 9, 0, 7); x.fill();
      // hoja de plasma
      x.save(); x.translate(84, 50); x.rotate(-0.35); x.fillStyle = '#3a4456'; rr(x, -5, -6, 10, 18, 3); x.fill();
      brillo(x, e.b, 20); x.fillStyle = lg(x, 0, -48, 0, -4, [[0, '#ffffff'], [0.3, e.b], [1, e.a]]); x.beginPath(); x.moveTo(-6, -6); x.lineTo(0, -52); x.lineTo(6, -6); x.closePath(); x.fill(); x.restore(); sinBrillo(x);
    },
    moto(x, e) {
      brillo(x, e.a, 18); x.fillStyle = e.a; x.globalAlpha = 0.6; rr(x, 14, 80, 72, 5, 2.5); x.fill(); x.globalAlpha = 1; sinBrillo(x);
      x.fillStyle = OSCURO(x); x.beginPath(); x.moveTo(8, 72); x.lineTo(24, 58); x.lineTo(76, 56); x.lineTo(96, 66); x.lineTo(88, 78); x.lineTo(14, 80); x.closePath(); x.fill();
      x.fillStyle = METAL(x); x.beginPath(); x.moveTo(30, 58); x.lineTo(76, 56); x.lineTo(92, 66); x.lineTo(40, 68); x.closePath(); x.fill();
      x.strokeStyle = e.a; x.lineWidth = 2; brillo(x, e.a, 8); x.beginPath(); x.moveTo(40, 68); x.lineTo(90, 67); x.stroke(); sinBrillo(x);
      brillo(x, e.b, 16); x.fillStyle = e.b; x.beginPath(); x.ellipse(6, 72, 6, 4, 0, 0, 7); x.fill(); sinBrillo(x);
      // piloto
      x.fillStyle = '#2b3342'; rr(x, 38, 34, 20, 24, 8); x.fill();
      x.fillStyle = METAL(x); x.beginPath(); x.arc(52, 28, 11, 0, 7); x.fill(); x.fillStyle = '#0d121c'; rr(x, 50, 23, 13, 8, 4); x.fill();
      brillo(x, e.a, 10); x.fillStyle = e.a; rr(x, 53, 25, 9, 4, 2); x.fill(); sinBrillo(x);
      x.strokeStyle = '#8d99ad'; x.lineWidth = 3; x.beginPath(); x.moveTo(56, 44); x.lineTo(72, 50); x.stroke();
    },
    dragon(x, e) {
      // ala trasera
      x.fillStyle = e.o; x.beginPath(); x.moveTo(44, 46); x.lineTo(20, 8); x.lineTo(30, 30); x.lineTo(8, 26); x.lineTo(30, 52); x.closePath(); x.fill();
      x.fillStyle = OSCURO(x); x.beginPath(); x.moveTo(20, 60); x.quadraticCurveTo(-4, 70, 6, 86); x.quadraticCurveTo(12, 72, 30, 70); x.fill();
      x.fillStyle = METAL(x); x.beginPath(); x.ellipse(44, 62, 24, 15, -0.15, 0, 7); x.fill();
      x.fillStyle = 'rgba(0,0,0,.25)'; for (let k = 0; k < 4; k++) { x.beginPath(); x.ellipse(32 + k * 8, 70, 3, 5, 0, 0, 7); x.fill(); }
      x.strokeStyle = METAL(x); x.lineWidth = 11; x.lineCap = 'round'; x.beginPath(); x.moveTo(58, 56); x.quadraticCurveTo(70, 40, 72, 30); x.stroke(); x.lineCap = 'butt';
      x.fillStyle = METAL(x); x.beginPath(); x.moveTo(62, 22); x.lineTo(94, 30); x.lineTo(88, 38); x.lineTo(66, 40); x.closePath(); x.fill();
      x.fillStyle = '#2b3342'; x.beginPath(); x.moveTo(66, 22); x.lineTo(60, 10); x.lineTo(72, 22); x.fill(); x.beginPath(); x.moveTo(72, 22); x.lineTo(70, 8); x.lineTo(78, 24); x.fill();
      brillo(x, e.a, 12); x.fillStyle = e.a; x.beginPath(); x.ellipse(76, 28, 3.5, 2.4, 0.2, 0, 7); x.fill();
      x.fillStyle = e.b; x.globalAlpha = 0.85; x.beginPath(); x.moveTo(90, 34); x.lineTo(98, 33); x.lineTo(90, 37); x.fill(); x.globalAlpha = 1; sinBrillo(x);
      // ala delantera
      x.fillStyle = lg(x, 30, 0, 60, 50, [[0, e.a], [1, e.o]]); x.globalAlpha = 0.85; x.beginPath(); x.moveTo(44, 54); x.lineTo(56, 4); x.lineTo(60, 26); x.lineTo(76, 16); x.lineTo(56, 58); x.closePath(); x.fill(); x.globalAlpha = 1;
      x.strokeStyle = '#d8e2f0'; x.lineWidth = 2; x.beginPath(); x.moveTo(44, 54); x.lineTo(56, 4); x.lineTo(60, 26); x.lineTo(76, 16); x.stroke();
      x.fillStyle = OSCURO(x); rr(x, 34, 72, 6, 14, 3); x.fill(); rr(x, 50, 72, 6, 14, 3); x.fill();
    },
    coloso(x, e) {
      const piedra = lg(x, 0, 10, 0, 95, [[0, '#6b6378'], [1, '#2a2533']]);
      x.fillStyle = piedra; x.beginPath(); x.moveTo(26, 62); x.lineTo(20, 90); x.lineTo(42, 90); x.lineTo(44, 64); x.fill(); x.beginPath(); x.moveTo(56, 64); x.lineTo(58, 90); x.lineTo(80, 90); x.lineTo(74, 62); x.fill();
      x.beginPath(); x.moveTo(18, 28); x.lineTo(82, 26); x.lineTo(90, 52); x.lineTo(76, 70); x.lineTo(24, 70); x.lineTo(10, 50); x.closePath(); x.fill();
      x.beginPath(); x.moveTo(6, 32); x.lineTo(20, 28); x.lineTo(16, 70); x.lineTo(2, 64); x.closePath(); x.fill(); x.beginPath(); x.moveTo(94, 32); x.lineTo(80, 28); x.lineTo(84, 70); x.lineTo(98, 64); x.closePath(); x.fill();
      x.beginPath(); x.moveTo(36, 26); x.lineTo(40, 10); x.lineTo(62, 10); x.lineTo(64, 26); x.closePath(); x.fill();
      brillo(x, e.a, 14); x.strokeStyle = e.a; x.lineWidth = 2.5; x.lineJoin = 'round';
      [[30, 34, 38, 48, 32, 60], [70, 32, 62, 46, 70, 58], [10, 40, 14, 54], [90, 40, 86, 56], [26, 74, 32, 88], [74, 74, 68, 88]].forEach(l => { x.beginPath(); x.moveTo(l[0], l[1]); for (let k = 2; k < l.length; k += 2) x.lineTo(l[k], l[k + 1]); x.stroke(); });
      x.fillStyle = rg(x, 50, 46, 1, 13, [[0, '#fff'], [0.35, e.b], [0.7, e.a], [1, 'rgba(0,0,0,0)']]); x.beginPath(); x.arc(50, 46, 13, 0, 7); x.fill();
      x.fillStyle = e.a; x.fillRect(42, 16, 6, 3); x.fillRect(53, 16, 6, 3); sinBrillo(x);
    }
  };
  D.drones = D.dron; D.cadetes = D.cadete;

  /* sprites cacheados por (carta, equipo) */
  const CACHE = {};
  const TAM = 128;
  function sprite(id, eq) {
    const k = id + '|' + eq; if (CACHE[k]) return CACHE[k];
    const c = document.createElement('canvas'); c.width = c.height = TAM; const x = c.getContext('2d');
    const carta = NC.MAPA[id] || (id === 'cadete' ? NC.CADETE : null);
    const imgSrc = carta && carta.img;
    if (imgSrc) {
      // imagen de Lucas (o la que ponga Manu): se dibuja cuando carga
      c.listo = false;
      const fuente = eq ? rojo(imgSrc) : img(imgSrc);
      const pinta = () => {
        const w = fuente.naturalWidth || fuente.width, h = fuente.naturalHeight || fuente.height; if (!w) return;
        const s = Math.min(TAM / w, TAM / h) * 0.98; x.clearRect(0, 0, TAM, TAM); x.drawImage(fuente, (TAM - w * s) / 2, TAM - h * s - 2, w * s, h * s); c.listo = true;
      };
      if (eq) { const t = setInterval(() => { if (fuente.listo) { clearInterval(t); pinta(); } }, 100); } else fuente.listo.then(pinta);
    } else {
      const f = D[id === 'cadete' ? 'cadete' : id] || D.cadete;
      x.scale(TAM / 100, TAM / 100); f(x, EQ[eq], eq ? Math.PI : 0); c.listo = true;
    }
    CACHE[k] = c; return c;
  }
  function dibujaTorreta(x, eq, ang) { D.torreta(x, EQ[eq], ang); }

  /* --- arte de las cartas (240 x 300) --- */
  const ARTE = {};
  function fondoCarta(x, W, H, col, semilla) {
    x.fillStyle = rg(x, W / 2, H * 0.45, 10, H * 0.8, [[0, col + '66'], [0.5, '#0d1430'], [1, '#04050c']]); x.fillRect(0, 0, W, H);
    let s = semilla || 7; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let k = 0; k < 70; k++) { x.fillStyle = 'rgba(255,255,255,' + (0.2 + r() * 0.8) + ')'; const z = r() * 1.6; x.fillRect(r() * W, r() * H, z, z); }
    x.globalAlpha = 0.18; x.strokeStyle = col; x.lineWidth = 1;
    for (let k = -H; k < W; k += 22) { x.beginPath(); x.moveTo(k, H); x.lineTo(k + H * 0.6, 0); x.stroke(); }
    x.globalAlpha = 1;
  }
  const HECHIZOS = {
    meteoro(x, W, H) {
      for (let k = 0; k < 4; k++) {
        const cx = 50 + k * 50 + (k % 2) * 10, cy = 90 + k * 45 + (k % 2) * 30, r = 16 + (k % 3) * 6;
        x.save(); x.translate(cx, cy); x.rotate(-0.7);
        const g = x.createLinearGradient(0, 0, 0, -140); g.addColorStop(0, 'rgba(255,200,80,.95)'); g.addColorStop(0.3, 'rgba(255,90,40,.6)'); g.addColorStop(1, 'rgba(255,40,40,0)');
        x.fillStyle = g; x.beginPath(); x.moveTo(-r, 0); x.lineTo(0, -140); x.lineTo(r, 0); x.fill(); x.restore();
        brillo(x, '#ff7a2a', 25); x.fillStyle = rg(x, cx - 4, cy - 4, 2, r, [[0, '#ffe2a0'], [0.4, '#c3602a'], [1, '#4a2a22']]); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); sinBrillo(x);
      }
    },
    misil(x, W, H) {
      x.save(); x.translate(W / 2, H / 2 + 10); x.rotate(-0.8);
      const g = x.createLinearGradient(0, 60, 0, 190); g.addColorStop(0, 'rgba(255,240,180,1)'); g.addColorStop(0.2, 'rgba(255,120,40,.8)'); g.addColorStop(1, 'rgba(120,120,140,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(-16, 60); x.quadraticCurveTo(0, 220, 16, 60); x.fill();
      x.fillStyle = lg(x, -18, 0, 18, 0, [[0, '#7c8aa0'], [0.5, '#ffffff'], [1, '#5d6b80']]); rr(x, -16, -70, 32, 132, 14); x.fill();
      x.fillStyle = '#ff3b5c'; x.beginPath(); x.moveTo(-16, -50); x.quadraticCurveTo(0, -110, 16, -50); x.fill();
      x.fillStyle = '#2b3342'; x.beginPath(); x.moveTo(-16, 30); x.lineTo(-34, 66); x.lineTo(-16, 60); x.fill(); x.beginPath(); x.moveTo(16, 30); x.lineTo(34, 66); x.lineTo(16, 60); x.fill();
      brillo(x, '#00e5ff', 12); x.fillStyle = '#00e5ff'; x.fillRect(-16, -10, 32, 5); sinBrillo(x); x.restore();
    },
    emp(x, W, H) {
      const cx = W / 2, cy = H / 2;
      x.fillStyle = rg(x, cx, cy, 4, 110, [[0, '#ffffff'], [0.15, '#7fe9ff'], [0.4, 'rgba(0,140,255,.45)'], [1, 'rgba(0,0,0,0)']]); x.beginPath(); x.arc(cx, cy, 110, 0, 7); x.fill();
      brillo(x, '#00e5ff', 14); x.strokeStyle = '#e8fbff'; x.lineWidth = 2.5;
      for (let k = 0; k < 9; k++) { let a = k / 9 * Math.PI * 2, px = cx, py = cy; x.beginPath(); x.moveTo(px, py); for (let j = 1; j <= 6; j++) { px = cx + Math.cos(a) * j * 16 + Math.sin(j * 3 + k) * 8; py = cy + Math.sin(a) * j * 16 + Math.cos(j * 2 + k) * 8; x.lineTo(px, py); } x.stroke(); }
      sinBrillo(x); x.strokeStyle = 'rgba(127,233,255,.7)'; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, 70, 0, 7); x.stroke();
    },
    agujero(x, W, H) {
      const cx = W / 2, cy = H / 2;
      x.save(); x.translate(cx, cy); x.scale(1, 0.42);
      for (let k = 0; k < 4; k++) { x.strokeStyle = ['#ff9d3c', '#ffd27a', '#c77dff', '#ff4dc4'][k]; x.globalAlpha = 0.75; x.lineWidth = 10 - k * 2; brillo(x, x.strokeStyle, 18); x.beginPath(); x.arc(0, 0, 70 + k * 14, 0, 7); x.stroke(); }
      x.restore(); sinBrillo(x); x.globalAlpha = 1;
      x.fillStyle = rg(x, cx, cy, 10, 52, [[0, '#000'], [0.75, '#000'], [0.9, 'rgba(255,200,120,.9)'], [1, 'rgba(0,0,0,0)']]); x.beginPath(); x.arc(cx, cy, 52, 0, 7); x.fill();
      x.save(); x.beginPath(); x.rect(0, 0, W, cy); x.clip(); x.translate(cx, cy); x.scale(1, 0.42); x.strokeStyle = '#ffd27a'; x.lineWidth = 6; x.globalAlpha = 0.8; brillo(x, '#ff9d3c', 16); x.beginPath(); x.arc(0, 0, 76, Math.PI, 0); x.stroke(); x.restore(); sinBrillo(x); x.globalAlpha = 1;
    }
  };
  function arteCarta(id) {
    if (ARTE[id]) return ARTE[id];
    const c = NC.MAPA[id], W = 240, H = 300, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
    const col = NC.RAREZAS[c.rar].col;
    fondoCarta(x, W, H, c.rar === 'l' ? '#19ff6a' : c.tipo === 'hechizo' ? '#00a2ff' : col, id.length * 13 + id.charCodeAt(0));
    const res = { src: '', listo: null };
    const fin = () => { x.fillStyle = lg(x, 0, H * 0.7, 0, H, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.65)']]); x.fillRect(0, 0, W, H); res.src = cv.toDataURL('image/webp', 0.9); };
    if (c.img) {
      res.listo = img(c.img).listo.then(im => {
        if (im) {
          x.fillStyle = rg(x, W / 2, H * 0.55, 10, 120, [[0, 'rgba(25,255,106,.45)'], [1, 'rgba(0,0,0,0)']]); x.fillRect(0, 0, W, H);
          const s = Math.min((W * 1.0) / im.naturalWidth, (H * 0.95) / im.naturalHeight); const w = im.naturalWidth * s, h = im.naturalHeight * s;
          x.drawImage(im, (W - w) / 2, H - h + 6, w, h);
        }
        fin(); return res.src;
      });
    } else if (HECHIZOS[id]) { HECHIZOS[id](x, W, H); fin(); res.listo = Promise.resolve(res.src); }
    else {
      x.fillStyle = rg(x, W / 2, H * 0.62, 10, 110, [[0, col + '55'], [1, 'rgba(0,0,0,0)']]); x.fillRect(0, 0, W, H);
      x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.ellipse(W / 2, H * 0.86, 80, 16, 0, 0, 7); x.fill();
      x.save(); const esc = c.num > 1 ? 1.75 : 2.4; x.translate(W / 2 - 50 * esc, H * 0.9 - 90 * esc); x.scale(esc, esc);
      if (c.num > 1) { x.save(); x.translate(-30, -8); x.globalAlpha = 0.85; (D[id] || D.cadete)(x, EQ[0]); x.restore(); x.save(); x.translate(30, -8); x.globalAlpha = 0.85; (D[id] || D.cadete)(x, EQ[0]); x.restore(); x.globalAlpha = 1; }
      (D[id] || D.cadete)(x, EQ[0], -0.5); x.restore(); fin(); res.listo = Promise.resolve(res.src);
    }
    ARTE[id] = res; return res;
  }
  // devuelve <img> que se rellena cuando el arte está listo
  function imgCarta(id) { const a = arteCarta(id); return a.src || (a.listo && a.listo, ''); }

  /* --- cápsulas (SVG) --- */
  function capsula(tipo, extra) {
    const d = NC.COFRES[tipo] || NC.COFRES.plata, c = d.col, u = 'k' + Math.random().toString(36).slice(2, 7);
    return `<svg class="capsula ${extra || ''}" viewBox="0 0 120 120" data-tipo="${tipo}">
      <defs><linearGradient id="${u}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="#1a1f33"/></linearGradient>
      <linearGradient id="${u}d" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2d3550"/><stop offset="1" stop-color="#0a0d18"/></linearGradient>
      <radialGradient id="${u}g"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="60" cy="108" rx="40" ry="7" fill="#000" opacity=".45"/>
      <path d="M22 66 Q22 104 60 104 Q98 104 98 66 Z" fill="url(#${u}d)" stroke="${c}" stroke-width="2"/>
      <path d="M22 62 Q22 18 60 18 Q98 18 98 62 Z" fill="url(#${u}m)"/>
      <path d="M32 46 Q40 26 60 24" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".7"/>
      <rect class="cuerda" x="16" y="58" width="88" height="10" rx="5" fill="#141a2b" stroke="${c}" stroke-width="2"/>
      <rect class="raja" x="20" y="61" width="80" height="4" rx="2" fill="${c}" style="filter:drop-shadow(0 0 6px ${c})"/>
      <circle cx="60" cy="63" r="13" fill="url(#${u}d)" stroke="${c}" stroke-width="2.5"/>
      <circle class="nucleo" cx="60" cy="63" r="8" fill="url(#${u}g)"/>
      <circle cx="34" cy="86" r="2.5" fill="${c}"/><circle cx="86" cy="86" r="2.5" fill="${c}"/>
    </svg>`;
  }

  /* --- iconos --- */
  const IC = {
    gema: '<svg class="ic" viewBox="0 0 24 24"><path d="M6 3h12l4 6-10 12L2 9z" fill="#19ff6a"/><path d="M6 3l3 6h6l3-6M2 9h20M9 9l3 12 3-12" fill="none" stroke="#063d1d" stroke-width="1.2"/><path d="M6 3l3 6H2z" fill="#a8ffcb"/></svg>',
    cred: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ffc83a"/><circle cx="12" cy="12" r="7.2" fill="#f0a500" stroke="#ffe48a" stroke-width="1.2"/><path d="M14.8 9.2a3.6 3.6 0 1 0 0 5.6" fill="none" stroke="#fff7c8" stroke-width="2.2" stroke-linecap="round"/></svg>',
    trofeo: '<svg class="ic" viewBox="0 0 24 24"><path d="M7 3h10v5a5 5 0 0 1-10 0z" fill="#ffd23f"/><path d="M7 5H3.5a3.5 3.5 0 0 0 3.8 4M17 5h3.5a3.5 3.5 0 0 1-3.8 4" fill="none" stroke="#ffd23f" stroke-width="1.8"/><path d="M10 13h4v3h-4zM7 19h10v2H7z" fill="#f0a500"/><path d="M9 16h6l1 3H8z" fill="#ffd23f"/></svg>',
    corona: '<svg class="ic" viewBox="0 0 24 24"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="currentColor"/><path d="M5 19h14v2H5z" fill="currentColor" opacity=".7"/></svg>',
    plasma: '<svg class="ic" viewBox="0 0 24 24"><path d="M12 2l7 6.5v7L12 22l-7-6.5v-7z" fill="#c43dff"/><path d="M12 5l4.5 4v5L12 18l-4.5-4V9z" fill="#ff7bf2"/><circle cx="10.5" cy="9.5" r="1.6" fill="#fff"/></svg>',
    rayo: '<svg class="ic" viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor"/></svg>',
    reloj: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  return { EQ, img, rojo, sprite, dibujaTorreta, arteCarta, imgCarta, capsula, IC, D };
})();
