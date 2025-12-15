# Tandem Roadmap

**Vision:** AI Native Google Docs → AI Native Task Management → AI Native Slack

---

## Phase 1: Multi-Agent Collaboration (Current Focus)

The core thesis: **every user brings their own AI agent to the same document.**

### Per-User Agent Profiles
- [ ] Agent profile system (role, style, expertise per user)
- [ ] Agent profiles persist across documents
- [ ] Visible indicator: "which agents are in this doc"
- [ ] Privacy: others can request your agent's help, but can't modify your profile

### Agent Interaction Modes
- [ ] **Inline:** Select text → right-click → "Ask my PM agent to review"
- [ ] **Comment:** `@BackendAgent check if this is implementable`
- [ ] **Task list:** Sidebar showing pending agent tasks

### AI as Participant (not External Tool)
- [ ] AI suggestions appear as comments/track changes
- [ ] Human always decides what to accept
- [ ] Full audit trail of AI contributions
- [ ] "Agent authored" badge on changes

### Research Reference
- [Academic prototype](https://arxiv.org/abs/2509.11826) demonstrating multi-user + multi-agent collaborative editing

---

## Phase 2: AI Native Task Management

Extract actionable items from documents into a task layer.

### Document → Tasks
- [ ] AI extracts action items from PRD/meeting notes
- [ ] Tasks linked back to source paragraph
- [ ] Assignee = user or user's agent

### Agent Task Execution
- [ ] Agents can work on assigned tasks autonomously
- [ ] Results submitted as document edits (track changes)
- [ ] Human reviews and approves

---

## Phase 3: AI Native Communication (Future)

Add communication layer to become AI Native Slack.

### Threaded Discussions
- [ ] Comment threads with real-time sync
- [ ] @mention users or agents
- [ ] Agent can participate in discussions

### Notifications
- [ ] Push notifications for mentions
- [ ] Agent activity summaries
- [ ] Daily digest of document changes

---

## Infrastructure & Security

### Priority 1: Security
- [ ] User authentication (login/registration)
- [ ] Per-document permissions (owner, editor, viewer)
- [ ] Rate limiting on API endpoints
- [ ] CORS hardening

### Priority 2: Reliability
- [ ] Health check endpoints (`/health`, `/api/health`)
- [ ] Log rotation
- [ ] Crash notifications (macOS notification, webhook)
- [ ] Memory usage monitoring

### Priority 3: Developer Experience
- [ ] Monitoring dashboard
- [ ] CI/CD (GitHub Actions)
- [ ] Automated testing

---

## Completed

### v1.8.x (2025-12-15)
- [x] Pinyin document IDs for Chinese titles
- [x] Y.js bug fixes (nested lists, tables, content duplication, links)
- [x] Content overwrite protection
- [x] Large file sync (`tandem_write_from_file`)
- [x] Track Changes suggestions (`tandem_suggest_changes`)

### v1.6.0 (2025-12-13)
- [x] Project sync (sync entire folder)
- [x] Y.js/TipTap compatibility fixes

### v1.5.0 (2025-12-10)
- [x] Trash/Recycle bin
- [x] Server-side image upload
- [x] Global full-text search
- [x] Version history toolbar button

### v1.4.0 (2025-12-10)
- [x] Export to Markdown, HTML, PDF
- [x] Import Markdown files
- [x] Share menu with public/private toggle
- [x] @ Mentions

### v1.3.0 (2025-12-08)
- [x] MCP Server integration
- [x] Password authentication
- [x] Content API

### v1.2.0 (2025-12-07)
- [x] Table support
- [x] Code syntax highlighting
- [x] Keyboard shortcuts modal
- [x] Search and replace

### v1.1.0 (2025-12-07)
- [x] AI Assistant (Claude, Gemini, Ollama)
- [x] Invite links via Cloudflare Tunnel
- [x] Version history
- [x] Image upload
- [x] Collaborator display

### v1.0.0
- [x] Real-time collaborative editing (Yjs)
- [x] Track Changes
- [x] Rich text editing (TipTap)
- [x] Dark mode
- [x] Electron desktop app

### Infrastructure
- [x] Launchd services for auto-restart
- [x] Cloudflare Tunnel for public access
