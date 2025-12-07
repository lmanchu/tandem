import { useState, useEffect } from 'react';
import { X, Bot, Eye, EyeOff, Check, AlertCircle, Sparkles, Cpu } from 'lucide-react';
import { aiService, type AISettings, type AIProviderType, DEFAULT_AI_SETTINGS } from '../services/ai';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AISettingsModal({ isOpen, onClose }: AISettingsModalProps) {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [ollamaStatus, setOllamaStatus] = useState<{ available: boolean; models: string[] }>({ available: false, models: [] });
  const [testing, setTesting] = useState<AIProviderType | null>(null);
  const [testResults, setTestResults] = useState<Record<AIProviderType, 'success' | 'error' | null>>({
    claude: null,
    gemini: null,
    ollama: null,
  });

  useEffect(() => {
    if (isOpen) {
      setSettings(aiService.getSettings());
      checkOllama();
    }
  }, [isOpen]);

  const checkOllama = async () => {
    const status = await aiService.checkOllamaStatus();
    setOllamaStatus(status);
  };

  const handleSave = () => {
    aiService.saveSettings(settings);
    onClose();
  };

  const testProvider = async (provider: AIProviderType) => {
    setTesting(provider);
    setTestResults((prev) => ({ ...prev, [provider]: null }));

    // Temporarily save settings for testing
    const currentSettings = aiService.getSettings();
    aiService.saveSettings(settings);

    try {
      await aiService.complete(
        [{ role: 'user', content: 'Say "OK" and nothing else.' }],
        { provider, maxTokens: 10 }
      );
      setTestResults((prev) => ({ ...prev, [provider]: 'success' }));
    } catch (error) {
      console.error(`Test failed for ${provider}:`, error);
      setTestResults((prev) => ({ ...prev, [provider]: 'error' }));
    } finally {
      // Restore original settings if needed
      aiService.saveSettings(currentSettings);
      setTesting(null);
    }
  };

  if (!isOpen) return null;

  const providerIcons = {
    claude: <Sparkles className="w-5 h-5" />,
    gemini: <Bot className="w-5 h-5" />,
    ollama: <Cpu className="w-5 h-5" />,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl mx-4 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI 設定</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Default Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              預設 AI 提供者
            </label>
            <div className="flex gap-2">
              {(['ollama', 'claude', 'gemini'] as AIProviderType[]).map((provider) => (
                <button
                  key={provider}
                  onClick={() => setSettings((s) => ({ ...s, defaultProvider: provider }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    settings.defaultProvider === provider
                      ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
                      : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600'
                  }`}
                >
                  {providerIcons[provider]}
                  <span className="capitalize">{provider}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Ollama (Local) */}
          <div className="p-4 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Ollama (本地)</h3>
                {ollamaStatus.available && (
                  <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                    運行中
                  </span>
                )}
              </div>
              <button
                onClick={() => testProvider('ollama')}
                disabled={testing !== null}
                className="px-3 py-1 text-sm bg-gray-200 dark:bg-zinc-700 rounded-md hover:bg-gray-300 dark:hover:bg-zinc-600 disabled:opacity-50"
              >
                {testing === 'ollama' ? '測試中...' : '測試連線'}
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">Base URL</label>
                <input
                  type="text"
                  value={settings.ollama.baseUrl}
                  onChange={(e) => setSettings((s) => ({ ...s, ollama: { ...s.ollama, baseUrl: e.target.value } }))}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                  placeholder="http://localhost:11434"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">模型</label>
                <select
                  value={settings.ollama.model}
                  onChange={(e) => setSettings((s) => ({ ...s, ollama: { ...s.ollama, model: e.target.value } }))}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                >
                  {ollamaStatus.models.length > 0 ? (
                    ollamaStatus.models.map((model) => (
                      <option key={model} value={model}>{model}</option>
                    ))
                  ) : (
                    <option value={settings.ollama.model}>{settings.ollama.model}</option>
                  )}
                </select>
              </div>
              {testResults.ollama && (
                <div className={`flex items-center gap-2 text-sm ${testResults.ollama === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {testResults.ollama === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {testResults.ollama === 'success' ? '連線成功' : '連線失敗'}
                </div>
              )}
            </div>
          </div>

          {/* Claude */}
          <div className="p-4 rounded-lg border border-gray-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Claude (Anthropic)</h3>
              </div>
              <button
                onClick={() => testProvider('claude')}
                disabled={testing !== null || !settings.claude.apiKey}
                className="px-3 py-1 text-sm bg-gray-200 dark:bg-zinc-700 rounded-md hover:bg-gray-300 dark:hover:bg-zinc-600 disabled:opacity-50"
              >
                {testing === 'claude' ? '測試中...' : '測試連線'}
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showApiKeys.claude ? 'text' : 'password'}
                    value={settings.claude.apiKey}
                    onChange={(e) => setSettings((s) => ({ ...s, claude: { ...s.claude, apiKey: e.target.value } }))}
                    className="w-full px-3 py-2 pr-10 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                    placeholder="sk-ant-..."
                  />
                  <button
                    onClick={() => setShowApiKeys((s) => ({ ...s, claude: !s.claude }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded"
                  >
                    {showApiKeys.claude ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">模型</label>
                <select
                  value={settings.claude.model}
                  onChange={(e) => setSettings((s) => ({ ...s, claude: { ...s.claude, model: e.target.value } }))}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                >
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                  <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                  <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                </select>
              </div>
              {testResults.claude && (
                <div className={`flex items-center gap-2 text-sm ${testResults.claude === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {testResults.claude === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {testResults.claude === 'success' ? '連線成功' : '連線失敗 - 請檢查 API Key'}
                </div>
              )}
            </div>
          </div>

          {/* Gemini */}
          <div className="p-4 rounded-lg border border-gray-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Gemini (Google)</h3>
              </div>
              <button
                onClick={() => testProvider('gemini')}
                disabled={testing !== null || !settings.gemini.apiKey}
                className="px-3 py-1 text-sm bg-gray-200 dark:bg-zinc-700 rounded-md hover:bg-gray-300 dark:hover:bg-zinc-600 disabled:opacity-50"
              >
                {testing === 'gemini' ? '測試中...' : '測試連線'}
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showApiKeys.gemini ? 'text' : 'password'}
                    value={settings.gemini.apiKey}
                    onChange={(e) => setSettings((s) => ({ ...s, gemini: { ...s.gemini, apiKey: e.target.value } }))}
                    className="w-full px-3 py-2 pr-10 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                    placeholder="AIza..."
                  />
                  <button
                    onClick={() => setShowApiKeys((s) => ({ ...s, gemini: !s.gemini }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded"
                  >
                    {showApiKeys.gemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">模型</label>
                <select
                  value={settings.gemini.model}
                  onChange={(e) => setSettings((s) => ({ ...s, gemini: { ...s.gemini, model: e.target.value } }))}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                >
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</option>
                </select>
              </div>
              {testResults.gemini && (
                <div className={`flex items-center gap-2 text-sm ${testResults.gemini === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {testResults.gemini === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {testResults.gemini === 'success' ? '連線成功' : '連線失敗 - 請檢查 API Key'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/30">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            儲存設定
          </button>
        </div>
      </div>
    </div>
  );
}
