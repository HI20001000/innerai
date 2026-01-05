<script setup>
import { computed, getCurrentInstance, onMounted, reactive, ref } from 'vue'
import WorkspaceSidebar from '../components/WorkspaceSidebar.vue'
import ResultModal from '../components/ResultModal.vue'
import DifyAutoFillPanel from '../components/DifyAutoFillPanel.vue'

const clients = ref([])
const vendors = ref([])
const products = ref([])
const tags = ref([])

const selectedClient = ref('')
const selectedVendor = ref('')
const selectedProduct = ref('')
const selectedTag = ref('')
const selectedRelatedUser = ref(null)
const activeList = ref(null)
const selectedTime = ref('')
const selectedLocation = ref('')
const followUpContent = ref('')
const showRequiredHints = ref(false)
const searchQuery = reactive({
  client: '',
  vendor: '',
  product: '',
  tag: '',
  user: '',
})

const activeModal = ref(null)
const newOption = ref('')
const optionMessage = ref('')
const optionMessageType = ref('')
const draftKey = 'innerai_task_draft'
const showDraftSaved = ref(false)
const showResult = ref(false)
const resultTitle = ref('')
const resultMessage = ref('')
const isSubmitting = ref(false)
const apiBaseUrl = 'http://localhost:3001'
const router = getCurrentInstance().appContext.config.globalProperties.$router
const activePath = computed(() => router?.currentRoute?.value?.path || '')

const goToNewTask = () => {
  router?.push('/tasks/new')
}

const goToTaskList = () => {
  router?.push('/tasks/view')
}

const goToHome = () => {
  router?.push('/home')
}

const goToProfile = () => {
  router?.push('/settings')
}

const openModal = (type) => {
  activeModal.value = type
  newOption.value = ''
  optionMessage.value = ''
  optionMessageType.value = ''
  fetchOptions(type).catch((error) => console.error(error))
}

const fetchOptions = async (type) => {
  const response = await fetch(`${apiBaseUrl}/api/options/${type}`)
  if (!response.ok) {
    throw new Error('Failed to load options')
  }
  const data = await response.json()
  if (type === 'client') clients.value = data
  if (type === 'vendor') vendors.value = data
  if (type === 'product') products.value = data
  if (type === 'tag') tags.value = data
}

const fetchUsers = async () => {
  const auth = readAuthStorage()
  if (!auth) return
  const response = await fetch(`${apiBaseUrl}/api/users`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  })
  if (!response.ok) {
    throw new Error('Failed to load users')
  }
  const data = await response.json()
  relatedUsers.value = data?.data ?? []
}

const relatedUsers = ref([])

const loadAllOptions = async () => {
  await Promise.all(['client', 'vendor', 'product', 'tag'].map((type) => fetchOptions(type)))
}

const openList = async (type) => {
  if (activeList.value === type) {
    activeList.value = null
    return
  }
  activeList.value = type
  searchQuery[type] = ''
  try {
    if (type === 'user') {
      await fetchUsers()
    } else {
      await fetchOptions(type)
    }
  } catch (error) {
    console.error(error)
  }
}

const optionExists = (type, value) => {
  if (!value) return false
  const source =
    type === 'client'
      ? clients.value
      : type === 'vendor'
        ? vendors.value
        : type === 'product'
          ? products.value
          : tags.value
  return source.includes(value)
}

const optionStatus = (type, value) => {
  if (!value) return ''
  return optionExists(type, value) ? '已存在' : '不存在，提交後將自動建立'
}

const optionStatusClass = (type, value) => {
  if (!value) return ''
  return optionExists(type, value) ? 'exists' : 'missing'
}

