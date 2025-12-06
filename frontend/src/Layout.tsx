import { FileExplorer } from "@/components/FileExplorer"
import { MarkdownEditor } from "@/components/MarkdownEditor"
import { Timeline } from "@/components/Timeline"

export function AppLayout() {
    return (
        <div className="flex h-screen flex-col overflow-hidden bg-background">
            {/* Header */}
            <header className="flex h-14 items-center border-b px-6">
                <div className="flex items-center gap-2 font-semibold">
                    {/* <span className="text-primary">AI</span> */}
                    {/* <span>Collab</span> */}
                    <span className="text-primary text-xl tracking-tight">Tandem</span>
                </div>
            </header>

            {/* Main Content - 3 Column Grid */}
            <main className="grid flex-1 grid-cols-[250px_1fr_300px]">
                <aside className="h-full">
                    <FileExplorer />
                </aside>
                <section className="h-full min-w-0">
                    <MarkdownEditor />
                </section>
                <aside className="h-full">
                    <Timeline />
                </aside>
            </main>
        </div>
    )
}
