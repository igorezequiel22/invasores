// Igual que api/gameover-message.js: esta función corre en el SERVIDOR
// de Vercel, nunca en el navegador del jugador, así que la clave
// GEMINI_API_KEY queda a salvo (variable de entorno en Vercel).
//
// Genera UNA frase corta de provocación del jefe final (la abeja
// jefa), pensada para aparecer como texto en pantalla DURANTE la
// pelea (no interrumpe nada, no pausa el juego: el front-end la pide
// y la muestra cuando llega, sin bloquear). Se usa en dos momentos:
// - "appear": apenas aparece el jefe.
// - "lowhealth": cuando al jefe le queda poca vida.

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
  const phase = body.phase === 'lowhealth' ? 'lowhealth' : 'appear';
  const score = Number(body.score) || 0;
  const playerNameRaw = typeof body.playerName === 'string' ? body.playerName : 'JUGADOR';
  const playerName = playerNameRaw.slice(0, 20);

  const situacion = phase === 'lowhealth'
    ? 'Al jefe le queda MUY POCA vida (está a punto de explotar). Está desesperado pero sigue haciéndose el guapo/provocador, quizás algo nervioso.'
    : 'El jefe recién apareció, está entero, quiere intimidar al jugador antes de que empiece la pelea de verdad.';

  const prompt = `Sos la abeja jefa final ("jefe de nivel") de "INVASORES", un jueguito arcade estilo Galaga hecho por el estudio "Bytes Creativos" para un evento presencial.

Un jugador llamado "${playerName}" (puntaje acumulado hasta ahora: ${score}) está peleando contra vos, el jefe. Situación puntual: ${situacion}

Escribí UNA sola frase de provocación bien cortita (máximo 12 palabras), SIEMPRE en español argentino bardero pero sin insultar (nunca en inglés), con onda villano arcade retro, dirigida directamente al jugador. No menciones nada de programación, código ni IA: sos un personaje del juego, no hables de cómo fuiste generado. Nada de comillas ni emojis. Respondé solo con la frase, nada más, sin explicaciones.`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5500);

    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 40 },
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
    const taunt = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    res.status(200).json({ taunt });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo generar la frase del jefe', detail: String(err) });
  }
}