const ensureOptionExists = async (type, value) => {
  if (!value || optionExists(type, value)) return
  const response = await fetch(`${apiBaseUrl}/api/options/${type}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: value }),
  })
  if (!response.ok) {
    throw new Error('Failed to add option')
  }
  const created = await response.json()
  if (type === 'client') clients.value.unshift(created.name)
  if (type === 'vendor') vendors.value.unshift(created.name)
  if (type === 'product') products.value.unshift(created.name)
  if (type === 'tag') tags.value.unshift(created.name)
}

const getFilteredOptions = (type) => {
  const query = searchQuery[type]?.trim().toLowerCase() ?? ''
  const source =
    type === 'client'
      ? clients.value
      : type === 'vendor'
        ? vendors.value
        : type === 'product'
          ? products.value
          : type === 'tag'
            ? tags.value
            : relatedUsers.value
  if (!query) return source
  if (type === 'user') {
    return source.filter((item) =>
      `${item.username || ''}${item.mail || ''}`.toLowerCase().includes(query)
    )
  }
  return source.filter((item) => item.toLowerCase().includes(query))
}

const selectOption = (type, item) => {
  if (type === 'client') {
    selectedClient.value = item
  }
  if (type === 'vendor') {
    selectedVendor.value = item
  }
  if (type === 'product') {
    selectedProduct.value = item
  }
  if (type === 'tag') {
    selectedTag.value = item
  }
  if (type === 'user') {
    selectedRelatedUser.value = item
  }
  activeList.value = null
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
    if (!response.ok) {
      throw new Error('Failed to add option')
    }
    const created = await response.json()
    if (activeModal.value === 'client') {
      clients.value.unshift(created.name)
      selectedClient.value = created.name
    }
    if (activeModal.value === 'vendor') {
      vendors.value.unshift(created.name)
      selectedVendor.value = created.name
    }
    if (activeModal.value === 'product') {
      products.value.unshift(created.name)
      selectedProduct.value = created.name
    }
    if (activeModal.value === 'tag') {
      tags.value.unshift(created.name)
      selectedTag.value = created.name
    }
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
    if (!response.ok) {
      throw new Error('Failed to delete option')
    }
    if (type === 'client') {
      clients.value = clients.value.filter((item) => item !== name)
      if (selectedClient.value === name) selectedClient.value = ''
    }
    if (type === 'vendor') {
      vendors.value = vendors.value.filter((item) => item !== name)
      if (selectedVendor.value === name) selectedVendor.value = ''
    }
    if (type === 'product') {
      products.value = products.value.filter((item) => item !== name)
      if (selectedProduct.value === name) selectedProduct.value = ''
    }
    if (type === 'tag') {
      tags.value = tags.value.filter((item) => item !== name)
      if (selectedTag.value === name) selectedTag.value = ''
    }
  } catch (error) {
    console.error(error)
  }
}

const saveDraft = () => {
  const payload = {
    selectedClient: selectedClient.value,
    selectedVendor: selectedVendor.value,
    selectedProduct: selectedProduct.value,
    selectedTag: selectedTag.value,
    selectedRelatedUser: selectedRelatedUser.value,
    selectedTime: selectedTime.value,
    selectedLocation: selectedLocation.value,
    followUpContent: followUpContent.value,
  }
  window.localStorage.setItem(draftKey, JSON.stringify(payload))
  showDraftSaved.value = true
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

const submitTask = async () => {
  if (isSubmitting.value) return
  const payload = {
    client: selectedClient.value,
    vendor: selectedVendor.value,
    product: selectedProduct.value,
    tag: selectedTag.value,
    related_user_mail: selectedRelatedUser.value?.mail || '',
    scheduled_at: selectedTime.value,
    location: selectedLocation.value,
    follow_up: followUpContent.value,
  }
  if (
    !selectedClient.value ||
    !selectedVendor.value ||
    !selectedProduct.value ||
    !selectedTag.value ||
    !selectedRelatedUser.value
  ) {
    showRequiredHints.value = true
    return
  }
  showRequiredHints.value = false
  try {
    const auth = readAuthStorage()
    if (!auth) {
      resultTitle.value = '建立失敗'
      resultMessage.value = '請先登入再建立任務。'
      showResult.value = true
      return
    }
    isSubmitting.value = true
    await loadAllOptions().catch(() => {})
    await ensureOptionExists('client', selectedClient.value)
    await ensureOptionExists('vendor', selectedVendor.value)
    await ensureOptionExists('product', selectedProduct.value)
    await ensureOptionExists('tag', selectedTag.value)
    const response = await fetch(`${apiBaseUrl}/api/task-submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify(payload),
    })
    const data = await parseJsonSafe(response)
    if (!response.ok || !data?.success) {
      resultTitle.value = '建立失敗'
      resultMessage.value = data?.message || '任務建立失敗'
      showResult.value = true
      return
    }
    resultTitle.value = '建立成功'
    resultMessage.value = data?.message || '任務建立成功'
    showResult.value = true
    window.localStorage.removeItem(draftKey)
  } catch (error) {
    console.error(error)
    resultTitle.value = '建立失敗'
    resultMessage.value = '任務建立失敗，請稍後再試。'
    showResult.value = true
  } finally {
    isSubmitting.value = false
  }
}

const applyAutoFill = (payload) => {
  if (typeof payload !== 'object' || !payload) return
  if (payload.client) selectedClient.value = payload.client
  if (payload.vendor) selectedVendor.value = payload.vendor
  if (payload.product) selectedProduct.value = payload.product
  if (payload.tag) selectedTag.value = payload.tag
  if (payload.scheduled_at) selectedTime.value = payload.scheduled_at
  if (payload.follow_up) followUpContent.value = payload.follow_up
}

