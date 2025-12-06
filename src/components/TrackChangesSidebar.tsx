import type { Change } from '../types/track';
import { Check, X, User, Bot } from 'lucide-react';

interface TrackChangesSidebarProps {
    changes: Change[];
    onAccept: (id: string) => void;
    onReject: (id: string) => void;
}

export function TrackChangesSidebar({
    changes,
    onAccept,
    onReject
}: TrackChangesSidebarProps) {
    return (
        <div className="w-80 border-l border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 flex flex-col h-full">
            <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    Review Changes
                    <span className="bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full text-xs">
                        {changes.length}
                    </span>
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {changes.map((change) => (
                    <div
                        key={change.id}
                        className={`
              rounded-lg p-3 shadow-sm border text-sm
              ${change.type === 'insert'
                                ? 'bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-900/30'
                                : 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30'}
            `}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                                <span className={`
                  w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold text-white
                `} style={{ backgroundColor: change.author.color }}>
                                    {change.author.type === 'ai' ? <Bot className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                                </span>
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    {change.author.name}
                                </span>
                                <span className="text-xs text-gray-400">• {new Date(change.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => onAccept(change.id)}
                                    className="p-1 hover:bg-green-200 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 rounded transition-colors"
                                    title="Accept"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => onReject(change.id)}
                                    className="p-1 hover:bg-red-200 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 rounded transition-colors"
                                    title="Reject"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        <div className="text-gray-900 dark:text-gray-100 font-mono text-xs overflow-hidden break-words">
                            {change.type === 'insert' ? (
                                <span className="text-green-800 dark:text-green-300">
                                    + {change.content}
                                </span>
                            ) : (
                                <span className="text-red-800 dark:text-red-300 line-through opacity-70">
                                    - {change.oldContent}
                                </span>
                            )}
                        </div>
                    </div>
                ))}

                {changes.length === 0 && (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-600 text-sm">
                        No pending changes
                    </div>
                )}
            </div>
        </div>
    );
}
