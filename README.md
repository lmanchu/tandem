# Tandem

> The first workspace designed for humans and AI to work together.

**Tagline**: "Work in tandem with AI"

---

## 🎯 Vision

在 AI 時代，協作不再只是「人與人」，而是「人 + AI 團隊」。現有工具（Google Docs、Notion、Obsidian）都是為人類設計，無法原生支援 AI 協作。

我們打造第一個 **AI-Native** 的協作平台：
- 人類透過 **Web UI** 編輯 Markdown
- AI（如 Claude Code）透過 **CLI** 編輯
- 完整的 **Git 版本控制**
- 清楚標記「誰改的」（👤 人類 vs 🤖 AI）

---

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│      Web UI (React + shadcn)        │
│  - 檔案列表                          │
│  - Markdown 編輯器                   │
│  - 時間軸（版本歷史）                 │
└─────────────────────────────────────┘
              ↕ (REST API)
┌─────────────────────────────────────┐
│    Backend API (Hono + Bun)         │
│  - /api/files (CRUD)                │
│  - /api/commits (history)           │
│  - /api/auth (Clerk)                │
└─────────────────────────────────────┘
              ↕
┌─────────────────────────────────────┐
│      Git Service (simple-git)       │
│  - Auto commit on save              │
│  - Metadata tagging (human/AI)      │
│  - History & diff                   │
└─────────────────────────────────────┘
              ↕ (HTTP API)
┌─────────────────────────────────────┐
│         CLI Tool (Bun)              │
│  - tandem read/write/list           │
│  - Auto tag as AI commit            │
└─────────────────────────────────────┘
```

---

## 📦 Project Structure

```
tandem/
├── frontend/          # React + shadcn/ui (Veda)
├── backend/           # Hono + Bun (Iris)
├── cli/               # CLI tool (Iris)
├── docs/              # Documentation
│   ├── PRD.md
│   └── API.md
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ / Bun
- Git

### Frontend (Web UI)
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

### Backend (API)
```bash
cd backend
bun install
bun run dev
# API running on http://localhost:3000
```

### CLI Tool
```bash
cd cli
bun install
bun link

# Usage
tandem init
tandem list
tandem read <file>
tandem write <file> <content>
```

---

## 🎨 Features

### MVP (Week 1)
- ✅ Web UI（檔案列表 + Markdown 編輯器 + 時間軸）
- ✅ CLI Tool（read/write/list）
- ✅ Git 版本控制（自動 commit）
- ✅ AI 標記（區分人類 vs AI commit）
- ✅ Diff viewer

### Phase 2
- Email 邀請系統
- 批註功能（inline comments）
- 即時協作（WebSocket）
- 權限管理

### Phase 3
- Obsidian plugin
- VS Code extension
- Mobile app
- Self-hosted option

---

## 👥 Team

- **Veda** (Antigravity): Frontend (React + shadcn/ui)
- **Iris** (Claude Code): Backend (Hono + Bun) + CLI

---

## 📚 Documentation

- [PRD](docs/PRD.md) - Product Requirements Document
- [API Docs](docs/API.md) - API Specification
- [Handoff](docs/HANDOFF.md) - Veda-Iris 交接文件

---

## 🛠️ Tech Stack

**Frontend**:
- React 19 + Vite
- shadcn/ui + Tailwind CSS
- CodeMirror 6
- Zustand

**Backend**:
- Bun
- Hono
- simple-git
- Clerk (Auth)
- SQLite

**Deployment**:
- Vercel

---

## 📄 License

MIT

---

**Status**: 🚧 Weekend Side Project (MVP in progress)

*Last Updated: 2025-12-05*
