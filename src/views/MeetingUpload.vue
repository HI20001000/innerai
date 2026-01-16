<script setup>
import { computed, getCurrentInstance, onMounted, ref } from 'vue'
import WorkspaceSidebar from '../components/WorkspaceSidebar.vue'
import ResultModal from '../components/ResultModal.vue'
import { getTaipeiNowInput } from '../scripts/time.js'
import { apiBaseUrl } from '../scripts/apiBaseUrl.js'

const clients = ref([])
const vendors = ref([])
const products = ref([])

const selectedClient = ref('')
const selectedVendor = ref('')
const selectedProduct = ref('')
const meetingTime = ref('')
const selectedFiles = ref([])
const activeList = ref(null)
const showRequiredHints = ref(false)

const activeModal = ref(null)
const newOption = ref('')
const optionMessage = ref('')
const optionMessageType = ref('')

const showResult = ref(false)
const resultTitle = ref('')
const resultMessage = ref('')
const isSubmitting = ref(false)

const router = getCurrentInstance().appContext.config.globalProperties.$router
const activePath = computed(() => router?.currentRoute?.value?.path || '')

const goToNewTask = () => router?.push('/tasks/new')
const goToTaskList = () => router?.push('/tasks/view')
const goToHome = () => router?.push('/home')
const goToProfile = () => router?.push('/settings')
const goToMeetingUpload = () => router?.push('/meetings/upload')
const goToMeetingRecords = () => router?.push('/meetings')
const goToUserDashboard = () => router?.push('/users/dashboard')

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

const fetchOptions = async (type) => {
  const response = await fetch(`${apiBaseUrl}/api/options/${type}`)
  if (!response.ok) throw new Error('Failed to load options')
  const data = await response.json()
  if (type === 'client') clients.value = data
  if (type === 'vendor') vendors.value = data
  if (type === 'product') products.value = data
}

const openList = async (type) => {
  if (activeList.value === type) {
    activeList.value = null
    return
  }
  activeList.value = type
  try {
    await fetchOptions(type)
  } catch (error) {
    console.error(error)
  }
}

const selectOption = (type, item) => {
  if (type === 'client') selectedClient.value = item
  if (type === 'vendor') selectedVendor.value = item
  if (type === 'product') selectedProduct.value = item
  activeList.value = null
}

const openModal = (type) => {
  activeModal.value = type
  newOption.value = ''
  optionMessage.value = ''
  optionMessageType.value = ''
  fetchOptions(type).catch((error) => console.error(error))
}

const closeModal = () => {
  activeModal.value = null
  newOption.value = ''
  optionMessage.value = ''
  optionMessageType.value = ''
}

const addOption = async () => {
  const value = newOption.value.trim()
  if (!value) return
  try {
    const response = await fetch(`${apiBaseUrl}/api/options/${activeModal.value}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: value }),
    })
    if (!response.ok) throw new Error('Failed to add option')
    const created = await response.json()
    if (activeModal.value === 'client') clients.value.unshift(created.name)
    if (activeModal.value === 'vendor') vendors.value.unshift(created.name)
    if (activeModal.value === 'product') products.value.unshift(created.name)
    optionMessage.value = `"${created.name}" 新增成功`
    optionMessageType.value = 'success'
    newOption.value = ''
  } catch (error) {
    console.error(error)
    optionMessage.value = '新增失敗'
    optionMessageType.value = 'error'
  }
}

const deleteOption = async (type, name) => {
  try {
    const response = await fetch(
      `${apiBaseUrl}/api/options/${type}?name=${encodeURIComponent(name)}`,
      {
        method: 'DELETE',
      }
    )
    if (!response.ok) throw new Error('Failed to delete option')
    if (type === 'client') clients.value = clients.value.filter((item) => item !== name)
    if (type === 'vendor') vendors.value = vendors.value.filter((item) => item !== name)
    if (type === 'product') products.value = products.value.filter((item) => item !== name)
  } catch (error) {
    console.error(error)
  }
}

const handleFileChange = async (event) => {
  const files = Array.from(event.target.files || [])
  selectedFiles.value = files
}

const getTaipeiDateTimeLocal = () => getTaipeiNowInput()

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        resolve('')
        return
      }
      const base64 = result.split(',')[1] || ''
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })

const submitMeetingRecords = async () => {
  if (isSubmitting.value) return
  if (!selectedClient.value || !selectedVendor.value || !selectedProduct.value || !meetingTime.value) {
    showRequiredHints.value = true
    return
  }
  if (selectedFiles.value.length === 0) {
    resultTitle.value = '上傳失敗'
    resultMessage.value = '請選擇會議記錄檔案'
    showResult.value = true
    return
  }
  showRequiredHints.value = false
  const auth = readAuthStorage()
  if (!auth) {
    resultTitle.value = '上傳失敗'
    resultMessage.value = '請先登入'
    showResult.value = true
    return
  }
  isSubmitting.value = true
  try {
    const filesPayload = await Promise.all(
      selectedFiles.value.map(async (file) => ({
        name: file.name,
        path: file.webkitRelativePath || file.name,
        type: file.type,
        contentBase64: await fileToBase64(file),
      }))
    )
    const response = await fetch(`${apiBaseUrl}/api/meeting-records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({
        client: selectedClient.value,
        vendor: selectedVendor.value,
        product: selectedProduct.value,
        meeting_time: meetingTime.value,
        files: filesPayload,
      }),
    })
    const data = await response.json()
    if (!response.ok || !data?.success) {
      resultTitle.value = '上傳失敗'
      resultMessage.value = data?.message || '會議記錄上傳失敗'
      showResult.value = true
      return
    }
    resultTitle.value = '上傳成功'
    resultMessage.value = data?.message || '會議記錄已上傳'
    showResult.value = true
    selectedFiles.value = []
  } catch (error) {
    console.error(error)
    resultTitle.value = '上傳失敗'
    resultMessage.value = '會議記錄上傳失敗'
    showResult.value = true
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  fetchOptions('client').catch(() => {})
  fetchOptions('vendor').catch(() => {})
  fetchOptions('product').catch(() => {})
  meetingTime.value = getTaipeiDateTimeLocal()
})
</script>

