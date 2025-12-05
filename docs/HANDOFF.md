# Veda-Iris Handoff Document - Tandem

**Project**: Tandem - AI-Native Collaboration Platform
**Tagline**: "Work in tandem with AI"
**Date**: 2025-12-05
**Sprint**: Weekend Side Project (MVP)

---

## 🔔 UPDATE (2025-12-05 21:45)

**專案正式命名為 Tandem！**

**Veda**: 繼續在當前目錄 (`ai-collab/`) 完成開發，改名由 Iris 統一處理。技術規格不變。

詳見：`PROJECT-UPDATE.md`

---

## 🎯 Project Overview

**Vision**: The first workspace designed for humans and AI to work together.

**MVP Goal**: 建立一個簡單的 Web UI + CLI Tool，讓人類和 AI（如 Claude Code）可以協作編輯 Markdown 檔案，並有完整的版本控制。

**分工**:
- **Veda** (Antigravity): Web UI (React + shadcn/ui)
- **Iris** (Claude Code): Backend API + CLI Tool + Git Service

---

## 🔧 Technical Stack

### Frontend (Veda)
```
Framework: React 19 + Vite
UI Library: shadcn/ui + Tailwind CSS
State Management: Zustand
Routing: React Router
Markdown Editor: CodeMirror 6
HTTP Client: fetch / axios
```

### Backend (Iris)
```
Runtime: Bun
Framework: Hono
Git Library: simple-git
Auth: Clerk
Database: SQLite (metadata)
Deployment: Vercel Serverless
```

---

## 📋 API Contract

### Base URL
```
Development: http://localhost:3000/api
Production: https://ai-collab.vercel.app/api
```

### Authentication
```typescript
// All requests require Authorization header
Headers: {
  "Authorization": "Bearer <clerk-token>"
}
```

### Endpoints

#### 1. Files API

**GET /api/files**
- 列出所有檔案
- Response:
```typescript
{
  files: Array<{
    path: string;           // "docs/PRD.md"
    name: string;           // "PRD.md"
    type: "file" | "folder";
    size: number;           // bytes
    modified: string;       // ISO timestamp
  }>
}
```

**GET /api/files/:path**
- 讀取檔案內容
- Response:
```typescript
{
  path: string;
  content: string;        // Markdown content
  metadata: {
    author: string;
    modified: string;
    commit: string;       // latest commit SHA
  }
}
```

**POST /api/files/:path**
- 新增或更新檔案（自動 commit）
- Request Body:
```typescript
{
  content: string;
  author: "ai" | "human";
  message?: string;       // Optional commit message
}
```
- Response:
```typescript
{
  success: boolean;
  commit: string;         // commit SHA
}
```

**DELETE /api/files/:path**
- 刪除檔案（自動 commit）
- Response:
```typescript
{
  success: boolean;
  commit: string;
}
```

#### 2. Commits API

**GET /api/commits?file=:path**
- 取得檔案的版本歷史（時間軸）
- Query Params:
  - `file` (optional): 特定檔案路徑
  - `limit` (optional): 回傳筆數（預設 50）
- Response:
```typescript
{
  commits: Array<{
    sha: string;
    author: string;
    type: "ai" | "human";   // 🔥 核心：區分人類 vs AI
    message: string;
    timestamp: string;
    filesChanged: string[];
  }>
}
```

**GET /api/commits/:sha**
- 取得特定 commit 的詳細資料與 diff
- Response:
```typescript
{
  commit: {
    sha: string;
    author: string;
    type: "ai" | "human";
    message: string;
    timestamp: string;
  },
  diff: string;           // unified diff format
}
```

**POST /api/commits/:sha/revert**
- 還原到特定版本
- Response:
```typescript
{
  success: boolean;
  newCommit: string;
}
```

---

## 🎨 UI Components (Veda 負責)

### 1. File Explorer (Left Sidebar)
```
功能：
- 樹狀檔案列表（檔案/資料夾）
- 點擊檔案 → 開啟編輯器
- 右鍵選單：New File / Delete / Rename
- 只支援 .md 檔案

設計參考：
- VS Code Explorer
- Linear Sidebar
```

### 2. Markdown Editor (Center)
```
功能：
- Split view: 左邊編輯，右邊即時預覽
- 語法高亮（Markdown）
- 自動儲存（debounce 2秒）
- 儲存時自動 POST /api/files/:path

技術：
- CodeMirror 6
- Markdown preview: react-markdown

狀態指示：
- 🟢 Saved
- 🟡 Saving...
- 🔴 Error
```

### 3. Timeline Panel (Right Sidebar)
```
功能：
- 顯示檔案的版本歷史（GET /api/commits）
- 每筆 commit 顯示：
  - 👤 Icon（人類）或 🤖 Icon（AI）
  - 時間（相對時間，如 "5 分鐘前"）
  - Author name
  - Commit message
  - [View] button → 顯示 diff
  - [Revert] button → 還原到這個版本

設計：
- 類似 GitHub commit history
- 時間軸視覺化（垂直線串連）
```

