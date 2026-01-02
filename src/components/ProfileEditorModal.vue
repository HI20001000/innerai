<template>
  <div v-if="open" class="modal-overlay" @click.self="onClose">
    <div class="modal-card">
      <h2>編輯個人資料</h2>
      <p>更新你的 icon、名稱、權限與密碼。</p>
      <div class="form-grid">
        <label class="field">
          <span>Icon (Emoji)</span>
          <input v-model="localIcon" type="text" placeholder="🙂" maxlength="4" />
        </label>
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
        <label class="field">
          <span>新密碼</span>
          <input v-model="localPassword" type="password" placeholder="••••••••" />
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
const localPassword = ref('')
const message = ref('')

const hydratedUser = computed(() => props.user || {})

watch(
  () => props.open,
  (value) => {
    if (!value) return
    localIcon.value = hydratedUser.value.icon || '🙂'
    localUsername.value = hydratedUser.value.username || 'hi'
    localRole.value = hydratedUser.value.role || 'normal'
    localPassword.value = ''
    message.value = ''
  }
)

const handleSave = async () => {
  message.value = ''
  const payload = {
    icon: localIcon.value,
    username: localUsername.value,
    role: localRole.value,
    password: localPassword.value,
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
  width: min(480px, 100%);
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
  gap: 1rem;
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
