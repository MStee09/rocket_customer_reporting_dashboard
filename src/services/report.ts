// src/types/report.ts

export type ReportSourceType = 'widget' | 'simple_report';
export type ReportVisibility = 'implicit' | 'saved';

export interface DateRange {
  start: string; // ISO date string YYYY-MM-DD
  end: string;   // ISO date string YYYY-MM-DD
}

export interface ReportExecutionParams {
  dateRange?: DateRange;
  filters?: Record<string, unknown>;
  limit?: number;
}

export interface Report {
  id: string;
  name: string;
  source_type: ReportSourceType;
  source_widget_id: string | null;
  query_definition: Record<string, unknown> | null;
  execution_params: ReportExecutionParams | null;
  visibility: ReportVisibility;
  owner_id: string;
  customer_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWidgetReportInput {
  name: string;
  source_type: 'widget';
  source_widget_id: string;
  execution_params: ReportExecutionParams;
  visibility: 'saved';
  owner_id: string;
  customer_id: string;
}

export interface CreateSimpleReportInput {
  name: string;
  source_type: 'simple_report';
  query_definition: Record<string, unknown>;
  visibility: 'saved';
  owner_id: string;
  customer_id: string;
}
