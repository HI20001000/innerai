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
const activeStatusMenu = ref(null)
const statusSearch = ref('')
const statusModalOpen = ref(false)
const statusInput = ref('')
const statusColor = ref('#fde68a')
const editingStatusId = ref(null)
const statusMessage = ref('')
const statusMessageType = ref('')
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
    const response = await fetch(endpoint, {
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

const timelineTitle = computed(() => {
  const date = selectedDate.value
  if (!date) return '時間線'
  const [year, month, day] = date.split('-')
  if (!year || !month || !day) return '時間線'
  return `${year}年${month}月${day}日時間線`
})

const updateFollowUpStatus = async (followUp, status) => {
  const auth = readAuthStorage()
  if (!auth) return
  const statusId = status?.id ?? null
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
  followUp.status_name = status?.name || ''
}

const handleSelectDate = (dateKey) => {
  selectedDate.value = dateKey
}

const toggleStatusMenu = (followUpId) => {
  activeStatusMenu.value = activeStatusMenu.value === followUpId ? null : followUpId
  statusSearch.value = ''
}

const filteredStatuses = computed(() => {
  const query = statusSearch.value.trim().toLowerCase()
  if (!query) return followUpStatuses.value
  return followUpStatuses.value.filter((status) => status.name.toLowerCase().includes(query))
})

const openStatusModal = () => {
  statusModalOpen.value = true
  statusInput.value = ''
  statusColor.value = '#fde68a'
  editingStatusId.value = null
  statusMessage.value = ''
  statusMessageType.value = ''
}

const closeStatusModal = () => {
  statusModalOpen.value = false
  statusInput.value = ''
  statusColor.value = '#fde68a'
  editingStatusId.value = null
  statusMessage.value = ''
  statusMessageType.value = ''
}

const startEditStatus = (status) => {
  editingStatusId.value = status.id
  statusInput.value = status.name
  statusColor.value = status.bg_color || '#e2e8f0'
  statusMessage.value = ''
  statusMessageType.value = ''
}

const addStatus = async () => {
  const name = statusInput.value.trim()
  if (!name) return
  const auth = readAuthStorage()
  if (!auth) return
  try {
    const endpoint = editingStatusId.value
      ? `${apiBaseUrl}/api/follow-up-statuses/${editingStatusId.value}`
      : `${apiBaseUrl}/api/follow-up-statuses`
    const response = await fetch(`${apiBaseUrl}/api/follow-up-statuses`, {
      method: editingStatusId.value ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({ name, bg_color: statusColor.value }),
    })
    const data = await response.json()
    if (!response.ok || !data?.success) {
      statusMessage.value = data?.message || '新增失敗'
      statusMessageType.value = 'error'
      return
    }
    if (editingStatusId.value) {
      followUpStatuses.value = followUpStatuses.value.map((item) =>
        item.id === data.data.id ? data.data : item
      )
      statusMessage.value = `"${data.data.name}" 已更新`
    } else {
      followUpStatuses.value = [...followUpStatuses.value, data.data]
      statusMessage.value = `"${data.data.name}" 新增成功`
    }
    statusMessageType.value = 'success'
    statusInput.value = ''
    statusColor.value = '#fde68a'
    editingStatusId.value = null
  } catch (error) {
    console.error(error)
    statusMessage.value = '新增失敗'
    statusMessageType.value = 'error'
  }
}

const deleteStatus = async (status) => {
  const auth = readAuthStorage()
  if (!auth) return
  try {
    const response = await fetch(`${apiBaseUrl}/api/follow-up-statuses/${status.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    })
    const data = await response.json()
    if (!response.ok || !data?.success) {
      statusMessage.value = data?.message || '刪除失敗'
      statusMessageType.value = 'error'
      return
    }
    followUpStatuses.value = followUpStatuses.value.filter((item) => item.id !== status.id)
    statusMessage.value = `"${status.name}" 已刪除`
    statusMessageType.value = 'success'
  } catch (error) {
    console.error(error)
    statusMessage.value = '刪除失敗'
    statusMessageType.value = 'error'
  }
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
        <article class="panel wide">
          <header class="panel-header">
            <h2>{{ timelineTitle }}</h2>
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
                      <div class="status-select">
                  <button
                    type="button"
                    class="status-select-button"
                    @click="toggleStatusMenu(follow.id)"
                  >
                    <span
                      v-if="follow.status_bg_color"
                      class="status-dot"
                      :style="{ backgroundColor: follow.status_bg_color }"
                    ></span>
                    {{ follow.status_name || '選擇狀態' }}
                  </button>
                  <div
                    v-if="activeStatusMenu === follow.id"
                    class="status-menu"
                  >
                          <input
                            v-model="statusSearch"
                            class="status-search"
                            type="text"
                            placeholder="搜尋狀態"
                          />
                          <button
                            v-for="status in filteredStatuses"
                            :key="status.id"
                            type="button"
                            class="status-item"
                            @click="
                              updateFollowUpStatus(follow, status);
                              activeStatusMenu = null
                            "
                          >
                            <span
                              class="status-dot"
                              :style="{ backgroundColor: status.bg_color || '#e2e8f0' }"
                            ></span>
                            {{ status.name }}
                          </button>
                          <button
                            type="button"
                            class="status-item more"
                            @click="
                              activeStatusMenu = null;
                              openStatusModal()
                            "
                          >
                            更多
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p v-else class="timeline-note">尚無需跟進內容。</p>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article class="panel wide">
          <MonthlyCalendar :selected-date="selectedDate" @select-date="handleSelectDate" />
        </article>
      </section>
    </main>

    <div v-if="statusModalOpen" class="modal-overlay" @click.self="closeStatusModal">
      <div class="modal-card">
        <h2>編輯跟進狀態</h2>
        <p>新增或刪除可用的狀態選項。</p>
        <div class="modal-list">
          <div v-for="status in followUpStatuses" :key="status.id" class="modal-list-item">
            <div class="modal-status">
              <span
                class="status-dot"
                :style="{ backgroundColor: status.bg_color || '#e2e8f0' }"
              ></span>
              <span>{{ status.name }}</span>
            </div>
            <div class="modal-actions-inline">
              <button type="button" class="ghost-mini" @click="startEditStatus(status)">編輯</button>
              <button type="button" class="danger-text" @click="deleteStatus(status)">刪除</button>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <input v-model="statusInput" type="text" placeholder="狀態名稱" />
          <input v-model="statusColor" type="color" class="color-input" />
          <button type="button" class="primary-button" @click="addStatus">
            {{ editingStatusId ? '更新' : '新增' }}
          </button>
        </div>
        <p v-if="statusMessage" :class="['modal-message', statusMessageType]">
          {{ statusMessage }}
        </p>
        <div class="modal-actions">
          <button type="button" class="ghost-button" @click="closeStatusModal">關閉</button>
        </div>
      </div>
    </div>
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
  grid-template-columns: minmax(0, 1fr);
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

.timeline-note {
  margin: 0.5rem 0 0;
  color: #94a3b8;
  font-size: 0.85rem;
}

.status-select {
  position: relative;
  min-width: 160px;
}

.status-select-button {
  width: 100%;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 10px;
  padding: 0.35rem 0.6rem;
  font-size: 0.85rem;
  text-align: left;
  cursor: pointer;
  color: #0f172a;
}

.status-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  z-index: 10;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
  padding: 0.6rem;
  width: 200px;
  display: grid;
  gap: 0.4rem;
}

.status-search {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.35rem 0.6rem;
  font-size: 0.85rem;
}

.status-item {
  border: none;
  background: #f8fafc;
  border-radius: 10px;
  padding: 0.35rem 0.6rem;
  text-align: left;
  cursor: pointer;
  font-size: 0.85rem;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.status-item.more {
  background: #eef2ff;
  color: #4338ca;
  font-weight: 600;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: grid;
  place-items: center;
  padding: 2rem;
  z-index: 20;
}

.modal-card {
  background: #fff;
  border-radius: 18px;
  padding: 1.6rem;
  width: min(520px, 90vw);
  display: grid;
  gap: 1rem;
}

.modal-card h2 {
  margin: 0;
  font-size: 1.3rem;
}

.modal-card p {
  margin: 0;
  color: #64748b;
}

.modal-list {
  display: grid;
  gap: 0.6rem;
  max-height: 240px;
  overflow-y: auto;
}

.modal-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.6rem;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.modal-status {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.modal-actions-inline {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.color-input {
  width: 40px;
  height: 36px;
  border: none;
  background: transparent;
  padding: 0;
}

.modal-actions {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

.modal-actions input {
  flex: 1;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.45rem 0.6rem;
}

.modal-message {
  font-size: 0.9rem;
}

.modal-message.success {
  color: #16a34a;
}

.modal-message.error {
  color: #dc2626;
}

.danger-text {
  border: none;
  background: transparent;
  color: #dc2626;
  cursor: pointer;
  font-weight: 600;
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
