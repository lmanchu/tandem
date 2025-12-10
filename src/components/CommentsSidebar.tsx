import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Check, Reply, Trash2, Send } from 'lucide-react';
import type { CommentData, CommentReply } from '../extensions/Comments';
import type { Author } from '../types/track';

interface CommentsSidebarProps {
  comments: CommentData[];
  currentAuthor: Author;
  onResolve: (commentId: string) => void;
  onUnresolve: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onReply: (commentId: string, content: string) => void;
  onCommentClick?: (commentId: string) => void;
}

export function CommentsSidebar({
  comments,
  currentAuthor,
  onResolve,
  onUnresolve,
  onDelete,
  onReply,
  onCommentClick,
}: CommentsSidebarProps) {
  const [showResolved, setShowResolved] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  const filteredComments = showResolved
    ? comments
    : comments.filter((c) => !c.resolved);

  const sortedComments = [...filteredComments].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  useEffect(() => {
    if (replyingTo && replyInputRef.current) {
      replyInputRef.current.focus();
    }
  }, [replyingTo]);

  const handleSubmitReply = (commentId: string) => {
    if (!replyContent.trim()) return;
    onReply(commentId, replyContent.trim());
    setReplyContent('');
    setReplyingTo(null);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
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

  return (
    <div className="w-72 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            <span className="font-medium text-zinc-800 dark:text-zinc-200 text-sm">
              留言
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              ({filteredComments.length})
            </span>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="rounded border-zinc-300 dark:border-zinc-600 text-blue-500 focus:ring-blue-500"
          />
          顯示已解決
        </label>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto">
        {sortedComments.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 dark:text-zinc-400 text-sm">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>尚無留言</p>
            <p className="text-xs mt-1">選取文字後點擊留言按鈕</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {sortedComments.map((comment) => (
              <div
                key={comment.id}
                className={`p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer ${
                  comment.resolved ? 'opacity-60' : ''
                }`}
                onClick={() => onCommentClick?.(comment.id)}
              >
                {/* Comment Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                      style={{ backgroundColor: comment.authorColor }}
                    >
                      {comment.authorName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {comment.authorName}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatTime(comment.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {comment.resolved ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUnresolve(comment.id);
                        }}
                        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
                        title="重新開啟"
                      >
                        <X className="w-3.5 h-3.5 text-zinc-500" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onResolve(comment.id);
                        }}
                        className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                        title="標記為已解決"
                      >
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReplyingTo(replyingTo === comment.id ? null : comment.id);
                      }}
                      className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                      title="回覆"
                    >
                      <Reply className="w-3.5 h-3.5 text-blue-600" />
                    </button>
                    {comment.authorId === currentAuthor.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('確定要刪除此留言嗎？')) {
                            onDelete(comment.id);
                          }
                        }}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                        title="刪除"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Comment Content */}
                <div className="text-sm text-zinc-700 dark:text-zinc-300 ml-8">
                  {comment.content}
                </div>

                {/* Resolved Badge */}
                {comment.resolved && (
                  <div className="mt-2 ml-8 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    已解決 {comment.resolvedBy && `由 ${comment.resolvedBy}`}
                  </div>
                )}

                {/* Replies */}
                {comment.replies.length > 0 && (
                  <div className="mt-2 ml-8 space-y-2 pl-3 border-l-2 border-zinc-200 dark:border-zinc-700">
                    {comment.replies.map((reply) => (
                      <ReplyItem key={reply.id} reply={reply} formatTime={formatTime} />
                    ))}
                  </div>
                )}

                {/* Reply Input */}
                {replyingTo === comment.id && (
                  <div className="mt-2 ml-8">
                    <textarea
                      ref={replyInputRef}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="輸入回覆..."
                      className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={2}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          handleSubmitReply(comment.id);
                        } else if (e.key === 'Escape') {
                          setReplyingTo(null);
                          setReplyContent('');
                        }
                      }}
                    />
                    <div className="flex justify-end gap-2 mt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplyingTo(null);
                          setReplyContent('');
                        }}
                        className="px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
                      >
                        取消
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSubmitReply(comment.id);
                        }}
                        disabled={!replyContent.trim()}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        回覆
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReplyItem({
  reply,
  formatTime,
}: {
  reply: CommentReply;
  formatTime: (timestamp: string) => string;
}) {
  return (
    <div className="text-sm">
      <div className="flex items-center gap-1.5 mb-0.5">
        <div
          className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-medium"
          style={{ backgroundColor: reply.authorColor }}
        >
          {reply.authorName.charAt(0).toUpperCase()}
        </div>
        <span className="font-medium text-zinc-700 dark:text-zinc-300 text-xs">
          {reply.authorName}
        </span>
        <span className="text-xs text-zinc-400">{formatTime(reply.timestamp)}</span>
      </div>
      <div className="text-zinc-600 dark:text-zinc-400 text-xs pl-5">
        {reply.content}
      </div>
    </div>
  );
}

export default CommentsSidebar;