<template>
  <div class="meeting-page">
    <WorkspaceSidebar
      :on-create-task="goToNewTask"
      :on-view-tasks="goToTaskList"
      :on-go-home="goToHome"
      :on-go-profile="goToProfile"
      :active-path="activePath"
      :on-upload-meeting="goToMeetingUpload"
      :on-view-meetings="goToMeetingRecords"
      :on-view-user-dashboard="goToUserDashboard"
    />
    <header class="meeting-header">
      <div>
        <p class="eyebrow">上傳會議記錄</p>
        <h1 class="headline">會議記錄資料夾</h1>
        <p class="subhead">選擇客戶、廠家與產品後，上傳包含多個會議記錄的資料夾。</p>
      </div>
      <div class="header-actions">
        <button class="primary-button" type="button" :disabled="isSubmitting" @click="submitMeetingRecords">
          {{ isSubmitting ? '上傳中...' : '上傳會議記錄' }}
        </button>
      </div>
    </header>

    <section class="meeting-layout">
      <form class="meeting-form" @submit.prevent="submitMeetingRecords">
        <div class="field-grid">
          <div class="field select-field-wrapper">
            <div class="field-header">
              <span>客戶</span>
              <button class="ghost-mini" type="button" @click="openModal('client')">編輯</button>
            </div>
            <button class="select-field" type="button" @click="openList('client')">
              {{ selectedClient || '選擇客戶' }}
            </button>
            <p v-if="showRequiredHints && !selectedClient" class="required-hint">必填</p>
            <div v-if="activeList === 'client'" class="option-list">
              <button
                v-for="item in clients"
                :key="item"
                type="button"
                class="option-item"
                @click="selectOption('client', item)"
              >
                {{ item }}
              </button>
            </div>
          </div>
          <div class="field select-field-wrapper">
            <div class="field-header">
              <span>廠家</span>
              <button class="ghost-mini" type="button" @click="openModal('vendor')">編輯</button>
            </div>
            <button class="select-field" type="button" @click="openList('vendor')">
              {{ selectedVendor || '選擇廠家' }}
            </button>
            <p v-if="showRequiredHints && !selectedVendor" class="required-hint">必填</p>
            <div v-if="activeList === 'vendor'" class="option-list">
              <button
                v-for="item in vendors"
                :key="item"
                type="button"
                class="option-item"
                @click="selectOption('vendor', item)"
              >
                {{ item }}
              </button>
            </div>
          </div>
          <div class="field select-field-wrapper">
            <div class="field-header">
              <span>廠家產品</span>
              <button class="ghost-mini" type="button" @click="openModal('product')">編輯</button>
            </div>
            <button class="select-field" type="button" @click="openList('product')">
              {{ selectedProduct || '選擇產品' }}
            </button>
            <p v-if="showRequiredHints && !selectedProduct" class="required-hint">必填</p>
            <div v-if="activeList === 'product'" class="option-list">
              <button
                v-for="item in products"
                :key="item"
                type="button"
                class="option-item"
                @click="selectOption('product', item)"
              >
                {{ item }}
              </button>
            </div>
          </div>
          <label class="field">
            <span>會議記錄時間</span>
            <input v-model="meetingTime" type="datetime-local" class="text-input" />
            <p v-if="showRequiredHints && !meetingTime" class="required-hint">必填</p>
          </label>
          <label class="field wide">
            <span>會議記錄資料夾</span>
            <label class="file-picker">
              <input
                type="file"
                multiple
                webkitdirectory
                directory
                @change="handleFileChange"
              />
              <span>選擇資料夾</span>
            </label>
            <p class="hint">請選擇包含多個會議記錄的資料夾。</p>
            <p v-if="selectedFiles.length > 0" class="file-count">
              已選擇 {{ selectedFiles.length }} 個檔案
            </p>
          </label>
        </div>
      </form>
    </section>

    <div v-if="activeModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card">
        <h2>
          編輯{{
            activeModal === 'client' ? '客戶' : activeModal === 'vendor' ? '廠家' : '產品'
          }}
        </h2>
        <p>可新增或刪除清單中的項目。</p>
        <div class="modal-list">
          <div
            v-for="item in activeModal === 'client'
              ? clients
              : activeModal === 'vendor'
                ? vendors
                : products"
            :key="item"
            class="modal-list-item"
          >
            <span>{{ item }}</span>
            <button class="danger-button" type="button" @click="deleteOption(activeModal, item)">
              刪除
            </button>
          </div>
        </div>
        <input v-model="newOption" type="text" placeholder="新增項目名稱" />
        <div class="modal-actions">
          <button class="ghost-button" type="button" @click="closeModal">取消</button>
          <button class="primary-button" type="button" @click="addOption">新增</button>
        </div>
        <p v-if="optionMessage" :class="['modal-message', optionMessageType]">
          {{ optionMessage }}
        </p>
      </div>
    </div>

    <ResultModal
      :is-open="showResult"
      :title="resultTitle"
      :message="resultMessage"
      @close="showResult = false"
    />
  </div>
