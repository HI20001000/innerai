<template>
  <div v-if="open" class="modal-overlay" @click.self="onClose">
    <div class="modal-card">
      <h2>編輯個人資料</h2>
      <p>更新你的 icon、名稱、權限與密碼。</p>
      <div class="form-grid">
        <div class="field">
          <span>Icon (Emoji)</span>
          <div class="icon-slider">
            <button
              class="icon-nav"
              type="button"
              @click="iconIndex = Math.max(iconIndex - 1, 0)"
            >
              ‹
            </button>
            <div class="icon-window">
              <div
                class="icon-track"
                :style="{ transform: `translateX(-${iconIndex * 64}px)` }"
              >
                <button
                  v-for="icon in iconOptions"
                  :key="icon"
                  type="button"
                  :class="['icon-option', { active: localIcon === icon }]"
                  @click="localIcon = icon"
                >
                  {{ icon }}
                </button>
              </div>
            </div>
            <button
              class="icon-nav"
              type="button"
              @click="iconIndex = Math.min(iconIndex + 1, iconOptions.length - 4)"
            >
              ›
            </button>
          </div>
        </div>
        <div class="field">
          <span>Icon 背景</span>
          <div class="color-grid">
            <button
              v-for="color in iconColors"
              :key="color"
              type="button"
              :class="['color-swatch', { active: localIconBg === color }]"
              :style="{ backgroundColor: color }"
              @click="localIconBg = color"
            ></button>
          </div>
        </div>
        <label class="field">
          <span>Username</span>
          <input v-model="localUsername" type="text" placeholder="hi" />
        </label>
        <label class="field">
          <span>Role</span>
          <select v-model="localRole">
            <option value="normal">normal</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <div class="field">
          <span>修改密碼</span>
          <button class="ghost-button inline" type="button" @click="togglePassword">
            {{ showPasswordFields ? '取消修改' : '修改密碼' }}
          </button>
        </div>
        <label v-if="showPasswordFields" class="field">
          <span>舊密碼</span>
          <input v-model="currentPassword" type="password" placeholder="輸入舊密碼" />
        </label>
        <label v-if="showPasswordFields" class="field">
          <span>新密碼</span>
          <input v-model="newPassword" type="password" placeholder="輸入新密碼" />
        </label>
      </div>
      <div class="modal-actions">
        <button class="ghost-button" type="button" @click="onClose">取消</button>
        <button class="primary-button" type="button" @click="handleSave">儲存</button>
      </div>
      <p v-if="message" class="message">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  user: {
    type: Object,
    default: () => ({}),
  },
  onClose: {
    type: Function,
    default: () => {},
  },
  onSave: {
    type: Function,
    default: () => {},
  },
})

const localIcon = ref('')
const localUsername = ref('')
const localRole = ref('normal')
const showPasswordFields = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const iconOptions = [
  '🙂',
  '😎',
  '🎯',
  '🚀',
  '🧠',
  '📌',
  '✨',
  '🛠️',
  '👩‍💻',
  '👨‍💻',
  '📊',
  '🧩',
  '🧭',
  '📣',
  '🧪',
  '📚',
  '🎨',
  '⚡️',
  '🧱',
  '💡',
]
const iconIndex = ref(0)
const iconColors = ['#e2e8f0', '#fde68a', '#bbf7d0', '#bae6fd', '#ddd6fe', '#fecdd3', '#fed7aa']
const localIconBg = ref('#e2e8f0')
const message = ref('')

const hydratedUser = computed(() => props.user || {})

watch(
  () => props.open,
  (value) => {
    if (!value) return
    localIcon.value = hydratedUser.value.icon || '🙂'
    localUsername.value = hydratedUser.value.username || 'hi'
    localRole.value = hydratedUser.value.role || 'normal'
    localIconBg.value = hydratedUser.value.icon_bg || '#e2e8f0'
    currentPassword.value = ''
    newPassword.value = ''
    showPasswordFields.value = false
    message.value = ''
    const initialIndex = iconOptions.indexOf(localIcon.value)
    iconIndex.value = initialIndex >= 0 ? initialIndex : 0
  }
)

const togglePassword = () => {
  showPasswordFields.value = !showPasswordFields.value
  currentPassword.value = ''
  newPassword.value = ''
}

const handleSave = async () => {
  message.value = ''
  const payload = {
    icon: localIcon.value,
    icon_bg: localIconBg.value,
    username: localUsername.value,
    role: localRole.value,
    currentPassword: showPasswordFields.value ? currentPassword.value : '',
    newPassword: showPasswordFields.value ? newPassword.value : '',
  }
  const result = await props.onSave(payload)
  if (result?.message) {
    message.value = result.message
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: grid;
  place-items: center;
  padding: 2rem;
  z-index: 30;
}

.modal-card {
  background: #fff;
  border-radius: 20px;
  padding: 2rem;
  width: fit-content;
  max-width: 92vw;
  min-width: 320px;
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

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.2rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field:first-child,
.field:nth-child(4),
.field:nth-child(5) {
  grid-column: 1 / -1;
}

.field span {
  font-size: 0.9rem;
  color: #475569;
}

.field input,
.field select {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.75rem 0.9rem;
  font-size: 0.95rem;
  background: #fff;
}

.icon-slider {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 32px;
  gap: 0.6rem;
  align-items: center;
}

.icon-window {
  overflow: hidden;
  width: 256px;
}

.icon-track {
  display: flex;
  gap: 0.4rem;
  transition: transform 0.2s ease;
}

.icon-option {
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 12px;
  width: 56px;
  height: 56px;
  font-size: 1.2rem;
  cursor: pointer;
}

.icon-option.active {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
}

.icon-nav {
  border: none;
  background: #f1f5f9;
  color: #334155;
  border-radius: 12px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 1.2rem;
}

.color-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: 2px solid transparent;
  cursor: pointer;
}

.color-swatch.active {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.ghost-button {
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 0.7rem 1.3rem;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  color: #475569;
}

.ghost-button.inline {
  width: fit-content;
}

.primary-button {
  border: none;
  background: #111827;
  color: #fff;
  padding: 0.7rem 1.5rem;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
}

.message {
  color: #2563eb;
  font-weight: 500;
  margin: 0;
}
</style>
