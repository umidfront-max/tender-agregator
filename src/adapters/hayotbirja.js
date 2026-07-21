import { createTender, postJson } from './base.js'

// Hayotbirja — JSON-RPC 2.0 API.
// POST https://api.hayotbirja.uz/rpc
// Body: { id, jsonrpc: "2.0", method: "ref", params: { ref, op: "read", ... } }
//
// Saytdagi har bir bo'lim (Tender, Tanlash, Do'kon, ...) alohida "ref"
// spravochnigi orqali o'qiladi. Shu sabab har birini ALOHIDA manba (adapter)
// qilib chiqaramiz — UI'da alohida filtr/chip bo'lib ko'rinadi.

// Dev'da  -> Vite proxy (/proxy/hayotbirja/rpc)
// Prod'da -> Vercel serverless proxy (/api/hayotbirja/rpc)
const BASE = import.meta.env.DEV ? '/proxy/hayotbirja' : '/api/hayotbirja'

// Backend bitta so'rovda limit'ni 100 tada cheklaydi ("limit <= 100").
const PAGE_SIZE = 100

// Maydonlar to'plamlari (ref turiga qarab).
const PROC_FIELDS = [
  'green', 'id', 'publicated_at', 'status', 'name', 'good_count', 'close_at',
  'totalcost', 'currency', 'lang', 'part_count', 'meta', 'remain_time',
  'lot_count', 'docs_objections_remain_time', 'close_docs_objections_at',
]
const MASTER_FIELDS = [
  'green', 'id', 'publicated_at', 'status', 'name', 'good_count', 'close_at',
  'totalcost', 'currency', 'lang', 'part_count', 'meta',
]
const SHOP_FIELDS = [
  'id', 'publicated_at', 'status', 'name', 'price', 'close_at', 'totalcost',
  'currency', 'amount', 'min_amount', 'product_name', 'remain_time', 'meta',
]

// Har bir manba (saytdagi tab) konfiguratsiyasi.
// kind: 'proc' | 'master' | 'shop' — mapping va fields shunga qarab tanlanadi.
const SOURCES = [
  { id: 'hb-tender',    name: 'Hayotbirja · Tender',        ref: 'ref_tender_public',          filters: {},                                    kind: 'proc' },
  { id: 'hb-selection', name: 'Hayotbirja · Tanlash',       ref: 'ref_selection_public',       filters: {},                                    kind: 'proc' },
  { id: 'hb-master',    name: 'Hayotbirja · Hadli kelishuv', ref: 'ref_master_agreement_public', filters: {},                                   kind: 'master' },
  { id: 'hb-shop',      name: 'Hayotbirja · Do‘kon',        ref: 'ref_online_shop_public',     filters: { is_national: false, is_gos_shop: true }, kind: 'shop' },
  { id: 'hb-nshop',     name: 'Hayotbirja · Milliy do‘kon', ref: 'ref_online_shop_public',     filters: { is_national: true,  is_gos_shop: true }, kind: 'shop' },
  // TODO: Auksion (reduction) va Mahalliy auksion (local_reduction) —
  //       to'g'ri "ref" nomi aniqlangach shu yerga qo'shiladi.
]

const FIELDS_BY_KIND = { proc: PROC_FIELDS, master: MASTER_FIELDS, shop: SHOP_FIELDS }

