/**
 * Yjs WebSocket Client
 * Handles real-time collaboration via Socket.io
 */

import * as Y from 'yjs';
import { io, Socket } from 'socket.io-client';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

export class YjsClient {
  private socket: Socket | null = null;
  private doc: Y.Doc | null = null;
  private currentFilePath: string | null = null;
  private connected = false;

  constructor(private url: string = 'http://localhost:3000') {}

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.socket) return;

    this.socket = io(this.url, {
      path: '/socket.io/',
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('[Yjs Client] Connected to server');
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('[Yjs Client] Disconnected from server');
      this.connected = false;
    });

    this.socket.on('yjs:sync', (message: Uint8Array) => {
      if (!this.doc) return;

      const decoder = decoding.createDecoder(message);
      const messageType = decoding.readVarUint(decoder);

      if (messageType === MESSAGE_SYNC) {
        this.handleSyncMessage(decoder);
      }
    });

    this.socket.on('yjs:awareness', (message: Uint8Array) => {
      // Handle awareness updates (cursors, presence)
      console.log('[Yjs Client] Received awareness update');
    });
  }

  /**
   * Subscribe to a file for collaboration
   */
  subscribe(filePath: string, initialContent?: string): Y.Doc {
    if (!this.socket) {
      throw new Error('Socket not connected. Call connect() first.');
    }

    // Clean up previous subscription
    if (this.doc && this.currentFilePath !== filePath) {
      this.unsubscribe();
    }

    // Create new Y.Doc
    this.doc = new Y.Doc();
    this.currentFilePath = filePath;

    // Set up update handler to send changes to server
    this.doc.on('update', this.handleLocalUpdate);

    // Subscribe to file on server
    this.socket.emit('yjs:subscribe', {
      filePath,
      content: initialContent
    });

    console.log(`[Yjs Client] Subscribed to: ${filePath}`);

    return this.doc;
  }

  /**
   * Unsubscribe from current file
   */
  unsubscribe() {
    if (this.doc) {
      this.doc.off('update', this.handleLocalUpdate);
      this.doc.destroy();
      this.doc = null;
    }

    this.currentFilePath = null;
    console.log('[Yjs Client] Unsubscribed');
  }

  /**
   * Handle local updates (send to server)
   */
  private handleLocalUpdate = (update: Uint8Array, origin: any) => {
    if (!this.socket || !this.connected || origin === 'server') return;

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    encoding.writeVarUint8Array(encoder, update);

    this.socket.emit('yjs:sync', encoding.toUint8Array(encoder));
  };

  /**
   * Handle sync messages from server
   */
  private handleSyncMessage(decoder: decoding.Decoder) {
    if (!this.doc) return;

    // Apply update from server
    const update = decoding.readVarUint8Array(decoder);
    Y.applyUpdate(this.doc, update, 'server');
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    this.unsubscribe();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.connected = false;
    console.log('[Yjs Client] Disconnected');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get current Y.Doc
   */
  getDoc(): Y.Doc | null {
    return this.doc;
  }
}

// Global instance
export const yjsClient = new YjsClient();
