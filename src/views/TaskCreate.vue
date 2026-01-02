<script setup>
import { onMounted, ref } from 'vue'

const clients = ref(['日昇科技', '遠誠貿易', '星河設計', '宏達建設'])
const vendors = ref(['青雲材料', '耀達製造', '風尚供應', '遠景工廠'])
const products = ref(['智慧儀表 X1', '節能模組 A3', '自動化平台 Pro', '雲端控制盒'])
const tags = ref(['客戶跟進', '客戶匯報', '需求整理', '合約追蹤'])

const selectedClient = ref('')
const selectedVendor = ref('')
const selectedProduct = ref('')
const selectedTag = ref('')
const activeList = ref(null)
const selectedTime = ref('')
const selectedLocation = ref('')
const followUpContent = ref('')

const activeModal = ref(null)
const newOption = ref('')
const draftKey = 'innerai_task_draft'

const openModal = (type) => {
  activeModal.value = type
  newOption.value = ''
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
  activeList.value = null
}

const closeModal = () => {
  activeModal.value = null
  newOption.value = ''
}

const addOption = () => {
  const value = newOption.value.trim()
  if (!value) return
  if (activeModal.value === 'client' && !clients.value.includes(value)) {
    clients.value.unshift(value)
    selectedClient.value = value
  }
  if (activeModal.value === 'vendor' && !vendors.value.includes(value)) {
    vendors.value.unshift(value)
    selectedVendor.value = value
  }
  if (activeModal.value === 'product' && !products.value.includes(value)) {
    products.value.unshift(value)
    selectedProduct.value = value
  }
  if (activeModal.value === 'tag' && !tags.value.includes(value)) {
    tags.value.unshift(value)
    selectedTag.value = value
  }
  closeModal()
}

const saveDraft = () => {
  const payload = {
    selectedClient: selectedClient.value,
    selectedVendor: selectedVendor.value,
    selectedProduct: selectedProduct.value,
    selectedTag: selectedTag.value,
    selectedTime: selectedTime.value,
    selectedLocation: selectedLocation.value,
    followUpContent: followUpContent.value,
  }
  window.localStorage.setItem(draftKey, JSON.stringify(payload))
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
    selectedTime.value = payload.selectedTime ?? ''
    selectedLocation.value = payload.selectedLocation ?? ''
    followUpContent.value = payload.followUpContent ?? ''
  } catch {
    window.localStorage.removeItem(draftKey)
  }
}

onMounted(() => {
  loadDraft()
})
</script>

<template>
  <div class="task-page">
    <header class="task-header">
      <div>
        <p class="eyebrow">新增任務</p>
        <h1 class="headline">建立新的工作追蹤</h1>
        <p class="subhead">填寫任務設定，快速建立後續追蹤內容。</p>
      </div>
      <div class="header-actions">
        <button class="ghost-button" type="button" @click="saveDraft">儲存草稿</button>
        <button class="primary-button" type="button">建立任務</button>
      </div>
    </header>

    <section class="task-layout">
      <form class="task-form" @submit.prevent>
        <div class="field-grid">
          <div class="field select-field-wrapper">
            <div class="field-header">
              <span>客戶</span>
              <button class="ghost-mini" type="button" @click="openModal('client')">新增</button>
            </div>
            <button
              class="select-field"
              type="button"
              @click="activeList = activeList === 'client' ? null : 'client'"
            >
              {{ selectedClient || '選擇客戶' }}
            </button>
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
              <button class="ghost-mini" type="button" @click="openModal('vendor')">新增</button>
            </div>
            <button
              class="select-field"
              type="button"
              @click="activeList = activeList === 'vendor' ? null : 'vendor'"
            >
              {{ selectedVendor || '選擇廠家' }}
            </button>
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
              <button class="ghost-mini" type="button" @click="openModal('product')">新增</button>
            </div>
            <button
              class="select-field"
              type="button"
              @click="activeList = activeList === 'product' ? null : 'product'"
            >
              {{ selectedProduct || '選擇產品' }}
            </button>
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
          <div class="field select-field-wrapper">
            <div class="field-header">
              <span>任務標籤</span>
              <button class="ghost-mini" type="button" @click="openModal('tag')">新增</button>
            </div>
            <button
              class="select-field"
              type="button"
              @click="activeList = activeList === 'tag' ? null : 'tag'"
            >
              {{ selectedTag || '選擇標籤' }}
            </button>
            <div v-if="activeList === 'tag'" class="option-list">
              <button
                v-for="item in tags"
                :key="item"
                type="button"
                class="option-item"
                @click="selectOption('tag', item)"
              >
                {{ item }}
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

        <div class="form-actions">
          <button class="ghost-button" type="button">取消</button>
          <button class="primary-button" type="submit">送出任務</button>
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
        <div class="summary-card">
          <h2>今日焦點</h2>
          <p>3 個任務待建立</p>
          <div class="focus-list">
            <span>客戶簡報</span>
            <span>樣品追蹤</span>
            <span>合約回覆</span>
          </div>
        </div>
      </aside>
    </section>

    <div v-if="activeModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card">
        <h2>
          新增{{
            activeModal === 'client'
              ? '客戶'
              : activeModal === 'vendor'
                ? '廠家'
                : activeModal === 'product'
                  ? '產品'
                  : '標籤'
          }}
        </h2>
        <p>輸入名稱後即可加入搜尋清單。</p>
        <input v-model="newOption" type="text" placeholder="輸入名稱" />
        <div class="modal-actions">
          <button class="ghost-button" type="button" @click="closeModal">取消</button>
          <button class="primary-button" type="button" @click="addOption">新增</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-page {
  min-height: 100vh;
  padding: 3.5rem 6vw 4.5rem;
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

.field textarea {
  min-height: 140px;
}

.field.wide {
  grid-column: 1 / -1;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
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

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

@media (max-width: 1024px) {
  .task-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
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
