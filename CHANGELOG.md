# Changelog

All notable changes to Tandem will be documented in this file.

## [1.10.0] - 2026-01-02

### Added
- **tandem_write format parameter** - Explicitly specify content format
  - `format: "markdown"` - Force markdown parsing
  - `format: "html"` - Use content as-is
  - `format: "auto"` - Auto-detect (default, improved heuristics)
- **tandem_write append mode** - Add content to end of document
  - `mode: "append"` - Append to existing content
  - `mode: "replace"` - Overwrite content (default)

### Improved
- **Format auto-detection** - Better heuristics for markdown vs HTML
  - Detects markdown headings (`# `), lists (`- `, `1. `), code blocks (```)
  - Falls back to HTML only if content starts with `<tag>`

### Technical
- `mcp/tandem-mcp.ts`: Added `format` and `mode` parameters to `tandem_write`
- `server/index.ts`: Updated PUT /api/documents/:id/content to accept `format` parameter

## [1.9.0] - 2026-01-02

### Added
- **tandem_search MCP tool** - Search across all documents with context snippets
  - Returns matching documents with highlighted context around search terms
  - Limits to 5 matches per document, 20 total results
  - Minimum 2-character query required

### Changed
- **npm package renamed** - `tandem-mcp` → `@tandem-hq/mcp-server-tandem`
  - Published to npm under `@tandem-hq` organization
  - Install: `npx -y @tandem-hq/mcp-server-tandem`

### Technical
- `mcp/tandem-mcp.ts`: Added `tandem_search` tool handler calling `/api/search` endpoint
- `mcp/package.json`: Renamed package and updated bin command

## [1.8.4] - 2025-12-15

### Added
- **Pinyin Document IDs** - Chinese characters in document titles now convert to pinyin for readable ASCII IDs
  - `測試/產品企劃書` → `ceshi-chanpinqihuashu`
  - `Hermes/技術架構` → `Hermes-jishujiagou`
  - Uses `pinyin-pro` library for accurate conversion
  - IDs remain URL-safe and filesystem-compatible
  - Original Chinese title preserved in `title` field for display

### Technical
- `server/index.ts`: Added `generateDocumentId()` function with pinyin conversion
- Added `pinyin-pro` dependency for Chinese-to-pinyin conversion

## [1.8.3] - 2025-12-15

### Fixed
- **Link text display** - URLs in markdown now display as plain text
  - Links with `<a href="...">` tags were being lost during Y.js sync
  - Workaround: Skip link mark formatting, treat URLs as plain text
  - Affects: competitor analysis links, technical reference links, etc.

- **Y.js element ordering** - Fixed markdown-to-Y.js conversion for inline marks
  - Issue: Y.js requires elements to be added to document tree BEFORE insert/format operations
  - Solution: Push elements to parent first, then populate XmlText content
  - Added `populateXmlTextFromSegments()` function for correct operation order

- **Content overwrite protection** - Prevent browser cache from overwriting server content
  - Added size comparison check in `onStoreDocument`
  - If new state is <50% of existing state size, block the save
  - Prevents empty browser cache from overwriting MCP-synced content

### Technical
- `server/index.ts`: Refactored `buildYjsFromTokensV2` to push elements before populating
- `server/index.ts`: Added link tag skip in `extractTextWithMarks`
- `server/index.ts`: Added content protection in `onStoreDocument`

## [1.8.2] - 2025-12-15

### Fixed
- **Content duplication bug** - Fixed Y.js CRDT merge causing document content to appear twice
  - Issue: When browser reconnects with cached Y.js state after API content update, Y.js merges both states as separate operations, resulting in duplicated content
  - Root cause: Y.js treats browser cache and server file as different "clients" with different internal IDs
  - Solution: Clear existing fragment content in `onLoadDocument` before applying stored state to prevent CRDT merge duplication

### Technical
- `server/index.ts`: Added fragment clearing logic in `onLoadDocument` to handle browser cache conflicts

## [1.8.1] - 2025-12-15

### Fixed
- **Table rendering** - Fixed markdown tables not appearing in Tandem
  - Issue: `marked` produces `<thead>` and `<tbody>` wrapper tags that TipTap doesn't understand
  - Solution: Skip `thead`/`tbody` wrappers and recurse directly into their children
  - Also: `tableHeader` and `tableCell` now properly wrap content in paragraphs (like `listItem`)

### Technical
- `server/index.ts`: Added special handling to skip `thead`/`tbody` tags
- `server/index.ts`: Extended `listItem` handling to also cover `tableCell` and `tableHeader`

## [1.8.0] - 2025-12-15

### Fixed
- **Nested list rendering** - Fixed markdown-to-Yjs conversion where nested lists (numbered items with sub-bullets) were losing their content
  - Issue: `buildYjsFromTokensV2` treated `listItem` as a leaf block, ignoring nested `ul/ol` elements
  - Solution: Special handling for `listItem` to detect and recurse into block children (`p`, `ul`, `ol`, etc.)
- **List number/bullet display** - Added CSS styles for `ul` and `ol` elements in the editor
  - Tailwind CSS resets had removed `list-style-type`, causing list markers to be invisible
  - Added styles for nested lists with appropriate bullet types (disc → circle → square)

### Technical
- `server/index.ts` (lines 1182-1204): Refactored `listItem` handling in `buildYjsFromTokensV2`
- `src/index.css`: Added `.ProseMirror ul`, `.ProseMirror ol`, and nested list styles

## [1.7.0] - 2025-12-14

### Added
- **Large File Sync** - `tandem_write_from_file` MCP tool for syncing large local files directly
  - Bypasses message size limits by reading from local filesystem
  - Ideal for syncing large markdown documents from Obsidian

### Improved
- **Track Changes Workflow** - `tandem_suggest_changes` for bidirectional sync
  - Submit local changes as Track Changes suggestions
  - Changes appear for human review before merging

## [1.6.0] - 2025-12-13

### Added
- **MCP Project Sync Tools** - Sync entire folders of markdown files to Tandem
  - `tandem_sync_project` - Sync a local folder of markdown files as a project
  - `tandem_list_project` - List all documents in a specific project
  - Documents named with "ProjectName/filename" convention

### Fixed
- **Y.js/TipTap Compatibility** - Critical fix for REST API content sync
  - Inline marks (bold, italic, code, links) now properly stored as XmlText attributes
  - Fixed HTML-to-Y.js conversion to match TipTap's ProseMirror schema
  - Documents synced via API now render correctly in the editor
  - Eliminated "Method not implemented" errors from Y.js updates
- **HTML Output from Y.js** - Fixed `yXmlFragmentToHtml` to use delta-based conversion
  - Marks properly converted back to HTML tags (`<strong>`, `<em>`, etc.)
  - No more literal `<bold>` text in output

### Technical
- Added `extractTextWithMarks()` for proper inline mark extraction
- Added `buildXmlTextFromSegments()` to build XmlText with TipTap-compatible marks
- Added `xmlTextToHtml()` for delta-based HTML conversion
- Inline marks stored as `{bold: true, italic: true}` attributes on XmlText
- Block elements use TipTap node names (paragraph, heading, bulletList, etc.)

## [1.5.0] - 2025-12-10

### Added
- **Trash/Recycle Bin** - Soft delete with recovery capability
  - Deleted documents move to trash instead of permanent deletion
  - TrashBrowser modal to view and manage trashed documents
  - Restore single or multiple documents from trash
  - Permanent delete option for individual documents
  - Empty trash to permanently remove all trashed documents
  - Trash button in file browser sidebar header
- **Server-side Image Upload** - Persistent image storage
  - Images uploaded to server's `data/uploads` directory
  - `POST /api/upload` endpoint with multer for file handling
  - 10MB file size limit, supports JPEG, PNG, GIF, WebP, SVG
  - Base64 fallback when server upload fails
  - Modified paste, drop, and toolbar image upload handlers
- **Version History UI Integration** - Access version history from toolbar
  - History button added to editor toolbar
  - Quick access to document versions while editing

### Changed
- Delete confirmation now indicates documents move to trash
- Updated file browser with trash icon button
- Image uploads use server storage with unique filenames

### Technical
- Added multer dependency for multipart form data handling
- Trash API endpoints: `GET /api/trash`, `POST /api/trash/:id/restore`, `DELETE /api/trash/:id`, `DELETE /api/trash`
- Trash directory created automatically on server startup

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
