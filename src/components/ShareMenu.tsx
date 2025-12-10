import { useState, useRef } from 'react';
import { Share2, Link, Copy, Check, Users, Globe, Lock, ChevronDown } from 'lucide-react';

interface ShareMenuProps {
  documentId: string;
  documentTitle: string;
  isPublic?: boolean;
  onTogglePublic?: (isPublic: boolean) => void;
}

type ShareType = 'view' | 'edit';

export function ShareMenu({
  documentId,
  documentTitle,
  isPublic = false,
  onTogglePublic,
}: ShareMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shareType, setShareType] = useState<ShareType>('view');
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  const handleBlur = (e: React.FocusEvent) => {
    if (!menuRef.current?.contains(e.relatedTarget as Node)) {
      setIsOpen(false);
    }
  };

  // Generate share link
  const getShareLink = () => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams();
    params.set('mode', shareType);
    if (isPublic) {
      params.set('public', 'true');
    }
    return `${baseUrl}/doc/${documentId}?${params.toString()}`;
  };

  // Copy link to clipboard
  const copyLink = async () => {
    const link = getShareLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Share via Web Share API if available
  const shareViaWebAPI = async () => {
    const link = getShareLink();
    if (navigator.share) {
      try {
        await navigator.share({
          title: documentTitle || 'Tandem Document',
          text: `Check out this document: ${documentTitle || 'Tandem Document'}`,
          url: link,
        });
      } catch (err) {
        // User cancelled or share failed
        console.log('Share cancelled');
      }
    } else {
      copyLink();
    }
  };

  return (
    <div className="relative" ref={menuRef} onBlur={handleBlur}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <Share2 className="w-4 h-4" />
        Share
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-72 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-zinc-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Share Document
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {documentTitle || 'Untitled Document'}
            </p>
          </div>

          {/* Access Type */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-zinc-700">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Access Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setShareType('view')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  shareType === 'view'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-zinc-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-600'
                }`}
              >
                <Globe className="w-4 h-4" />
                View Only
              </button>
              <button
                onClick={() => setShareType('edit')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  shareType === 'edit'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-zinc-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-600'
                }`}
              >
                <Users className="w-4 h-4" />
                Can Edit
              </button>
            </div>
          </div>

          {/* Public/Private Toggle */}
          {onTogglePublic && (
            <div className="px-4 py-3 border-b border-gray-200 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isPublic ? (
                    <Globe className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <Lock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  )}
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {isPublic ? 'Public' : 'Private'}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {isPublic
                        ? 'Anyone with the link can access'
                        : 'Only invited collaborators'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onTogglePublic(!isPublic)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isPublic ? 'bg-green-500' : 'bg-gray-300 dark:bg-zinc-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isPublic ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Link Preview */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-zinc-700">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Share Link
            </label>
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-zinc-900 rounded-md">
              <Link className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
                {getShareLink()}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="px-4 py-3 flex gap-2">
            <button
              onClick={copyLink}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Link
                </>
              )}
            </button>
            {'share' in navigator && (
              <button
                onClick={shareViaWebAPI}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ShareMenu;
