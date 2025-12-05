import { useEffect, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { FileNode } from "@/lib/api"
import { FileIcon, FolderIcon, FolderOpenIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/store/useAppStore"

interface FileTreeItemProps {
    node: FileNode;
    level: number;
    onSelect: (path: string) => void;
    selectedPath?: string;
}

function FileTreeItem({ node, level, onSelect, selectedPath }: FileTreeItemProps) {
    const [isOpen, setIsOpen] = useState(false);
    const isFolder = node.type === "folder";
    const isSelected = node.path === selectedPath;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isFolder) {
            setIsOpen(!isOpen);
        } else {
            onSelect(node.path);
        }
    };

    return (
        <div>
            <div
                className={cn(
                    "flex items-center gap-2 py-1 px-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground select-none",
                    isSelected && "bg-accent/50 text-accent-foreground font-medium"
                )}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                onClick={handleClick}
            >
                {isFolder ? (
                    isOpen ? <FolderOpenIcon className="h-4 w-4 text-primary" /> : <FolderIcon className="h-4 w-4 text-muted-foreground" />
                ) : (
                    <FileIcon className="h-4 w-4 text-muted-foreground" />
                )}
                <span>{node.name}</span>
            </div>
            {isFolder && isOpen && node.children && (
                <div>
                    {node.children.map(child => (
                        <FileTreeItem
                            key={child.path}
                            node={child}
                            level={level + 1}
                            onSelect={onSelect}
                            selectedPath={selectedPath}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export function FileExplorer() {
    const { files, loadFiles, loadFile, currentFile } = useAppStore();

    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    const handleSelect = (path: string) => {
        loadFile(path);
    };

    return (
        <div className="flex h-full flex-col border-r bg-muted/10">
            <div className="flex h-12 items-center border-b px-4 bg-background">
                <h2 className="text-sm font-semibold tracking-tight">Files</h2>
            </div>
            <ScrollArea className="flex-1">
                <div className="py-2">
                    {files.map(node => (
                        <FileTreeItem
                            key={node.path}
                            node={node}
                            level={0}
                            onSelect={handleSelect}
                            selectedPath={currentFile?.path}
                        />
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}
