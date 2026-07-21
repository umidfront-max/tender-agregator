import { createTender, postJson } from './base.js'

// UZEX e-Tender — REST API.
// POST https://apietender.uzex.uz/api/common/TradeList
// Body: { from, to, typeid, System_Id }
// Muhim: `validation` header kerak. U UZEX frontendida generatsiya qilinadi
// va vaqt o'tishi bilan eskiradi. Uni brauzer DevTools'dan olib,
// VITE_UZEX_VALIDATION orqali beriladi (pastdagi .env ga qarang).

// Dev'da  -> Vite proxy (/proxy/uzex/api/common/TradeList)
// Prod'da -> Vercel serverless proxy (/api/uzex)
const ENDPOINT = import.meta.env.DEV
  ? '/proxy/uzex/api/common/TradeList'
  : '/api/uzex'

const VALIDATION = import.meta.env.VITE_UZEX_VALIDATION || ''

export default {
  id: 'uzex',
  name: 'UZEX e-Tender',

  async fetchTenders({ from = 1, to = 20, signal } = {}) {
    const data = await postJson(ENDPOINT, {
      headers: {
        accept: 'application/json',
        language: 'uzb',
        validation: VALIDATION,
      },
      body: { from, to, typeid: 2, System_Id: 0 },
      signal,
    })

    // Javob to'g'ridan-to'g'ri massiv yoki { data: [...] } bo'lishi mumkin
    const rows = Array.isArray(data) ? data : data?.data ?? []

    return rows.map((r) =>
      createTender({
        sourceId: 'uzex',
        sourceName: 'UZEX e-Tender',
        externalId: r.id,
        title: r.name,
        cost: r.cost,
        currency: r.currency_codeabc || 'UZS',
        startDate: r.start_date,
        endDate: r.end_date,
        seller: r.seller_name,
        region: [r.region_name, r.district_name].filter(Boolean).join(', ') || null,
        url: r.id ? `https://etender.uzex.uz/lot/${r.id}` : null,
        raw: r,
      })
    )
  },
}
