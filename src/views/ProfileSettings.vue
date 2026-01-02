<template>
  <div class="settings-page">
    <WorkspaceSidebar :on-create-task="goToNewTask" :on-go-home="goToHome" :on-go-profile="goToProfile" />
    <header class="settings-header">
      <div>
        <p class="eyebrow">使用者設定</p>
        <h1>個人資料與權限</h1>
        <p class="subhead">更新你的頭像、名稱、權限與密碼。</p>
      </div>
      <button class="primary-button" type="button" @click="saveProfile">儲存設定</button>
    </header>

    <section class="settings-grid">
      <div class="panel">
        <h2>頭像設定</h2>
        <div class="avatar-preview" :style="{ backgroundColor: localIconBg }">
          {{ localIcon }}
        </div>
        <div class="icon-slider">
          <button class="icon-nav" type="button" @click="iconIndex = Math.max(iconIndex - 1, 0)">‹</button>
          <div class="icon-window">
            <div class="icon-track" :style="{ transform: `translateX(-${iconIndex * 64}px)` }">
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

      <div class="panel">
        <h2>基本資訊</h2>
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
      </div>

      <div class="panel wide">
        <h2>修改密碼</h2>
        <p class="hint">請先輸入舊密碼，再填入新密碼。</p>
        <div class="password-grid">
          <label class="field">
            <span>舊密碼</span>
            <input v-model="currentPassword" type="password" placeholder="輸入舊密碼" />
          </label>
          <label class="field">
            <span>新密碼</span>
            <input v-model="newPassword" type="password" placeholder="輸入新密碼" />
          </label>
        </div>
      </div>
    </section>

    <p v-if="message" class="message">{{ message }}</p>
  </div>
</template>

<script setup>
import { getCurrentInstance, onMounted, ref } from 'vue'
import WorkspaceSidebar from '../components/WorkspaceSidebar.vue'

const apiBaseUrl = 'http://localhost:3001'
const router = getCurrentInstance().appContext.config.globalProperties.$router

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
const iconColors = ['#e2e8f0', '#fde68a', '#bbf7d0', '#bae6fd', '#ddd6fe', '#fecdd3', '#fed7aa']
const iconIndex = ref(0)

const localIcon = ref('🙂')
const localIconBg = ref('#e2e8f0')
const localUsername = ref('hi')
const localRole = ref('normal')
const currentPassword = ref('')
const newPassword = ref('')
const message = ref('')
const userEmail = ref('')

const goToHome = () => router?.push('/home')
const goToNewTask = () => router?.push('/tasks/new')
const goToProfile = () => router?.push('/settings')

const loadUser = () => {
  const raw = window.localStorage.getItem('innerai_user')
  if (!raw) return
  try {
    const user = JSON.parse(raw)
    userEmail.value = user.mail || ''
    localIcon.value = user.icon || '🙂'
    localIconBg.value = user.icon_bg || '#e2e8f0'
    localUsername.value = user.username || 'hi'
    localRole.value = user.role || 'normal'
    const idx = iconOptions.indexOf(localIcon.value)
    iconIndex.value = idx >= 0 ? idx : 0
  } catch {
    // ignore
  }
}

const saveProfile = async () => {
  message.value = ''
  if (!userEmail.value) {
    message.value = '尚未登入，無法編輯'
    return
  }
  try {
    const response = await fetch(`${apiBaseUrl}/api/users/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userEmail.value,
        icon: localIcon.value,
        icon_bg: localIconBg.value,
        username: localUsername.value,
        role: localRole.value,
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      message.value = data.message || '更新失敗'
      return
    }
    window.localStorage.setItem(
      'innerai_user',
      JSON.stringify({
        mail: userEmail.value,
        icon: localIcon.value,
        icon_bg: localIconBg.value,
        username: localUsername.value,
        role: localRole.value,
      })
    )
    message.value = '已更新'
    currentPassword.value = ''
    newPassword.value = ''
  } catch (error) {
    console.error(error)
    message.value = '更新失敗'
  }
}

onMounted(loadUser)
</script>

<style scoped>
.settings-page {
  min-height: 100vh;
  padding: 3.5rem 6vw 4.5rem calc(6vw + 88px);
  background: #f6f7fb;
  color: #0f172a;
  display: grid;
  gap: 2rem;
}

.settings-header {
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

.subhead {
  margin: 0.4rem 0 0;
  color: #64748b;
  max-width: 520px;
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

.settings-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 1.6rem;
}

.panel {
  background: #fff;
  border-radius: 24px;
  padding: 2rem;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 1.2rem;
}

.panel.wide {
  grid-column: 1 / -1;
}

.avatar-preview {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  font-size: 2rem;
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

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
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

.password-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.hint {
  margin: 0;
  color: #64748b;
}

.message {
  color: #2563eb;
  font-weight: 500;
}

@media (max-width: 1024px) {
  .settings-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .settings-page {
    padding: 2.5rem 6vw 3.5rem;
  }

  .settings-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .password-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
