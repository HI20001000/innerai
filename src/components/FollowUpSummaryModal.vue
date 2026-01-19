<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { formatDateTimeDisplay, toDateKey } from '../scripts/time.js'
import { apiBaseUrl } from '../scripts/apiBaseUrl.js'


const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '跟進任務',
  },
  statusFilter: {
    type: String,
    default: 'all',
  },
  submissions: {
    type: Array,
    default: () => [],
  },
  includeOverdueIncomplete: {
    type: Boolean,
    default: false,
  },
  referenceDate: {
    type: [String, Date],
    default: '',
  },
})

const emit = defineEmits(['close', 'select-date'])

const followUpStatuses = ref([])
const isLoading = ref(false)
const activeStatusMenu = ref(null)
const activeAssigneeMenu = ref(null)
const statusSearch = ref('')
const assigneeSearch = ref('')

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

const readUserProfile = () => {
  const raw = window.localStorage.getItem('innerai_user')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const fetchStatuses = async () => {
  const auth = readAuthStorage()
  if (!auth) return
  isLoading.value = true
  try {
    const response = await fetch(`${apiBaseUrl}/api/follow-up-statuses`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    const data = await response.json()
    if (!response.ok || !data?.success) return
    followUpStatuses.value = data.data || []
  } catch (error) {
    console.error(error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (props.open) fetchStatuses()
})

watch(
  () => props.open,
  (value) => {
    if (value && followUpStatuses.value.length === 0) {
      fetchStatuses()
    }
  }
)

const isOverdue = (submission) => {
  if (!props.includeOverdueIncomplete || !props.referenceDate) return false
  const refKey = toDateKey(props.referenceDate)
  if (!refKey) return false
  const endKey = toDateKey(submission?.end_at)
  if (!endKey) return false
  return endKey < refKey
}

const matchesStatusFilter = (followUp, submission) => {
  if (!followUp) return false
  const statusName = followUp.status_name || '進行中'
  if (props.statusFilter === 'completed') return statusName === '已完成'
  if (props.statusFilter === 'incomplete') {
    return statusName === '未完成' || isOverdue(submission)
  }
  if (props.statusFilter === 'in_progress') {
    if (isOverdue(submission)) return false
    return statusName !== '已完成' && statusName !== '未完成'
  }
  if (props.statusFilter === 'unassigned') {
    return (followUp.assignees || []).length === 0
  }
  return true
}

const getTaskLabel = (submission) => {
  const fallbackLabel = `${submission.client_name || '客戶'}_${submission.vendor_name || '廠家'}_${
    submission.product_name || '產品'
  }`
  return submission.tag || submission.tag_name || submission.label || submission.task_label || fallbackLabel
}

const getSubmissionTags = (submission) => {
  const raw = submission?.tags ?? submission?.tag ?? submission?.tag_name ?? []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  }
  return []
}

const hierarchy = computed(() => {
  const result = new Map()
  const items = props.submissions || []
  items.forEach((submission) => {
    const followUps = Array.isArray(submission.follow_ups) ? submission.follow_ups : []
    const filtered = followUps.filter((followUp) => matchesStatusFilter(followUp, submission))
    if (filtered.length === 0) return
    const clientName = submission.client_name || '客戶'
    const vendorName = submission.vendor_name || '廠家'
    const productName = submission.product_name || '產品'
    const taskLabel = getTaskLabel(submission)
    if (!result.has(clientName)) {
      result.set(clientName, new Map())
    }
    const vendorMap = result.get(clientName)
    if (!vendorMap.has(vendorName)) {
      vendorMap.set(vendorName, new Map())
    }
    const productMap = vendorMap.get(vendorName)
    if (!productMap.has(productName)) {
      productMap.set(productName, new Map())
    }
    const taskMap = productMap.get(productName)
    if (!taskMap.has(taskLabel)) {
      taskMap.set(taskLabel, {
        submission,
        followUps: [],
      })
    }
    taskMap.get(taskLabel).followUps.push(...filtered)
  })
  return Array.from(result.entries()).map(([clientName, vendorMap]) => ({
    clientName,
    vendors: Array.from(vendorMap.entries()).map(([vendorName, productMap]) => ({
      vendorName,
      products: Array.from(productMap.entries()).map(([productName, taskMap]) => ({
        productName,
        tasks: Array.from(taskMap.entries()).map(([taskLabel, taskInfo]) => ({
          taskLabel,
          submission: taskInfo.submission,
          followUps: taskInfo.followUps,
          tags: getSubmissionTags(taskInfo.submission),
        })),
      })),
    })),
  }))
})

const updateFollowUpStatus = async (followUp, status) => {
  const auth = readAuthStorage()
  if (!auth || !followUp) return
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
  followUp.status_bg_color = status?.bg_color || ''
  const user = readUserProfile()
  if (user) {
    followUp.status_updated_by = user.mail || ''
    followUp.status_updated_by_name = user.username || ''
  }
}

const updateFollowUpAssignees = async (followUp, assignees, relatedUsers) => {
  const auth = readAuthStorage()
  if (!auth || !followUp) return
  const response = await fetch(`${apiBaseUrl}/api/task-submission-followups/${followUp.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify({ assignees }),
  })
  const data = await response.json()
  if (!response.ok || !data?.success) return
  followUp.assignees = relatedUsers.filter((user) => assignees.includes(user.mail))
}

const toggleAssignee = async (followUp, user, relatedUsers) => {
  const mail = user?.mail
  if (!mail) return
  const current = Array.isArray(followUp?.assignees) ? followUp.assignees : []
  const mails = current.map((assignee) => assignee.mail)
  const next = mails.includes(mail) ? mails.filter((item) => item !== mail) : [...mails, mail]
  await updateFollowUpAssignees(followUp, next, relatedUsers)
}

const toggleStatusMenu = (followUpId) => {
  statusSearch.value = ''
  activeStatusMenu.value = activeStatusMenu.value === followUpId ? null : followUpId
}

const toggleAssigneeMenu = (followUpId) => {
  assigneeSearch.value = ''
  activeAssigneeMenu.value = activeAssigneeMenu.value === followUpId ? null : followUpId
}

const isAssigneeSelected = (followUp, mail) =>
  Array.isArray(followUp?.assignees) && followUp.assignees.some((user) => user.mail === mail)

const filteredStatuses = computed(() => {
  const query = statusSearch.value.trim().toLowerCase()
  if (!query) return followUpStatuses.value
  return followUpStatuses.value.filter((status) => status.name.toLowerCase().includes(query))
})

const getFilteredRelatedUsers = (submission) => {
  const relatedUsers = Array.isArray(submission?.related_users) ? submission.related_users : []
  const query = assigneeSearch.value.trim().toLowerCase()
  if (!query) return relatedUsers
  return relatedUsers.filter((user) => {
    const name = String(user.username || '').toLowerCase()
    const mail = String(user.mail || '').toLowerCase()
    return name.includes(query) || mail.includes(query)
  })
}

const getAssigneeButtonText = (followUp) => {
  const assignees = followUp?.assignees || []
  if (assignees.length === 0) return '選擇跟進人'
  const names = assignees.map((user) => user.username || user.mail).filter(Boolean)
  return names.length > 0 ? names.join('、') : '選擇跟進人'
}

const getAssigneeText = (followUp) => {
  const names = (followUp?.assignees || [])
    .map((user) => user.username || user.mail)
    .filter(Boolean)
  return names.length > 0 ? names.join('、') : '未指派'
}

const handleSelectFollowUp = (submission) => {
  const dateKey = toDateKey(submission?.end_at)
  if (!dateKey) return
  emit('select-date', dateKey)
  emit('close')
}
</script>

<template>
  <div v-if="open" class="followup-modal">
    <div class="followup-modal-backdrop" @click="emit('close')"></div>
    <div class="followup-modal-card">
      <header class="followup-modal-header">
        <div>
          <p class="followup-modal-eyebrow">跟進任務總覽</p>
          <h3 class="followup-modal-title">{{ title }}</h3>
        </div>
        <button type="button" class="followup-modal-close" @click="emit('close')">✕</button>
      </header>
      <div v-if="isLoading" class="followup-modal-empty">載入狀態中...</div>
      <div v-else-if="hierarchy.length === 0" class="followup-modal-empty">目前沒有符合條件的跟進任務。</div>
      <div v-else class="followup-modal-body">
        <div v-for="client in hierarchy" :key="client.clientName" class="followup-level">
          <h4 class="followup-level-title">{{ client.clientName }}</h4>
          <div v-for="vendor in client.vendors" :key="vendor.vendorName" class="followup-level">
            <h5 class="followup-level-subtitle">{{ vendor.vendorName }}</h5>
            <div v-for="product in vendor.products" :key="product.productName" class="followup-level">
              <h6 class="followup-level-product">{{ product.productName }}</h6>
              <div v-for="task in product.tasks" :key="task.taskLabel" class="followup-task">
                <div class="followup-task-header">
                  <span class="followup-task-title">{{ task.taskLabel }}</span>
                  <span v-if="task.tags?.length" class="followup-task-tags">
                    {{ task.tags.join('、') }}
                  </span>
                  <span class="followup-task-meta">
                    結束時間：{{ formatDateTimeDisplay(task.submission.end_at) }}
                  </span>
                </div>
                <div class="followup-list">
                  <div
                    v-for="followUp in task.followUps"
                    :key="followUp.id || followUp.content"
                    class="followup-item"
                  >
                    <button
                      type="button"
                      class="followup-item-content"
                      @click="handleSelectFollowUp(task.submission)"
                    >
                      {{ followUp.content || '跟進任務' }}
                    </button>
                    <div class="followup-item-meta">
                      <div class="followup-actions">
                        <div class="status-select">
                          <button
                            type="button"
                            class="status-select-button"
                            @click="toggleStatusMenu(followUp.id)"
                          >
                            <span
                              v-if="followUp.status_bg_color"
                              class="status-dot"
                              :style="{ backgroundColor: followUp.status_bg_color }"
                            ></span>
                            {{ followUp.status_name || '選擇狀態' }}
                          </button>
                          <div v-if="activeStatusMenu === followUp.id" class="status-menu">
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
                                updateFollowUpStatus(followUp, status);
                                activeStatusMenu = null
                              "
                            >
                              <span
                                class="status-dot"
                                :style="{ backgroundColor: status.bg_color || '#e2e8f0' }"
                              ></span>
                              {{ status.name }}
                            </button>
                          </div>
                        </div>
                        <div class="assignee-select">
                          <button
                            type="button"
                            class="select-field"
                            @click="toggleAssigneeMenu(followUp.id)"
                          >
                            {{ getAssigneeButtonText(followUp) }}
                          </button>
                          <div v-if="activeAssigneeMenu === followUp.id" class="option-list">
                            <input
                              v-model="assigneeSearch"
                              class="option-search"
                              type="text"
                              placeholder="搜尋用戶"
                            />
                            <button
                              v-for="user in getFilteredRelatedUsers(task.submission)"
                              :key="user.mail"
                              type="button"
                              class="option-item user-option"
                              @click="toggleAssignee(followUp, user, task.submission.related_users || [])"
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
                              <span v-if="isAssigneeSelected(followUp, user.mail)" class="user-selected">
                                已選
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                      <div class="followup-meta-block">
                        <span class="followup-meta-label">結束時間</span>
                        <span class="followup-meta-value">{{ formatDateTimeDisplay(task.submission.end_at) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.followup-modal {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
}

.followup-modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
}

.followup-modal-card {
  position: relative;
  background: #fff;
  border-radius: 24px;
  padding: 1.8rem;
  width: min(1100px, 92vw);
  height: 90vh;
  max-height: 90vh;
  overflow: auto;
  padding-right: 2.2rem;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.35);
  display: grid;
  gap: 1.5rem;
  align-content: start;
  align-items: start;
}

.followup-modal-card::-webkit-scrollbar {
  width: 8px;
}

.followup-modal-card::-webkit-scrollbar-track {
  background: rgba(148, 163, 184, 0.2);
  border-radius: 24px;
}

.followup-modal-card::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #111827, #334155);
  border-radius: 24px;
}

.followup-modal-card::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #1f2937, #475569);
}

.followup-modal-card {
  scrollbar-color: #1f2937 rgba(148, 163, 184, 0.2);
  scrollbar-width: thin;
}

.followup-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.followup-modal-eyebrow {
  margin: 0;
  color: #94a3b8;
  font-size: 0.75rem;
}

.followup-modal-title {
  margin: 0.3rem 0 0;
  font-size: 1.25rem;
  color: #0f172a;
}

.followup-modal-close {
  border: none;
  background: #f1f5f9;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 1rem;
}

.followup-modal-empty {
  color: #64748b;
  text-align: center;
  padding: 2rem 0;
}

.followup-level {
  display: grid;
  gap: 0.8rem;
}

.followup-level-title {
  margin: 0;
  font-size: 1.05rem;
  color: #0f172a;
}

.followup-level-subtitle {
  margin: 0;
  font-size: 0.95rem;
  color: #1f2937;
}

.followup-level-product {
  margin: 0;
  font-size: 0.9rem;
  color: #334155;
}

.followup-task {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 1rem;
  display: grid;
  gap: 0.9rem;
}

.followup-task-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.followup-task-title {
  font-weight: 600;
  color: #0f172a;
}

.followup-task-tags {
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
}

.followup-task-meta {
  color: #64748b;
  font-size: 0.8rem;
  margin-left: auto;
}

.followup-list {
  display: grid;
  gap: 0.8rem;
}

.followup-item {
  border-radius: 12px;
  background: #f8fafc;
  padding: 0.8rem;
  display: grid;
  gap: 0.8rem;
}

.followup-item-content {
  border: none;
  background: transparent;
  text-align: left;
  font-weight: 600;
  color: #0f172a;
  cursor: pointer;
}

.followup-item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  align-items: flex-start;
}

.followup-meta-block {
  display: grid;
  gap: 0.35rem;
}

.followup-meta-label {
  font-size: 0.75rem;
  color: #94a3b8;
}

.followup-meta-value {
  font-size: 0.85rem;
  color: #1f2937;
}

.followup-actions {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  flex-wrap: wrap;
  flex: 1;
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

.assignee-select {
  position: relative;
  min-width: 220px;
  flex: 1;
}

.select-field {
  width: 100%;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 12px;
  padding: 0.45rem 0.7rem;
  font-size: 0.85rem;
  text-align: left;
  cursor: pointer;
  color: #0f172a;
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
  max-height: 180px;
  overflow: auto;
  z-index: 10;
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
  width: 100%;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  background: #e2e8f0;
}

.user-label {
  font-size: 0.85rem;
  color: #1f2937;
}

.user-selected {
  margin-left: auto;
  font-size: 0.75rem;
  color: #16a34a;
  font-weight: 600;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
}
</style>
