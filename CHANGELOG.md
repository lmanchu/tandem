# Changelog

All notable changes to Tandem will be documented in this file.

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
