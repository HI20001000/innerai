<script setup>
import { computed, getCurrentInstance, onMounted, ref } from 'vue'
import WorkspaceSidebar from '../components/WorkspaceSidebar.vue'
import MonthlyCalendar from '../components/MonthlyCalendar.vue'
import { formatDateTimeDisplay, toDateKey, getTaipeiTodayKey } from '../scripts/time.js'

const router = getCurrentInstance().appContext.config.globalProperties.$router
const username = ref('hi')
const activePath = computed(() => router?.currentRoute?.value?.path || '')
const apiBaseUrl = 'http://localhost:3001'
const submissions = ref([])
const followUpStatuses = ref([])
const selectedDate = ref(getTaipeiTodayKey())
const isTimelineLoading = ref(false)

const goToNewTask = () => {
  router?.push('/tasks/new')
}

const goToTaskList = () => {
  router?.push('/tasks/view')
}

const goToMeetingUpload = () => {
  router?.push('/meetings/upload')
}

const goToMeetingRecords = () => {
  router?.push('/meetings')
}

const goToHome = () => {
  router?.push('/home')
}

const goToProfile = () => {
  router?.push('/settings')
}

const loadUser = () => {
  const raw = window.localStorage.getItem('innerai_user')
  if (!raw) return
  try {
    const user = JSON.parse(raw)
    username.value = user.username || 'hi'
  } catch {
    // ignore
  }
}

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

const fetchSubmissions = async () => {
  const auth = readAuthStorage()
  if (!auth) return
  isTimelineLoading.value = true
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
    isTimelineLoading.value = false
  }
}

