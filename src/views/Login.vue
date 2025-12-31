<script setup>
import { ref } from 'vue'

const activeTab = ref('login')
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="brand">
        <div class="logo-circle">AI</div>
        <div>
          <p class="brand-title">InnerAI</p>
          <p class="brand-subtitle">Sign in to continue</p>
        </div>
      </div>

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
    </div>

    <div class="promo-panel">
      <div class="promo-content">
        <p class="promo-title">智慧登入體驗</p>
        <p class="promo-text">
          透過現代化的帳號流程與社群登入，讓團隊快速開始協作。
        </p>
        <div class="promo-metrics">
          <div>
            <p class="metric-value">98%</p>
            <p class="metric-label">完成率</p>
          </div>
          <div>
            <p class="metric-value">2 分鐘</p>
            <p class="metric-label">建立帳號</p>
          </div>
          <div>
            <p class="metric-value">24/7</p>
            <p class="metric-label">安全保護</p>
          </div>
        </div>
      </div>
      <div class="promo-gradient"></div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  gap: 2rem;
  padding: 4rem 6vw;
  background: #f5f6fb;
}

.login-card {
  background: #ffffff;
  border-radius: 24px;
  padding: 3rem;
  box-shadow: 0 25px 60px rgba(15, 23, 42, 0.1);
  max-width: 480px;
  width: 100%;
  margin: 0 auto;
}

.brand {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.logo-circle {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: linear-gradient(135deg, #5b8cff, #7c5cff);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 1.2rem;
}

.brand-title {
  font-size: 1.35rem;
  font-weight: 600;
  margin: 0;
}

.brand-subtitle {
  margin: 0.25rem 0 0;
  color: #6b7280;
  font-size: 0.95rem;
}

.tab-group {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  background: #f4f6ff;
  border-radius: 14px;
  padding: 0.35rem;
  margin-bottom: 2rem;
}

.tab {
  border: none;
  background: transparent;
  padding: 0.6rem 1rem;
  border-radius: 12px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab.active {
  background: #ffffff;
  color: #111827;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-grid {
  display: grid;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-weight: 500;
  color: #111827;
}

.field input {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 0.85rem 1rem;
  font-size: 0.95rem;
  transition: border-color 0.2s ease;
}

.field input:focus {
  outline: none;
  border-color: #5b8cff;
  box-shadow: 0 0 0 3px rgba(91, 140, 255, 0.15);
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
  background: linear-gradient(135deg, #5b8cff, #7c5cff);
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 12px 28px rgba(91, 140, 255, 0.3);
}

.secondary-button {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 0.85rem;
  background: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 600;
  cursor: pointer;
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

.promo-panel {
  position: relative;
  border-radius: 28px;
  padding: 3rem;
  background: #111827;
  color: #fff;
  overflow: hidden;
  min-height: 420px;
  max-width: 520px;
  margin: 0 auto;
}

.promo-content {
  position: relative;
  z-index: 2;
  display: grid;
  gap: 1.5rem;
}

.promo-title {
  font-size: 2rem;
  font-weight: 600;
  margin: 0;
}

.promo-text {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
}

.promo-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.metric-value {
  font-size: 1.4rem;
  font-weight: 600;
  margin: 0;
}

.metric-label {
  margin: 0.2rem 0 0;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
}

.promo-gradient {
  position: absolute;
  inset: auto -40% -40% auto;
  width: 380px;
  height: 380px;
  background: radial-gradient(circle, rgba(91, 140, 255, 0.6), transparent 70%);
  filter: blur(10px);
}

@media (min-width: 960px) {
  .login-page {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}

@media (max-width: 960px) {
  .promo-panel {
    display: none;
  }

  .login-page {
    padding: 3rem 1.5rem;
  }
}
</style>
