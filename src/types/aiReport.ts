export type DateRangeType =
  | 'last30'
  | 'last90'
  | 'last6months'
  | 'lastYear'
  | 'yearToDate'
  | 'allTime'
  | 'custom';

export type ReportTheme = 'blue' | 'red' | 'green' | 'orange' | 'purple' | 'teal' | 'slate';

export interface CategorizationRule {
  contains: string | string[];
  category: string;
}

export interface Categorization {
  field: string;
  name: string;
  rules: CategorizationRule[];
  default: string;
}

export interface NumericRange {
  min?: number;
  max?: number;
  category: string;
}

export interface NumericCategorization {
  field: string;
  name: string;
  ranges: NumericRange[];
}

export interface CalculatedField {
  name: string;
  formula: string;
  label: string;
  format?: 'currency' | 'number' | 'percent';
}

export interface AIReportDefinition {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy: string;
  customerId: string;
  theme?: ReportTheme;
  dateRange: {
    type: DateRangeType;
    customStart?: string;
    customEnd?: string;
  };
  calculatedFields?: CalculatedField[];
  categorization?: Categorization;
  numericCategorization?: NumericCategorization;
  sections: ReportSection[];
}

export type ReportSection =
  | HeroSection
  | StatRowSection
  | CategoryGridSection
  | ChartSection
  | TableSection
  | HeaderSection
  | MapSection;

export type ReportSectionType =
  | 'hero'
  | 'stat-row'
  | 'category-grid'
  | 'chart'
  | 'table'
  | 'header'
  | 'map';

export type MetricAggregation = 'sum' | 'avg' | 'count' | 'countDistinct' | 'min' | 'max';
export type MetricFormat = 'currency' | 'number' | 'percent';
export type ComputationType = 'divide' | 'subtract' | 'multiply' | 'add';

export interface MetricComputation {
  type: ComputationType;
  field1: string;
  agg1: MetricAggregation;
  field2: string;
  agg2: MetricAggregation;
}

export interface MetricConfig {
  label: string;
  field: string;
  aggregation: MetricAggregation;
  format?: MetricFormat;
  computation?: MetricComputation;
}

export type HeroIconType =
  | 'dollar'
  | 'truck'
  | 'package'
  | 'chart'
  | 'clock'
  | 'trending'
  | 'hash'
  | 'percent';

export type HeroColorType =
  | 'blue'
  | 'green'
  | 'orange'
  | 'purple'
  | 'gray'
  | 'teal'
  | 'red';

export interface HeroSection {
  type: 'hero';
  config: {
    metric: MetricConfig;
    icon?: HeroIconType;
    color?: HeroColorType;
    subtitle?: string;
  };
}

export type StatIconType =
  | 'dollar'
  | 'truck'
  | 'package'
  | 'chart'
  | 'clock'
  | 'trending'
  | 'hash'
  | 'percent'
  | 'location'
  | 'users'
  | 'calendar'
  | 'scale'
  | 'route';

export interface StatRowSection {
  type: 'stat-row';
  config: {
    stats: Array<{
      metric: MetricConfig;
      icon?: StatIconType;
    }>;
    columns?: 2 | 3 | 4;
  };
}

export interface CategoryGridSection {
  type: 'category-grid';
  config: {
    title?: string;
    groupBy: string;
    metric: MetricConfig;
    subtitle?: MetricConfig;
    colors?: string[];
    maxCategories?: number;
  };
}

export type ChartType =
  | 'bar'
  | 'line'
  | 'pie'
  | 'area'
  | 'treemap'
  | 'radar'
  | 'calendar'
  | 'bump'
  | 'waterfall';

export interface ChartSection {
  type: 'chart';
  config: {
    title?: string;
    chartType: ChartType;
    groupBy: string;
    metric: MetricConfig;
    colors?: string[];
    height?: number;
    horizontal?: boolean;
    secondaryGroupBy?: string;
  };
}

export type MapType = 'choropleth' | 'flow' | 'cluster' | 'arc';

export interface MapSection {
  type: 'map';
  config: {
    title?: string;
    mapType: MapType;
    metric: MetricConfig;
    groupBy: string;
    showLabels?: boolean;
    showLegend?: boolean;
    height?: number;
    flowField?: string;
  };
}

export interface TableColumnConfig {
  field: string;
  label: string;
  format?: 'currency' | 'number' | 'percent' | 'date' | 'string';
  align?: 'left' | 'right' | 'center';
  aggregation?: MetricAggregation;
  computation?: MetricComputation;
}

export interface TableSection {
  type: 'table';
  config: {
    title?: string;
    columns: TableColumnConfig[];
    groupBy?: string;
    metrics?: MetricConfig[];
    maxRows?: number;
    sortBy?: {
      field: string;
      direction: 'asc' | 'desc';
    };
  };
}

export interface HeaderSection {
  type: 'header';
  config: {
    title: string;
    subtitle?: string;
  };
}

export interface ExecutedSectionData {
  sectionIndex: number;
  data: unknown;
  error?: string;
}

export interface ExecutedReportData {
  sections: ExecutedSectionData[];
  executedAt: string;
  dateRange: {
    start: string;
    end: string;
  };
}
