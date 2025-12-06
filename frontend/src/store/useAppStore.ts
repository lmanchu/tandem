import { create } from 'zustand'
import { api } from '@/lib/api'
import type { FileNode, Commit } from '@/lib/api'

interface AppState {
    // Files
    files: FileNode[];
    currentFile: FileNode | null;
    fileContent: string;

    // Commits
    commits: Commit[];

    // UI
    isSaving: boolean;
    error: string | null;

    // Actions
    loadFiles: () => Promise<void>;
    loadFile: (path: string) => Promise<void>;
    saveFile: (content: string) => Promise<void>;
    loadCommits: (path?: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
    files: [],
    currentFile: null,
    fileContent: "",
    commits: [],
    isSaving: false,
    error: null,

    loadFiles: async () => {
        try {
            const files = await api.getFiles();
            set({ files });
        } catch (e) {
            set({ error: "Failed to load files" });
        }
    },

    loadFile: async (path: string) => {
        try {
            // Find file node
            // Recursive helper to find file
            const findFile = (nodes: FileNode[]): FileNode | null => {
                for (const node of nodes) {
                    if (node.path === path) return node;
                    if (node.children) {
                        const found = findFile(node.children);
                        if (found) return found;
                    }
                }
                return null;
            };

            const file = findFile(get().files);
            if (file) {
                set({ currentFile: file });
                const content = await api.getFileContent(path);
                set({ fileContent: content });

                // Allow chaining or parallel loading
                get().loadCommits(path);
            }
        } catch (e) {
            set({ error: "Failed to load file content" });
        }
    },

    saveFile: async (content: string) => {
        const { currentFile } = get();
        if (!currentFile) return;

        set({ isSaving: true });

        try {
            await api.saveFile(currentFile.path, content);
            set({ fileContent: content, isSaving: false });
        } catch (e) {
            set({ error: "Failed to save file", isSaving: false });
        }
    },

    loadCommits: async (path?: string) => {
        try {
            const commits = await api.getCommits(path);
            set({ commits: (commits as unknown) as Commit[] }); // Explicit cast if needed or fix variable name typo
        } catch (e) {
            set({ error: "Failed to load commits" });
        }
    }
}))
