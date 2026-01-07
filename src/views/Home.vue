<script setup>
import { computed, getCurrentInstance, onMounted, ref } from 'vue'
import WorkspaceSidebar from '../components/WorkspaceSidebar.vue'
import MonthlyCalendar from '../components/MonthlyCalendar.vue'

const router = getCurrentInstance().appContext.config.globalProperties.$router
const username = ref('hi')
const activePath = computed(() => router?.currentRoute?.value?.path || '')

const goToNewTask = () => {
  router?.push('/tasks/new')
}

const goToTaskList = () => {
  router?.push('/tasks/view')
}

const goToMeetingUpload = () => {
  router?.push('/meetings/upload')
}

const goToMeetingRecords = () => {
  router?.push('/meetings')
}

const goToHome = () => {
  router?.push('/home')
}

const goToProfile = () => {
  router?.push('/settings')
}

const loadUser = () => {
  const raw = window.localStorage.getItem('innerai_user')
  if (!raw) return
  try {
    const user = JSON.parse(raw)
    username.value = user.username || 'hi'
  } catch {
    // ignore
  }
}

onMounted(loadUser)
</script>

<template>
  <div class="home-page">
    <WorkspaceSidebar
      :on-create-task="goToNewTask"
      :on-view-tasks="goToTaskList"
      :on-upload-meeting="goToMeetingUpload"
      :on-view-meetings="goToMeetingRecords"
      :on-go-home="goToHome"
      :on-go-profile="goToProfile"
      :active-path="activePath"
    />

    <main class="home-content">
      <header class="home-header">
        <div>
          <p class="eyebrow">工作面板</p>
          <h1 class="headline">{{ username }}的工作面板</h1>
          <p class="subhead">快速掌握正在推進的項目、待辦與今日跟進事項。</p>
        </div>
        <div class="header-actions">
          <button class="ghost-button" type="button">下載報告</button>
          <button class="primary-button" type="button">建立新任務</button>
        </div>
      </header>

      <section class="summary-grid">
        <article class="summary-card">
          <p class="card-label">進行中的專案</p>
          <p class="card-value">6</p>
          <p class="card-meta">本週新增 2 個</p>
        </article>
        <article class="summary-card">
          <p class="card-label">待完成任務</p>
          <p class="card-value">18</p>
          <p class="card-meta">今日需完成 5 項</p>
        </article>
        <article class="summary-card">
          <p class="card-label">即將到期</p>
          <p class="card-value">3</p>
          <p class="card-meta">48 小時內</p>
        </article>
        <article class="summary-card">
          <p class="card-label">團隊協作</p>
          <p class="card-value">12</p>
          <p class="card-meta">進行中的交接</p>
        </article>
      </section>

      <section class="content-grid">
        <article class="panel">
          <header class="panel-header">
            <h2>今日時間線</h2>
            <p>依時間快速檢視今日需要跟進的項目。</p>
          </header>
          <div class="timeline">
            <div class="time-row">
              <span class="time">09:30</span>
              <div class="time-card">
                <h3>專案 Kickoff 會議</h3>
                <p>與設計、工程同步新版登入流程需求。</p>
              </div>
            </div>
            <div class="time-row">
              <span class="time">11:00</span>
              <div class="time-card highlight">
                <h3>客戶回覆整理</h3>
                <p>彙整回饋，更新需求追蹤表。</p>
              </div>
            </div>
            <div class="time-row">
              <span class="time">14:00</span>
              <div class="time-card">
                <h3>進度檢視</h3>
                <p>確認本週里程碑與交付節點。</p>
              </div>
            </div>
            <div class="time-row">
              <span class="time">16:30</span>
              <div class="time-card">
                <h3>內部討論</h3>
                <p>討論首頁儀表板數據展示。</p>
              </div>
            </div>
          </div>
        </article>

        <article class="panel">
          <header class="panel-header">
            <h2>今日追蹤</h2>
            <p>本日重點提醒，快速查看待辦狀態。</p>
          </header>
          <div class="progress-list">
            <div class="progress-item">
              <div>
                <p class="progress-title">登入頁面 UI 完成度</p>
                <p class="progress-meta">設計校正中</p>
              </div>
              <span class="progress-value">78%</span>
            </div>
            <div class="progress-bar">
              <span style="width: 78%"></span>
            </div>

            <div class="progress-item">
              <div>
                <p class="progress-title">API 串接準備</p>
                <p class="progress-meta">等候後端規格確認</p>
              </div>
              <span class="progress-value">52%</span>
            </div>
            <div class="progress-bar">
              <span style="width: 52%"></span>
            </div>

            <div class="progress-item">
              <div>
                <p class="progress-title">測試腳本整理</p>
                <p class="progress-meta">下班前完成</p>
              </div>
              <span class="progress-value">34%</span>
            </div>
            <div class="progress-bar">
              <span style="width: 34%"></span>
            </div>
          </div>
        </article>

        <article class="panel wide">
          <MonthlyCalendar />
        </article>
      </section>
    </main>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  background: #f6f7fb;
  color: #0f172a;
}

.home-content {
  padding: 3.5rem 6vw 4.5rem calc(6vw + 88px);
  background: #f6f7fb;
  color: #0f172a;
  display: grid;
  gap: 2.5rem;
}

.home-header {
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

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1.5rem;
}

.summary-card {
  background: #fff;
  border-radius: 20px;
  padding: 1.4rem 1.6rem;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
}

.card-label {
  color: #94a3b8;
  font-size: 0.85rem;
  margin: 0;
}

.card-value {
  font-size: 2rem;
  font-weight: 600;
  margin: 0.6rem 0;
}

.card-meta {
  color: #64748b;
  margin: 0;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 1.8rem;
}

.panel {
  background: #fff;
  border-radius: 24px;
  padding: 2rem;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 1.6rem;
}

.panel.wide {
  grid-column: 1 / -1;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.35rem;
}

.panel-header p {
  margin: 0.4rem 0 0;
  color: #64748b;
}

.timeline {
  display: grid;
  gap: 1.2rem;
}

.time-row {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr);
  gap: 1rem;
  align-items: center;
}

.time {
  font-weight: 600;
  color: #475569;
}

.time-card {
  padding: 1rem 1.2rem;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.time-card.highlight {
  background: #eef2ff;
  border-color: #c7d2fe;
}

.time-card h3 {
  margin: 0 0 0.3rem;
  font-size: 1rem;
}

.time-card p {
  margin: 0;
  color: #64748b;
}

.progress-list {
  display: grid;
  gap: 1.2rem;
}

.progress-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-title {
  margin: 0;
  font-weight: 600;
}

.progress-meta {
  margin: 0.2rem 0 0;
  color: #94a3b8;
  font-size: 0.85rem;
}

.progress-value {
  font-weight: 600;
  color: #1d4ed8;
}

.progress-bar {
  height: 8px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #1d4ed8, #6366f1);
  border-radius: inherit;
}


@media (max-width: 960px) {
  .home-content {
    padding: 2.5rem 6vw 3.5rem;
  }

  .home-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .content-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .home-content {
    padding: 2.5rem 6vw 3.5rem;
  }

  .header-actions {
    width: 100%;
    flex-direction: column;
  }
}
</style>
