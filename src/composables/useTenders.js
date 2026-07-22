import { ref, computed, reactive, watch } from 'vue'
import { adapters } from '../adapters/index.js'

// Platforma nomlari (tepadagi filtr).
const PLATFORM_LABELS = {
  hayotbirja: 'Hayotbirja',
  uzex: 'UZEX',
  ebirja: 'E-Birja',
}
// Kategoriya nomlari va tartibi (pastdagi filtr).
const CATEGORY_LABELS = {
  tender: 'Tender',
  tanlash: 'Tanlash',
  auksion: 'Auksion',
  'mahalliy-auksion': 'Mahalliy auksion',
  dokon: "Do'kon",
  'milliy-dokon': "Milliy do'kon",
  'hadli-kelishuv': 'Hadli kelishuv',
}
const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS)

export function useTenders({ perSource = 300 } = {}) {
  const tenders = ref([])
  const loading = ref(false)

  // Har bir manba uchun alohida holat.
  const sources = reactive(
    adapters.map((a) => ({
      id: a.id,
      name: a.name,
      platform: a.platform,
      category: a.category,
      status: 'idle', // idle | loading | ok | error
      count: 0,
      error: null,
    }))
  )

  // Mavjud platformalar va kategoriyalar (faqat adapteri borlar).
  const platforms = [...new Set(adapters.map((a) => a.platform))].map((id) => ({
    id,
    name: PLATFORM_LABELS[id] || id,
  }))
  const categories = CATEGORY_ORDER.filter((c) =>
    adapters.some((a) => a.category === c)
  ).map((id) => ({ id, name: CATEGORY_LABELS[id] || id }))

  // Tanlov holati — default: barcha platforma, faqat "tender" kategoriya.
  const selectedPlatforms = ref(new Set(platforms.map((p) => p.id)))
  const selectedCategories = ref(new Set(['tender']))

  // Tanlangan filtrlarga mos adapterlar.
  const activeAdapters = computed(() =>
    adapters.filter(
      (a) =>
        selectedPlatforms.value.has(a.platform) &&
        selectedCategories.value.has(a.category)
    )
  )

  let controller = null

  async function fetchActive() {
    if (controller) controller.abort()
    controller = new AbortController()
    const { signal } = controller

    const active = activeAdapters.value
    loading.value = true
    tenders.value = []

    // Holatlarni tiklash.
    sources.forEach((s) => {
      const on = active.some((a) => a.id === s.id)
      s.status = on ? 'loading' : 'idle'
      s.error = null
      s.count = 0
    })

    await Promise.all(
      active.map(async (a) => {
        const s = sources.find((x) => x.id === a.id)
        try {
          await a.fetchTenders({
            from: 1,
            to: perSource,
            signal,
            // Har sahifa kelishi bilan darhol ro'yxatga qo'shamiz.
            onBatch: (rows) => {
              if (signal.aborted) return
              tenders.value.push(...rows)
              s.count += rows.length
              s.status = 'ok'
            },
          })
          if (!signal.aborted) s.status = 'ok'
        } catch (e) {
          if (e?.name === 'AbortError' || signal.aborted) return
          s.status = 'error'
          s.error = e?.message || 'Noma\'lum xato'
        }
      })
    )

    if (!signal.aborted) loading.value = false
  }

  function togglePlatform(id) {
    const set = new Set(selectedPlatforms.value)
    set.has(id) ? set.delete(id) : set.add(id)
    if (set.size === 0) set.add(id) // kamida bittasi tanlangan bo'lsin
    selectedPlatforms.value = set
  }

  function toggleCategory(id) {
    const set = new Set(selectedCategories.value)
    set.has(id) ? set.delete(id) : set.add(id)
    if (set.size === 0) set.add(id)
    selectedCategories.value = set
  }

  // Filtr o'zgarganda — faqat kerakli manbalarni qayta yuklaymiz.
  watch(activeAdapters, () => fetchActive())

  return {
    tenders,
    loading,
    sources,
    platforms,
    categories,
    selectedPlatforms,
    selectedCategories,
    togglePlatform,
    toggleCategory,
    refresh: fetchActive,
  }
}

// Filtrlash + saralash (UI'da ishlatiladi)
export function useTenderView(tenders) {
  const query = ref('')
  const sortBy = ref('endDate') // endDate | cost | title

  const filtered = computed(() => {
    const q = query.value.trim().toLowerCase()
    let list = tenders.value

    // Muddati o'tganlarni (bugundan oldin tugagan) chiqarmaymiz.
    // Sana yo'q bo'lsa — noaniq, ko'rsataveramiz.
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const todayMs = startOfToday.getTime()
    list = list.filter((t) => {
      if (!t.endDate) return true
      const end = new Date(t.endDate).getTime()
      if (Number.isNaN(end)) return true
      return end >= todayMs
    })

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

  return { query, sortBy, filtered }
}
