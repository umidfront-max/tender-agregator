<script setup>
import { onMounted, computed } from 'vue'
import { useTenders, useTenderView } from './composables/useTenders.js'
import TenderCard from './components/TenderCard.vue'

const {
  tenders,
  loading,
  sources,
  platforms,
  categories,
  selectedPlatforms,
  selectedCategories,
  togglePlatform,
  toggleCategory,
  refresh,
} = useTenders()
const { query, sortBy, filtered } = useTenderView(tenders)

// Xato bo'lgan (va hozir tanlangan) manbalar.
const erroredSources = computed(() =>
  sources.filter((s) => s.status === 'error')
)

onMounted(() => refresh())
</script>

<template>
  <div class="wrap">
    <header class="head">
      <div class="brand">
        <div class="logo">T</div>
        <div>
          <h1>Tender Aggregator</h1>
          <p>Bir nechta e-tender platformasi — bitta oynada</p>
        </div>
      </div>
      <button class="refresh" :disabled="loading" @click="refresh()">
        <span v-if="loading" class="spin" aria-hidden="true"></span>
        {{ loading ? 'Yuklanmoqda…' : 'Yangilash' }}
      </button>
    </header>

    <!-- 1-daraja: Platformalar -->
    <section class="filter-row">
      <span class="filter-label">Platforma</span>
      <div class="tabs">
        <button
          v-for="p in platforms"
          :key="p.id"
          class="tab"
          :class="{ active: selectedPlatforms.has(p.id) }"
          @click="togglePlatform(p.id)"
        >
          {{ p.name }}
        </button>
      </div>
    </section>

    <!-- 2-daraja: Kategoriyalar -->
    <section class="filter-row">
      <span class="filter-label">Kategoriya</span>
      <div class="tabs">
        <button
          v-for="c in categories"
          :key="c.id"
          class="tab cat"
          :class="{ active: selectedCategories.has(c.id) }"
          @click="toggleCategory(c.id)"
        >
          {{ c.name }}
        </button>
      </div>
    </section>

    <!-- Tanlangan manbalarning yuklanish holati -->
    <section class="sources" v-if="sources.some((s) => s.status !== 'idle')">
      <span
        v-for="s in sources.filter((x) => x.status !== 'idle')"
        :key="s.id"
        class="src"
        :class="s.status"
      >
        <span class="dot" :class="s.status"></span>
        <span class="src-name">{{ s.name }}</span>
        <span v-if="s.count" class="src-count">{{ s.count }}</span>
        <span v-else-if="s.status === 'error'" class="src-err">xato</span>
      </span>
    </section>

    <!-- Xato bo'lgan manbalar tafsiloti -->
    <div v-for="s in erroredSources" :key="s.id + '-e'" class="banner">
      <strong>{{ s.name }}</strong> yuklanmadi: {{ s.error }}
    </div>

    <!-- Qidiruv + saralash -->
    <section class="controls">
      <input
        v-model="query"
        class="search"
        type="search"
        placeholder="Nomi, buyurtmachi yoki hudud bo'yicha qidirish…"
      />
      <select v-model="sortBy" class="sort">
        <option value="endDate">Muddat bo'yicha</option>
        <option value="cost">Summa bo'yicha</option>
        <option value="title">Nomi bo'yicha</option>
      </select>
    </section>

    <div class="count-line">
      <span>{{ filtered.length }}</span> ta natija
      <span v-if="loading" class="loading-hint">— yuklanmoqda…</span>
    </div>

    <!-- Ro'yxat -->
    <main class="grid" v-if="filtered.length">
      <TenderCard v-for="t in filtered" :key="t.uid" :tender="t" />
    </main>

    <div v-else-if="!loading" class="empty">
      Tenderlar topilmadi. Filtrlarni tekshiring yoki "Yangilash" ni bosing.
    </div>

    <div v-else class="empty">Yuklanmoqda…</div>
  </div>
</template>

<style scoped>
.wrap {
  max-width: 1080px;
  margin: 0 auto;
  padding: 28px 20px 80px;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}
.brand { display: flex; align-items: center; gap: 14px; }
.logo {
  width: 44px; height: 44px;
  display: grid; place-items: center;
  background: var(--accent);
  color: #1a1206;
  font-weight: 800;
  font-size: 22px;
  border-radius: 12px;
}
.head h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em; }
.head p { margin: 2px 0 0; font-size: 13px; color: var(--text-dim); }

.refresh {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 10px 18px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  transition: background 0.15s;
}
.refresh:hover:not(:disabled) { background: var(--bg-card-hover); }
.refresh:disabled { opacity: 0.6; cursor: default; }
.spin {
  width: 14px; height: 14px;
  border: 2px solid var(--text-faint);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Ikki bosqichli filtr */
.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.filter-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-faint);
  min-width: 78px;
}
.tabs { display: flex; flex-wrap: wrap; gap: 8px; }
.tab {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  color: var(--text-dim);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.15s;
}
.tab:hover { border-color: var(--accent); color: var(--text); }
.tab.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #1a1206;
}
.tab.cat {
  border-radius: 20px;
  font-weight: 500;
  padding: 7px 14px;
  font-size: 13px;
}
.tab.cat.active { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); }

.sources { display: flex; flex-wrap: wrap; gap: 10px; margin: 8px 0 16px; }
.src {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg-panel);
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  padding: 8px 12px;
  color: var(--text);
  font-size: 13px;
  transition: opacity 0.15s, border-color 0.15s;
}
.src:hover { border-color: var(--border); }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-faint); }
.dot.ok { background: var(--ok); }
.dot.error { background: var(--err); }
.dot.loading { background: var(--loading); animation: pulse 1s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: 0.4; } }
.src-count {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-dim);
  background: var(--bg);
  padding: 1px 7px;
  border-radius: 6px;
}
.src-err { font-size: 12px; color: var(--err); }

.banner {
  background: #2a1616;
  border: 1px solid #4a2323;
  color: #fca5a5;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 10px;
}

.controls {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin: 8px 0 4px;
}
.search {
  flex: 1;
  min-width: 220px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 11px 14px;
  color: var(--text);
  font-size: 14px;
}
.search:focus { outline: 2px solid var(--accent); outline-offset: -1px; }
.search::placeholder { color: var(--text-faint); }

.sort {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
}

.count-line {
  font-size: 13px;
  color: var(--text-faint);
  margin: 14px 2px;
}
.count-line span { color: var(--text); font-weight: 600; font-family: var(--font-mono); }
.count-line .loading-hint { color: var(--loading); font-weight: 500; font-family: inherit; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
}

.empty {
  text-align: center;
  color: var(--text-faint);
  padding: 60px 20px;
  font-size: 14px;
}

@media (max-width: 560px) {
  .head { flex-direction: column; align-items: flex-start; }
  .controls { flex-direction: column; align-items: stretch; }
  .grid { grid-template-columns: 1fr; }
}
</style>
