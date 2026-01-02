<template>
  <aside class="workspace-sidebar">
    <div class="sidebar-top">
      <button class="home-button" type="button" aria-label="返回首頁" @click="onGoHome">
        <span class="home-icon">⌂</span>
      </button>
      <button class="sidebar-button" type="button" aria-label="新增任務" @click="onCreateTask">
        <span class="sidebar-icon">＋</span>
        新增任務
      </button>
    </div>
    <div class="sidebar-bottom">
      <button class="profile-button" type="button" aria-label="個人檔案" @click="openProfile">
        <span class="profile-avatar">{{ currentUser.icon || '🙂' }}</span>
      </button>
    </div>
    <ProfileEditorModal
      :open="showProfile"
      :user="currentUser"
      :on-close="closeProfile"
      :on-save="saveProfile"
    />
  </aside>
</template>

<script setup>
import { ref } from 'vue'
import ProfileEditorModal from './ProfileEditorModal.vue'

const { onCreateTask, onGoHome } = defineProps({
  onCreateTask: {
    type: Function,
    default: () => {},
  },
  onGoHome: {
    type: Function,
    default: () => {},
  },
})

const apiBaseUrl = 'http://localhost:3001'
const showProfile = ref(false)
const currentUser = ref({})

const loadUser = () => {
  const raw = window.localStorage.getItem('innerai_user')
  if (!raw) {
    currentUser.value = {}
    return
  }
  try {
    currentUser.value = JSON.parse(raw)
  } catch {
    currentUser.value = {}
  }
}

const openProfile = () => {
  loadUser()
  showProfile.value = true
}

const closeProfile = () => {
  showProfile.value = false
}

const saveProfile = async (payload) => {
  if (!currentUser.value?.mail) {
    return { message: '尚未登入，無法編輯' }
  }
  try {
    const response = await fetch(`${apiBaseUrl}/api/users/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: currentUser.value.mail,
        icon: payload.icon,
        username: payload.username,
        role: payload.role,
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      return { message: data.message || '更新失敗' }
    }
    currentUser.value = {
      ...currentUser.value,
      icon: payload.icon,
      username: payload.username,
      role: payload.role,
    }
    window.localStorage.setItem('innerai_user', JSON.stringify(currentUser.value))
    return { message: '已更新' }
  } catch (error) {
    console.error(error)
    return { message: '更新失敗' }
  }
}
</script>

<style scoped>
.workspace-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 88px;
  background: rgba(15, 23, 42, 0.55);
  border-right: 1px solid rgba(148, 163, 184, 0.2);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 2rem 0 1.5rem;
}

.sidebar-top,
.sidebar-bottom {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.home-button {
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  border-radius: 16px;
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.home-icon {
  font-size: 1.1rem;
}

.sidebar-button {
  border: none;
  background: #2563eb;
  color: #fff;
  border-radius: 18px;
  padding: 0.75rem 0.6rem;
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  font-weight: 600;
  font-size: 0.7rem;
  text-align: center;
  line-height: 1.1;
  cursor: pointer;
  box-shadow: 0 14px 26px rgba(37, 99, 235, 0.4);
}

.sidebar-icon {
  font-size: 1.4rem;
  margin-bottom: 0.1rem;
}

.profile-button {
  border: none;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.profile-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #f8fafc;
  color: #0f172a;
  font-weight: 600;
  display: grid;
  place-items: center;
  font-size: 0.8rem;
}

@media (max-width: 960px) {
  .workspace-sidebar {
    position: sticky;
    top: 0;
    width: 100%;
    height: auto;
    flex-direction: row;
    justify-content: space-between;
    padding: 1.2rem 6vw;
    z-index: 10;
  }

  .sidebar-top {
    flex-direction: row;
  }

  .sidebar-button {
    width: auto;
    height: auto;
    padding: 0.8rem 1.2rem;
  }

  .sidebar-icon {
    margin: 0 0.4rem 0 0;
  }

  .sidebar-button {
    display: inline-flex;
    gap: 0.4rem;
  }
}
</style>
