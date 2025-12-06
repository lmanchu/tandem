import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useEffect, useMemo, useState, useCallback } from 'react';
import type { Author, Change } from '../types/track';
import { TrackChanges } from '../extensions/TrackChanges';
import './TandemEditor.css';

interface TandemEditorProps {
  documentId: string;
  author: Author;
  serverUrl?: string;
  onContentChange?: (content: string) => void;
}

export function TandemEditor({
  documentId,
  author,
  serverUrl = 'ws://localhost:1234',
  onContentChange,
}: TandemEditorProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [changes, setChanges] = useState<Change[]>([]);

  const handleChangeRecorded = useCallback((change: Change) => {
    setChanges((prev) => [...prev, change]);
  }, []);

  // Create Yjs document
  const ydoc = useMemo(() => new Y.Doc(), []);

  // Create WebSocket provider for collaboration
  const provider = useMemo(() => {
    const wsProvider = new WebsocketProvider(serverUrl, documentId, ydoc);

    wsProvider.on('status', (event: { status: string }) => {
      setIsConnected(event.status === 'connected');
    });

    return wsProvider;
  }, [serverUrl, documentId, ydoc]);

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // Disable default history, Yjs handles it
      }),
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider,
        user: {
          name: author.name,
          color: author.color,
        },
      }),
      TrackChanges.configure({
        enabled: trackingEnabled,
        author,
        onChangeRecorded: handleChangeRecorded,
      }),
    ],
    onUpdate: ({ editor }) => {
      if (onContentChange) {
        onContentChange(editor.getHTML());
      }
    },
  });

  // Toggle track changes
  const toggleTracking = () => {
    if (editor) {
      editor.commands.toggleTrackChanges();
      setTrackingEnabled(!trackingEnabled);
    }
  };

  // Accept a single change
  const acceptChange = (changeId: string) => {
    if (editor) {
      editor.commands.acceptChange(changeId);
      setChanges((prev) => prev.filter((c) => c.id !== changeId));
    }
  };

  // Reject a single change
  const rejectChange = (changeId: string) => {
    if (editor) {
      editor.commands.rejectChange(changeId);
      setChanges((prev) => prev.filter((c) => c.id !== changeId));
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      provider.destroy();
      ydoc.destroy();
    };
  }, [provider, ydoc]);

  return (
    <div className="tandem-editor-wrapper">
      <div className="tandem-editor">
        <div className="tandem-editor-header">
          <div className="connection-status">
            <span
              className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}
            />
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          <div className="author-info">
            <span
              className="author-badge"
              style={{ backgroundColor: author.color }}
            >
              {author.type === 'ai' ? '🤖' : '👤'} {author.name}
            </span>
          </div>
        </div>

        <div className="tandem-editor-toolbar">
          <button
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={editor?.isActive('bold') ? 'is-active' : ''}
          >
            B
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={editor?.isActive('italic') ? 'is-active' : ''}
          >
            I
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            className={editor?.isActive('heading', { level: 1 }) ? 'is-active' : ''}
          >
            H1
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor?.isActive('heading', { level: 2 }) ? 'is-active' : ''}
          >
            H2
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className={editor?.isActive('bulletList') ? 'is-active' : ''}
          >
            • List
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            className={editor?.isActive('codeBlock') ? 'is-active' : ''}
          >
            Code
          </button>
          <div className="toolbar-divider" />
          <button
            onClick={toggleTracking}
            className={trackingEnabled ? 'is-active track-toggle' : 'track-toggle'}
          >
            {trackingEnabled ? '📝 Tracking ON' : '📝 Track Changes'}
          </button>
        </div>

        <EditorContent editor={editor} className="tandem-editor-content" />
      </div>

      {trackingEnabled && changes.length > 0 && (
        <div className="changes-sidebar">
          <div className="changes-header">
            <h3>Changes ({changes.length})</h3>
          </div>
          <div className="changes-list">
            {changes.map((change) => (
              <div key={change.id} className={`change-item change-${change.type}`}>
                <div className="change-content">
                  {change.type === 'insert' && (
                    <span className="change-text insert">+ {change.content}</span>
                  )}
                  {change.type === 'delete' && (
                    <span className="change-text delete">- {change.oldContent}</span>
                  )}
                </div>
                <div className="change-actions">
                  <button
                    className="accept-btn"
                    onClick={() => acceptChange(change.id)}
                    title="Accept"
                  >
                    ✓
                  </button>
                  <button
                    className="reject-btn"
                    onClick={() => rejectChange(change.id)}
                    title="Reject"
                  >
                    ✗
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TandemEditor;
