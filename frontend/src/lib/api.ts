// Mock API types and functions

export interface FileNode {
    path: string;
    name: string;
    type: "file" | "folder";
    children?: FileNode[];
    size?: number;
    modified?: string;
}

export interface Commit {
    sha: string;
    author: string;
    type: "ai" | "human";
    message: string;
    timestamp: string;
    filesChanged: string[];
}

const mockFiles: FileNode[] = [
    {
        path: "docs",
        name: "docs",
        type: "folder",
        children: [
            { path: "docs/PRD.md", name: "PRD.md", type: "file", size: 12000, modified: "2025-12-05T10:00:00Z" },
            { path: "docs/API.md", name: "API.md", type: "file", size: 8000, modified: "2025-12-05T09:00:00Z" },
        ]
    },
    {
        path: "README.md",
        name: "README.md",
        type: "file",
        size: 2000,
        modified: "2025-12-05T08:00:00Z"
    }
];

const mockCommits: Commit[] = [
    {
        sha: "a1b2c3d",
        author: "Claude",
        type: "ai",
        message: "Added technical architecture",
        timestamp: "2025-12-05T10:30:00Z",
        filesChanged: ["docs/PRD.md"]
    },
    {
        sha: "d4e5f6g",
        author: "Lman",
        type: "human",
        message: "Updated requirements",
        timestamp: "2025-12-05T10:00:00Z",
        filesChanged: ["docs/PRD.md"]
    },
];

export const api = {
    getFiles: async (): Promise<FileNode[]> => {
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return mockFiles;
    },

    getFileContent: async (path: string): Promise<string> => {
        await new Promise(resolve => setTimeout(resolve, 300));
        return `# Content of ${path}\n\nThis is a mock content for testing.\n\nAuthor: Mock`;
    },

    getCommits: async (path?: string): Promise<Commit[]> => {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (path) {
            return mockCommits.filter(c => c.filesChanged.includes(path));
        }
        return mockCommits;
    }
};
