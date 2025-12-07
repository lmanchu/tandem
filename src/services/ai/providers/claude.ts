import type { AIProvider, AIMessage, AICompletionOptions, AICompletionResult } from '../types';

export class ClaudeProvider implements AIProvider {
  type = 'claude' as const;
  name = 'Claude (Anthropic)';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-3-5-sonnet-20241022') {
    this.apiKey = apiKey;
    this.model = model;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async complete(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResult> {
    if (!this.isConfigured()) {
      throw new Error('Claude API key not configured');
    }

    const systemMessage = options?.systemPrompt || messages.find(m => m.role === 'system')?.content;
    const chatMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role,
      content: m.content,
    }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options?.maxTokens || 4096,
        system: systemMessage,
        messages: chatMessages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Claude API error');
    }

    const data = await response.json();
    return {
      content: data.content[0]?.text || '',
      provider: 'claude',
      model: this.model,
      tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens,
    };
  }

  async streamComplete(
    messages: AIMessage[],
    onChunk: (chunk: string) => void,
    options?: AICompletionOptions
  ): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Claude API key not configured');
    }

    const systemMessage = options?.systemPrompt || messages.find(m => m.role === 'system')?.content;
    const chatMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role,
      content: m.content,
    }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options?.maxTokens || 4096,
        system: systemMessage,
        messages: chatMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Claude API error');
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
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              onChunk(parsed.delta.text);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }
}
