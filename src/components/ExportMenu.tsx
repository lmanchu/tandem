import { useState, useRef } from 'react';
import { Download, FileText, FileType, Upload, ChevronDown } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import TurndownService from 'turndown';

interface ExportMenuProps {
  editor: Editor | null;
  documentTitle: string;
  onImportMarkdown?: (content: string) => void;
}

export function ExportMenu({ editor, documentTitle, onImportMarkdown }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  const handleBlur = (e: React.FocusEvent) => {
    if (!menuRef.current?.contains(e.relatedTarget as Node)) {
      setIsOpen(false);
    }
  };

  // Export to Markdown
  const exportMarkdown = () => {
    if (!editor) return;

    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
    });

    // Custom rules for better markdown conversion
    turndownService.addRule('strikethrough', {
      filter: ['del', 's'],
      replacement: (content: string) => `~~${content}~~`,
    });

    const html = editor.getHTML();
    const markdown = turndownService.turndown(html);

    // Download the file
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentTitle || 'document'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  // Export to HTML
  const exportHTML = () => {
    if (!editor) return;

    const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${documentTitle || 'Document'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      line-height: 1.6;
    }
    pre {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 1rem;
      border-radius: 8px;
      overflow-x: auto;
    }
    code {
      background: #f0f0f0;
      padding: 0.2em 0.4em;
      border-radius: 4px;
      font-size: 0.9em;
    }
    pre code {
      background: none;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid #e0e0e0;
      margin: 1rem 0;
      padding-left: 1rem;
      color: #666;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1rem 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 0.5rem;
      text-align: left;
    }
    th {
      background: #f5f5f5;
    }
    img {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
${editor.getHTML()}
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentTitle || 'document'}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  // Export to PDF (using print dialog)
  const exportPDF = () => {
    if (!editor) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('請允許彈出視窗以匯出 PDF');
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>${documentTitle || 'Document'}</title>
  <style>
    @media print {
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        max-width: 100%;
        margin: 0;
        padding: 1cm;
        line-height: 1.6;
        font-size: 12pt;
      }
      pre {
        background: #f5f5f5 !important;
        color: #333 !important;
        padding: 1rem;
        border-radius: 4px;
        overflow-x: auto;
        white-space: pre-wrap;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      code {
        background: #f0f0f0;
        padding: 0.2em 0.4em;
        border-radius: 4px;
        font-size: 0.9em;
      }
      pre code {
        background: none;
        padding: 0;
      }
      blockquote {
        border-left: 4px solid #ccc;
        margin: 1rem 0;
        padding-left: 1rem;
        color: #666;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 1rem 0;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 0.5rem;
        text-align: left;
      }
      th {
        background: #f5f5f5;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      img {
        max-width: 100%;
        height: auto;
      }
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid;
      }
      p, li {
        orphans: 3;
        widows: 3;
      }
    }
  </style>
</head>
<body>
${editor.getHTML()}
<script>
  window.onload = function() {
    window.print();
    window.onafterprint = function() {
      window.close();
    };
  };
</script>
</body>
</html>`);
    printWindow.document.close();
    setIsOpen(false);
  };

  // Import Markdown
  const handleImportMarkdown = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (onImportMarkdown) {
        onImportMarkdown(content);
      } else {
        // Convert markdown to HTML and set content
        // Simple markdown parsing for basic elements
        let html = content
          // Headers
          .replace(/^### (.*$)/gm, '<h3>$1</h3>')
          .replace(/^## (.*$)/gm, '<h2>$1</h2>')
          .replace(/^# (.*$)/gm, '<h1>$1</h1>')
          // Bold
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          // Italic
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          // Code blocks
          .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
          // Inline code
          .replace(/`([^`]+)`/g, '<code>$1</code>')
          // Links
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
          // Lists
          .replace(/^\* (.*$)/gm, '<li>$1</li>')
          .replace(/^- (.*$)/gm, '<li>$1</li>')
          // Paragraphs
          .replace(/\n\n/g, '</p><p>')
          .replace(/^(.+)$/gm, (match) => {
            if (match.startsWith('<')) return match;
            return `<p>${match}</p>`;
          });

        // Wrap lists
        html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

        editor.commands.setContent(html);
      }
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef} onBlur={handleBlur}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <Download className="w-4 h-4" />
        匯出
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg overflow-hidden z-50">
          <button
            onClick={exportMarkdown}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            匯出 Markdown
          </button>
          <button
            onClick={exportHTML}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
          >
            <FileType className="w-4 h-4" />
            匯出 HTML
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
          >
            <FileType className="w-4 h-4" />
            匯出 PDF
          </button>
          <div className="border-t border-gray-200 dark:border-zinc-700" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            匯入 Markdown
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.txt"
            onChange={handleImportMarkdown}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}

export default ExportMenu;
