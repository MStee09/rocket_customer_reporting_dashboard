export type ReportSourceType = 'widget' | 'simple_report';
export type ReportVisibility = 'implicit' | 'saved';

export interface DateRange {
  start: string;
  end: string;
}

export interface ReportExecutionParams {
  dateRange?: DateRange;
  filters?: Record<string, unknown>;
  limit?: number;
}

export interface Report {
  id: string;
  name: string;
  description: string | null;
  source_type: ReportSourceType;
  source_widget_id: string | null;
  query_definition: Record<string, unknown> | null;
  execution_params: ReportExecutionParams | null;
  visibility: ReportVisibility;
  owner_id: string;
  customer_id: string;
  schedule_enabled: boolean | null;
  schedule_cron: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWidgetReportInput {
  name: string;
  description?: string;
  source_type: 'widget';
  source_widget_id: string;
  execution_params: ReportExecutionParams;
  visibility: 'saved';
  owner_id: string;
  customer_id: string;
}

export interface CreateSimpleReportInput {
  name: string;
  description?: string;
  source_type: 'simple_report';
  query_definition: Record<string, unknown>;
  visibility: 'saved';
  owner_id: string;
  customer_id: string;
}

export type CreateReportInput = CreateWidgetReportInput | CreateSimpleReportInput;

export interface UpdateReportInput {
  name?: string;
  description?: string;
  execution_params?: ReportExecutionParams;
  query_definition?: Record<string, unknown>;
  schedule_enabled?: boolean;
  schedule_cron?: string;
}
