/* =========================================================
   NEXTCARD · sonido sintetizado (Web Audio, sin MP3)
   ========================================================= */
'use strict';
const Son = (() => {
  const ld = (k, d) => { try { const v = localStorage.getItem('nc_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const st = (k, v) => { try { localStorage.setItem('nc_' + k, JSON.stringify(v)); } catch (e) {} };
  let ac = null, master, mus, on = ld('son', true), musOn = ld('mus', true), musT = null, paso = 0, prox = 0, modo = 'menu', ruidoBuf = null, ult = {};
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC(); master = ac.createGain(); master.gain.value = on ? 0.8 : 0;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; master.connect(comp); comp.connect(ac.destination);
    mus = ac.createGain(); mus.gain.value = 0.18; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; mus.connect(lp); lp.connect(master);
    prox = ac.currentTime + 0.1; musT = setInterval(musica, 30);
  }
  // evita que 30 disparos a la vez saturen
  function limita(k, ms) { const n = performance.now(); if (ult[k] && n - ult[k] < ms) return false; ult[k] = n; return true; }
  function nBuf() { if (ruidoBuf) return ruidoBuf; const n = ac.sampleRate, b = ac.createBuffer(1, n, ac.sampleRate), x = b.getChannelData(0); for (let i = 0; i < n; i++) x[i] = Math.random() * 2 - 1; return (ruidoBuf = b); }
  function tono(f, d, tipo, vol, slide, delay, dest) {
    if (!ac) return; const t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = tipo || 'sine'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + d + 0.05);
  }
  function ruido(d, vol, f1, f2, delay, tipo) {
    if (!ac) return; const t = ac.currentTime + (delay || 0);
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = nBuf(); f.type = tipo || 'lowpass';
    f.frequency.setValueAtTime(f1, t); f.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5, d + 0.05);
  }
  function voz(f, t, d, o) {
    o = o || {}; const g = ac.createGain(), fl = ac.createBiquadFilter(); fl.type = o.ft || 'lowpass'; fl.Q.value = o.q || 1;
    const f0 = o.f0 || 2400, f1 = o.f1 || f0; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(60, f1), t + d);
    const at = o.at || 0.008, v = o.vol || 0.1;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + at); g.gain.setValueAtTime(v, t + Math.max(at, d * (o.sus || 0.1))); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    (o.det || [0]).forEach(dt => { const os = ac.createOscillator(); os.type = o.tipo || 'sawtooth'; os.frequency.setValueAtTime(f, t); os.detune.value = dt; if (o.slide) os.frequency.exponentialRampToValueAtTime(f * o.slide, t + d); os.connect(fl); os.start(t); os.stop(t + d + 0.05); });
    fl.connect(g); g.connect(o.dest || master);
  }
  function golpe(t, d, vol, ft, f, dest, q) {
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = nBuf(); fl.type = ft; fl.frequency.value = f; fl.Q.value = q || 0.8;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(fl); fl.connect(g); g.connect(dest || master); s.start(t, Math.random() * 0.5, d + 0.05);
  }
  function bombo(t, dest, v) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.22); g.gain.setValueAtTime(v || 0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.35); }

  /* ---------- música ---------- */
  // menú: pads espaciales en Re menor con arpegio cristalino · batalla: synthwave épico 124 BPM
  const MENU = [[50, 57, 62, 65, 69], [46, 53, 58, 62, 65], [48, 55, 60, 64, 67], [45, 52, 57, 61, 64]];
  const BAT = { bpm: 124, acordes: [[38, 50, 53, 57], [46, 50, 53, 58], [41, 48, 53, 57], [43, 50, 55, 58]],
    melA: [74, -1, 72, 74, -1, 77, -1, 76, 74, -1, 72, -1, 69, -1, 72, -1], melB: [77, -1, 76, 77, -1, 81, -1, 79, 77, -1, 76, -1, 74, -1, -1, -1] };
  let urgente = false;
  function pasoMenu(t, i) {
    const bar = Math.floor(i / 16) % 4, s = i % 16, ch = MENU[bar];
    if (s === 0) { ch.slice(1).forEach(n => voz(mtof(n), t, 4.2, { tipo: 'sawtooth', vol: 0.02, f0: 500, f1: 1400, at: 0.8, sus: 0.7, det: [-14, 0, 14], dest: mus })); voz(mtof(ch[0] - 12), t, 4, { tipo: 'sine', vol: 0.12, at: 0.2, sus: 0.8, dest: mus }); }
    if (s % 2 === 0) { const n = ch[1 + ((s / 2) % 4)] + 12 + (s >= 8 ? 12 : 0); voz(mtof(n), t, 0.35, { tipo: 'triangle', vol: 0.035, f0: 4000, f1: 1500, dest: mus }); }
    if (s === 6 || s === 14) voz(mtof(ch[3] + 24), t, 0.9, { tipo: 'sine', vol: 0.025, dest: mus });
  }
  function pasoBatalla(t, i) {
    const bar = Math.floor(i / 16) % 4, s = i % 16, ch = BAT.acordes[bar], sec = Math.floor(i / 64) % 4, d16 = 60 / (BAT.bpm * (urgente ? 1.12 : 1)) / 4;
    const intro = Math.floor(i / 16) < 2;
    if (!intro || s % 8 === 0) { if (s % 4 === 0) bombo(t, mus, 0.85); }
    if (!intro && (s === 4 || s === 12)) { golpe(t, 0.18, 0.5, 'bandpass', 1900, mus, 0.7); voz(190, t, 0.12, { tipo: 'triangle', vol: 0.12, f0: 3000, slide: 0.6, dest: mus }); }
    if (s % 2 === 0 || sec >= 1 || urgente) golpe(t, s % 4 === 2 ? 0.07 : 0.035, s % 4 === 2 ? 0.22 : 0.09, 'highpass', 8500, mus);
    if (s === 14 && bar === 3) golpe(t, 0.3, 0.25, 'highpass', 5000, mus);
    if (s % 2 === 0) { const n = ch[0] + (s % 8 === 6 ? 12 : 0); voz(mtof(n), t, d16 * 1.8, { tipo: 'sawtooth', vol: 0.2, f0: 900, f1: 180, q: 6, det: [-6, 6], dest: mus }); }
    if (s === 0) ch.slice(1).forEach(n => voz(mtof(n), t, d16 * 16, { tipo: 'sawtooth', vol: 0.026, f0: 600, f1: 1500, at: 0.3, sus: 0.8, det: [-12, 0, 12], dest: mus }));
    if ((sec >= 1 || urgente) && !intro) { const n = ch[1 + (s % 3)] + 12; voz(mtof(n), t, d16 * 0.9, { tipo: 'square', vol: 0.024, f0: 3200, f1: 900, dest: mus }); }
    if (sec % 2 === 1 || sec === 2 || urgente) { const m = (bar % 2 ? BAT.melB : BAT.melA)[s]; if (m > 0) voz(mtof(m), t, d16 * 2.2, { tipo: 'sawtooth', vol: 0.045, f0: 2600, f1: 1400, det: [-8, 8], dest: mus }); }
  }
  function musica() {
    if (!ac || !on || !musOn || !modo) { if (ac) prox = ac.currentTime + 0.1; return; }
    const bat = modo === 'batalla', dur = bat ? 60 / (BAT.bpm * (urgente ? 1.12 : 1)) / 4 : 0.25;
    while (prox < ac.currentTime + 0.15) { if (bat) pasoBatalla(prox, paso); else pasoMenu(prox, paso); paso++; prox += dur; }
  }
  function ponModo(m) {
    if (m === modo) return; modo = m; paso = 0; urgente = false;
    if (!ac) return; const v = m === 'batalla' ? 0.3 : 0.2, t = ac.currentTime;
    mus.gain.cancelScheduledValues(t); mus.gain.setValueAtTime(0.0001, t); mus.gain.exponentialRampToValueAtTime(v, t + 0.8); prox = t + 0.08;
  }
  let pausadoFondo = false;
  function fondo(oculto) {
    if (!ac) return;
    if (oculto) { if (ac.state === 'running') { pausadoFondo = true; ac.suspend().catch(() => {}); } }
    else if (pausadoFondo) { pausadoFondo = false; ac.resume().catch(() => {}); prox = ac.currentTime + 0.1; }
  }
  document.addEventListener('visibilitychange', () => fondo(document.visibilityState !== 'visible'));
  addEventListener('pagehide', () => fondo(true));
  addEventListener('pageshow', () => { if (document.visibilityState === 'visible') fondo(false); });

  return {
    init, get on() { return on; }, get musica() { return musOn; },
    alternar() { on = !on; st('son', on); if (master) master.gain.value = on ? 0.8 : 0; return on; },
    alternarMusica() { musOn = !musOn; st('mus', musOn); return musOn; },
    modo: ponModo, urgente(v) { urgente = v; },
    click() { tono(1046, 0.05, 'square', 0.05); tono(1568, 0.06, 'sine', 0.05, 1, 0.03); },
    tab() { tono(660, 0.05, 'triangle', 0.07); tono(990, 0.07, 'triangle', 0.06, 1, 0.04); },
    error() { tono(220, 0.18, 'square', 0.08, 0.7); tono(180, 0.2, 'square', 0.07, 0.7, 0.1); },
    moneda() { tono(988, 0.08, 'square', 0.08); tono(1319, 0.25, 'square', 0.08, 1, 0.08); },
    gema() { if (!ac) return; const t = ac.currentTime; [88, 93, 100].forEach((n, i) => voz(mtof(n), t + i * 0.06, 0.5, { tipo: 'sine', vol: 0.08 })); golpe(t, 0.25, 0.1, 'highpass', 9000); },
    nfc() { tono(1500, 0.08, 'sine', 0.12); tono(2000, 0.12, 'sine', 0.12, 1, 0.1); },
    sube() { if (!ac) return; const t = ac.currentTime; [60, 64, 67, 72, 76].forEach((n, i) => voz(mtof(n), t + i * 0.05, 0.3, { tipo: 'square', vol: 0.05, f0: 3000 })); },
    // ---- batalla ----
    cogeCarta() { if (!ac) return; const t = ac.currentTime; golpe(t, 0.05, 0.15, 'highpass', 5000); voz(mtof(81), t, 0.12, { tipo: 'triangle', vol: 0.08 }); },
    despliega(coste) {   // teletransporte: barrido + campanada
      if (!ac) return; const t = ac.currentTime;
      const s0 = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); s0.buffer = nBuf(); fl.type = 'bandpass'; fl.Q.value = 2;
      fl.frequency.setValueAtTime(5000, t); fl.frequency.exponentialRampToValueAtTime(500, t + 0.35); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      s0.connect(fl); fl.connect(g); g.connect(master); s0.start(t, Math.random() * 0.5, 0.45);
      voz(mtof(62 + (coste || 3) * 2), t + 0.05, 0.45, { tipo: 'sine', vol: 0.1, slide: 1.5 }); tono(90, 0.3, 'sine', 0.3, 0.6, 0.02);
    },
    sinPlasma() { if (limita('sp', 300)) tono(160, 0.15, 'square', 0.06, 0.8); },
    laser(agudo) { if (!limita('l' + (agudo ? 1 : 0), 70)) return; tono(agudo ? 2400 : 1500, 0.12, 'square', 0.025, 0.25); tono(agudo ? 1200 : 700, 0.1, 'sawtooth', 0.02, 0.3); },
    blaster() { if (!limita('bl', 90)) return; tono(900, 0.16, 'sawtooth', 0.035, 0.2); ruido(0.08, 0.06, 6000, 1500); },
    corte() { if (!limita('co', 80)) return; ruido(0.16, 0.18, 1200, 7000, 0, 'bandpass'); tono(300, 0.12, 'sawtooth', 0.06, 0.4); },
    golpeMetal() { if (!ac || !limita('gm', 60)) return; golpe(ac.currentTime, 0.08, 0.15, 'bandpass', 2600, master, 4); tono(170, 0.1, 'sine', 0.12, 0.6); },
    impacto(f) { if (!limita('im', 50)) return; ruido(0.18, 0.18 * (f || 1), 2500, 200); tono(120, 0.15, 'sine', 0.2 * (f || 1), 0.5); },
    explosion(f) { if (!ac || !limita('ex', 70)) return; f = f || 1; ruido(0.7 * f, 0.5 * Math.min(1.4, f), 3500, 60); tono(70, 0.6 * f, 'sine', 0.5, 0.35); bombo(ac.currentTime, master, 0.8); },
    fuego() { if (!limita('fu', 120)) return; ruido(0.35, 0.18, 900, 3800); tono(200, 0.3, 'sawtooth', 0.04, 0.5); },
    rayo() { if (!limita('ra', 90)) return; tono(1800, 0.18, 'square', 0.05, 0.15); ruido(0.2, 0.18, 9000, 2000); tono(90, 0.15, 'sawtooth', 0.08, 1.5); },
    meteoros() { if (!ac) return; [0, 0.15, 0.3, 0.45].forEach(d => { ruido(0.45, 0.12, 300, 4000, d, 'bandpass'); }); setTimeout(() => this.explosion(1.2), 520); },
    misil() { if (!ac) return; ruido(0.9, 0.25, 400, 3000, 0, 'bandpass'); tono(300, 0.9, 'sawtooth', 0.04, 3); },
    emp() { if (!ac) return; const t = ac.currentTime; voz(1200, t, 0.5, { tipo: 'square', vol: 0.06, slide: 0.1, f0: 6000, f1: 300 }); ruido(0.5, 0.35, 9000, 600); tono(55, 0.6, 'sawtooth', 0.15, 1.2); },
    agujero() { if (!ac) return; const t = ac.currentTime; voz(60, t, 3.8, { tipo: 'sawtooth', vol: 0.12, f0: 200, f1: 1200, at: 0.3, sus: 0.7, det: [-25, 0, 25], slide: 0.5 }); voz(400, t, 3.8, { tipo: 'sine', vol: 0.04, slide: 0.2 }); },
    torreCae(rey) { if (!ac) return; ruido(1.4, 0.7, 4000, 50); tono(50, 1.4, 'sine', 0.6, 0.4); bombo(ac.currentTime, master, 1); bombo(ac.currentTime + 0.18, master, 0.8); if (rey) ruido(2.2, 0.5, 1500, 40, 0.3); },
    corona(mia) { if (!ac) return; const t = ac.currentTime + 0.4, b = mia ? [72, 76, 79, 84] : [60, 63, 67, 70]; b.forEach((n, i) => voz(mtof(n), t + i * 0.08, 0.6, { tipo: 'triangle', vol: 0.09, f0: 5000 })); },
    tic() { tono(1400, 0.05, 'square', 0.06); },
    cuenta(n) { tono(n ? 660 : 1320, n ? 0.18 : 0.5, 'square', 0.09, 1); },
    prorroga() { if (!ac) return; const t = ac.currentTime; [0, 0.25, 0.5].forEach(d => voz(mtof(74), t + d, 0.2, { tipo: 'square', vol: 0.08, f0: 3000 })); voz(mtof(86), t + 0.75, 0.8, { tipo: 'sawtooth', vol: 0.08, det: [-10, 10] }); },
    plasmaLleno() { if (limita('pl', 4000)) tono(1760, 0.08, 'sine', 0.05); },
    victoria() {
      if (!ac) return; const t = ac.currentTime + 0.05, met = (n, a, d, v) => voz(mtof(n), t + a, d, { tipo: 'sawtooth', vol: v || 0.09, f0: 900, f1: 3200, at: 0.03, sus: 0.6, det: [-10, 0, 10] });
      bombo(t, master, 1); golpe(t, 1.4, 0.35, 'highpass', 4000);
      [[60, 0], [64, 0.16], [67, 0.32]].forEach(([n, a]) => met(n, a, 0.22));
      [60, 64, 67, 72].forEach(n => met(n, 0.5, 1.9, 0.07)); met(48, 0.5, 1.9, 0.09);
      bombo(t + 0.5, master, 1); golpe(t + 0.5, 2.2, 0.4, 'highpass', 6000);
      [84, 88, 91, 96].forEach((n, i) => voz(mtof(n), t + 0.55 + i * 0.07, 0.9, { tipo: 'sine', vol: 0.06 }));
    },
    derrota() {
      if (!ac) return; const t = ac.currentTime + 0.05;
      [[57, 0], [53, 0.35], [52, 0.7]].forEach(([n, a]) => voz(mtof(n), t + a, 0.6, { tipo: 'sawtooth', vol: 0.08, f0: 1400, f1: 300, det: [-12, 12] }));
      voz(mtof(45), t + 1.05, 2.2, { tipo: 'sawtooth', vol: 0.1, f0: 900, f1: 120, det: [-15, 0, 15] }); bombo(t + 1.05, master, 0.8);
    },
    // ---- cápsulas ----
    capsulaGolpe(i) { if (!ac) return; const t = ac.currentTime; golpe(t, 0.12, 0.3 + i * 0.08, 'bandpass', 900 + i * 300, master, 3); bombo(t, master, 0.5 + i * 0.1); voz(mtof(60 + i * 3), t, 0.3, { tipo: 'square', vol: 0.04, f0: 2500 }); },
    capsulaAbre() { if (!ac) return; const t = ac.currentTime; ruido(1.2, 0.5, 9000, 300); bombo(t, master, 1); [72, 76, 79, 84, 88, 91].forEach((n, i) => voz(mtof(n), t + 0.1 + i * 0.05, 0.9, { tipo: 'sine', vol: 0.07 })); },
    cartaSale(rar) {
      if (!ac) return; const t = ac.currentTime, base = { c: 72, r: 76, e: 79, l: 84 }[rar] || 72;
      golpe(t, 0.08, 0.2, 'highpass', 6000); voz(mtof(base), t, 0.4, { tipo: 'triangle', vol: 0.1, f0: 5000 }); voz(mtof(base + 7), t + 0.06, 0.4, { tipo: 'sine', vol: 0.06 });
      if (rar === 'e' || rar === 'l') { [0, 4, 7, 12, 16].forEach((d, i) => voz(mtof(base + d), t + 0.1 + i * 0.06, 0.7, { tipo: 'sine', vol: 0.05 })); ruido(1, 0.15, 10000, 3000, 0.05, 'highpass'); }
      if (rar === 'l') { bombo(t, master, 1); voz(mtof(base - 24), t, 2, { tipo: 'sawtooth', vol: 0.06, det: [-15, 0, 15], at: 0.1, sus: 0.5 }); }
    },
    mejora() { if (!ac) return; const t = ac.currentTime; ruido(0.6, 0.25, 600, 8000, 0, 'bandpass'); [60, 67, 72, 76, 79, 84].forEach((n, i) => voz(mtof(n), t + 0.2 + i * 0.06, 0.6, { tipo: 'square', vol: 0.045, f0: 4000 })); bombo(t + 0.55, master, 1); }
  };
})();
