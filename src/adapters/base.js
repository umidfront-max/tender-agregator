// Umumiy (normalizatsiya qilingan) tender modeli.
// Har bir manba adapteri o'z API javobini shu shaklga aylantiradi,
// shunda UI barcha manbalarni bir xil ko'rsata oladi.
//
// Tender = {
//   sourceId:   string   // qaysi adapter ('uzex', 'hayotbirja')
//   sourceName: string   // ko'rsatiladigan nom ('UZEX e-Tender')
//   externalId: string|number
//   title:      string
//   cost:       number|null
//   currency:   string   // 'UZS', 'USD', ...
//   startDate:  string|null  // ISO
//   endDate:    string|null  // ISO
//   seller:     string|null
//   region:     string|null
//   url:        string|null  // asl e'lon sahifasi
//   raw:        object       // asl javob (debug uchun)
// }

/**
 * Har bir adapter shu interfeysga amal qiladi:
 *   {
 *     id:   'uzex',
 *     name: 'UZEX e-Tender',
 *     fetchTenders({ from, to, signal }) => Promise<Tender[]>
 *   }
 */

export function createTender(partial) {
  return {
    sourceId: partial.sourceId,
    sourceName: partial.sourceName,
    externalId: partial.externalId ?? null,
    title: (partial.title ?? '').trim() || '(nomsiz)',
    cost: typeof partial.cost === 'number' ? partial.cost : null,
    currency: partial.currency ?? 'UZS',
    startDate: partial.startDate ?? null,
    endDate: partial.endDate ?? null,
    seller: partial.seller ?? null,
    region: partial.region ?? null,
    url: partial.url ?? null,
    raw: partial.raw ?? null,
    // barqaror unikal kalit (Vue :key uchun)
    get uid() {
      return `${this.sourceId}:${this.externalId}`
    },
  }
}

// Kichik GET-JSON yordamchisi
export async function getJson(url, { headers = {}, signal } = {}) {
  const res = await fetch(url, {
    headers: { accept: 'application/json', ...headers },
    signal,
  })
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} (${url})`)
    err.status = res.status
    throw err
  }
  return res.json()
}

// Kichik POST-JSON yordamchisi
export async function postJson(url, { body, headers = {}, signal } = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} (${url})`)
    err.status = res.status
    throw err
  }
  return res.json()
}
