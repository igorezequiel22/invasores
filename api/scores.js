// Tabla de puntajes COMPARTIDA entre todas las computadoras que corran
// el juego (a diferencia de antes, que vivía solo en la memoria de
// cada navegador y se perdía al recargar). Usa Upstash Redis, un
// servicio de base de datos con un plan gratis bien generoso, pensado
// justo para funciones serverless como esta (se habla por HTTP, sin
// necesidad de mantener una conexión abierta).
//
// Necesita 2 variables de entorno en Vercel (Project -> Settings ->
// Environment Variables), que te da Upstash gratis al crear una base:
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
// Y opcionalmente, para poder usar el botón de "reiniciar puntajes":
//   SCORES_RESET_SECRET   (una clave que vos inventás, ej: "bytes2026")
//
// Guarda los puntajes en un "sorted set" de Redis (una lista que Redis
// mantiene siempre ordenada sola por puntaje), la estructura de datos
// hecha justo para tablas de posiciones.

const SCORES_KEY = 'invasores:scores';
const MAX_KEEP = 50; // no hace falta guardar miles de partidas viejas

async function redisCommand(restUrl, restToken, command) {
  const response = await fetch(`${restUrl}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${restToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify([command]),
  });
  const data = await response.json();
  return data[0] || {};
}

export default async function handler(req, res) {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!restUrl || !restToken) {
    res.status(500).json({ error: 'Falta configurar UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN en Vercel' });
    return;
  }

  try {
    if (req.method === 'GET') {
      const limitRaw = Number(req.query?.limit);
      const limit = Math.min(Math.max(limitRaw || 8, 1), 100);
      const out = await redisCommand(restUrl, restToken, ['ZREVRANGE', SCORES_KEY, '0', String(limit - 1), 'WITHSCORES']);
      if (out.error) {
        res.status(502).json({ error: out.error });
        return;
      }
      const raw = Array.isArray(out.result) ? out.result : [];
      const scores = [];
      // Redis devuelve [miembro, puntaje, miembro, puntaje, ...]
      for (let i = 0; i < raw.length; i += 2) {
        let name = 'JUGADOR';
        try {
          const parsed = JSON.parse(raw[i]);
          if (parsed && typeof parsed.name === 'string') name = parsed.name;
        } catch (e) {
          // si por algo el miembro no es JSON válido, se muestra igual
        }
        scores.push({ name, score: Number(raw[i + 1]) || 0 });
      }
      res.status(200).json({ scores });
      return;
    }

    if (req.method === 'POST') {
      const body = req.body || {};

      // ---- Reinicio de la tabla (protegido con una clave) ----
      if (body.action === 'reset') {
        const secret = process.env.SCORES_RESET_SECRET;
        if (!secret) {
          res.status(500).json({ error: 'Falta configurar SCORES_RESET_SECRET en Vercel para poder reiniciar' });
          return;
        }
        if (body.secret !== secret) {
          res.status(401).json({ error: 'Clave incorrecta' });
          return;
        }
        await redisCommand(restUrl, restToken, ['DEL', SCORES_KEY]);
        res.status(200).json({ ok: true });
        return;
      }

      // ---- Agregar un puntaje nuevo ----
      const nameRaw = typeof body.name === 'string' ? body.name : 'JUGADOR';
      const name = nameRaw.trim().slice(0, 12).toUpperCase() || 'JUGADOR';
      const score = Math.max(0, Math.floor(Number(body.score) || 0));
      // El "miembro" del sorted set tiene que ser único, así que le
      // metemos un timestamp + algo random adentro (dos jugadores
      // pueden hacer el mismo nombre y el mismo puntaje sin pisarse).
      const member = JSON.stringify({ name, ts: Date.now(), r: Math.random().toString(36).slice(2, 8) });
      await redisCommand(restUrl, restToken, ['ZADD', SCORES_KEY, String(score), member]);

      // Recorte: si se acumulan muchísimas partidas, nos quedamos solo
      // con las MAX_KEEP mejores, para no dejar crecer la base al
      // pedo (esto no afecta lo que se ve en el juego, que muestra
      // muchas menos).
      const cardOut = await redisCommand(restUrl, restToken, ['ZCARD', SCORES_KEY]);
      const card = Number(cardOut.result) || 0;
      if (card > MAX_KEEP) {
        await redisCommand(restUrl, restToken, ['ZREMRANGEBYRANK', SCORES_KEY, '0', String(card - MAX_KEEP - 1)]);
      }

      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo acceder a la tabla de puntajes', detail: String(err) });
  }
}
