/* =========================================================
   NEXTCARD · datos compartidos (navegador + Apps Script)
   En Apps Script este archivo se llama «Datos».
   ========================================================= */
var NC = (function () {
  // rareza: c común · r rara · e épica · l legendaria
  // tipo: tropa · hechizo · edificio      ·  obj: todo | tierra | edificios
  // unidades de distancia = casillas del campo (18 x 32) · vel en casillas/s · hit en segundos
  var CARTAS = [
    { id: 'drones', nom: 'Enjambre Dron', rar: 'c', coste: 3, tipo: 'tropa', arena: 0, num: 3, vuela: 1, hp: 95, dmg: 42, hit: 1.0, rango: 2.2, vel: 1.45, obj: 'todo', radio: 0.45,
      img: 'img/tropa-drones.webp', desc: 'Tres drones voladores rápidos. Perfectos para cazar tropas de tierra que no pueden mirar al cielo.' },
    { id: 'cadetes', nom: 'Cadetes Ion', rar: 'c', coste: 3, tipo: 'tropa', arena: 0, num: 3, hp: 330, dmg: 82, hit: 1.1, rango: 0.8, vel: 1.0, obj: 'tierra', radio: 0.5,
      img: 'img/tropa-cadetes.webp', desc: 'Escuadrón de tres robots con porra de iones. Rodean y frenan a cualquier tropa grande.' },
    { id: 'tirador', nom: 'Tirador Láser', rar: 'c', coste: 3, tipo: 'tropa', arena: 0, num: 1, hp: 260, dmg: 92, hit: 1.1, rango: 5.5, vel: 1.0, obj: 'todo', radio: 0.5,
      img: 'img/tropa-tirador.webp', desc: 'Francotirador de largo alcance. Dispara a tierra y aire desde detrás de tus tanques.' },
    { id: 'meteoro', nom: 'Lluvia de Meteoritos', rar: 'c', coste: 2, tipo: 'hechizo', arena: 0, radioArea: 3.2, dmg: 150, torre: 0.4,
      desc: 'Una lluvia de rocas espaciales que barre enjambres y tropas débiles en una zona grande.' },
    { id: 'torreta', nom: 'Torreta Pulsar', rar: 'c', coste: 4, tipo: 'edificio', arena: 0, num: 1, hp: 820, dmg: 72, hit: 0.85, rango: 6.2, vel: 0, obj: 'todo', radio: 1.0, vida: 35,
      desc: 'Defensa que se planta en tu lado y atrae a las tropas que van a por edificios. Dura 35 s.' },
    { id: 'tanque', nom: 'Tanque Orbital', rar: 'r', coste: 5, tipo: 'tropa', arena: 0, num: 1, hp: 2700, dmg: 165, hit: 1.5, rango: 1.2, vel: 0.72, obj: 'edificios', radio: 0.95,
      img: 'img/tropa-tanque.webp', desc: 'Una mole blindada que solo ataca estructuras. Ponle apoyo detrás y arrasará torres.' },
    { id: 'misil', nom: 'Misil Nova', rar: 'r', coste: 4, tipo: 'hechizo', arena: 0, radioArea: 2.5, dmg: 540, torre: 0.4, empuje: 1.2,
      desc: 'Un misil desde tu nave nodriza. Gran daño en área y empuja hacia atrás a las tropas.' },
    { id: 'mecha', nom: 'Mecha Cuchilla', rar: 'r', coste: 4, tipo: 'tropa', arena: 0, num: 1, hp: 1150, dmg: 500, hit: 1.8, rango: 0.9, vel: 1.4, obj: 'tierra', radio: 0.7,
      img: 'img/tropa-mecha.webp', desc: 'Rápido y brutal: cada tajo de su hoja de plasma destroza tanques y torres.' },
    { id: 'moto', nom: 'Moto Cuántica', rar: 'r', coste: 4, tipo: 'tropa', arena: 1, num: 1, hp: 1100, dmg: 215, hit: 1.6, rango: 0.9, vel: 2.0, obj: 'edificios', radio: 0.7, salta: 1,
      desc: 'Va directa a por los edificios a toda velocidad y salta la grieta de plasma sin usar los puentes.' },
    { id: 'emp', nom: 'Pulso EMP', rar: 'c', coste: 2, tipo: 'hechizo', arena: 1, radioArea: 2.6, dmg: 85, torre: 0.4, aturde: 0.8,
      desc: 'Descarga electromagnética instantánea: daña y deja paralizado todo lo que toca.' },
    { id: 'dragon', nom: 'Dragón Estelar', rar: 'e', coste: 4, tipo: 'tropa', arena: 1, num: 1, vuela: 1, hp: 820, dmg: 115, hit: 1.6, rango: 3.5, vel: 1.4, obj: 'todo', radio: 0.85, area: 1.3,
      desc: 'Bestia mecánica voladora que escupe fuego de plasma en área. Reina de los enjambres.' },
    { id: 'superlucas', nom: 'Súper Lucas', rar: 'l', coste: 5, tipo: 'tropa', arena: 1, num: 1, vuela: 1, hp: 1150, dmg: 210, hit: 1.0, rango: 1.4, vel: 2.0, obj: 'todo', radio: 0.85, carga: 1,
      img: 'img/lucas/superlucas.webp', desc: 'La mascota de FuturMovil con su capa. Vuela a velocidad supersónica y su primer golpe hace daño doble.' },
    { id: 'agujero', nom: 'Agujero Negro', rar: 'e', coste: 3, tipo: 'hechizo', arena: 2, radioArea: 3.0, dmg: 65, torre: 0.3, dura: 4, atrae: 1,
      desc: 'Abre una singularidad durante 4 s: absorbe a las tropas hacia el centro, las frena y las va triturando.' },
    { id: 'gamer', nom: 'Lucas Gamer', rar: 'l', coste: 4, tipo: 'tropa', arena: 2, num: 1, hp: 760, dmg: 125, hit: 1.3, rango: 6.0, vel: 1.0, obj: 'todo', radio: 0.7, cadena: 2, ralentiza: 0.35,
      img: 'img/lucas/mando.webp', desc: 'Lucas con su mando hackea a los enemigos: su rayo salta a 3 objetivos y los ralentiza.' },
    { id: 'coloso', nom: 'Coloso de Plasma', rar: 'e', coste: 7, tipo: 'tropa', arena: 3, num: 1, hp: 4600, dmg: 265, hit: 2.5, rango: 1.2, vel: 0.6, obj: 'edificios', radio: 1.25, muerte: 320,
      desc: 'Gigante de roca y plasma. Solo va a por edificios y al caer explota arrasando todo a su alrededor.' },
    { id: 'comandante', nom: 'Lucas Comandante', rar: 'l', coste: 5, tipo: 'tropa', arena: 3, num: 1, hp: 1350, dmg: 145, hit: 1.2, rango: 5.0, vel: 1.0, obj: 'todo', radio: 0.75, invoca: 'cadete', cada: 6,
      img: 'img/lucas/senala.webp', desc: 'Lucas al mando: dispara rayos y cada 6 s teletransporta un cadete Ion a su lado.' }
  ];
  var MAPA = {}; CARTAS.forEach(function (c) { MAPA[c.id] = c; });
  // tropa invocada (no es carta)
  var CADETE = { id: 'cadete', nom: 'Cadete Ion', img: 'img/tropa-cadetes.webp', rar: 'c', tipo: 'tropa', num: 1, hp: 330, dmg: 82, hit: 1.1, rango: 0.8, vel: 1.0, obj: 'tierra', radio: 0.5 };

  var RAREZAS = {
    c: { nom: 'Común', col: '#9fd3ff', mul: 1 },
    r: { nom: 'Rara', col: '#ff9d3c', mul: 2 },
    e: { nom: 'Épica', col: '#c77dff', mul: 5 },
    l: { nom: 'Legendaria', col: '#ffe14d', mul: 12 }
  };
  // copias necesarias para pasar del nivel n al n+1 (índice 0 = de 1 a 2)
  var COPIAS = { c: [2, 4, 10, 20, 50, 100, 200, 400], r: [2, 4, 8, 15, 30, 60, 120, 200], e: [1, 2, 4, 8, 15, 25, 40, 60], l: [1, 1, 2, 3, 5, 8, 12, 20] };
  var COSTE_MEJORA = [10, 30, 80, 200, 500, 1200, 3000, 7000];   // × multiplicador de rareza (créditos)
  var NIVEL_MAX = 9;
  function copiasPara(rar, nivel) { return nivel >= NIVEL_MAX ? 0 : COPIAS[rar][nivel - 1]; }
  function creditosPara(rar, nivel) { return nivel >= NIVEL_MAX ? 0 : COSTE_MEJORA[nivel - 1] * RAREZAS[rar].mul; }
  function multNivel(n) { return Math.pow(1.1, (n || 1) - 1); }

  // experiencia del comandante
  var XP_NIVEL = [0, 30, 90, 200, 400, 750, 1300, 2100, 3300, 5000, 7500, 11000, 16000];
  function nivelPorXp(xp) { var n = 1; for (var i = 1; i < XP_NIVEL.length; i++) if (xp >= XP_NIVEL[i]) n = i + 1; return n; }
  function multTorre(nivel) { return 1 + 0.07 * ((nivel || 1) - 1); }

  // galaxias (arenas)
  var ARENAS = [
    { nom: 'Estación Lunar', min: 0, col: '#00e5ff', col2: '#3a6bff' },
    { nom: 'Cinturón de Asteroides', min: 300, col: '#ff9d3c', col2: '#ff4d6d' },
    { nom: 'Nebulosa Esmeralda', min: 700, col: '#19ff6a', col2: '#00c2a8' },
    { nom: 'Planeta Volcán', min: 1200, col: '#ff5a2a', col2: '#ffcc00' },
    { nom: 'Anillos de Saturno', min: 1800, col: '#c77dff', col2: '#ff6ad5' },
    { nom: 'Galaxia FuturMovil', min: 2600, col: '#19ff6a', col2: '#00e5ff' }
  ];
  function arenaDe(trofeos) { var a = 0; for (var i = 0; i < ARENAS.length; i++) if ((trofeos || 0) >= ARENAS[i].min) a = i; return a; }

  // cápsulas (cofres)
  var COFRES = {
    plata: { nom: 'Cápsula Plata', horas: 3, cartas: 4, cartasA: 2, cred: [20, 40], gemas: [0.05, 1, 2], pilas: 2, col: '#cfe3ff' },
    oro: { nom: 'Cápsula Oro', horas: 8, cartas: 12, cartasA: 5, cred: [90, 150], gemas: [0.12, 2, 5], pilas: 3, raras: 1, col: '#ffcf3c' },
    nebulosa: { nom: 'Cápsula Nebulosa', horas: 12, cartas: 30, cartasA: 12, cred: [260, 420], gemas: [0.25, 3, 8], pilas: 4, raras: 5, epicas: 1, legP: 0.05, col: '#c77dff' },
    supernova: { nom: 'Cápsula Supernova', horas: 24, cartas: 60, cartasA: 20, cred: [800, 1300], gemas: [1, 6, 15], pilas: 6, raras: 15, epicas: 3, legendarias: 1, col: '#ff4dc4' },
    suministros: { nom: 'Suministros', horas: 0, cartas: 3, cartasA: 1, cred: [15, 30], gemas: [0.3, 1, 1], pilas: 2, col: '#19ff6a' },
    corona: { nom: 'Cápsula Corona', horas: 0, cartas: 15, cartasA: 5, cred: [120, 220], gemas: [1, 2, 4], pilas: 4, raras: 2, col: '#00e5ff' }
  };
  var CICLO = (function () {
    var s = []; for (var i = 0; i < 48; i++) s.push(i % 4 === 3 ? 'oro' : 'plata');
    s[11] = 'nebulosa'; s[29] = 'nebulosa'; s[41] = 'nebulosa'; s[47] = 'supernova';
    return s;
  })();
  var HORAS_SUMINISTROS = 4, CORONAS_DIA = 10;

  function azarEntre(rnd, a, b) { return Math.floor(a + rnd() * (b - a + 1)); }
  function cartasDe(rar, arena) { return CARTAS.filter(function (c) { return c.rar === rar && c.arena <= arena; }); }
  function repartir(rnd, total, pilas, pool, out) {
    if (total <= 0 || !pool.length) return;
    pilas = Math.max(1, Math.min(pilas, pool.length, total));
    var copia = pool.slice(), elegidas = [];
    for (var i = 0; i < pilas; i++) elegidas.push(copia.splice(Math.floor(rnd() * copia.length), 1)[0]);
    var resto = total, pesos = elegidas.map(function () { return 0.5 + rnd(); }), suma = pesos.reduce(function (a, b) { return a + b; }, 0);
    elegidas.forEach(function (c, i) {
      var n = i === elegidas.length - 1 ? resto : Math.max(1, Math.round(total * pesos[i] / suma));
      n = Math.min(n, resto - (elegidas.length - 1 - i)); resto -= n;
      if (n > 0) { var ya = out.filter(function (x) { return x.id === c.id; })[0]; if (ya) ya.n += n; else out.push({ id: c.id, n: n }); }
    });
  }
  // contenido de una cápsula: { cartas:[{id,n}], cred, gemas }
  function generarCofre(tipo, arena, rnd) {
    rnd = rnd || Math.random; arena = Math.max(0, Math.min(ARENAS.length - 1, arena || 0));
    var d = COFRES[tipo], total = d.cartas + d.cartasA * arena, m = 1 + 0.5 * arena;
    var nl = d.legendarias || 0; if (rnd() < (d.legP || 0.004)) nl++;
    var ne = d.epicas || 0; if (rnd() < 0.04) ne++;
    var nr = (d.raras || 0) + Math.floor(total * 0.08 * rnd());
    if (!cartasDe('l', arena).length) nl = 0;
    if (!cartasDe('e', arena).length) { nr += ne; ne = 0; }
    var nc = Math.max(0, total - nl - ne - nr), out = [];
    repartir(rnd, nc, Math.max(1, d.pilas - (nr ? 1 : 0) - (ne ? 1 : 0)), cartasDe('c', arena), out);
    repartir(rnd, nr, nr > 6 ? 2 : 1, cartasDe('r', arena), out);
    repartir(rnd, ne, ne > 1 ? 2 : 1, cartasDe('e', arena), out);
    repartir(rnd, nl, 1, cartasDe('l', arena), out);
    var orden = { c: 0, r: 1, e: 2, l: 3 };
    out.sort(function (a, b) { return orden[MAPA[a.id].rar] - orden[MAPA[b.id].rar]; });
    var gemas = rnd() < d.gemas[0] ? azarEntre(rnd, d.gemas[1], d.gemas[2]) : 0;
    return { cartas: out, cred: Math.round(azarEntre(rnd, d.cred[0], d.cred[1]) * m), gemas: gemas };
  }
  // gemas para abrir ya una cápsula: 1 gema cada 6 minutos (mínimo 1)
  function gemasPorTiempo(ms) { return Math.max(1, Math.ceil(ms / 60000 / 6)); }

  // tienda (precios por defecto; el admin puede cambiarlos)
  var TIENDA = {
    capsulas: [{ tipo: 'oro', gemas: 150 }, { tipo: 'nebulosa', gemas: 420 }, { tipo: 'supernova', gemas: 1150 }],
    creditos: [{ cred: 1000, gemas: 60 }, { cred: 10000, gemas: 500 }, { cred: 100000, gemas: 4500 }],
    gemas: [{ id: 'g1', gemas: 80, cent: 99 }, { id: 'g2', gemas: 500, cent: 499, extra: 'Popular' }, { id: 'g3', gemas: 1200, cent: 999 },
      { id: 'g4', gemas: 2500, cent: 1999 }, { id: 'g5', gemas: 6500, cent: 4999, extra: 'Mejor precio' }],
    pase: { cent: 499, dias: 30 },
    precioCarta: { c: 10, r: 100, e: 1000, l: 40000 },
    paqueteCarta: { c: 20, r: 5, e: 1, l: 1 }
  };
  var MAZO_INICIAL = ['drones', 'cadetes', 'tirador', 'meteoro', 'torreta', 'tanque', 'misil', 'mecha'];

  return {
    CARTAS: CARTAS, MAPA: MAPA, CADETE: CADETE, RAREZAS: RAREZAS, NIVEL_MAX: NIVEL_MAX, copiasPara: copiasPara, creditosPara: creditosPara, multNivel: multNivel,
    XP_NIVEL: XP_NIVEL, nivelPorXp: nivelPorXp, multTorre: multTorre, ARENAS: ARENAS, arenaDe: arenaDe,
    COFRES: COFRES, CICLO: CICLO, HORAS_SUMINISTROS: HORAS_SUMINISTROS, CORONAS_DIA: CORONAS_DIA, generarCofre: generarCofre, gemasPorTiempo: gemasPorTiempo,
    TIENDA: TIENDA, MAZO_INICIAL: MAZO_INICIAL, cartasDe: cartasDe
  };
})();
