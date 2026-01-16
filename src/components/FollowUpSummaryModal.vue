<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { formatDateTimeDisplay, toDateKey } from '../scripts/time.js'

const apiBaseUrl = 'http://localhost:3001'

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
})

const emit = defineEmits(['close', 'select-date'])

const followUpStatuses = ref([])
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

const matchesStatusFilter = (followUp) => {
  if (!followUp) return false
  const statusName = followUp.status_name || '進行中'
  if (props.statusFilter === 'completed') return statusName === '已完成'
  if (props.statusFilter === 'incomplete') return statusName === '未完成'
  if (props.statusFilter === 'in_progress') {
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

const hierarchy = computed(() => {
  const result = new Map()
  const items = props.submissions || []
  items.forEach((submission) => {
    const followUps = Array.isArray(submission.follow_ups) ? submission.follow_ups : []
    const filtered = followUps.filter(matchesStatusFilter)
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
        })),
      })),
    })),
  }))
})

const updateFollowUpStatus = async (followUp, statusId) => {
  const auth = readAuthStorage()
  if (!auth || !followUp) return
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
  const status = followUpStatuses.value.find((item) => item.id === statusId)
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
                      <div class="followup-meta-block">
                        <span class="followup-meta-label">跟進人</span>
                        <details class="followup-meta-control">
                          <summary>{{ getAssigneeText(followUp) }}</summary>
                          <div class="followup-meta-panel">
                            <label
                              v-for="user in task.submission.related_users || []"
                              :key="user.mail"
                              class="followup-meta-option"
                            >
                              <input
                                type="checkbox"
                                :checked="(followUp.assignees || []).some((assignee) => assignee.mail === user.mail)"
                                @change="toggleAssignee(followUp, user, task.submission.related_users || [])"
                              />
                              <span>{{ user.username || user.mail }}</span>
                            </label>
                          </div>
                        </details>
                      </div>
                      <div class="followup-meta-block">
                        <span class="followup-meta-label">任務狀態</span>
                        <select
                          class="followup-status-select"
                          :value="followUp.status_id || ''"
                          @change="updateFollowUpStatus(followUp, Number($event.target.value))"
                        >
                          <option value="" disabled>選擇狀態</option>
                          <option v-for="status in followUpStatuses" :key="status.id" :value="status.id">
                            {{ status.name }}
                          </option>
                        </select>
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
  max-height: 85vh;
  overflow: auto;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.35);
  display: grid;
  gap: 1.5rem;
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
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.followup-task-title {
  font-weight: 600;
  color: #0f172a;
}

.followup-task-meta {
  color: #64748b;
  font-size: 0.8rem;
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
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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

.followup-status-select {
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 0.35rem 0.5rem;
  font-size: 0.8rem;
}

.followup-meta-control {
  border-radius: 10px;
  background: #fff;
  padding: 0.35rem 0.5rem;
  border: 1px solid #e2e8f0;
}

.followup-meta-control summary {
  cursor: pointer;
  font-size: 0.8rem;
  color: #1f2937;
}

.followup-meta-panel {
  margin-top: 0.5rem;
  display: grid;
  gap: 0.35rem;
}

.followup-meta-option {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #1f2937;
}
</style>
