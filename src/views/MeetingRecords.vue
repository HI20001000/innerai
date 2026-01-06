<script setup>
import { computed, getCurrentInstance, onMounted, ref } from 'vue'
import WorkspaceSidebar from '../components/WorkspaceSidebar.vue'
import ResultModal from '../components/ResultModal.vue'

const apiBaseUrl = 'http://localhost:3001'
const router = getCurrentInstance().appContext.config.globalProperties.$router
const activePath = computed(() => router?.currentRoute?.value?.path || '')

const records = ref([])
const isLoading = ref(false)
const showResult = ref(false)
const resultTitle = ref('')
const resultMessage = ref('')

const goToNewTask = () => router?.push('/tasks/new')
const goToTaskList = () => router?.push('/tasks/view')
const goToMeetingUpload = () => router?.push('/meetings/upload')
const goToMeetingRecords = () => router?.push('/meetings')
const goToHome = () => router?.push('/home')
const goToProfile = () => router?.push('/settings')

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

const decodeBase64 = (value) => {
  if (!value) return ''
  try {
    return atob(value)
  } catch {
    return ''
  }
}

const fetchMeetingRecords = async () => {
  const auth = readAuthStorage()
  if (!auth) {
    resultTitle.value = '無法載入'
    resultMessage.value = '請先登入再檢視會議記錄。'
    showResult.value = true
    return
  }
  isLoading.value = true
  try {
    const response = await fetch(`${apiBaseUrl}/api/meeting-records`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    const data = await parseJsonSafe(response)
    if (!response.ok || !data?.success) {
      resultTitle.value = '讀取失敗'
      resultMessage.value = data?.message || '無法讀取會議記錄'
      showResult.value = true
      return
    }
    records.value = data.data || []
  } catch (error) {
    console.error(error)
    resultTitle.value = '讀取失敗'
    resultMessage.value = '無法讀取會議記錄'
    showResult.value = true
  } finally {
    isLoading.value = false
  }
}

const formatDateTimeDisplay = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value.replace('T', ' ').slice(0, 19)
  return new Date(value).toISOString().replace('T', ' ').slice(0, 19)
}

onMounted(fetchMeetingRecords)
</script>

<template>
  <div class="meeting-records-page">
    <WorkspaceSidebar
      :on-create-task="goToNewTask"
      :on-view-tasks="goToTaskList"
      :on-upload-meeting="goToMeetingUpload"
      :on-view-meetings="goToMeetingRecords"
      :on-go-home="goToHome"
      :on-go-profile="goToProfile"
      :active-path="activePath"
    />

    <header class="meeting-header">
      <div>
        <p class="eyebrow">會議記錄</p>
        <h1 class="headline">會議記錄檢視</h1>
        <p class="subhead">預覽客戶樹級關係與會議記錄檔案內容。</p>
      </div>
    </header>

    <section class="meeting-list">
      <div v-if="isLoading" class="loading-state">載入中...</div>
      <div v-else-if="records.length === 0" class="empty-state">尚無會議記錄</div>
      <div v-else class="folder-list">
        <article v-for="folder in records" :key="folder.id" class="folder-card">
          <header class="folder-header">
            <div>
              <h2>
                {{ folder.client_name }} / {{ folder.vendor_name }} / {{ folder.product_name }}
              </h2>
              <p class="meta">
                會議時間：{{ formatDateTimeDisplay(folder.meeting_time) }}
              </p>
              <p class="meta">
                建立者：{{ folder.created_by_email }}｜建立時間：{{
                  formatDateTimeDisplay(folder.created_at)
                }}
              </p>
            </div>
            <span class="count">{{ folder.records.length }} 份記錄</span>
          </header>
          <div class="record-list">
            <div v-for="record in folder.records" :key="record.id" class="record-card">
              <div class="record-title">
                <strong>{{ record.file_name }}</strong>
                <span class="record-path">{{ record.file_path }}</span>
              </div>
              <pre class="record-content">{{ decodeBase64(record.content_base64) }}</pre>
            </div>
          </div>
        </article>
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
.meeting-records-page {
  min-height: 100vh;
  padding: 3.5rem 6vw 4.5rem calc(6vw + 88px);
  background: #f6f7fb;
  color: #0f172a;
  display: grid;
  gap: 2.5rem;
}

.meeting-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 2rem;
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

.meeting-list {
  display: grid;
  gap: 1.5rem;
}

.folder-list {
  display: grid;
  gap: 1.5rem;
}

.folder-card {
  background: #fff;
  border-radius: 24px;
  padding: 1.8rem;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 1.2rem;
}

.folder-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
}

.folder-header h2 {
  margin: 0 0 0.4rem;
  font-size: 1.2rem;
}

.meta {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
}

.count {
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.85rem;
  font-weight: 600;
}

.record-list {
  display: grid;
  gap: 1rem;
}

.record-card {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 1rem;
  background: #f8fafc;
  display: grid;
  gap: 0.6rem;
}

.record-title {
  display: grid;
  gap: 0.2rem;
}

.record-path {
  color: #94a3b8;
  font-size: 0.8rem;
}

.record-content {
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  color: #1f2937;
}

.loading-state,
.empty-state {
  color: #64748b;
  font-weight: 500;
}
@media (max-width: 720px) {
  .meeting-records-page {
    padding: 2.5rem 6vw 3.5rem;
  }

  .folder-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
