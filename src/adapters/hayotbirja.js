import { createTender, postJson } from './base.js'

// Hayotbirja — JSON-RPC 2.0 API.
// POST https://api.hayotbirja.uz/rpc
// Body: { id, jsonrpc: "2.0", method: "ref", params: { ref, op, ... } }
//
// Tenderlar ro'yxati "ref" metodi orqali "ref_tender_public" spravochnigidan
// o'qiladi (op: "read"). Aynan sayt yuboradigan so'rov.

// Dev'da  -> Vite proxy (/proxy/hayotbirja/rpc)
// Prod'da -> Vercel serverless proxy (/api/hayotbirja/rpc)
// Ikkalasi ham `${BASE}/rpc` shakliga tushadi.
const BASE = import.meta.env.DEV
  ? '/proxy/hayotbirja'
  : '/api/hayotbirja'

// Sayt qaytaradigan aniq maydonlar ro'yxati (fields).
const TENDER_FIELDS = [
  'green',
  'id',
  'publicated_at',
  'status',
  'name',
  'good_count',
  'close_at',
  'totalcost',
  'currency',
  'lang',
  'part_count',
  'meta',
  'remain_time',
  'lot_count',
  'docs_objections_remain_time',
  'close_docs_objections_at',
]

// Backend bitta so'rovda limit'ni 100 tada cheklaydi ("limit <= 100").
// Shu sabab ko'proq kerak bo'lsa — 100 tadan sahifalab olamiz.
const PAGE_SIZE = 100

let rpcId = 1
// Har bir so'rov uchun UNIKAL idempotency-key kerak, aks holda backend
// "Duplicate request" qaytaradi (bir ms ichida bir nechta so'rov ketishi mumkin).
let idemSeq = 0
function idempotencyKey() {
  return `${Date.now()}-${idemSeq++}`
}

// Bitta sahifani (max 100 ta) o'qish.
async function fetchPage({ limit, offset, signal }) {
  const data = await postJson(`${BASE}/rpc`, {
    headers: {
      accept: '*/*',
      'x-dbrpc-language': 'uz_UZ@latin',
      'x-idempotency-key': idempotencyKey(),
      'x-url-on': 'https://hayotbirja.uz/procedure/tender',
    },
    body: {
      id: rpcId++,
      jsonrpc: '2.0',
      method: 'ref',
      params: {
        ref: 'ref_tender_public',
        op: 'read',
        limit,
        offset,
        fields: TENDER_FIELDS,
      },
    },
    signal,
  })

  if (data?.error) {
    throw new Error(`Hayotbirja RPC: ${data.error.message || 'xato'}`)
  }

  // JSON-RPC natijasi turli shaklda bo'lishi mumkin:
  // result: [...]  yoki  result: { data: [...] }  yoki  result: { items: [...] }
  const result = data?.result
  return Array.isArray(result)
    ? result
    : result?.data ?? result?.items ?? result?.list ?? []
}

function toTender(r) {
  const meta = r.meta && typeof r.meta === 'object' ? r.meta : {}
  return createTender({
    sourceId: 'hayotbirja',
    sourceName: 'Hayotbirja',
    externalId: r.id,
    title: r.name,
    cost: typeof r.totalcost === 'number' ? r.totalcost : Number(r.totalcost) || null,
    currency: r.currency || 'UZS',
    startDate: r.publicated_at ?? null,
    endDate: r.close_at ?? null,
    // seller/region alohida maydon sifatida kelmaydi — meta ichida bo'lishi mumkin
    seller: meta.organizer_name ?? meta.customer_name ?? meta.seller ?? null,
    region: meta.delivery_region ?? meta.region ?? null,
    url: r.id ? `https://hayotbirja.uz/procedure/${r.id}/core` : null,
    raw: r,
  })
}

export default {
  id: 'hayotbirja',
  name: 'Hayotbirja',

  async fetchTenders({ from = 1, to = 100, signal } = {}) {
    // from/to — 1-based, inclusive diapazon.  from:1, to:5000 -> 5000 ta so'raladi.
    const startOffset = Math.max(0, from - 1)
    const want = Math.max(1, to - from + 1)

    const all = []
    let offset = startOffset

    // Kerakli songa yetguncha yoki tenderlar tugaguncha 100 tadan olamiz.
    while (all.length < want) {
      if (signal?.aborted) break
      const limit = Math.min(PAGE_SIZE, want - all.length)
      const rows = await fetchPage({ limit, offset, signal })
      all.push(...rows)
      // To'liq sahifadan kam qaytdi -> boshqa ma'lumot qolmadi, to'xtaymiz.
      if (rows.length < limit) break
      offset += rows.length
    }

    return all.map(toTender)
  },
}
