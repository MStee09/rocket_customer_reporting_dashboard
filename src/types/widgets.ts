import { SupabaseClient } from '@supabase/supabase-js';

export type WidgetCategory = 'volume' | 'financial' | 'geographic' | 'performance' | 'breakdown';
export type WidgetScope = 'global' | 'customer';
export type WidgetSize = 'small' | 'medium' | 'wide' | 'tall' | 'large' | 'hero';
export type WidgetSizeLevel = 'default' | 'large' | 'xlarge' | 'full';

export type WidgetType =
  | 'kpi'
  | 'featured_kpi'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'line_chart'
  | 'pie_chart'
  | 'bar_chart'
  | 'table'
  | 'map';

export interface WidgetData {
  value?: number | string;
  label?: string;
  format?: 'number' | 'currency' | 'percentage';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  data?: any[];
  chartData?: any[];
  tableData?: any[];
  columns?: any[];
  mapData?: any;
  subtitle?: string;
  shipments?: any[];
  stateData?: any;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface WidgetCalculateParams {
  supabase: SupabaseClient;
  customerId?: string | number;
  effectiveCustomerIds: number[];
  isAdmin: boolean;
  isViewingAsCustomer: boolean;
  dateRange: DateRange;
}

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  category: WidgetCategory;
  scope: WidgetScope;
  type: WidgetType;
  size: WidgetSize;
  icon: string;
  iconColor: string;
  gradient?: string;
  adminOnly?: boolean;
  calculate: (params: WidgetCalculateParams) => Promise<WidgetData>;
}

export interface GridLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardLayoutConfig {
  layout: string[];
  gridLayout?: GridLayoutItem[];
  widgetSizes?: Record<string, WidgetSizeLevel>;
  hiddenWidgets?: string[];
  customWidgets?: string[];
}
