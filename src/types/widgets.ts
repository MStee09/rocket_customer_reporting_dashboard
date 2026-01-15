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

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface TableColumn {
  key: string;
  label: string;
}

export interface TableRow {
  [key: string]: string | number | boolean | null | undefined;
}

export interface StateDataPoint {
  stateCode: string;
  value?: number;
  avgCost?: number;
  shipmentCount?: number;
  isOutlier?: boolean;
}

export interface MapData {
  stateData: StateDataPoint[];
}

export interface ShipmentRecord {
  load_id?: number;
  customer_id?: number;
  retail?: number | string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface WidgetData {
  value?: number | string;
  label?: string;
  format?: 'number' | 'currency' | 'percentage';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  data?: Record<string, unknown>[];
  chartData?: ChartDataPoint[];
  tableData?: TableRow[];
  columns?: TableColumn[];
  mapData?: MapData;
  subtitle?: string;
  shipments?: ShipmentRecord[];
  stateData?: StateDataPoint[];
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
