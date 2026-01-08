/**
 * Widget Adapter
 *
 * Provides backwards compatibility for existing widgets.
 * Converts old-style widgets to new WidgetDefinition format.
 *
 * This allows incremental migration - you don't have to update all widgets at once.
 */

import { registerWidget } from '../registry/widgetRegistry';
import { withLimit } from '../utils/withLimit';
import type { WidgetDefinition, WidgetCalculateContext, WidgetData } from '../types/WidgetTypes';
import type { ExecutionParams } from '../types/ExecutionParams';
import type { SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// OLD WIDGET TYPES (what exists today)
// =============================================================================

interface OldWidgetCalculateParams {
  supabase: SupabaseClient;
  customerId?: number;
  dateRange: { start: string; end: string };
  effectiveCustomerIds?: number[];
  isAdmin?: boolean;
  isViewingAsCustomer?: boolean;
}

interface OldWidgetDefinition {
  id: string;
  name: string;
  description?: string;
  type: string;
  category: string;
  access?: 'customer' | 'admin';
  defaultSize?: string;
  icon?: string;
  iconColor?: string;
  calculate: (params: OldWidgetCalculateParams) => Promise<any>;
}

// =============================================================================
// ADAPTER FUNCTION
// =============================================================================

/**
 * Convert an old-style widget to new WidgetDefinition format
 *
 * @example
 * import { totalShipments } from './oldWidgets';
 * const adapted = adaptLegacyWidget(totalShipments);
 * registerWidget(adapted);
 */
export function adaptLegacyWidget(oldWidget: OldWidgetDefinition): WidgetDefinition {
  return {
    id: oldWidget.id,
    name: oldWidget.name,
    description: oldWidget.description || '',
    category: mapCategory(oldWidget.category),
    access: oldWidget.access || 'customer',

    visualization: {
      type: mapVisualizationType(oldWidget.type),
    },

    ui: {
      icon: oldWidget.icon || 'BarChart3',
      iconColor: oldWidget.iconColor || 'bg-blue-500',
      defaultSize: mapSize(oldWidget.defaultSize),
    },

    // Adapted calculate function
    calculate: async (context: WidgetCalculateContext): Promise<WidgetData> => {
      const { supabase, customerId, params } = context;

      // Apply safety limit
      const safeParams = withLimit(params);

      // Convert new params to old format
      const oldParams: OldWidgetCalculateParams = {
        supabase,
        customerId,
        dateRange: safeParams.dateRange,
        effectiveCustomerIds: customerId ? [customerId] : [],
        isAdmin: context.isAdmin || false,
        isViewingAsCustomer: !context.isAdmin,
      };

      // Call the old calculate function
      const result = await oldWidget.calculate(oldParams);

      // Normalize the result to new WidgetData format
      return normalizeWidgetData(result, safeParams);
    },
  };
}

/**
 * Batch adapt and register multiple legacy widgets
 */
export function adaptAndRegisterLegacyWidgets(widgets: OldWidgetDefinition[]): void {
  for (const widget of widgets) {
    const adapted = adaptLegacyWidget(widget);
    registerWidget(adapted);
  }
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapCategory(category: string): WidgetDefinition['category'] {
  const mapping: Record<string, WidgetDefinition['category']> = {
    volume: 'volume',
    financial: 'financial',
    geographic: 'geographic',
    performance: 'performance',
    breakdown: 'breakdown',
    customers: 'customers',
    ai_generated: 'ai_generated',
  };
  return mapping[category] || 'custom';
}

function mapVisualizationType(type: string): WidgetDefinition['visualization']['type'] {
  const mapping: Record<string, WidgetDefinition['visualization']['type']> = {
    kpi: 'kpi',
    featured_kpi: 'featured_kpi',
    line_chart: 'line_chart',
    bar_chart: 'bar_chart',
    pie_chart: 'pie_chart',
    table: 'table',
    map: 'map',
    ai_report: 'table',
  };
  return mapping[type] || 'table';
}

function mapSize(size?: string): WidgetDefinition['ui']['defaultSize'] {
  const mapping: Record<string, WidgetDefinition['ui']['defaultSize']> = {
    small: 'small',
    medium: 'medium',
    wide: 'large',
    large: 'large',
    full: 'full',
  };
  return mapping[size || 'small'] || 'small';
}

function normalizeWidgetData(result: any, params: ExecutionParams): WidgetData {
  // Handle KPI results
  if (result.type === 'kpi' || result.value !== undefined) {
    return {
      type: 'kpi',
      value: result.value,
      label: result.label,
      format: result.format,
      trend: result.trend ? {
        value: result.trend.value,
        direction: result.trend.direction || (result.trend.positive ? 'up' : 'down'),
        isPositive: result.trend.positive,
      } : undefined,
      metadata: {
        recordCount: result.metadata?.recordCount,
        dateRange: params.dateRange,
      },
    };
  }

  // Handle chart/table results
  return {
    type: result.type || 'chart',
    data: result.data || [],
    columns: result.columns,
    metadata: {
      recordCount: result.data?.length || 0,
      dateRange: params.dateRange,
    },
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { OldWidgetDefinition, OldWidgetCalculateParams };
