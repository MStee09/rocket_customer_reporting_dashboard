import { supabase } from '../lib/supabase';
import { AIReportDefinition } from '../types/aiReport';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  report?: AIReportDefinition;
  error?: string;
}

export interface GenerateReportResponse {
  report: AIReportDefinition | null;
  message: string;
  rawResponse?: string;
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
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  const history = conversationHistory
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    .map((msg) => ({
      role: msg.role,
      content: msg.report ? JSON.stringify(msg.report) : msg.content,
    }));

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-report`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        prompt,
        conversationHistory: history,
        customerId,
        isAdmin,
        knowledgeContext,
        currentReport: currentReport || undefined,
        customerName: customerName || undefined,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.report) {
    data.report.customerId = customerId;
    data.report.createdBy = sessionData.session?.user?.id || 'unknown';
  }

  return {
    report: data.report || null,
    message: data.message || '',
    rawResponse: data.rawResponse,
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
