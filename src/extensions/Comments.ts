import { Mark, mergeAttributes } from '@tiptap/core';
import type * as Y from 'yjs';

export interface CommentMarkAttributes {
  commentId: string;
  authorId: string;
  authorName: string;
  authorColor: string;
}

export interface CommentData {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorColor: string;
  timestamp: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  replies: CommentReply[];
}

export interface CommentReply {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorColor: string;
  timestamp: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comments: {
      addComment: (comment: Omit<CommentData, 'replies' | 'resolved'>) => ReturnType;
      removeComment: (commentId: string) => ReturnType;
      resolveComment: (commentId: string, resolvedBy: string) => ReturnType;
      unresolveComment: (commentId: string) => ReturnType;
    };
  }
}

export interface CommentsOptions {
  HTMLAttributes: Record<string, unknown>;
  ydoc?: Y.Doc;
  onCommentAdded?: (comment: CommentData) => void;
  onCommentRemoved?: (commentId: string) => void;
  onCommentResolved?: (commentId: string, resolvedBy: string) => void;
  onCommentsUpdated?: (comments: CommentData[]) => void;
}

export const Comments = Mark.create<CommentsOptions>({
  name: 'comment',

  addOptions() {
    return {
      HTMLAttributes: {},
      ydoc: undefined,
      onCommentAdded: undefined,
      onCommentRemoved: undefined,
      onCommentResolved: undefined,
      onCommentsUpdated: undefined,
    };
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-comment-id'),
        renderHTML: (attributes) => {
          if (!attributes.commentId) return {};
          return { 'data-comment-id': attributes.commentId };
        },
      },
      authorId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-author-id'),
        renderHTML: (attributes) => {
          if (!attributes.authorId) return {};
          return { 'data-author-id': attributes.authorId };
        },
      },
      authorName: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-author-name'),
        renderHTML: (attributes) => {
          if (!attributes.authorName) return {};
          return { 'data-author-name': attributes.authorName };
        },
      },
      authorColor: {
        default: '#FEF08A',
        parseHTML: (element) => element.getAttribute('data-author-color'),
        renderHTML: (attributes) => {
          return { 'data-author-color': attributes.authorColor || '#FEF08A' };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-comment-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const color = HTMLAttributes['data-author-color'] || '#FEF08A';
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'comment-highlight',
        style: `background-color: ${color}40; border-bottom: 2px solid ${color};`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      addComment:
        (comment) =>
        ({ chain, state }) => {
          const { from, to } = state.selection;
          if (from === to) return false;

          const commentData: CommentData = {
            ...comment,
            resolved: false,
            replies: [],
          };

          // Store comment in Yjs if available
          if (this.options.ydoc) {
            const commentsMap = this.options.ydoc.getMap('comments');
            commentsMap.set(comment.id, commentData);
          }

          this.options.onCommentAdded?.(commentData);

          return chain()
            .setMark('comment', {
              commentId: comment.id,
              authorId: comment.authorId,
              authorName: comment.authorName,
              authorColor: comment.authorColor,
            })
            .run();
        },

      removeComment:
        (commentId) =>
        ({ tr, state, dispatch }) => {
          const { doc } = state;
          let found = false;

          doc.descendants((node, pos) => {
            node.marks.forEach((mark) => {
              if (mark.type.name === 'comment' && mark.attrs.commentId === commentId) {
                found = true;
                if (dispatch) {
                  tr.removeMark(pos, pos + node.nodeSize, mark);
                }
              }
            });
          });

          if (found) {
            if (this.options.ydoc) {
              const commentsMap = this.options.ydoc.getMap('comments');
              commentsMap.delete(commentId);
            }
            this.options.onCommentRemoved?.(commentId);
            if (dispatch) {
              dispatch(tr);
            }
          }

          return found;
        },

      resolveComment:
        (commentId, resolvedBy) =>
        ({ tr, dispatch }) => {
          if (this.options.ydoc) {
            const commentsMap = this.options.ydoc.getMap('comments');
            const comment = commentsMap.get(commentId) as CommentData | undefined;
            if (comment) {
              commentsMap.set(commentId, {
                ...comment,
                resolved: true,
                resolvedBy,
                resolvedAt: new Date().toISOString(),
              });
            }
          }
          this.options.onCommentResolved?.(commentId, resolvedBy);
          if (dispatch) {
            dispatch(tr);
          }
          return true;
        },

      unresolveComment:
        (commentId) =>
        ({ tr, dispatch }) => {
          if (this.options.ydoc) {
            const commentsMap = this.options.ydoc.getMap('comments');
            const comment = commentsMap.get(commentId) as CommentData | undefined;
            if (comment) {
              const { resolvedBy: _rb, resolvedAt: _ra, ...rest } = comment;
              commentsMap.set(commentId, {
                ...rest,
                resolved: false,
              });
            }
          }
          if (dispatch) {
            dispatch(tr);
          }
          return true;
        },
    };
  },
});

export default Comments;
