import { useState, useEffect, useCallback } from 'react';
import { X, History, RotateCcw, Clock, FileText } from 'lucide-react';

interface Version {
  id: string;
  timestamp: string;
  size: number;
}

interface VersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string | null;
  onRestore?: () => void;
}

const API_BASE = '';

const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '剛剛';
  if (diffMins < 60) return `${diffMins} 分鐘前`;
  if (diffHours < 24) return `${diffHours} 小時前`;
  if (diffDays < 7) return `${diffDays} 天前`;

  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function VersionHistory({ isOpen, onClose, documentId, onRestore }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    if (!documentId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/documents/${documentId}/versions`);
      if (!response.ok) throw new Error('Failed to fetch versions');
      const data = await response.json();
      setVersions(data);
    } catch (err) {
      setError('無法載入版本歷史');
      console.error('Error fetching versions:', err);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (isOpen && documentId) {
      fetchVersions();
    }
  }, [isOpen, documentId, fetchVersions]);

  const handleRestore = async (versionId: string) => {
    if (!documentId || restoring) return;

    setRestoring(versionId);
    try {
      const response = await fetch(
        `${API_BASE}/api/documents/${documentId}/versions/${versionId}/restore`,
        { method: 'POST' }
      );

      if (!response.ok) throw new Error('Failed to restore version');

      // Refresh the page to reload the document with restored content
      onRestore?.();
      onClose();
      window.location.reload();
    } catch (err) {
      setError('還原版本失敗');
      console.error('Error restoring version:', err);
    } finally {
      setRestoring(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">版本歷史</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-zinc-700 mb-3" />
              <p className="text-gray-500 dark:text-zinc-400">尚無版本歷史</p>
              <p className="text-sm text-gray-400 dark:text-zinc-500 mt-1">
                編輯文件後，系統會自動保存版本快照
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {index === 0 ? '最新版本' : `版本 ${versions.length - index}`}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400 flex items-center gap-2">
                        <span>{formatDate(version.timestamp)}</span>
                        <span className="text-gray-300 dark:text-zinc-600">|</span>
                        <span>{formatSize(version.size)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestore(version.id)}
                    disabled={restoring !== null}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {restoring === version.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                    ) : (
                      <RotateCcw className="w-4 h-4" />
                    )}
                    還原
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/30 rounded-b-xl">
          <p className="text-xs text-gray-500 dark:text-zinc-400 text-center">
            系統每 5 分鐘自動保存一個版本，最多保留 50 個版本
          </p>
        </div>
      </div>
    </div>
  );
}
