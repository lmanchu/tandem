import { type Editor } from '@tiptap/react';
import { useRef } from 'react';
import {
    Bold,
    Italic,
    Heading1,
    Heading2,
    List,
    Code,
    FileEdit,
    Wifi,
    WifiOff,
    CloudOff,
    Loader2,
    Check,
    Users,
    ImagePlus,
    Bot
} from 'lucide-react';
import type { Author } from '../types/track';
import type { Collaborator } from './TandemEditor';

interface ToolbarProps {
    editor: Editor | null;
    trackingEnabled: boolean;
    onToggleTracking: () => void;
    isConnected: boolean;
    isSynced: boolean;
    lastSavedAt: Date | null;
    author: Author;
    collaborators?: Collaborator[];
    aiEnabled?: boolean;
    onToggleAI?: () => void;
}

// Format relative time
const formatRelativeTime = (date: Date | null): string => {
    if (!date) return '';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return date.toLocaleTimeString();
};

export function Toolbar({
    editor,
    trackingEnabled,
    onToggleTracking,
    isConnected,
    isSynced,
    lastSavedAt,
    author,
    collaborators = [],
    aiEnabled = false,
    onToggleAI
}: ToolbarProps) {
    const imageInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editor) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const src = event.target?.result as string;
            editor.chain().focus().setImage({ src }).run();
        };
        reader.readAsDataURL(file);

        // Reset input
        if (imageInputRef.current) {
            imageInputRef.current.value = '';
        }
    };

    if (!editor) return null;

    const ToolbarButton = ({
        isActive,
        onClick,
        children,
        title
    }: {
        isActive?: boolean;
        onClick: () => void;
        children: React.ReactNode;
        title?: string;
    }) => (
        <button
            onClick={onClick}
            title={title}
            className={`p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors ${isActive
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400'
                }`}
        >
            {children}
        </button>
    );

    return (
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="flex items-center gap-1">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    title="Bold"
                >
                    <Bold className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    title="Italic"
                >
                    <Italic className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                    title="Heading 1"
                >
                    <Heading1 className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    title="Heading 2"
                >
                    <Heading2 className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    title="Bullet List"
                >
                    <List className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    isActive={editor.isActive('codeBlock')}
                    title="Code Block"
                >
                    <Code className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => imageInputRef.current?.click()}
                    title="Insert Image"
                >
                    <ImagePlus className="w-4 h-4" />
                </ToolbarButton>

                {/* Hidden file input for image upload */}
                <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                />

                <div className="w-px h-6 bg-gray-200 dark:bg-zinc-800 mx-2" />

                <button
                    onClick={onToggleTracking}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${trackingEnabled
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                        }`}
                >
                    <FileEdit className="w-4 h-4" />
                    {trackingEnabled ? 'Tracking On' : 'Track Changes'}
                </button>

                {onToggleAI && (
                    <button
                        onClick={onToggleAI}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${aiEnabled
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                            }`}
                    >
                        <Bot className="w-4 h-4" />
                        AI 助手
                    </button>
                )}
            </div>

            <div className="flex items-center gap-4">
                {/* Save Status Indicator */}
                <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md ${
                    !isConnected
                        ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                        : isSynced
                            ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
                }`}>
                    {!isConnected ? (
                        <>
                            <CloudOff className="w-3.5 h-3.5" />
                            <span>Offline - Changes not saved</span>
                        </>
                    ) : isSynced ? (
                        <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Saved {formatRelativeTime(lastSavedAt)}</span>
                        </>
                    ) : (
                        <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving...</span>
                        </>
                    )}
                </div>

                {/* Connection Status */}
                <div className={`flex items-center gap-1.5 text-xs font-medium ${isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                    {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    {isConnected ? 'Online' : 'Offline'}
                </div>

                {/* Collaborators */}
                {collaborators.length > 0 && (
                    <div className="flex items-center gap-2 pl-4 border-l border-gray-200 dark:border-zinc-800">
                        <Users className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
                        <div className="flex -space-x-2">
                            {collaborators.slice(0, 5).map((collab) => (
                                <div
                                    key={collab.clientId}
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white dark:ring-zinc-900 shadow-sm cursor-default"
                                    style={{ backgroundColor: collab.color }}
                                    title={collab.name}
                                >
                                    {collab.name.charAt(0)}
                                </div>
                            ))}
                            {collaborators.length > 5 && (
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300 ring-2 ring-white dark:ring-zinc-900">
                                    +{collaborators.length - 5}
                                </div>
                            )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-zinc-400">
                            {collaborators.length} 在線
                        </span>
                    </div>
                )}

                {/* Current User */}
                <div className="flex items-center gap-2 pl-4 border-l border-gray-200 dark:border-zinc-800">
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white dark:ring-zinc-900 shadow-sm"
                        style={{ backgroundColor: author.color }}
                    >
                        {author.name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{author.name}</span>
                        <span className="text-[10px] text-gray-500 capitalize">{author.type}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
