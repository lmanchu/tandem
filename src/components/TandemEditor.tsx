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
import { Toolbar } from './Toolbar';
import { TrackChangesSidebar } from './TrackChangesSidebar';

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
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none max-w-none min-h-[500px]',
      },
    },
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
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
      <Toolbar
        editor={editor}
        trackingEnabled={trackingEnabled}
        onToggleTracking={toggleTracking}
        isConnected={isConnected}
        author={author}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <div className="max-w-3xl mx-auto py-12 px-8">
            <EditorContent editor={editor} />
          </div>
        </div>

        {trackingEnabled && (
          <TrackChangesSidebar
            changes={changes}
            onAccept={acceptChange}
            onReject={rejectChange}
          />
        )}
      </div>
    </div>
  );
}

export default TandemEditor;
