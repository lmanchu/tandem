import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Image from '@tiptap/extension-image';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { useEffect, useMemo, useState, useCallback } from 'react';
import type { Author, Change } from '../types/track';
import { TrackChanges } from '../extensions/TrackChanges';
import { Toolbar } from './Toolbar';
import { TrackChangesSidebar } from './TrackChangesSidebar';
import { AIAssistant } from './AIAssistant';
import { AISettingsModal } from './AISettingsModal';

// Collaborator type for awareness
export interface Collaborator {
  clientId: number;
  name: string;
  color: string;
}

interface TandemEditorProps {
  documentId: string;
  author: Author;
  serverUrl?: string;
  onContentChange?: (content: string) => void;
  onEditorReady?: (editor: ReturnType<typeof useEditor>) => void;
}

// Get WebSocket URL based on current location
const getWsUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
};

export function TandemEditor({
  documentId,
  author,
  serverUrl = getWsUrl(),
  onContentChange,
  onEditorReady,
}: TandemEditorProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [changes, setChanges] = useState<Change[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);

  const handleChangeRecorded = useCallback((change: Change) => {
    setChanges((prev) => [...prev, change]);
  }, []);

  // Create Yjs document
  const ydoc = useMemo(() => new Y.Doc(), []);

  // Create Hocuspocus provider for collaboration
  const provider = useMemo(() => {
    const hocuspocusProvider = new HocuspocusProvider({
      url: serverUrl,
      name: documentId,
      document: ydoc,
      onStatus: ({ status }) => {
        setIsConnected(status === 'connected');
      },
      onSynced: ({ state }) => {
        setIsSynced(state);
        if (state) {
          setLastSavedAt(new Date());
        }
      },
      onDisconnect: () => {
        setIsSynced(false);
      },
    });

    return hocuspocusProvider;
  }, [serverUrl, documentId, ydoc]);

  // Initialize TipTap editor
  const editor = useEditor({
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none max-w-none min-h-[500px]',
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const src = e.target?.result as string;
                view.dispatch(
                  view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({ src })
                  )
                );
              };
              reader.readAsDataURL(file);
              return true;
            }
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;

        for (const file of files) {
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = (e) => {
              const src = e.target?.result as string;
              const coordinates = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              if (coordinates) {
                view.dispatch(
                  view.state.tr.insert(
                    coordinates.pos,
                    view.state.schema.nodes.image.create({ src })
                  )
                );
              }
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
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
        ydoc,
        onChangeRecorded: handleChangeRecorded,
        onChangesUpdated: setChanges,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
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

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Subscribe to awareness changes for collaborator list
  useEffect(() => {
    const awareness = provider.awareness;
    if (!awareness) return;

    const updateCollaborators = () => {
      const states = awareness.getStates();
      const myClientId = awareness.clientID;
      const others: Collaborator[] = [];

      states.forEach((state, clientId) => {
        // Skip self
        if (clientId === myClientId) return;

        // Get user info from state
        const user = state.user as { name?: string; color?: string } | undefined;
        if (user?.name) {
          others.push({
            clientId,
            name: user.name,
            color: user.color || '#888888',
          });
        }
      });

      setCollaborators(others);
    };

    // Initial update
    updateCollaborators();

    // Listen for changes
    awareness.on('change', updateCollaborators);

    return () => {
      awareness.off('change', updateCollaborators);
    };
  }, [provider]);

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
        isSynced={isSynced}
        lastSavedAt={lastSavedAt}
        author={author}
        collaborators={collaborators}
        aiEnabled={aiEnabled}
        onToggleAI={() => setAiEnabled(!aiEnabled)}
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

        {aiEnabled && (
          <AIAssistant
            isOpen={aiEnabled}
            onClose={() => setAiEnabled(false)}
            onOpenSettings={() => setAiSettingsOpen(true)}
            editor={editor}
          />
        )}
      </div>

      <AISettingsModal
        isOpen={aiSettingsOpen}
        onClose={() => setAiSettingsOpen(false)}
      />
    </div>
  );
}

export default TandemEditor;
