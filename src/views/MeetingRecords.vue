<script setup>
import { computed, getCurrentInstance, onMounted, ref } from 'vue'
import WorkspaceSidebar from '../components/WorkspaceSidebar.vue'
import ResultModal from '../components/ResultModal.vue'

const apiBaseUrl = 'http://localhost:3001'
const router = getCurrentInstance().appContext.config.globalProperties.$router
const activePath = computed(() => router?.currentRoute?.value?.path || '')

const records = ref([])
const activeRecord = ref(null)
const activeRecordMeta = ref(null)
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

const formatContent = (record) => {
  if (!record?.content_text) return '目前僅支援文字檔案預覽（txt）。'
  return record.content_text
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
        <article v-for="client in records" :key="client.name" class="tree-card">
          <details class="tree-node">
            <summary class="tree-summary">
              <span class="tree-title">客戶：{{ client.name }}</span>
            </summary>
            <div class="tree-children">
              <details v-for="vendor in client.vendors" :key="vendor.name" class="tree-node">
                <summary class="tree-summary">
                  <span class="tree-title">廠家：{{ vendor.name }}</span>
                </summary>
                <div class="tree-children">
                  <details
                    v-for="product in vendor.products"
                    :key="product.name"
                    class="tree-node"
                  >
                    <summary class="tree-summary">
                      <span class="tree-title">廠家產品：{{ product.name }}</span>
                    </summary>
                    <div class="tree-children">
                      <details
                        v-for="meeting in product.meetings"
                        :key="meeting.id"
                        class="tree-node"
                      >
                        <summary class="tree-summary">
                          <span class="tree-title">
                            會議時間：{{ formatDateTimeDisplay(meeting.meeting_time) }}
                          </span>
                          <span class="tree-meta">
                            建立者：{{ meeting.created_by_email }}｜建立時間：{{
                              formatDateTimeDisplay(meeting.created_at)
                            }}
                          </span>
                          <span class="count">{{ meeting.records.length }} 份記錄</span>
                        </summary>
                        <div class="tree-children record-list">
                          <button
                            v-for="record in meeting.records"
                            :key="record.id"
                            type="button"
                            class="record-button"
                            @click="activeRecord = record; activeRecordMeta = meeting"
                          >
                            <div class="record-title">
                              <strong>{{ record.file_name }}</strong>
                              <span class="record-path">{{ record.file_path }}</span>
                            </div>
                            <span class="record-meta">會議：{{ formatDateTimeDisplay(meeting.meeting_time) }}</span>
                          </button>
                        </div>
                      </details>
                    </div>
                  </details>
                </div>
              </details>
            </div>
          </details>
        </article>
      </div>
    </section>

    <section v-if="activeRecord" class="preview-panel">
      <header class="preview-header">
        <h2>{{ activeRecord.file_name }}</h2>
        <p class="record-path">{{ activeRecord.file_path }}</p>
        <p v-if="activeRecordMeta" class="meta">
          會議時間：{{ formatDateTimeDisplay(activeRecordMeta.meeting_time) }}｜建立者：{{
            activeRecordMeta.created_by_email
          }}｜建立時間：{{ formatDateTimeDisplay(activeRecordMeta.created_at) }}
        </p>
      </header>
      <pre class="record-content">{{ formatContent(activeRecord) }}</pre>
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
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1.5rem;
}

.folder-list {
  display: grid;
  gap: 1.5rem;
}

.tree-card {
  background: #fff;
  border-radius: 24px;
  padding: 1.8rem;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 1.2rem;
  max-height: 70vh;
  overflow: auto;
}

.tree-node {
  border-radius: 16px;
  padding: 0.4rem 0;
}

.tree-summary {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  cursor: pointer;
  font-weight: 600;
}

.tree-summary::-webkit-details-marker {
  display: none;
}

.tree-title {
  font-size: 0.95rem;
}

.tree-meta {
  font-size: 0.85rem;
  color: #64748b;
}

.tree-children {
  padding: 0.6rem 0 0.6rem 1.4rem;
  display: grid;
  gap: 0.6rem;
}

.tree-children.record-list {
  padding-left: 0;
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

.record-button {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 0.8rem;
  background: #f8fafc;
  text-align: left;
  cursor: pointer;
  display: grid;
  gap: 0.4rem;
}

.record-button:hover {
  background: #e2e8f0;
}

.record-title {
  display: grid;
  gap: 0.2rem;
}

.record-meta {
  font-size: 0.75rem;
  color: #64748b;
}

.record-path {
  color: #94a3b8;
  font-size: 0.8rem;
}

.preview-panel {
  background: #fff;
  border-radius: 24px;
  padding: 1.8rem;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 0.8rem;
  max-height: 70vh;
  overflow: auto;
}

.preview-header h2 {
  margin: 0 0 0.2rem;
  font-size: 1.2rem;
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

  .meeting-list {
    grid-template-columns: minmax(0, 1fr);
  }

  .tree-card,
  .preview-panel {
    max-height: none;
  }
}
</style>
