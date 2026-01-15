<script setup>
import { computed, getCurrentInstance, onMounted, ref, watch } from 'vue'
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

const viewMode = ref('user')
const users = ref([])
const submissions = ref([])
const selectedUserMail = ref('')
const selectedClientName = ref('')
const selectedDate = ref(todayKey)
const activeUserMenu = ref(false)
const activeClientMenu = ref(false)
const userSearchQuery = ref('')
const clientSearchQuery = ref('')
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

const clients = computed(() => {
  const names = new Set()
  return submissions.value.reduce((result, submission) => {
    const name = submission.client_name
    if (!name || names.has(name)) return result
    names.add(name)
    result.push({ name })
    return result
  }, [])
})

const selectedClient = computed(
  () => clients.value.find((client) => client.name === selectedClientName.value) || clients.value[0]
)

const userSubmissions = computed(() => {
  const mail = selectedUser.value?.mail
  if (!mail) return []
  return submissions.value.filter((submission) =>
    (submission.related_users || []).some((user) => user.mail === mail)
  )
})

const clientSubmissions = computed(() => {
  const name = selectedClient.value?.name
  if (!name) return []
  return submissions.value.filter((submission) => submission.client_name === name)
})

const activeSubmissions = computed(() => {
  if (viewMode.value === 'user') return userSubmissions.value
  if (viewMode.value === 'client') return clientSubmissions.value
  return submissions.value
})

const followUpItems = computed(() =>
  activeSubmissions.value.flatMap((submission) => {
    const followUps = Array.isArray(submission.follow_ups) ? submission.follow_ups : []
    return followUps.map((followUp) => ({
      id: `${submission.id}-${followUp.id}`,
      title: followUp.content,
      status: followUp.status_name || '進行中',
      statusBgColor: followUp.status_bg_color || '',
      scheduledAt: submission.start_at,
      owner:
        viewMode.value === 'user'
          ? selectedUser.value?.username || selectedUser.value?.mail || '未指派'
          : submission.client_name || '未指派',
      assignees: Array.isArray(followUp.assignees) ? followUp.assignees : [],
      label: `${submission.client_name}_${submission.vendor_name}_${submission.product_name}`,
    }))
  })
)

