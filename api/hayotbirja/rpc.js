// Vercel serverless proxy — Hayotbirja JSON-RPC.
//
// Nega kerak: api.hayotbirja.uz faqat `Origin: https://hayotbirja.uz` ga
// CORS ruxsat beradi, shuning uchun brauzerdan to'g'ridan-to'g'ri so'rov
// bloklanadi. Vite proxy esa faqat `npm run dev`da ishlaydi, prodda emas.
//
// Bu funksiya frontend'dan `/api/hayotbirja/rpc` ga kelgan so'rovni server
// tomondan (CORS'siz) upstream'ga to'g'ri header'lar bilan uzatadi.

const UPSTREAM = 'https://api.hayotbirja.uz/rpc'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const payload =
      typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})

    const upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'content-type': 'application/json;charset=utf-8',
        accept: '*/*',
        origin: 'https://hayotbirja.uz',
        referer: 'https://hayotbirja.uz/',
        cookie: 'locale=uz_UZ@latin',
        'x-dbrpc-language': req.headers['x-dbrpc-language'] || 'uz_UZ@latin',
        'x-idempotency-key':
          req.headers['x-idempotency-key'] || String(Date.now()),
        'x-url-on':
          req.headers['x-url-on'] || 'https://hayotbirja.uz/procedure/tender',
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
      },
      body: payload,
    })

    const text = await upstream.text()
    res.status(upstream.status)
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.send(text)
  } catch (err) {
    res.status(502).json({ error: `Proxy xato: ${String(err)}` })
  }
}
