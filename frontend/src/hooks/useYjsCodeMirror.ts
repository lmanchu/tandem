/**
 * Custom hook for Yjs + CodeMirror integration
 * Handles real-time collaborative editing
 */

import { useEffect, useRef, useState } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { yCollab } from 'y-codemirror.next';
import * as Y from 'yjs';
import { yjsClient } from '@/lib/yjs-client';

export interface UseYjsCodeMirrorOptions {
  filePath: string | null;
  initialContent?: string;
  onContentChange?: (content: string) => void;
}

export function useYjsCodeMirror(options: UseYjsCodeMirrorOptions) {
  const { filePath, initialContent = '', onContentChange } = options;

  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!editorRef.current || !filePath) return;

    // Connect to Yjs server
    yjsClient.connect();
    setIsConnected(yjsClient.isConnected());

    // Subscribe to file and get Y.Doc
    const ydoc = yjsClient.subscribe(filePath, initialContent);
    ydocRef.current = ydoc;

    // Get the shared text type
    const ytext = ydoc.getText('codemirror');

    // Create CodeMirror editor with Yjs binding
    const state = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        basicSetup,
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        yCollab(ytext, yjsClient.getDoc()?.clientID || 0),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && onContentChange) {
            const content = update.state.doc.toString();
            onContentChange(content);
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    // Cleanup
    return () => {
      view.destroy();
      yjsClient.unsubscribe();
      viewRef.current = null;
      ydocRef.current = null;
    };
  }, [filePath, initialContent, onContentChange]);

  return {
    editorRef,
    view: viewRef.current,
    ydoc: ydocRef.current,
    isConnected,
  };
}
