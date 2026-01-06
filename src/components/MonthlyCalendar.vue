<script setup>
import { computed, onMounted, ref } from 'vue'

const apiBaseUrl = 'http://localhost:3001'
const submissions = ref([])
const isLoading = ref(false)

const readAuthStorage = () => {
  const raw = window.localStorage.getItem('innerai_auth')
  if (!raw) return null
  try {
    const data = JSON.parse(raw)
    if (!data?.token || !data?.expiresAt) return null
    return data
  } catch {
    return null
  }
}

const readUserMail = () => {
  const raw = window.localStorage.getItem('innerai_user')
  if (!raw) return null
  try {
    const data = JSON.parse(raw)
    return data?.mail || null
  } catch {
    return null
  }
}

const taipeiOffsetMs = 8 * 60 * 60 * 1000

const toDateKey = (value) => {
  if (!value) return null
  if (typeof value === 'string') {
    if (value.endsWith('Z')) {
      const parsed = new Date(value)
      if (Number.isNaN(parsed.getTime())) return null
      const taipei = new Date(parsed.getTime() + taipeiOffsetMs)
      return taipei.toISOString().slice(0, 10)
    }
    const normalized = value.replace('T', ' ').split('.')[0]
    return normalized.split(' ')[0]
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  const taipei = new Date(parsed.getTime() + taipeiOffsetMs)
  return taipei.toISOString().slice(0, 10)
}

const fetchSubmissions = async () => {
  const auth = readAuthStorage()
  if (!auth) return
  isLoading.value = true
  try {
    const response = await fetch(`${apiBaseUrl}/api/task-submissions`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    const data = await response.json()
    if (!response.ok || !data?.success) return
    submissions.value = data.data || []
  } catch (error) {
    console.error(error)
  } finally {
    isLoading.value = false
  }
}

const monthLabel = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  return `${year} 年 ${month} 月`
})

const calendarDays = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const monthIndex = now.getMonth()
  const firstDay = new Date(year, monthIndex, 1)
  const lastDay = new Date(year, monthIndex + 1, 0)
  const startWeekday = firstDay.getDay()
  const totalDays = lastDay.getDate()
  const cells = []

  for (let i = 0; i < startWeekday; i += 1) {
    cells.push({ empty: true, key: `empty-${i}` })
  }
  for (let day = 1; day <= totalDays; day += 1) {
    const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(
      2,
      '0'
    )}`
    cells.push({ empty: false, day, dateKey })
  }
  return cells
})

const todoCounts = computed(() => {
  const mail = readUserMail()
  if (!mail) return {}
  const counts = {}
  for (const item of submissions.value) {
    const related = item.related_users || []
    if (!related.some((user) => user.mail === mail)) continue
    const dateKey = toDateKey(item.scheduled_at)
    if (!dateKey) continue
    counts[dateKey] = (counts[dateKey] || 0) + 1
  }
  return counts
})

onMounted(fetchSubmissions)
</script>

<template>
  <div class="monthly-calendar">
    <header class="calendar-header">
      <div>
        <h3 class="calendar-title">本月行事曆</h3>
        <p class="calendar-subtitle">顯示與你相關的待辦數量</p>
      </div>
      <span class="calendar-month">{{ monthLabel }}</span>
    </header>

    <div class="calendar-grid">
      <div class="calendar-weekday" v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day">
        {{ day }}
      </div>

      <div
        v-for="cell in calendarDays"
        :key="cell.key || cell.dateKey"
        :class="['calendar-cell', { empty: cell.empty }]"
      >
        <template v-if="!cell.empty">
          <span class="calendar-date">{{ cell.day }}</span>
          <span v-if="todoCounts[cell.dateKey]" class="calendar-badge">
            {{ todoCounts[cell.dateKey] }} 待辦
          </span>
        </template>
      </div>
    </div>

    <p v-if="isLoading" class="calendar-loading">載入待辦中...</p>
  </div>
</template>

<style scoped>
.monthly-calendar {
  background: #fff;
  border-radius: 24px;
  padding: 1.8rem;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.2rem;
}

.calendar-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.calendar-subtitle {
  margin: 0.35rem 0 0;
  color: #64748b;
  font-size: 0.9rem;
}

.calendar-month {
  font-weight: 600;
  color: #0f172a;
  background: #f1f5f9;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.6rem;
}

.calendar-weekday {
  text-align: center;
  font-size: 0.85rem;
  color: #94a3b8;
}

.calendar-cell {
  background: #f8fafc;
  border-radius: 16px;
  min-height: 82px;
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.4rem;
}

.calendar-cell.empty {
  background: transparent;
  box-shadow: none;
}

.calendar-date {
  font-weight: 600;
  color: #0f172a;
}

.calendar-badge {
  align-self: flex-start;
  background: #111827;
  color: #fff;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
}

.calendar-loading {
  margin: 1rem 0 0;
  color: #64748b;
  font-size: 0.85rem;
}
</style>