const timelineItems = computed(() =>
  activeSubmissions.value
    .filter((submission) => toDateKey(submission.start_at) === selectedDate.value)
    .sort((a, b) => String(a.start_at || '').localeCompare(String(b.start_at || '')))
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

const todaysBadge = computed(() => {
  const total = timelineItems.value.reduce(
    (sum, submission) => sum + (submission.follow_ups?.length || 0),
    0
  )
  if (total === 0) {
    return { text: '無任務', className: 'panel-badge-empty' }
  }
  return { text: `${total} 筆`, className: 'panel-badge-pending' }
})

const getAssigneeNames = (task) => {
  const names = (task.assignees || [])
    .map((assignee) => assignee.username || assignee.mail)
    .filter(Boolean)
  if (names.length === 0) return '未指派'
  return names.join('、')
}

const getStatusChipStyle = (task) => {
  const statusName = task.status || task.status_name || ''
  const statusColor = task.statusBgColor || task.status_bg_color || ''
  if (statusColor) {
    return { backgroundColor: statusColor, color: '#0f172a' }
  }
  if (statusName === COMPLETED_STATUS) {
    return { backgroundColor: '#dcfce7', color: '#166534' }
  }
  if (statusName === INCOMPLETE_STATUS) {
    return { backgroundColor: '#fee2e2', color: '#b91c1c' }
  }
  return { backgroundColor: '#fef3c7', color: '#92400e' }
}

const formatTimeOnly = (value) => {
  const formatted = formatDateTimeDisplay(value)
  if (!formatted) return ''
  const parts = formatted.split(' ')
  return parts.length > 1 ? parts[1].slice(0, 5) : formatted
}

const calendarSubmissions = computed(() => activeSubmissions.value)

const timelineTitle = computed(() => {
  const date = selectedDate.value
  if (!date) return '時間線'
  const [year, month, day] = date.split('-')
  if (!year || !month || !day) return '時間線'
  return `${year}年${month}月${day}日時間線`
})

const headerTitle = computed(() => {
  if (viewMode.value === 'user') return '用戶工作安排'
  if (viewMode.value === 'client') return '客戶工作安排'
  return '全部工作安排'
})

const headerSubhead = computed(() => {
  if (viewMode.value === 'user') {
    return '監控單一用戶的任務進度、待辦與跟進狀況。'
  }
  if (viewMode.value === 'client') {
    return '以客戶視角檢視該客戶的跟進任務進度與安排。'
  }
  return '整體檢視目前所有任務與跟進安排。'
})

const selectionLabel = computed(() => (viewMode.value === 'user' ? '選擇用戶' : '選擇客戶'))

const profileName = computed(() => {
  if (viewMode.value === 'user') {
    return selectedUser.value?.username || '未選擇用戶'
  }
  if (viewMode.value === 'client') {
    return selectedClient.value?.name || '未選擇客戶'
  }
  return '全部任務'
})

const profileMeta = computed(() => {
  if (viewMode.value === 'user') {
    return selectedUser.value?.mail || '尚未載入使用者資訊'
  }
  if (viewMode.value === 'client') {
    return selectedClient.value?.name ? '客戶視角' : '尚未載入客戶資訊'
  }
  return '全體概覽'
})

const summaryMeta = computed(() => {
  if (viewMode.value === 'user') return '目前選定用戶的工作量'
  if (viewMode.value === 'client') return '目前選定客戶的工作量'
  return '目前全部任務的工作量'
})

const calendarSubtitle = computed(() => {
  if (viewMode.value === 'user') return '顯示與你相關的待辦數量'
  if (viewMode.value === 'client') return '顯示該客戶的待辦數量'
  return '顯示全部任務的待辦數量'
})

const getFilteredUsers = () => {
  const query = userSearchQuery.value.trim().toLowerCase()
  if (!query) return users.value
  return users.value.filter((user) => {
    const name = String(user.username || '').toLowerCase()
    const mail = String(user.mail || '').toLowerCase()
    return name.includes(query) || mail.includes(query)
  })
}

const toggleUserMenu = () => {
  activeUserMenu.value = !activeUserMenu.value
  if (activeUserMenu.value) {
    userSearchQuery.value = ''
  }
}

const toggleClientMenu = () => {
  activeClientMenu.value = !activeClientMenu.value
  if (activeClientMenu.value) {
    clientSearchQuery.value = ''
  }
}

const selectUser = (user) => {
  if (!user?.mail) return
  selectedUserMail.value = user.mail
  activeUserMenu.value = false
  userSearchQuery.value = ''
}

const getFilteredClients = () => {
  const query = clientSearchQuery.value.trim().toLowerCase()
  if (!query) return clients.value
  return clients.value.filter((client) => client.name.toLowerCase().includes(query))
}

const selectClient = (client) => {
  if (!client?.name) return
  selectedClientName.value = client.name
  activeClientMenu.value = false
  clientSearchQuery.value = ''
}

const setViewMode = (mode) => {
  viewMode.value = mode
  activeUserMenu.value = false
  activeClientMenu.value = false
}

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
    errorMessage.value = '無法載入工作安排'
  } finally {
    isLoading.value = false
  }
})

