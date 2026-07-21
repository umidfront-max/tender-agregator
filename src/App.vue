<script setup>
import { onMounted } from 'vue'
import { useTenders, useTenderView } from './composables/useTenders.js'
import TenderCard from './components/TenderCard.vue'

const { tenders, loading, sources, fetchAll, toggleSource } = useTenders()
const { query, sortBy, activeSources, filtered } = useTenderView(tenders)

onMounted(() => fetchAll())

function toggleFilter(id) {
  if (activeSources.value.has(id)) activeSources.value.delete(id)
  else activeSources.value.add(id)
  // reaktivlik uchun yangi Set
  activeSources.value = new Set(activeSources.value)
}
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
      <button class="refresh" :disabled="loading" @click="fetchAll()">
        <span v-if="loading" class="spin" aria-hidden="true"></span>
        {{ loading ? 'Yuklanmoqda…' : 'Yangilash' }}
      </button>
    </header>

    <!-- Manba holati -->
    <section class="sources">
      <button
        v-for="s in sources"
        :key="s.id"
        class="src"
        :class="[s.status, { off: !s.enabled }]"
        @click="toggleSource(s.id)"
        :title="s.enabled ? 'O\'chirish uchun bosing' : 'Yoqish uchun bosing'"
      >
        <span class="dot" :class="s.status"></span>
        <span class="src-name">{{ s.name }}</span>
        <span v-if="s.status === 'ok'" class="src-count">{{ s.count }}</span>
        <span v-else-if="s.status === 'error'" class="src-err">xato</span>
      </button>
    </section>

    <!-- Xato bo'lgan manbalar tafsiloti -->
    <div v-for="s in sources.filter((x) => x.status === 'error')" :key="s.id + '-e'" class="banner">
      <strong>{{ s.name }}</strong> yuklanmadi: {{ s.error }}
    </div>

    <!-- Filtr paneli -->
    <section class="controls">
      <input
        v-model="query"
        class="search"
        type="search"
        placeholder="Nomi, buyurtmachi yoki hudud bo'yicha qidirish…"
      />
      <div class="chips">
        <button
          v-for="s in sources"
          :key="s.id + '-f'"
          class="chip"
          :class="{ active: activeSources.has(s.id) }"
          @click="toggleFilter(s.id)"
        >
          {{ s.name }}
        </button>
      </div>
      <select v-model="sortBy" class="sort">
        <option value="endDate">Muddat bo'yicha</option>
        <option value="cost">Summa bo'yicha</option>
        <option value="title">Nomi bo'yicha</option>
      </select>
    </section>

    <div class="count-line">
      <span>{{ filtered.length }}</span> ta tender ko'rsatilmoqda
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

.sources { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
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
.src.off { opacity: 0.4; }
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

.chips { display: flex; gap: 8px; }
.chip {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-dim);
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 13px;
  transition: all 0.15s;
}
.chip.active { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); }

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
