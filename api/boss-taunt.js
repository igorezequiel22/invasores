// Igual que api/gameover-message.js: esta función corre en el SERVIDOR
// de Vercel, nunca en el navegador del jugador, así que la clave
// GEMINI_API_KEY queda a salvo (variable de entorno en Vercel).
//
// Genera UNA frase corta de provocación del jefe final (la abeja
// jefa), pensada para aparecer como texto en pantalla DURANTE la
// pelea (no interrumpe nada, no pausa el juego: el front-end la pide
// y la muestra cuando llega, sin bloquear). Se usa en varios momentos:
// - "appear": apenas aparece el jefe.
// - "idle": charla suelta cada tanto mientras dura la pelea, para que
//   el jefe no se quede mudo si el jugador tarda en pegarle o morir.
// - "lowhealth": cuando al jefe le queda poca vida.
// - "laugh": el jugador perdió una vida durante la pelea (por lo que
//   sea: un minion, un choque, etc).
// - "laughcaps": el jugador perdió una vida específicamente por una
//   bala DEL JEFE (no de un minion) — se ríe fuerte, en mayúsculas.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Falta configurar GEMINI_API_KEY en Vercel' });
    return;
  }

  const body = req.body || {};
  const validPhases = ['lowhealth', 'laugh', 'laughcaps', 'idle'];
  const phase = validPhases.includes(body.phase) ? body.phase : 'appear';
  const score = Number(body.score) || 0;
  const playerNameRaw = typeof body.playerName === 'string' ? body.playerName : 'JUGADOR';
  const playerName = playerNameRaw.slice(0, 20);

  const situacionPorFase = {
    appear: 'El jefe recién apareció, está entero, quiere intimidar al jugador antes de que empiece la pelea de verdad. Tono: relajado y con aguante, no grita, la tiene clara.',
    idle: 'Estamos en medio de la pelea, sin nada puntual pasando (no lo golpearon hace un rato ni murió nadie): el jefe tira charla suelta, como si estuviera bien cómodo y relajado, casi aburrido de lo fácil que la ve, con onda bien despreocupada.',
    lowhealth: 'Al jefe le queda MUY POCA vida (está a punto de explotar). Está desesperado pero sigue haciéndose el guapo/provocador, quizás algo nervioso, aunque trata de sostener la pose relajada.',
    laughcaps: 'El jugador ACABA de perder una vida por una bala DISPARADA POR EL JEFE (no fue un minion ni un choque): el jefe se está cagando de risa en la cara del jugador, bien sobrador y burlón, disfrutando el golpe al máximo.',
    laugh: 'El jugador ACABA de perder una vida (su nave explotó), aunque no haya sido con una bala del jefe. El jefe se ríe y burla del jugador en el momento, con onda relajada, disfrutando el golpe.',
  };
  const situacion = situacionPorFase[phase] || situacionPorFase.appear;

  const systemInstruction = 'Respondés siempre, sin ninguna excepción, en español rioplatense (de Argentina). Nunca en inglés ni en ningún otro idioma, sin importar en qué idioma esté la consigna.';

  const estiloMayusculas = phase === 'laughcaps'
    ? '\n\nIMPORTANTE PARA ESTA FRASE: escribila TODA EN MAYÚSCULAS, como una risa burlona bien fuerte (por ejemplo arrancando con algo tipo "JAJAJAJA" o "JA JA JA", metido de forma natural en la frase, no como algo pegado aparte).'
    : '';

  const prompt = `Sos la abeja jefa final ("jefe de nivel") de "INVASORES", un jueguito arcade estilo Galaga hecho por el estudio "Bytes Creativos" para un evento presencial.

Tu personalidad: una abeja jefa bien argentina, de perfil relajado y "descansero" (tranqui, sobradora sin esforzarse, con mucha confianza en sí misma, nunca grita desesperada salvo cuando le queda poca vida). Hablás con alguna que otra expresión típica del habla rioplatense (che, posta, la tenés clara, un embole, aguante, etc.) sin exagerar ni abusar, como alguien que la juega de canchera pero copada.

Un jugador llamado "${playerName}" (puntaje acumulado hasta ahora: ${score}) está peleando contra vos, el jefe. Situación puntual: ${situacion}

Escribí UNA sola frase de provocación con personalidad (entre 6 y 14 palabras), SIEMPRE en español rioplatense (nunca en inglés ni en ningún otro idioma), con onda villano arcade retro pero relajado/descansero como se describió arriba. Dirigida directamente al jugador, hablando solo del juego (la pelea, la nave, las abejas, el puntaje): nunca menciones programación, código, inteligencia artificial ni nada técnico, vos sos un personaje del juego. Nada de comillas ni emojis. Respondé solo con la frase final ya completa (nunca la cortes a la mitad), sin explicaciones ni introducciones.${estiloMayusculas}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5500);

    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 70 },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      res.status(502).json({ error: 'Error de la API de Gemini', detail: errText });
      return;
    }

    const data = await response.json();
    let taunt = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    // Chequeo liviano: si por algo se escapó en inglés a pesar de las
    // instrucciones, no la mandamos (el front-end ya tiene una frase de
    // reserva en español lista para mostrar en su lugar).
    if (taunt && !looksSpanish(taunt)) {
      taunt = '';
    }

    res.status(200).json({ taunt });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo generar la frase del jefe', detail: String(err) });
  }
}

// Chequeo rápido y liviano (no es detección "seria" de idioma) para
// filtrar respuestas que se le escaparon en inglés al modelo.
const ENGLISH_TELLS = /\b(the|you|your|and|is|are|was|were|this|that|i'm|im|don't|dont|gonna|going|will|can't|cant|what|with|have|has|not|for)\b/gi;
function looksSpanish(text) {
  const matches = text.match(ENGLISH_TELLS);
  if (!matches) return true;
  const wordCount = text.trim().split(/\s+/).length;
  return matches.length / wordCount < 0.34;
}
