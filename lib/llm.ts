/**
 * LLM Client - Unified interface for OpenAI and Anthropic
 *
 * Supports both providers with automatic fallback
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  tokensUsed?: number;
}

/**
 * Generate text using configured LLM provider
 */
export async function generateText(
  messages: LLMMessage[],
  options: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
  } = {}
): Promise<LLMResponse> {
  const { temperature = 0.7, maxTokens = 2000 } = options;

  // Try OpenAI first if configured
  if (process.env.OPENAI_API_KEY) {
    return generateWithOpenAI(messages, { temperature, maxTokens, model: options.model });
  }

  // Fallback to Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    return generateWithAnthropic(messages, { temperature, maxTokens, model: options.model });
  }

  throw new Error('No LLM API key configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY');
}

/**
 * Generate using OpenAI API
 */
async function generateWithOpenAI(
  messages: LLMMessage[],
  options: { temperature: number; maxTokens: number; model?: string }
): Promise<LLMResponse> {
  const { temperature, maxTokens, model = 'gpt-4o-mini' } = options;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.statusText} - ${error}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0].message.content,
    model: data.model,
    tokensUsed: data.usage?.total_tokens,
  };
}

/**
 * Generate using Anthropic API
 */
async function generateWithAnthropic(
  messages: LLMMessage[],
  options: { temperature: number; maxTokens: number; model?: string }
): Promise<LLMResponse> {
  const { temperature, maxTokens, model = 'claude-3-5-haiku-20241022' } = options;

  // Anthropic requires system message to be separate
  const systemMessage = messages.find(m => m.role === 'system');
  const nonSystemMessages = messages.filter(m => m.role !== 'system');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemMessage?.content,
      messages: nonSystemMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.statusText} - ${error}`);
  }

  const data = await response.json();

  return {
    content: data.content[0].text,
    model: data.model,
    tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens,
  };
}
