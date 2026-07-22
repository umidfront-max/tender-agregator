// Vercel serverless proxy — E-Birja (ebirja.uz).
//
// ebirja.uz o'z API'sini `/api/proxy/...` ostida beradi, lekin boshqa domendan
// (bizning sayt) so'rov CORS bilan bloklanadi. Bu funksiya catch-all bo'lib,
// `/api/ebirja/<yo'l>?<query>` ni `https://ebirja.uz/api/proxy/<yo'l>?<query>`
// ga server tomondan uzatadi.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // req.url = "/api/ebirja/tender-v2/producer/landing-lots?currentPage=0&..."
  const suffix = req.url.replace(/^\/api\/ebirja\//, '')
  const target = `https://ebirja.uz/api/proxy/${suffix}`

  try {
    const upstream = await fetch(target, {
      headers: {
        accept: 'application/json',
        'accept-language': 'uz',
        origin: 'https://ebirja.uz',
        referer: 'https://ebirja.uz/',
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
      },
    })

    const text = await upstream.text()
    res.status(upstream.status)
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.send(text)
  } catch (err) {
    res.status(502).json({ error: `Proxy xato: ${String(err)}` })
  }
}
