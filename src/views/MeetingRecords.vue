<script setup>
import { computed, getCurrentInstance, onMounted, ref } from 'vue'
import WorkspaceSidebar from '../components/WorkspaceSidebar.vue'
import ResultModal from '../components/ResultModal.vue'
import ScrollPanel from '../components/element/ScrollPanel.vue'

const props = defineProps({
  embedded: {
    type: Boolean,
    default: false,
  },
  onSelectRecords: {
    type: Function,
    default: null,
  },
})

const apiBaseUrl = 'http://localhost:3001'
const router = getCurrentInstance().appContext.config.globalProperties.$router
const activePath = computed(() => router?.currentRoute?.value?.path || '')

const records = ref([])
const activeRecord = ref(null)
const activeRecordMeta = ref(null)
const activeClient = ref('')
const activeVendor = ref('')
const activeProduct = ref('')
const activeMeeting = ref(null)
const searchQuery = ref({
  client: '',
  vendor: '',
  product: '',
})
const activeList = ref(null)
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

const filteredClients = computed(() => {
  const query = searchQuery.value.client.trim().toLowerCase()
  if (!query) return records.value
  return records.value.filter((client) => client.name.toLowerCase().includes(query))
})

const getVendors = () => {
  const client = records.value.find((item) => item.name === activeClient.value)
  return client?.vendors || []
}

const getProducts = () => {
  const vendors = getVendors()
  if (!activeVendor.value) {
    return vendors.flatMap((vendor) => vendor.products)
  }
  const vendor = vendors.find((item) => item.name === activeVendor.value)
  return vendor?.products || []
}

const getMeetings = () => {
  const products = getProducts()
  if (!activeProduct.value) return []
  const product = products.find((item) => item.name === activeProduct.value)
  return product?.meetings || []
}

const selectClient = (clientName) => {
  activeClient.value = clientName
  activeVendor.value = ''
  activeProduct.value = ''
  activeMeeting.value = null
  activeRecord.value = null
  activeRecordMeta.value = null
}

const selectVendor = (vendorName) => {
  activeVendor.value = vendorName
  activeProduct.value = ''
  activeMeeting.value = null
  activeRecord.value = null
  activeRecordMeta.value = null
}

const selectProduct = (productName) => {
  activeProduct.value = productName
  if (!activeVendor.value) {
    const vendor = getVendors().find((item) =>
      item.products.some((product) => product.name === productName)
    )
    if (vendor) activeVendor.value = vendor.name
  }
  activeMeeting.value = null
  activeRecord.value = null
  activeRecordMeta.value = null
}

const selectMeeting = (meeting) => {
  activeMeeting.value = meeting
  activeRecord.value = null
  activeRecordMeta.value = null
}

const resetSelections = () => {
  activeClient.value = ''
  activeVendor.value = ''
  activeProduct.value = ''
  activeMeeting.value = null
  activeRecord.value = null
  activeRecordMeta.value = null
  searchQuery.value.client = ''
  searchQuery.value.vendor = ''
  searchQuery.value.product = ''
  activeList.value = null
}

const useSelectedMeeting = () => {
  if (!props.onSelectRecords || !activeMeeting.value) return
  props.onSelectRecords(activeMeeting.value.records || [])
}

const openList = (type) => {
  if (activeList.value === type) {
    activeList.value = null
    return
  }
  activeList.value = type
}

const filteredVendors = computed(() => {
  const vendors = getVendors()
  const query = searchQuery.value.vendor.trim().toLowerCase()
  if (!query) return vendors
  return vendors.filter((vendor) => vendor.name.toLowerCase().includes(query))
})

