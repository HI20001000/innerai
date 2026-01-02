<script setup>
import { computed, ref } from 'vue'

const activeTab = ref('login')
const heroGlow = ref({ x: 48, y: 32 })

const heroStyle = computed(() => ({
  '--glow-x': `${heroGlow.value.x}%`,
  '--glow-y': `${heroGlow.value.y}%`,
}))

const handleHeroMove = (event) => {
  const rect = event.currentTarget.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * 100
  const y = ((event.clientY - rect.top) / rect.height) * 100
  heroGlow.value = {
    x: Math.min(85, Math.max(15, x)),
    y: Math.min(80, Math.max(20, y)),
  }
}

const resetHeroGlow = () => {
  heroGlow.value = { x: 48, y: 32 }
}
</script>

<template>
  <div class="login-page">
    <aside
      class="login-hero"
      :style="heroStyle"
      @mousemove="handleHeroMove"
      @mouseleave="resetHeroGlow"
    >
      <div class="hero-content">
        <div class="logo-circle">AI</div>
        <p class="hero-title">InnerAI</p>
        <p class="hero-subtitle">用一個清爽的入口，快速啟動你的工作空間。</p>
        <ul class="hero-list">
          <li>單一入口，登入/註冊切換</li>
          <li>支援 Google 快速登入</li>
          <li>完整 UI 結構，方便後續接 API</li>
        </ul>
      </div>
      <div class="hero-accent"></div>
    </aside>

    <section class="login-panel">
      <header class="panel-header">
        <p class="panel-title">{{ activeTab === 'login' ? '歡迎回來' : '建立新帳號' }}</p>
        <p class="panel-subtitle">請輸入你的帳號資訊以繼續。</p>
      </header>

      <div class="tab-group">
        <button
          type="button"
          :class="['tab', { active: activeTab === 'login' }]"
          @click="activeTab = 'login'"
        >
          登入
        </button>
        <button
          type="button"
          :class="['tab', { active: activeTab === 'register' }]"
          @click="activeTab = 'register'"
        >
          註冊
        </button>
      </div>

      <form class="login-form" @submit.prevent>
        <div class="form-grid">
          <label class="field">
            <span>電子郵件</span>
            <input type="email" placeholder="name@company.com" />
          </label>

          <label class="field">
            <span>密碼</span>
            <input type="password" placeholder="••••••••" />
          </label>

          <label v-if="activeTab === 'register'" class="field">
            <span>確認密碼</span>
            <input type="password" placeholder="再次輸入密碼" />
          </label>

          <label v-if="activeTab === 'register'" class="field">
            <span>公司名稱</span>
            <input type="text" placeholder="InnerAI Studio" />
          </label>
        </div>

        <div class="helper-row" v-if="activeTab === 'login'">
          <label class="checkbox">
            <input type="checkbox" />
            <span>記住我</span>
          </label>
          <a class="link" href="#">忘記密碼？</a>
        </div>

        <button class="primary-button" type="submit">
          {{ activeTab === 'login' ? '登入帳號' : '建立帳號' }}
        </button>

        <div class="divider">
          <span>或使用</span>
        </div>

        <button class="secondary-button" type="button">
          <span class="google-icon" aria-hidden="true"></span>
          使用 Google 登入
        </button>
      </form>

      <p class="switch-text">
        {{ activeTab === 'login' ? '還沒有帳號？' : '已經有帳號？' }}
        <button class="link-button" type="button" @click="activeTab = activeTab === 'login' ? 'register' : 'login'">
          {{ activeTab === 'login' ? '免費註冊' : '立即登入' }}
        </button>
      </p>
    </section>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  background: #f6f7fb;
}

