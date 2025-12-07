import type { AIProvider, AISettings, AIMessage, AICompletionOptions, AICompletionResult, AIProviderType } from './types';
import { DEFAULT_AI_SETTINGS } from './types';
import { ClaudeProvider } from './providers/claude';
import { GeminiProvider } from './providers/gemini';
import { OllamaProvider } from './providers/ollama';

const STORAGE_KEY = 'tandem_ai_settings';

export class AIService {
  private settings: AISettings;
  private providers: Map<AIProviderType, AIProvider>;

  constructor() {
    this.settings = this.loadSettings();
    this.providers = new Map();
    this.initializeProviders();
  }

  private loadSettings(): AISettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      console.warn('Failed to load AI settings from localStorage');
    }
    return DEFAULT_AI_SETTINGS;
  }

  saveSettings(settings: Partial<AISettings>): void {
    this.settings = { ...this.settings, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    this.initializeProviders();
  }

  getSettings(): AISettings {
    return { ...this.settings };
  }

  private initializeProviders(): void {
    this.providers.clear();

    // Claude
    this.providers.set('claude', new ClaudeProvider(
      this.settings.claude.apiKey,
      this.settings.claude.model
    ));

    // Gemini
    this.providers.set('gemini', new GeminiProvider(
      this.settings.gemini.apiKey,
      this.settings.gemini.model
    ));

    // Ollama
    this.providers.set('ollama', new OllamaProvider(
      this.settings.ollama.baseUrl,
      this.settings.ollama.model
    ));
  }

  getProvider(type?: AIProviderType): AIProvider | null {
    const providerType = type || this.settings.defaultProvider;
    return this.providers.get(providerType) || null;
  }

  getAvailableProviders(): { type: AIProviderType; name: string; configured: boolean }[] {
    return Array.from(this.providers.entries()).map(([type, provider]) => ({
      type,
      name: provider.name,
      configured: provider.isConfigured(),
    }));
  }

  async complete(
    messages: AIMessage[],
    options?: AICompletionOptions & { provider?: AIProviderType }
  ): Promise<AICompletionResult> {
    const provider = this.getProvider(options?.provider);
    if (!provider) {
      throw new Error('No AI provider available');
    }
    if (!provider.isConfigured()) {
      throw new Error(`${provider.name} is not configured`);
    }
    return provider.complete(messages, options);
  }

  async streamComplete(
    messages: AIMessage[],
    onChunk: (chunk: string) => void,
    options?: AICompletionOptions & { provider?: AIProviderType }
  ): Promise<void> {
    const provider = this.getProvider(options?.provider);
    if (!provider) {
      throw new Error('No AI provider available');
    }
    if (!provider.isConfigured()) {
      throw new Error(`${provider.name} is not configured`);
    }
    if (!provider.streamComplete) {
      // Fallback to non-streaming
      const result = await provider.complete(messages, options);
      onChunk(result.content);
      return;
    }
    return provider.streamComplete(messages, onChunk, options);
  }

  // Helper for checking Ollama availability
  async checkOllamaStatus(): Promise<{ available: boolean; models: string[] }> {
    const ollama = this.providers.get('ollama') as OllamaProvider | undefined;
    if (!ollama) {
      return { available: false, models: [] };
    }
    const available = await ollama.isAvailable();
    const models = available ? await ollama.getModels() : [];
    return { available, models };
  }
}

// Singleton instance
export const aiService = new AIService();

// Re-export types
export * from './types';
