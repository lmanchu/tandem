import { useState, useRef, useCallback, useEffect } from 'react';
import { TandemEditor } from './components/TandemEditor';
import { FileBrowser } from './components/FileBrowser';
import { ServerSettings } from './components/ServerSettings';
import { PasswordGate } from './components/PasswordGate';
import { createAuthor } from './types/track';
import { FileText, Settings } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { marked } from 'marked';

// Create a default human author
const currentUser = createAuthor('human', 'Leo', {
  email: 'leo@example.com',
});

function App() {
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<{ documentId: string; content: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const editorRef = useRef<Editor | null>(null);

  // Handle URL doc parameter for shared links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const docId = params.get('doc');
    if (docId) {
      setCurrentDocumentId(docId);
      // Clean URL without reloading
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Listen for Electron menu open-settings event
  useEffect(() => {
    if (window.tandemElectron?.onOpenSettings) {
      window.tandemElectron.onOpenSettings(() => {
        setShowSettings(true);
      });
    }
  }, []);

  const handleEditorReady = useCallback((editor: Editor | null) => {
    editorRef.current = editor;
    // If there's a pending import, apply it now
    if (editor && pendingImport && pendingImport.documentId === currentDocumentId) {
      setTimeout(() => {
        editor.commands.setContent(pendingImport.content);
        setPendingImport(null);
      }, 100);
    }
  }, [pendingImport, currentDocumentId]);

  const handleImportFile = useCallback((documentId: string, content: string) => {
    // Convert Markdown to HTML using marked
    const htmlContent = marked.parse(content, { async: false }) as string;

    if (editorRef.current && documentId === currentDocumentId) {
      editorRef.current.commands.setContent(htmlContent);
    } else {
      // Store for later when editor is ready
      setPendingImport({ documentId, content: htmlContent });
    }
  }, [currentDocumentId]);

  const handleExportRequest = useCallback(() => {
    if (editorRef.current) {
      // Get markdown content - for now we'll use HTML, but ideally convert to markdown
      return editorRef.current.storage.markdown?.getMarkdown() || editorRef.current.getText();
    }
    return null;
  }, []);

  return (
    <PasswordGate>
    <div className="h-screen w-full bg-gray-50 dark:bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="h-14 px-4 flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Tandem <span className="text-gray-400 font-light">3.0</span>
          </h1>
          {currentDocumentId && (
            <span className="text-sm text-gray-500 dark:text-zinc-400 font-medium">
              / {currentDocumentId}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 dark:text-zinc-500 font-medium tracking-wide hidden sm:block">
            Human + AI Collaboration
          </span>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            title="伺服器設定"
          >
            <Settings className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Browser Sidebar */}
        <FileBrowser
          currentDocumentId={currentDocumentId}
          onDocumentSelect={setCurrentDocumentId}
          onImportFile={handleImportFile}
          onExportRequest={handleExportRequest}
        />

        {/* Editor Area */}
        <main className="flex-1 overflow-hidden p-4">
          {currentDocumentId ? (
            <TandemEditor
              key={currentDocumentId}
              documentId={currentDocumentId}
              author={currentUser}
              onEditorReady={handleEditorReady}
              onContentChange={(content) => {
                console.log('Content changed:', content.substring(0, 100));
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
                <h2 className="text-xl font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                  選擇或建立文件
                </h2>
                <p className="text-sm text-zinc-400 dark:text-zinc-500">
                  從左側選擇一個文件開始編輯，或點擊 + 建立新文件
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="h-8 flex items-center justify-center text-[10px] text-gray-400 dark:text-zinc-600 uppercase tracking-widest font-medium border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        Tandem 3.0
      </footer>

      {/* Server Settings Modal */}
      <ServerSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
    </PasswordGate>
  );
}

export default App;
