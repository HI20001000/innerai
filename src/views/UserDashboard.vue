<script setup>
import { computed, getCurrentInstance, onMounted, ref } from 'vue'
import WorkspaceSidebar from '../components/WorkspaceSidebar.vue'
import MonthlyCalendar from '../components/MonthlyCalendar.vue'
import { formatDateTimeDisplay, getTaipeiTodayKey, toDateKey } from '../scripts/time.js'

const router = getCurrentInstance().appContext.config.globalProperties.$router
const activePath = computed(() => router?.currentRoute?.value?.path || '')
const todayKey = getTaipeiTodayKey()
const apiBaseUrl = 'http://localhost:3001'

const goToNewTask = () => router?.push('/tasks/new')
const goToTaskList = () => router?.push('/tasks/view')
const goToMeetingUpload = () => router?.push('/meetings/upload')
const goToMeetingRecords = () => router?.push('/meetings')
const goToHome = () => router?.push('/home')
const goToProfile = () => router?.push('/settings')
const goToUserDashboard = () => router?.push('/users/dashboard')

const users = ref([])
const submissions = ref([])
const selectedUserMail = ref('')
const selectedDate = ref(todayKey)
const isLoading = ref(false)
const errorMessage = ref('')

const COMPLETED_STATUS = '已完成'
const INCOMPLETE_STATUS = '未完成'

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

const fetchUsers = async () => {
  const auth = readAuthStorage()
  if (!auth) return
  try {
    const response = await fetch(`${apiBaseUrl}/api/users`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    const data = await response.json()
    if (!response.ok || !data?.success) return
    users.value = data.data || []
    if (!selectedUserMail.value && users.value.length > 0) {
      selectedUserMail.value = users.value[0].mail
    }
  } catch (error) {
    console.error(error)
  }
}

const fetchSubmissions = async () => {
  const auth = readAuthStorage()
  if (!auth) return
  try {
    const response = await fetch(`${apiBaseUrl}/api/task-submissions`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    const data = await response.json()
    if (!response.ok || !data?.success) return
    submissions.value = data.data || []
  } catch (error) {
    console.error(error)
  }
}

const selectedUser = computed(
  () => users.value.find((user) => user.mail === selectedUserMail.value) || users.value[0]
)

const userSubmissions = computed(() => {
  const mail = selectedUser.value?.mail
  if (!mail) return []
  return submissions.value.filter((submission) =>
    (submission.related_users || []).some((user) => user.mail === mail)
  )
})

const followUpItems = computed(() =>
  userSubmissions.value.flatMap((submission) => {
    const followUps = Array.isArray(submission.follow_ups) ? submission.follow_ups : []
    return followUps.map((followUp) => ({
      id: `${submission.id}-${followUp.id}`,
      title: followUp.content,
      status: followUp.status_name || '進行中',
      scheduledAt: submission.scheduled_at,
      owner: selectedUser.value?.username || selectedUser.value?.mail || '未指派',
      label: `${submission.client_name}_${submission.vendor_name}_${submission.product_name}`,
    }))
  })
)

const tasksForDate = computed(() =>
  followUpItems.value.filter((task) => toDateKey(task.scheduledAt) === selectedDate.value)
)

const totalCount = computed(() => followUpItems.value.length)
const incompleteCount = computed(
  () => followUpItems.value.filter((task) => task.status === INCOMPLETE_STATUS).length
)
const inProgressCount = computed(
  () =>
    followUpItems.value.filter(
      (task) => task.status !== COMPLETED_STATUS && task.status !== INCOMPLETE_STATUS
    ).length
)
const completedCount = computed(
  () => followUpItems.value.filter((task) => task.status === COMPLETED_STATUS).length
)

const calendarSubmissions = computed(() => {
  if (!selectedUser.value) return []
  return userSubmissions.value
})

const handleSelectDate = (dateKey) => {
  selectedDate.value = dateKey
}

onMounted(async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    await Promise.all([fetchUsers(), fetchSubmissions()])
  } catch (error) {
    console.error(error)
    errorMessage.value = '無法載入用戶工作安排'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="user-dashboard-page">
    <WorkspaceSidebar
      :on-create-task="goToNewTask"
      :on-view-tasks="goToTaskList"
      :on-upload-meeting="goToMeetingUpload"
      :on-view-meetings="goToMeetingRecords"
      :on-view-user-dashboard="goToUserDashboard"
      :on-go-home="goToHome"
      :on-go-profile="goToProfile"
      :active-path="activePath"
    />

    <main class="dashboard-content">
      <header class="dashboard-header">
        <div>
          <p class="eyebrow">管理者儀表盤</p>
          <h1 class="headline">用戶工作安排</h1>
          <p class="subhead">監控單一用戶的任務進度、待辦與跟進狀況。</p>
        </div>
      </header>

      <section class="dashboard-controls">
        <label class="control">
          <span>選擇用戶</span>
          <select v-model="selectedUserMail">
            <option v-for="user in users" :key="user.mail" :value="user.mail">
              {{ user.username || user.mail }}
            </option>
          </select>
        </label>
        <div class="user-profile">
          <div class="user-avatar">👤</div>
          <div>
            <p class="user-name">{{ selectedUser?.username || '未選擇用戶' }}</p>
            <p class="user-meta">{{ selectedUser?.mail || '尚未載入使用者資訊' }}</p>
          </div>
        </div>
      </section>

      <section class="summary-grid">
        <article class="summary-card">
          <p class="card-label">任務總數</p>
          <p class="card-value">{{ totalCount }}</p>
          <p class="card-meta">目前選定用戶的工作量</p>
        </article>
        <article class="summary-card">
          <p class="card-label">未完成</p>
          <p class="card-value">{{ incompleteCount }}</p>
          <p class="card-meta">標記為未完成的跟進</p>
        </article>
        <article class="summary-card">
          <p class="card-label">進行中</p>
          <p class="card-value">{{ inProgressCount }}</p>
          <p class="card-meta">未完成與已完成以外狀態</p>
        </article>
        <article class="summary-card">
          <p class="card-label">已完成</p>
          <p class="card-value">{{ completedCount }}</p>
          <p class="card-meta">已完成的跟進數量</p>
        </article>
      </section>

      <section class="dashboard-grid">
        <article class="panel">
          <header class="panel-header">
            <div class="panel-title-row">
              <h2>今日任務</h2>
              <span class="panel-badge">{{ tasksForDate.length }} 筆</span>
            </div>
            <p>檢視 {{ selectedDate }} 需要跟進的安排。</p>
          </header>
          <div class="task-list">
            <p v-if="isLoading" class="empty-state">載入中...</p>
            <p v-else-if="errorMessage" class="empty-state">{{ errorMessage }}</p>
            <p v-else-if="tasksForDate.length === 0" class="empty-state">此日期沒有任務。</p>
            <div v-else class="task-cards">
              <article v-for="task in tasksForDate" :key="task.id" class="task-card">
                <div>
                  <p class="task-time">{{ formatDateTimeDisplay(task.scheduledAt) }}</p>
                  <h3 class="task-title">{{ task.title }}</h3>
                  <p class="task-meta">{{ task.label }}</p>
                </div>
                <div class="task-status">
                  <span class="status-chip">{{ task.status }}</span>
                  <span class="progress-label">負責人：{{ task.owner }}</span>
                </div>
              </article>
            </div>
          </div>
        </article>

        <article class="panel">
          <MonthlyCalendar
            :selected-date="selectedDate"
            :submissions="calendarSubmissions"
            :user-mail="selectedUser?.mail"
            @select-date="handleSelectDate"
          />
        </article>
      </section>
    </main>
  </div>
</template>

<style scoped>
.user-dashboard-page {
  min-height: 100vh;
  background: #f6f7fb;
  color: #0f172a;
}

.dashboard-content {
  padding: 3.5rem 6vw 4.5rem calc(6vw + 88px);
  display: grid;
  gap: 2.5rem;
}

.dashboard-header {
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

.dashboard-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr);
  gap: 1.2rem;
  background: #fff;
  padding: 1.4rem;
  border-radius: 20px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
}

.control {
  display: grid;
  gap: 0.4rem;
  font-weight: 600;
  font-size: 0.9rem;
  color: #475569;
}

.control select,
.control input {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.7rem 0.9rem;
  font-size: 0.95rem;
  background: #fff;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  background: #f8fafc;
  border-radius: 16px;
  padding: 0.8rem 1rem;
}

.user-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #e2e8f0;
  display: grid;
  place-items: center;
  font-size: 1.2rem;
}

.user-name {
  margin: 0;
  font-weight: 600;
}

.user-meta {
  margin: 0;
  color: #64748b;
  font-size: 0.85rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1.5rem;
}

.summary-card {
  background: #fff;
  border-radius: 20px;
  padding: 1.4rem;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 0.4rem;
}

.card-label {
  margin: 0;
  color: #64748b;
  font-size: 0.85rem;
}

.card-value {
  margin: 0;
  font-size: 2rem;
  font-weight: 600;
}

.card-meta {
  margin: 0;
  color: #94a3b8;
  font-size: 0.8rem;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.9fr);
  gap: 1.5rem;
}

