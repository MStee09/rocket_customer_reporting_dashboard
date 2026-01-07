// src/services/widgetDataService.ts

import { supabase } from '@/lib/supabase';
import { getWidgetById } from '@/config/widgets/widgetRegistry';
import { transformToTableFormat, type TableData } from '@/utils/tableTransform';
import type { ReportExecutionParams, DateRange } from '@/types/report';
import type { WidgetData } from '@/types/widget';

// ============================================
// TYPES
// ============================================

export interface WidgetExecutionResult {
  widgetId: string;
  widgetName: string;
  widgetData: WidgetData;
  tableData: TableData;
  executedAt: string;
}

// ============================================
// ERRORS
// ============================================

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

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Executes a widget and returns both raw data and table-formatted data.
 * This is the core function for the raw data view.
 */
export async function executeWidget(
  widgetId: string,
  params: ReportExecutionParams,
  customerId: string
): Promise<WidgetExecutionResult> {
  // Get widget definition from registry
  const widgetDef = getWidgetById(widgetId);

  if (!widgetDef) {
    throw new WidgetNotFoundError(widgetId);
  }

  // Ensure we have a valid date range
  const dateRange = params.dateRange || getDefaultDateRange();

  try {
    // Execute the widget's calculate function
    const widgetData = await widgetDef.calculate({
      supabase,
      dateRange,
      filters: params.filters,
      customerId,
    });

    // Transform to table format
    const tableData = transformToTableFormat(widgetData);

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

/**
 * Executes a widget for a saved report (uses frozen params).
 * Called when viewing a widget-backed saved report.
 */
export async function executeWidgetReport(
  widgetId: string,
  executionParams: ReportExecutionParams,
  customerId: string
): Promise<WidgetExecutionResult> {
  return executeWidget(widgetId, executionParams, customerId);
}

/**
 * Gets widget definition metadata without executing.
 * Useful for displaying widget info before data loads.
 */
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
    visualizationType: widgetDef.visualization.type,
  };
}

// ============================================
// UTILITIES
// ============================================

function getDefaultDateRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}
