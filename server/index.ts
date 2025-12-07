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

// API Routes
app.get('/api/documents', (_req, res) => {
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

app.post('/api/documents', (req, res) => {
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

app.get('/api/documents/:id', (req, res) => {
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

app.patch('/api/documents/:id', (req, res) => {
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

app.delete('/api/documents/:id', (req, res) => {
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

// Version history endpoints
app.get('/api/documents/:id/versions', (req, res) => {
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

app.post('/api/documents/:id/versions/:versionId/restore', (req, res) => {
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
