import type { AIProvider, AIMessage, AICompletionOptions, AICompletionResult } from '../types';

export class GeminiProvider implements AIProvider {
  type = 'gemini' as const;
  name = 'Gemini (Google)';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'gemini-1.5-flash') {
    this.apiKey = apiKey;
    this.model = model;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  private convertMessages(messages: AIMessage[], systemPrompt?: string) {
    const contents: { role: string; parts: { text: string }[] }[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') continue;
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    return {
      contents,
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
    };
  }

  async complete(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResult> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API key not configured');
    }

    const systemPrompt = options?.systemPrompt || messages.find(m => m.role === 'system')?.content;
    const { contents, systemInstruction } = this.convertMessages(messages, systemPrompt);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction,
        generationConfig: {
          temperature: options?.temperature || 0.7,
          maxOutputTokens: options?.maxTokens || 4096,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Gemini API error');
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      content: text,
      provider: 'gemini',
      model: this.model,
      tokensUsed: data.usageMetadata?.totalTokenCount,
    };
  }

  async streamComplete(
    messages: AIMessage[],
    onChunk: (chunk: string) => void,
    options?: AICompletionOptions
  ): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API key not configured');
    }

    const systemPrompt = options?.systemPrompt || messages.find(m => m.role === 'system')?.content;
    const { contents, systemInstruction } = this.convertMessages(messages, systemPrompt);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?key=${this.apiKey}&alt=sse`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction,
        generationConfig: {
          temperature: options?.temperature || 0.7,
          maxOutputTokens: options?.maxTokens || 4096,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Gemini API error');
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
          try {
            const parsed = JSON.parse(data);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              onChunk(text);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }
}
