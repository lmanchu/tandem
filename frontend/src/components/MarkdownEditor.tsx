import { useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import { useAppStore } from "@/store/useAppStore"
import { useYjsCodeMirror } from "@/hooks/useYjsCodeMirror"
import { Loader2, Users } from "lucide-react"

export function MarkdownEditor() {
    const { currentFile, fileContent, saveFile, isSaving } = useAppStore();
    const [localContent, setLocalContent] = useState("");

    // Use Yjs CodeMirror for real-time collaboration
    const { editorRef, isConnected } = useYjsCodeMirror({
        filePath: currentFile?.path || null,
        initialContent: fileContent,
        onContentChange: (content) => {
            setLocalContent(content);
        },
    });

    // Sync local content with store content when file changes
    useEffect(() => {
        setLocalContent(fileContent);
    }, [fileContent]);

    // Debounced save to Git (for snapshots)
    useEffect(() => {
        if (!currentFile) return;

        const timer = setTimeout(() => {
            if (localContent !== fileContent && localContent.length > 0) {
                saveFile(localContent);
            }
        }, 5000); // 5 seconds debounce for Git snapshots

        return () => clearTimeout(timer);
    }, [localContent, fileContent, currentFile, saveFile]);

    if (!currentFile) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                Select a file to edit
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex h-12 items-center justify-between border-b px-4 bg-background z-10">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{currentFile.name}</span>
                    <span className="text-xs text-muted-foreground opacity-60">{currentFile.path}</span>
                </div>
                <div className="flex items-center gap-3">
                    {/* Collaboration status */}
                    {isConnected && (
                        <div className="flex items-center gap-1.5 text-xs text-blue-600">
                            <Users className="h-3 w-3" />
                            <span>Live</span>
                        </div>
                    )}

                    {/* Save status */}
                    {isSaving ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Saving...
                        </div>
                    ) : (
                        <span className="text-xs text-muted-foreground text-green-600 font-medium">Saved</span>
                    )}
                </div>
            </div>

            <div className="flex-1 grid grid-cols-2 overflow-hidden">
                {/* Editor with Yjs collaboration */}
                <div className="border-r overflow-auto relative">
                    <div
                        ref={editorRef}
                        className="h-full w-full [&_.cm-editor]:h-full [&_.cm-scroller]:h-full"
                        style={{ height: '100%' }}
                    />
                </div>

                {/* Preview */}
                <div className="overflow-auto bg-muted/5 p-8 prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{localContent}</ReactMarkdown>
                </div>
            </div>
        </div>
    )
}
