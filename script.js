/* ======================================================================
   SPACE SHOOTER — juego simple de "formación de enemigos" (shmup)
   Todo en un solo archivo, sin librerías. Pensado para ser fácil de
   leer y editar. Las secciones están marcadas con comentarios grandes.
   ====================================================================== */

// ---------- 1. CONFIGURACIÓN GENERAL (tocá esto para "moddear" el juego) ----------
const CONFIG = {
  canvasW: 680,
  canvasH: 560,

  player: {
    width: 15,
    height: 13,
    speed: 260,        // píxeles por segundo
    shootDelay: 0.38,  // segundos entre disparos
    lives: 3,
    color: 'var-cyan',
  },

  bullet: {
    speed: 420,
    width: 3,
    height: 10,
  },

  enemyBullet: {
    speed: 220,
    width: 3,
    height: 10,
  },

  // Formación de enemigos: filas de arriba (el "fondo", más lejos del
  // jugador) hacia abajo (más cerca del jugador).
  // Cada carácter = una posición; '.' = vacío.
  // g = grande (al fondo), m = mediana, c = chica (abajo, al medio)
  grid: [
    ".gggggggggg.",   // fila de abejas GRANDES, al fondo de todo
    "mmmmmmmmmmmm",    // fila de abejas MEDIANAS 1
    "mmmmmmmmmmmm",    // fila de abejas MEDIANAS 2
    ".cccccccccc.",    // fila de abejas CHICAS 1, abajo y al medio
    "..cccccccc..",    // fila de abejas CHICAS 2, abajo y al medio
  ],

  // Tamaño en pantalla según el tipo de abeja
  enemySizes: {
    small:  { w: 13, h: 10 },
    medium: { w: 18, h: 14 },
    large:  { w: 28, h: 22 },
  },

  enemyTypes: {
    // hitColor: color de flash cuando reciben un disparo (estilo clásico:
    // azul cuando quedan dañadas). Como mueren al segundo golpe, no llegan
    // a mostrar la fase "roja" (esa queda para la grande y el jefe).
    c: { color: '#feb1f2', score: 100, health: 2, size: 'small', hitColor: '#4da8ff' },
    m: { color: '#9a88d3', score: 200, health: 2, size: 'medium', hitColor: '#4da8ff' },
    // La grande necesita 3 disparos para morir, y cambia de color en
    // cada uno de esos 3 estados (stageColors) para avisar el daño:
    // azul con el primer golpe, rojo (crítico) con el segundo.
    g: {
      color: '#f8f9fe', score: 400, health: 3, size: 'large',
      stageColors: ['#4da8ff', '#4da8ff', '#ff4d4d'],
    },
  },

  enemyStep: 47,         // separación horizontal entre enemigos (más separadas)
  enemyRowStep: 50,      // separación vertical entre filas (más separadas)
  enemyMarch: {
    speed: 13,            // velocidad lateral de la formación (px/s) — despacio
    dropOnEdge: 3,        // bajoncito extra al tocar un borde
    creepSpeed: 3.2,       // descenso lento y CONTINUO de toda la formación (px/s)
  },

  diveSpeed: 150,         // velocidad de un enemigo en picada
  returnSpeed: 130,       // velocidad al volver desde abajo hacia la formación

  // Escudo protector: gira como un átomo alrededor de la nave. Ya NO se
  // activa solo con matar abejas: se activa cuando el jugador AGARRA
  // el pickup "BYTES CREATIVOS" (ver CONFIG.pickup más abajo). Dura 8s.
  shield: {
    duration: 10,        // segundos que dura (se apaga solo al llegar a 0)
    rotSpeed: 2.2,       // velocidad de giro (radianes/seg)
    radiusX: 26,
    radiusY: 11,
    color: '#43ff6b',    // verde
  },

  // Puntos que suma agarrar cualquiera de los dos pickups "BYTES CREATIVOS"
  // (el del escudo o el del disparo doble).
  pickupScore: 200,

  // Pickup "BYTES CREATIVOS" (escudo): cae cada 10 segundos, repitiendo
  // toda la partida. Mientras el escudo esté ACTIVO, o mientras ya haya
  // uno cayendo sin agarrar, no cae ninguno nuevo: el conteo de 10s
  // arranca recién cuando el escudo se termina.
  pickup: {
    interval: 10,           // segundos entre un pickup y el siguiente (tras terminar el efecto)
    fallSpeed: 90,           // velocidad de caída (px/s)
    width: 30,
    height: 30,
    color: '#43ff6b',        // verde
    label: 'BYTESCREATIVOS',
  },

  // Pickup "BYTES CREATIVOS" (disparo doble): dispara 2 balas (antes 3)
  // mientras esté activo. Igual que el del escudo: no cae uno nuevo
  // mientras el efecto esté activo o ya haya uno cayendo; el conteo de
  // 10s arranca cuando el efecto termina. Ya no tiene tope de apariciones
  // por partida.
  triplePickup: {
    interval: 10,
    duration: 9999,         // segundos que dura el disparo doble activo (como el escudo)
    fallSpeed: 90,
    width: 30,
    height: 30,
    color: '#ff6fd8',
    label: 'BYTESCREATIVOS',
    spreadOffset: 16,    // separación horizontal de las dos balas
    spreadVX: 50,        // inclinación leve de las dos balas hacia afuera
  },

  // Jefe final: aparece cuando se destruye toda la formación. Ahora es
  // más grande, más resistente (20 impactos) y dispara más seguido.
  // Cambia de color cada ~7 impactos (3 estados) y muere en el disparo 20.
  boss: {
    health: 60,
    width: 84,
    height: 68,
    colorStages: ['#53ff4d', '#4d85ff', '#ff4d4d'],
    score: 5000,
    entrySpeed: 30,       // velocidad de entrada, bajando desde arriba (rápida)
    targetY: 78,            // altura donde se queda a pelear
    hoverRangeX: 180,       // recorrido lateral mientras flota
    hoverSpeed: 1.1,        // velocidad del vaivén lateral
    shootInterval: 0.38,     // segundos entre disparos del jefe (dispara más seguido)
    minionEvery: 10,          // cada cuántos disparos del jefe suelta abejas
    minionCount: 3,          // cuántas abejas chicas suelta cada vez
    tauntDuration: 4.5,       // segundos que se ve en pantalla cada frase del jefe
    lowHealthRatio: 0.75,     // a partir de qué % de impactos recibidos se considera "poca vida" (dispara la 2da frase)
    tauntIdleMin: 6,          // mientras dura la pelea, cada tanto tira una frase "de aire" (charla suelta), sin esperar solo a golpes/muertes
    tauntIdleMax: 10,
  },

  // Oleadas de picada estilo Galaga: solo bajan estos "elegidos", nunca
  // toda la formación junta. La primera oleada manda 1 sola abeja, la
  // segunda 2, la tercera 3, y así sucesivamente sin tope artificial
  // (al final del juego pueden bajar oleadas grandes, tipo 10, 13...).
  diveWave: {
    firstDelay: 2.5,   // segundos antes de la primera oleada
    interval: 4,       // segundos entre el inicio de una oleada y la siguiente
    staggerMin: 0.35,  // separación mínima entre picadas de una misma oleada
    staggerMax: 1.5,   // separación máxima (para que bajen bien dispersas, no pegadas)
    maxPerWave: 4,     // tope de abejas que pueden bajar juntas en una misma oleada
    maxConcurrent: 3,  // tope total de abejas afuera (picando o volviendo) al mismo tiempo,
                       // contando también las que ya están en cola. Evita que oleadas
                       // sucesivas se solapen y vuelvan a verse "todas juntas" con el tiempo.
    retryDelay: 0.6,   // si no hay lugar/candidatas, reintenta lanzar oleada tras este ratito
  },

  // Animación de entrada al arrancar una partida nueva: la nave sube
  // lentamente desde abajo del todo y las abejas bajan desde arriba
  // hasta acomodarse en su formación, antes de mostrar "START".
  entrance: {
    duration: 5.3,          // segundos que tarda toda la formación en acomodarse
    staggerMax: 1.5,        // variación de arranque entre abejas (según su fase random)
    enemyDropDistance: 260, // cuánto más arriba (fuera de cámara) empiezan las abejas
    playerStartOffset: 90,  // cuánto más abajo (fuera de cámara) empieza la nave
    startTextDuration: 1.2, // cuánto se queda "START" en pantalla antes de habilitar el juego
  },
};

// ---------- 2. UTILIDADES ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives-icons');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const overlayBtn = document.getElementById('overlay-btn');
const titleNameInput = document.getElementById('title-name-input');
const aiCommentEl = document.getElementById('ai-comment');
const aiTitleEl = document.getElementById('ai-title');
const aiPredictionEl = document.getElementById('ai-prediction');
const titleStartBtn = document.getElementById('title-start-btn');
const highscoreListEl = document.getElementById('highscore-list');
const highscoreLiveScoreEl = document.getElementById('highscore-live-score');
const viewPodiumBtn = document.getElementById('view-podium-btn');
const podiumModal = document.getElementById('podium-modal');
const podiumHomeBtn = document.getElementById('podium-home-btn');
const podiumEls = {
  1: { name: document.querySelector('#podium-1 .podium-name'), score: document.querySelector('#podium-1 .podium-score') },
  2: { name: document.querySelector('#podium-2 .podium-name'), score: document.querySelector('#podium-2 .podium-score') },
  3: { name: document.querySelector('#podium-3 .podium-name'), score: document.querySelector('#podium-3 .podium-score') },
};

// Nombre del jugador: se pide en la pantalla de TÍTULO (antes de arrancar),
// no al final de la partida. Se guarda acá y se reutiliza para guardar el
// puntaje cuando termina el juego.
let currentPlayerName = 'JUGADOR';

// Predicción de puntaje hecha por la IA ANTES de arrancar la partida
// (pantalla de instrucciones). Se guarda acá para poder compararla con
// el puntaje real al final. predictionToken evita que una respuesta
// vieja (de un pedido anterior) pise a una más nueva si el jugador
// vuelve a pasar por la pantalla de instrucciones varias veces.
let aiPredictedScore = null;
let predictionToken = 0;

// ---------- HIGH SCORES (persisten en el navegador con localStorage) ----------
const HIGHSCORE_MAX = 8;

// Ya NO se guarda en localStorage: vive solo en esta variable, en
// memoria. Al recargar la página, se pierde y arranca vacía de nuevo.
let highScoresMemory = [];

function loadHighScores() {
  return highScoresMemory;
}