const loadDraft = () => {
  const raw = window.localStorage.getItem(draftKey)
  if (!raw) return
  try {
    const payload = JSON.parse(raw)
    selectedClient.value = payload.selectedClient ?? ''
    selectedVendor.value = payload.selectedVendor ?? ''
    selectedProduct.value = payload.selectedProduct ?? ''
    selectedTag.value = payload.selectedTag ?? ''
    selectedRelatedUser.value = payload.selectedRelatedUser ?? null
    selectedTime.value = payload.selectedTime ?? ''
    selectedLocation.value = payload.selectedLocation ?? ''
    followUpContent.value = payload.followUpContent ?? ''
  } catch {
    window.localStorage.removeItem(draftKey)
  }
}

onMounted(() => {
  loadDraft()
  loadAllOptions().catch((error) => console.error(error))
  fetchUsers().catch((error) => console.error(error))
})
</script>

<template>
  <div class="task-page">
    <WorkspaceSidebar
      :on-create-task="goToNewTask"
      :on-view-tasks="goToTaskList"
      :on-go-home="goToHome"
      :on-go-profile="goToProfile"
      :active-path="activePath"
    />
    <header class="task-header">
      <div>
        <p class="eyebrow">新增任務</p>
        <h1 class="headline">建立新的工作追蹤</h1>
        <p class="subhead">填寫任務設定，快速建立後續追蹤內容。</p>
      </div>
      <div class="header-actions">
        <button class="ghost-button" type="button" @click="saveDraft">儲存草稿</button>
        <button class="primary-button" type="button" :disabled="isSubmitting" @click="submitTask">
          {{ isSubmitting ? '建立中...' : '建立任務' }}
        </button>
      </div>
    </header>

    <section class="task-layout">
      <form class="task-form" @submit.prevent="submitTask">
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
            <p v-if="selectedClient" :class="['option-status', optionStatusClass('client', selectedClient)]">
              {{ optionStatus('client', selectedClient) }}
            </p>
            <div v-if="activeList === 'client'" class="option-list">
              <input
                v-model="searchQuery.client"
                class="option-search"
                type="text"
                placeholder="搜尋客戶"
              />
              <button
                v-for="item in getFilteredOptions('client')"
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
            <p v-if="selectedVendor" :class="['option-status', optionStatusClass('vendor', selectedVendor)]">
              {{ optionStatus('vendor', selectedVendor) }}
            </p>
            <div v-if="activeList === 'vendor'" class="option-list">
              <input
                v-model="searchQuery.vendor"
                class="option-search"
                type="text"
                placeholder="搜尋廠家"
              />
              <button
                v-for="item in getFilteredOptions('vendor')"
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
            <p v-if="selectedProduct" :class="['option-status', optionStatusClass('product', selectedProduct)]">
              {{ optionStatus('product', selectedProduct) }}
            </p>
            <div v-if="activeList === 'product'" class="option-list">
              <input
                v-model="searchQuery.product"
                class="option-search"
                type="text"
                placeholder="搜尋產品"
              />
              <button
                v-for="item in getFilteredOptions('product')"
                :key="item"
                type="button"
                class="option-item"
                @click="selectOption('product', item)"
              >
                {{ item }}
              </button>
            </div>
          </div>
          <div class="field select-field-wrapper">
            <div class="field-header">
              <span>任務標籤</span>
              <button class="ghost-mini" type="button" @click="openModal('tag')">編輯</button>
            </div>
            <button class="select-field" type="button" @click="openList('tag')">
              {{ selectedTag || '選擇標籤' }}
            </button>
            <p v-if="showRequiredHints && !selectedTag" class="required-hint">必填</p>
            <p v-if="selectedTag" :class="['option-status', optionStatusClass('tag', selectedTag)]">
              {{ optionStatus('tag', selectedTag) }}
            </p>
            <div v-if="activeList === 'tag'" class="option-list">
              <input
                v-model="searchQuery.tag"
                class="option-search"
                type="text"
                placeholder="搜尋標籤"
              />
              <button
                v-for="item in getFilteredOptions('tag')"
                :key="item"
                type="button"
                class="option-item"
                @click="selectOption('tag', item)"
              >
                {{ item }}
              </button>
            </div>
          </div>
          <div class="field select-field-wrapper">
            <div class="field-header">
              <span>關聯用戶</span>
            </div>
            <button class="select-field" type="button" @click="openList('user')">
              {{
                selectedRelatedUser
                  ? `${selectedRelatedUser.username || ''}<${selectedRelatedUser.mail}>`
                  : '選擇關聯用戶'
              }}
            </button>
            <p v-if="showRequiredHints && !selectedRelatedUser" class="required-hint">必填</p>
            <div v-if="activeList === 'user'" class="option-list">
              <input
                v-model="searchQuery.user"
                class="option-search"
                type="text"
                placeholder="搜尋用戶"
              />
              <button
                v-for="item in getFilteredOptions('user')"
                :key="item.mail"
                type="button"
                class="option-item user-option"
                @click="selectedRelatedUser = item; activeList = null"
              >
                <span
                  class="user-avatar"
                  :style="{ backgroundColor: item.icon_bg || '#e2e8f0' }"
                >
                  {{ item.icon || '🙂' }}
                </span>
                <span class="user-label">
                  {{ item.username || 'user' }}&lt;{{ item.mail }}&gt;
                </span>
              </button>
            </div>
          </div>
          <label class="field">
            <span>時間</span>
            <input v-model="selectedTime" type="datetime-local" />
          </label>
          <label class="field">
            <span>地點</span>
            <input v-model="selectedLocation" type="text" placeholder="輸入會議/拜訪地點" />
          </label>
          <label class="field wide">
            <span>需跟進內容</span>
            <textarea
              v-model="followUpContent"
              rows="5"
              placeholder="描述需跟進的重點或待辦事項"
            ></textarea>
          </label>
        </div>

      </form>

      <aside class="task-summary">
        <div class="summary-card">
          <h2>建立提示</h2>
          <ul>
            <li>請確認客戶與廠家名稱一致。</li>
            <li>時間可用於提醒或行程安排。</li>
            <li>跟進內容建議拆分為具體事項。</li>
          </ul>
        </div>
        <DifyAutoFillPanel :on-fill="applyAutoFill" />
      </aside>
    </section>

    <div v-if="activeModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card">
        <h2>
          編輯{{
            activeModal === 'client'
              ? '客戶'
              : activeModal === 'vendor'
                ? '廠家'
                : activeModal === 'product'
                  ? '產品'
                  : '標籤'
          }}
        </h2>
        <p>可新增或刪除清單中的項目。</p>
        <div class="modal-list">
          <div
            v-for="item in activeModal === 'client'
              ? clients
              : activeModal === 'vendor'
                ? vendors
                : activeModal === 'product'
                  ? products
                  : tags"
            :key="item"
            class="modal-list-item"
          >
            <span>{{ item }}</span>
            <button
              class="danger-button"
              type="button"
              @click="deleteOption(activeModal, item)"
            >
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

    <div v-if="showDraftSaved" class="modal-overlay" @click.self="showDraftSaved = false">
      <div class="modal-card">
        <h2>儲存成功</h2>
        <p>任務草稿已保存到本機。</p>
        <div class="modal-actions">
          <button class="primary-button" type="button" @click="showDraftSaved = false">確定</button>
        </div>
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
.task-page {
  min-height: 100vh;
  padding: 3.5rem 6vw 4.5rem calc(6vw + 88px);
  background: #f6f7fb;
  color: #0f172a;
  display: grid;
  gap: 2.5rem;
}