const fetchStatuses = async () => {
  const auth = readAuthStorage()
  if (!auth) return
  try {
    const response = await fetch(`${apiBaseUrl}/api/follow-up-statuses`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    const data = await response.json()
    if (!response.ok || !data?.success) return
    followUpStatuses.value = data.data || []
  } catch (error) {
    console.error(error)
  }
}

const timelineItems = computed(() => {
  const mail = readUserMail()
  if (!mail) return []
  return submissions.value
    .filter((item) => {
      const related = item.related_users || []
      if (!related.some((user) => user.mail === mail)) return false
      return toDateKey(item.scheduled_at) === selectedDate.value
    })
    .sort((a, b) => String(a.scheduled_at || '').localeCompare(String(b.scheduled_at || '')))
})

const formatTimeOnly = (value) => {
  const formatted = formatDateTimeDisplay(value)
  if (!formatted) return ''
  const parts = formatted.split(' ')
  return parts.length > 1 ? parts[1].slice(0, 5) : formatted
}

const ensureStatusId = async (name) => {
  const trimmed = name.trim()
  if (!trimmed) return null
  const existing = followUpStatuses.value.find((status) => status.name === trimmed)
  if (existing) return existing.id
  const auth = readAuthStorage()
  if (!auth) return null
  const response = await fetch(`${apiBaseUrl}/api/follow-up-statuses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify({ name: trimmed }),
  })
  const data = await response.json()
  if (!response.ok || !data?.success) return null
  followUpStatuses.value = [...followUpStatuses.value, data.data]
  return data.data.id
}

const updateFollowUpStatus = async (followUp, value) => {
  const auth = readAuthStorage()
  if (!auth) return
  const trimmed = value.trim()
  const statusId = trimmed ? await ensureStatusId(trimmed) : null
  const response = await fetch(`${apiBaseUrl}/api/task-submission-followups/${followUp.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify({ status_id: statusId }),
  })
  const data = await response.json()
  if (!response.ok || !data?.success) return
  followUp.status_id = statusId
  followUp.status_name = trimmed || ''
}

const handleSelectDate = (dateKey) => {
  selectedDate.value = dateKey
}

onMounted(() => {
  loadUser()
  fetchSubmissions()
  fetchStatuses()
})
</script>

<template>
  <div class="home-page">
    <WorkspaceSidebar
      :on-create-task="goToNewTask"
      :on-view-tasks="goToTaskList"
      :on-upload-meeting="goToMeetingUpload"
      :on-view-meetings="goToMeetingRecords"
      :on-go-home="goToHome"
      :on-go-profile="goToProfile"
      :active-path="activePath"
    />

    <main class="home-content">
      <header class="home-header">
        <div>
          <p class="eyebrow">工作面板</p>
          <h1 class="headline">{{ username }}的工作面板</h1>
          <p class="subhead">快速掌握正在推進的項目、待辦與今日跟進事項。</p>
        </div>
        <div class="header-actions">
          <button class="ghost-button" type="button">下載報告</button>
          <button class="primary-button" type="button">建立新任務</button>
        </div>
      </header>

      <section class="summary-grid">
        <article class="summary-card">
          <p class="card-label">進行中的專案</p>
          <p class="card-value">6</p>
          <p class="card-meta">本週新增 2 個</p>
        </article>
        <article class="summary-card">
          <p class="card-label">待完成任務</p>
          <p class="card-value">18</p>
          <p class="card-meta">今日需完成 5 項</p>
        </article>
        <article class="summary-card">
          <p class="card-label">即將到期</p>
          <p class="card-value">3</p>
          <p class="card-meta">48 小時內</p>
        </article>
        <article class="summary-card">
          <p class="card-label">團隊協作</p>
          <p class="card-value">12</p>
          <p class="card-meta">進行中的交接</p>
        </article>
      </section>

      <section class="content-grid">
        <article class="panel">
          <header class="panel-header">
            <h2>今日時間線</h2>
            <p>依時間快速檢視選取日期需要跟進的項目。</p>
          </header>
          <div class="timeline">
            <p v-if="isTimelineLoading" class="timeline-empty">載入中...</p>
            <p v-else-if="timelineItems.length === 0" class="timeline-empty">
              此日期沒有需要跟進的任務。
            </p>
            <div v-else class="timeline-list">
              <div v-for="item in timelineItems" :key="item.id" class="time-row">
                <span class="time">{{ formatTimeOnly(item.scheduled_at) || '--:--' }}</span>
                <div class="time-card">
                  <h3>{{ item.client_name }}_{{ item.vendor_name }}_{{ item.product_name }}</h3>
                  <div v-if="item.follow_ups?.length" class="follow-up-list">
                    <div v-for="follow in item.follow_ups" :key="follow.id" class="follow-up-row">
                      <span class="follow-up-text">{{ follow.content }}</span>
                      <input
                        class="follow-up-status"
                        :list="`status-options-${item.id}`"
                        :value="follow.status_name || ''"
                        placeholder="選擇或輸入狀態"
                        @change="updateFollowUpStatus(follow, $event.target.value)"
                      />
                    </div>
                    <datalist :id="`status-options-${item.id}`">
                      <option v-for="status in followUpStatuses" :key="status.id" :value="status.name" />
                    </datalist>
                  </div>
                  <p v-else class="timeline-note">尚無需跟進內容。</p>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article class="panel">
          <header class="panel-header">
            <h2>今日追蹤</h2>
            <p>本日重點提醒，快速查看待辦狀態。</p>
          </header>
          <div class="progress-list">
            <div class="progress-item">
              <div>
                <p class="progress-title">登入頁面 UI 完成度</p>
                <p class="progress-meta">設計校正中</p>
              </div>
              <span class="progress-value">78%</span>
            </div>
            <div class="progress-bar">
              <span style="width: 78%"></span>
            </div>

            <div class="progress-item">
              <div>
                <p class="progress-title">API 串接準備</p>
                <p class="progress-meta">等候後端規格確認</p>
              </div>
              <span class="progress-value">52%</span>
            </div>
            <div class="progress-bar">
              <span style="width: 52%"></span>
            </div>

            <div class="progress-item">
              <div>
                <p class="progress-title">測試腳本整理</p>
                <p class="progress-meta">下班前完成</p>
              </div>
              <span class="progress-value">34%</span>
            </div>
            <div class="progress-bar">
              <span style="width: 34%"></span>
            </div>
          </div>
        </article>

        <article class="panel wide">
          <MonthlyCalendar :selected-date="selectedDate" @select-date="handleSelectDate" />
        </article>
      </section>
    </main>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  background: #f6f7fb;
  color: #0f172a;
}

