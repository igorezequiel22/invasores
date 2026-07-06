// Esta función corre en el SERVIDOR de Vercel, no en el navegador del
// jugador. Por eso acá adentro sí podemos usar la clave de la API con
// tranquilidad: nunca viaja al navegador, nunca aparece en el código
// fuente de la página. Vive únicamente como variable de entorno
// GEMINI_API_KEY, configurada en el panel de Vercel (Project ->
// Settings -> Environment Variables).
//
// Usa la API de Gemini (Google) porque tiene un plan gratis de verdad
// (sin tarjeta, sin vencimiento) — ideal para esto, que es un evento
// sin presupuesto para APIs pagas.
//
// El front-end (script.js) le hace un POST a /api/gameover-message con
// los datos de la partida que acaba de terminar, y esta función le
// contesta con una frase cortita generada por IA para esa partida en
// particular.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Si todavía no se configuró la variable de entorno en Vercel, no
    // rompemos el juego: devolvemos un error controlado y el front-end
    // simplemente no muestra el comentario de IA.
    res.status(500).json({ error: 'Falta configurar GEMINI_API_KEY en Vercel' });
    return;
  }

  const body = req.body || {};
  const won = !!body.won;
  const score = Number(body.score) || 0;
  const lives = Number(body.lives) || 0;
  const reachedBoss = !!body.reachedBoss;
  const enemiesKilled = Number(body.enemiesKilled) || 0;
  const shieldsCollected = Number(body.shieldsCollected) || 0;
  const triplesCollected = Number(body.triplesCollected) || 0;
  const playerNameRaw = typeof body.playerName === 'string' ? body.playerName : 'JUGADOR';
  const playerName = playerNameRaw.slice(0, 20);
  // Predicción hecha por la IA ANTES de que arrancara esta partida (ver
  // api/predict-score.js). Es opcional: si esa llamada falló o todavía
  // no había vuelto para cuando arrancó a jugar, llega null y el
  // prompt simplemente no la menciona.
  const predictedScoreRaw = body.predictedScore;
  const predictedScore = predictedScoreRaw === null || predictedScoreRaw === undefined
    ? null
    : Number(predictedScoreRaw) || null;

  const prediccionLinea = predictedScore
    ? `- Antes de arrancar, "la máquina" había predicho que este jugador haría ${predictedScore} puntos (dato extra, opcional: si te copa podés hacer una mención breve de si le ganó o no a esa predicción, pero no es obligatorio).`
    : '';

  const prompt = `Sos el locutor arcade de "INVASORES", un jueguito de nave estilo Galaga hecho por el estudio "Bytes Creativos" para un evento presencial (la gente juega una sola partida rápida al pasar por el stand).

Un jugador llamado "${playerName}" acaba de terminar su partida. Datos de ESA partida puntual:
- ¿Ganó (destruyó al jefe final)?: ${won ? 'sí' : 'no'}
- Puntaje final: ${score}
- Vidas restantes al terminar: ${lives}
- ¿Llegó a pelear contra el jefe final?: ${reachedBoss ? 'sí' : 'no'}
- Enemigos eliminados: ${enemiesKilled}
- Escudos "Bytes Creativos" recolectados: ${shieldsCollected}
- Disparos triples "Bytes Creativos" recolectados: ${triplesCollected}
${prediccionLinea}

IMPORTANTE: respondé siempre en español rioplatense, nunca en inglés ni en ningún otro idioma. No menciones nada de programación, código, prompts ni inteligencia artificial: hablá solo del juego (la nave, las abejas, el jefe final, el puntaje), como si fueras un personaje del arcade.

Devolvé SOLO un JSON válido, sin texto extra, sin markdown, sin backticks, con exactamente estas dos claves:
{"comentario": "<UNA sola frase corta, máximo 22 palabras, en español rioplatense, con onda arcade/retro y un poco picante, dirigida directamente al jugador, comentando algo puntual de SU partida (no un mensaje genérico que serviría para cualquiera); podés ser divertido, dramático o burlón según el resultado; no enumeres los números tal cual la lista, integralos naturalmente en la frase>", "titulo": "<un apodo o título gracioso de 2 a 5 palabras para colgarle al jugador según cómo jugó esta partida puntual, tipo 'Exterminador Novato de Abejas' o 'Piloto Kamikaze Profesional'; en español, sin comillas>"}

Ninguno de los dos campos debe tener comillas internas ni emojis.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 150, responseMimeType: 'application/json' },
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

    // El front-end necesita "message" (comentario) y "title" (apodo)
    // como dos campos separados y ya limpios. Si por algo la IA no
    // devolvió JSON válido, no rompemos nada: usamos el texto crudo
    // como comentario y dejamos el título vacío (el front-end
    // simplemente no muestra el título en ese caso).
    let message = '';
    let title = '';
    try {
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
      const parsed = JSON.parse(cleaned);
      message = typeof parsed.comentario === 'string' ? parsed.comentario.trim() : '';
      title = typeof parsed.titulo === 'string' ? parsed.titulo.trim() : '';
    } catch (parseErr) {
      message = rawText;
    }

    res.status(200).json({ message, title });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo generar el comentario', detail: String(err) });
  }
}
