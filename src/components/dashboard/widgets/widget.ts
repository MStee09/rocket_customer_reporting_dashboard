// src/types/widget.ts

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DateRange } from './report';

/**
 * Data returned by widget calculate() functions
 */
export interface WidgetData {
  /** Primary visual value (KPI, aggregated metric) */
  value?: number | string;
  
  /** Raw rows from Supabase - used for table view */
  rows: Record<string, unknown>[];
  
  /** Optional metadata for visuals / AI context */
  meta?: {
    metric?: string;
    unit?: 'currency' | 'number' | 'percentage' | 'string';
    breakdown?: string;
  };
}

/**
 * Arguments passed to widget calculate() function
 */
export interface WidgetCalculateArgs {
  supabase: SupabaseClient;
  dateRange: DateRange;
  filters?: Record<string, unknown>;
  customerId: string;
}

/**
 * Visualization configuration for widget rendering
 */
export interface WidgetVisualization {
  type: 'kpi' | 'bar' | 'line' | 'table' | 'map' | 'pie' | 'area';
  config?: Record<string, unknown>;
}

/**
 * Complete widget definition
 */
export interface WidgetDefinition {
  id: string;
  name: string;
  description?: string;
  visualization: WidgetVisualization;
  calculate: (args: WidgetCalculateArgs) => Promise<WidgetData>;
}

/**
 * Widget placement in UI
 */
export type WidgetPlacement = 'dashboard' | 'analytics_hub';

/**
 * Widget scope (who can see it)
 */
export type WidgetScope = 'system' | 'customer';