.task-header {
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

.primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.task-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
  gap: 2rem;
}

.task-form {
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

.select-field-wrapper {
  position: relative;
}

.field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field span {
  font-size: 0.9rem;
  color: #475569;
}

.field input,
.field textarea {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.85rem 1rem;
  font-size: 0.95rem;
  background: #fff;
  resize: vertical;
}

.select-field {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.85rem 1rem;
  font-size: 0.95rem;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.select-field::after {
  content: '▾';
  float: right;
  color: #94a3b8;
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

.option-search {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.45rem 0.6rem;
  font-size: 0.85rem;
  background: #fff;
}

.option-status {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  color: #64748b;
}

.required-hint {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  color: #dc2626;
  font-weight: 600;
}

.option-status.exists {
  color: #16a34a;
}

.option-status.missing {
  color: #dc2626;
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
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  background: #e2e8f0;
}

.user-label {
  font-size: 0.85rem;
  color: #1f2937;
}

.field textarea {
  min-height: 140px;
}

.field.wide {
  grid-column: 1 / -1;
}

.task-summary {
  display: grid;
  gap: 1.5rem;
}

.summary-card {
  background: #fff;
  border-radius: 24px;
  padding: 1.8rem;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
}

.summary-card h2 {
  margin: 0 0 1rem;
  font-size: 1.2rem;
}

.summary-card ul {
  margin: 0;
  padding-left: 1.2rem;
  color: #64748b;
  display: grid;
  gap: 0.6rem;
}

.summary-card p {
  margin: 0;
  color: #64748b;
}

.focus-list {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.focus-list span {
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.85rem;
  font-weight: 600;
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
  border-radius: 20px;
  padding: 2rem;
  width: min(420px, 100%);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
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
  gap: 0.6rem;
  max-height: 220px;
  overflow: auto;
  padding-right: 0.2rem;
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

@media (max-width: 1024px) {
  .task-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .task-page {
    padding: 2.5rem 6vw 3.5rem;
  }

  .task-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .field-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .header-actions {
    width: 100%;
    flex-direction: column;
  }
}
</style>
