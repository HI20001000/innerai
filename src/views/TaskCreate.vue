<template>
  <div class="task-page">
    <header class="task-header">
      <div>
        <p class="eyebrow">新增任務</p>
        <h1 class="headline">建立新的工作追蹤</h1>
        <p class="subhead">填寫任務設定，快速建立後續追蹤內容。</p>
      </div>
      <div class="header-actions">
        <button class="ghost-button" type="button">儲存草稿</button>
        <button class="primary-button" type="button">建立任務</button>
      </div>
    </header>

    <section class="task-layout">
      <form class="task-form" @submit.prevent>
        <div class="field-grid">
          <label class="field">
            <span>客戶</span>
            <input type="text" placeholder="輸入客戶名稱" />
          </label>
          <label class="field">
            <span>廠家</span>
            <input type="text" placeholder="輸入廠家名稱" />
          </label>
          <label class="field">
            <span>廠家產品</span>
            <input type="text" placeholder="輸入產品或型號" />
          </label>
          <label class="field">
            <span>時間</span>
            <input type="datetime-local" />
          </label>
          <label class="field">
            <span>地點</span>
            <input type="text" placeholder="輸入會議/拜訪地點" />
          </label>
          <label class="field wide">
            <span>需跟進內容</span>
            <textarea rows="5" placeholder="描述需跟進的重點或待辦事項"></textarea>
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
