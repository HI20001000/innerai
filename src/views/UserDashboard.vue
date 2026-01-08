<script setup>
import { computed, getCurrentInstance, ref } from 'vue'
import WorkspaceSidebar from '../components/WorkspaceSidebar.vue'
import MonthlyCalendar from '../components/MonthlyCalendar.vue'
import { formatDateTimeDisplay, getTaipeiTodayKey } from '../scripts/time.js'

const router = getCurrentInstance().appContext.config.globalProperties.$router
const activePath = computed(() => router?.currentRoute?.value?.path || '')
const todayKey = getTaipeiTodayKey()

const goToNewTask = () => router?.push('/tasks/new')
const goToTaskList = () => router?.push('/tasks/view')
const goToMeetingUpload = () => router?.push('/meetings/upload')
const goToMeetingRecords = () => router?.push('/meetings')
const goToHome = () => router?.push('/home')
const goToProfile = () => router?.push('/settings')
const goToUserDashboard = () => router?.push('/users/dashboard')

const users = ref([
  {
    id: 'u-001',
    name: '王小明',
    role: '業務經理',
    department: '北區銷售',
    mail: 'ming.wang@example.com',
  },
  {
    id: 'u-002',
    name: '陳思怡',
    role: '業務專員',
    department: '中區銷售',
    mail: 'siyi.chen@example.com',
  },
  {
    id: 'u-003',
    name: '李建宏',
    role: '客戶成功',
    department: '南區客戶關係',
    mail: 'jianhong.li@example.com',
  },
])

const selectedUserId = ref(users.value[0]?.id || '')
const selectedDate = ref(todayKey)
const statusFilter = ref('all')
const searchQuery = ref('')

const allTasks = ref([
  {
    id: 't-101',
    userId: 'u-001',
    title: '拜訪宏碁 - 需求確認',
    scheduled_at: `${todayKey} 09:30`,
    status: '待處理',
    progress: 40,
    owner: '王小明',
  },
  {
    id: 't-102',
    userId: 'u-001',
    title: '整理合約條款',
    scheduled_at: `${todayKey} 14:00`,
    status: '進行中',
    progress: 70,
    owner: '王小明',
  },
  {
    id: 't-103',
    userId: 'u-001',
    title: '回覆採購問題',
    scheduled_at: '2025-01-10 11:00',
    status: '已完成',
    progress: 100,
    owner: '王小明',
  },
  {
    id: 't-201',
    userId: 'u-002',
    title: '產品 Demo 準備',
    scheduled_at: `${todayKey} 10:30`,
    status: '待處理',
    progress: 20,
    owner: '陳思怡',
  },
  {
    id: 't-202',
    userId: 'u-002',
    title: '回訪老客戶',
    scheduled_at: '2025-01-08 15:00',
    status: '未完成',
    progress: 35,
    owner: '陳思怡',
  },
  {
    id: 't-301',
    userId: 'u-003',
    title: '整理客戶培訓素材',
    scheduled_at: `${todayKey} 16:00`,
    status: '進行中',
    progress: 55,
    owner: '李建宏',
  },
])

const selectedUser = computed(
  () => users.value.find((user) => user.id === selectedUserId.value) || users.value[0]
)

const filteredTasks = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return allTasks.value.filter((task) => {
    if (task.userId !== selectedUser.value?.id) return false
    if (statusFilter.value !== 'all' && task.status !== statusFilter.value) return false
    if (!query) return true
    return task.title.toLowerCase().includes(query) || task.owner.toLowerCase().includes(query)
  })
})

const tasksForDate = computed(() => {
  return filteredTasks.value.filter((task) => task.scheduled_at.startsWith(selectedDate.value))
})

const totalCount = computed(() => filteredTasks.value.length)
const pendingCount = computed(
  () => filteredTasks.value.filter((task) => task.status !== '已完成').length
)
const overdueCount = computed(() =>
  filteredTasks.value.filter(
    (task) => task.status !== '已完成' && task.scheduled_at.slice(0, 10) < todayKey
  ).length
)
const completionRate = computed(() => {
  if (totalCount.value === 0) return 0
  const completed = filteredTasks.value.filter((task) => task.status === '已完成').length
  return Math.round((completed / totalCount.value) * 100)
})

const calendarSubmissions = computed(() => {
  if (!selectedUser.value) return []
  return filteredTasks.value.map((task) => ({
    id: task.id,
    scheduled_at: task.scheduled_at,
    related_users: [{ mail: selectedUser.value.mail }],
    follow_ups: [{ status_name: task.status }],
  }))
})

const handleSelectDate = (dateKey) => {
  selectedDate.value = dateKey
}
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
          <select v-model="selectedUserId">
            <option v-for="user in users" :key="user.id" :value="user.id">
              {{ user.name }}｜{{ user.department }}
            </option>
          </select>
        </label>
        <label class="control">
          <span>狀態篩選</span>
          <select v-model="statusFilter">
            <option value="all">全部</option>
            <option value="待處理">待處理</option>
            <option value="進行中">進行中</option>
            <option value="未完成">未完成</option>
            <option value="已完成">已完成</option>
          </select>
        </label>
        <label class="control wide">
          <span>搜尋任務</span>
          <input v-model="searchQuery" type="text" placeholder="搜尋任務或負責人" />
        </label>
        <div class="user-profile">
          <div class="user-avatar">👤</div>
          <div>
            <p class="user-name">{{ selectedUser?.name }}</p>
            <p class="user-meta">{{ selectedUser?.role }}｜{{ selectedUser?.department }}</p>
          </div>
        </div>
      </section>

      <section class="summary-grid">
        <article class="summary-card">
          <p class="card-label">任務總數</p>
          <p class="card-value">{{ totalCount }}</p>
          <p class="card-meta">目前篩選條件下的任務總量</p>
        </article>
        <article class="summary-card">
          <p class="card-label">待處理</p>
          <p class="card-value">{{ pendingCount }}</p>
          <p class="card-meta">尚未完成的任務</p>
        </article>
        <article class="summary-card">
          <p class="card-label">逾期未完成</p>
          <p class="card-value">{{ overdueCount }}</p>
          <p class="card-meta">日期早於今日且未完成</p>
        </article>
        <article class="summary-card">
          <p class="card-label">完成率</p>
          <p class="card-value">{{ completionRate }}%</p>
          <p class="card-meta">以目前篩選範圍計算</p>
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
            <p v-if="tasksForDate.length === 0" class="empty-state">此日期沒有任務。</p>
            <div v-else class="task-cards">
              <article v-for="task in tasksForDate" :key="task.id" class="task-card">
                <div>
                  <p class="task-time">{{ formatDateTimeDisplay(task.scheduled_at) }}</p>
                  <h3 class="task-title">{{ task.title }}</h3>
                  <p class="task-meta">負責人：{{ task.owner }}</p>
                </div>
                <div class="task-status">
                  <span class="status-chip">{{ task.status }}</span>
                  <div class="progress">
                    <div class="progress-bar" :style="{ width: `${task.progress}%` }"></div>
                  </div>
                  <span class="progress-label">{{ task.progress }}%</span>
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
  grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(0, 1.3fr);
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

.control.wide {
  grid-column: span 2;
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
