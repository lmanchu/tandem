# Tandem

**AI Native Google Docs** — Real-time collaborative editing where every user brings their own AI agent.

**Live Demo:** https://tandem.irisgo.xyz

---

## Vision

We believe the future of collaborative documents is **multi-user + multi-agent**:

- Each person has their own **personal AI agent** (with unique role, style, preferences)
- Multiple agents work on the **same document simultaneously**
- AI suggestions appear as **comments/track changes**, not direct edits — humans stay in control
- All AI interactions happen **within the document context**, not in separate tools

This isn't science fiction — [academic prototypes](https://arxiv.org/abs/2509.11826) already demonstrate this model. Tandem is building toward making it production-ready.

### Roadmap

```
Tandem (now)          →  AI Native Task Management  →  AI Native Slack
collaborative docs       docs + actionable tasks       + communication layer
```

---

## Current Features

### Collaboration
- **Real-time Co-editing** — Multiple users edit simultaneously (Yjs CRDT)
- **Track Changes** — Accept/reject changes with visual diff highlighting
- **@ Mentions** — Tag and notify collaborators
- **Version History** — View and restore previous versions
- **Document Sharing** — Public/private links with view or edit permissions

### Rich Editing
- **Rich Text** — Tables, code blocks (35+ languages), images
- **Search & Replace** — Find and replace across document
- **Export/Import** — Markdown, HTML, PDF support
- **Dark Mode** — Full dark theme

### AI Integration
- **AI Assistant** — Multi-provider support (Claude, Gemini, Ollama)
- **MCP Server** — Let any AI tool (Claude Code, etc.) read/write documents directly
- **Per-document AI context** — AI operates within document, not external

---

## MCP Integration (AI Tools)

Tandem's MCP (Model Context Protocol) server allows AI tools to directly interact with your documents.

### Quick Setup (Claude Code)

```bash
# Add Tandem MCP to Claude Code
claude mcp add tandem \
  -s user \
  -e TANDEM_PASSWORD=your_password \
  -- npx -y @tandem-hq/mcp-server-tandem \
    --base-url https://tandem.irisgo.xyz
```

### Available Tools

| Tool | Description |
|------|-------------|
| `tandem_list` | List all documents |
| `tandem_read` | Read document content (HTML) |
| `tandem_write` | Write/update document |
| `tandem_create` | Create new document |
| `tandem_delete` | Delete document |
| `tandem_sync_project` | Sync entire folder to Tandem |
| `tandem_write_from_file` | Sync large local file directly |
| `tandem_suggest_changes` | Submit changes as Track Changes |

### Document Links

Copy `tandem://doc/{documentId}` links from the UI and paste into Claude Code:

```
User: Read tandem://doc/my-prd
Claude: [Uses tandem_read to fetch content]
```

---

## Development

### Prerequisites
- Node.js 20+ or 22.12+

### Quick Start

```bash
npm install
npm run dev      # Development
npm run build    # Production build
npm run start    # Production server
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `TANDEM_PASSWORD` | Authentication password |
| `PORT` | Server port (default: 3000) |

---

## Tech Stack

- **Frontend:** React, TipTap, Tailwind CSS, Vite
- **Backend:** Express, Hocuspocus, Yjs (CRDT)
- **Desktop:** Electron
- **AI:** Claude API, Gemini API, Ollama
- **MCP:** @modelcontextprotocol/sdk

---

## Why "AI Native"?

Traditional approach:
```
User → External AI tool → Copy/paste back to doc
```

Tandem approach:
```
User + Personal Agent → Same document ← Other Users + Their Agents
                              ↓
                    AI suggestions as comments
                    Human decides what to accept
```

The key insight: **AI should be a participant in the collaboration, not a separate tool.**

---

## License

MIT
