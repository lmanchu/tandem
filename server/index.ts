import { Hocuspocus } from '@hocuspocus/server';
import express from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import * as Y from 'yjs';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory to store .track files
const DATA_DIR = process.env.TANDEM_DATA_DIR || './data';
const PORT = parseInt(process.env.PORT || '3000', 10);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const AUTH_PASSWORD = process.env.TANDEM_PASSWORD || ''; // Empty = no auth required

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getTrackFilePath(documentName: string): string {
  // Sanitize document name for file system
  const safeName = documentName.replace(/[^a-zA-Z0-9-_]/g, '_');
  return path.join(DATA_DIR, `${safeName}.track`);
}

interface TrackFileData {
  version: '1.0';
  schema: 'tandem-track-v1';
  documentId: string;
  title?: string;
  updatedAt: string;
  createdAt?: string;
  changes: unknown[];
  yDocState: number[];
}

interface DocumentInfo {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  changesCount: number;
}

interface VersionInfo {
  id: string;
  timestamp: string;
  size: number;
}

const VERSIONS_DIR = path.join(DATA_DIR, 'versions');

// Ensure versions directory exists
if (!fs.existsSync(VERSIONS_DIR)) {
  fs.mkdirSync(VERSIONS_DIR, { recursive: true });
}

function getVersionsDir(documentName: string): string {
  const safeName = documentName.replace(/[^a-zA-Z0-9-_]/g, '_');
  const dir = path.join(VERSIONS_DIR, safeName);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function saveVersion(documentName: string, yDocState: number[]): string {
  const versionsDir = getVersionsDir(documentName);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const versionId = `v_${timestamp}`;
  const versionPath = path.join(versionsDir, `${versionId}.json`);

  // Only keep last 50 versions per document
  const existingVersions = fs.readdirSync(versionsDir).filter(f => f.endsWith('.json')).sort();
  if (existingVersions.length >= 50) {
    const toDelete = existingVersions.slice(0, existingVersions.length - 49);
    toDelete.forEach(f => fs.unlinkSync(path.join(versionsDir, f)));
  }

  fs.writeFileSync(versionPath, JSON.stringify({ yDocState, timestamp: new Date().toISOString() }));
  return versionId;
}

// ==================== Express App ====================

const app = express();
app.use(cors());
app.use(express.json());

// Simple token-based auth (token = base64 of password)
function generateToken(password: string): string {
  return Buffer.from(password).toString('base64');
}

function verifyToken(token: string): boolean {
  if (!AUTH_PASSWORD) return true; // No password set = no auth required
  return token === generateToken(AUTH_PASSWORD);
}

// Auth check middleware
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!AUTH_PASSWORD) return next(); // No password set = skip auth

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', requiresAuth: true });
  }

  const token = authHeader.substring(7);
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Invalid token', requiresAuth: true });
  }

  next();
}

// Auth endpoints
app.get('/api/auth/status', (_req, res) => {
  res.json({ requiresAuth: !!AUTH_PASSWORD });
});

app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;

  if (!AUTH_PASSWORD) {
    return res.json({ success: true, token: '' });
  }

  if (password === AUTH_PASSWORD) {
    const token = generateToken(password);
    return res.json({ success: true, token });
  }

  res.status(401).json({ success: false, error: 'Invalid password' });
});

