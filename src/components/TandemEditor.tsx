import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useEffect, useMemo, useState } from 'react';
import type { Author } from '../types/track';
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
    ],
    onUpdate: ({ editor }) => {
      if (onContentChange) {
        onContentChange(editor.getHTML());
      }
    },
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      provider.destroy();
      ydoc.destroy();
    };
  }, [provider, ydoc]);

  return (
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
      </div>

      <EditorContent editor={editor} className="tandem-editor-content" />
    </div>
  );
}

export default TandemEditor;
