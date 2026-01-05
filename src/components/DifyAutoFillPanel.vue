<script setup>
import { ref } from 'vue'
import * as mammoth from 'mammoth/mammoth.browser'

const props = defineProps({
  onFill: {
    type: Function,
    default: () => {},
  },
})

const apiBaseUrl = 'http://localhost:3001'
const isLoading = ref(false)
const message = ref('')
const messageType = ref('')

const setMessage = (text, type = '') => {
  message.value = text
  messageType.value = type
}

const parseJsonPayload = (answer) => {
  if (!answer || typeof answer !== 'string') return null
  try {
    return JSON.parse(answer)
  } catch {
    const start = answer.indexOf('{')
    const end = answer.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) return null
    try {
      return JSON.parse(answer.slice(start, end + 1))
    } catch {
      return null
    }
  }
}

const readFileContent = async (file) => {
  if (!file) return ''
  const name = file.name.toLowerCase()
  if (name.endsWith('.txt')) {
    return await file.text()
  }
  if (name.endsWith('.docx')) {
    const buffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer: buffer })
    return result.value || ''
  }
  return null
}

const handleFileChange = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  setMessage('')
  isLoading.value = true
  try {
    const content = await readFileContent(file)
    if (content === null) {
      setMessage('僅支援 docx 或 txt 檔案。', 'error')
      return
    }
    if (!content.trim()) {
      setMessage('檔案內容為空，請重新選擇。', 'error')
      return
    }
    const response = await fetch(`${apiBaseUrl}/api/dify/auto-fill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: content }),
    })
    const data = await response.json()
    if (!response.ok || !data?.success) {
      setMessage(data?.message || 'Dify 處理失敗', 'error')
      return
    }
    const answer = data?.data?.answer
    const parsed = parseJsonPayload(answer)
    if (!parsed) {
      setMessage('無法解析 Dify 回傳資料。', 'error')
      return
    }
    props.onFill(parsed)
    setMessage('Dify 自動填寫完成', 'success')
  } catch (error) {
    console.error(error)
    setMessage('Dify 處理失敗', 'error')
  } finally {
    isLoading.value = false
    event.target.value = ''
  }
}
</script>

<template>
  <div class="summary-card dify-card">
    <h2>Dify 自動填寫</h2>
    <p>上傳 docx 或 txt 檔案，自動解析並填入任務欄位。</p>
    <label class="upload-area">
      <input
        class="upload-input"
        type="file"
        accept=".txt,.docx"
        :disabled="isLoading"
        @change="handleFileChange"
      />
      <span class="upload-button">{{ isLoading ? '處理中...' : '上傳檔案' }}</span>
    </label>
    <p v-if="message" :class="['status-message', messageType]">{{ message }}</p>
  </div>
</template>

<style scoped>
.dify-card {
  display: grid;
  gap: 0.8rem;
}

.dify-card h2 {
  margin: 0;
  font-size: 1.2rem;
}

.dify-card p {
  margin: 0;
  color: #64748b;
}

.upload-area {
  display: inline-flex;
  align-items: center;
}

.upload-input {
  display: none;
}

.upload-button {
  padding: 0.45rem 1rem;
  border-radius: 999px;
  background: #111827;
  color: #fff;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}

.status-message {
  margin: 0;
  font-weight: 600;
  font-size: 0.9rem;
}

.status-message.success {
  color: #16a34a;
}

.status-message.error {
  color: #dc2626;
}
</style>
