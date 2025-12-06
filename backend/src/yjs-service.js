/**
 * Yjs WebSocket Service
 * Handles real-time collaborative editing with CRDT
 */

import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync.js';
import * as awarenessProtocol from 'y-protocols/awareness.js';
import * as encoding from 'lib0/encoding.js';
import * as decoding from 'lib0/decoding.js';

// Store Y.Doc instances for each file
const docs = new Map();
const docCallbacks = new Map();

// Message types
const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

/**
 * Get or create a Y.Doc for a file
 */
export function getYDoc(filePath) {
  if (!docs.has(filePath)) {
    const ydoc = new Y.Doc();
    docs.set(filePath, ydoc);

    // Set up update callback for Git snapshots (to be implemented)
    const updateCallback = (update, origin) => {
      if (origin !== 'sync') {
        // Schedule Git snapshot
        scheduleSnapshot(filePath, ydoc);
      }
    };

    ydoc.on('update', updateCallback);
    docCallbacks.set(filePath, updateCallback);

    console.log(`[Yjs] Created new Y.Doc for: ${filePath}`);
  }

  return docs.get(filePath);
}

/**
 * Load existing content into Y.Doc
 */
export function loadContentIntoYDoc(filePath, content) {
  const ydoc = getYDoc(filePath);
  const ytext = ydoc.getText('codemirror');

  // Only load if empty (initial load)
  if (ytext.length === 0 && content) {
    ydoc.transact(() => {
      ytext.insert(0, content);
    }, 'init');
    console.log(`[Yjs] Loaded content into Y.Doc for: ${filePath}`);
  }

  return ydoc;
}

/**
 * Get current text content from Y.Doc
 */
export function getYDocContent(filePath) {
  const ydoc = docs.get(filePath);
  if (!ydoc) return null;

  const ytext = ydoc.getText('codemirror');
  return ytext.toString();
}

/**
 * Schedule Git snapshot (to be implemented with debouncing)
 */
let snapshotTimeouts = new Map();

function scheduleSnapshot(filePath, ydoc) {
  // Clear existing timeout
  if (snapshotTimeouts.has(filePath)) {
    clearTimeout(snapshotTimeouts.get(filePath));
  }

  // Schedule new snapshot after 5 minutes of inactivity
  const timeout = setTimeout(() => {
    createSnapshot(filePath, ydoc);
    snapshotTimeouts.delete(filePath);
  }, 5 * 60 * 1000); // 5 minutes

  snapshotTimeouts.set(filePath, timeout);
}

async function createSnapshot(filePath, ydoc) {
  // This will be integrated with Git service
  const content = ydoc.getText('codemirror').toString();
  console.log(`[Yjs] Creating Git snapshot for: ${filePath}`);
  // TODO: Call GitService to commit snapshot
}

/**
 * Set up Socket.io handlers for a connection
 */
export function setupYjsConnection(io) {
  const awareness = new awarenessProtocol.Awareness(new Y.Doc());

  io.on('connection', (socket) => {
    console.log(`[Yjs] Client connected: ${socket.id}`);

    // Store current file path for this connection
    let currentFilePath = null;

    // Handle file subscription
    socket.on('yjs:subscribe', ({ filePath, content }) => {
      console.log(`[Yjs] Client ${socket.id} subscribing to: ${filePath}`);

      currentFilePath = filePath;
      socket.join(filePath);

      // Load or create Y.Doc
      const ydoc = content
        ? loadContentIntoYDoc(filePath, content)
        : getYDoc(filePath);

      // Send initial sync
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeSyncStep1(encoder, ydoc);
      socket.emit('yjs:sync', encoding.toUint8Array(encoder));

      console.log(`[Yjs] Sent initial sync to ${socket.id}`);
    });

    // Handle sync messages
    socket.on('yjs:sync', (message) => {
      if (!currentFilePath) return;

      const ydoc = getYDoc(currentFilePath);
      const encoder = encoding.createEncoder();
      const decoder = decoding.createDecoder(message);
      const messageType = decoding.readVarUint(decoder);

      if (messageType === MESSAGE_SYNC) {
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        syncProtocol.readSyncMessage(decoder, encoder, ydoc, socket);

        // Broadcast to other clients in the same room
        const response = encoding.toUint8Array(encoder);
        if (response.length > 1) {
          socket.to(currentFilePath).emit('yjs:sync', response);
        }
      }
    });

    // Handle awareness updates (cursor positions, user presence)
    socket.on('yjs:awareness', (message) => {
      if (!currentFilePath) return;

      // Broadcast awareness to other clients
      socket.to(currentFilePath).emit('yjs:awareness', message);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`[Yjs] Client disconnected: ${socket.id}`);
      if (currentFilePath) {
        socket.leave(currentFilePath);
      }
    });
  });

  console.log('[Yjs] WebSocket handlers initialized');
}

/**
 * Clean up Y.Doc instances (optional, for memory management)
 */
export function cleanupYDoc(filePath) {
  const ydoc = docs.get(filePath);
  if (ydoc) {
    const callback = docCallbacks.get(filePath);
    if (callback) {
      ydoc.off('update', callback);
      docCallbacks.delete(filePath);
    }

    ydoc.destroy();
    docs.delete(filePath);

    console.log(`[Yjs] Cleaned up Y.Doc for: ${filePath}`);
  }
}
