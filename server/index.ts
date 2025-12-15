import { Hocuspocus } from '@hocuspocus/server';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import * as Y from 'yjs';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import TurndownService from 'turndown';
import * as Diff from 'diff';

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
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const TRASH_DIR = path.join(DATA_DIR, 'trash');

// Ensure versions directory exists
if (!fs.existsSync(VERSIONS_DIR)) {
  fs.mkdirSync(VERSIONS_DIR, { recursive: true });
}

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Ensure trash directory exists
if (!fs.existsSync(TRASH_DIR)) {
  fs.mkdirSync(TRASH_DIR, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `img-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
});

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

    // Move to trash instead of deleting
    const safeName = req.params.id.replace(/[^a-zA-Z0-9-_]/g, '_');
    const trashFilePath = path.join(TRASH_DIR, `${safeName}.track`);

    // Add deletion metadata
    const data = JSON.parse(fs.readFileSync(trackFilePath, 'utf-8')) as TrackFileData;
    (data as TrackFileData & { deletedAt: string }).deletedAt = new Date().toISOString();
    fs.writeFileSync(trashFilePath, JSON.stringify(data, null, 2));

    // Remove from main directory
    fs.unlinkSync(trackFilePath);
    console.log(`Document moved to trash: ${req.params.id}`);
    res.status(204).send();
  } catch (error) {
    console.error('Error moving document to trash:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Trash API endpoints
// List trashed documents
app.get('/api/trash', requireAuth, (_req, res) => {
  try {
    const files = fs.readdirSync(TRASH_DIR).filter(f => f.endsWith('.track'));
    const documents = files.map(file => {
      const filePath = path.join(TRASH_DIR, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as TrackFileData & { deletedAt?: string };
      return {
        id: data.documentId,
        title: data.title || data.documentId,
        deletedAt: data.deletedAt || data.updatedAt,
        createdAt: data.createdAt || data.updatedAt,
      };
    });
    // Sort by deletion date, newest first
    documents.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
    res.json(documents);
  } catch (error) {
    console.error('Error listing trash:', error);
    res.status(500).json({ error: 'Failed to list trash' });
  }
});

// Restore document from trash
app.post('/api/trash/:id/restore', requireAuth, (req, res) => {
  try {
    const safeName = req.params.id.replace(/[^a-zA-Z0-9-_]/g, '_');
    const trashFilePath = path.join(TRASH_DIR, `${safeName}.track`);

    if (!fs.existsSync(trashFilePath)) {
      return res.status(404).json({ error: 'Document not found in trash' });
    }

    const trackFilePath = getTrackFilePath(req.params.id);
    if (fs.existsSync(trackFilePath)) {
      return res.status(409).json({ error: 'Document with same ID already exists' });
    }

    // Remove deletion metadata and restore
    const data = JSON.parse(fs.readFileSync(trashFilePath, 'utf-8')) as TrackFileData & { deletedAt?: string };
    delete data.deletedAt;
    data.updatedAt = new Date().toISOString();

    fs.writeFileSync(trackFilePath, JSON.stringify(data, null, 2));
    fs.unlinkSync(trashFilePath);

    console.log(`Document restored from trash: ${req.params.id}`);
    res.json({
      id: data.documentId,
      title: data.title,
      message: 'Document restored successfully',
    });
  } catch (error) {
    console.error('Error restoring document:', error);
    res.status(500).json({ error: 'Failed to restore document' });
  }
});

// Permanently delete from trash
app.delete('/api/trash/:id', requireAuth, (req, res) => {
  try {
    const safeName = req.params.id.replace(/[^a-zA-Z0-9-_]/g, '_');
    const trashFilePath = path.join(TRASH_DIR, `${safeName}.track`);

    if (!fs.existsSync(trashFilePath)) {
      return res.status(404).json({ error: 'Document not found in trash' });
    }

    fs.unlinkSync(trashFilePath);
    console.log(`Document permanently deleted: ${req.params.id}`);
    res.status(204).send();
  } catch (error) {
    console.error('Error permanently deleting document:', error);
    res.status(500).json({ error: 'Failed to permanently delete document' });
  }
});

// Empty trash (delete all)
app.delete('/api/trash', requireAuth, (_req, res) => {
  try {
    const files = fs.readdirSync(TRASH_DIR).filter(f => f.endsWith('.track'));
    files.forEach(file => {
      fs.unlinkSync(path.join(TRASH_DIR, file));
    });
    console.log(`Trash emptied: ${files.length} documents permanently deleted`);
    res.json({ message: `${files.length} documents permanently deleted` });
  } catch (error) {
    console.error('Error emptying trash:', error);
    res.status(500).json({ error: 'Failed to empty trash' });
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

    // Get content from Yjs (TipTap Collaboration uses 'default' field by default)
    const fragment = doc.getXmlFragment('default');
    const content = yXmlFragmentToHtml(fragment);

    res.json({ content, format: 'html' });
  } catch (error) {
    console.error('Error getting document content:', error);
    res.status(500).json({ error: 'Failed to get document content' });
  }
});

// GET content as Markdown (for Obsidian sync)
app.get('/api/documents/:id/markdown', requireAuth, (req, res) => {
  try {
    const trackFilePath = getTrackFilePath(req.params.id);

    if (!fs.existsSync(trackFilePath)) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const data = JSON.parse(fs.readFileSync(trackFilePath, 'utf-8')) as TrackFileData;

    // If no Yjs state, return empty content
    if (!data.yDocState || data.yDocState.length === 0) {
      return res.json({ content: '', format: 'markdown' });
    }

    // Create Yjs doc and apply state
    const doc = new Y.Doc();
    const state = new Uint8Array(data.yDocState);
    Y.applyUpdate(doc, state);

    // Get content from Yjs as HTML first
    const fragment = doc.getXmlFragment('default');
    const html = yXmlFragmentToHtml(fragment);

    // Convert HTML to Markdown using Turndown
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      bulletListMarker: '-',
    });

    // Custom rules for better markdown conversion
    turndownService.addRule('strikethrough', {
      filter: ['del', 's'],
      replacement: (content: string) => `~~${content}~~`,
    });

    const markdown = turndownService.turndown(html);

    res.json({ content: markdown, format: 'markdown', title: data.title });
  } catch (error) {
    console.error('Error getting document markdown:', error);
    res.status(500).json({ error: 'Failed to get document markdown' });
  }
});

// ==================== Track Changes Sync Types ====================

interface SyncAuthor {
  id: string;
  type: 'human' | 'ai' | 'sync';
  name: string;
  color: string;
}

interface SyncPosition {
  line: number;
  column: number;
  offset: number;
  pmPos?: number;
}

interface SyncChange {
  id: string;
  type: 'insert' | 'delete';
  anchor: SyncPosition;
  content?: string;
  oldContent?: string;
  author: SyncAuthor;
  timestamp: string;
}

// Default author for sync operations
function createSyncAuthor(source: string = 'Obsidian Sync'): SyncAuthor {
  return {
    id: `sync-${Date.now()}`,
    type: 'sync',
    name: source,
    color: '#10B981', // Green for sync changes
  };
}

// POST suggest-changes - Add local changes as Track Changes suggestions
app.post('/api/documents/:id/suggest-changes', requireAuth, async (req, res) => {
  try {
    const trackFilePath = getTrackFilePath(req.params.id);

    if (!fs.existsSync(trackFilePath)) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const { content, source } = req.body;
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Content must be a string' });
    }

    const data = JSON.parse(fs.readFileSync(trackFilePath, 'utf-8')) as TrackFileData;

    // Get current Tandem content as markdown
    let currentMarkdown = '';
    if (data.yDocState && data.yDocState.length > 0) {
      const doc = new Y.Doc();
      const state = new Uint8Array(data.yDocState);
      Y.applyUpdate(doc, state);

      const fragment = doc.getXmlFragment('default');
      const html = yXmlFragmentToHtml(fragment);

      const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        emDelimiter: '*',
        bulletListMarker: '-',
      });
      currentMarkdown = turndownService.turndown(html);
    }

    // Normalize line endings
    const normalizedCurrent = currentMarkdown.replace(/\r\n/g, '\n').trim();
    const normalizedNew = content.replace(/\r\n/g, '\n').trim();

    // If content is the same, no changes needed
    if (normalizedCurrent === normalizedNew) {
      return res.json({
        success: true,
        message: 'No changes detected',
        changesCount: 0,
      });
    }

    // Compute diff using word-based diff for better readability
    // This produces more meaningful changes (words/phrases instead of individual chars)
    const diffs = Diff.diffWords(normalizedCurrent, normalizedNew);

    // Convert diffs to Track Changes
    const author = createSyncAuthor(source || 'Obsidian Sync');
    const timestamp = new Date().toISOString();
    const changes: SyncChange[] = [];

    let offset = 0;
    let line = 1;
    let column = 0;

    for (const part of diffs) {
      const text = part.value;

      if (part.added) {
        // Insert change
        changes.push({
          id: crypto.randomUUID(),
          type: 'insert',
          anchor: { line, column, offset },
          content: text,
          author,
          timestamp,
        });
        // Don't advance offset for inserts (they don't consume original text)
      } else if (part.removed) {
        // Delete change
        changes.push({
          id: crypto.randomUUID(),
          type: 'delete',
          anchor: { line, column, offset },
          oldContent: text,
          author,
          timestamp,
        });
        // Advance position through deleted text
        for (const char of text) {
          if (char === '\n') {
            line++;
            column = 0;
          } else {
            column++;
          }
          offset++;
        }
      } else {
        // Unchanged - advance position
        for (const char of text) {
          if (char === '\n') {
            line++;
            column = 0;
          } else {
            column++;
          }
          offset++;
        }
      }
    }

    if (changes.length === 0) {
      return res.json({
        success: true,
        message: 'No significant changes detected',
        changesCount: 0,
      });
    }

    // Load existing Y.js document and push changes to trackChanges array
    const doc = new Y.Doc();
    if (data.yDocState && data.yDocState.length > 0) {
      const state = new Uint8Array(data.yDocState);
      Y.applyUpdate(doc, state);
    }

    const ychanges = doc.getArray('trackChanges');

    // Push all new changes at once
    ychanges.push(changes);

    // Save updated state
    const newState = Y.encodeStateAsUpdate(doc);
    data.yDocState = Array.from(newState);
    data.changes = ychanges.toArray();
    data.updatedAt = new Date().toISOString();

    fs.writeFileSync(trackFilePath, JSON.stringify(data, null, 2));

    console.log(`Added ${changes.length} track changes to ${req.params.id} from ${source || 'Obsidian Sync'}`);

    // Force connected clients to refresh
    const hocuspocusDoc = hocuspocus.documents.get(req.params.id);
    if (hocuspocusDoc) {
      hocuspocus.closeConnections(req.params.id);
    }

    res.json({
      success: true,
      message: `Added ${changes.length} suggested changes`,
      changesCount: changes.length,
      changes: changes.map(c => ({
        id: c.id,
        type: c.type,
        preview: (c.content || c.oldContent || '').slice(0, 50),
      })),
    });
  } catch (error) {
    console.error('Error adding track changes:', error);
    res.status(500).json({ error: 'Failed to add track changes' });
  }
});

// GET track-changes - Get all pending track changes for a document
app.get('/api/documents/:id/track-changes', requireAuth, (req, res) => {
  try {
    const trackFilePath = getTrackFilePath(req.params.id);

    if (!fs.existsSync(trackFilePath)) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const data = JSON.parse(fs.readFileSync(trackFilePath, 'utf-8')) as TrackFileData;

    // Load Y.js document and get trackChanges array
    const doc = new Y.Doc();
    if (data.yDocState && data.yDocState.length > 0) {
      const state = new Uint8Array(data.yDocState);
      Y.applyUpdate(doc, state);
    }

    const ychanges = doc.getArray('trackChanges');
    const changes = ychanges.toArray();

    res.json({
      documentId: req.params.id,
      changesCount: changes.length,
      changes,
    });
  } catch (error) {
    console.error('Error getting track changes:', error);
    res.status(500).json({ error: 'Failed to get track changes' });
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

    // Detect if content is markdown or HTML
    // Markdown typically starts with # or doesn't start with <
    const isMarkdown = !content.trim().startsWith('<') || content.trim().startsWith('#');
    const htmlContent = isMarkdown ? marked.parse(content) as string : content;

    console.log(`Writing content to ${req.params.id}, isMarkdown: ${isMarkdown}, htmlLength: ${htmlContent.length}`);

    // Create new Yjs doc with the HTML content
    // TipTap Collaboration extension uses 'default' field by default
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment('default');

    // Convert HTML to Yjs XML structure
    htmlToYXmlFragment(htmlContent, fragment);

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

    // Force Hocuspocus to reload from disk by removing cached document
    // This avoids Y.js merge conflicts with different state formats
    const hocuspocusDoc = hocuspocus.documents.get(req.params.id);
    if (hocuspocusDoc) {
      console.log(`Evicting Hocuspocus cached document: ${req.params.id}`);
      // Close all connections to this document so clients reconnect
      hocuspocus.closeConnections(req.params.id);
    }

    res.json({ success: true, message: 'Content updated. Please refresh to see changes.' });
  } catch (error) {
    console.error('Error updating document content:', error);
    res.status(500).json({ error: 'Failed to update document content' });
  }
});

// Map TipTap mark names back to HTML tags
function markToHtmlTag(mark: string): string {
  const markToTag: Record<string, string> = {
    'bold': 'strong',
    'italic': 'em',
    'code': 'code',
    'link': 'a',
    'underline': 'u',
    'strike': 's',
  };
  return markToTag[mark] || mark;
}

// Convert XmlText delta with marks to HTML
function xmlTextToHtml(xmlText: Y.XmlText): string {
  const delta = xmlText.toDelta();
  let html = '';

  for (const op of delta) {
    if (typeof op.insert !== 'string') continue;

    let text = escapeHtml(op.insert);
    const attrs = op.attributes || {};

    // Wrap text with mark tags
    for (const [mark, value] of Object.entries(attrs)) {
      if (value) {
        const tag = markToHtmlTag(mark);
        if (mark === 'link' && typeof value === 'object' && (value as Record<string, unknown>).href) {
          text = `<a href="${escapeHtml((value as Record<string, string>).href)}">${text}</a>`;
        } else {
          text = `<${tag}>${text}</${tag}>`;
        }
      }
    }

    html += text;
  }

  return html;
}

// Map TipTap node names to standard HTML tags
function tipTapToHtmlTag(nodeName: string, attrs: Record<string, unknown>): { tag: string; attrs: string } {
  const name = nodeName.toLowerCase();

  // Handle heading with level attribute
  if (name === 'heading') {
    const level = attrs.level || 1;
    return { tag: `h${level}`, attrs: '' };
  }

  // Map TipTap nodes to HTML
  const mapping: Record<string, string> = {
    'paragraph': 'p',
    'bulletlist': 'ul',
    'orderedlist': 'ol',
    'listitem': 'li',
    'codeblock': 'pre',
    'blockquote': 'blockquote',
    'horizontalrule': 'hr',
    'hardbreak': 'br',
    'table': 'table',
    'tablerow': 'tr',
    'tableheader': 'th',
    'tablecell': 'td',
    'image': 'img',
  };

  const tag = mapping[name] || name;

  // Build attributes string (excluding internal TipTap attrs like 'level')
  let attrStr = '';
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'level' && value !== undefined && value !== null) {
      attrStr += ` ${key}="${escapeHtml(String(value))}"`;
    }
  }

  return { tag, attrs: attrStr };
}

// Helper: Convert Yjs XmlFragment to standard HTML
function yXmlFragmentToHtml(fragment: Y.XmlFragment): string {
  let html = '';

  fragment.forEach((item) => {
    if (item instanceof Y.XmlText) {
      // Use delta-based conversion to properly handle marks
      html += xmlTextToHtml(item);
    } else if (item instanceof Y.XmlElement) {
      const attrs = item.getAttributes();
      const { tag, attrs: attrStr } = tipTapToHtmlTag(item.nodeName, attrs);

      const innerHtml = yXmlFragmentToHtml(item);

      // Self-closing tags
      if (['br', 'hr', 'img'].includes(tag)) {
        html += `<${tag}${attrStr} />`;
      } else {
        html += `<${tag}${attrStr}>${innerHtml}</${tag}>`;
      }
    }
  });

  return html;
}

// Inline tags that should become marks on XmlText, not XmlElements
const INLINE_MARK_TAGS = new Set(['strong', 'b', 'em', 'i', 'code', 'a', 'u', 's', 'strike', 'span']);

// Map HTML inline tags to TipTap mark names
function getMarkName(tag: string): string {
  const markMap: Record<string, string> = {
    'strong': 'bold',
    'b': 'bold',
    'em': 'italic',
    'i': 'italic',
    'code': 'code',
    'a': 'link',
    'u': 'underline',
    's': 'strike',
    'strike': 'strike',
  };
  return markMap[tag] || tag;
}

// Helper: Convert HTML to Yjs XmlFragment
function htmlToYXmlFragment(html: string, fragment: Y.XmlFragment): void {
  // Wrap plain text in a paragraph if not already wrapped
  const wrappedHtml = html.trim().startsWith('<') ? html : `<p>${html}</p>`;

  // Parse HTML into tokens
  const tokens = tokenizeHtml(wrappedHtml);

  // Build Y.js structure with proper mark handling
  buildYjsFromTokensV2(tokens, fragment, false);
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

// Map HTML tags to TipTap/ProseMirror node types
function mapHtmlToTipTap(tag: string): { nodeName: string; attrs?: Record<string, unknown> } {
  const headingMatch = tag.match(/^h([1-6])$/);
  if (headingMatch) {
    return { nodeName: 'heading', attrs: { level: parseInt(headingMatch[1]) } };
  }

  const mapping: Record<string, string> = {
    'p': 'paragraph',
    'ul': 'bulletList',
    'ol': 'orderedList',
    'li': 'listItem',
    'blockquote': 'blockquote',
    'pre': 'codeBlock',
    'code': 'codeBlock',
    'hr': 'horizontalRule',
    'br': 'hardBreak',
    'table': 'table',
    'tr': 'tableRow',
    'th': 'tableHeader',
    'td': 'tableCell',
    'img': 'image',
    // Inline elements that should be preserved
    'strong': 'strong',
    'b': 'strong',
    'em': 'em',
    'i': 'em',
    'a': 'a',
    'u': 'u',
    's': 's',
    'strike': 's',
  };

  return { nodeName: mapping[tag] || tag };
}

// Text segment with marks for building XmlText with proper TipTap formatting
interface TextSegment {
  text: string;
  marks: Record<string, unknown>[];
}

// Extract text content with marks from a range of tokens
function extractTextWithMarks(
  tokens: HtmlToken[],
  startIndex: number,
  endIndex: number,
  currentMarks: Record<string, unknown>[] = []
): { segments: TextSegment[]; nextIndex: number } {
  const segments: TextSegment[] = [];
  let i = startIndex;

  while (i < endIndex) {
    const token = tokens[i];

    if (token.type === 'text') {
      const text = token.text || '';
      if (text) {
        segments.push({ text, marks: [...currentMarks] });
      }
      i++;
    } else if (token.type === 'open' && INLINE_MARK_TAGS.has(token.tag || '')) {
      // This is an inline mark - add to current marks and process children
      const markName = getMarkName(token.tag || '');
      const mark: Record<string, unknown> = { type: markName };

      // Handle link attributes
      if (token.tag === 'a' && token.attrs?.href) {
        mark.attrs = { href: token.attrs.href };
      }

      const closeIdx = findClosingTag(tokens, i, token.tag || '');
      const { segments: childSegments } = extractTextWithMarks(
        tokens,
        i + 1,
        closeIdx,
        [...currentMarks, mark]
      );
      segments.push(...childSegments);
      i = closeIdx + 1;
    } else if (token.type === 'selfclose') {
      // Handle hardBreak (br) inside text
      if (token.tag === 'br') {
        segments.push({ text: '\n', marks: [...currentMarks] });
      }
      i++;
    } else if (token.type === 'close') {
      // Unexpected close tag - skip
      i++;
    } else {
      // Non-inline element encountered - stop extraction
      break;
    }
  }

  return { segments, nextIndex: i };
}

// Build XmlText with proper marks from segments
function buildXmlTextFromSegments(segments: TextSegment[]): Y.XmlText | null {
  if (segments.length === 0) return null;

  const xmlText = new Y.XmlText();
  let offset = 0;

  for (const segment of segments) {
    if (!segment.text) continue;

    xmlText.insert(offset, segment.text);

    // Apply marks as formatting attributes
    if (segment.marks.length > 0) {
      const attrs: Record<string, unknown> = {};
      for (const mark of segment.marks) {
        const markType = mark.type as string;
        if (mark.attrs) {
          attrs[markType] = mark.attrs;
        } else {
          attrs[markType] = true;
        }
      }
      xmlText.format(offset, segment.text.length, attrs);
    }

    offset += segment.text.length;
  }

  return xmlText;
}

// New version that properly handles inline marks
function buildYjsFromTokensV2(
  tokens: HtmlToken[],
  parent: Y.XmlFragment | Y.XmlElement,
  isInsideBlock: boolean
): void {
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    if (token.type === 'text') {
      const text = (token.text || '').replace(/^\n+|\n+$/g, ''); // Trim leading/trailing newlines
      if (text && isInsideBlock) {
        // Only add text if we're inside a block element
        const xmlText = new Y.XmlText();
        xmlText.insert(0, text);
        parent.push([xmlText]);
      } else if (text && !isInsideBlock) {
        // Text at root level - wrap in paragraph
        const para = new Y.XmlElement('paragraph');
        const xmlText = new Y.XmlText();
        xmlText.insert(0, text);
        para.push([xmlText]);
        parent.push([para]);
      }
      i++;
    } else if (token.type === 'selfclose') {
      const { nodeName, attrs: mappedAttrs } = mapHtmlToTipTap(token.tag || 'hardBreak');
      const elem = new Y.XmlElement(nodeName);

      if (mappedAttrs) {
        for (const [key, value] of Object.entries(mappedAttrs)) {
          elem.setAttribute(key, value);
        }
      }
      if (token.attrs) {
        for (const [key, value] of Object.entries(token.attrs)) {
          elem.setAttribute(key, value);
        }
      }
      parent.push([elem]);
      i++;
    } else if (token.type === 'open') {
      const tag = token.tag || 'paragraph';

      // Skip inline marks at this level - they should be handled inside blocks
      if (INLINE_MARK_TAGS.has(tag)) {
        // Find closing tag and skip
        const closeIdx = findClosingTag(tokens, i, tag);
        i = closeIdx + 1;
        continue;
      }

      // Skip thead/tbody wrapper tags - recurse directly into their children
      if (tag === 'thead' || tag === 'tbody') {
        const closeIdx = findClosingTag(tokens, i, tag);
        const childTokens = tokens.slice(i + 1, closeIdx);
        buildYjsFromTokensV2(childTokens, parent, false);
        i = closeIdx + 1;
        continue;
      }

      const { nodeName, attrs: mappedAttrs } = mapHtmlToTipTap(tag);
      const elem = new Y.XmlElement(nodeName);

      if (mappedAttrs) {
        for (const [key, value] of Object.entries(mappedAttrs)) {
          elem.setAttribute(key, value);
        }
      }
      if (token.attrs) {
        for (const [key, value] of Object.entries(token.attrs)) {
          elem.setAttribute(key, value);
        }
      }

      const closeIndex = findClosingTag(tokens, i, tag);
      const childTokens = tokens.slice(i + 1, closeIndex);

      // For leaf blocks (paragraph, heading), extract text with inline marks
      const leafBlocks = ['paragraph', 'heading', 'codeBlock'];
      if (leafBlocks.includes(nodeName)) {
        // Extract all text with marks
        const { segments } = extractTextWithMarks(childTokens, 0, childTokens.length);
        const xmlText = buildXmlTextFromSegments(segments);
        if (xmlText) {
          elem.push([xmlText]);
        }
      } else if (nodeName === 'listItem' || nodeName === 'tableCell' || nodeName === 'tableHeader') {
        // These elements can contain:
        // 1. Simple text: <li>text</li> -> listItem > paragraph > text
        // 2. Paragraph + nested content: <li><p>text</p><ul>...</ul></li>
        //
        // Check if children contain block elements (p, ul, ol, etc.)
        const hasBlockChildren = childTokens.some(
          t => t.type === 'open' && ['p', 'ul', 'ol', 'blockquote', 'pre', 'table', 'div'].includes(t.tag || '')
        );

        if (hasBlockChildren) {
          // Has block children - recurse to process them as proper blocks
          buildYjsFromTokensV2(childTokens, elem, false);
        } else {
          // Simple text only - wrap in paragraph (TipTap requires paragraph inside these elements)
          const { segments } = extractTextWithMarks(childTokens, 0, childTokens.length);
          const xmlText = buildXmlTextFromSegments(segments);
          if (xmlText) {
            const para = new Y.XmlElement('paragraph');
            para.push([xmlText]);
            elem.push([para]);
          }
        }
      } else {
        // For container blocks (list, blockquote), recurse
        buildYjsFromTokensV2(childTokens, elem, false);
      }

      parent.push([elem]);
      i = closeIndex + 1;
    } else {
      i++;
    }
  }
}

// Legacy function kept for reference
function buildYjsFromTokens(tokens: HtmlToken[], parent: Y.XmlFragment | Y.XmlElement): void {
  buildYjsFromTokensV2(tokens, parent, false);
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

// Full-text search across all documents
interface SearchMatch {
  text: string;
  context: string;
  position: number;
}

interface SearchResultItem {
  documentId: string;
  documentTitle: string;
  matches: SearchMatch[];
}

// Helper function to extract plain text from HTML
function htmlToPlainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')  // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')      // Normalize whitespace
    .trim();
}

// Helper function to get context around a match
function getMatchContext(text: string, matchIndex: number, matchLength: number, contextSize: number = 50): string {
  const start = Math.max(0, matchIndex - contextSize);
  const end = Math.min(text.length, matchIndex + matchLength + contextSize);

  let context = text.slice(start, end);

  // Add ellipsis if truncated
  if (start > 0) context = '...' + context;
  if (end < text.length) context = context + '...';

  return context;
}

app.get('/api/search', requireAuth, (req, res) => {
  try {
    const query = (req.query.q as string || '').trim().toLowerCase();

    if (!query || query.length < 2) {
      return res.json({ results: [] });
    }

    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.track'));
    const results: SearchResultItem[] = [];

    for (const file of files) {
      try {
        const filePath = path.join(DATA_DIR, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as TrackFileData;

        // Skip if no content
        if (!data.yDocState || data.yDocState.length === 0) continue;

        // Create Yjs doc and apply state
        const doc = new Y.Doc();
        const state = new Uint8Array(data.yDocState);
        Y.applyUpdate(doc, state);

        // Get HTML content and convert to plain text
        const fragment = doc.getXmlFragment('default');
        const html = yXmlFragmentToHtml(fragment);
        const plainText = htmlToPlainText(html);

        // Search for matches
        const matches: SearchMatch[] = [];
        const lowerText = plainText.toLowerCase();
        let searchIndex = 0;

        while (searchIndex < lowerText.length) {
          const matchIndex = lowerText.indexOf(query, searchIndex);
          if (matchIndex === -1) break;

          // Get the actual matched text (preserving case)
          const matchedText = plainText.slice(matchIndex, matchIndex + query.length);

          matches.push({
            text: matchedText,
            context: getMatchContext(plainText, matchIndex, query.length),
            position: matchIndex,
          });

          searchIndex = matchIndex + query.length;

          // Limit matches per document
          if (matches.length >= 5) break;
        }

        if (matches.length > 0) {
          results.push({
            documentId: data.documentId,
            documentTitle: data.title || data.documentId,
            matches,
          });
        }
      } catch (docError) {
        console.error(`Error searching document ${file}:`, docError);
        // Continue with other documents
      }
    }

    // Sort by number of matches (more matches = more relevant)
    results.sort((a, b) => b.matches.length - a.matches.length);

    // Limit total results
    res.json({ results: results.slice(0, 20) });
  } catch (error) {
    console.error('Error searching documents:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Image upload endpoint
app.post('/api/upload', requireAuth, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    console.log(`Image uploaded: ${req.file.filename}`);

    res.json({
      success: true,
      url: imageUrl,
      filename: req.file.filename,
      size: req.file.size,
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Serve uploaded images (with auth check for API consistency)
app.use('/uploads', express.static(UPLOADS_DIR, {
  maxAge: '7d', // Cache for 7 days
  etag: true,
}));

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