.panel {
  background: #fff;
  border-radius: 24px;
  padding: 1.6rem;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 1.2rem;
}

.panel-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.panel-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.25rem 0.7rem;
  font-size: 0.85rem;
  font-weight: 600;
  background: #e0f2fe;
  color: #0369a1;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.3rem;
}

.panel-header p {
  margin: 0.4rem 0 0;
  color: #64748b;
}

.task-list {
  display: grid;
  gap: 1rem;
}

.task-cards {
  display: grid;
  gap: 0.8rem;
}

.task-card {
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  background: #f8fafc;
}

.task-time {
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
}

.task-title {
  margin: 0.3rem 0 0.4rem;
  font-size: 1.1rem;
}

.task-meta {
  margin: 0;
  color: #64748b;
  font-size: 0.85rem;
}

.task-status {
  display: grid;
  gap: 0.5rem;
  min-width: 140px;
  justify-items: end;
}

.status-chip {
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
  background: #e2e8f0;
  color: #0f172a;
}

.progress {
  width: 120px;
  height: 6px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: #38bdf8;
}

.progress-label {
  font-size: 0.75rem;
  color: #64748b;
}

.empty-state {
  margin: 0;
  color: #94a3b8;
}

@media (max-width: 1100px) {
  .dashboard-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 900px) {
  .dashboard-controls {
    grid-template-columns: minmax(0, 1fr);
  }

  .control.wide {
    grid-column: auto;
  }

  .dashboard-content {
    padding: 2.5rem 6vw 3.5rem;
  }
}
</style>