watch(
  [submissions, viewMode],
  () => {
    if (viewMode.value !== 'client') return
    if (!selectedClientName.value && clients.value.length > 0) {
      selectedClientName.value = clients.value[0].name
    }
  },
  { immediate: true }
)
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
          <h1 class="headline">{{ headerTitle }}</h1>
          <p class="subhead">{{ headerSubhead }}</p>
        </div>
        <div class="view-toggle">
          <button
            type="button"
            :class="['toggle-button', { active: viewMode === 'user' }]"
            @click="setViewMode('user')"
          >
            用戶視角
          </button>
          <button
            type="button"
            :class="['toggle-button', { active: viewMode === 'client' }]"
            @click="setViewMode('client')"
          >
            客戶視角
          </button>
          <button
            type="button"
            :class="['toggle-button', { active: viewMode === 'all' }]"
            @click="setViewMode('all')"
          >
            全部
          </button>
        </div>
      </header>

      <section class="dashboard-controls">
        <div v-if="viewMode === 'user'" class="control select-field-wrapper">
          <span>{{ selectionLabel }}</span>
          <button class="select-field" type="button" @click="toggleUserMenu">
            {{ selectedUser?.username || selectedUser?.mail || '選擇用戶' }}
          </button>
          <div v-if="activeUserMenu" class="option-list assignee-list">
            <input
              v-model="userSearchQuery"
              class="option-search"
              type="text"
              placeholder="搜尋用戶"
            />
            <button
              v-for="user in getFilteredUsers()"
              :key="user.mail"
              type="button"
              class="option-item user-option"
              @click="selectUser(user)"
            >
              <span
                class="user-avatar"
                :style="{ backgroundColor: user.icon_bg || '#e2e8f0' }"
              >
                {{ user.icon || '🙂' }}
              </span>
              <span class="user-label">
                {{ user.username || 'user' }} &lt;{{ user.mail }}&gt;
              </span>
              <span v-if="selectedUserMail === user.mail" class="user-selected">已選</span>
            </button>
          </div>
        </div>
        <div v-else-if="viewMode === 'client'" class="control select-field-wrapper">
          <span>{{ selectionLabel }}</span>
          <button class="select-field" type="button" @click="toggleClientMenu">
            {{ selectedClient?.name || '選擇客戶' }}
          </button>
          <div v-if="activeClientMenu" class="option-list assignee-list">
            <input
              v-model="clientSearchQuery"
              class="option-search"
              type="text"
              placeholder="搜尋客戶"
            />
            <button
              v-for="client in getFilteredClients()"
              :key="client.name"
              type="button"
              class="option-item"
              @click="selectClient(client)"
            >
              {{ client.name }}
            </button>
          </div>
        </div>
        <div v-else class="control select-field-wrapper">
          <span>任務範圍</span>
          <div class="select-field static-field">全部任務</div>
        </div>
        <div class="user-profile">
          <div
            class="user-avatar"
            :style="{ backgroundColor: selectedUser?.icon_bg || '#e2e8f0' }"
          >
            {{
              viewMode === 'user'
                ? selectedUser?.icon || '👤'
                : viewMode === 'client'
                  ? '🏷️'
                  : '📋'
            }}
          </div>
          <div>
            <p class="user-name">{{ profileName }}</p>
            <p class="user-meta">{{ profileMeta }}</p>
          </div>
        </div>
      </section>

      <section class="summary-grid">
        <article class="summary-card">
          <p class="card-label">任務總數</p>
          <p class="card-value">{{ totalCount }}</p>
          <p class="card-meta">{{ summaryMeta }}</p>
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
              <h2>{{ timelineTitle }}</h2>
              <span class="panel-badge" :class="todaysBadge.className">
                {{ todaysBadge.text }}
              </span>
            </div>
            <p>檢視 {{ selectedDate }} 需要跟進的安排。</p>
          </header>
          <div class="timeline">
            <p v-if="isLoading" class="timeline-empty">載入中...</p>
            <p v-else-if="errorMessage" class="timeline-empty">{{ errorMessage }}</p>
            <p v-else-if="timelineItems.length === 0" class="timeline-empty">
              此日期沒有需要跟進的任務。
            </p>
            <div v-else class="timeline-list">
              <div v-for="item in timelineItems" :key="item.id" class="time-row">
                <span class="time">
                  {{
                    item.end_at
                      ? `${formatTimeOnly(item.start_at) || '--:--'} - ${
                          formatTimeOnly(item.end_at) || '--:--'
                        }`
                      : formatTimeOnly(item.start_at) || '--:--'
                  }}
                </span>
                <div class="time-card">
                  <h3 class="time-card-title">
                    {{ item.client_name }}_{{ item.vendor_name }}_{{ item.product_name }}
                  </h3>
                  <div v-if="item.follow_ups?.length" class="follow-up-list">
                    <div
                      v-for="(follow, index) in item.follow_ups"
                      :key="follow.id"
                      class="follow-up-row"
                    >
                      <span class="follow-up-index">{{ index + 1 }}.</span>
                      <div class="follow-up-main">
                        <span class="follow-up-text">{{ follow.content }}</span>
                        <div class="follow-up-meta">
                          <div class="follow-up-meta-item">
                            <span class="meta-label">跟進人</span>
                            <span class="meta-value">{{ getAssigneeNames(follow) }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="follow-up-actions">
                        <span class="status-chip" :style="getStatusChipStyle(follow)">
                          {{ follow.status_name || '進行中' }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p v-else class="timeline-note">無任務</p>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article class="panel">
          <MonthlyCalendar
            :selected-date="selectedDate"
            :submissions="calendarSubmissions"
            :user-mail="viewMode === 'user' ? selectedUser?.mail : ''"
            :client-name="viewMode === 'client' ? selectedClient?.name : ''"
            :subtitle="calendarSubtitle"
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

.view-toggle {
  display: inline-flex;
  background: #f1f5f9;
  padding: 0.3rem;
  border-radius: 999px;
  gap: 0.3rem;
}

.toggle-button {
  border: none;
  background: transparent;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
}

.toggle-button.active {
  background: #111827;
  color: #fff;
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

.select-field-wrapper {
  position: relative;
}

.control {
  display: grid;
  gap: 0.4rem;
  font-weight: 600;
  font-size: 0.9rem;
  color: #475569;
}

.select-field {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.7rem 0.9rem;
  font-size: 0.95rem;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.static-field {
  cursor: default;
  color: #94a3b8;
}

.select-field::after {
  content: '▾';
  float: right;
  color: #94a3b8;
}

.option-list {
  position: absolute;
  top: calc(100% + 0.4rem);
  left: 0;
  right: 0;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  padding: 0.4rem;
  display: grid;
  gap: 0.3rem;
  max-height: 200px;
  overflow: auto;
  z-index: 5;
  box-shadow: 0 18px 30px rgba(15, 23, 42, 0.12);
}

.option-search {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.45rem 0.6rem;
  font-size: 0.85rem;
  background: #fff;
}

.option-item {
  border: none;
  background: transparent;
  text-align: left;
  padding: 0.5rem 0.7rem;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 500;
  color: #1f2937;
}

.option-item:hover {
  background: #e2e8f0;
}

.user-option {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
}

.user-label {
  flex: 1;
  font-size: 0.85rem;
}

.user-selected {
  font-size: 0.75rem;
  color: #2563eb;
  font-weight: 600;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  background: #f8fafc;
  border-radius: 16px;
  padding: 0.8rem 1rem;
}

.user-profile .user-avatar {
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

.panel-badge-pending {
  background: #fef3c7;
  color: #92400e;
}

.panel-badge-empty {
  background: #f1f5f9;
  color: #94a3b8;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.3rem;
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
  align-items: start;
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

.time-card-title {
  margin: 0 0 0.3rem;
  font-size: 1rem;
  font-weight: 700;
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
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.6rem;
  align-items: start;
}

.follow-up-main {
  display: grid;
  gap: 0.35rem;
}

.follow-up-text {
  color: #0f172a;
  font-size: 0.9rem;
}

.follow-up-index {
  font-weight: 600;
  color: #64748b;
}

.follow-up-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: #94a3b8;
}

.follow-up-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.meta-label {
  font-weight: 600;
  color: #94a3b8;
}

.meta-value {
  color: #475569;
}

.follow-up-actions {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  flex-wrap: wrap;
}

.timeline-note {
  margin: 0.5rem 0 0;
  color: #cbd5e1;
  font-size: 0.85rem;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
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

  .dashboard-content {
    padding: 2.5rem 6vw 3.5rem;
  }
}
</style>
