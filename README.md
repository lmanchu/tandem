# Tandem

Real-time collaborative document editor with AI integration and MCP support.

**Live Demo:** https://tandem.irisgo.xyz

## Features

- **Real-time Collaboration** - Multiple users can edit documents simultaneously using Yjs CRDT
- **Track Changes** - Accept/reject changes with visual diff highlighting
- **Rich Text Editing** - Tables, code blocks, images, and more with TipTap
- **AI Assistant** - Multi-provider AI (Claude, Gemini, Ollama) for document assistance
- **Version History** - View and restore previous document versions
- **MCP Integration** - Let AI tools directly read/write Tandem documents
- **Export/Import** - Export to Markdown, HTML, or PDF; import Markdown files
- **Document Sharing** - Generate shareable links with view or edit permissions
- **@ Mentions** - Tag and notify collaborators with @ mentions
- **Dark Mode** - Full dark theme support
- **Electron App** - Desktop application for macOS

## MCP Integration (Claude Code / AI Tools)

Tandem includes an MCP (Model Context Protocol) server that allows AI tools like Claude Code to directly interact with your documents.

### Setup for Claude Code

1. **Build the MCP server:**
   ```bash
   cd mcp
   npm install
   npm run build
   ```

2. **Add to Claude Code:**
   ```bash
   claude mcp add tandem \
     -s user \
     -e TANDEM_PASSWORD=your_password \
     -- node /path/to/tandem-3.0/mcp/dist/tandem-mcp.js
   ```

3. **Restart Claude Code** to load the MCP server.

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `tandem_list` | List all documents |
| `tandem_read` | Read document content (returns HTML) |
| `tandem_write` | Write/update document content |
| `tandem_create` | Create a new document |
| `tandem_delete` | Delete a document |

### Copy Document Link

In the Tandem web UI, hover over any document and click the green **Copy** button to copy a `tandem://doc/{documentId}` link. Paste this into Claude Code to reference the document.

Example workflow:
```
User: Read tandem://doc/my-meeting-notes
Claude: [Uses tandem_read to fetch the document content]
```

## Development

### Prerequisites

- Node.js 20+ or 22.12+
- npm

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `TANDEM_PASSWORD` | Password for authentication |
| `PORT` | Server port (default: 3000) |

## Tech Stack

- **Frontend:** React, TipTap, Tailwind CSS, Vite
- **Backend:** Express, Hocuspocus, Yjs
- **Desktop:** Electron
- **AI:** Claude API, Gemini API, Ollama
- **MCP:** @modelcontextprotocol/sdk

## License

MIT