function addHighScore(name, score) {
  const list = loadHighScores();
  const cleanName = (name || 'JUGADOR').toUpperCase().slice(0, 12);
  list.push({ name: cleanName, score });
  list.sort((a, b) => b.score - a.score);
  highScoresMemory = list.slice(0, HIGHSCORE_MAX);
  renderHighScoreSidebar();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Dibuja la tabla de puntajes en el panel de la izquierda (como estaba).
// Se llama al arrancar la página y cada vez que se guarda un puntaje
// nuevo, así siempre está actualizada.
function renderHighScoreSidebar() {
  const list = loadHighScores();
  highscoreListEl.innerHTML = '';
  if (list.length === 0) {
    highscoreListEl.innerHTML = '<li class="hs-empty">Sin puntajes<br>todavía</li>';
  } else {
    list.forEach((entry, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="hs-rank">${i + 1}.</span>` +
        `<span class="hs-name">${escapeHtml(entry.name)}</span>` +
        `<span class="hs-score">${entry.score}</span>`;
      highscoreListEl.appendChild(li);
    });
  }
}

// Dibuja el podio horizontal (1°-2°-3°) dentro del modal.
function renderPodium() {
  const list = loadHighScores();
  for (let pos = 1; pos <= 3; pos++) {
    const entry = list[pos - 1];
    podiumEls[pos].name.textContent = entry ? entry.name : '---';
    podiumEls[pos].score.textContent = entry ? entry.score : '0';
  }
}

// ---------- Modal del PODIO ----------
// Se puede abrir desde "VER PODIO" (panel de escritorio) o tocando el
// SCORE del HUD (celular), en cualquier momento (título, mitad de
// partida, game over, etc). Cerrarlo (botón "VOLVER") simplemente lo
// oculta y te deja donde estabas, sin mandarte nunca al inicio ni
// cortar la partida. Si el juego estaba corriendo, lo pausamos
// mientras el modal está abierto y lo reanudamos al cerrarlo.
let podiumShouldResumeGame = false;

function openPodiumModal() {
  renderPodium();
  podiumShouldResumeGame = false;
  if (state && state.running && !state.paused) {
    state.paused = true;
    podiumShouldResumeGame = true;
  }
  podiumModal.classList.add('show');
}
function closePodiumModal() {
  podiumModal.classList.remove('show');
  if (podiumShouldResumeGame) {
    state.paused = false;
    podiumShouldResumeGame = false;
  }
}

viewPodiumBtn.addEventListener('click', openPodiumModal);

// En celular no está el panel lateral (ni el botón VER PODIO): tocar el
// SCORE del HUD abre el mismo modal del podio.
const hudScoreBtn = document.getElementById('hud-score-btn');
if (hudScoreBtn) hudScoreBtn.addEventListener('click', openPodiumModal);

podiumHomeBtn.addEventListener('click', closePodiumModal);

// Botón "INICIO" del modal del podio: cierra el modal (sin reanudar la
// partida, ya que nos vamos a la pantalla de título) y lleva directo a
// la primera pantalla del juego.
const podiumTitleBtn = document.getElementById('podium-title-btn');
if (podiumTitleBtn) {
  podiumTitleBtn.addEventListener('click', () => {
    podiumModal.classList.remove('show');
    podiumShouldResumeGame = false;
    showTitleScreen();
  });
}

// Duración (ms) de la transición del overlay definida en el CSS
// (#overlay / .show). Se usa para sincronizar los setTimeout del JS
// que encadenan una pantalla con la siguiente.
const OVERLAY_TRANSITION_MS = 320;

// ---- Transición "TV vieja" (apagado/encendido) ----
const crtScreen = document.getElementById('crt-screen');
const CRT_MS = 550; // debe coincidir con la duración de las animaciones tvOff/tvOn del CSS

// Colapsa toda la pantalla (canvas + overlay) como un televisor viejo al
// apagarse; justo cuando queda invisible (totalmente colapsada) ejecuta
// swapFn (cambia título/instrucciones/game over/reinicio ahí abajo, sin
// que se note el salto) y después la "enciende" de nuevo con la
// animación inversa.
function playCrtTransition(swapFn) {
  crtScreen.classList.remove('tv-on');
  void crtScreen.offsetWidth; // fuerza reflow para poder re-disparar la animación
  crtScreen.classList.add('tv-off');
  window.setTimeout(() => {
    swapFn();
    crtScreen.classList.remove('tv-off');
    crtScreen.classList.add('tv-on');
    window.setTimeout(() => {
      crtScreen.classList.remove('tv-on');
    }, CRT_MS + 30);
  }, CRT_MS);
}

// Transición moderna y prolija: una sola clase ("show") dispara fade +
// escala + blur vía CSS. Nada de piezas ni temporizadores por elemento:
// esto es robusto y siempre se ve, sin estados intermedios raros.
function showOverlay(title, text, buttonText, showName) {
  overlayTitle.textContent = title;
  overlayText.innerHTML = text;
  overlayBtn.textContent = buttonText;
  overlay.classList.remove('title-mode');
  // El comentario y el título de IA son solo para la pantalla de GAME
  // OVER, y la predicción es solo para la de instrucciones; en
  // cualquier otra pantalla (pausa, título) quedan vacíos y ocultos.
  aiCommentEl.textContent = '';
  aiCommentEl.classList.remove('ai-comment--visible');
  aiTitleEl.textContent = '';
  aiTitleEl.classList.remove('ai-comment--visible');
  aiPredictionEl.textContent = '';
  aiPredictionEl.classList.remove('ai-comment--visible');
  // El input de nombre solo se muestra en la pantalla de instrucciones
  // (antes de arrancar una partida nueva), no en pausa ni en game over.
  if (showName) {
    titleNameInput.style.display = 'block';
    titleNameInput.classList.remove('input-error');
    titleNameInput.value = currentPlayerName === 'JUGADOR' ? '' : currentPlayerName;
  } else {
    titleNameInput.style.display = 'none';
  }
  // Se saca y se vuelve a poner "show" para poder re-disparar la
  // transición aunque el overlay ya estuviera visible (p. ej. al pasar
  // directo de una pantalla a otra).
  overlay.classList.remove('show');
  void overlay.offsetWidth; // fuerza reflow: sin esto el navegador podría no re-animar
  requestAnimationFrame(() => {
    overlay.classList.add('show');
  });
  if (showName) {
    setTimeout(() => titleNameInput.focus(), 350);
  }
}

function hideOverlay() {
  overlay.classList.remove('show');
}

// Muestra la pantalla de título (BEE INVADERS + demo jugando sola de
// fondo). Se usa tanto al arrancar la página como al volver desde la
// pantalla de GAME OVER, para que el jugador siempre pase por "EMPEZAR"
// antes de arrancar una partida nueva.
function showTitleScreen() {
  resetGame();
  state.demoMode = true;
  overlayTitle.textContent = 'FORMACIÓN';
  renderHighScoreSidebar();
  overlay.classList.add('title-mode');
  overlay.classList.remove('show');
  void overlay.offsetWidth; // fuerza reflow para poder re-disparar la transición
  requestAnimationFrame(() => {
    overlay.classList.add('show');
  });
}

// ---------- Pantalla de TÍTULO ----------
// Vive dentro del mismo #overlay (aprovecha el mismo efecto de
// "explosión/armado" de partículas), pero muestra un layout propio con
// el nombre del juego arriba, el "demo" de la formación jugando sola
// de fondo (bien visible en el medio, sin overlay oscuro encima) y el
// logo de Bytes Creativos + botón EMPEZAR abajo. El nombre del jugador
// se pide recién en la 2da pantalla (instrucciones / "FORMACIÓN").
titleStartBtn.addEventListener('click', () => {
  playCrtTransition(() => {
    // Al taparse toda la pantalla con la cortina, cambiamos de título a
    // instrucciones: el jugador nunca ve el salto, solo la cortina.
 showOverlay(
  '¡ATENCIÓN!',
  `
  Los invasores quieren robarse nuestra información,<br>
  <strong>¡No podemos permitirlo!</strong>

  <br><br><br>

  Flechas <b>← →</b> para moverte,<br>
  <b>ESPACIO</b> para disparar.
  `,
  'JUGAR',
  true
);
    // Se pide apenas se muestra esta pantalla: mientras el jugador lee
    // las instrucciones y escribe su nombre (unos segundos), la
    // predicción ya está lista para cuando apriete "JUGAR". No agrega
    // espera ni bloquea nada.
    requestAiPrediction();
  });
});

// Frases de reserva para la predicción de puntaje (pantalla de
// instrucciones), por si el pedido a la IA falla, tarda de más, o
// contesta en un idioma que no es español. Así el cartelito de
// predicción NUNCA se queda vacío: siempre hay algo en pantalla, y si
// la IA contesta bien a tiempo, lo reemplaza.
const PREDICTION_FALLBACK_LINES = [
  '{name}, la máquina calcula {score} puntos para vos.',
  'Mi cálculo dice {score} puntos, {name}. A ver si acierto.',
  '{score} puntos, {name}. Esa es mi apuesta.',
  'Para {name} preveo {score} puntos. No me hagas quedar mal.',
  'La máquina va con {score} puntos para {name}.',
];
function pickPredictionFallback(name) {
  const score = 1200 + Math.floor(Math.random() * 3200);
  const template = PREDICTION_FALLBACK_LINES[Math.floor(Math.random() * PREDICTION_FALLBACK_LINES.length)];
  const line = template.replace('{name}', name).replace('{score}', score);
  return { predictedScore: score, line };
}

// Chequeo rápido y liviano para descartar respuestas de la IA que se
// escaparon en inglés a pesar de las instrucciones del prompt (se
// reutiliza el mismo criterio en toda la pantalla de instrucciones y
// en la de game over).
const ENGLISH_TELLS = /\b(the|you|your|and|is|are|was|were|this|that|i'm|im|don't|dont|gonna|going|will|can't|cant|what|with|have|has|not|for)\b/gi;
function looksSpanish(text) {
  if (!text) return false;
  const matches = text.match(ENGLISH_TELLS);
  if (!matches) return true;
  const wordCount = text.trim().split(/\s+/).length;
  return matches.length / wordCount < 0.34;
}

// Pide una predicción de puntaje con onda arcade ANTES de que arranque
// la partida ("la máquina cree que vas a hacer X puntos..."). Si falla
// o tarda de más, simplemente no se muestra nada, igual que el resto
// de los pedidos a la IA en este juego: nunca bloquea ni rompe la
// experiencia en el evento.
function requestAiPrediction() {
  const myToken = ++predictionToken;
  const nameForPrediction = titleNameInput.value.trim() || currentPlayerName || 'PILOTO';

  // Se muestra al toque una predicción de reserva (siempre en español)
  // para que el cartelito nunca se vea vacío ni tarde en aparecer.
  const fallback = pickPredictionFallback(nameForPrediction);
  aiPredictedScore = fallback.predictedScore;
  aiPredictionEl.textContent = fallback.line;
  aiPredictionEl.classList.add('ai-comment--visible');

  (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500);
      const res = await fetch('/api/predict-score', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ playerName: nameForPrediction }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (myToken !== predictionToken) return; // ya se pidió otra más nueva
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      if (data && data.line && data.predictedScore && looksSpanish(data.line)) {
        aiPredictionEl.textContent = data.line;
        aiPredictedScore = Number(data.predictedScore) || fallback.predictedScore;
      }
      // Si vino vacío, incompleto o en otro idioma, se queda la
      // predicción de reserva que ya se está mostrando.
    } catch (err) {
      // silencioso a propósito: ya se ve la predicción de reserva
    }
  })();
}

// ---------- SPRITES (imágenes reales, carpeta images/ junto a este archivo) ----------
// Nave normal / nave con disparo triple activo, y las 4 abejas (chica,
// mediana, grande, jefe final) según el diseño pasado por el usuario.
const SPRITE_PATHS = {
  shipNormal:  'images/ship_normal.png',
  shipBoosted: 'images/ship_boosted.png',
  beeSmall:    'images/bee_small.png',
  beeMedium:   'images/bee_medium.png',
  beeLarge:    'images/bee_large.png',
  beeBoss:     'images/bee_boss.png',
  pickupShield: 'images/pickup_shield.png',
  pickupTriple: 'images/pickup_triple.png',
};
const sprites = {};
for (const key in SPRITE_PATHS) {
  const img = new Image();
  img.src = SPRITE_PATHS[key];
  sprites[key] = img;
}

// Dibuja un sprite centrado en (cx, cy), manteniendo su proporción real,
// con un ancho objetivo (targetW) y rotación opcional (radianes).
function drawSpriteCentered(img, cx, cy, targetW, rotation) {
  if (!img.complete || !img.naturalWidth) return;
  const ratio = img.naturalHeight / img.naturalWidth;
  const w = targetW;
  const h = targetW * ratio;
  ctx.save();
  ctx.translate(cx, cy);
  if (rotation) ctx.rotate(rotation);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawSpriteCenteredWH(img, cx, cy, targetW, targetH, rotation) {
  if (!img.complete || !img.naturalWidth) return;
  ctx.save();
  ctx.translate(cx, cy);
  if (rotation) ctx.rotate(rotation);
  ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
  ctx.restore();
}

// Dibuja un sprite con un efecto de "moneda girando": se achica en el
// eje horizontal hasta casi desaparecer (el "de canto") y vuelve a
// ensancharse, como una moneda rotando sobre su eje vertical. spinScale
// va de -1 a 1 (por eso a veces el sprite se ve "espejado" al pasar
// por el otro lado del giro, tal cual pasaría con una moneda real).
function drawSpriteCenteredSpin(img, cx, cy, targetW, targetH, spinScale) {
  if (!img.complete || !img.naturalWidth) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(spinScale, 1);
  ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
  ctx.restore();
}

// Cache de versiones "teñidas" de cada sprite (para el flash de daño),
// generadas una sola vez por combinación sprite+tamaño+color y reusadas
// en cada frame (así no se recalcula nada pesado en el loop principal).
const tintCache = new Map();
function getTintedSprite(img, targetW, tintColor, tintAlpha) {
  if (!img.complete || !img.naturalWidth) return null;
  const ratio = img.naturalHeight / img.naturalWidth;
  const w = Math.max(1, Math.round(targetW));
  const h = Math.max(1, Math.round(targetW * ratio));
  const key = img.src + '|' + w + 'x' + h + '|' + tintColor + '|' + tintAlpha;
  let off = tintCache.get(key);
  if (off) return off;
  off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const octx = off.getContext('2d');
  // Sin suavizado: las abejas son sprites pixel-art de baja resolución
  // a propósito, y queremos que se vean "cuadraditas" (ocho bits) al
  // agrandarlas, no borrosas.
  octx.imageSmoothingEnabled = false;
  octx.drawImage(img, 0, 0, w, h);
  if (tintColor && tintAlpha > 0) {
    octx.globalCompositeOperation = 'source-atop';
    octx.globalAlpha = tintAlpha;
    octx.fillStyle = tintColor;
    octx.fillRect(0, 0, w, h);
  }
  tintCache.set(key, off);
  return off;
}

// Igual que drawSpriteCentered, pero pasando por el cache de tinte (para
// el flash de daño de las abejas / jefe).
function drawTintedSpriteCentered(img, cx, cy, targetW, tintColor, tintAlpha, rotation) {
  const off = getTintedSprite(img, targetW, tintColor, tintAlpha);
  if (!off) return;
  ctx.save();
  ctx.translate(cx, cy);
  if (rotation) ctx.rotate(rotation);
  ctx.drawImage(off, -off.width / 2, -off.height / 2);
  ctx.restore();
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ---------- 3. ESTADO DEL JUEGO ----------
let state = null; // se crea en resetGame()

function resetGame() {
  state = {
    running: false,
    paused: false,
    score: 0,
    lives: CONFIG.player.lives,
    player: {
      x: CONFIG.canvasW / 2 - CONFIG.player.width / 2,
      y: CONFIG.canvasH - 50,
      w: CONFIG.player.width,
      h: CONFIG.player.height,
      shootCooldown: 0,
      alive: true,
      blinkTimer: 0,
    },
    bullets: [],       // disparos del jugador
    enemyBullets: [],  // disparos enemigos
    particles: [],     // partículas de la explosión de la nave
    floatingTexts: [], // textos flotantes chiquitos (ej: "+200" al agarrar un pickup)
    enemies: [],
    formation: {
      dir: 1,          // 1 = derecha, -1 = izquierda
      offsetX: 0,
      offsetY: 0,
    },
    diveWaveNumber: 0,
    diveWaveTimer: CONFIG.diveWave.firstDelay,
    diveQueue: [],   // enemigos ya "elegidos" esperando su turno de bajar
    beeKillStreak: 0,        // (ya no se usa para el pickup, queda por si se necesita)
    pickups: [],              // pickups "BYTES CREATIVOS" cayendo
    pickupTimer: CONFIG.pickup.interval,
    pickupCycleCount: 0,       // cuántos escudos cayeron desde el último disparo triple (cada 2, toca triple)
    enemiesKilled: 0,          // para el comentario de IA al final de la partida
    shieldsCollected: 0,       // para el comentario de IA al final de la partida
    triplesCollected: 0,       // para el comentario de IA al final de la partida
    lastKillX: CONFIG.canvasW / 2,
    lastKillY: 200,
    triplePickups: [],         // pickups de disparo doble cayendo
    triplePickupTimer: CONFIG.triplePickup.interval,
    tripleShotActive: false,   // true mientras tenga el disparo doble
    tripleShotTimer: 0,        // segundos restantes del disparo doble activo
    shield: { active: false, timer: 0, angle: 0 },
    boss: null,                // se crea cuando aparece el jefe final
    bossSpawned: false,        // para no invocarlo dos veces
    bossPhase: false,          // true una vez que empezó la pelea final
    bossAnnounceTimer: 0,      // cartelito "¡JEFE FINAL!" al aparecer
    bossTaunt: { text: '', timer: 0, kind: 'normal' },   // frase del jefe que se ve en pantalla (texto, sin voz)
    bossTauntAppearRequested: false,     // para pedir la frase de "apareció" una sola vez
    bossTauntLowHealthRequested: false,  // para pedir la frase de "poca vida" una sola vez
    bossTauntIdleTimer: 0,                // cuenta regresiva para la próxima frase "de aire" del jefe durante la pelea
    victoryDelay: 0,            // espera a que termine la explosión del jefe antes de mostrar VICTORIA
    defeatDelay: 0,              // espera a que termine la explosión final antes de mostrar GAME OVER
    keys: {},
    stars: makeStarfield(60),
    demoMode: false,        // true solo en la pantalla de título (simulación automática)
    demoT: 0,
    pendingScoreSave: false, // true cuando hay que guardar el puntaje al high score
    entering: false,     // true mientras la nave/abejas se están acomodando al arrancar
    enterT: 0,           // tiempo transcurrido de la animación de entrada
    startTextTimer: 0,   // cuenta regresiva mostrando "START" antes de habilitar el juego
    formationToOrbit: false, // true cuando la formación debe convertirse a órbita
    playerExiting: false, // true cuando el avión se va hacia arriba después de ganar
    playerExitTimer: 0,   // tiempo de salida del avión
  };
  buildEnemyGrid();
  updateHud();
}

function buildEnemyGrid() {
  const rows = CONFIG.grid;
  const startX = (CONFIG.canvasW - (rows[0].length - 1) * CONFIG.enemyStep) / 2;
  const startY = 20;

  rows.forEach((row, rowIndex) => {
    [...row].forEach((ch, colIndex) => {
      if (ch === '.') return;
      const type = CONFIG.enemyTypes[ch];
      if (!type) return;
      const size = CONFIG.enemySizes[type.size];
      state.enemies.push({
        type: ch,
        baseX: startX + colIndex * CONFIG.enemyStep,
        baseY: startY + rowIndex * CONFIG.enemyRowStep,
        w: size.w,
        h: size.h,
        health: type.health,
        alive: true,
        damaged: false,
        diving: false,
        returning: false,
        orbiting: false,
        orbitEntering: false,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitRadius: 60 + Math.random() * 80,
        orbitSpeed: 1.5 + Math.random() * 1.5,
        lastShot: Math.random() * 2,
        hasShot: false,
        secondShot: false,
        diveT: 0,
        diveStartX: 0,
        diveStartY: 0,
        wigglePhase: Math.random() * Math.PI * 2,
      });
    });
  });
}

function makeStarfield(n) {
  const stars = [];
  for (let i = 0; i < n; i++) {
    stars.push({
      x: Math.random() * CONFIG.canvasW,
      y: Math.random() * CONFIG.canvasH,
      speed: 20 + Math.random() * 60,
      size: Math.random() < 0.15 ? 2 : 1,
    });
  }
  return stars;
}

// ---------- 4. INPUT ----------
window.addEventListener('keydown', (e) => {
  if (!state) return;
  state.keys[e.code] = true;
  if (e.code === 'Space') e.preventDefault();
  if (e.code === 'KeyP' && state.running) togglePause();
});
window.addEventListener('keyup', (e) => {
  if (!state) return;
  state.keys[e.code] = false;
});

overlayBtn.addEventListener('click', () => {
  if (state && state.paused) {
    state.paused = false;
    hideOverlay();
    return;
  }
  // Si venimos de la pantalla de GAME OVER (hay puntaje pendiente de
  // guardar), no arrancamos otra partida de una: volvemos a la pantalla
  // de título, para que el jugador pase de nuevo por "EMPEZAR".
  const cameFromGameOver = state && state.pendingScoreSave;

  // Si venimos de la pantalla de instrucciones (JUGAR), es obligatorio
  // haber escrito un nombre: si está vacío, no se deja arrancar.
  if (!cameFromGameOver) {
    const typedName = titleNameInput.value.trim();
    if (!typedName) {
      titleNameInput.classList.remove('input-error');
      void titleNameInput.offsetWidth; // fuerza reflow para re-disparar la animación
      titleNameInput.classList.add('input-error');
      titleNameInput.focus();
      return;
    }
    currentPlayerName = typedName.toUpperCase().slice(0, 12);
  }

  playCrtTransition(() => {
    if (cameFromGameOver) {
      addHighScore(currentPlayerName, state.score);
      state.pendingScoreSave = false;
      showTitleScreen();
    } else {
      resetGame();
      startEntrance();
      hideOverlay();
    }
  });
});

titleNameInput.addEventListener('keydown', (e) => {
  if (e.code === 'Enter') overlayBtn.click();
});

function togglePause() {
  state.paused = !state.paused;
  if (state.paused) {
    showOverlay('PAUSA', 'Apretá P para continuar.', 'CONTINUAR');
  } else {
    hideOverlay();
  }
}

// ---------- 5. LÓGICA DE ACTUALIZACIÓN ----------
function update(dt) {
  if (state.demoMode) {
    // Modo "demo" (pantalla de título): la nave se mueve y dispara sola
    // y la formación marcha/pica como en el juego real, pero es 100%
    // decorativo — sin colisiones ni fin de juego — para que se vea
    // como una simulación del juego jugándose de fondo.
    updateDemoAutopilot(dt);
    updatePlayer(dt);
    updateFormation(dt);
    updateEnemies(dt);
    updateBullets(dt);
    updateStars(dt);
    updateParticles(dt);
    updateFloatingTexts(dt);
    updateShield(dt);
    updateTripleShot(dt);
    return;
  }

  if (state.entering) {
    // Fase de acomodo: la nave sube desde abajo y las abejas bajan desde
    // arriba hasta su lugar. Sin control del jugador todavía.
    updateEntrance(dt);
    updateStars(dt);
    return;
  }

  if (state.startTextTimer > 0) {
    // Fase de "START": todo quieto en su lugar, solo se ve el cartelito
    // un instante antes de habilitar el juego de verdad.
    state.startTextTimer -= dt;
    updateStars(dt);
    if (state.startTextTimer <= 0) state.running = true;
    return;
  }

  if (!state.running || state.paused) return;

  updatePlayer(dt);
  updateFormation(dt);
  updateEnemies(dt);
  updateBoss(dt);
  updateBullets(dt);
  updatePickupSpawners(dt);
  updatePickups(dt);
  updateTriplePickups(dt);
  updateStars(dt);
  updateParticles(dt);
  updateFloatingTexts(dt);
  updateShield(dt);
  updateTripleShot(dt);
  if (state.bossAnnounceTimer > 0) state.bossAnnounceTimer -= dt;
  if (state.bossTaunt.timer > 0) state.bossTaunt.timer -= dt;
  checkCollisions();
  checkWinLose();

  if (state.victoryDelay > 0) {
    state.victoryDelay -= dt;
    if (state.victoryDelay <= 0) gameOver(true);
  }
  if (state.defeatDelay > 0) {
    state.defeatDelay -= dt;
    if (state.defeatDelay <= 0) gameOver(false);
  }
}

// "Jugador fantasma" de la pantalla de título: se mueve de un lado al
// otro en cámara lenta y dispara todo el tiempo, simulando que alguien
// está jugando.
function updateDemoAutopilot(dt) {
  state.demoT += dt;
  const target = CONFIG.canvasW / 2 + Math.sin(state.demoT * 0.6) * 150;
  const cx = state.player.x + state.player.w / 2;
  state.keys['ArrowLeft'] = cx > target + 4;
  state.keys['ArrowRight'] = cx < target - 4;
  state.keys['Space'] = true;
}

// El escudo gira todo el tiempo que está activo y se apaga solo al
// terminar su duración (unos 10 segundos, ver CONFIG.shield.duration)
function updateShield(dt) {
  const s = state.shield;
  s.angle += CONFIG.shield.rotSpeed * dt;
  if (s.active) {
    s.timer -= dt;
    if (s.timer <= 0) s.active = false;
  }
}

// El disparo doble dura CONFIG.triplePickup.duration segundos y se apaga
// solo, igual que el escudo (antes era permanente hasta morir).
function updateTripleShot(dt) {
  if (state.tripleShotActive) {
    state.tripleShotTimer -= dt;
    if (state.tripleShotTimer <= 0) state.tripleShotActive = false;
  }
}

// Prepara la animación de entrada: coloca a la nave bien abajo (fuera de
// cámara) y a las abejas bien arriba de su lugar en la formación, listas
// para que updateEntrance() las vaya deslizando hasta su posición real.
function startEntrance() {
  const cfg = CONFIG.entrance;
  state.entering = true;
  state.enterT = 0;
  state.running = false;
  state.startTextTimer = 0;

  const targetY = CONFIG.canvasH - 50;
  state.player.y = targetY + cfg.playerStartOffset;
  state.player.x = CONFIG.canvasW / 2 - state.player.w / 2;

  for (const e of state.enemies) {
    e.x = e.baseX;
    e.y = e.baseY - cfg.enemyDropDistance;
  }
}

// Anima el acomodo: la nave sube en cámara lenta hasta su posición final
// y cada abeja baja desde arriba hasta su lugar en la formación, con un
// pequeño desfasaje (según su fase random) para que no se muevan todas
// perfectamente sincronizadas — se ve más orgánico, como acomodándose.
function updateEntrance(dt) {
  const cfg = CONFIG.entrance;
  state.enterT += dt;

  const p = state.player;
  const targetY = CONFIG.canvasH - 50;
  const startY = targetY + cfg.playerStartOffset;
  const playerT = clamp(state.enterT / cfg.duration, 0, 1);
  const easedP = 1 - Math.pow(1 - playerT, 3);
  p.y = startY + (targetY - startY) * easedP;

  const f = state.formation;
  const denom = Math.max(0.001, cfg.duration - cfg.staggerMax);
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const delay = (e.wigglePhase / (Math.PI * 2)) * cfg.staggerMax;
    const t = clamp((state.enterT - delay) / denom, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    e.x = e.baseX + f.offsetX;
    e.y = e.baseY + f.offsetY - (1 - eased) * cfg.enemyDropDistance;
  }

  if (state.enterT >= cfg.duration) {
    state.entering = false;
    p.y = targetY;
    state.startTextTimer = cfg.startTextDuration;
  }
}

function updatePlayer(dt) {
  const p = state.player;
  if (!p.alive) {
    if (state.lives <= 0) return; // sin vidas: no revive, se queda viendo la explosión final
    p.blinkTimer -= dt;
    if (p.blinkTimer <= 0) respawnPlayer();
    return;
  }

  const speed = CONFIG.player.speed * dt;
  if (state.keys['ArrowLeft'] || state.keys['KeyA'])  p.x -= speed;
  if (state.keys['ArrowRight'] || state.keys['KeyD']) p.x += speed;
  p.x = clamp(p.x, 8, CONFIG.canvasW - p.w - 8);

  p.shootCooldown -= dt;
  if ((state.keys['Space']) && p.shootCooldown <= 0) {
    const cx = p.x + p.w / 2 - CONFIG.bullet.width / 2;
    const topY = p.y - 6;
    if (state.tripleShotActive) {
      // Disparo DOBLE (antes triple): dos balas, sin la del centro,
      // saliendo un poco separadas y ligeramente inclinadas hacia afuera.
      const off = CONFIG.triplePickup.spreadOffset;
      const vx = CONFIG.triplePickup.spreadVX;
      state.bullets.push({ x: cx - off, y: topY, w: CONFIG.bullet.width, h: CONFIG.bullet.height, vx: -vx });
      state.bullets.push({ x: cx + off, y: topY, w: CONFIG.bullet.width, h: CONFIG.bullet.height, vx: vx });
      state.bullets.push({ x: cx, y: topY, w: CONFIG.bullet.width, h: CONFIG.bullet.height, vx: 0 });

    } else {
      state.bullets.push({ x: cx, y: topY, w: CONFIG.bullet.width, h: CONFIG.bullet.height, vx: 0 });
    }
    p.shootCooldown = CONFIG.player.shootDelay;
  }
}

function respawnPlayer() {
  const p = state.player;
  p.alive = true;
  p.x = CONFIG.canvasW / 2 - p.w / 2;
}

function updateFormation(dt) {
  const f = state.formation;
  f.offsetX += CONFIG.enemyMarch.speed * f.dir * dt;

  // Descenso lento y CONTINUO de toda la formación, muy de a poco,
  // independiente de si rebota contra los bordes o no.
  f.offsetY += CONFIG.enemyMarch.creepSpeed * dt;

  // Calculamos el ancho actual de la formación viva para saber los bordes
  // (las que están picando, volviendo u orbitando no cuentan, no siguen la marcha)
  const alive = state.enemies.filter(e => e.alive && !e.diving && !e.returning && !e.orbiting);
  if (alive.length === 0) return;
  const minX = Math.min(...alive.map(e => e.baseX)) + f.offsetX;
  const maxX = Math.max(...alive.map(e => e.baseX)) + f.offsetX;

  if (minX < 10 || maxX > CONFIG.canvasW - 26) {
    f.dir *= -1;
    f.offsetY += CONFIG.enemyMarch.dropOnEdge;
  }

  // Cuando la formación toca el suelo, convertir a órbita
  let anyTouchingFloor = false;
  for (const e of alive) {
    const screenY = e.baseY + f.offsetY;
    if (screenY > CONFIG.canvasH - 40) {
      anyTouchingFloor = true;
      break;
    }
  }
  
  // Si detectamos que toca el suelo, marcar todas para órbita
  if (anyTouchingFloor && !state.formationToOrbit) {
    state.formationToOrbit = true;
  }
  
  // Convertir todas las abejas en formación a órbita simultáneamente
  if (state.formationToOrbit) {
    for (const e of alive) {
      if (!e.orbiting) {
        e.orbiting = true;
        e.orbitAngle = Math.random() * Math.PI * 2;
        e.orbitRadius = 60 + Math.random() * 80;
        e.orbitSpeed = 1.5 + Math.random() * 1.5;
        e.lastShot = 0;
        e.orbitEntering = true;
        // Aparecen desde arriba para transición limpia
        e.y = -24;
        e.x = CONFIG.canvasW / 2 + (Math.random() - 0.5) * 60;
      }
    }
  }
}

function updateDiveWaves(dt) {
  const wave = CONFIG.diveWave;

  // 1) ¿Toca lanzar una oleada nueva?
  state.diveWaveTimer -= dt;
  if (state.diveWaveTimer <= 0) {
    // Candidatas: todas las abejas (grandes y chicas) que estén tranquilas
    // en la formación (ni picando ni volviendo)
const large = state.enemies.filter(
  e => e.alive && !e.diving && !e.returning && e.type === "large"
);

const others = state.enemies.filter(
  e => e.alive && !e.diving && !e.returning && e.type !== "large"
);

const candidates = [...large, ...large, ...large, ...others];
    // Además del tope por oleada, contamos cuántas ya están "afuera"
    // (picando o volviendo) MÁS las que ya están en cola esperando su
    // turno. Si ya hay muchas afuera, no lanzamos una oleada nueva todavía:
    // así dos oleadas nunca se solapan y se ve como "todas juntas" cuando
    // la partida lleva rato. Simplemente reintenta un poco más tarde.
    const outNow = state.enemies.filter(e => e.alive && (e.diving || e.returning)).length;
    const roomLeft = wave.maxConcurrent - outNow - state.diveQueue.length;

    if (candidates.length > 0 && roomLeft > 0) {
      state.diveWaveNumber += 1;
      // Oleada 1 = 1 abeja, oleada 2 = 2, ... hasta el tope maxPerWave (para
      // que nunca bajen "todas juntas" ni en bloques grandes pegados, por
      // más avanzada que esté la partida). Nunca más de las que quedan
      // vivas y tranquilas, ni más de lo que permite el tope global.
      const count = Math.min(state.diveWaveNumber, candidates.length, wave.maxPerWave, roomLeft);

      // Elegimos "count" abejitas al azar de la formación actual
      const chosen = [];
      const pool = [...candidates];
      for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        chosen.push(pool.splice(idx, 1)[0]);
      }

      // Las metemos en la cola con demoras bien separadas para que se vean
      // dispersas, nunca pegadas ni todas al mismo tiempo.
      let delayAcc = 0;
      for (const enemy of chosen) {
        delayAcc += wave.staggerMin + Math.random() * (wave.staggerMax - wave.staggerMin);
        state.diveQueue.push({ enemy, delay: delayAcc });
      }
      state.diveWaveTimer = wave.interval;
    } else {
      // No había lugar (o no había candidatas): probamos de nuevo en un
      // ratito corto, no esperamos el intervalo completo.
      state.diveWaveTimer = wave.retryDelay;
    }
  }

  // 2) Procesamos la cola: cuando el delay de cada una llega a cero, despega
  for (const item of state.diveQueue) {
    item.delay -= dt;
  }
  state.diveQueue = state.diveQueue.filter(item => {
    if (item.delay > 0) return true;
    if (item.enemy.alive && !item.enemy.diving && !item.enemy.returning) {
      startDive(item.enemy);
    }
    return false;
  });
}

function startDive(e) {
  e.diving = true;
  e.returning = false;
  e.diveT = 0;
  e.hasShot = false;
  e.diveStartX = e.x;
  e.diveStartY = e.y;
}

// Calcula la velocidad (vx, vy) que debe tener un disparo enemigo para
// ir apuntado hacia donde está la nave EN EL MOMENTO de disparar (no la
// sigue después, solo apunta al tirar). Si por algún motivo el enemigo
// dispara justo desde la posición de la nave (dist 0), cae derecho.
function aimedBulletVelocity(fromX, fromY) {
  const targetX = state.player.x + state.player.w / 1;
  const targetY = state.player.y + state.player.h / 1;
  const dx = targetX - fromX;
  const dy = targetY - fromY;
  const dist = Math.hypot(dx, dy) || 1;
  const speed = CONFIG.enemyBullet.speed;
  return { vx: (dx / dist) * speed, vy: (dy / dist) * speed };
}

function updateEnemies(dt) {
  const f = state.formation;
  updateDiveWaves(dt);

  for (const e of state.enemies) {
    if (!e.alive) continue;

    if (e.diving) {
      // --- PICADA: baja e intenta seguir al avión (solo las grandes) ---
      e.diveT += dt;
      e.y = e.diveStartY + CONFIG.diveSpeed * e.diveT;
      
      if (e.type === 'g') {
        // Abejas grandes: persiguen al avión mientras bajan
        const playerCenterX = state.player.x + state.player.w / 2;
        const targetX = playerCenterX;
        const dx = targetX - e.x;
        const followSpeed = 130; // velocidad de persecución horizontal (px/s)
        const step = followSpeed * dt;
        e.x += Math.sign(dx) * Math.min(Math.abs(dx), step);
      } else {
        // Abejas chicas: bajan con vaivén normal
        const drift = e.isMinion ? (e.diveVX || 0) * e.diveT : 0;
        e.x = e.diveStartX + drift + Math.sin(e.diveT * 3 + (e.wigglePhase || 0)) * 30;      }

      if (!e.hasShot && e.diveT > 0.25) {
        state.enemyBullets.push({
          x: e.x + e.w / 3 - CONFIG.enemyBullet.width / 2,
          y: e.y + e.h,
          w: CONFIG.enemyBullet.width,
          h: CONFIG.enemyBullet.height,
          ...aimedBulletVelocity(e.x + e.w / 2, e.y + e.h),
        });
        e.hasShot = true;
      }
      
      // Abejas grandes disparan una segunda vez
      if (e.type === 'g' && !e.secondShot && e.diveT > 0.5) {
        state.enemyBullets.push({
          x: e.x + e.w / 2 - CONFIG.enemyBullet.width / 2,
          y: e.y + e.h,
          w: CONFIG.enemyBullet.width,
          h: CONFIG.enemyBullet.height,
          ...aimedBulletVelocity(e.x + e.w / 2, e.y + e.h),
        });
        e.secondShot = true;
      }

      // Las abejas grandes bajan hasta muy cerca del jugador (más peligrosas)
      // o tocan el suelo: van a órbita
      let shouldReturn = false;
      if (e.type === 'g') {
        if (e.y > state.player.y - 20) {
          shouldReturn = true;
        }
        if (e.y > CONFIG.canvasH - 40) {
          // Toca el suelo: va a órbita
          e.diving = false;
          e.orbiting = true;
          e.orbitEntering = true;
          e.y = -24;
          e.x = CONFIG.canvasW / 2 + (Math.random() - 0.5) * 60;
          e.orbitAngle = Math.random() * Math.PI * 2;
          e.orbitRadius = 60 + Math.random() * 80;
          e.orbitSpeed = 1.5 + Math.random() * 1.5;
          e.lastShot = 0;
          shouldReturn = false;
        }
      } else {
        if (e.y > CONFIG.canvasH + 20) {
          shouldReturn = true;
        }
      }

      if (shouldReturn) {
        if (e.isMinion) {
          e.diving = false;
          e.alive = false;
        } else {
          // Terminó de cruzar la pantalla: reaparece arriba y vuela de
          // regreso hasta acomodarse en su lugar dentro del grupo.
          e.diving = false;
          e.returning = true;
          e.y = -24;
          e.x = e.baseX + f.offsetX;
        }
      }
    } else if (e.returning) {
      // --- REGRESO: vuela desde arriba hasta reinsertarse en su lugar
      // exacto dentro del grupo, O a órbita si la formación ya toca el suelo ---
      const targetX = e.baseX + f.offsetX;
      const targetY = e.baseY + f.offsetY;
      
      // Si la formación toca el suelo, ir a órbita en lugar de volver a formación
      if (targetY > CONFIG.canvasH - 40) {
        e.returning = false;
        e.orbiting = true;
        e.orbitEntering = true;
        e.y = -24;
        e.x = CONFIG.canvasW / 2 + (Math.random() - 0.5) * 60;
        e.orbitAngle = Math.random() * Math.PI * 2;
        e.orbitRadius = 60 + Math.random() * 80;
        e.orbitSpeed = 1.5 + Math.random() * 1.5;
        e.lastShot = 0;
      } else {
        const dx = targetX - e.x;
        const dy = targetY - e.y;
        const dist = Math.hypot(dx, dy);
        const step = CONFIG.returnSpeed * dt;

        if (dist <= step) {
          // Llegó: se reinserta en el grupo y vuelve a marchar normal
          e.returning = false;
          e.x = targetX;
          e.y = targetY;
        } else {
          e.x += (dx / dist) * step;
          e.y += (dy / dist) * step;
        }
      }
    } else if (e.orbiting) {
      // --- ÓRBITA: primero suben desde arriba, luego vuelan en círculo disparando ---
      const centerX = CONFIG.canvasW / 2;
      const centerY = CONFIG.canvasH / 2 - 40;
      const targetOrbitX = centerX + Math.cos(e.orbitAngle) * e.orbitRadius;
      const targetOrbitY = centerY + Math.sin(e.orbitAngle) * e.orbitRadius;
      
      if (e.orbitEntering) {
        // Fase de entrada: suben desde arriba hasta su punto de órbita
        const dx = targetOrbitX - e.x;
        const dy = targetOrbitY - e.y;
        const dist = Math.hypot(dx, dy);
        const step = CONFIG.returnSpeed * dt;
        
        if (dist <= step) {
          // Llegaron a su punto de órbita
          e.orbitEntering = false;
          e.x = targetOrbitX;
          e.y = targetOrbitY;
        } else {
          e.x += (dx / dist) * step;
          e.y += (dy / dist) * step;
        }
      } else {
        // Fase de órbita normal: vuelan en círculo
        e.orbitAngle += e.orbitSpeed * dt;
        e.x = centerX + Math.cos(e.orbitAngle) * e.orbitRadius;
        e.y = centerY + Math.sin(e.orbitAngle) * e.orbitRadius;
      }
      
      // Disparar mientras órbita
      e.lastShot += dt;
      if (e.lastShot > 1.5) {
        state.enemyBullets.push({
          x: e.x + e.w / 2 - CONFIG.enemyBullet.width / 2,
          y: e.y + e.h,
          w: CONFIG.enemyBullet.width,
          h: CONFIG.enemyBullet.height,
          ...aimedBulletVelocity(e.x + e.w / 2, e.y + e.h),
        });
        e.lastShot = 0;
      }
    } else {
      // --- FORMACIÓN NORMAL: sigue la marcha lateral + descenso lento ---
      e.x = e.baseX + f.offsetX;
      e.y = e.baseY + f.offsetY;
    }
  }
}

// ---------- JEFE FINAL ----------
// Aparece cuando ya no queda ninguna abeja de la formación. Baja desde
// arriba, se acomoda, y a partir de ahí flota de lado a lado disparando.
function spawnBoss() {
  state.bossSpawned = true;
  state.bossPhase = true;
  state.bossAnnounceTimer = 2.2;
  const cfg = CONFIG.boss;
  state.boss = {
    baseX: CONFIG.canvasW / 2 - cfg.width / 2,
    x: CONFIG.canvasW / 2 - cfg.width / 2,
    y: -cfg.height,
    w: cfg.width,
    h: cfg.height,
    hitsTaken: 0,
    alive: true,
    entering: true,
    driftPhase: 0,
    shootTimer: cfg.shootInterval,
    shotCount: 0,
  };
  state.bossTauntIdleTimer = cfg.tauntIdleMin + Math.random() * (cfg.tauntIdleMax - cfg.tauntIdleMin);
  requestBossTaunt('appear');
}

// Frases de reserva, siempre en español y referidas solo al juego,
// por si el pedido a la IA falla, tarda de más, o devuelve algo vacío.
// Así el cartelito del jefe NUNCA aparece vacío/negro: se muestra esta
// frase al toque y, si la IA contesta a tiempo con algo mejor, la
// reemplaza.
const BOSS_TAUNT_FALLBACKS = {
  appear: [
    'Che, ¿en serio pensaste que esto iba a ser fácil?',
    'Bienvenido a mi oficina, pichón.',
    'Relajate que esto recién arranca.',
    'A ver si aguantás el ritmo, campeón.',
  ],
  idle: [
    'Todo bien por ahí, piloto?',
    'Che, esto está tranqui todavía...',
    'No te apures que no me voy a ningún lado.',
    'Estoy re cómoda acá arriba, ¿eh?',
    'Dale, mostrame algo mejor.',
    'Un embole esta pelea, la verdad.',
  ],
  lowhealth: [
    'Bueno, esto no lo tenía en los planes...',
    'Ni ahí me vas a tumbar tan fácil.',
    'Un par de golpes no me bajan del todo.',
    'Ah mirá, con que venías en serio.',
  ],
  laugh: [
    'Jaja, otra nave menos, tranqui.',
    'Quedate ahí en el piso, campeón.',
    'Una vida menos, así nomás.',
    'Ese ruidito de explosión es una masa.',
  ],
  laughcaps: [
    'JAJAJAJAJA TE REVENTÉ, CAMPEÓN',
    'JAJAJA CAÍSTE COMO PICHÓN',
    'JAJAJAJA ESO TE PASA POR VENIR SOLO',
    'JAJAJAJA OTRA NAVE A LA BASURA',
  ],
};

function pickBossTauntFallback(phase) {
  const list = BOSS_TAUNT_FALLBACKS[phase] || BOSS_TAUNT_FALLBACKS.appear;
  return list[Math.floor(Math.random() * list.length)];
}

// Pide una frase de provocación del jefe (texto, sin voz) para
// mostrar en pantalla mientras se sigue jugando: no pausa nada, no
// agrega tiempo de partida. Muestra al toque una frase de reserva
// (siempre en español, siempre sobre el juego) y, si la IA contesta a
// tiempo con algo válido, la reemplaza por la generada.
function requestBossTaunt(phase) {
  if (!state || !state.bossPhase) return;
  const kind = phase === 'laughcaps' ? 'laughcaps' : 'normal';
  state.bossTaunt.text = pickBossTauntFallback(phase);
  state.bossTaunt.timer = CONFIG.boss.tauntDuration;
  state.bossTaunt.kind = kind;

  const scoreAtRequest = state.score;
  (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5500);
      const res = await fetch('/api/boss-taunt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phase, score: scoreAtRequest, playerName: currentPlayerName }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      const taunt = (data && typeof data.taunt === 'string') ? data.taunt.trim() : '';
      // Si para cuando llega la respuesta ya se terminó la pelea (o la
      // partida), no la mostramos: no tiene sentido pisada arriba de
      // otra pantalla. Tampoco si vino vacía/muy corta o no parece
      // español (nos quedamos con la frase de reserva que ya se ve).
      if (taunt.length > 2 && looksSpanish(taunt) && state && state.bossPhase) {
        state.bossTaunt.text = taunt;
        state.bossTaunt.timer = CONFIG.boss.tauntDuration;
        state.bossTaunt.kind = kind;
      }
    } catch (err) {
      // silencioso a propósito: ya se ve la frase de reserva, nunca
      // bloquea ni rompe la pelea
    }
  })();
}

function updateBoss(dt) {
  const b = state.boss;
  if (!b || !b.alive) return;
  const cfg = CONFIG.boss;

  if (b.entering) {
    // Entrada: baja derechito hasta su posición de pelea
    b.y += cfg.entrySpeed * dt;
    if (b.y >= cfg.targetY) {
      b.y = cfg.targetY;
      b.entering = false;
    }
    return;
  }

  // Vaivén lateral constante mientras pelea
  b.driftPhase += dt * cfg.hoverSpeed;
  b.x = b.baseX + Math.sin(b.driftPhase) * cfg.hoverRangeX;
  b.x = clamp(b.x, 10, CONFIG.canvasW - b.w - 10);

  // Charla suelta del jefe cada tanto mientras dura la pelea, para que
  // no se quede mudo si el jugador no le pega ni se muere por un rato.
  state.bossTauntIdleTimer -= dt;
  if (state.bossTauntIdleTimer <= 0) {
    state.bossTauntIdleTimer = cfg.tauntIdleMin + Math.random() * (cfg.tauntIdleMax - cfg.tauntIdleMin);
    requestBossTaunt('idle');
  }

  // Disparo periódico; cada "minionEvery" disparos, además suelta abejas
  b.shootTimer -= dt;
  if (b.shootTimer <= 0) {
    b.shootTimer = cfg.shootInterval;
    state.enemyBullets.push({
      x: b.x + b.w / 2 - CONFIG.enemyBullet.width / 2,
      y: b.y + b.h,
      w: CONFIG.enemyBullet.width,
      h: CONFIG.enemyBullet.height,
      fromBoss: true, // para saber, si mata al jugador, que fue el jefe y no un minion
    });
    b.shotCount += 1;
    if (b.shotCount % cfg.minionEvery === 0) {
      spawnBossMinions();
    }
  }
}

// El jefe suelta 3 abejas chicas que caen picando y disparan una vez,
// igual que las abejas de la formación en picada, pero estas no vuelven
// a ninguna formación (ver isMinion en updateEnemies).
function spawnBossMinions() {
  const b = state.boss;
  if (!b) return;
  const size = CONFIG.enemySizes.small;
  const type = CONFIG.enemyTypes.c;
  const count = CONFIG.boss.minionCount;
  for (let i = 0; i < count; i++) {
   const startX = b.x + b.w / 2 - size.w / 2 + (i - (count - 1) / 2) * 40;
    const startY = b.y + b.h / 2;
    const spreadDir = i - (count - 1) / 2;
    state.enemies.push({
      type: 'c',
      baseX: startX,
      baseY: startY,
      x: startX,
      y: startY,
      w: size.w,
      h: size.h,
      health: type.health,
      alive: true,
      damaged: false,
      diving: true,
      returning: false,
      hasShot: false,
      diveT: 0,
      diveStartX: startX,
      diveStartY: startY,
      diveVX: spreadDir * (55 + Math.random() * 25),
      isMinion: true,
      wigglePhase: Math.random() * Math.PI * 2,
    });
  }
}

// ---------- PICKUP "BYTES CREATIVOS" ----------
// Ciclo fijo: por cada 2 pickups de escudo que caen, cae 1 de disparo
// triple (escudo, escudo, triple, escudo, escudo, triple, ...). Cada tipo
// mantiene su propio timer/intervalo de caída (CONFIG.pickup / CONFIG.
// triplePickup), solo cambia CUÁL de los dos toca a continuación.
// Si el tipo que toca en el ciclo no puede caer todavía (por ejemplo, el
// jugador ya tiene ese efecto activo) pero el otro sí está permitido y
// listo, cae el otro para no trabar el spawn.
function updatePickupSpawners(dt) {
  if (state.pickups.length > 0 || state.triplePickups.length > 0) return;

  state.pickupTimer -= dt;
  state.triplePickupTimer -= dt;

  const shieldAllowed = !state.shield.active;
  const tripleAllowed = !state.tripleShotActive;
  const shieldReady = shieldAllowed && state.pickupTimer <= 0;
  const tripleReady = tripleAllowed && state.triplePickupTimer <= 0;

  if (!shieldReady && !tripleReady) return;

  const wantedType = state.pickupCycleCount >= 2 ? 'triple' : 'shield';
  const wantedReady = wantedType === 'shield' ? shieldReady : tripleReady;

  if (wantedReady) {
    spawnNextPickup(wantedType);
    return;
  }

  // El tipo que toca en el ciclo todavía no está permitido: si el otro
  // sí está listo, que caiga ese en su lugar.
  if (shieldReady) {
    spawnNextPickup('shield');
  } else if (tripleReady) {
    spawnNextPickup('triple');
  }
}

function spawnNextPickup(type) {
  const jitter = 1.5 + Math.random() * 3.5;
  if (type === 'shield') {
    const cfg = CONFIG.pickup;
    state.pickupTimer = cfg.interval + jitter;
    spawnPickupAt(Math.random() * (CONFIG.canvasW - cfg.width), -cfg.height);
    state.pickupCycleCount += 1;
  } else {
    const cfg = CONFIG.triplePickup;
    state.triplePickupTimer = cfg.interval + jitter;
    spawnTriplePickupAt(Math.random() * (CONFIG.canvasW - cfg.width), -cfg.height);
    state.pickupCycleCount = 0; // arranca de nuevo el conteo hacia el próximo triple
  }
}

function spawnPickupAt(x, y) {
  const cfg = CONFIG.pickup;
  state.pickups.push({
    x: clamp(x, 6, CONFIG.canvasW - cfg.width - 6),
    y: y,
    w: cfg.width,
    h: cfg.height,
  });
}

function spawnTriplePickupAt(x, y) {
  const cfg = CONFIG.triplePickup;
  state.triplePickups.push({
    x: clamp(x, 6, CONFIG.canvasW - cfg.width - 6),
    y: y,
    w: cfg.width,
    h: cfg.height,
  });
}

function updatePickups(dt) {
  for (const pk of state.pickups) {
    pk.y += CONFIG.pickup.fallSpeed * dt;
  }
  state.pickups = state.pickups.filter(pk => pk.y < CONFIG.canvasH + 20 && !pk.hit);
}

function updateTriplePickups(dt) {
  for (const pk of state.triplePickups) {
    pk.y += CONFIG.triplePickup.fallSpeed * dt;
  }
  state.triplePickups = state.triplePickups.filter(pk => pk.y < CONFIG.canvasH + 20 && !pk.hit);
}

function updateBullets(dt) {
  state.bullets.forEach(b => {
    b.y -= CONFIG.bullet.speed * dt;
    if (b.vx) b.x += b.vx * dt;
  });
  state.bullets = state.bullets.filter(b => b.y + b.h > 0);

  state.enemyBullets.forEach(b => {
    if (b.vx !== undefined) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    } else {
      b.y += CONFIG.enemyBullet.speed * dt;
    }
  });
  state.enemyBullets = state.enemyBullets.filter(b => b.y < CONFIG.canvasH && b.x > -20 && b.x < CONFIG.canvasW + 20);
}

function updateStars(dt) {
  for (const s of state.stars) {
    s.y += s.speed * dt;
    if (s.y > CONFIG.canvasH) {
      s.y = 0;
      s.x = Math.random() * CONFIG.canvasW;
    }
  }
}

function checkCollisions() {
  // Balas del jugador vs enemigos
  for (const b of state.bullets) {
    for (const e of state.enemies) {
      if (!e.alive || b.hit) continue;
      if (rectsOverlap(b, e)) {
        b.hit = true;
        e.health -= 1;

        if (e.health <= 0) {
          // Último golpe: explota y muere
          e.alive = false;
          spawnBeeExplosion(e.x + e.w / 2, e.y + e.h / 2, CONFIG.enemyTypes[e.type].color);
          state.score += CONFIG.enemyTypes[e.type].score;
          state.enemiesKilled += 1;
          state.lastKillX = e.x + e.w / 2;
          state.lastKillY = e.y + e.h / 2;
          updateHud();
        } else {
          // Todavía no muere, pero queda "marcada" (cambia de color)
          e.damaged = true;
        }
      }
    }
  }

  // Balas del jugador vs el jefe final
  if (state.boss && state.boss.alive && !state.boss.entering) {
    for (const b of state.bullets) {
      if (b.hit || !state.boss.alive) continue;
      if (rectsOverlap(b, state.boss)) {
        b.hit = true;
        state.boss.hitsTaken += 1;
        if (!state.bossTauntLowHealthRequested &&
            state.boss.alive &&
            state.boss.hitsTaken >= CONFIG.boss.health * CONFIG.boss.lowHealthRatio) {
          state.bossTauntLowHealthRequested = true;
          requestBossTaunt('lowhealth');
        }
        if (state.boss.hitsTaken >= CONFIG.boss.health) {
          state.boss.alive = false;
          spawnBossExplosion(state.boss.x + state.boss.w / 2, state.boss.y + state.boss.h / 2);
          state.score += CONFIG.boss.score;
          updateHud();
          state.victoryDelay = 5; // deja ver toda la explosión antes de la pantalla de victoria
        }
      }
    }
  }
  state.bullets = state.bullets.filter(b => !b.hit);

  // Balas enemigas vs jugador
  const p = state.player;
  if (p.alive) {
    // Pickup "BYTES CREATIVOS" (escudo): si la nave lo toca, se activa el escudo por 8s
    for (const pk of state.pickups) {
      if (!pk.hit && rectsOverlap(pk, p)) {
        pk.hit = true;
        state.shield.active = true;
        state.shield.timer = CONFIG.shield.duration;
        state.score += CONFIG.pickupScore;
        state.shieldsCollected += 1;
        spawnScorePopup(pk.x + pk.w / 2, pk.y + pk.h / 2, CONFIG.pickupScore);
        updateHud();
      }
    }
    // Pickup "BYTES CREATIVOS" (disparo doble): si la nave lo toca, activa
    // el disparo doble por CONFIG.triplePickup.duration segundos.
    for (const pk of state.triplePickups) {
      if (!pk.hit && rectsOverlap(pk, p)) {
        pk.hit = true;
        state.tripleShotActive = true;
        state.tripleShotTimer = CONFIG.triplePickup.duration;
        state.score += CONFIG.pickupScore;
        state.triplesCollected += 1;
        spawnScorePopup(pk.x + pk.w / 2, pk.y + pk.h / 2, CONFIG.pickupScore);
        updateHud();
      }
    }
    for (const b of state.enemyBullets) {
      if (rectsOverlap(b, p)) {
        b.hit = true;
        if (state.shield.active) {
          spawnShieldSpark(b.x, b.y);
        } else {
          loseLife(!!b.fromBoss);
        }
      }
    }
    // Choque directo con un enemigo en picada
    for (const e of state.enemies) {
      if (e.alive && e.diving && rectsOverlap(e, p)) {
        e.alive = false;
        if (state.shield.active) {
          // El escudo la revienta en el acto, sin perder vidas
          spawnBeeExplosion(e.x + e.w / 2, e.y + e.h / 2, CONFIG.enemyTypes[e.type].color);
        } else {
          loseLife();
        }
      }
    }
    
    // Choque directo con un enemigo en formación o en órbita
    for (const e of state.enemies) {
      if (e.alive && !e.diving && !e.returning && rectsOverlap(e, p)) {
        e.alive = false;
        if (state.shield.active) {
          // El escudo la revienta en el acto, sin perder vidas
          spawnBeeExplosion(e.x + e.w / 2, e.y + e.h / 2, CONFIG.enemyTypes[e.type].color);
        } else {
          loseLife();
        }
      }
    }
  }
  state.enemyBullets = state.enemyBullets.filter(b => !b.hit);
}

function loseLife(diedFromBossBullet) {
  const p = state.player;
  state.tripleShotActive = false; // si te matan, se pierde el disparo doble
  state.tripleShotTimer = 0;
  state.lives -= 1;
  if (state.lives <= 0) {
    spawnFinalExplosion(p.x + p.w / 2, p.y + p.h / 2);
  } else {
    spawnExplosion(p.x + p.w / 2, p.y + p.h / 2);
  }
  // Si te matan durante la pelea contra el jefe, se ríe de vos. Si fue
  // una bala DEL JEFE la que te tumbó (no un minion ni un choque), se
  // caga de risa en mayúsculas, bien sobrador.
  if (state.bossPhase) {
    requestBossTaunt(diedFromBossBullet ? 'laughcaps' : 'laugh');
  }
  p.alive = false;
  p.blinkTimer = 1.2;
  updateHud();
  if (state.lives <= 0) {
    state.defeatDelay = 5; // deja ver toda la explosión final antes de GAME OVER
  }
}

// ---- Explosión FINAL de la nave (última vida): más grande que las
// explosiones normales y dura unos 5 segundos, para que se note bien
// que fue la última vida y se perdió la partida ----
function spawnFinalExplosion(x, y) {
  const colors = ['#fff', '#ffd23f', '#ff9d3d', '#ff3d3d', '#ff3d81'];
  for (let i = 0; i < 160; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 70 + Math.random() * 320;
    state.particles.push({
      x: x + (Math.random() - 0.8) * 150,
      y: y + (Math.random() - 0.8) * 150,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 3 + Math.random() * 2,
      maxLife: 3 + Math.random() * 2,
      size: 2 + Math.random() * 4.5,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
}

// ---- Explosión de la nave: una lluvia de partículas de colores cálidos
// que se disparan en todas direcciones y se apagan solas ----
// ---- Explosión GIGANTE del jefe final: un millón de pedazos de colores ----
function spawnBossExplosion(x, y) {
  const colors = ['#fff', '#ffd23f', '#ff9d3d', '#ff3d3d', '#4dfff0', '#ff3d81', '#b6ff3d', '#ffe066'];
  for (let i = 0; i < 220; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 520;
    state.particles.push({
      x: x + (Math.random() - 0.8) * 150,
      y: y + (Math.random() - 0.8) * 150,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 3 + Math.random() * 2,
      maxLife: 3 + Math.random() * 2,
      size: 2 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
}

function spawnExplosion(x, y) {
  const colors = ['#fff', '#ffd23f', '#ff9d3d', '#ff3d3d'];
  for (let i = 0; i < 22; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 160;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.4 + Math.random() * 0.35,
      maxLife: 0.4 + Math.random() * 0.35,
      size: 2 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
}

// ---- Explosión de una abeja al morir: partículas más chicas, con el
// color propio del tipo mezclado con el amarillo/negro de la abeja ----
function spawnBeeExplosion(x, y, accent) {
  const colors = ['#ffd23f', '#fff', accent, '#1a1a1a'];
  for (let i = 0; i < 14; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 120;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed * 0.45,
      vy: Math.sin(angle) * speed * 0.35 - 90 - Math.random() * 50,
      life: 0.3 + Math.random() * 0.25,
      maxLife: 0.3 + Math.random() * 0.25,
      size: 2 + Math.random() * 2.5,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
  state.particles.push({
    x, y,
    vx: 0,
    vy: -180,
    life: 0.22,
    maxLife: 0.22,
    size: 3.5,
    color: '#fff',
  });
}

// ---- Chispita chiquita cuando el escudo bloquea un disparo enemigo ----
function spawnShieldSpark(x, y) {
  for (let i = 0; i < 6; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 60;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.2 + Math.random() * 0.15,
      maxLife: 0.2 + Math.random() * 0.15,
      size: 1.5 + Math.random() * 1.5,
      color: CONFIG.shield.color,
    });
  }
}

// ---- Textito flotante chiquito (ej: "+200" al agarrar un pickup): sube
// despacio y se desvanece. Se dibuja bien pequeño para que no tape la
// acción del juego. ----
function spawnScorePopup(x, y, amount) {
  state.floatingTexts.push({
    x, y,
    text: `+${amount}`,
    vy: -34,
    life: 0.9,
    maxLife: 0.9,
  });
}

function updateFloatingTexts(dt) {
  for (const ft of state.floatingTexts) {
    ft.y += ft.vy * dt;
    ft.vy *= 0.97;
    ft.life -= dt;
  }
  state.floatingTexts = state.floatingTexts.filter(ft => ft.life > 0);
}

function drawFloatingTexts() {
  if (state.floatingTexts.length === 0) return;
  ctx.save();
  ctx.font = "7px 'Press Start 2P', monospace"; // chiquito, a propósito
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const ft of state.floatingTexts) {
    const t = clamp(ft.life / ft.maxLife, 0, 1);
    ctx.globalAlpha = t;
    // leve crecimiento al aparecer y achique al final, para que se sienta vivo
    const scale = 0.85 + 0.15 * Math.min(1, (ft.maxLife - ft.life) / 0.15) * t + (1 - t) * 0.1;
    ctx.save();
    ctx.translate(ft.x, ft.y);
    ctx.scale(scale, scale);
    ctx.fillStyle = CONFIG.pickup.color;
    ctx.shadowColor = CONFIG.pickup.color;
    ctx.shadowBlur = 6;
    ctx.fillText(ft.text, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function updateParticles(dt) {
  for (const pt of state.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.94; // fricción, para que frenen de a poco
    pt.vy *= 0.94;
    pt.life -= dt;
  }
  state.particles = state.particles.filter(pt => pt.life > 0);
}

function drawParticles() {
  for (const pt of state.particles) {
    const alpha = clamp(pt.life / pt.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
}

function checkWinLose() {
  if (state.bossPhase) return; // la victoria/derrota del jefe se maneja en checkCollisions
  if (!state.bossSpawned && state.enemies.length > 0 && state.enemies.every(e => !e.alive)) {
    spawnBoss();
  }
}

function gameOver(won) {
  state.running = false;
  
  // Calcular bono por vidas restantes
  let lifesBonus = 0;
  if (state.lives >= 3) {
    lifesBonus = 1500;
  } else if (state.lives === 2) {
    lifesBonus = 800;
  } else if (state.lives === 1) {
    lifesBonus = 500;
  }
  
  // Sumar bono al puntaje final
  state.score += lifesBonus;
  
  const bonusText = lifesBonus > 0 ? `<br><span style="color:var(--neon-lime)">BONUS VIDAS: +${lifesBonus}</span>` : '';

  // Si hubo una predicción de la IA antes de arrancar (pantalla de
  // instrucciones), la comparamos con el puntaje real: es el "gancho"
  // de cierre de la predicción. Se calcula acá mismo (sin depender de
  // otro pedido a la IA) para que se muestre siempre, sin esperar a
  // nada más.
  let predictionCompareText = '';
  if (typeof aiPredictedScore === 'number') {
    predictionCompareText = state.score >= aiPredictedScore
      ? `<br><span style="color:var(--neon-amber)">La máquina predijo ${aiPredictedScore} y vos hiciste ${state.score}: ¡la superaste!</span>`
      : `<br><span style="color:var(--neon-amber)">La máquina predijo ${aiPredictedScore}... te quedaste en ${state.score}.</span>`;
  }
  const predictedScoreForComment = aiPredictedScore;
  // Se limpia acá: la próxima predicción vale solo para la próxima
  // partida (se vuelve a pedir cuando se muestre la pantalla de
  // instrucciones de nuevo).
  aiPredictedScore = null;

  const resultLine = won
    ? `Puntaje final: <span style="color:var(--neon-lime)">${state.score}</span>${bonusText}${predictionCompareText}`
    : `Puntaje final: <span style="color:var(--neon-pink)">${state.score}</span>${bonusText}${predictionCompareText}`;
  playCrtTransition(() => {
    showOverlay(
      won ? '¡FORMACIÓN DESTRUIDA!' : 'GAME OVER',
      `${resultLine}<br>¡Buen juego, ${escapeHtml(currentPlayerName)}! Tu puntaje se guarda en la tabla.`,
      'GUARDAR Y JUGAR DE NUEVO'
    );
    state.pendingScoreSave = true;
    requestAiGameOverComment({
      won,
      score: state.score,
      lives: state.lives,
      reachedBoss: state.bossSpawned,
      enemiesKilled: state.enemiesKilled,
      shieldsCollected: state.shieldsCollected,
      triplesCollected: state.triplesCollected,
      playerName: currentPlayerName,
      predictedScore: predictedScoreForComment,
    });
  });
}

// Pide un comentario cortito generado con IA sobre CÓMO fue esta
// partida en particular (no es texto fijo: cambia según el puntaje,
// si llegó al jefe, cuántos pickups agarró, etc). Si el pedido falla
// o tarda de más, simplemente no se muestra nada — el resto de la
// pantalla de GAME OVER ya se ve bien sin esto, así que nunca bloquea
// ni rompe la experiencia en el evento.
// Frases y títulos de reserva para la pantalla de GAME OVER, por si el
// pedido a la IA falla, tarda de más, o contesta en otro idioma. Con
// esto el comentario y el título NUNCA se quedan mudos ni aparecen en
// inglés: siempre hay algo en español y, si la IA contesta bien a
// tiempo, lo reemplaza por su versión (más específica de esa partida).
const GAMEOVER_COMMENT_FALLBACK_WIN = [
  'Le hiciste morder el polvo a toda la colmena, campeón.',
  'La reina se va a acordar de vos por un buen rato.',
  'Formación destruida y jefe abajo: partidón.',
  'Ni las abejas más bravas te pudieron parar hoy.',
];
const GAMEOVER_COMMENT_FALLBACK_LOSE = [
  'Las abejas se quedaron con las ganas de más, pero casi.',
  'Buen intento, piloto, la próxima la sacás.',
  'La colmena zafó por poco esta vez.',
  'Diste pelea antes de caer, eso vale.',
];
const GAMEOVER_TITLE_FALLBACK_WIN = [
  'Exterminador de Colmenas',
  'Piloto Letal',
  'Verdugo de la Reina',
  'Terror de las Abejas',
];
const GAMEOVER_TITLE_FALLBACK_LOSE = [
  'Piloto en Entrenamiento',
  'Carnada de Abejas',
  'Sobreviviente Tercos',
  'Casi Casi Campeón',
];
function pickGameOverFallback(won) {
  const comments = won ? GAMEOVER_COMMENT_FALLBACK_WIN : GAMEOVER_COMMENT_FALLBACK_LOSE;
  const titles = won ? GAMEOVER_TITLE_FALLBACK_WIN : GAMEOVER_TITLE_FALLBACK_LOSE;
  return {
    message: comments[Math.floor(Math.random() * comments.length)],
    title: titles[Math.floor(Math.random() * titles.length)],
  };
}

// Pide un comentario cortito generado con IA sobre CÓMO fue esta
// partida en particular (no es texto fijo: cambia según el puntaje,
// si llegó al jefe, cuántos pickups agarró, etc). Se muestra al toque
// un comentario/título de reserva (siempre en español) para que la
// pantalla nunca se quede muda, y si la IA contesta bien a tiempo (y
// en español), lo reemplaza por su versión específica de esta partida.
async function requestAiGameOverComment(stats) {
  const fallback = pickGameOverFallback(stats.won);
  aiCommentEl.textContent = fallback.message;
  aiCommentEl.classList.add('ai-comment--visible');
  aiTitleEl.textContent = `Título obtenido: ${fallback.title}`;
  aiTitleEl.classList.add('ai-comment--visible');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch('/api/gameover-message', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(stats),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error('bad response');
    const data = await res.json();
    // Si para cuando llega la respuesta el jugador ya volvió a jugar o
    // cerró la pantalla, no la mostramos pisada arriba de otra cosa.
    if (!state.pendingScoreSave) return;
    if (data && data.message && looksSpanish(data.message)) {
      aiCommentEl.textContent = data.message;
    }
    // Si vino vacío o en otro idioma, se queda el comentario de
    // reserva que ya se está mostrando (nunca en blanco, nunca en inglés).
    if (data && data.title && looksSpanish(data.title)) {
      aiTitleEl.textContent = `Título obtenido: ${data.title}`;
    }
  } catch (err) {
    // silencioso a propósito: ya se ve el comentario/título de reserva
  }
}

function updateHud() {
  scoreEl.textContent = state.score;
  highscoreLiveScoreEl.textContent = state.score;
  livesEl.innerHTML = '';
  for (let i = 0; i < Math.max(state.lives, 0); i++) {
    const icon = document.createElement('span');
    icon.className = 'life-icon';
    livesEl.appendChild(icon);
  }
}

// ---------- 6. DIBUJADO ----------
function draw() {
  ctx.clearRect(0, 0, CONFIG.canvasW, CONFIG.canvasH);
  if (!state) return;

  drawStars();
  drawEnemies();
  drawBoss();
  drawBossHealthBar();
  drawPickups();
  drawTriplePickups();
  drawBullets();
  drawShield();
  drawPlayer();
  drawParticles();
  drawFloatingTexts();
  drawBossAnnounce();
  drawBossTaunt();
  drawStartText();
}

// Cartelito "START" que aparece un instante justo después de que la nave
// y las abejas terminaron de acomodarse, antes de habilitar el juego.
function drawStartText() {
  if (state.startTextTimer <= 0) return;
  const cfg = CONFIG.entrance;
  ctx.save();
  ctx.font = "22px 'Press Start 2P', monospace";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const alpha = clamp(state.startTextTimer / cfg.startTextDuration, 0, 1);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#cdfa47';
  ctx.shadowColor = '#cdfa47';
  ctx.shadowBlur = 14;
  ctx.fillText('START', CONFIG.canvasW / 2, CONFIG.canvasH / 2 - 20);
  ctx.restore();
}

// Escudo protector: 3 aros verdes girando alrededor de la nave, como los
// anillos de un átomo. Cada aro es una elipse inclinada a un ángulo
// distinto (0°, 60°, 120°) que además gira con el tiempo.
function drawShield() {
  const s = state.shield;
  if (!s.active) return;
  const p = state.player;
  if (!p.alive) return;

  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  const cfg = CONFIG.shield;

  // Parpadea un toque en el último segundo y medio para avisar que se acaba
  const fading = s.timer < 1.5;
  const alpha = fading ? (0.4 + 0.6 * Math.abs(Math.sin(s.timer * 8))) : 1;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = cfg.color;
  ctx.shadowColor = cfg.color;
  ctx.shadowBlur = 8;
  ctx.lineWidth = 1.6;

  const tilts = [0, Math.PI / 3, (Math.PI / 3) * 2];
  for (const tilt of tilts) {
    ctx.save();
    ctx.rotate(tilt + s.angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, cfg.radiusX, cfg.radiusY, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function drawStars() {
  ctx.fillStyle = 'rgba(200,200,255,0.5)';
  for (const s of state.stars) {
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
}

function drawPlayer() {
  const p = state.player;
  if (!p.alive) return;
  // Nave normal (verde) o la variante que aparece con el disparo triple
  // activo (gris-verde con pods rosas), según el diseño pasado.
  const img = state.tripleShotActive ? sprites.shipBoosted : sprites.shipNormal;
  const targetW = p.w * 1.7; // un poco más grande que el hitbox para que se note el diseño
  drawSpriteCentered(img, p.x + p.w / 2, p.y + p.h / 2, targetW, 0);
}

// Qué sprite e imagen usar y cuánto agrandarlo (visualmente) según el
// tamaño lógico de la abeja (el hitbox de colisión no cambia).
function beeSpriteFor(size) {
  if (size === 'small') return { img: sprites.beeSmall, scale: 1.6 };
  if (size === 'medium') return { img: sprites.beeMedium, scale: 1.45 };
  return { img: sprites.beeLarge, scale: 1.3 };
}

function drawEnemies() {
  const t = performance.now() / 1000;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const type = CONFIG.enemyTypes[e.type];
    let tintColor = null, tintAlpha = 0;
    if (type.stageColors) {
      // Abeja grande: un ligero tinte de color por encima del arte real,
      // que se intensifica con cada golpe recibido (0, 1 o 2 golpes).
      const hitsTaken = type.health - e.health;
      const stage = clamp(hitsTaken, 0, type.stageColors.length - 1);
      if (stage > 0) {
        tintColor = type.stageColors[stage];
        tintAlpha = stage === 1 ? 0.38 : 0.55;
      }
    } else if (e.damaged) {
      // Chica/mediana: se ponen azules cuando ya recibieron el primer golpe
      // (look clásico, en vez del flash blanco/transparente anterior)
      tintColor = type.hitColor || '#4da8ff';
      tintAlpha = 0.6;
    }
    const { img, scale } = beeSpriteFor(type.size);
    // Mismo "mínimo movimiento" que tenían antes (el aleteo): ahora un
    // balanceo sutil de rotación, con fase propia para que no se muevan
    // todas sincronizadas.
    const wiggle = Math.sin(t * 4 + (e.wigglePhase || 0)) * 0.05;
    drawTintedSpriteCentered(img, e.x + e.w / 2, e.y + e.h / 2, e.w * scale, tintColor, tintAlpha, wiggle);
  }
}

function drawBullets() {
  ctx.fillStyle = '#fff';
  ctx.shadowColor = '#fff';
  ctx.shadowBlur = 6;
  for (const b of state.bullets) ctx.fillRect(b.x, b.y, b.w, b.h);

  ctx.fillStyle = '#ff3d81';
  ctx.shadowColor = '#ff3d81';
  for (const b of state.enemyBullets) ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.shadowBlur = 0;
}

// Pickup "BYTES CREATIVOS" (escudo): la palabra en verde, cayendo
function drawPickups() {
  if (state.pickups.length === 0) return;
  const img = sprites.pickupShield;
  const useImage = img.complete && img.naturalWidth;
  if (useImage) {
    // Los garabatos son sprites pixel-art (8 bits): sin suavizado para
    // que se vean "cuadraditos" y nítidos al escalarlos, con un leve
    // balanceo (giro + un poquito de "respiración" de tamaño) para que
    // no se vean estáticos mientras caen.
    const t = performance.now() / 1000;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const pk of state.pickups) {
      // Efecto "moneda girando": el sprite gira sobre su eje vertical
      // mientras cae (se angosta y se vuelve a ensanchar en bucle).
      const spinScale = Math.cos(t * 3.4 + pk.x);
      const size = Math.max(pk.w, pk.h) * 1.35;
      drawSpriteCenteredSpin(img, pk.x + pk.w / 2, pk.y + pk.h / 2, size, size, spinScale);
    }
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.font = "7px 'Press Start 2P', monospace";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CONFIG.pickup.color;
  ctx.shadowColor = CONFIG.pickup.color;
  ctx.shadowBlur = 8;
  for (const pk of state.pickups) {
    const cx = pk.x + pk.w / 2;
    const cy = pk.y + pk.h / 2;
    const r = pk.w / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.globalAlpha = 0.18;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = CONFIG.pickup.color;
    ctx.stroke();
    ctx.fillText('BYTES', cx, cy - 5);
    ctx.fillText('CREATIVOS', cx, cy + 5);
  }
  ctx.restore();
}

// Pickup "BYTES CREATIVOS" (disparo doble): misma idea que el del escudo,
// pero en rosa, para diferenciarlos de un vistazo.
function drawTriplePickups() {
  if (state.triplePickups.length === 0) return;
  const img = sprites.pickupTriple;
  const useImage = img.complete && img.naturalWidth;
  if (useImage) {
    const t = performance.now() / 1000;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const pk of state.triplePickups) {
      // Efecto "moneda girando": el sprite gira sobre su eje vertical
      // mientras cae (se angosta y se vuelve a ensanchar en bucle).
      const spinScale = Math.cos(t * 3.4 + pk.x);
      const size = Math.max(pk.w, pk.h) * 1.35;
      drawSpriteCenteredSpin(img, pk.x + pk.w / 2, pk.y + pk.h / 2, size, size, spinScale);
    }
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.font = "7px 'Press Start 2P', monospace";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CONFIG.triplePickup.color;
  ctx.shadowColor = CONFIG.triplePickup.color;
  ctx.shadowBlur = 8;
  for (const pk of state.triplePickups) {
    const cx = pk.x + pk.w / 2;
    const cy = pk.y + pk.h / 2;
    const r = pk.w / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.globalAlpha = 0.18;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = CONFIG.triplePickup.color;
    ctx.stroke();
    ctx.fillText('BYTES', cx, cy - 5);
    ctx.fillText('CREATIVOS', cx, cy + 5);
  }
  ctx.restore();
}

// Jefe final: la abeja más grande y elaborada del diseño, con un tinte
// que se intensifica cada health/colorStages.length impactos recibidos
// (repartido en partes iguales entre los 3 colores).
function drawBoss() {
  const b = state.boss;
  if (!b || !b.alive) return;
  const cfg = CONFIG.boss;
  const hitsPerStage = cfg.health / cfg.colorStages.length;
  const stage = clamp(Math.floor(b.hitsTaken / hitsPerStage), 0, cfg.colorStages.length - 1);
  let tintColor = null, tintAlpha = 0;
  if (stage > 0) {
    tintColor = cfg.colorStages[stage];
    tintAlpha = stage === 1 ? 0.35 : 0.5;
  }
  const t = performance.now() / 1000;
  const wiggle = Math.sin(t * 3) * 0.03; // mismo balanceo sutil que las abejas, más lento por ser grande
  drawTintedSpriteCentered(sprites.beeBoss, b.x + b.w / 2, b.y + b.h / 2, b.w * 1.15, tintColor, tintAlpha, wiggle);
}

function drawBossHealthBar() {
  // No dibujar la barra de vida del jefe
  return;
}

// Cartelito que avisa cuando aparece el jefe final
function drawBossAnnounce() {
  if (state.bossAnnounceTimer <= 0) return;
  ctx.save();
  ctx.font = "16px 'Press Start 2P', monospace";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const alpha = clamp(state.bossAnnounceTimer / 2.2, 0, 1);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ff3d81';
  ctx.shadowColor = '#ff3d81';
  ctx.shadowBlur = 10;
  ctx.fillText('¡JEFE FINAL!', CONFIG.canvasW / 2, CONFIG.canvasH / 2 - 40);
  ctx.restore();
}

// Corta un texto en varias líneas para que entre en maxWidth (usa la
// fuente ya seteada en ctx antes de llamar a esta función).
function wrapCanvasText(text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Frase de provocación del jefe final: texto (sin voz, para que se
// entienda igual aunque no se escuche el audio del estand). Flota al
// costado de la abeja jefa, como un globo de diálogo con una colita
// que apunta hacia ella, para que quede clarísimo que es ELLA la que
// está hablando (y no un cartel suelto en una esquina). Cuando es la
// risa burlona en mayúsculas (te mató con su propia bala), se dibuja
// más grande y en rojo/naranja para que se note el sobrador que es.
function drawBossTaunt() {
  const t = state.bossTaunt;
  if (!t || t.timer <= 0 || !t.text || !state.boss) return;
  const cfg = CONFIG.boss;
  const b = state.boss;
  const isLaughCaps = t.kind === 'laughcaps';

  // Se desvanece de entrada y de salida (últimos/primeros 0.4s).
  const fade = 0.4;
  let alpha = 1;
  if (t.timer > cfg.tauntDuration - fade) {
    alpha = (cfg.tauntDuration - t.timer) / fade;
  } else if (t.timer < fade) {
    alpha = t.timer / fade;
  }

  ctx.save();
  ctx.font = isLaughCaps
    ? "bold 13px 'Segoe UI', Arial, sans-serif"
    : "bold 11px 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const maxTextWidth = 150;
  const lines = wrapCanvasText(t.text, maxTextWidth).slice(0, 4);
  const lineHeight = isLaughCaps ? 16 : 14;
  const paddingX = 9;
  const paddingY = 8;
  const boxW = maxTextWidth + paddingX * 2;
  const boxH = lines.length * lineHeight + paddingY * 2 - 2;

  // Decide de qué lado del jefe flota el globo: del lado donde haya
  // más espacio dentro del canvas, para que nunca se vaya de pantalla.
  const bossCenterX = b.x + b.w / 2;
  const putOnRight = bossCenterX < CONFIG.canvasW / 2;
  const gap = 14; // separación entre la abeja y el globo
  const boxX = putOnRight
    ? clamp(b.x + b.w + gap, 4, CONFIG.canvasW - boxW - 4)
    : clamp(b.x - gap - boxW, 4, CONFIG.canvasW - boxW - 4);
  const boxY = clamp(b.y - 6, 4, CONFIG.canvasH - boxH - 4);

  const bgColor = isLaughCaps ? '#2a0508' : '#0a0715';
  const borderColor = isLaughCaps ? 'rgba(255,90,60,0.65)' : 'rgba(255,225,77,0.35)';
  const textColor = isLaughCaps ? '#ff6a3d' : '#ffe14d';

  ctx.globalAlpha = alpha * 0.6;
  ctx.fillStyle = bgColor;
  ctx.fillRect(boxX, boxY, boxW, boxH);

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = isLaughCaps ? 1.5 : 1;
  ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxW - 1, boxH - 1);

  // Colita del globo apuntando hacia la abeja jefa.
  const tailY = clamp(b.y + b.h / 2, boxY + 6, boxY + boxH - 6);
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  if (putOnRight) {
    ctx.moveTo(boxX, tailY - 6);
    ctx.lineTo(boxX, tailY + 6);
    ctx.lineTo(boxX - gap + 2, tailY);
  } else {
    ctx.moveTo(boxX + boxW, tailY - 6);
    ctx.lineTo(boxX + boxW, tailY + 6);
    ctx.lineTo(boxX + boxW + gap - 2, tailY);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.shadowColor = textColor;
  ctx.shadowBlur = isLaughCaps ? 7 : 5;
  lines.forEach((line, i) => {
    ctx.fillText(line, boxX + paddingX, boxY + paddingY + i * lineHeight);
  });
  ctx.restore();
}

// ---------- 7. LOOP PRINCIPAL ----------
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05); // clamp para evitar saltos
  lastTime = now;
  update(dt);
  draw();
  // Los controles táctiles (joystick/fuego/pausa) solo se muestran
  // mientras se está jugando de verdad: desde que arranca la partida
  // (entrada de la formación / cartel "START" / juego corriendo) hasta
  // que termina. Se ocultan en el título (demo de fondo), instrucciones,
  // pausa y game over — todas esas pantallas muestran el overlay con la
  // clase "show" (ver CSS: body.touch-mode.playing).
  const isActivePlayScreen = !!(state && !state.demoMode && !overlay.classList.contains('show'));
  document.body.classList.toggle('playing', isActivePlayScreen);
  requestAnimationFrame(loop);
}

// ---------- 8. ARRANQUE ----------
showTitleScreen();  // arranca en la pantalla de título, con la demo jugando sola detrás
requestAnimationFrame(loop);

// ---------- 9. RESPONSIVE: escalar el gabinete para que entre en pantallas chicas ----------
// En vez de reescribir a mano cada tamaño de fuente/padding del diseño
// para que "se vea bien" en celular, medimos el tamaño natural (desktop)
// de #page-row y le aplicamos un scale() que lo achica lo justo para que
// entre en el viewport disponible. Así se ve igual que en computadora,
// solo que más chico. No modifica el podio, el IG ni ningún otro botón:
// solo agrega un transform de escala al contenedor.
const pageRow = document.getElementById('page-row');
const MOBILE_BREAKPOINT = 700; // debe coincidir con el media query de styles.css

function fitCabinetToScreen() {
  // En celular el layout pasa a modo pantalla completa por CSS (el
  // canvas se ajusta solo con max-width/max-height): no hace falta
  // (ni conviene) aplicar además un scale() acá, achicaría todo de más.
  if (window.innerWidth <= MOBILE_BREAKPOINT) {
    pageRow.style.transform = 'none';
    return;
  }
  pageRow.style.transform = 'none';
  const rect = pageRow.getBoundingClientRect();
  const margin = 28; // colchón de seguridad para que nunca quede recortado
  const availW = window.innerWidth - margin;
  const availH = window.innerHeight - margin; // innerHeight = alto real del viewport, ya sea ventana normal o pantalla completa

  // En computadora buscamos que el gabinete ocupe entre 70% y 80% del
  // ancho de la pantalla (antes solo se achicaba para entrar, nunca se
  // agrandaba). El límite por alto (maxScaleThatFits) siempre gana si
  // hiciera falta un scale mayor al que entra en la pantalla, así nunca
  // queda recortado — en monitores muy anchos y bajos puede que no
  // llegue al 75% exacto por eso, pero jamás se pasa del viewport.
  const targetWidthScale = (window.innerWidth * 0.75) / rect.width;
  const maxScaleThatFits = Math.min(availW / rect.width, availH / rect.height);
  const scale = Math.min(targetWidthScale, maxScaleThatFits);
  pageRow.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', fitCabinetToScreen);
window.addEventListener('orientationchange', () => setTimeout(fitCabinetToScreen, 250));
// F11 / la API de pantalla completa no siempre disparan "resize" al
// toque en todos los navegadores: escuchamos también estos eventos, y
// recalculamos con un pequeño delay para dar tiempo a que el navegador
// termine de acomodar el viewport.
['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange']
  .forEach(evt => document.addEventListener(evt, () => setTimeout(fitCabinetToScreen, 120)));
// La tipografía "Press Start 2P" se carga async (Google Fonts): puede
// cambiar el ancho real del texto un instante después del primer cálculo.
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(fitCabinetToScreen);
}
setTimeout(fitCabinetToScreen, 300);

// ---------- 10. CONTROLES TÁCTILES (celular/tablet) ----------
// Detectamos un dispositivo táctil (no solo "pantalla angosta", porque
// una notebook con ventana chica no debería mostrar botones táctiles).
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches ||
  ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

if (isTouchDevice) {
  document.body.classList.add('touch-mode');

  const controlsHintEl = document.getElementById('controls-hint');
  if (controlsHintEl) controlsHintEl.textContent = 'USÁ LOS BOTONES PARA MOVERTE Y DISPARAR';

  // Enlaza un botón táctil a un "código de tecla" usando el mismo
  // sistema state.keys que ya usa el teclado (ver sección INPUT más
  // arriba): así no hace falta tocar nada de la lógica del juego.
  function bindHoldButton(el, keyCode) {
    const press = (e) => {
      e.preventDefault();
      el.classList.add('pressed');
      if (state) state.keys[keyCode] = true;
    };
    const release = (e) => {
      e.preventDefault();
      el.classList.remove('pressed');
      if (state) state.keys[keyCode] = false;
    };
    el.addEventListener('pointerdown', press);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('pointerleave', release);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  bindHoldButton(document.getElementById('btn-fire'), 'Space');

  // Joystick: todo el drag se escucha sobre la base circular (el knob
  // tiene pointer-events:none, así que siempre "gana" la base). Solo
  // nos importa el desplazamiento horizontal del dedo respecto del
  // centro: pasado un umbral, prende ArrowLeft o ArrowRight — el mismo
  // flag que ya usa el teclado.
  function bindJoystick(baseEl, knobEl) {
    const maxDist = 32;   // recorrido visual máximo del knob (px)
    const deadzone = 4;   // umbral mínimo antes de mover (chico a propósito:
                           // uno más grande hacía que, al cruzar rápido de
                           // izquierda a derecha, hubiera un instante en el
                           // medio sin ninguna tecla activa — eso se sentía
                           // como "lag" al cambiar de dirección).
    let activePointerId = null;
    let originX = 0;

    function applyKnob(dx) {
      knobEl.style.transform = `translate(${dx}px, 0px)`;
      if (state) {
        state.keys['ArrowLeft'] = dx < -deadzone;
        state.keys['ArrowRight'] = dx > deadzone;
      }
    }

    function resetKnob() {
      knobEl.style.transform = 'translate(0px, 0px)';
      if (state) {
        state.keys['ArrowLeft'] = false;
        state.keys['ArrowRight'] = false;
      }
    }

    function onDown(e) {
      e.preventDefault();
      activePointerId = e.pointerId;
      baseEl.classList.add('pressed');
      baseEl.setPointerCapture(e.pointerId);
      originX = baseEl.getBoundingClientRect().left + baseEl.getBoundingClientRect().width / 2;
      applyKnob(clampDx(e.clientX - originX));
    }
    function clampDx(dx) {
      return Math.max(-maxDist, Math.min(maxDist, dx));
    }
    function onMove(e) {
      if (activePointerId !== e.pointerId) return;
      e.preventDefault();
      applyKnob(clampDx(e.clientX - originX));
    }
    function onUp(e) {
      if (activePointerId !== e.pointerId) return;
      activePointerId = null;
      baseEl.classList.remove('pressed');
      resetKnob();
    }

    baseEl.addEventListener('pointerdown', onDown);
    baseEl.addEventListener('pointermove', onMove);
    baseEl.addEventListener('pointerup', onUp);
    baseEl.addEventListener('pointercancel', onUp);
    baseEl.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  bindJoystick(document.getElementById('touch-joystick'), document.getElementById('joystick-knob'));

  const touchPauseBtn = document.getElementById('btn-pause');
  touchPauseBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    touchPauseBtn.classList.add('pressed');
    if (state && state.running) togglePause();
  });
  touchPauseBtn.addEventListener('pointerup', () => touchPauseBtn.classList.remove('pressed'));
  touchPauseBtn.addEventListener('pointercancel', () => touchPauseBtn.classList.remove('pressed'));

  // El espacio reservado para los controles cambió el alto disponible:
  // recalculamos el scale del gabinete.
  fitCabinetToScreen();
}