### 4. Diff Viewer (Modal)
```
功能：
- 點擊 Timeline 的 [View] 後彈出
- 顯示 unified diff（紅綠標示）
- 可以關閉回到編輯器

技術：
- react-diff-viewer
```

---

## 🔄 State Management (Veda)

### Global State (Zustand)
```typescript
interface AppState {
  // Files
  files: File[];
  currentFile: File | null;

  // Commits
  commits: Commit[];

  // UI
  isSaving: boolean;
  error: string | null;

  // Actions
  loadFiles: () => Promise<void>;
  loadFile: (path: string) => Promise<void>;
  saveFile: (path: string, content: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  loadCommits: (path?: string) => Promise<void>;
  revertCommit: (sha: string) => Promise<void>;
}
```

---

## 🛠️ Iris 負責項目

### 1. Backend API (Hono)
- ✅ 實作所有 API endpoints
- ✅ Clerk authentication middleware
- ✅ CORS 設定（允許 Vercel frontend）
- ✅ Error handling（統一格式）

### 2. Git Service
- ✅ 自動 commit on save
- ✅ Commit metadata tagging（human/ai）
- ✅ 自動生成 commit message（基於 diff）
- ✅ History 查詢
- ✅ Diff 生成
- ✅ Revert 功能

### 3. CLI Tool
- ✅ `collab` 命令列工具
- ✅ 所有操作自動標記為 `type: ai`
- ✅ 完整實作：init, list, read, write, status, history

### 4. Database Schema (SQLite)
```sql
CREATE TABLE files (
  id INTEGER PRIMARY KEY,
  path TEXT UNIQUE NOT NULL,
  content TEXT,
  author TEXT,
  modified DATETIME,
  commit_sha TEXT
);

CREATE TABLE commits (
  sha TEXT PRIMARY KEY,
  author TEXT NOT NULL,
  type TEXT CHECK(type IN ('ai', 'human')),
  message TEXT,
  timestamp DATETIME,
  files_changed TEXT  -- JSON array
);
```

---

## 📦 Deliverables

### Veda
- [ ] `frontend/` 完整 React app
- [ ] 檔案列表 UI
- [ ] Markdown 編輯器（CodeMirror）
- [ ] 時間軸面板
- [ ] Diff viewer modal
- [ ] Vercel 部署設定

### Iris
- [ ] `backend/` Hono API server
- [ ] `cli/` CLI tool（可執行檔）
- [ ] Git service 完整實作
- [ ] API 文檔（OpenAPI spec）
- [ ] SQLite schema
- [ ] Vercel serverless 部署

---

## 🚀 Integration Plan

### Step 1: Iris 先行（Backend ready）
1. 完成 Backend API
2. 完成 CLI tool
3. 提供 API 文檔給 Veda
4. 部署到 Vercel（提供 API URL）

### Step 2: Veda 開發（Frontend）
1. 基於 API 文檔開發 UI
2. Mock API responses（如果 backend 未完成）
3. 整合真實 API
4. 部署到 Vercel

### Step 3: 整合測試
1. Lman 測試：Web UI 編輯 → CLI 讀取
2. Lman 測試：CLI 寫入 → Web UI 顯示
3. 驗證 Git commits 正確標記
4. 驗證時間軸正確顯示

---

## 🐛 Known Issues & Edge Cases

1. **衝突處理**：MVP 不處理 merge conflict（last write wins）
2. **大檔案**：>1MB 的檔案可能影響效能（Phase 2 處理）
3. **即時同步**：目前需手動 refresh（Phase 2 加 WebSocket）
4. **批註功能**：Phase 2 才加入

---

## 📞 Communication Protocol

### Lman 作為中介
```
Flow:
1. Veda 需要 Iris 協助 → Lman 截圖/描述給 Iris
2. Iris 需要 Veda 協助 → Lman 傳遞 prompt 給 Veda
3. Bug/問題 → Lman 截圖 + 錯誤訊息傳遞
```

### 交接文件更新
- Veda 或 Iris 如有 API 變更，更新此文件
- Lman 負責同步兩邊的最新版本

---

## ⏱️ Timeline

**Weekend (Day 1-2)**:
- Iris: Backend API 50% + CLI tool basic
- Veda: UI mockup + 檔案列表 30%

**Week 1 (Day 3-4)**:
- Iris: Git service + Auth 80%
- Veda: 編輯器 + 時間軸 70%

**Week 1 (Day 5-7)**:
- 整合測試 + bug fix
- 部署 + 文檔

---

## 📚 References

- [PRD 完整文件](/Users/lman/Dropbox/PKM-Vault/1-Projects/Active/AI-Collab-Platform-PRD.md)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Hono Framework](https://hono.dev/)
- [CodeMirror 6](https://codemirror.net/)

---

**Veda**: 開始 UI 開發時，請先回報「收到」，然後開始 mockup 設計。

**Iris**: Backend API 完成後，提供 Swagger/OpenAPI 文檔給 Veda。

---

*Last Updated: 2025-12-05 by Iris*
