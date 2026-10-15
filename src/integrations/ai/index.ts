import { getEnv } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../common/errors/AppError.js';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletion {
  content: string;
  model: string;
  provider: string;
  isDemo: boolean;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

export interface AIProvider {
  name: string;
  isDemo: boolean;
  complete(messages: AIMessage[], options?: { maxTokens?: number; temperature?: number }): Promise<AICompletion>;
}

class DemoAIProvider implements AIProvider {
  name = 'demo';
  isDemo = true;
  async complete(messages: AIMessage[]): Promise<AICompletion> {
    const userMsg = messages.filter((m) => m.role === 'user').pop()?.content ?? '';
    return {
      content:
        `[DEMO RESPONSE — No AI provider configured]\n\n` +
        `This is a placeholder. In production, a real AI model would answer your question: "${userMsg.slice(0, 200)}".\n\n` +
        `General guidance for MavunoIQ:\n` +
        `- Consult your local agricultural extension officer for crop-specific advice.\n` +
        `- Monitor weather forecasts before planting or harvesting.\n` +
        `- Compare prices across multiple markets before selling.\n\n` +
        `Set AI_PROVIDER and AI_API_KEY in .env to enable live AI responses.`,
      model: 'demo',
      provider: 'demo',
      isDemo: true,
    };
  }
}

class OpenAIProvider implements AIProvider {
  name = 'openai';
  isDemo = false;
  constructor(private apiKey: string, private model: string, private timeoutMs: number) {}
  async complete(
    messages: AIMessage[],
    options: { maxTokens?: number; temperature?: number } = {},
  ): Promise<AICompletion> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model || 'gpt-4o-mini',
          messages,
          max_tokens: options.maxTokens ?? 800,
          temperature: options.temperature ?? 0.4,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        logger.error({ status: res.status, errText }, 'OpenAI request failed');
        throw AppError.provider('AI provider request failed');
      }
      const json = (await res.json()) as {
        choices: { message: { content: string } }[];
        model: string;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };
      return {
        content: json.choices[0]?.message?.content ?? '',
        model: json.model,
        provider: 'openai',
        isDemo: false,
        usage: {
          promptTokens: json.usage?.prompt_tokens,
          completionTokens: json.usage?.completion_tokens,
          totalTokens: json.usage?.total_tokens,
        },
      };
    } finally {
      clearTimeout(t);
    }
  }
}

function createAIProvider(): AIProvider {
  const env = getEnv();
  const provider = (env.AI_PROVIDER || '').toLowerCase();
  if (provider === 'openai' && env.AI_API_KEY) {
    return new OpenAIProvider(env.AI_API_KEY, env.AI_MODEL, env.AI_TIMEOUT_MS);
  }
  return new DemoAIProvider();
}

export const aiProvider: AIProvider = createAIProvider();