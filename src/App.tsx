import { TandemEditor } from './components/TandemEditor';
import { createAuthor } from './types/track';
import './App.css';

// Create a default human author
const currentUser = createAuthor('human', 'Leo', {
  email: 'leo@example.com',
});

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Tandem 3.0</h1>
        <span className="tagline">Collaborative Markdown with Track Changes</span>
      </header>

      <main className="app-main">
        <TandemEditor
          documentId="demo-doc-1"
          author={currentUser}
          onContentChange={(content) => {
            console.log('Content changed:', content.substring(0, 100));
          }}
        />
      </main>

      <footer className="app-footer">
        <p>Tandem 3.0 - Human + AI Collaboration</p>
      </footer>
    </div>
  );
}

export default App;
