import type { AIProvider, AIMessage, AICompletionOptions, AICompletionResult } from '../types';

export class OllamaProvider implements AIProvider {
  type = 'ollama' as const;
  name = 'Ollama (Local)';
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama3.2') {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  isConfigured(): boolean {
    return !!this.baseUrl && !!this.model;
  }

  async complete(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResult> {
    const systemPrompt = options?.systemPrompt || messages.find(m => m.role === 'system')?.content;
    const chatMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Add system message at the beginning if present
    if (systemPrompt) {
      chatMessages.unshift({ role: 'system', content: systemPrompt });
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: chatMessages,
        stream: false,
        options: {
          temperature: options?.temperature || 0.7,
          num_predict: options?.maxTokens || 4096,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.message?.content || '',
      provider: 'ollama',
      model: this.model,
      tokensUsed: data.eval_count,
    };
  }

  async streamComplete(
    messages: AIMessage[],
    onChunk: (chunk: string) => void,
    options?: AICompletionOptions
  ): Promise<void> {
    const systemPrompt = options?.systemPrompt || messages.find(m => m.role === 'system')?.content;
    const chatMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role,
      content: m.content,
    }));

    if (systemPrompt) {
      chatMessages.unshift({ role: 'system', content: systemPrompt });
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: chatMessages,
        stream: true,
        options: {
          temperature: options?.temperature || 0.7,
          num_predict: options?.maxTokens || 4096,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            onChunk(parsed.message.content);
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }

  // Check if Ollama is running and get available models
  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.models?.map((m: { name: string }) => m.name) || [];
    } catch {
      return [];
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
