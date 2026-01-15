import { WidgetType, WidgetCategory, WidgetSize } from './widgetTypes';

export type WidgetSource = 'system' | 'report' | 'manual' | 'ai' | 'promoted';

export type WidgetVisibility =
  | { type: 'private'; ownerId: string }
  | { type: 'all_customers' }
  | { type: 'specific_customers'; customerIds: number[] }
  | { type: 'admin_only' }
  | { type: 'customer_specific'; targetCustomerId: number; targetCustomerName?: string }
  | {
      type: 'system';
      promotedFrom?: {
        originalWidgetId: string;
        originalCreatorId: string;
        originalCreatorEmail: string;
        promotedBy: string;
        promotedByEmail: string;
        promotedAt: string;
      }
    };

export interface QueryColumn {
  field: string;
  alias?: string;
  aggregate?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  format?: 'number' | 'currency' | 'percent' | 'date';
}

export type QueryFilterValue = string | number | boolean | Date | (string | number)[] | null;

export interface QueryFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like';
  value: QueryFilterValue;
  isDynamic?: boolean;
}

export interface QueryOrder {
  field: string;
  direction: 'asc' | 'desc';
}

export interface WidgetQueryConfig {
  baseTable: 'shipment' | 'shipment_address' | 'shipment_carrier' | 'carrier' | 'customer';
  columns: QueryColumn[];
  filters?: QueryFilter[];
  groupBy?: string[];
  orderBy?: QueryOrder[];
  limit?: number;
  joins?: {
    table: string;
    on: string;
    type: 'inner' | 'left';
  }[];
}

export interface VisualizationConfig {
  type: WidgetType;
  xAxis?: string;
  yAxis?: string;
  colorBy?: string;
  columns?: {
    key: string;
    label: string;
    align?: 'left' | 'center' | 'right';
    format?: 'number' | 'currency' | 'percent' | 'date';
    width?: string;
  }[];
  valueField?: string;
  labelField?: string;
}

export type DataMode = 'dynamic' | 'static';

export interface SourceReport {
  id: string;
  name: string;
  path: string;
}

export interface CustomWidgetDefinition {
  id: string;
  name: string;
  description: string;

  type: WidgetType;
  category: WidgetCategory;
  source: WidgetSource;

  createdBy: {
    userId: string;
    userEmail: string;
    isAdmin: boolean;
    customerId?: number;
    customerName?: string;
    timestamp: string;
  };

  visibility: WidgetVisibility;

  sourceReport?: SourceReport;

  dataSource: {
    type: 'query' | 'report_reference' | 'ai_generated';
    query?: WidgetQueryConfig;
    reportReference?: {
      reportId: string;
      reportName: string;
    };
    aiGenerated?: {
      originalPrompt: string;
      generatedQuery: WidgetQueryConfig;
      validatedAt?: string;
      validatedBy?: string;
    };
  };

  visualization: VisualizationConfig;

  config?: Record<string, unknown>;

  display: {
    icon: string;
    iconColor: string;
    defaultSize: WidgetSize;
    gradient?: string;
    refreshInterval?: number;
  };

  dataMode: DataMode;
  snapshotData?: Record<string, unknown>[];
  snapshotDate?: string;

  version: number;
  createdAt: string;
  updatedAt: string;
}

export const isCustomWidget = (widget: unknown): widget is CustomWidgetDefinition => {
  return typeof widget === 'object' && widget !== null && 'source' in widget && (widget as CustomWidgetDefinition).source !== 'system';
};
