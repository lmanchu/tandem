import { useEffect, useState, useCallback } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { languages } from "@codemirror/language-data"
import ReactMarkdown from "react-markdown"
import { useAppStore } from "@/store/useAppStore"
import { Loader2 } from "lucide-react"
// import { cn } from "@/lib/utils"

export function MarkdownEditor() {
    const { currentFile, fileContent, saveFile, isSaving } = useAppStore();
    const [localContent, setLocalContent] = useState("");

    // Sync local content with store content when file changes
    useEffect(() => {
        setLocalContent(fileContent);
    }, [fileContent, currentFile]);

    // Debounced save
    useEffect(() => {
        if (!currentFile) return;

        const timer = setTimeout(() => {
            if (localContent !== fileContent) {
                saveFile(localContent);
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [localContent, fileContent, currentFile, saveFile]);

    const handleChange = useCallback((val: string) => {
        setLocalContent(val);
    }, []);

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
                <div className="flex items-center gap-2">
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
                {/* Editor */}
                <div className="border-r overflow-auto relative">
                    <CodeMirror
                        value={localContent}
                        height="100%"
                        extensions={[markdown({ base: markdownLanguage, codeLanguages: languages })]}
                        onChange={handleChange}
                        theme="light" // Or 'dark' based on system
                        className="h-full text-base"
                        basicSetup={{
                            lineNumbers: true,
                            highlightActiveLineGutter: true,
                            highlightSpecialChars: true,
                            history: true,
                            foldGutter: true,
                            drawSelection: true,
                            dropCursor: true,
                            allowMultipleSelections: true,
                            indentOnInput: true,
                            syntaxHighlighting: true,
                            bracketMatching: true,
                            closeBrackets: true,
                            autocompletion: true,
                            rectangularSelection: true,
                            crosshairCursor: true,
                            highlightActiveLine: true,
                            highlightSelectionMatches: true,
                            closeBracketsKeymap: true,
                            defaultKeymap: true,
                            searchKeymap: true,
                            historyKeymap: true,
                            foldKeymap: true,
                            completionKeymap: true,
                            lintKeymap: true,
                        }}
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
