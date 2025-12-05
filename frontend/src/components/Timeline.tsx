import { useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAppStore } from "@/store/useAppStore"
import { cn } from "@/lib/utils"
// import { formatDistanceToNow } from "date-fns"
// Since date-fns is not installed, I'll use simple formatter or install it. 
// Plan didn't specify date-fns. I'll use simple JS date for now.

function formatTime(iso: string) {
    const date = new Date(iso);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
    return date.toLocaleDateString();
}

import { UserIcon, BotIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DiffViewer } from "./DiffViewer"
import { useState } from "react"

export function Timeline() {
    const { commits, loadCommits, currentFile } = useAppStore();
    const [diffOpen, setDiffOpen] = useState(false);
    // const [selectedCommit, setSelectedCommit] = useState(null);

    const handleViewDiff = (commit: any) => {
        // setSelectedCommit(commit);
        console.log("Viewing diff for", commit);
        setDiffOpen(true);
    };

    useEffect(() => {
        if (currentFile) {
            loadCommits(currentFile.path);
        } else {
            loadCommits(); // load all or empty
        }
    }, [currentFile, loadCommits]);

    // Mock diff content
    const oldContent = `# Previous Content\nThis is the old content.`;
    const newContent = `# New Content\nThis is the new content.\nAdded some lines.`;

    if (!commits.length) {
        return (
            <div className="flex h-full flex-col border-l bg-muted/10">
                <div className="flex h-12 items-center border-b px-4 bg-background">
                    <h2 className="text-sm font-semibold tracking-tight">Timeline</h2>
                </div>
                <div className="p-4 text-sm text-muted-foreground">
                    No history
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col border-l bg-muted/10">
            <div className="flex h-12 items-center border-b px-4 bg-background">
                <h2 className="text-sm font-semibold tracking-tight">Timeline</h2>
            </div>
            <ScrollArea className="flex-1">
                <div className="flex flex-col gap-4 p-4">
                    {commits.map(commit => (
                        <div key={commit.sha} className="relative flex gap-3">
                            {/* Vertical Line */}
                            <div className="absolute left-[15px] top-8 bottom-[-16px] w-px bg-border last:hidden" />

                            <div className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm z-10",
                                commit.type === "ai" ? "bg-sky-100 border-sky-200 text-sky-700 dark:bg-sky-900/30 dark:border-sky-800 dark:text-sky-400" : "bg-background border-border text-muted-foreground"
                            )}>
                                {commit.type === "ai" ? <BotIcon className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                            </div>

                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className={cn("text-xs font-medium", commit.type === "ai" ? "text-sky-700 dark:text-sky-400" : "text-foreground")}>
                                        {commit.author}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">{formatTime(commit.timestamp)}</span>
                                </div>
                                <div className="text-sm text-muted-foreground leading-tight">
                                    {commit.message}
                                </div>
                                <div className="mt-1 flex gap-2">
                                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleViewDiff(commit)}>
                                        View Diff
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground">
                                        Revert
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            <DiffViewer
                open={diffOpen}
                onOpenChange={setDiffOpen}
                oldContent={oldContent}
                newContent={newContent}
                fileName={currentFile?.name || "Unknown"}
            />
        </div>
    )
}
