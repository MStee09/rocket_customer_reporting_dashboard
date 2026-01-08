/**
 * Enhanced Widget Types
 *
 * Formalizes the distinction between:
 * - WidgetDefinition: The code/logic (what a widget CAN do)
 * - WidgetInstance: The context (where/how it's deployed)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExecutionParams } from './ExecutionParams';

// =============================================================================
// WIDGET DEFINITION (CODE = LOGIC)
// =============================================================================

export type WidgetVisualizationType =
  | 'kpi'
  | 'featured_kpi'
  | 'bar_chart'
  | 'line_chart'
  | 'pie_chart'
  | 'area_chart'
  | 'table'
  | 'map'
  | 'list';

export type WidgetCategory =
  | 'volume'
  | 'financial'
  | 'geographic'
  | 'performance'
  | 'breakdown'
  | 'customers'
  | 'ai_generated'
  | 'custom';

export type WidgetAccess = 'customer' | 'admin' | 'all';

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export interface WidgetCalculateContext {
  supabase: SupabaseClient;
  customerId: number;
  params: ExecutionParams;
  mode?: 'visual' | 'table'; // 'visual' for charts, 'table' for raw data
  isAdmin?: boolean;
}

export interface WidgetData {
  type: 'kpi' | 'chart' | 'table' | 'map' | 'list';

  // For KPI widgets
  value?: number | string;
  label?: string;
  format?: 'number' | 'currency' | 'percent';
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'flat';
    isPositive?: boolean; // Is this trend good or bad?
  };

  // For chart/table widgets
  data?: Array<Record<string, unknown>>;
  columns?: Array<{
    key: string;
    label: string;
    type?: 'string' | 'number' | 'currency' | 'percent' | 'date';
    align?: 'left' | 'center' | 'right';
    width?: string;
  }>;

  // Metadata
  metadata?: {
    recordCount?: number;
    truncated?: boolean;
    dateRange?: { start: string; end: string };
    lastUpdated?: string;
  };
}

export interface WidgetDefinition {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Description shown in widget library */
  description: string;

  /** Category for grouping in library */
  category: WidgetCategory;

  /** Who can see this widget */
  access: WidgetAccess;

  /** Visualization configuration */
  visualization: {
    type: WidgetVisualizationType;
    config?: Record<string, unknown>;
  };

  /** UI configuration */
  ui: {
    icon: string;
    iconColor: string;
    gradient?: string;
    defaultSize: WidgetSize;
    minColSpan?: number;
    maxColSpan?: number;
  };

  /** Data requirements (for validation) */
  dataRequirements?: {
    tables: string[];
    minRows?: number;
    requiredColumns?: string[];
  };

  /**
   * The execute function - single source of truth for widget data
   *
   * @param context - Execution context with supabase, customerId, params
   * @returns Promise<WidgetData> - The widget's data
   */
  calculate: (context: WidgetCalculateContext) => Promise<WidgetData>;
}

// =============================================================================
// WIDGET INSTANCE (DATABASE = CONTEXT)
// =============================================================================

export type WidgetLocation = 'pulse' | 'hub' | 'dashboard' | 'report';

export type WidgetScope = 'system' | 'customer';

export interface WidgetInstance {
  /** Unique instance ID */
  id: string;

  /** References the WidgetDefinition.id */
  definitionId: string;

  /** system = global, customer = tenant-specific */
  scope: WidgetScope;

  /** Customer ID if scope is 'customer' */
  customerId?: number;

  /** Where this instance appears */
  location: WidgetLocation;

  /** Section within the location (e.g., 'financial', 'performance') */
  sectionId?: string;

  /** Order within the section */
  order: number;

  /** Size override (1, 2, or 3 columns) */
  size: 1 | 2 | 3;

  /** Title override */
  titleOverride?: string;

  /** Description override */
  descriptionOverride?: string;

  /** Default execution params for this instance */
  defaultParams?: Partial<ExecutionParams>;

  /** Custom configuration */
  config?: Record<string, unknown>;

  /** Is this instance active? */
  isActive: boolean;

  /** Is this pinned to top? */
  isPinned: boolean;

  /** Timestamps */
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// HELPER TYPES
// =============================================================================

export interface WidgetRenderContext {
  instance: WidgetInstance;
  definition: WidgetDefinition;
  customerId: number;
  params: ExecutionParams;
}

export interface WidgetExecutionResult {
  widgetId: string;
  instanceId?: string;
  data: WidgetData;
  executedAt: string;
  executionTimeMs: number;
}
