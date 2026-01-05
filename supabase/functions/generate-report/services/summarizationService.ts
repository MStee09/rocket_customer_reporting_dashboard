interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SummarizationResult {
  summarized: boolean;
  messages: Message[];
  summary?: string;
  originalCount: number;
  newCount: number;
  tokensSaved?: number;
}

const SUMMARIZATION_THRESHOLD = 8;
const KEEP_RECENT_COUNT = 4;
const MAX_CONTEXT_TOKENS = 4000;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function calculateConversationTokens(messages: Message[]): number {
  return messages.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);
}

async function generateSummary(messages: Message[]): Promise<string> {
  const conversationText = messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  const prompt = `Summarize this conversation between a user and an AI assistant analyzing shipping/logistics data. Focus on:
1. Key questions asked
2. Data findings discovered
3. Reports or analyses created
4. Any preferences or corrections the user made

Keep the summary concise (3-5 sentences) but include specific numbers and findings mentioned.

CONVERSATION:
${conversationText}

SUMMARY:`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`Summarization failed: ${response.status}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || 'Previous conversation context.';

  } catch (error) {
    console.error('[summarize] Error:', error);
    return `Previous conversation covered ${messages.length} exchanges about shipping data analysis.`;
  }
}

export async function maybeSummarizeConversation(
  messages: Message[]
): Promise<SummarizationResult> {
  const originalCount = messages.length;
  const totalTokens = calculateConversationTokens(messages);

  const needsSummarization =
    messages.length > SUMMARIZATION_THRESHOLD ||
    totalTokens > MAX_CONTEXT_TOKENS;

  if (!needsSummarization) {
    return {
      summarized: false,
      messages,
      originalCount,
      newCount: messages.length
    };
  }

  console.log(`[summarize] Compressing ${messages.length} messages (${totalTokens} tokens)`);

  const messagesToSummarize = messages.slice(0, -KEEP_RECENT_COUNT);
  const recentMessages = messages.slice(-KEEP_RECENT_COUNT);

  const summary = await generateSummary(messagesToSummarize);

  const summaryMessage: Message = {
    role: 'assistant',
    content: `[Previous conversation summary: ${summary}]`
  };

  const compressedMessages = [summaryMessage, ...recentMessages];
  const newTokens = calculateConversationTokens(compressedMessages);

  console.log(`[summarize] Compressed to ${compressedMessages.length} messages (${newTokens} tokens)`);

  return {
    summarized: true,
    messages: compressedMessages,
    summary,
    originalCount,
    newCount: compressedMessages.length,
    tokensSaved: totalTokens - newTokens
  };
}

export { estimateTokens, calculateConversationTokens };
