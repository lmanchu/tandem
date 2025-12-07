import { useState, useRef, useEffect, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bot,
  Send,
  Settings,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Cpu,
  ChevronDown,
  X,
  Wand2,
  FileText,
  Languages,
  PenTool,
  Loader2,
} from 'lucide-react';
import { aiService, type AIMessage, type AIProviderType } from '../services/ai';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  editor: Editor | null;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: AIProviderType;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { id: 'summarize', label: '摘要', icon: FileText, prompt: '請幫我摘要以下內容：\n\n' },
  { id: 'translate', label: '翻譯', icon: Languages, prompt: '請幫我翻譯以下內容成英文：\n\n' },
  { id: 'improve', label: '改進', icon: PenTool, prompt: '請幫我改進以下文字，使其更專業清晰：\n\n' },
  { id: 'expand', label: '擴展', icon: Wand2, prompt: '請幫我擴展以下內容，增加更多細節：\n\n' },
];

export function AIAssistant({ isOpen, onClose, onOpenSettings, editor }: AIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType>('ollama');
  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const settings = aiService.getSettings();
    setSelectedProvider(settings.defaultProvider);
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const getSelectedText = useCallback(() => {
    if (!editor) return '';
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, ' ');
  }, [editor]);

  const getDocumentContent = useCallback(() => {
    if (!editor) return '';
    return editor.getText();
  }, [editor]);

  const handleSend = async (customPrompt?: string) => {
    const text = customPrompt || input.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setStreamingContent('');

    const aiMessages: AIMessage[] = [
      {
        role: 'system',
        content: `你是一個協作文檔的 AI 助手。請用繁體中文回答，保持回答簡潔專業。
當用戶請求幫助編輯文字時，直接提供修改後的版本。`,
      },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: text },
    ];

    try {
      let fullContent = '';

      await aiService.streamComplete(
        aiMessages,
        (chunk) => {
          fullContent += chunk;
          setStreamingContent(fullContent);
        },
        { provider: selectedProvider }
      );

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fullContent,
        provider: selectedProvider,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingContent('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '發生錯誤';
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${errorMessage}`,
        provider: selectedProvider,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    const selectedText = getSelectedText();
    const content = selectedText || getDocumentContent();

    if (!content) {
      setInput(action.prompt + '（請選擇文字或在文檔中輸入內容）');
      return;
    }

    handleSend(action.prompt + content);
  };

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsertToEditor = (content: string) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    editor.chain().focus().deleteRange({ from, to }).insertContent(content).run();
  };

  const handleClearChat = () => {
    setMessages([]);
    setStreamingContent('');
  };

  const providerIcons: Record<AIProviderType, typeof Bot> = {
    claude: Sparkles,
    gemini: Bot,
    ollama: Cpu,
  };

  const providerLabels: Record<AIProviderType, string> = {
    claude: 'Claude',
    gemini: 'Gemini',
    ollama: 'Ollama',
  };

  if (!isOpen) return null;

  const ProviderIcon = providerIcons[selectedProvider];

  return (
    <div className="w-80 h-full flex flex-col border-l border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <span className="font-medium text-gray-900 dark:text-gray-100">AI 助手</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleClearChat}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
            title="清除對話"
          >
            <Trash2 className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
            title="設定"
          >
            <Settings className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Provider Selector */}
      <div className="px-4 py-2 border-b border-gray-100 dark:border-zinc-800/50">
        <div className="relative">
          <button
            onClick={() => setShowProviderMenu(!showProviderMenu)}
            className="flex items-center gap-2 px-3 py-1.5 w-full rounded-md bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <ProviderIcon className="w-4 h-4" />
            <span className="text-sm flex-1 text-left">{providerLabels[selectedProvider]}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          {showProviderMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 py-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-lg z-10">
              {(['ollama', 'claude', 'gemini'] as AIProviderType[]).map((provider) => {
                const Icon = providerIcons[provider];
                return (
                  <button
                    key={provider}
                    onClick={() => {
                      setSelectedProvider(provider);
                      setShowProviderMenu(false);
                    }}
                    className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 ${
                      selectedProvider === provider ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' : ''
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {providerLabels[provider]}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2 border-b border-gray-100 dark:border-zinc-800/50">
        <div className="flex gap-1.5 flex-wrap">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action)}
              disabled={isLoading}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-md transition-colors disabled:opacity-50"
            >
              <action.icon className="w-3 h-3" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 && !streamingContent && (
          <div className="text-center py-8 text-gray-400 dark:text-zinc-500">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">選擇文字或直接詢問 AI</p>
            <p className="text-xs mt-1">使用快捷操作或輸入問題</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`${message.role === 'user' ? 'ml-4' : 'mr-4'}`}
          >
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                message.role === 'user'
                  ? 'bg-purple-600 text-white ml-auto'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
            {message.role === 'assistant' && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                  {message.provider}
                </span>
                <button
                  onClick={() => handleCopy(message.content, message.id)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded"
                  title="複製"
                >
                  {copiedId === message.id ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3 text-gray-400" />
                  )}
                </button>
                <button
                  onClick={() => handleInsertToEditor(message.content)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded"
                  title="插入到編輯器"
                >
                  <FileText className="w-3 h-3 text-gray-400" />
                </button>
              </div>
            )}
          </div>
        ))}

        {streamingContent && (
          <div className="mr-4">
            <div className="rounded-lg px-3 py-2 text-sm bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100">
              <div className="whitespace-pre-wrap">{streamingContent}</div>
              <span className="inline-block w-1 h-4 bg-purple-500 animate-pulse ml-0.5" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-zinc-800">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="輸入訊息..."
            className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-zinc-800 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
