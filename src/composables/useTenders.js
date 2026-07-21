import { ref, computed, reactive } from 'vue'
import { adapters } from '../adapters/index.js'

export function useTenders() {
  const tenders = ref([])
  const loading = ref(false)

  // Har bir manba uchun alohida holat — biri ishlamay qolsa,
  // qolganlari baribir ko'rsatiladi.
  const sources = reactive(
    adapters.map((a) => ({
      id: a.id,
      name: a.name,
      status: 'idle', // idle | loading | ok | error
      count: 0,
      error: null,
      enabled: true,
    }))
  )

  let controller = null

  async function fetchAll({ perSource = 5000 } = {}) {
    // avvalgi so'rovni bekor qilish
    if (controller) controller.abort()
    controller = new AbortController()
    const { signal } = controller

    loading.value = true
    tenders.value = []

    const active = adapters.filter((a) => {
      const s = sources.find((x) => x.id === a.id)
      return s?.enabled
    })

    active.forEach((a) => {
      const s = sources.find((x) => x.id === a.id)
      s.status = 'loading'
      s.error = null
      s.count = 0
    })

    const results = await Promise.allSettled(
      active.map((a) =>
        a.fetchTenders({ from: 1, to: perSource, signal })
      )
    )

    const merged = []
    results.forEach((res, i) => {
      const a = active[i]
      const s = sources.find((x) => x.id === a.id)
      if (res.status === 'fulfilled') {
        s.status = 'ok'
        s.count = res.value.length
        merged.push(...res.value)
      } else {
        if (res.reason?.name === 'AbortError') return
        s.status = 'error'
        s.error = res.reason?.message || 'Noma\'lum xato'
      }
    })

    tenders.value = merged
    loading.value = false
  }

  function toggleSource(id) {
    const s = sources.find((x) => x.id === id)
    if (s) s.enabled = !s.enabled
  }

  return { tenders, loading, sources, fetchAll, toggleSource }
}

// Filtrlash + saralash (UI'da ishlatiladi)
export function useTenderView(tenders) {
  const query = ref('')
  const sortBy = ref('endDate') // endDate | cost | title
  const activeSources = ref(new Set())

  const filtered = computed(() => {
    const q = query.value.trim().toLowerCase()
    let list = tenders.value

    if (activeSources.value.size > 0) {
      list = list.filter((t) => activeSources.value.has(t.sourceId))
    }
    if (q) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.seller || '').toLowerCase().includes(q) ||
          (t.region || '').toLowerCase().includes(q)
      )
    }

    const sorted = [...list]
    if (sortBy.value === 'cost') {
      sorted.sort((a, b) => (b.cost ?? -1) - (a.cost ?? -1))
    } else if (sortBy.value === 'title') {
      sorted.sort((a, b) => a.title.localeCompare(b.title))
    } else {
      // endDate — eng yaqin muddat birinchi
      sorted.sort((a, b) => {
        const da = a.endDate ? new Date(a.endDate).getTime() : Infinity
        const db = b.endDate ? new Date(b.endDate).getTime() : Infinity
        return da - db
      })
    }
    return sorted
  })

  return { query, sortBy, activeSources, filtered }
}