.login-hero {
  position: relative;
  background:
    radial-gradient(
      540px circle at var(--glow-x, 50%) var(--glow-y, 35%),
      rgba(124, 92, 255, 0.35),
      transparent 60%
    ),
    radial-gradient(
      420px circle at calc(var(--glow-x, 50%) + 10%) calc(var(--glow-y, 35%) + 6%),
      rgba(16, 185, 129, 0.22),
      transparent 58%
    ),
    linear-gradient(140deg, #111827 20%, #1f2937 85%);
  color: #fff;
  padding: 5rem 8vw;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  overflow: hidden;
}

.login-hero::before,
.login-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.login-hero::before {
  background: radial-gradient(
    220px circle at var(--glow-x, 50%) var(--glow-y, 35%),
    rgba(255, 255, 255, 0.16),
    transparent 65%
  );
  mix-blend-mode: screen;
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.login-hero::after {
  background: radial-gradient(
    160px circle at calc(var(--glow-x, 50%) - 12%) calc(var(--glow-y, 35%) - 10%),
    rgba(148, 163, 184, 0.18),
    transparent 70%
  );
  filter: blur(6px);
  opacity: 0.8;
}

.hero-content {
  max-width: 520px;
  display: grid;
  gap: 1.25rem;
  text-align: left;
  position: relative;
  z-index: 1;
}

.logo-circle {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  background: linear-gradient(135deg, #5b8cff, #7c5cff);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 1.2rem;
  box-shadow: 0 12px 28px rgba(91, 140, 255, 0.35);
}

.hero-title {
  font-size: 2.4rem;
  font-weight: 600;
  margin: 0;
}

.hero-subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  line-height: 1.6;
}

.hero-list {
  margin: 0;
  padding-left: 1.25rem;
  color: rgba(255, 255, 255, 0.75);
  display: grid;
  gap: 0.6rem;
  font-size: 0.95rem;
}

.hero-accent {
  position: absolute;
  width: 340px;
  height: 340px;
  right: -120px;
  top: 20%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(91, 140, 255, 0.45), transparent 70%);
  filter: blur(8px);
}

.login-panel {
  background: #ffffff;
  padding: 4.5rem 10vw;
  display: grid;
  align-content: center;
}

.panel-header {
  margin-bottom: 2rem;
}

.panel-title {
  font-size: 1.7rem;
  font-weight: 600;
  margin: 0;
  color: #0f172a;
}

.panel-subtitle {
  margin: 0.5rem 0 0;
  color: #64748b;
}

.tab-group {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  background: #f1f5f9;
  border-radius: 14px;
  padding: 0.35rem;
  margin-bottom: 2rem;
  border: 1px solid rgba(148, 163, 184, 0.15);
}

.tab {
  border: none;
  background: transparent;
  padding: 0.7rem 1rem;
  border-radius: 12px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab.active {
  background: #ffffff;
  color: #111827;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.form-grid {
  display: grid;
  gap: 1.1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  font-weight: 500;
  color: #111827;
}

.field span {
  font-size: 0.9rem;
  color: #475569;
}

.field input {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 0.85rem 1rem;
  font-size: 0.95rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background: #fff;
}

.field input:focus {
  outline: none;
  border-color: #5b8cff;
  box-shadow: 0 0 0 4px rgba(91, 140, 255, 0.15);
  background: #fff;
}

.helper-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  color: #6b7280;
}

.checkbox {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.link {
  color: #5b8cff;
  text-decoration: none;
  font-weight: 500;
}

.primary-button {
  background: #1f2937;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.primary-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 30px rgba(15, 23, 42, 0.25);
}

.secondary-button {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 0.85rem;
  background: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.secondary-button:hover {
  border-color: #cbd5e1;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
}

.divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #9ca3af;
  font-size: 0.85rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}

.google-icon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: conic-gradient(
    #4285f4 0deg 90deg,
    #34a853 90deg 180deg,
    #fbbc05 180deg 270deg,
    #ea4335 270deg 360deg
  );
}

.switch-text {
  margin-top: 2rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.95rem;
}

.link-button {
  background: none;
  border: none;
  color: #5b8cff;
  font-weight: 600;
  cursor: pointer;
  margin-left: 0.5rem;
}

@media (min-width: 960px) {
  .login-page {
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  }
}

@media (max-width: 640px) {
  .login-page {
    grid-template-columns: minmax(0, 1fr);
  }

  .login-hero {
    padding: 3rem 8vw 2.5rem;
  }

  .login-panel {
    padding: 2.5rem 8vw 3rem;
  }
}
</style>
