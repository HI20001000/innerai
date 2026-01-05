<script setup>
import { getCurrentInstance, onMounted, ref } from 'vue'
import WorkspaceSidebar from '../components/WorkspaceSidebar.vue'
import ResultModal from '../components/ResultModal.vue'

const router = getCurrentInstance().appContext.config.globalProperties.$router
const apiBaseUrl = 'http://localhost:3001'
const submissions = ref([])
const isLoading = ref(false)
const editingId = ref(null)
const editForm = ref({
  client: '',
  vendor: '',
  product: '',
  tag: '',
  scheduled_at: '',
  location: '',
  follow_up: '',
})
const showResult = ref(false)
const resultTitle = ref('')
const resultMessage = ref('')

const goToNewTask = () => {
  router?.push('/tasks/new')
}

const goToHome = () => {
  router?.push('/home')
}

const goToProfile = () => {
  router?.push('/settings')
}

const goToTaskList = () => {
  router?.push('/tasks/view')
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

const parseJsonSafe = async (response) => {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

const formatDateTimeDisplay = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  return new Date(value).toISOString().replace('T', ' ').slice(0, 19)
}

const formatDateTimeInput = (value) => {
  if (!value) return ''
  if (typeof value === 'string') {
    return value.includes('T') ? value : value.replace(' ', 'T').slice(0, 16)
  }
  return new Date(value).toISOString().slice(0, 16)
}

const fetchSubmissions = async () => {
  const auth = readAuthStorage()
  if (!auth) {
    resultTitle.value = '無法載入'
    resultMessage.value = '請先登入再檢視任務。'
    showResult.value = true
    return
  }
  isLoading.value = true
  try {
    const response = await fetch(`${apiBaseUrl}/api/task-submissions`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    })
    const data = await parseJsonSafe(response)
    if (!response.ok || !data?.success) {
      resultTitle.value = '讀取失敗'
      resultMessage.value = data?.message || '無法讀取任務資料'
      showResult.value = true
      return
    }
    submissions.value = data.data || []
  } catch (error) {
    console.error(error)
    resultTitle.value = '讀取失敗'
    resultMessage.value = '無法讀取任務資料'
    showResult.value = true
  } finally {
    isLoading.value = false
  }
}

const startEdit = (submission) => {
  editingId.value = submission.id
  editForm.value = {
    client: submission.client_name,
    vendor: submission.vendor_name,
    product: submission.product_name,
    tag: submission.tag_name,
    scheduled_at: formatDateTimeInput(submission.scheduled_at),
    location: submission.location,
    follow_up: submission.follow_up,
  }
}

const cancelEdit = () => {
  editingId.value = null
}

const saveEdit = async (id) => {
  const auth = readAuthStorage()
  if (!auth) {
    resultTitle.value = '更新失敗'
    resultMessage.value = '請先登入再更新任務。'
    showResult.value = true
    return
  }
  if (
    !editForm.value.client?.trim() ||
    !editForm.value.vendor?.trim() ||
    !editForm.value.product?.trim() ||
    !editForm.value.tag?.trim() ||
    !editForm.value.scheduled_at?.trim() ||
    !editForm.value.location?.trim() ||
    !editForm.value.follow_up?.trim()
  ) {
    resultTitle.value = '更新失敗'
    resultMessage.value = '請先填寫所有欄位再儲存。'
    showResult.value = true
    return
  }
  try {
    const response = await fetch(`${apiBaseUrl}/api/task-submissions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify(editForm.value),
    })
    const data = await parseJsonSafe(response)
    if (!response.ok || !data?.success) {
      resultTitle.value = '更新失敗'
      resultMessage.value = data?.message || '任務更新失敗'
      showResult.value = true
      return
    }
    resultTitle.value = '更新成功'
    resultMessage.value = data?.message || '任務更新成功'
    showResult.value = true
    await fetchSubmissions()
    editingId.value = null
  } catch (error) {
    console.error(error)
    resultTitle.value = '更新失敗'
    resultMessage.value = '任務更新失敗'
    showResult.value = true
  }
}

const deleteSubmission = async (id) => {
  if (!window.confirm('確定要刪除此任務嗎？')) return
  const auth = readAuthStorage()
  if (!auth) {
    resultTitle.value = '刪除失敗'
    resultMessage.value = '請先登入再刪除任務。'
    showResult.value = true
    return
  }
  try {
    const response = await fetch(`${apiBaseUrl}/api/task-submissions/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    })
    const data = await parseJsonSafe(response)
    if (!response.ok || !data?.success) {
      resultTitle.value = '刪除失敗'
      resultMessage.value = data?.message || '任務刪除失敗'
      showResult.value = true
      return
    }
    resultTitle.value = '刪除成功'
    resultMessage.value = data?.message || '任務已刪除'
    showResult.value = true
    submissions.value = submissions.value.filter((item) => item.id !== id)
  } catch (error) {
    console.error(error)
    resultTitle.value = '刪除失敗'
    resultMessage.value = '任務刪除失敗'
    showResult.value = true
  }
}

