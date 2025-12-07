// AI Provider types
export type AIProviderType = 'claude' | 'gemini' | 'ollama';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AICompletionOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface AICompletionResult {
  content: string;
  provider: AIProviderType;
  model: string;
  tokensUsed?: number;
}

export interface AIProvider {
  type: AIProviderType;
  name: string;
  isConfigured: () => boolean;
  complete: (messages: AIMessage[], options?: AICompletionOptions) => Promise<AICompletionResult>;
  streamComplete?: (
    messages: AIMessage[],
    onChunk: (chunk: string) => void,
    options?: AICompletionOptions
  ) => Promise<void>;
}

export interface AISettings {
  defaultProvider: AIProviderType;
  claude: {
    apiKey: string;
    model: string;
  };
  gemini: {
    apiKey: string;
    model: string;
  };
  ollama: {
    baseUrl: string;
    model: string;
  };
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  defaultProvider: 'ollama',
  claude: {
    apiKey: '',
    model: 'claude-3-5-sonnet-20241022',
  },
  gemini: {
    apiKey: '',
    model: 'gemini-1.5-flash',
  },
  ollama: {
    baseUrl: 'http://localhost:11434',
    model: 'qwen3-vl:4b',
  },
};
