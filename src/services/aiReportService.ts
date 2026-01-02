import { supabase } from '../lib/supabase';
import { AIReportDefinition } from '../types/aiReport';
import {
  exploreForIntent,
  formatExplorationForPrompt,
  parseUserIntent
} from './dataExplorationService';

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
  error?: string;
}

export interface AILearning {
  type: 'terminology' | 'product' | 'preference' | 'correction';
  key: string;
  value: string;
  confidence: number;
  source: 'explicit' | 'inferred';
}

export interface AIUsageData {
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
  rawResponse?: string;
  learnings?: AILearning[];
  usage?: AIUsageData;
  budgetExhausted?: boolean;
  needsClarification?: boolean;
  clarificationOptions?: string[];
  reportContext?: ExtractedReportContext;
}

export async function generateReport(
  prompt: string,
  conversationHistory: ChatMessage[],
  customerId: string,
  isAdmin: boolean,
  knowledgeContext?: string,
  currentReport?: AIReportDefinition | null,
  customerName?: string
): Promise<GenerateReportResponse> {
  const intent = parseUserIntent(prompt);

  let explorationContext = '';
  if (intent.needsExploration && conversationHistory.length === 0) {
    console.log('[AI] Exploring data for intent:', intent);
    const exploration = await exploreForIntent(customerId, intent);
    if (exploration.success) {
      explorationContext = formatExplorationForPrompt(exploration);
      console.log('[AI] Exploration complete:', exploration.exploredFields.length, 'fields');
    }
  }

  const combinedContext = [
    knowledgeContext || '',
    explorationContext
  ].filter(Boolean).join('\n\n');

  const history = conversationHistory
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    .map((msg) => ({
      role: msg.role,
      content: msg.report ? JSON.stringify(msg.report) : msg.content,
    }));

  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase.functions.invoke('generate-report', {
    body: {
      prompt,
      conversationHistory: history,
      customerId,
      isAdmin,
      knowledgeContext: combinedContext,
      currentReport: currentReport || undefined,
      customerName: customerName || undefined,
      userId: user?.id,
      userEmail: user?.email,
    },
  });

  if (error) {
    console.error('Generate report error:', error);

    const errorMessage = error.message || 'Unknown error';

    if (errorMessage.includes('credit balance') || errorMessage.includes('ai_credits_depleted')) {
      return {
        report: null,
        message: 'The AI assistant is temporarily unavailable due to API credits. Please try again later or contact support.',
      };
    }

    if (errorMessage.includes('rate_limit') || error.status === 429) {
      return {
        report: null,
        message: 'Too many requests at once. Please wait a few seconds and try again.',
      };
    }

    if (errorMessage.includes('authentication') || error.status === 401 || error.status === 403) {
      return {
        report: null,
        message: 'Unable to connect to the AI service. Please contact support.',
      };
    }

    return {
      report: null,
      message: 'Sorry, I encountered an error. Please try again.',
    };
  }

  if (data?.error) {
    console.error('AI service error:', data.error);
    return {
      report: null,
      message: data.userMessage || data.message || 'Sorry, I encountered an error. Please try again.',
    };
  }

  const { data: sessionData } = await supabase.auth.getSession();

  if (data.report) {
    data.report.customerId = customerId;
    data.report.createdBy = sessionData?.session?.user?.id || 'unknown';
  }

  return {
    report: data.report || null,
    message: data.message || '',
    rawResponse: data.rawResponse,
    learnings: data.learnings,
    usage: data.usage || undefined,
    budgetExhausted: data.budgetExhausted || false,
    needsClarification: data.needsClarification || false,
    clarificationOptions: data.clarificationOptions,
    reportContext: data.reportContext || undefined,
  };
}

export interface SavedAIReport {
  id: string;
  name: string;
  description?: string;
  definition: AIReportDefinition;
  customerId: string;
  createdAt: string;
  createdBy: string;
}

export async function saveAIReport(
  report: AIReportDefinition,
  customerId: string
): Promise<SavedAIReport> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;

  if (!userId) {
    throw new Error('Not authenticated');
  }

  const savedReport: SavedAIReport = {
    id: report.id,
    name: report.name,
    description: report.description,
    definition: report,
    customerId,
    createdAt: new Date().toISOString(),
    createdBy: userId,
  };

  const filePath = `${customerId}/ai-reports/${report.id}.json`;
  const content = new Blob([JSON.stringify(savedReport)], { type: 'application/json' });

  const { error } = await supabase.storage
    .from('customer-reports')
    .upload(filePath, content, {
      contentType: 'application/json',
      upsert: true,
    });

  if (error) {
    console.error('Storage upload error:', error);
    throw new Error(`Failed to save report: ${error.message}`);
  }

  return savedReport;
}

