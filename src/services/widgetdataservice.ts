import { supabase } from '../lib/supabase';
import { getWidgetById } from '../config/widgets/widgetRegistry';
import { transformToTableFormat, type TableData } from '../utils/tabletransform';
import type { ReportExecutionParams, DateRange } from '../types/report';
import type { WidgetData } from '../config/widgets/widgetTypes';

export interface WidgetExecutionResult {
  widgetId: string;
  widgetName: string;
  widgetData: WidgetData;
  tableData: TableData;
  executedAt: string;
}

export class WidgetNotFoundError extends Error {
  constructor(widgetId: string) {
    super(`Widget not found: ${widgetId}`);
    this.name = 'WidgetNotFoundError';
  }
}

export class WidgetExecutionError extends Error {
  constructor(widgetId: string, cause: Error) {
    super(`Failed to execute widget ${widgetId}: ${cause.message}`);
    this.name = 'WidgetExecutionError';
    this.cause = cause;
  }
}

export async function executeWidget(
  widgetId: string,
  params: ReportExecutionParams,
  customerId: string
): Promise<WidgetExecutionResult> {
  const widgetDef = getWidgetById(widgetId);

  if (!widgetDef) {
    throw new WidgetNotFoundError(widgetId);
  }

  const dateRange = params.dateRange || getDefaultDateRange();

  try {
    const widgetData = await widgetDef.calculate({
      supabase,
      dateRange,
      customerId: customerId ? Number(customerId) : undefined,
    });

    const tableData = transformToTableFormat({
      rows: widgetData.data || [],
      value: widgetData.value,
      meta: {
        metric: widgetData.label,
        unit: widgetData.format === 'currency' ? 'currency' :
              widgetData.format === 'percent' ? 'percentage' : 'number',
      },
    });

    return {
      widgetId,
      widgetName: widgetDef.name,
      widgetData,
      tableData,
      executedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw new WidgetExecutionError(
      widgetId,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

export async function executeWidgetReport(
  widgetId: string,
  executionParams: ReportExecutionParams,
  customerId: string
): Promise<WidgetExecutionResult> {
  return executeWidget(widgetId, executionParams, customerId);
}

export function getWidgetMetadata(widgetId: string): {
  id: string;
  name: string;
  description?: string;
  visualizationType: string;
} | null {
  const widgetDef = getWidgetById(widgetId);

  if (!widgetDef) return null;

  return {
    id: widgetDef.id,
    name: widgetDef.name,
    description: widgetDef.description,
    visualizationType: widgetDef.type,
  };
}

function getDefaultDateRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}