let rpcId = 1
// Har bir so'rovga UNIKAL idempotency-key — aks holda backend "Duplicate request".
let idemSeq = 0
function idempotencyKey() {
  return `${Date.now()}-${idemSeq++}`
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// --- Global navbat (throttle) ---
// 5 ta bo'lim bir vaqtda ko'p so'rov yuborsa backend HTTP 429 beradi.
// Shu sabab BARCHA Hayotbirja so'rovlarini bitta navbatga qo'yamiz va
// har biri orasida MIN_GAP kutamiz — bir vaqtda faqat bitta so'rov ketadi.
const MIN_GAP = 350 // ms
let queueTail = Promise.resolve()
function enqueue(task) {
  const result = queueTail.then(task)
  // keyingi so'rov shu tugab + gap kutgach boshlanadi (xato bo'lsa ham)
  queueTail = result.then(
    () => sleep(MIN_GAP),
    () => sleep(MIN_GAP)
  )
  return result
}

function toNum(v) {
  if (typeof v === 'number') return v
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Bitta sahifani (max 100 ta) o'qish — navbat orqali + 429 da qayta urinish.
async function fetchPage(cfg, { limit, offset, signal }) {
  const body = {
    id: rpcId++,
    jsonrpc: '2.0',
    method: 'ref',
    params: {
      ref: cfg.ref,
      op: 'read',
      limit,
      offset,
      filters: cfg.filters || {},
      fields: FIELDS_BY_KIND[cfg.kind] || PROC_FIELDS,
    },
  }

  const MAX_RETRY = 5
  let data
  for (let attempt = 0; ; attempt++) {
    try {
      data = await enqueue(() =>
        postJson(`${BASE}/rpc`, {
          headers: {
            accept: '*/*',
            'x-dbrpc-language': 'uz_UZ@latin',
            'x-idempotency-key': idempotencyKey(),
            'x-url-on': 'https://hayotbirja.uz/procedure/tender',
          },
          body,
          signal,
        })
      )
      break
    } catch (e) {
      // Rate-limit (429) -> eksponensial kutib qayta urinamiz.
      if (e?.status === 429 && attempt < MAX_RETRY && !signal?.aborted) {
        await sleep(1000 * 2 ** attempt) // 1s, 2s, 4s, 8s, 16s
        continue
      }
      throw e
    }
  }

  if (data?.error) {
    const msg = data.error.message || data.error.code || 'xato'
    throw new Error(`Hayotbirja RPC (${cfg.ref}): ${msg}`)
  }

  const result = data?.result
  return Array.isArray(result)
    ? result
    : result?.data ?? result?.items ?? result?.list ?? []
}

// Bitta yozuvni umumiy Tender modeliga aylantirish.
function toTender(cfg, r) {
  const meta = r.meta && typeof r.meta === 'object' ? r.meta : {}
  const isShop = cfg.kind === 'shop'
  return createTender({
    sourceId: cfg.id,
    sourceName: cfg.name,
    externalId: r.id,
    // Do'konda `name` ko'pincha bo'sh — mahsulot nomini ko'rsatamiz.
    title: isShop ? (r.product_name || r.name) : (r.name || r.product_name),
    cost: isShop ? (toNum(r.price) ?? toNum(r.totalcost)) : toNum(r.totalcost),
    currency: r.currency || 'UZS',
    startDate: r.publicated_at ?? null,
    endDate: r.close_at ?? null,
    seller: meta.organizer_name ?? meta.customer_name ?? meta.seller ?? null,
    region: meta.delivery_region ?? meta.region ?? null,
    url: r.id ? `https://hayotbirja.uz/procedure/${r.id}/core` : null,
    raw: r,
  })
}

// Konfiguratsiyadan to'liq adapter yasovchi fabrika.
function makeAdapter(cfg) {
  return {
    id: cfg.id,
    name: cfg.name,

    async fetchTenders({ from = 1, to = 100, signal } = {}) {
      // from/to — 1-based, inclusive.  from:1, to:5000 -> 5000 ta so'raladi.
      const want = Math.max(1, to - from + 1)
      let offset = Math.max(0, from - 1)
      const all = []

      // Kerakli songa yetguncha yoki ma'lumot tugaguncha 100 tadan olamiz.
      while (all.length < want) {
        if (signal?.aborted) break
        const limit = Math.min(PAGE_SIZE, want - all.length)
        const rows = await fetchPage(cfg, { limit, offset, signal })
        all.push(...rows)
        if (rows.length < limit) break // to'liq sahifadan kam -> tugadi
        offset += rows.length
      }

      return all.map((r) => toTender(cfg, r))
    },
  }
}

// Har bir bo'lim uchun alohida adapter.
export const hayotbirjaAdapters = SOURCES.map(makeAdapter)

// Orqaga moslik uchun — birinchisi (Tender) default eksport.
export default hayotbirjaAdapters[0]