export async function loadAIReports(customerId: string): Promise<SavedAIReport[]> {
  const { data: files, error } = await supabase.storage
    .from('customer-reports')
    .list(`${customerId}/ai-reports`);

  if (error) {
    console.error('Failed to list AI reports:', error);
    return [];
  }

  if (!files || files.length === 0) {
    return [];
  }

  const reports: SavedAIReport[] = [];

  for (const file of files) {
    if (!file.name.endsWith('.json')) continue;

    try {
      const { data } = await supabase.storage
        .from('customer-reports')
        .download(`${customerId}/ai-reports/${file.name}`);

      if (data) {
        const text = await data.text();
        const report = JSON.parse(text) as SavedAIReport;

        if (report?.definition && !report.definition.dateRange) {
          console.warn(`Report ${file.name} missing dateRange, using default`);
          report.definition = {
            ...report.definition,
            dateRange: { type: 'last90' as const },
          };
        }

        reports.push(report);
      }
    } catch (e) {
      console.error(`Failed to load report ${file.name}:`, e);
    }
  }

  return reports.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function loadAIReport(
  customerId: string,
  reportId: string
): Promise<SavedAIReport | null> {
  try {
    const { data } = await supabase.storage
      .from('customer-reports')
      .download(`${customerId}/ai-reports/${reportId}.json`);

    if (!data) return null;

    const text = await data.text();
    const report = JSON.parse(text) as SavedAIReport;

    if (report?.definition && !report.definition.dateRange) {
      console.warn('Report definition missing dateRange, using default');
      report.definition = {
        ...report.definition,
        dateRange: { type: 'last90' as const },
      };
    }

    return report;
  } catch {
    return null;
  }
}

export async function deleteAIReport(
  customerId: string,
  reportId: string
): Promise<void> {
  const { error } = await supabase.storage
    .from('customer-reports')
    .remove([`${customerId}/ai-reports/${reportId}.json`]);

  if (error) {
    throw new Error(`Failed to delete report: ${error.message}`);
  }
}

export interface ExtractedReportContext {
  hasColumns: boolean;
  hasFilters: boolean;
  hasIntent: boolean;
  suggestedColumns: string[];
  suggestedFilters: Array<{ column: string; operator: string; value: string }>;
  reportName?: string;
  dateRange?: string;
}

export function extractReportContextFromConversation(
  messages: ChatMessage[],
  currentReport: AIReportDefinition | null
): ExtractedReportContext {
  const context: ExtractedReportContext = {
    hasColumns: false,
    hasFilters: false,
    hasIntent: false,
    suggestedColumns: [],
    suggestedFilters: [],
  };

  if (currentReport) {
    context.hasIntent = true;
    context.hasColumns = true;
    context.reportName = currentReport.name;

    currentReport.sections.forEach(section => {
      if (section.type === 'table' && 'config' in section) {
        const tableConfig = section.config as { columns?: Array<{ field: string }> };
        if (tableConfig.columns) {
          context.suggestedColumns.push(...tableConfig.columns.map(c => c.field));
        }
      }
      if (section.type === 'chart' && 'config' in section) {
        const chartConfig = section.config as { groupBy?: string; metrics?: string[] };
        if (chartConfig.groupBy) context.suggestedColumns.push(chartConfig.groupBy);
        if (chartConfig.metrics) context.suggestedColumns.push(...chartConfig.metrics);
      }
    });

    if (currentReport.filters && currentReport.filters.length > 0) {
      context.hasFilters = true;
      context.suggestedFilters = currentReport.filters.map(f => ({
        column: f.field,
        operator: f.operator,
        value: String(f.value),
      }));
    }

    return context;
  }

  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase());
  const allText = userMessages.join(' ');

  const intentKeywords = [
    'show me', 'what are', 'which', 'how many', 'total', 'average', 'compare',
    'breakdown', 'by carrier', 'by state', 'by month', 'trend', 'top', 'highest',
    'lowest', 'cost', 'spend', 'shipment', 'volume', 'report', 'analyze'
  ];
  context.hasIntent = intentKeywords.some(keyword => allText.includes(keyword));

  const columnKeywords: Record<string, string> = {
    'carrier': 'carrier_name',
    'cost': 'total_cost',
    'spend': 'total_cost',
    'state': 'origin_state',
    'origin': 'origin_state',
    'destination': 'destination_state',
    'date': 'pickup_date',
    'month': 'pickup_date',
    'mode': 'mode_name',
    'weight': 'total_weight',
    'shipment': 'load_id',
    'customer': 'customer_name',
    'revenue': 'retail',
    'margin': 'margin',
  };

  Object.entries(columnKeywords).forEach(([keyword, column]) => {
    if (allText.includes(keyword) && !context.suggestedColumns.includes(column)) {
      context.suggestedColumns.push(column);
    }
  });

  context.hasColumns = context.suggestedColumns.length > 0;

  if (allText.includes('last month') || allText.includes('previous month')) {
    context.dateRange = 'previous_month';
  } else if (allText.includes('last week') || allText.includes('previous week')) {
    context.dateRange = 'previous_week';
  } else if (allText.includes('this quarter') || allText.includes('q4') || allText.includes('q3')) {
    context.dateRange = 'this_quarter';
  } else if (allText.includes('this year') || allText.includes('ytd')) {
    context.dateRange = 'ytd';
  }

  if (context.hasIntent && context.suggestedColumns.length > 0) {
    const primaryColumn = context.suggestedColumns[0];
    const formattedColumn = primaryColumn.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    context.reportName = `${formattedColumn} Analysis`;
  }

  return context;
}
