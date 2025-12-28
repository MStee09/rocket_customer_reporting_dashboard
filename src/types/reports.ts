import { CategoryConfig } from './metrics';
import { ColumnFilter, ColumnSort } from './filters';

export type CalculationType = 'count' | 'sum' | 'average' | 'ratio' | 'formula';
export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max';

export interface SimpleCalculation {
  type: 'count' | 'sum' | 'average';
  field?: string;
  aggregation?: AggregationType;
}

export interface RatioCalculation {
  type: 'ratio';
  numerator: {
    field: string;
    aggregation: AggregationType;
  };
  denominator: {
    field: string;
    aggregation: AggregationType;
  };
}

export interface FormulaCalculation {
  type: 'formula';
  expression: string;
  fields: string[];
}

export type ReportCalculation = SimpleCalculation | RatioCalculation | FormulaCalculation;

export interface ReportJoin {
  table: string;
  on: string;
  type?: 'inner' | 'left' | 'right';
}

export interface CategoryBreakdownConfig {
  categories: CategoryConfig[];
}

export interface ReportConfig {
  id: string;
  name: string;
  description: string;
  type: 'category_breakdown' | 'time_series' | 'comparison' | 'custom';
  config: {
    primaryTable: string;
    joins?: ReportJoin[];
    calculation?: ReportCalculation;
    groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
    categories?: CategoryConfig[];
    filters?: Record<string, any>;
  };
  visualization: 'category_breakdown' | 'line_chart' | 'bar_chart' | 'pie_chart' | 'table';
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
}

export interface CustomerReportsData {
  reports: ReportConfig[];
}

export interface ReportBuilderState {
  step: number;
  name: string;
  description: string;
  primaryTable: string;
  joins: ReportJoin[];
  calculationType: CalculationType;
  calculation: Partial<ReportCalculation>;
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  dimensionGrouping: string[];
  enableCategoryBreakdown: boolean;
  categorizeByField: string;
  categories: CategoryConfig[];
  visualization: 'category_breakdown' | 'line_chart' | 'bar_chart' | 'pie_chart' | 'table' | 'single_value';
  visualizationOptions: Record<string, any>;
}

export interface SimpleReportColumn {
  id: string;
  label: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface SimpleReportConfig {
  id?: string;
  name: string;
  description?: string;
  columns: SimpleReportColumn[];
  groupBy?: string[];
  isSummary: boolean;
  visualization?: 'table' | 'bar_chart' | 'line_chart' | 'pie_chart';
  filters?: ColumnFilter[];
  sorts?: ColumnSort[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface SimpleReportBuilderState {
  name: string;
  description: string;
  selectedColumns: SimpleReportColumn[];
  isSummary: boolean;
  groupByColumns: string[];
  visualization: 'table' | 'bar_chart' | 'line_chart' | 'pie_chart';
  filters?: ColumnFilter[];
  sorts?: ColumnSort[];
}