onMounted(fetchSubmissions)
</script>

<template>
  <div class="task-view-page">
    <WorkspaceSidebar
      :on-create-task="goToNewTask"
      :on-go-home="goToHome"
      :on-go-profile="goToProfile"
      :on-view-tasks="goToTaskList"
    />

    <header class="task-view-header">
      <div>
        <p class="eyebrow">檢視任務</p>
        <h1 class="headline">任務提交清單</h1>
        <p class="subhead">檢視、編輯或刪除已提交的任務資料。</p>
      </div>
      <div class="header-actions">
        <button class="primary-button" type="button" @click="goToNewTask">新增任務</button>
      </div>
    </header>

    <section class="task-table-section">
      <div v-if="isLoading" class="loading-state">載入中...</div>
      <div v-else-if="submissions.length === 0" class="empty-state">
        尚無提交紀錄，請先新增任務。
      </div>
      <div v-else class="table-wrapper">
        <table class="task-table">
          <thead>
            <tr>
              <th>客戶</th>
              <th>廠家</th>
              <th>廠家產品</th>
              <th>標籤</th>
              <th>時間</th>
              <th>地點</th>
              <th>需跟進內容</th>
              <th>建立者</th>
              <th>建立時間</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in submissions" :key="item.id">
              <td>
                <template v-if="editingId === item.id">
                  <input v-model="editForm.client" type="text" />
                </template>
                <template v-else>{{ item.client_name }}</template>
              </td>
              <td>
                <template v-if="editingId === item.id">
                  <input v-model="editForm.vendor" type="text" />
                </template>
                <template v-else>{{ item.vendor_name }}</template>
              </td>
              <td>
                <template v-if="editingId === item.id">
                  <input v-model="editForm.product" type="text" />
                </template>
                <template v-else>{{ item.product_name }}</template>
              </td>
              <td>
                <template v-if="editingId === item.id">
                  <input v-model="editForm.tag" type="text" />
                </template>
                <template v-else>{{ item.tag_name }}</template>
              </td>
              <td>
                <template v-if="editingId === item.id">
                  <input v-model="editForm.scheduled_at" type="datetime-local" />
                </template>
                <template v-else>{{ formatDateTimeDisplay(item.scheduled_at) }}</template>
              </td>
              <td>
                <template v-if="editingId === item.id">
                  <input v-model="editForm.location" type="text" />
                </template>
                <template v-else>{{ item.location }}</template>
              </td>
              <td>
                <template v-if="editingId === item.id">
                  <textarea v-model="editForm.follow_up" rows="2"></textarea>
                </template>
                <template v-else>{{ item.follow_up }}</template>
              </td>
              <td>{{ item.created_by_email }}</td>
              <td>{{ formatDateTimeDisplay(item.created_at) }}</td>
              <td class="action-cell">
                <template v-if="editingId === item.id">
                  <button class="ghost-button" type="button" @click="cancelEdit">取消</button>
                  <button class="primary-button" type="button" @click="saveEdit(item.id)">
                    儲存
                  </button>
                </template>
                <template v-else>
                  <button class="ghost-button" type="button" @click="startEdit(item)">
                    編輯
                  </button>
                  <button class="danger-button" type="button" @click="deleteSubmission(item.id)">
                    刪除
                  </button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <ResultModal
      :is-open="showResult"
      :title="resultTitle"
      :message="resultMessage"
      @close="showResult = false"
    />
  </div>
</template>

<style scoped>
.task-view-page {
  min-height: 100vh;
  padding: 3.5rem 6vw 4.5rem calc(6vw + 88px);
  background: #f6f7fb;
  color: #0f172a;
  display: grid;
  gap: 2.5rem;
}

.task-view-header {
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

.primary-button {
  border: none;
  background: #111827;
  color: #fff;
  padding: 0.75rem 1.6rem;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
}

.ghost-button {
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 0.6rem 1.2rem;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  color: #475569;
}

.danger-button {
  border: none;
  background: #dc2626;
  color: #fff;
  padding: 0.6rem 1.2rem;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
}

.task-table-section {
  background: #fff;
  padding: 1.5rem;
  border-radius: 24px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
}

.loading-state,
.empty-state {
  color: #64748b;
  font-weight: 500;
  padding: 1rem 0.5rem;
}

.table-wrapper {
  overflow-x: auto;
}

.task-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 960px;
}

.task-table th,
.task-table td {
  text-align: left;
  padding: 0.75rem 0.6rem;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.9rem;
  vertical-align: top;
}

.task-table th {
  color: #64748b;
  font-weight: 600;
}

.task-table input,
.task-table textarea {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.45rem 0.6rem;
  font-size: 0.85rem;
  font-family: inherit;
}

.task-table textarea {
  resize: vertical;
}

.action-cell {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

@media (max-width: 960px) {
  .task-view-page {
    padding: 2.5rem 6vw 3rem;
  }

  .task-view-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
