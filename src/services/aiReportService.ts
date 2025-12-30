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

export interface GenerateReportResponse {
  report: AIReportDefinition | null;
  message: string;
  rawResponse?: string;
  learnings?: AILearning[];
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

  const { data, error } = await supabase.functions.invoke('generate-report', {
    body: {
      prompt,
      conversationHistory: history,
      customerId,
      isAdmin,
      knowledgeContext: combinedContext,
      currentReport: currentReport || undefined,
      customerName: customerName || undefined,
    },
  });

  if (error) {
    console.error('Generate report error:', error);
    return {
      report: null,
      message: 'Sorry, I encountered an error. Please try again.',
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
