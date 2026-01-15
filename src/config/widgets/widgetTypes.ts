import { SupabaseClient } from '@supabase/supabase-js';

export type WidgetAccess = 'customer' | 'admin';

export type WidgetType =
  | 'kpi'
  | 'featured_kpi'
  | 'line_chart'
  | 'bar_chart'
  | 'pie_chart'
  | 'table'
  | 'map'
  | 'ai_report';

export type WidgetCategory =
  | 'volume'
  | 'financial'
  | 'geographic'
  | 'performance'
  | 'breakdown'
  | 'customers'
  | 'ai_generated';

export type WidgetSize =
  | 'small'
  | 'medium'
  | 'wide'
  | 'full';

export interface WhatItShows {
  summary: string;
  columns: {
    name: string;
    description: string;
  }[];
  filters: string[];
  sortedBy?: string;
  limit?: string;
  updateBehavior: 'live' | 'snapshot';
}

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  type: WidgetType;
  category: WidgetCategory;
  access: WidgetAccess;
  defaultSize: WidgetSize;
  icon: string;
  iconColor: string;
  gradient?: string;

  calculate: (params: WidgetCalculateParams) => Promise<WidgetData>;

  whatItShows?: WhatItShows;
  minColSpan?: number;
  maxColSpan?: number;
}

export interface WidgetCalculateParams {
  supabase: SupabaseClient;
  customerId?: number;
  dateRange: { start: string; end: string };
}

export interface WidgetData {
  type: 'kpi' | 'chart' | 'table' | 'map';
  value?: number | string;
  label?: string;
  trend?: { value: number; direction: 'up' | 'down' | 'flat' };
  data?: Record<string, unknown>[];
  columns?: TableColumn[];
  format?: 'number' | 'currency' | 'percent';
}

export interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  format?: 'number' | 'currency' | 'percent' | 'date';
  width?: string;
}

export interface WidgetResultMetadata {
  recordCount?: number;
  dateRange?: { start: string; end: string };
  comparisonPeriod?: string;
  changePercent?: number;
}

export interface KPIWidgetResult {
  type: 'kpi';
  value: number | string;
  label: string;
  format?: 'number' | 'currency' | 'percent';
  trend?: {
    value: number;
    positive: boolean;
  };
  metadata?: WidgetResultMetadata;
}
