// Vercel serverless proxy — UZEX e-Tender (TradeList).
//
// Nega kerak: apietender.uzex.uz brauzerdan to'g'ridan-to'g'ri so'rovni CORS
// bilan bloklaydi (origin/referer tekshiradi). Vite proxy faqat dev'da ishlaydi.
// Bu funksiya frontend'dan `/api/uzex` ga kelgan so'rovni server tomondan
// (CORS'siz) upstream'ga to'g'ri header'lar bilan uzatadi.
//
// `validation` header UZEX frontendida generatsiya qilinadi va eskiradi —
// uni klient yuboradi, biz shunchaki uzatamiz.

const UPSTREAM = 'https://apietender.uzex.uz/api/common/TradeList'

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
        'content-type': 'application/json',
        accept: 'application/json',
        language: req.headers['language'] || 'uzb',
        validation: req.headers['validation'] || '',
        origin: 'https://etender.uzex.uz',
        referer: 'https://etender.uzex.uz/',
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
