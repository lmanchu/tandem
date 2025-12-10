import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { DragEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  RefreshCw,
  FolderOpen,
  Clock,
  ChevronLeft,
  ChevronRight,
  Upload,
  Download,
  Link,
  Check,
  History,
  Copy,
  Search,
  X,
  Pencil,
} from 'lucide-react';
import { VersionHistory } from './VersionHistory';
import { getAuthHeaders } from './PasswordGate';

interface DocumentInfo {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  changesCount: number;
}

interface FileBrowserProps {
  currentDocumentId: string | null;
  onDocumentSelect: (documentId: string) => void;
  onImportFile?: (documentId: string, content: string) => void;
  onExportRequest?: () => string | null;
  apiUrl?: string;
}

export function FileBrowser({
  currentDocumentId,
  onDocumentSelect,
  onImportFile,
  onExportRequest,
  apiUrl = '',
}: FileBrowserProps) {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);
  const [copiedMcpId, setCopiedMcpId] = useState<string | null>(null);
  const [versionHistoryDocId, setVersionHistoryDocId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);

  // Filter documents based on search query
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const query = searchQuery.toLowerCase();
    return documents.filter((doc) =>
      doc.title.toLowerCase().includes(query) ||
      doc.id.toLowerCase().includes(query)
    );
  }, [documents, searchQuery]);

  // Keyboard navigation handler
  const handleListKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (filteredDocuments.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < filteredDocuments.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredDocuments.length - 1
        );
        break;
      case 'Enter':
        if (focusedIndex >= 0 && focusedIndex < filteredDocuments.length) {
          onDocumentSelect(filteredDocuments[focusedIndex].id);
        }
        break;
      case 'Escape':
        if (searchQuery) {
          setSearchQuery('');
          setFocusedIndex(-1);
        }
        break;
    }
  }, [filteredDocuments, focusedIndex, onDocumentSelect, searchQuery]);

  // Reset focused index when search changes
  useEffect(() => {
    setFocusedIndex(searchQuery ? 0 : -1);
  }, [searchQuery]);

  const handleCopyLink = (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/?doc=${docId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedDocId(docId);
      setTimeout(() => setCopiedDocId(null), 2000);
    });
  };

  const handleCopyMcpId = (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Copy format: tandem://doc/{docId} - similar to obsidian:// format
    const mcpUri = `tandem://doc/${docId}`;
    navigator.clipboard.writeText(mcpUri).then(() => {
      setCopiedMcpId(docId);
      setTimeout(() => setCopiedMcpId(null), 2000);
    });
  };

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/documents`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const docs = await response.json();
        setDocuments(docs);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleCreateDocument = async () => {
    if (!newDocTitle.trim()) return;

    try {
      const response = await fetch(`${apiUrl}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ title: newDocTitle.trim() }),
      });

      if (response.ok) {
        const newDoc = await response.json();
        setDocuments((prev) => [newDoc, ...prev]);
        setNewDocTitle('');
        setIsCreating(false);
        onDocumentSelect(newDoc.id);
      }
    } catch (error) {
      console.error('Failed to create document:', error);
    }
  };

  const handleDeleteDocument = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('確定要刪除這個文件嗎？')) return;

    try {
      const response = await fetch(`${apiUrl}/api/documents/${docId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        if (currentDocumentId === docId) {
          onDocumentSelect('');
        }
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const startRename = (docId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingDocId(docId);
    setRenameTitle(currentTitle);
    // Focus input after state update
    setTimeout(() => renameInputRef.current?.focus(), 0);
  };

  const handleRenameDocument = async () => {
    if (!renamingDocId || !renameTitle.trim()) {
      setRenamingDocId(null);
      setRenameTitle('');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/documents/${renamingDocId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ title: renameTitle.trim() }),
      });

      if (response.ok) {
        const updated = await response.json();
        setDocuments((prev) =>
          prev.map((d) => (d.id === renamingDocId ? { ...d, title: updated.title } : d))
        );
      }
    } catch (error) {
      console.error('Failed to rename document:', error);
    } finally {
      setRenamingDocId(null);
      setRenameTitle('');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const title = file.name.replace(/\.(md|txt|markdown)$/i, '');

      // Create document
      const response = await fetch(`${apiUrl}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ title }),
      });

      if (response.ok) {
        const newDoc = await response.json();
        setDocuments((prev) => [newDoc, ...prev]);
        onDocumentSelect(newDoc.id);

        // Notify parent to set content
        if (onImportFile) {
          // Wait a bit for the document to be ready
          setTimeout(() => {
            onImportFile(newDoc.id, content);
          }, 500);
        }
      }
    } catch (error) {
      console.error('Failed to import file:', error);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExport = () => {
    if (!currentDocumentId || !onExportRequest) return;

    const content = onExportRequest();
    if (!content) return;

    const currentDoc = documents.find((d) => d.id === currentDocumentId);
    const filename = `${currentDoc?.title || currentDocumentId}.md`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validExtensions = ['.md', '.txt', '.markdown'];
    const isValidFile = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!isValidFile) {
      alert('請拖放 Markdown 檔案 (.md, .txt, .markdown)');
      return;
    }

    try {
      const content = await file.text();
      const title = file.name.replace(/\.(md|txt|markdown)$/i, '');

      const response = await fetch(`${apiUrl}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ title }),
      });

      if (response.ok) {
        const newDoc = await response.json();
        setDocuments((prev) => [newDoc, ...prev]);
        onDocumentSelect(newDoc.id);

        if (onImportFile) {
          setTimeout(() => {
            onImportFile(newDoc.id, content);
          }, 500);
        }
      }
    } catch (error) {
      console.error('Failed to import dropped file:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '剛才';
    if (diffMins < 60) return `${diffMins} 分鐘前`;
    if (diffHours < 24) return `${diffHours} 小時前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString('zh-TW');
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col items-center py-4">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          title="展開檔案瀏覽器"
        >
          <ChevronRight className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
        </button>
        <div className="mt-4 space-y-2">
          <button
            onClick={() => {
              setIsCollapsed(false);
              setIsCreating(true);
            }}
            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            title="新增文件"
          >
            <Plus className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </button>
          <button
            onClick={fetchDocuments}
            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            title="重新整理"
          >
            <RefreshCw className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-64 bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col relative ${
        isDragging ? 'ring-2 ring-inset ring-blue-500' : ''
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center p-4">
            <Upload className="w-12 h-12 mx-auto text-blue-500 mb-2" />
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              放開以匯入檔案
            </p>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.txt,.markdown"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            <span className="font-medium text-zinc-800 dark:text-zinc-200">文件</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsCreating(true)}
              className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors"
              title="新增文件"
            >
              <Plus className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </button>
            <button
              onClick={handleImportClick}
              className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors"
              title="匯入 Markdown 檔案"
            >
              <Upload className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </button>
            {currentDocumentId && onExportRequest && (
              <button
                onClick={handleExport}
                className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors"
                title="匯出為 Markdown"
              >
                <Download className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              </button>
            )}
            <button
              onClick={fetchDocuments}
              className={`p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors ${
                isLoading ? 'animate-spin' : ''
              }`}
              title="重新整理"
            >
              <RefreshCw className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </button>
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors"
              title="收合"
            >
              <ChevronLeft className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>
        </div>
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋文件..."
            className="w-full pl-8 pr-8 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                listRef.current?.focus();
                handleListKeyDown(e as unknown as ReactKeyboardEvent<HTMLDivElement>);
              } else if (e.key === 'Enter' && filteredDocuments.length > 0) {
                onDocumentSelect(filteredDocuments[0].id);
              } else if (e.key === 'Escape') {
                setSearchQuery('');
              }
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
            >
              <X className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          )}
        </div>
      </div>

      {/* New Document Form */}
      {isCreating && (
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800">
          <input
            type="text"
            value={newDocTitle}
            onChange={(e) => setNewDocTitle(e.target.value)}
            placeholder="文件名稱..."
            className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateDocument();
              if (e.key === 'Escape') {
                setIsCreating(false);
                setNewDocTitle('');
              }
            }}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleCreateDocument}
              className="flex-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              建立
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewDocTitle('');
              }}
              className="px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Document List */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto focus:outline-none"
        tabIndex={0}
        onKeyDown={handleListKeyDown}
      >
        {documents.length === 0 && !isLoading && (
          <div className="p-4 text-center text-zinc-500 dark:text-zinc-400 text-sm">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>尚無文件</p>
            <p className="text-xs mt-1">點擊 + 建立新文件</p>
          </div>
        )}

        {searchQuery && filteredDocuments.length === 0 && documents.length > 0 && (
          <div className="p-4 text-center text-zinc-500 dark:text-zinc-400 text-sm">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>找不到符合的文件</p>
            <p className="text-xs mt-1">嘗試其他關鍵字</p>
          </div>
        )}

        {filteredDocuments.map((doc, index) => (
          <div
            key={doc.id}
            onClick={() => onDocumentSelect(doc.id)}
            className={`p-3 border-b border-zinc-100 dark:border-zinc-800 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group ${
              currentDocumentId === doc.id
                ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500'
                : ''
            } ${
              focusedIndex === index
                ? 'ring-2 ring-inset ring-blue-400 dark:ring-blue-500'
                : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText
                  className={`w-4 h-4 flex-shrink-0 ${
                    currentDocumentId === doc.id
                      ? 'text-blue-500'
                      : 'text-zinc-400 dark:text-zinc-500'
                  }`}
                />
                {renamingDocId === doc.id ? (
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renameTitle}
                    onChange={(e) => setRenameTitle(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        handleRenameDocument();
                      } else if (e.key === 'Escape') {
                        setRenamingDocId(null);
                        setRenameTitle('');
                      }
                    }}
                    onBlur={handleRenameDocument}
                    className="flex-1 min-w-0 px-2 py-0.5 text-sm border border-blue-400 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <span
                    className={`text-sm truncate ${
                      currentDocumentId === doc.id
                        ? 'text-blue-700 dark:text-blue-300 font-medium'
                        : 'text-zinc-700 dark:text-zinc-300'
                    }`}
                    onDoubleClick={(e) => startRename(doc.id, doc.title, e)}
                  >
                    {doc.title}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={(e) => startRename(doc.id, doc.title, e)}
                  className="p-1 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded"
                  title="重新命名"
                >
                  <Pencil className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-500" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setVersionHistoryDocId(doc.id);
                  }}
                  className="p-1 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded"
                  title="版本歷史"
                >
                  <History className="w-3.5 h-3.5 text-purple-500" />
                </button>
                <button
                  onClick={(e) => handleCopyMcpId(doc.id, e)}
                  className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                  title="複製 MCP 文件連結 (tandem://doc/...)"
                >
                  {copiedMcpId === doc.id ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-green-600" />
                  )}
                </button>
                <button
                  onClick={(e) => handleCopyLink(doc.id, e)}
                  className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                  title="複製分享連結"
                >
                  {copiedDocId === doc.id ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Link className="w-3.5 h-3.5 text-blue-500" />
                  )}
                </button>
                <button
                  onClick={(e) => handleDeleteDocument(doc.id, e)}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                  title="刪除"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1 ml-6 text-xs text-zinc-400 dark:text-zinc-500">
              <Clock className="w-3 h-3" />
              <span>{formatDate(doc.updatedAt)}</span>
              {doc.changesCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded text-[10px]">
                  {doc.changesCount} 修改
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Version History Modal */}
      <VersionHistory
        isOpen={versionHistoryDocId !== null}
        onClose={() => setVersionHistoryDocId(null)}
        documentId={versionHistoryDocId}
      />
    </div>
  );
}

export default FileBrowser;