.home-content {
  padding: 3.5rem 6vw 4.5rem calc(6vw + 88px);
  background: #f6f7fb;
  color: #0f172a;
  display: grid;
  gap: 2.5rem;
}

.home-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 2rem;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.75rem;
  color: #64748b;
  margin: 0;
}

.headline {
  margin: 0.4rem 0;
  font-size: 2.4rem;
  font-weight: 600;
}

.subhead {
  margin: 0;
  color: #64748b;
  max-width: 520px;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.ghost-button {
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 0.75rem 1.4rem;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  color: #475569;
}

.primary-button {
  border: none;
  background: #111827;
  color: #fff;
  padding: 0.75rem 1.6rem;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1.5rem;
}

.summary-card {
  background: #fff;
  border-radius: 20px;
  padding: 1.4rem 1.6rem;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
}

.card-label {
  color: #94a3b8;
  font-size: 0.85rem;
  margin: 0;
}

.card-value {
  font-size: 2rem;
  font-weight: 600;
  margin: 0.6rem 0;
}

.card-meta {
  color: #64748b;
  margin: 0;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 1.8rem;
}

.panel {
  background: #fff;
  border-radius: 24px;
  padding: 2rem;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 1.6rem;
}

.panel.wide {
  grid-column: 1 / -1;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.35rem;
}

.panel-header p {
  margin: 0.4rem 0 0;
  color: #64748b;
}

.timeline {
  display: grid;
  gap: 1.2rem;
}

.timeline-list {
  display: grid;
  gap: 1rem;
}

.time-row {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr);
  gap: 1rem;
  align-items: center;
}

.time {
  font-weight: 600;
  color: #475569;
}

.time-card {
  padding: 1rem 1.2rem;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.time-card.highlight {
  background: #eef2ff;
  border-color: #c7d2fe;
}

.time-card h3 {
  margin: 0 0 0.3rem;
  font-size: 1rem;
}

.time-card p {
  margin: 0;
  color: #64748b;
}

.timeline-empty {
  margin: 0;
  color: #94a3b8;
  font-size: 0.9rem;
}

.follow-up-list {
  margin-top: 0.6rem;
  display: grid;
  gap: 0.5rem;
}

.follow-up-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.follow-up-text {
  color: #0f172a;
  font-size: 0.9rem;
}

.follow-up-status {
  min-width: 140px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.35rem 0.6rem;
  font-size: 0.85rem;
  background: #fff;
}

.timeline-note {
  margin: 0.5rem 0 0;
  color: #94a3b8;
  font-size: 0.85rem;
}

.progress-list {
  display: grid;
  gap: 1.2rem;
}

.progress-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-title {
  margin: 0;
  font-weight: 600;
}

.progress-meta {
  margin: 0.2rem 0 0;
  color: #94a3b8;
  font-size: 0.85rem;
}

.progress-value {
  font-weight: 600;
  color: #1d4ed8;
}

.progress-bar {
  height: 8px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #1d4ed8, #6366f1);
  border-radius: inherit;
}


@media (max-width: 960px) {
  .home-content {
    padding: 2.5rem 6vw 3.5rem;
  }

  .home-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .content-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .home-content {
    padding: 2.5rem 6vw 3.5rem;
  }

  .header-actions {
    width: 100%;
    flex-direction: column;
  }
}
</style>
