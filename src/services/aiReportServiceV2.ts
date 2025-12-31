import { supabase } from '../lib/supabase';
import { AIReportDefinition } from '../types/aiReport';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  report?: AIReportDefinition;
  toolsUsed?: string[];
  error?: string;
}

export interface ConversationState {
  reportInProgress: Partial<AIReportDefinition> | null;
  sessionId?: string;
}

export interface GenerateReportResponse {
  report: AIReportDefinition | null;
  message: string;
  toolsUsed: string[];
  conversationState: ConversationState;
}

export async function generateReportV2(
  prompt: string,
  conversationHistory: ChatMessage[],
  customerId: string,
  isAdmin: boolean,
  conversationState?: ConversationState,
  customerName?: string
): Promise<GenerateReportResponse> {
  const history: Message[] = conversationHistory
    .filter(msg => msg.role === 'user' || msg.role === 'assistant')
    .map(msg => ({
      role: msg.role,
      content: msg.content
    }));

  try {
    const { data, error } = await supabase.functions.invoke('generate-report-v2', {
      body: {
        prompt,
        conversationHistory: history,
        customerId,
        isAdmin,
        customerName,
        conversationState
      }
    });

    if (error) {
      console.error('Generate report error:', error);
      return {
        report: null,
        message: 'Sorry, I encountered an error. Please try again.',
        toolsUsed: [],
        conversationState: conversationState || { reportInProgress: null }
      };
    }

    if (data.report) {
      data.report.customerId = customerId;

      if (!data.report.id) {
        data.report.id = crypto.randomUUID();
      }
      if (!data.report.createdAt) {
        data.report.createdAt = new Date().toISOString();
      }
      if (!data.report.dateRange) {
        data.report.dateRange = { type: 'last90' };
      }
    }

    return {
      report: data.report || null,
      message: data.message || '',
      toolsUsed: data.toolsUsed || [],
      conversationState: data.conversationState || { reportInProgress: null }
    };
  } catch (err) {
    console.error('AI service error:', err);
    return {
      report: null,
      message: 'Sorry, something went wrong. Please try again.',
      toolsUsed: [],
      conversationState: conversationState || { reportInProgress: null }
    };
  }
}

export async function fetchSuggestedPrompts(
  isAdmin: boolean,
  category?: string
): Promise<Array<{ category: string; prompt: string; description?: string }>> {
  let query = supabase
    .from('ai_suggested_prompts')
    .select('category, prompt_text, description')
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (!isAdmin) {
    query = query.eq('requires_admin', false);
  }

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query.limit(20);

  if (error) {
    console.error('Failed to fetch suggested prompts:', error);
    return getDefaultPrompts(isAdmin);
  }

  return (data || []).map(p => ({
    category: p.category,
    prompt: p.prompt_text,
    description: p.description
  }));
}

function getDefaultPrompts(isAdmin: boolean): Array<{ category: string; prompt: string; description?: string }> {
  const prompts = [
    { category: 'volume', prompt: 'What are my shipping patterns this quarter?', description: 'Overview of shipment volume' },
    { category: 'volume', prompt: 'Which states receive the most shipments?', description: 'Geographic distribution' },
    { category: 'carrier', prompt: 'How does my carrier mix look?', description: 'Carrier usage breakdown' },
    { category: 'lane', prompt: 'What are my top shipping lanes?', description: 'Busiest routes' },
    { category: 'executive', prompt: 'Give me a monthly summary', description: 'High-level KPIs' }
  ];

  if (isAdmin) {
    prompts.unshift(
      { category: 'cost', prompt: 'Which carriers are driving up my costs?', description: 'Cost analysis by carrier' },
      { category: 'cost', prompt: 'What is my cost per mile trend?', description: 'Efficiency tracking' }
    );
  }

  return prompts;
}
