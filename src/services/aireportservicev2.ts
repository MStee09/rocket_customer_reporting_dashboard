import { supabase } from '../lib/supabase';
import { AIReportDefinition } from '../types/aiReport';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ToolExecution {
  toolName: string;
  toolInput: Record<string, unknown>;
  result: unknown;
  timestamp: string;
  duration?: number;
}

export interface LearningV2 {
  type: 'terminology' | 'product' | 'preference' | 'correction';
  key: string;
  value: string;
  confidence: number;
  source: 'explicit' | 'inferred' | 'tool';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  report?: AIReportDefinition;
  toolsUsed?: string[];
  toolExecutions?: ToolExecution[];
  learnings?: LearningV2[];
  error?: string;
  needsClarification?: boolean;
  clarificationOptions?: string[];
}

export interface ConversationState {
  reportInProgress: Partial<AIReportDefinition> | null;
  sessionId?: string;
}

export interface AIUsageInfo {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCostUsd: number;
  outputCostUsd: number;
  totalCostUsd: number;
  latencyMs: number;
}

export interface GenerateReportResponse {
  report: AIReportDefinition | null;
  message: string;
  toolsUsed: string[];
  toolExecutions: ToolExecution[];
  learnings?: LearningV2[];
  conversationState: ConversationState;
  needsClarification?: boolean;
  clarificationOptions?: string[];
  usage?: AIUsageInfo;
}

export async function generateReportV2(
  prompt: string,
  conversationHistory: ChatMessage[],
  customerId: string,
  isAdmin: boolean,
  conversationState?: ConversationState,
  customerName?: string,
  useTools: boolean = true,
  userId?: string,
  userEmail?: string
): Promise<GenerateReportResponse> {
  const history: Message[] = conversationHistory
    .filter(msg => msg.role === 'user' || msg.role === 'assistant')
    .map(msg => ({
      role: msg.role,
      content: msg.content
    }));

  try {
    const { data, error } = await supabase.functions.invoke('generate-report', {
      body: {
        prompt,
        conversationHistory: history,
        customerId,
        isAdmin,
        customerName,
        conversationState,
        useTools,
        userId,
        userEmail,
        sessionId: conversationState?.sessionId
      }
    });

    if (error) {
      console.error('Generate report error:', error);

      const errorMessage = error.message || 'Unknown error';

      if (errorMessage.includes('credit balance') || errorMessage.includes('ai_credits_depleted')) {
        return {
          report: null,
          message: 'The AI assistant is temporarily unavailable due to API credits. Please try again later or contact support.',
          toolsUsed: [],
          toolExecutions: [],
          conversationState: conversationState || { reportInProgress: null }
        };
      }

      if (errorMessage.includes('rate_limit') || error.status === 429) {
        return {
          report: null,
          message: 'Too many requests at once. Please wait a few seconds and try again.',
          toolsUsed: [],
          toolExecutions: [],
          conversationState: conversationState || { reportInProgress: null }
        };
      }

      if (errorMessage.includes('authentication') || error.status === 401 || error.status === 403) {
        return {
          report: null,
          message: 'Unable to connect to the AI service. Please contact support.',
          toolsUsed: [],
          toolExecutions: [],
          conversationState: conversationState || { reportInProgress: null }
        };
      }

      return {
        report: null,
        message: 'Sorry, I encountered an error. Please try again.',
        toolsUsed: [],
        toolExecutions: [],
        conversationState: conversationState || { reportInProgress: null }
      };
    }

    if (data?.error) {
      console.error('AI service error:', data.error);
      return {
        report: null,
        message: data.userMessage || data.message || 'Sorry, I encountered an error. Please try again.',
        toolsUsed: data.toolsUsed || [],
        toolExecutions: data.toolExecutions || [],
        conversationState: data.conversationState || conversationState || { reportInProgress: null }
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

    const toolsUsed = (data.toolExecutions || []).map((t: ToolExecution) => t.toolName);

    return {
      report: data.report || null,
      message: data.message || '',
      toolsUsed,
      toolExecutions: data.toolExecutions || [],
      learnings: data.learnings,
      conversationState: data.conversationState || { reportInProgress: null },
      needsClarification: data.needsClarification,
      clarificationOptions: data.clarificationOptions,
      usage: data.usage
    };
  } catch (err) {
    console.error('AI service error:', err);
    return {
      report: null,
      message: 'Sorry, something went wrong. Please try again.',
      toolsUsed: [],
      toolExecutions: [],
      conversationState: conversationState || { reportInProgress: null }
    };
  }
}

export function formatToolExecution(execution: ToolExecution): { icon: string; label: string; detail: string } {
  const { toolName, toolInput, result } = execution;
  const res = result as Record<string, unknown>;

  // Human-readable field labels
  const fieldLabels: Record<string, string> = {
    carrier_name: 'carriers',
    origin_state: 'origin states',
    destination_state: 'destination states',
    origin_city: 'origin cities',
    destination_city: 'destination cities',
    mode_name: 'shipping modes',
    status: 'statuses',
    customer_name: 'customers',
    service_type: 'service types',
  };

  const humanizeField = (field: string): string => {
    return fieldLabels[field] || field.replace(/_/g, ' ');
  };

  switch (toolName) {
    case 'explore_field': {
      if (res.error) return { icon: 'X', label: `Failed: ${toolInput.field_name}`, detail: String(res.error) };
      const field = toolInput.field_name as string;
      const count = res.unique_count || 0;
      const coverage = res.populated_percent as number || 0;
      const label = fieldLabels[field] 
        ? `Found ${count} ${fieldLabels[field]} in your data`
        : `Found ${count} unique ${humanizeField(field)} values`;
      const detail = coverage < 80 
        ? `(${Math.round(100 - coverage)}% of records missing this field)`
        : '';
      return { icon: 'Search', label, detail };
    }
    case 'preview_grouping': {
      if (res.error) return { icon: 'X', label: `Preview failed`, detail: String(res.error) };
      const groupBy = toolInput.group_by as string;
      const groups = res.total_groups || 0;
      return { 
        icon: 'BarChart2', 
        label: `Grouped by ${humanizeField(groupBy)}`, 
        detail: `${groups} categories ready to visualize` 
      };
    }
    case 'emit_learning':
      return { 
        icon: 'Brain', 
        label: `Learned: "${toolInput.key}"`, 
        detail: `Means: ${toolInput.value}` 
      };
    case 'finalize_report': {
      const validation = res.validation as Record<string, unknown>;
      return validation?.valid
        ? { icon: 'CheckCircle', label: 'Report ready', detail: 'All validations passed' }
        : { icon: 'AlertTriangle', label: 'Validation issues', detail: ((validation?.errors as string[]) || []).join(', ') };
    }
    case 'ask_clarification':
      return { icon: 'HelpCircle', label: 'Need more info', detail: String(toolInput.question) };
    default:
      return { icon: 'Wrench', label: toolName, detail: '' };
  }
}

export function buildThinkingSteps(toolExecutions: ToolExecution[]): Array<{ icon: string; label: string; detail?: string }> {
  return toolExecutions.map(e => formatToolExecution(e));
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
