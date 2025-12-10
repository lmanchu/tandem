# Changelog

All notable changes to Tandem will be documented in this file.

## [1.4.0] - 2025-12-10

### Added
- **Export/Import Menu** - Comprehensive document export and import functionality
  - Export to Markdown (.md) with TurndownService conversion
  - Export to HTML with styled formatting
  - Export to PDF via print dialog
  - Import Markdown files (.md, .markdown, .txt)
- **Share Menu** - Share documents with customizable access
  - Generate shareable links with view or edit permissions
  - Copy link to clipboard with visual feedback
  - Native Web Share API integration for mobile devices
  - Public/Private toggle with visual indicators
- **@ Mentions** - Tag collaborators in documents
  - Type @ to trigger user suggestions
  - Styled mention badges with user colors
  - Backspace to convert mention back to text

### Changed
- Updated Toolbar with Export and Share menu buttons
- Enhanced UI with Chinese localization for export options

## [1.3.0] - 2025-12-08

### Added
- **MCP Server Integration** - AI tools can now directly interact with Tandem documents
  - `tandem_list` - List all documents
  - `tandem_read` - Read document content (returns HTML)
  - `tandem_write` - Write/update document content
  - `tandem_create` - Create new documents
  - `tandem_delete` - Delete documents
- **Content API** - REST endpoints for document content operations
  - `GET /api/documents/:id/content` - Read document as HTML
  - `PUT /api/documents/:id/content` - Write HTML to document
  - Automatic HTML ↔ Yjs CRDT conversion
- **Copy MCP Link** - Copy document ID for AI tool integration
  - New copy button in file browser (green icon)
  - Copies `tandem://doc/{documentId}` format
  - Similar to Obsidian's `obsidian://` URI scheme
- **Password Authentication** - Secure access to Tandem
  - Environment variable `TANDEM_PASSWORD` for server-side auth
  - Token-based authentication for API requests
  - Login gate for web interface

### Technical
- MCP server built with `@modelcontextprotocol/sdk`
- Supports Claude Code and other MCP-compatible AI tools
- Launchd services for automatic server/tunnel startup

## [1.2.0] - 2025-12-07

### Added
- **Table Support** - Insert and edit tables in documents
  - 3x3 default table with header row
  - Resizable columns
  - Tab/Shift+Tab navigation between cells
  - Styled borders and header backgrounds
- **Code Syntax Highlighting** - Enhanced code blocks with lowlight
  - Support for 35+ programming languages (JavaScript, TypeScript, Python, etc.)
  - Beautiful dark theme syntax colors
  - Automatic language detection
- **Keyboard Shortcuts Modal** - View all available shortcuts
  - Cmd+/ to open shortcuts help
  - Organized by category (formatting, paragraphs, tables, editing)
  - Platform-aware key display (Cmd vs Ctrl)
- **Search and Replace** - Find and replace text in documents
  - Cmd+F to open search panel
  - Case-sensitive search toggle
  - Navigate matches with Enter/Shift+Enter
  - Replace single or replace all

### Changed
- Updated toolbar with Table, Search, and Keyboard buttons
- Enhanced TandemEditor with table and code block extensions
- Added comprehensive CSS styles for tables and syntax highlighting

## [1.1.0] - 2025-12-07

### Added
- **AI Assistant** - Multi-provider AI assistant supporting:
  - Claude (Anthropic) API with streaming
  - Gemini (Google) API with streaming
  - Ollama local models (default: qwen3-vl:4b)
  - Quick actions: Summarize, Translate, Improve, Expand
  - Settings modal for API key configuration and model selection
  - Provider switching in chat interface
  - Insert AI responses directly to editor
- **Invite Links** - Share documents via Cloudflare Tunnel URLs
  - Generate shareable links from file browser
  - Copy to clipboard functionality
- **Version History** - View and restore document versions
  - Timestamp-based history tracking
  - Preview and restore capabilities
- **Image Upload** - Support for images in documents
  - Drag and drop image insertion
  - Paste images from clipboard
  - Toolbar button for image upload
- **Collaborator Display** - Show online collaborators in toolbar
  - Avatar display with user colors
  - Online count indicator

### Changed
- Updated toolbar with AI assistant toggle button
- Enhanced TandemEditor with AI integration
- Improved file browser with invite link generation

## [1.0.0] - Initial Release

### Added
- Real-time collaborative editing with Yjs and Hocuspocus
- Track Changes with accept/reject functionality
- Rich text editing with TipTap
- Dark mode support
- Electron desktop application
- Markdown import/export
- File browser and document management
