/**
 * Tandem Backend API
 * Hono server with Git-backed file storage + Yjs WebSocket
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import GitService from './git-service.js';
import { setupYjsConnection } from './yjs-service.js';

const app = new Hono();
const git = new GitService();

// CORS for frontend
app.use('/*', cors({
  origin: (origin) => {
    // Allow all origins in Electron app (file:// protocol) and dev servers
    if (!origin || origin.startsWith('file://') || origin.startsWith('http://localhost')) {
      return origin || '*';
    }
    return null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'Tandem API',
    version: '0.1.0',
    status: 'running'
  });
});

// Initialize repo (for first time setup)
app.post('/api/init', async (c) => {
  try {
    await git.init();
    return c.json({ success: true, message: 'Repository initialized' });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// FILES API

// List all files
app.get('/api/files', async (c) => {
  try {
    const files = await git.listFiles();
    return c.json({ files });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Get file content
app.get('/api/files/*', async (c) => {
  try {
    const filePath = c.req.path.replace(/^\/api\/files\//, '');
    const file = await git.getFile(filePath);

    if (!file) {
      return c.json({ error: 'File not found' }, 404);
    }

    return c.json(file);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Create or update file
app.post('/api/files/*', async (c) => {
  try {
    const filePath = c.req.path.replace(/^\/api\/files\//, '');
    const { content, author = 'human', authorName = 'User', message } = await c.req.json();

    if (!content) {
      return c.json({ error: 'Content is required' }, 400);
    }

    const result = await git.commitFile(filePath, content, author, authorName, message);

    return c.json({
      success: true,
      commit: result.sha,
      message: result.message
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Delete file
app.delete('/api/files/*', async (c) => {
  try {
    const filePath = c.req.path.replace(/^\/api\/files\//, '');
    const { author = 'human', authorName = 'User' } = await c.req.json();

    const result = await git.deleteFile(filePath, author, authorName);

    return c.json({
      success: true,
      commit: result.sha
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// COMMITS API

// Get commit history
app.get('/api/commits', async (c) => {
  try {
    const filePath = c.req.query('file');
    const limit = parseInt(c.req.query('limit') || '50');

    const commits = await git.getHistory(filePath, limit);

    return c.json({ commits });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Get specific commit with diff
app.get('/api/commits/:sha', async (c) => {
  try {
    const sha = c.req.param('sha');
    const result = await git.getDiff(sha);

    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Revert to specific commit
app.post('/api/commits/:sha/revert', async (c) => {
  try {
    const sha = c.req.param('sha');
    const result = await git.revert(sha);

    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// SYNC API

// Get sync status
app.get('/api/sync/status', async (c) => {
  try {
    const status = await git.getSyncStatus();
    return c.json(status);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Push to remote
app.post('/api/sync/push', async (c) => {
  try {
    const result = await git.push();
    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Pull from remote
app.post('/api/sync/pull', async (c) => {
  try {
    const result = await git.pull();
    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Set remote URL
app.post('/api/sync/remote', async (c) => {
  try {
    const { url } = await c.req.json();

    if (!url) {
      return c.json({ error: 'Remote URL is required' }, 400);
    }

    const result = await git.setRemote(url);
    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// WORKSPACE API

// Get current workspace path
app.get('/api/workspace', (c) => {
  return c.json({ path: git.repoPath });
});

// Set workspace path
app.post('/api/workspace', async (c) => {
  try {
    const { path } = await c.req.json();

    if (!path) {
      return c.json({ error: 'Workspace path is required' }, 400);
    }

    // Reinitialize GitService with new path
    git.repoPath = path;
    git.git = null; // Force re-initialization
    await git.ensureGit();

    console.log(`✅ Workspace changed to: ${path}`);

    return c.json({
      success: true,
      path: git.repoPath
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Start server with WebSocket support
const port = process.env.PORT || 3000;

console.log(`🚀 Tandem API starting on port ${port}...`);

// Use Node.js HTTP server to support both Hono and Socket.io
const server = serve({
  fetch: app.fetch,
  port
}, (info) => {
  console.log(`✅ Server running at http://localhost:${info.port}`);
  console.log(`📂 Workspace: ${git.repoPath}`);

  // Initialize Socket.io on the same server
  const io = new SocketIOServer(server, {
    cors: {
      origin: ['http://localhost:5173', 'file://'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket.io/'
  });

  // Set up Yjs collaboration
  setupYjsConnection(io);
  console.log(`🔄 Yjs WebSocket server initialized`);
});
