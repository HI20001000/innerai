# InnerAI

InnerAI 是一套以「任務、會議、跟進」為核心的協作管理系統。前端使用 Vue 3 + Vite，後端使用 Node.js 原生 HTTP 服務與 MySQL，並可串接 Dify 來做會議內容提取與會議報告整合。

## 主要能力

- 帳號註冊、登入、Token 驗證與個人資料維護
- 任務建立、編輯、刪除與條件篩選
- 多標籤、多關聯用戶、多筆跟進事項與跟進人指派
- 首頁個人工作台：今日時間線、月曆、狀態統計、連線狀況
- 管理視角儀表盤：用戶/客戶維度切換、月曆視圖、甘特圖視圖
- 會議記錄上傳、瀏覽、追加、刪除與階層式查詢
- Dify AI：
  - 從會議記錄提取任務欄位
  - 將同一會議資料夾中的文字內容整合成會議報告

## 技術棧

| 類別 | 技術 |
| --- | --- |
| Frontend | Vue 3、Vite、Vue Router 風格自製路由封裝 |
| Backend | Node.js ES Modules、`http`、`mysql2/promise` |
| Database | MySQL |
| Document parsing | `mammoth`，支援 `.docx` 文字抽取 |
| AI integration | Dify Chat Messages API |

## 專案結構

```text
.
├─ src/                 # Vue 前端頁面、元件與資料整理腳本
├─ server/              # Node 後端 API 與健康檢查、記錄工具
├─ public/              # 靜態資源
├─ docker-compose.yml   # MySQL / Frontend / Backend 容器啟動
├─ 產品說明.md           # 使用者視角功能說明
└─ 表關係.md             # 資料表、關聯與 API 寫入流程
```

## 執行需求

- Node.js `^20.19.0` 或 `>=22.12.0`
- npm
- MySQL 8.x，或直接使用專案內的 Docker Compose

## 本機開發

### 1. 安裝依賴

```sh
npm install
cd server
npm install
```

### 2. 設定 `.env`

根目錄 `.env` 會由後端啟動時載入。建議以實際環境值覆蓋，至少包含：

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password

DIFY_URL=http://your-dify-host/v1
DIFY_API_KEY=your_task_extract_key
DIFY_MEETING_API_KEY=your_meeting_report_key

VITE_API_BASE_URL=http://localhost:3001
```

常用變數：

| 變數 | 用途 |
| --- | --- |
| `MYSQL_HOST` | MySQL 主機 |
| `MYSQL_PORT` | MySQL 連接埠 |
| `MYSQL_USER` | MySQL 帳號 |
| `MYSQL_PASSWORD` | MySQL 密碼 |
| `DIFY_URL` | Dify API base URL |
| `DIFY_API_KEY` | 任務欄位提取使用 |
| `DIFY_MEETING_API_KEY` | 會議整合報告使用 |
| `VITE_API_BASE_URL` | 前端呼叫後端 API 的 base URL |
| `PORT` | 後端監聽埠，預設 `3001` |

### 3. 啟動後端

```sh
cd server
npm run dev
```

後端預設會：

- 連接 MySQL
- 自動建立 `innerai` 資料庫與必要資料表
- 寫入預設客戶、廠家、產品、任務標籤與跟進狀態
- 啟動 API 服務於 `http://localhost:3001`

### 4. 啟動前端

回到根目錄：

```sh
npm run dev
```

Vite 預設會啟動於 `http://localhost:5173`。

## Docker Compose

```sh
docker compose up
```

預設對外埠：

| 服務 | 容器內 | Host |
| --- | --- | --- |
| Frontend preview | `5173` | `8888` |
| Backend API | `3001` | `8889` |
| MySQL | `3306` | `8890` |

## 主要路由

| 路徑 | 功能 |
| --- | --- |
| `/` | 登入 / 註冊 |
| `/home` | 個人工作台 |
| `/tasks/new` | 新增任務 |
| `/tasks/view` | 任務總覽與編輯 |
| `/meetings` | 會議記錄中心 |
| `/meetings/upload` | 會議上傳頁 |
| `/users/dashboard` | 管理視角儀表盤 |
| `/settings` | 個人設定 |

## 後端重點

- `GET /api/health` 會回傳後端、MySQL、Dify 連線狀態。
- 任務、會議、跟進狀態、登入驗證等 API 都集中在 [`server/index.js`](./server/index.js)。
- 寫入型 SQL 會經過審計包裝，並輸出到 `logs` 目錄。
- 註冊流程中的驗證碼目前由後端直接寫到伺服器日誌，尚未整合正式寄信服務。

## 檔案與 AI 限制

- 會議記錄上傳前端限制為 `.txt` 與 `.docx`。
- 後端會儲存原始內容，並盡量抽取文字到 `content_text`。
- AI 提取與會議報告功能只有在 `DIFY_URL` 與對應 API Key 已設定時才可用。

## 延伸文件

- [產品說明.md](./產品說明.md)
- [表關係.md](./表關係.md)
