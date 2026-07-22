<script setup>
import { computed } from 'vue'

const props = defineProps({
  tender: { type: Object, required: true },
})

const money = computed(() => {
  if (props.tender.cost == null) return '—'
  return new Intl.NumberFormat('uz-UZ').format(props.tender.cost)
})

const daysLeft = computed(() => {
  if (!props.tender.endDate) return null
  const diff = new Date(props.tender.endDate).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
})

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Muddat matni: boshlanish sanasi bo'lmasa faqat tugash sanasi ko'rsatiladi.
const period = computed(() => {
  const s = props.tender.startDate
  const e = props.tender.endDate
  if (s && e) return `${fmtDate(s)} — ${fmtDate(e)}`
  if (e) return `${fmtDate(e)} gacha`
  if (s) return `${fmtDate(s)} dan`
  return '—'
})

const deadlineClass = computed(() => {
  const d = daysLeft.value
  if (d == null) return ''
  if (d < 0) return 'expired'
  if (d <= 3) return 'urgent'
  return 'ok'
})
</script>

<template>
  <article class="card">
    <div class="card-top">
      <span class="source" :data-source="tender.sourceId">{{ tender.sourceName }}</span>
      <span v-if="daysLeft != null" class="deadline" :class="deadlineClass">
        <template v-if="daysLeft < 0">Tugagan</template>
        <template v-else-if="daysLeft === 0">Bugun tugaydi</template>
        <template v-else>{{ daysLeft }} kun qoldi</template>
      </span>
    </div>

    <h3 class="title">
      <a v-if="tender.url" :href="tender.url" target="_blank" rel="noopener">{{ tender.title }}</a>
      <span v-else>{{ tender.title }}</span>
    </h3>

    <div class="cost">
      <span class="amount">{{ money }}</span>
      <span class="cur">{{ tender.currency }}</span>
    </div>

    <dl class="meta">
      <div v-if="tender.seller">
        <dt>Buyurtmachi</dt>
        <dd>{{ tender.seller }}</dd>
      </div>
      <div v-if="tender.region">
        <dt>Hudud</dt>
        <dd>{{ tender.region }}</dd>
      </div>
      <div>
        <dt>Muddat</dt>
        <dd>{{ period }}</dd>
      </div>
    </dl>
  </article>
</template>

<style scoped>
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius);
  padding: 16px 18px;
  transition: border-color 0.15s, background 0.15s;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.card:hover {
  background: var(--bg-card-hover);
  border-color: var(--border);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.source {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-dim);
  padding: 3px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
}
.source[data-source='uzex'] { color: #7dd3fc; border-color: #234b63; }
.source[data-source^='hb-'] { color: #86efac; border-color: #22543d; }
.source[data-source^='eb-'] { color: #fcd34d; border-color: #5c4813; }

.deadline {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.deadline.ok { color: var(--text-dim); }
.deadline.urgent { color: var(--accent); }
.deadline.expired { color: var(--text-faint); }

.title {
  margin: 0;
  font-size: 15px;
  line-height: 1.4;
  font-weight: 600;
}
.title a { text-decoration: none; }
.title a:hover { color: var(--accent); text-decoration: underline; }

.cost {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.amount {
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
}
.cur {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-faint);
}

.meta {
  margin: 0;
  display: grid;
  gap: 6px;
}
.meta > div {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 10px;
  font-size: 13px;
}
.meta dt {
  color: var(--text-faint);
  font-size: 12px;
}
.meta dd {
  margin: 0;
  color: var(--text-dim);
}
</style>
