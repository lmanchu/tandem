import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Author, Change } from '../types/track';

export interface TrackChangesOptions {
  enabled: boolean;
  author: Author;
  onChangeRecorded?: (change: Change) => void;
}

export interface TrackChangesStorage {
  changes: Change[];
  enabled: boolean;
}

export const trackChangesPluginKey = new PluginKey('trackChanges');

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    trackChanges: {
      toggleTrackChanges: () => ReturnType;
      enableTrackChanges: () => ReturnType;
      disableTrackChanges: () => ReturnType;
      acceptChange: (changeId: string) => ReturnType;
      rejectChange: (changeId: string) => ReturnType;
      acceptAllChanges: () => ReturnType;
      rejectAllChanges: () => ReturnType;
    };
  }
}

export const TrackChanges = Extension.create<TrackChangesOptions, TrackChangesStorage>({
  name: 'trackChanges',

  addOptions() {
    return {
      enabled: false,
      author: {
        id: 'anonymous',
        type: 'human',
        name: 'Anonymous',
        color: '#3B82F6',
      },
      onChangeRecorded: undefined,
    };
  },

  addStorage() {
    return {
      changes: [],
      enabled: this.options.enabled,
    };
  },

  addCommands() {
    return {
      toggleTrackChanges:
        () =>
        ({ editor }) => {
          this.storage.enabled = !this.storage.enabled;
          editor.view.dispatch(editor.state.tr);
          return true;
        },

      enableTrackChanges:
        () =>
        ({ editor }) => {
          this.storage.enabled = true;
          editor.view.dispatch(editor.state.tr);
          return true;
        },

      disableTrackChanges:
        () =>
        ({ editor }) => {
          this.storage.enabled = false;
          editor.view.dispatch(editor.state.tr);
          return true;
        },

      acceptChange:
        (changeId: string) =>
        ({ editor, tr }) => {
          const change = this.storage.changes.find((c) => c.id === changeId);
          if (!change) return false;

          // Remove from storage
          this.storage.changes = this.storage.changes.filter((c) => c.id !== changeId);

          // If it's a deletion, actually delete the content
          if (change.type === 'delete' && change.anchor.pmPos !== undefined) {
            const pos = change.anchor.pmPos;
            const length = change.length || 0;
            tr.delete(pos, pos + length);
          }

          editor.view.dispatch(tr);
          return true;
        },

      rejectChange:
        (changeId: string) =>
        ({ editor, tr }) => {
          const change = this.storage.changes.find((c) => c.id === changeId);
          if (!change) return false;

          // Remove from storage
          this.storage.changes = this.storage.changes.filter((c) => c.id !== changeId);

          // If it's an insertion, delete the inserted content
          if (change.type === 'insert' && change.anchor.pmPos !== undefined) {
            const pos = change.anchor.pmPos;
            const length = change.content?.length || 0;
            tr.delete(pos, pos + length);
          }
          // If it's a deletion, restore the deleted content
          else if (change.type === 'delete' && change.anchor.pmPos !== undefined) {
            const pos = change.anchor.pmPos;
            tr.insertText(change.oldContent || '', pos);
          }

          editor.view.dispatch(tr);
          return true;
        },

      acceptAllChanges:
        () =>
        ({ commands }) => {
          const changes = [...this.storage.changes];
          changes.forEach((change) => {
            commands.acceptChange(change.id);
          });
          return true;
        },

      rejectAllChanges:
        () =>
        ({ commands }) => {
          const changes = [...this.storage.changes];
          changes.forEach((change) => {
            commands.rejectChange(change.id);
          });
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: trackChangesPluginKey,

        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, _oldDecorations) {
            if (!extension.storage.enabled) {
              return DecorationSet.empty;
            }

            // Create decorations for all tracked changes
            const decorations: Decoration[] = [];

            extension.storage.changes.forEach((change) => {
              if (change.anchor.pmPos === undefined) return;

              const from = change.anchor.pmPos;
              let to = from;

              if (change.type === 'insert' && change.content) {
                to = from + change.content.length;
                decorations.push(
                  Decoration.inline(from, to, {
                    class: 'track-insert',
                    'data-change-id': change.id,
                    'data-author-type': extension.options.author.type,
                    style: `background-color: rgba(34, 197, 94, 0.2); border-bottom: 2px solid #22c55e;`,
                  })
                );
              } else if (change.type === 'delete' && change.length) {
                to = from + change.length;
                decorations.push(
                  Decoration.inline(from, to, {
                    class: 'track-delete',
                    'data-change-id': change.id,
                    'data-author-type': extension.options.author.type,
                    style: `background-color: rgba(239, 68, 68, 0.2); text-decoration: line-through; color: #ef4444;`,
                  })
                );
              }
            });

            return DecorationSet.create(tr.doc, decorations);
          },
        },

        props: {
          decorations(state) {
            return this.getState(state);
          },
        },

        appendTransaction(transactions, _oldState, newState) {
          if (!extension.storage.enabled) return null;

          // Check if there were any content changes
          const docChanged = transactions.some((tr) => tr.docChanged);
          if (!docChanged) return null;

          // Track insertions and deletions
          transactions.forEach((tr) => {
            if (!tr.docChanged) return;

            tr.steps.forEach((step, index) => {
              const stepMap = step.getMap();
              const doc = tr.docs[index];

              stepMap.forEach((oldStart, oldEnd, newStart, newEnd) => {
                // Deletion
                if (oldEnd > oldStart && newEnd === newStart) {
                  const deletedContent = doc.textBetween(oldStart, oldEnd);
                  const change: Change = {
                    id: crypto.randomUUID(),
                    type: 'delete',
                    anchor: {
                      line: 0,
                      column: 0,
                      offset: oldStart,
                      pmPos: newStart,
                    },
                    oldContent: deletedContent,
                    length: deletedContent.length,
                  };
                  extension.storage.changes.push(change);
                  extension.options.onChangeRecorded?.(change);
                }
                // Insertion
                else if (newEnd > newStart && oldEnd === oldStart) {
                  const insertedContent = newState.doc.textBetween(newStart, newEnd);
                  const change: Change = {
                    id: crypto.randomUUID(),
                    type: 'insert',
                    anchor: {
                      line: 0,
                      column: 0,
                      offset: newStart,
                      pmPos: newStart,
                    },
                    content: insertedContent,
                  };
                  extension.storage.changes.push(change);
                  extension.options.onChangeRecorded?.(change);
                }
              });
            });
          });

          return null;
        },
      }),
    ];
  },
});

export default TrackChanges;
