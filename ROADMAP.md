# Tandem Roadmap

Future improvements and features planned for Tandem.

## Priority 1: Security

### Authentication
- [ ] Add login/registration system
- [ ] Session management with JWT or cookies
- [ ] Protect document access with authentication
- [ ] Share documents with specific users

### Rate Limiting
- [ ] Implement request rate limiting on API endpoints
- [ ] Prevent abuse on public tunnel endpoint

### CORS Hardening
- [ ] Restrict API access to allowed origins only

## Priority 2: Infrastructure & Reliability

### Health Check Endpoint
- [ ] Add `/health` and `/api/health` endpoints
- [ ] Return server status, uptime, and connection count
- [ ] Enable external monitoring integration

### Log Rotation
- [ ] Implement log file rotation to prevent disk filling
- [ ] Configure max log size and retention period
- [ ] Add log levels (debug, info, warn, error)

### Crash Notifications
- [ ] Send macOS notification when service restarts
- [ ] Optional email/webhook alerts for downtime

### Resource Limits
- [ ] Monitor memory usage
- [ ] Graceful shutdown on memory pressure
- [ ] Connection limits per client

## Priority 3: Features

### PWA Support
- [ ] Add web app manifest
- [ ] Implement service worker for offline capability
- [ ] Enable "Add to Home Screen" functionality
- [ ] Cache static assets for faster loading

### Mobile Optimization
- [ ] Responsive toolbar for mobile screens
- [ ] Touch-friendly editing controls
- [ ] Mobile-optimized keyboard shortcuts

### Document Export
- [ ] Export to PDF
- [ ] Export to Word (.docx)
- [ ] Export to HTML
- [ ] Export to plain Markdown

### Document Backup
- [ ] Auto-backup to local storage
- [ ] Optional cloud backup (iCloud, Dropbox, Google Drive)
- [ ] Scheduled backup intervals

## Priority 4: Developer Experience

### Monitoring Dashboard
- [ ] Simple status page showing service health
- [ ] Active connections and document count
- [ ] Recent activity log

### CI/CD
- [ ] GitHub Actions for automated testing
- [ ] Automated builds on push
- [ ] Release automation

---

## Completed

### v1.5.0 (2025-12-10)
- [x] Trash/Recycle bin (soft delete with recovery)
- [x] Server-side image upload (multer)
- [x] Global full-text search
- [x] Document tagging and filtering
- [x] Offline indicator
- [x] Version history toolbar button

### v1.4.0 (2025-12-10)
- [x] Export to Markdown, HTML, PDF
- [x] Import Markdown files
- [x] Share menu with public/private toggle
- [x] @ Mentions for collaborators

### v1.3.0 (2025-12-08)
- [x] MCP Server integration for AI tools
- [x] Password authentication
- [x] Content API for document read/write

### v1.2.0 (2025-12-07)
- [x] Table support with resizable columns
- [x] Code syntax highlighting (35+ languages)
- [x] Keyboard shortcuts modal (Cmd+/)
- [x] Search and replace (Cmd+F)

### v1.1.0 (2025-12-07)
- [x] AI Assistant (Claude, Gemini, Ollama)
- [x] Invite links via Cloudflare Tunnel
- [x] Version history
- [x] Image upload
- [x] Collaborator display

### v1.0.0
- [x] Real-time collaborative editing
- [x] Track Changes
- [x] Rich text editing
- [x] Dark mode
- [x] Electron desktop app
- [x] Markdown import/export

### Infrastructure
- [x] Launchd services for auto-restart (2025-12-07)
- [x] Cloudflare Tunnel for public access