const filteredProducts = computed(() => {
  const products = getProducts()
  const query = searchQuery.value.product.trim().toLowerCase()
  if (!query) return products
  return products.filter((product) => product.name.toLowerCase().includes(query))
})
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
    activeClient.value = records.value[0]?.name || ''
    activeVendor.value = ''
    activeProduct.value = ''
    activeMeeting.value = null
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
  <div :class="['meeting-records-page', { embedded: props.embedded }]">
    <WorkspaceSidebar
      v-if="!props.embedded"
      :on-create-task="goToNewTask"
      :on-view-tasks="goToTaskList"
      :on-upload-meeting="goToMeetingUpload"
      :on-view-meetings="goToMeetingRecords"
      :on-go-home="goToHome"
      :on-go-profile="goToProfile"
      :active-path="activePath"
    />

    <header v-if="!props.embedded" class="meeting-header">
      <div>
        <p class="eyebrow">會議記錄</p>
        <h1 class="headline">會議記錄檢視</h1>
        <p class="subhead">預覽客戶樹級關係與會議記錄檔案內容。</p>
      </div>
    </header>

    <section class="meeting-list">
      <div v-if="isLoading" class="loading-state">載入中...</div>
      <div v-else-if="records.length === 0" class="empty-state">尚無會議記錄</div>
      <div v-else class="split-layout">
        <aside class="selection-panel">
          <ScrollPanel height="calc(100vh - 240px)">
          <div class="panel-section">
            <div class="panel-header">
              <div class="panel-title">
                <h2>客戶</h2>
              </div>
              <button class="ghost-button" type="button" @click="resetSelections">
                重置
              </button>
            </div>
            <button class="select-field" type="button" @click="openList('client')">
              {{ activeClient || '選擇客戶' }}
            </button>
            <div v-if="activeList === 'client'" class="option-list">
              <input
                v-model="searchQuery.client"
                class="option-search"
                type="text"
                placeholder="搜尋客戶"
              />
              <button
                v-for="client in filteredClients"
                :key="client.name"
                type="button"
                class="option-item"
                @click="selectClient(client.name); activeList = null"
              >
                {{ client.name }}
              </button>
            </div>
          </div>

          <div class="panel-section">
            <div class="panel-header">
              <h2>廠家</h2>
            </div>
            <button class="select-field" type="button" @click="openList('vendor')">
              {{ activeVendor || '選擇廠家' }}
            </button>
            <div v-if="activeList === 'vendor'" class="option-list">
              <input
                v-model="searchQuery.vendor"
                class="option-search"
                type="text"
                placeholder="搜尋廠家"
              />
              <button
                v-for="vendor in filteredVendors"
                :key="vendor.name"
                type="button"
                class="option-item"
                @click="selectVendor(vendor.name); activeList = null"
              >
                {{ vendor.name }}
              </button>
            </div>
          </div>

          <div class="panel-section">
            <div class="panel-header">
              <h2>廠家產品</h2>
            </div>
            <button class="select-field" type="button" @click="openList('product')">
              {{ activeProduct || '選擇產品' }}
            </button>
            <div v-if="activeList === 'product'" class="option-list">
              <input
                v-model="searchQuery.product"
                class="option-search"
                type="text"
                placeholder="搜尋產品"
              />
              <button
                v-for="product in filteredProducts"
                :key="product.name"
                type="button"
                class="option-item"
                @click="selectProduct(product.name); activeList = null"
              >
                {{ product.name }}
              </button>
            </div>
          </div>

          <div class="panel-section">
            <div class="panel-header">
              <h2>會議時間</h2>
              <span class="count">共 {{ getMeetings().length }} 筆</span>
            </div>
            <div class="meeting-list-grid">
              <button
                v-for="meeting in getMeetings()"
                :key="meeting.id"
                type="button"
                class="meeting-card"
                :class="{ active: activeMeeting?.id === meeting.id }"
                @click="selectMeeting(meeting)"
              >
                <strong>{{ formatDateTimeDisplay(meeting.meeting_time) }}</strong>
                <span class="meeting-meta">
                  建立者：{{ meeting.created_by_email }}｜{{ formatDateTimeDisplay(meeting.created_at) }}
                </span>
                <span class="meeting-count">{{ meeting.records.length }} 份記錄</span>
              </button>
            </div>
          </div>

          <div class="panel-section">
            <div class="panel-header">
              <h2>會議記錄</h2>
            </div>
            <div class="record-list">
              <button
                v-for="record in activeMeeting?.records || []"
                :key="record.id"
                type="button"
                class="record-button"
                @click="activeRecord = record; activeRecordMeta = activeMeeting"
              >
                <div class="record-title">
                  <strong>{{ record.file_name }}</strong>
                  <span class="record-path">{{ record.file_path }}</span>
                </div>
              </button>
            </div>
          </div>
          <div v-if="props.embedded" class="panel-section">
            <button
              class="primary-button"
              type="button"
              :disabled="!activeMeeting"
              @click="useSelectedMeeting"
            >
              使用此會議
            </button>
          </div>
          </ScrollPanel>
        </aside>

        <aside class="preview-panel">
          <ScrollPanel height="calc(100vh - 240px)">
          <div class="panel-section">
            <div class="panel-header">
              <h2>{{ activeRecord ? activeRecord.file_name : '檔案預覽' }}</h2>
            </div>
            <p v-if="activeRecordMeta" class="meta">
              會議時間：{{ formatDateTimeDisplay(activeRecordMeta.meeting_time) }}｜建立者：{{
                activeRecordMeta.created_by_email
              }}｜建立時間：{{ formatDateTimeDisplay(activeRecordMeta.created_at) }}
            </p>
            <pre class="record-content">
{{ activeRecord ? formatContent(activeRecord) : '請先選擇會議記錄。' }}
            </pre>
          </div>
          </ScrollPanel>
        </aside>
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

.meeting-records-page.embedded {
  min-height: auto;
  padding: 0;
  gap: 1.5rem;
  background: transparent;
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

.split-layout {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 1.5rem;
}

.selection-panel,
.preview-panel {
  background: #fff;
  border-radius: 24px;
  padding: 1.8rem;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 1.5rem;
  height: calc(100vh - 240px);
}

.panel-section {
  display: grid;
  gap: 0.8rem;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-title {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.1rem;
}

.ghost-button {
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  color: #475569;
}

.primary-button {
  border: none;
  background: #111827;
  color: #fff;
  padding: 0.6rem 1rem;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
}

.primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.select-field {
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 0.65rem 0.8rem;
  border-radius: 12px;
  text-align: left;
  cursor: pointer;
  font-weight: 600;
}

.option-list {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  padding: 0.4rem;
  display: grid;
  gap: 0.3rem;
  max-height: 160px;
  overflow: auto;
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

.meeting-list-grid {
  display: grid;
  gap: 0.8rem;
}

.meeting-card {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 0.8rem;
  background: #f8fafc;
  text-align: left;
  cursor: pointer;
  display: grid;
  gap: 0.35rem;
}

.meeting-card.active {
  border-color: #111827;
  background: #111827;
  color: #fff;
}

.meeting-card.active .meeting-meta,
.meeting-card.active .meeting-count {
  color: rgba(255, 255, 255, 0.8);
}

.meeting-meta {
  font-size: 0.8rem;
  color: #64748b;
}

.meeting-count {
  font-size: 0.8rem;
  color: #4338ca;
  font-weight: 600;
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

  .split-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