</template>

<style scoped>
.meeting-page {
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

.meeting-form {
  background: #fff;
  padding: 2rem;
  border-radius: 24px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 2rem;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  font-weight: 500;
}

.field.wide {
  grid-column: 1 / -1;
}

.select-field-wrapper {
  position: relative;
}

.field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.text-input {
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 0.65rem 0.8rem;
  border-radius: 12px;
  font-weight: 600;
}

.ghost-mini {
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 0.2rem 0.7rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
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
  max-height: 160px;
  overflow: auto;
  z-index: 5;
  box-shadow: 0 18px 30px rgba(15, 23, 42, 0.12);
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

.required-hint {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  color: #dc2626;
  font-weight: 600;
}

.file-picker {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #111827;
  color: #fff;
  padding: 0.6rem 1rem;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  width: fit-content;
}

.file-picker input {
  display: none;
}

.hint {
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
}

.file-count {
  margin: 0;
  font-size: 0.85rem;
  color: #2563eb;
  font-weight: 600;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: grid;
  place-items: center;
  z-index: 1000;
}

.modal-card {
  background: #fff;
  padding: 2rem 2.4rem;
  border-radius: 24px;
  width: min(420px, 90vw);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.2);
  display: grid;
  gap: 1rem;
}

.modal-card h2 {
  margin: 0;
  font-size: 1.4rem;
}

.modal-card p {
  margin: 0;
  color: #64748b;
}

.modal-card input {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.85rem 1rem;
  font-size: 0.95rem;
}

.modal-list {
  display: grid;
  gap: 0.5rem;
}

.modal-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.55rem 0.8rem;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.danger-button {
  border: none;
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
  font-weight: 600;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  cursor: pointer;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.ghost-button {
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 0.6rem 1rem;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  color: #475569;
}

.modal-message {
  margin: 0;
  font-weight: 600;
  font-size: 0.9rem;
}

.modal-message.success {
  color: #16a34a;
}

.modal-message.error {
  color: #dc2626;
}

@media (max-width: 720px) {
  .meeting-page {
    padding: 2.5rem 6vw 3.5rem;
  }

  .meeting-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .field-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
