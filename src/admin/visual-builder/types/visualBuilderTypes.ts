export type ChartType = 'bar' | 'line' | 'pie' | 'kpi' | 'table' | 'area' | 'grouped_bar';
export type BuilderMode = 'ai' | 'manual';
export type Aggregation = 'sum' | 'avg' | 'count' | 'min' | 'max';
export type DateRangePreset = 'last7' | 'last30' | 'last90' | 'thisMonth' | 'lastMonth';
export type PublishDestination = 'pulse' | 'analytics';
export type PulseSection = 'key_metrics' | 'shipment_analysis' | 'financial_overview' | 'custom';
export type AnalyticsSection = 'overview' | 'trends' | 'comparisons' | 'custom';

export const DATE_PRESETS: Array<{ value: DateRangePreset; label: string }> = [
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'last90', label: 'Last 90 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
];

export interface Column {
  id: string;
  label: string;
  category: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  description?: string;
  adminOnly?: boolean;
}

export interface AIConfig {
  title: string;
  xAxis: string;
  yAxis: string;
  aggregation: string;
  filters: Array<{ field: string; operator: string; value: string }>;
  searchTerms: string[];
  groupingLogic?: string;
}

export interface EditableFilter {
  id: string;
  field: string;
  operator: 'contains' | 'equals' | 'gt' | 'lt';
  value: string;
}

export interface MultiDimensionData {
  primary_group: string;
  secondary_group: string;
  value: number;
  count: number;
}

export interface GroupedChartData {
  primaryGroup: string;
  [secondaryGroup: string]: string | number;
}

export interface WidgetConfig {
  name: string;
  description: string;
  chartType: ChartType;
  groupByColumn: string | null;
  metricColumn: string | null;
  aggregation: Aggregation;
  filters: Array<{ field: string; operator: string; value: string }>;
  data: Array<{ label: string; value: number }> | GroupedChartData[] | null;
  aiConfig?: AIConfig;
  secondaryGroupBy?: string;
  secondaryGroups?: string[];
  isMultiDimension?: boolean;
  rawMultiDimData?: MultiDimensionData[];
}
