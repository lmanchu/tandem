/**
 * Tandem Track File Types
 * Based on specs/TRACK-FORMAT.md
 */

export type AuthorType = 'human' | 'ai';
export type ChangeType = 'insert' | 'delete' | 'replace' | 'format';
export type RevisionStatus = 'pending' | 'accepted' | 'rejected';

export interface Author {
  id: string;
  type: AuthorType;
  name: string;
  email?: string;
  model?: string;
  avatar?: string;
  color: string;
}

export interface Position {
  line: number;
  column: number;
  offset: number;
  pmPos?: number;
}

export interface Change {
  id: string;
  type: ChangeType;
  anchor: Position;
  content?: string;
  length?: number;
  oldContent?: string;
  format?: {
    type: string;
    value: any;
  };
}

export interface Revision {
  id: string;
  parentId: string | null;
  timestamp: string;
  authorId: string;
  changes: Change[];
  message?: string;
  status: RevisionStatus;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface Comment {
  id: string;
  timestamp: string;
  authorId: string;
  target: {
    type: 'revision' | 'range' | 'document';
    revisionId?: string;
    anchor?: Position;
    head?: Position;
  };
  content: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  parentId?: string;
  children?: string[];
}

export interface TrackFile {
  version: '1.0';
  schema: 'tandem-track-v1';
  documentId: string;
  createdAt: string;
  updatedAt: string;
  baseContent: string;
  currentContent: string;
  authors: Author[];
  revisions: Revision[];
  comments: Comment[];
}

// Helper to create a new author
export function createAuthor(
  type: AuthorType,
  name: string,
  options?: Partial<Author>
): Author {
  return {
    id: crypto.randomUUID(),
    type,
    name,
    color: type === 'human' ? '#3B82F6' : '#8B5CF6',
    ...options,
  };
}

// Helper to create a new track file
export function createTrackFile(
  documentId: string,
  author: Author,
  initialContent: string
): TrackFile {
  const now = new Date().toISOString();
  return {
    version: '1.0',
    schema: 'tandem-track-v1',
    documentId,
    createdAt: now,
    updatedAt: now,
    baseContent: '', // Would be hash in real implementation
    currentContent: '',
    authors: [author],
    revisions: [
      {
        id: crypto.randomUUID(),
        parentId: null,
        timestamp: now,
        authorId: author.id,
        changes: [
          {
            id: crypto.randomUUID(),
            type: 'insert',
            anchor: { line: 1, column: 1, offset: 0 },
            content: initialContent,
          },
        ],
        status: 'accepted',
      },
    ],
    comments: [],
  };
}
