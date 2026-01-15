import { SupabaseClient } from '@supabase/supabase-js';
import { AIReportDefinition, ExecutedReportData } from '../types/aiReport';
import { CustomWidgetDefinition } from '../config/widgets/customWidgetTypes';
import { saveCustomWidget, deleteCustomWidget } from '../config/widgets/customWidgetStorage';
import { executeReportData } from './reportDataExecutor';
import { logger } from '../utils/logger';

export async function createWidgetFromAIReport(
  supabase: SupabaseClient,
  params: {
    reportDefinition: AIReportDefinition;
    sourceReportId: string;
    sourceReportName: string;
    title: string;
    description?: string;
    sectionIndices: number[];
    size: 'small' | 'medium' | 'wide' | 'full';
    refreshInterval: number;
    userId: string;
    userEmail: string;
    customerId?: number;
    customerName?: string;
  }
): Promise<{ success: boolean; widgetId?: string; error?: string }> {
  try {
    const widgetId = `ai_widget_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const widget: CustomWidgetDefinition = {
      id: widgetId,
      name: params.title,
      description: params.description || `Generated from AI report: ${params.sourceReportName}`,
      type: 'ai_report',
      category: 'ai_generated',
      source: 'ai',
      config: {
        sourceReportId: params.sourceReportId,
        sourceReportName: params.sourceReportName,
        displayMode: params.sectionIndices.length === params.reportDefinition.sections.length
          ? 'full_report'
          : 'selected_sections',
        sectionIndices: params.sectionIndices,
        reportDefinition: params.reportDefinition,
        compact: true,
        showTitle: true,
      },
      dataSource: {
        type: 'ai_generated',
        aiGenerated: {
          originalPrompt: params.reportDefinition.description || '',
          generatedQuery: {
            baseTable: 'shipment',
            columns: [],
          },
        },
      },
      visualization: {
        type: 'ai_report',
      },
      display: {
        icon: 'Sparkles',
        iconColor: 'bg-purple-600',
        defaultSize: params.size,
        refreshInterval: params.refreshInterval,
      },
      visibility: params.customerId
        ? { type: 'specific_customers', customerIds: [params.customerId] }
        : { type: 'admin_only' },
      createdBy: {
        userId: params.userId,
        userEmail: params.userEmail,
        isAdmin: !params.customerId,
        customerId: params.customerId,
        customerName: params.customerName,
        timestamp: new Date().toISOString(),
      },
      dataMode: 'dynamic',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    const result = await saveCustomWidget(supabase, widget, params.customerId);

    if (result.success) {
      logger.log('[AI Widget] Created widget:', widgetId);
      return { success: true, widgetId };
    } else {
      return { success: false, error: result.error };
    }
  } catch (err) {
    logger.error('[AI Widget] Failed to create widget:', err);
    return { success: false, error: String(err) };
  }
}

export async function executeAIWidget(
  supabase: SupabaseClient,
  widget: CustomWidgetDefinition,
  customerId: string,
  isAdmin: boolean
): Promise<{ success: boolean; data?: ExecutedReportData; error?: string }> {
  try {
    const config = widget.config as {
      reportDefinition: AIReportDefinition;
      sectionIndices: number[];
    };

    if (!config.reportDefinition) {
      return { success: false, error: 'Widget missing report definition' };
    }

    const miniReport: AIReportDefinition = {
      ...config.reportDefinition,
      sections: config.sectionIndices.map(idx => config.reportDefinition.sections[idx]).filter(Boolean),
    };

    const executedData = await executeReportData(
      supabase,
      miniReport,
      customerId,
      isAdmin
    );

    return { success: true, data: executedData };
  } catch (err) {
    logger.error('[AI Widget] Execution failed:', err);
    return { success: false, error: String(err) };
  }
}

export async function deleteAIWidget(
  supabase: SupabaseClient,
  widgetId: string,
  customerId?: number
): Promise<{ success: boolean; error?: string }> {
  return deleteCustomWidget(supabase, widgetId, customerId);
}

export async function updateWidgetRefreshInterval(
  supabase: SupabaseClient,
  widget: CustomWidgetDefinition,
  refreshInterval: number,
  customerId?: number
): Promise<{ success: boolean; error?: string }> {
  const updatedWidget = {
    ...widget,
    display: {
      ...widget.display,
      refreshInterval,
    },
    updatedAt: new Date().toISOString(),
  };

  return saveCustomWidget(supabase, updatedWidget, customerId);
}