// API Routes (protected)
app.get('/api/documents', requireAuth, (_req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.track'));
    const documents: DocumentInfo[] = files.map(file => {
      const filePath = path.join(DATA_DIR, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as TrackFileData;
      return {
        id: data.documentId,
        title: data.title || data.documentId,
        createdAt: data.createdAt || data.updatedAt,
        updatedAt: data.updatedAt,
        changesCount: data.changes?.length || 0,
      };
    });
    res.json(documents);
  } catch (error) {
    console.error('Error listing documents:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

app.post('/api/documents', requireAuth, (req, res) => {
  try {
    const { title } = req.body;
    const id = title?.replace(/[^a-zA-Z0-9-_]/g, '_') || `doc-${Date.now()}`;
    const trackFilePath = getTrackFilePath(id);

    if (fs.existsSync(trackFilePath)) {
      return res.status(409).json({ error: 'Document already exists' });
    }

    const now = new Date().toISOString();
    const trackData: TrackFileData = {
      version: '1.0',
      schema: 'tandem-track-v1',
      documentId: id,
      title: title || id,
      createdAt: now,
      updatedAt: now,
      changes: [],
      yDocState: [],
    };

    fs.writeFileSync(trackFilePath, JSON.stringify(trackData, null, 2));
    console.log(`Document created: ${id}`);

    res.status(201).json({
      id,
      title: trackData.title,
      createdAt: now,
      updatedAt: now,
      changesCount: 0,
    });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

app.get('/api/documents/:id', requireAuth, (req, res) => {
  try {
    const trackFilePath = getTrackFilePath(req.params.id);

    if (!fs.existsSync(trackFilePath)) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const data = JSON.parse(fs.readFileSync(trackFilePath, 'utf-8')) as TrackFileData;
    res.json({
      id: data.documentId,
      title: data.title || data.documentId,
      createdAt: data.createdAt || data.updatedAt,
      updatedAt: data.updatedAt,
      changesCount: data.changes?.length || 0,
    });
  } catch (error) {
    console.error('Error getting document:', error);
    res.status(500).json({ error: 'Failed to get document' });
  }
});

app.patch('/api/documents/:id', requireAuth, (req, res) => {
  try {
    const trackFilePath = getTrackFilePath(req.params.id);

    if (!fs.existsSync(trackFilePath)) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const data = JSON.parse(fs.readFileSync(trackFilePath, 'utf-8')) as TrackFileData;
    if (req.body.title) {
      data.title = req.body.title;
    }
    data.updatedAt = new Date().toISOString();

    fs.writeFileSync(trackFilePath, JSON.stringify(data, null, 2));
    res.json({
      id: data.documentId,
      title: data.title,
      updatedAt: data.updatedAt,
    });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

app.delete('/api/documents/:id', requireAuth, (req, res) => {
  try {
    const trackFilePath = getTrackFilePath(req.params.id);

    if (!fs.existsSync(trackFilePath)) {
      return res.status(404).json({ error: 'Document not found' });
    }

    fs.unlinkSync(trackFilePath);
    console.log(`Document deleted: ${req.params.id}`);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Content API endpoints (for MCP and external tools)
// GET content as HTML
app.get('/api/documents/:id/content', requireAuth, (req, res) => {
  try {
    const trackFilePath = getTrackFilePath(req.params.id);

    if (!fs.existsSync(trackFilePath)) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const data = JSON.parse(fs.readFileSync(trackFilePath, 'utf-8')) as TrackFileData;

    // If no Yjs state, return empty content
    if (!data.yDocState || data.yDocState.length === 0) {
      return res.json({ content: '', format: 'html' });
    }

    // Create Yjs doc and apply state
    const doc = new Y.Doc();
    const state = new Uint8Array(data.yDocState);
    Y.applyUpdate(doc, state);

    // Get prosemirror content from Yjs
    const fragment = doc.getXmlFragment('default');
    const content = yXmlFragmentToHtml(fragment);

    res.json({ content, format: 'html' });
  } catch (error) {
    console.error('Error getting document content:', error);
    res.status(500).json({ error: 'Failed to get document content' });
  }
});

// PUT content (accept HTML or markdown)
app.put('/api/documents/:id/content', requireAuth, (req, res) => {
  try {
    const trackFilePath = getTrackFilePath(req.params.id);

    if (!fs.existsSync(trackFilePath)) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const { content } = req.body;
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Content must be a string' });
    }

    const data = JSON.parse(fs.readFileSync(trackFilePath, 'utf-8')) as TrackFileData;

    // Create new Yjs doc with the HTML content
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment('default');

    // Convert HTML to Yjs XML structure
    htmlToYXmlFragment(content, fragment);

    // Save version before updating
    if (data.yDocState && data.yDocState.length > 0) {
      saveVersion(req.params.id, data.yDocState);
    }

    // Encode new state
    const newState = Y.encodeStateAsUpdate(doc);
    data.yDocState = Array.from(newState);
    data.updatedAt = new Date().toISOString();

    fs.writeFileSync(trackFilePath, JSON.stringify(data, null, 2));
    console.log(`Document content updated via API: ${req.params.id}`);

    res.json({ success: true, message: 'Content updated' });
  } catch (error) {
    console.error('Error updating document content:', error);
    res.status(500).json({ error: 'Failed to update document content' });
  }
});

// Helper: Convert Yjs XmlFragment to HTML
function yXmlFragmentToHtml(fragment: Y.XmlFragment): string {
  let html = '';

  fragment.forEach((item) => {
    if (item instanceof Y.XmlText) {
      html += escapeHtml(item.toString());
    } else if (item instanceof Y.XmlElement) {
      const tagName = item.nodeName.toLowerCase();
      const attrs = item.getAttributes();
      let attrStr = '';

      for (const [key, value] of Object.entries(attrs)) {
        if (value !== undefined && value !== null) {
          attrStr += ` ${key}="${escapeHtml(String(value))}"`;
        }
      }

      const innerHtml = yXmlFragmentToHtml(item);

      // Self-closing tags
      if (['br', 'hr', 'img'].includes(tagName)) {
        html += `<${tagName}${attrStr} />`;
      } else {
        html += `<${tagName}${attrStr}>${innerHtml}</${tagName}>`;
      }
    }
  });

  return html;
}

// Helper: Convert HTML to Yjs XmlFragment
function htmlToYXmlFragment(html: string, fragment: Y.XmlFragment): void {
  // Simple HTML parser for common elements
  // For complex HTML, you might want to use a proper parser

  // Wrap in a div if not already wrapped
  const wrappedHtml = html.trim().startsWith('<') ? html : `<p>${html}</p>`;

  // Parse HTML using a simple regex-based approach
  // This handles basic structure - for production, consider using a proper HTML parser
  const tokens = tokenizeHtml(wrappedHtml);
  buildYjsFromTokens(tokens, fragment);
}

interface HtmlToken {
  type: 'open' | 'close' | 'text' | 'selfclose';
  tag?: string;
  attrs?: Record<string, string>;
  text?: string;
}

function tokenizeHtml(html: string): HtmlToken[] {
  const tokens: HtmlToken[] = [];
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z_:][-a-zA-Z0-9_:.]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>|([^<]+)/g;

  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    if (match[4]) {
      // Text content
      const text = decodeHtmlEntities(match[4]);
      if (text.trim() || text.includes('\n')) {
        tokens.push({ type: 'text', text });
      }
    } else if (match[0].startsWith('</')) {
      // Closing tag
      tokens.push({ type: 'close', tag: match[1].toLowerCase() });
    } else if (match[3] === '/' || ['br', 'hr', 'img', 'input', 'meta', 'link'].includes(match[1].toLowerCase())) {
      // Self-closing tag
      const attrs = parseAttributes(match[2]);
      tokens.push({ type: 'selfclose', tag: match[1].toLowerCase(), attrs });
    } else {
      // Opening tag
      const attrs = parseAttributes(match[2]);
      tokens.push({ type: 'open', tag: match[1].toLowerCase(), attrs });
    }
  }

  return tokens;
}

function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  let match;
  while ((match = attrRegex.exec(attrString)) !== null) {
    const name = match[1];
    const value = match[2] || match[3] || match[4] || '';
    attrs[name] = decodeHtmlEntities(value);
  }

  return attrs;
}

function buildYjsFromTokens(tokens: HtmlToken[], parent: Y.XmlFragment | Y.XmlElement): void {
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    if (token.type === 'text') {
      const text = new Y.XmlText();
      text.insert(0, token.text || '');
      parent.push([text]);
      i++;
    } else if (token.type === 'selfclose') {
      const elem = new Y.XmlElement(token.tag || 'br');
      if (token.attrs) {
        for (const [key, value] of Object.entries(token.attrs)) {
          elem.setAttribute(key, value);
        }
      }
      parent.push([elem]);
      i++;
    } else if (token.type === 'open') {
      const elem = new Y.XmlElement(token.tag || 'div');
      if (token.attrs) {
        for (const [key, value] of Object.entries(token.attrs)) {
          elem.setAttribute(key, value);
        }
      }

      // Find matching closing tag and process children
      const closeIndex = findClosingTag(tokens, i, token.tag || '');
      const childTokens = tokens.slice(i + 1, closeIndex);
      buildYjsFromTokens(childTokens, elem);

      parent.push([elem]);
      i = closeIndex + 1;
    } else {
      // Skip unexpected closing tags
      i++;
    }
  }
}

function findClosingTag(tokens: HtmlToken[], openIndex: number, tagName: string): number {
  let depth = 1;
  for (let i = openIndex + 1; i < tokens.length; i++) {
    if (tokens[i].type === 'open' && tokens[i].tag === tagName) {
      depth++;
    } else if (tokens[i].type === 'close' && tokens[i].tag === tagName) {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return tokens.length; // No matching close found
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// Version history endpoints
app.get('/api/documents/:id/versions', requireAuth, (req, res) => {
  try {
    const versionsDir = getVersionsDir(req.params.id);
    const files = fs.readdirSync(versionsDir).filter(f => f.endsWith('.json')).sort().reverse();

    const versions: VersionInfo[] = files.map(file => {
      const filePath = path.join(versionsDir, file);
      const stats = fs.statSync(filePath);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return {
        id: file.replace('.json', ''),
        timestamp: data.timestamp || stats.mtime.toISOString(),
        size: stats.size,
      };
    });

    res.json(versions);
  } catch (error) {
    console.error('Error listing versions:', error);
    res.json([]);
  }
});

app.post('/api/documents/:id/versions/:versionId/restore', requireAuth, (req, res) => {
  try {
    const versionsDir = getVersionsDir(req.params.id);
    const versionPath = path.join(versionsDir, `${req.params.versionId}.json`);

    if (!fs.existsSync(versionPath)) {
      return res.status(404).json({ error: 'Version not found' });
    }

    const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
    const trackFilePath = getTrackFilePath(req.params.id);

    if (fs.existsSync(trackFilePath)) {
      const trackData = JSON.parse(fs.readFileSync(trackFilePath, 'utf-8')) as TrackFileData;
      // Save current state as a version before restoring
      saveVersion(req.params.id, trackData.yDocState);
      // Restore the old version
      trackData.yDocState = versionData.yDocState;
      trackData.updatedAt = new Date().toISOString();
      fs.writeFileSync(trackFilePath, JSON.stringify(trackData, null, 2));
    }

    console.log(`Restored version ${req.params.versionId} for document ${req.params.id}`);
    res.json({ success: true, message: 'Version restored' });
  } catch (error) {
    console.error('Error restoring version:', error);
    res.status(500).json({ error: 'Failed to restore version' });
  }
});

// Serve static files in production
if (IS_PRODUCTION) {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  // Catch-all for SPA routing - serve index.html for any non-API, non-static routes
  app.use((_req, res, next) => {
    // Skip if it's an API route
    if (_req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ==================== HTTP Server with WebSocket ====================

const httpServer = createServer(app);

// Create WebSocket server for Hocuspocus
const wss = new WebSocketServer({ noServer: true });

// Hocuspocus server configuration
const hocuspocus = new Hocuspocus({
  // Suppress noise from health checks
  quiet: true,

  async onConnect({ documentName }) {
    console.log(`Client connected to document: ${documentName}`);
  },

  async onDisconnect({ documentName }) {
    console.log(`Client disconnected from document: ${documentName}`);
  },

  async onLoadDocument({ document, documentName }) {
    const trackFilePath = getTrackFilePath(documentName);

    if (fs.existsSync(trackFilePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(trackFilePath, 'utf-8')) as TrackFileData;
        console.log(`Loading document from: ${trackFilePath}`);

        if (data.yDocState && data.yDocState.length > 0) {
          const state = new Uint8Array(data.yDocState);
          Y.applyUpdate(document, state);
        }

        if (data.changes && data.changes.length > 0) {
          const ychanges = document.getArray('trackChanges');
          if (ychanges.length === 0) {
            ychanges.push(data.changes);
          }
        }
      } catch (error) {
        console.error(`Error loading track file: ${trackFilePath}`, error);
      }
    } else {
      console.log(`No existing track file for: ${documentName}`);
    }

    return document;
  },

  async onStoreDocument({ document, documentName }) {
    const trackFilePath = getTrackFilePath(documentName);

    try {
      const ychanges = document.getArray('trackChanges');
      const changes = ychanges.toArray();
      const state = Y.encodeStateAsUpdate(document);

      let existingData: Partial<TrackFileData> = {};
      if (fs.existsSync(trackFilePath)) {
        try {
          existingData = JSON.parse(fs.readFileSync(trackFilePath, 'utf-8'));
        } catch {
          // ignore
        }
      }

      const trackData: TrackFileData = {
        version: '1.0',
        schema: 'tandem-track-v1',
        documentId: documentName,
        title: existingData.title || documentName,
        createdAt: existingData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        changes,
        yDocState: Array.from(state),
      };

      fs.writeFileSync(trackFilePath, JSON.stringify(trackData, null, 2));

      // Save version snapshot (throttled - only if last version is older than 5 minutes)
      const versionsDir = getVersionsDir(documentName);
      const existingVersions = fs.readdirSync(versionsDir).filter(f => f.endsWith('.json')).sort();
      const lastVersion = existingVersions[existingVersions.length - 1];
      let shouldSaveVersion = true;

      if (lastVersion) {
        const lastVersionPath = path.join(versionsDir, lastVersion);
        const lastVersionStats = fs.statSync(lastVersionPath);
        const timeSinceLastVersion = Date.now() - lastVersionStats.mtime.getTime();
        // Only save if more than 5 minutes since last version
        shouldSaveVersion = timeSinceLastVersion > 5 * 60 * 1000;
      }

      if (shouldSaveVersion && trackData.yDocState.length > 0) {
        saveVersion(documentName, trackData.yDocState);
        console.log(`Version snapshot saved for: ${documentName}`);
      }

      console.log(`Document stored: ${trackFilePath} (${changes.length} changes)`);
    } catch (error) {
      console.error(`Error storing track file: ${trackFilePath}`, error);
    }
  },
});

// Handle WebSocket upgrade
httpServer.on('upgrade', (request, socket, head) => {
  // Filter out health check probes (they often have no valid URL)
  const url = request.url || '/';

  wss.handleUpgrade(request, socket, head, (ws) => {
    // Add error handler to gracefully handle malformed messages (e.g., from Cloudflare health checks)
    ws.on('error', (error: Error) => {
      if (error.message.includes('encoding') || error.message.includes('utf-8')) {
        // Silently ignore encoding errors from health check probes
        return;
      }
      console.error('WebSocket error:', error.message);
    });

    hocuspocus.handleConnection(ws, request);
  });
});

// Global error handler to prevent crashes from unhandled errors
process.on('uncaughtException', (error) => {
  if (error.message.includes('encoding') || error.message.includes('utf-8')) {
    // Silently ignore encoding errors from Cloudflare health checks
    return;
  }
  console.error('Uncaught exception:', error);
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Tandem server running at http://localhost:${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api`);
  if (IS_PRODUCTION) {
    console.log(`   Frontend: http://localhost:${PORT}`);
  }
  console.log(`   Data: ${path.resolve(DATA_DIR)}\n`);
});
