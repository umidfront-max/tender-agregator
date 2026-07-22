import { createTender, getJson } from './base.js'

// E-Birja (ebirja.uz) — REST API.
// GET https://ebirja.uz/api/proxy/<yo'l>?<query>
//
// Har bir bo'lim (Tender, Do'kon, Milliy do'kon) alohida manba (adapter).
// Dev'da  -> Vite proxy (/proxy/ebirja -> ebirja.uz/api/proxy)
// Prod'da -> Vercel serverless catch-all (/api/ebirja/[...path])
const BASE = import.meta.env.DEV ? '/proxy/ebirja' : '/api/ebirja'

const PAGE_SIZE = 50

// Tender ro'yxatidagi "aktiv" holatlar (saytdagi tender tabidagidek).
const TENDER_STATES = [45, 50, 60, 90, 100, 120, 12, 23, 140, 150]

// purchase_currency kodlari.
const CURRENCY = { 1: 'UZS', 2: 'USD', 3: 'RUB', 4: 'EUR' }

// "2026-07-07 18:12:59" -> Date qabul qiladigan ISO shakl.
function normDate(d) {
  if (!d) return null
  return String(d).replace(' ', 'T')
}

function toNum(v) {
  if (typeof v === 'number') return v
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Har bir bo'lim konfiguratsiyasi.
const SOURCES = [
  {
    id: 'eb-tender',
    name: 'E-Birja · Tender',
    category: 'tender',
    kind: 'tender',
    path: 'tender-v2/producer/landing-lots',
    baseQuery: () => {
      const p = new URLSearchParams({ type: '1' })
      TENDER_STATES.forEach((s) => p.append('state[]', String(s)))
      return p
    },
  },
  {
    id: 'eb-shop',
    name: 'E-Birja · Do‘kon',
    category: 'dokon',
    kind: 'shop',
    path: 'shop/product/announce-list',
    baseQuery: () => new URLSearchParams({ platform_display: 'e-shop' }),
  },
  {
    id: 'eb-nshop',
    name: 'E-Birja · Milliy do‘kon',
    category: 'milliy-dokon',
    kind: 'shop',
    path: 'shop/product/announce-list',
    baseQuery: () => new URLSearchParams({ platform_display: 'national-shop' }),
  },
]

// Bitta sahifani o'qish.
async function fetchPage(cfg, { page, perPage, signal }) {
  const q = cfg.baseQuery()
  q.set('currentPage', String(page))
  q.set('perPage', String(perPage))
  const url = `${BASE}/${cfg.path}?${q.toString()}`
  const json = await getJson(url, { headers: { 'accept-language': 'uz' }, signal })
  return json?.result?.data ?? []
}

// Tender yozuvi -> umumiy model.
function tenderToTender(cfg, r) {
  const region = r.company?.region?.title_uz
  const district = r.company?.district?.title_uz
  return createTender({
    sourceId: cfg.id,
    sourceName: cfg.name,
    externalId: r.id,
    title: r.title,
    cost: toNum(r.total_price),
    currency: CURRENCY[r.purchase_currency] || 'UZS',
    startDate: normDate(r.begin_date),
    endDate: normDate(r.end_date),
    seller: r.company?.title ?? null,
    region: [region, district].filter(Boolean).join(', ') || null,
    url: r.id ? `https://ebirja.uz/uz/tender/${r.id}` : null,
    raw: r,
  })
}

// Do'kon (mahsulot) yozuvi -> umumiy model.
function shopToTender(cfg, r) {
  return createTender({
    sourceId: cfg.id,
    sourceName: cfg.name,
    externalId: r.id,
    title: r.classifier?.title_uz || r.title,
    cost: toNum(r.unit_price),
    currency: 'UZS',
    startDate: null, // do'konda boshlanish sanasi yo'q
    endDate: normDate(r.inactive_date),
    seller: r.made_in ?? null,
    region: null,
    url: r.id ? `https://ebirja.uz/uz/public-procurement?type=shop` : null,
    raw: r,
  })
}

function makeAdapter(cfg) {
  const mapRow = cfg.kind === 'tender' ? tenderToTender : shopToTender
  return {
    id: cfg.id,
    name: cfg.name,
    platform: 'ebirja',
    category: cfg.category,

    async fetchTenders({ from = 1, to = 100, signal, onBatch } = {}) {
      const want = Math.max(1, to - from + 1)
      const all = []
      let page = 0

      // Kerakli songa yetguncha yoki ma'lumot tugaguncha sahifalab olamiz.
      while (all.length < want) {
        if (signal?.aborted) break
        const perPage = Math.min(PAGE_SIZE, want - all.length)
        const rows = await fetchPage(cfg, { page, perPage, signal })
        const mapped = rows.map((r) => mapRow(cfg, r))
        all.push(...mapped)
        if (onBatch && mapped.length && !signal?.aborted) onBatch(mapped)
        if (rows.length < perPage) break // to'liq sahifadan kam -> tugadi
        page += 1
      }

      return all
    },
  }
}

export const ebirjaAdapters = SOURCES.map(makeAdapter)

export default ebirjaAdapters[0]
