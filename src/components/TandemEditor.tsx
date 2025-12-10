import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { useEffect, useMemo, useState, useCallback } from 'react';
import type { Author, Change } from '../types/track';
import { TrackChanges } from '../extensions/TrackChanges';
import { Comments, type CommentData } from '../extensions/Comments';
import { Mention, type MentionUser } from '../extensions/Mention';
import { Toolbar } from './Toolbar';
import { TrackChangesSidebar } from './TrackChangesSidebar';
import { CommentsSidebar } from './CommentsSidebar';
import { AIAssistant } from './AIAssistant';
import { AISettingsModal } from './AISettingsModal';
import { SearchReplace } from './SearchReplace';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { MentionList, type MentionListRef } from './MentionList';
import { ReactRenderer } from '@tiptap/react';
import tippy, { type Instance } from 'tippy.js';

// Create lowlight instance with common languages
const lowlight = createLowlight(common);

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(false);
  const [comments, setComments] = useState<CommentData[]>([]);

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
        codeBlock: false, // Use CodeBlockLowlight instead
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
      // Table extensions
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'bg-gray-100 dark:bg-zinc-800 font-semibold text-left p-2 border border-gray-300 dark:border-zinc-600',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'p-2 border border-gray-300 dark:border-zinc-600',
        },
      }),
      // Code block with syntax highlighting
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm font-mono',
        },
      }),
      // Comments extension
      Comments.configure({
        ydoc,
        onCommentAdded: (comment) => {
          setComments((prev) => [...prev, comment]);
        },
        onCommentRemoved: (commentId) => {
          setComments((prev) => prev.filter((c) => c.id !== commentId));
        },
        onCommentsUpdated: setComments,
      }),
      // Mention extension for @mentions
      Mention.configure({
        suggestion: {
          items: ({ query }: { query: string }) => {
            // Get all users from collaborators + current author
            const allUsers: MentionUser[] = [
              { id: author.id, name: author.name, color: author.color },
              ...collaborators.map((c) => ({
                id: String(c.clientId),
                name: c.name,
                color: c.color,
              })),
            ];
            return allUsers
              .filter((user) =>
                user.name.toLowerCase().includes(query.toLowerCase())
              )
              .slice(0, 5);
          },
          render: () => {
            let component: ReactRenderer<MentionListRef> | null = null;
            let popup: Instance[] | null = null;

            return {
              onStart: (props) => {
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor,
                });

                if (!props.clientRect) return;

                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                });
              },
              onUpdate(props) {
                component?.updateProps(props);

                if (!props.clientRect) return;

                popup?.[0]?.setProps({
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                });
              },
              onKeyDown(props) {
                if (props.event.key === 'Escape') {
                  popup?.[0]?.hide();
                  return true;
                }
                return component?.ref?.onKeyDown(props) ?? false;
              },
              onExit() {
                popup?.[0]?.destroy();
                component?.destroy();
              },
            };
          },
        },
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

  // Insert table
  const insertTable = () => {
    if (editor) {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    }
  };

  // Add comment to selected text
  const addComment = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) {
      alert('請先選取要留言的文字');
      return;
    }

    const content = prompt('輸入留言內容：');
    if (!content?.trim()) return;

    const commentId = crypto.randomUUID();
    editor.commands.addComment({
      id: commentId,
      content: content.trim(),
      authorId: author.id,
      authorName: author.name,
      authorColor: author.color,
      timestamp: new Date().toISOString(),
    });
    setCommentsEnabled(true);
  };

  // Resolve comment
  const resolveComment = (commentId: string) => {
    if (editor) {
      editor.commands.resolveComment(commentId, author.name);
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, resolved: true, resolvedBy: author.name, resolvedAt: new Date().toISOString() }
            : c
        )
      );
    }
  };

  // Unresolve comment
  const unresolveComment = (commentId: string) => {
    if (editor) {
      editor.commands.unresolveComment(commentId);
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, resolved: false, resolvedBy: undefined, resolvedAt: undefined }
            : c
        )
      );
    }
  };

  // Delete comment
  const deleteComment = (commentId: string) => {
    if (editor) {
      editor.commands.removeComment(commentId);
    }
  };

  // Reply to comment
  const replyToComment = (commentId: string, content: string) => {
    const reply = {
      id: crypto.randomUUID(),
      content,
      authorId: author.id,
      authorName: author.name,
      authorColor: author.color,
      timestamp: new Date().toISOString(),
    };
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c
      )
    );
    // Also update in ydoc if available
    if (ydoc) {
      const commentsMap = ydoc.getMap('comments');
      const comment = commentsMap.get(commentId) as CommentData | undefined;
      if (comment) {
        commentsMap.set(commentId, { ...comment, replies: [...comment.replies, reply] });
      }
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

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + F for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
      }
      // Cmd/Ctrl + / for shortcuts help
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShortcutsOpen(true);
      }
      // Escape to close modals
      if (e.key === 'Escape') {
        if (searchOpen) setSearchOpen(false);
        if (shortcutsOpen) setShortcutsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, shortcutsOpen]);

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSynced && isConnected) {
        e.preventDefault();
        e.returnValue = '您有未儲存的變更，確定要離開嗎？';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSynced, isConnected]);

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
        onInsertTable={insertTable}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        commentsEnabled={commentsEnabled}
        onToggleComments={() => setCommentsEnabled(!commentsEnabled)}
        onAddComment={addComment}
        commentsCount={comments.filter((c) => !c.resolved).length}
        documentTitle={documentId}
        documentId={documentId}
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

        {commentsEnabled && (
          <CommentsSidebar
            comments={comments}
            currentAuthor={author}
            onResolve={resolveComment}
            onUnresolve={unresolveComment}
            onDelete={deleteComment}
            onReply={replyToComment}
          />
        )}

        <SearchReplace
          editor={editor}
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
        />
      </div>

      <AISettingsModal
        isOpen={aiSettingsOpen}
        onClose={() => setAiSettingsOpen(false)}
      />

      <KeyboardShortcuts
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  );
}

export default TandemEditor;
