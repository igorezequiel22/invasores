// Igual que los otros endpoints de /api: corre en el servidor de
// Vercel, la GEMINI_API_KEY nunca llega al navegador.
//
// Se llama UNA vez, justo cuando el jugador ve la pantalla de
// instrucciones (antes de arrancar la partida), mientras lee el
// texto y escribe su nombre — así la respuesta ya está lista (o casi)
// para cuando aprieta "JUGAR", sin agregar espera. Devuelve un
// puntaje "predicho" con onda arcade y una frase para mostrar. El
// puntaje predicho se guarda en el front-end para compararlo con el
// puntaje real al terminar la partida. El front-end YA tiene su propia
// predicción de reserva en español lista para mostrar de entrada, así
// que si esta función falla o contesta en otro idioma, el cartelito de
// predicción igual se ve bien.

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
  const playerNameRaw = typeof body.playerName === 'string' ? body.playerName : 'PILOTO';
  const playerName = playerNameRaw.slice(0, 20);
  // Frases ya usadas antes en este mismo navegador (si varias personas
  // juegan seguido en el mismo dispositivo sin recargar), para pedirle
  // a la IA que no repita siempre la misma idea.
  const recentLinesRaw = Array.isArray(body.recentLines) ? body.recentLines : [];
  const recentLines = recentLinesRaw.filter(t => typeof t === 'string' && t.trim()).slice(-6).map(t => t.trim());
  const antiRepeticion = recentLines.length > 0
    ? `\n\nYa se usaron estas frases antes en este mismo dispositivo — no repitas ninguna ni algo muy parecido, inventá una idea distinta:\n${recentLines.map(t => `- "${t}"`).join('\n')}`
    : '';

  const systemInstruction = 'Respondés siempre, sin ninguna excepción, en español rioplatense (de Argentina). Nunca en inglés ni en ningún otro idioma, sin importar en qué idioma esté la consigna. Esto aplica a TODOS los campos del JSON que devolvés.';

  const prompt = `Sos "la máquina", el sistema arcade que predice puntajes antes de que un jugador arranque una partida de "INVASORES" (jueguito de nave estilo Galaga del estudio "Bytes Creativos", para un evento presencial donde la gente juega una sola partida rápida).

El jugador que está por arrancar se llama "${playerName}". Todavía no jugó nada.

Devolvé SOLO un JSON válido, sin texto extra, sin markdown, sin backticks, con exactamente estas dos claves:
{"predictedScore": <número entero entre 800 y 6000, en onda arcade>, "line": "<una frase cortita, máximo 18 palabras, en español rioplatense, con onda arcade/retro, retadora, dirigida a ${playerName}, que mencione ese mismo número de puntos predichos>"}

El campo "line" tiene que integrar el número de predictedScore de forma natural (por ejemplo con la idea de "la máquina cree que vas a hacer X puntos"). SIEMPRE en español rioplatense, nunca en inglés ni en ningún otro idioma. No menciones programación, código ni inteligencia artificial: hablá solo del juego y del puntaje. No uses comillas dentro del texto de "line" ni emojis. Inventá una idea nueva cada vez, variando la estructura de la frase (no caigas siempre en la misma fórmula).${antiRepeticion}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 120, responseMimeType: 'application/json', temperature: 1.2, topP: 0.97, topK: 64 },
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
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    let predictedScore = null;
    let line = '';
    try {
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
      const parsed = JSON.parse(cleaned);
      predictedScore = Number(parsed.predictedScore) || null;
      line = typeof parsed.line === 'string' ? parsed.line.trim() : '';
    } catch (parseErr) {
      // Si por algo la IA no devolvió JSON válido, no rompemos nada:
      // el front-end se queda con su predicción de reserva en español.
    }

    // Chequeo liviano: si por algo se escapó en inglés a pesar de las
    // instrucciones, no la mandamos (el front-end tiene su propia
    // predicción de reserva en español lista para ese caso).
    if (line && !looksSpanish(line)) line = '';

    if (!predictedScore || !line) {
      res.status(200).json({ predictedScore: null, line: '' });
      return;
    }

    res.status(200).json({ predictedScore, line });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo generar la predicción', detail: String(err) });
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
