import type { SupabaseClient } from '@supabase/supabase-js';
import type { DateRange } from './report';

export interface WidgetData {
  value?: number | string;
  rows: Record<string, unknown>[];
  meta?: {
    metric?: string;
    unit?: 'currency' | 'number' | 'percentage' | 'string';
    breakdown?: string;
  };
}

export interface WidgetCalculateArgs {
  supabase: SupabaseClient;
  dateRange: DateRange;
  filters?: Record<string, unknown>;
  customerId: string;
}

export interface WidgetVisualization {
  type: 'kpi' | 'bar' | 'line' | 'table' | 'map' | 'pie' | 'area';
  config?: Record<string, unknown>;
}

export interface WidgetDefinition {
  id: string;
  name: string;
  description?: string;
  visualization: WidgetVisualization;
  calculate: (args: WidgetCalculateArgs) => Promise<WidgetData>;
}

export type WidgetPlacement = 'dashboard' | 'analytics_hub';

export type WidgetScope = 'system' | 'customer';
