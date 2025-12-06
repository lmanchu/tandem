import { TandemEditor } from './components/TandemEditor';
import { createAuthor } from './types/track';

// Create a default human author
const currentUser = createAuthor('human', 'Leo', {
  email: 'leo@example.com',
});

function App() {
  return (
    <div className="h-screen w-full bg-gray-50 dark:bg-zinc-950 flex flex-col p-4">
      <header className="mb-4 flex items-center justify-between">
        <div className="bg-white dark:bg-zinc-900 px-4 py-2 rounded-lg shadow-sm border border-gray-100 dark:border-zinc-800">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Tandem <span className="text-gray-400 font-light">3.0</span>
          </h1>
        </div>
        <span className="text-sm text-gray-500 font-medium tracking-wide">
          Collaborative Markdown with Track Changes
        </span>
      </header>

      <main className="flex-1 overflow-hidden">
        <TandemEditor
          documentId="demo-doc-1"
          author={currentUser}
          onContentChange={(content) => {
            console.log('Content changed:', content.substring(0, 100));
          }}
        />
      </main>

      <footer className="mt-2 text-center text-[10px] text-gray-400 uppercase tracking-widest font-medium">
        Tandem 3.0 • Human + AI Collaboration
      </footer>
    </div>
  );
}

export default App;
