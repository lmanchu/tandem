import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
// import { createTwoFilesPatch } from "diff"
// import { useEffect, useState } from "react"
// import { api } from "@/lib/api"
import { diffLines } from "diff"

interface DiffViewerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    oldContent: string;
    newContent: string;
    fileName: string;
}

export function DiffViewer({ open, onOpenChange, oldContent, newContent, fileName }: DiffViewerProps) {
    const diff = diffLines(oldContent, newContent);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Diff: {fileName}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 border rounded-md font-mono text-sm">
                    <div className="p-4">
                        {diff.map((part, index) => {
                            const color = part.added ? 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-300' :
                                part.removed ? 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-300' :
                                    'text-muted-foreground';

                            return (
                                <span key={index} className={`block whitespace-pre-wrap ${color}`}>
                                    {part.value}
                                </span>
                            )
                        })}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
