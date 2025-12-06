import { type Editor } from '@tiptap/react';
import {
    Bold,
    Italic,
    Heading1,
    Heading2,
    List,
    Code,
    FileEdit,
    Wifi,
    WifiOff
} from 'lucide-react';
import type { Author } from '../types/track';

interface ToolbarProps {
    editor: Editor | null;
    trackingEnabled: boolean;
    onToggleTracking: () => void;
    isConnected: boolean;
    author: Author;
}

export function Toolbar({
    editor,
    trackingEnabled,
    onToggleTracking,
    isConnected,
    author
}: ToolbarProps) {
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
            </div>

            <div className="flex items-center gap-4">
                <div className={`flex items-center gap-1.5 text-xs font-medium ${isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                    {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    {isConnected ? 'Online' : 'Offline'}
                </div>

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
