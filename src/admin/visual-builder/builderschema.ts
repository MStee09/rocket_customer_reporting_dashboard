/**
 * BuilderSchema - Single source of truth for Visual Builder state
 * 
 * This defines the complete shape of what the Visual Builder manages.
 * It gets compiled into a WidgetInstance when published.
 */

import type { ExecutionParams } from '../../widgets/types/ExecutionParams';

// =============================================================================
// VISUALIZATION TYPES
// =============================================================================

export type VisualizationType =
  | 'bar'
  | 'line'
  | 'area'
  | 'pie'
  | 'scatter'
  | 'heatmap'
  | 'choropleth'
  | 'flow'
  | 'table'
  | 'kpi';

export type GeoMapKey = 'us_states' | 'us_counties' | 'world_countries';

// =============================================================================
// VISUALIZATION CONFIG
// =============================================================================

export interface VisualizationConfig {
  type: VisualizationType;

  // For standard charts
  xField?: string;
  yField?: string;
  groupBy?: string;
  
  // Aggregation
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';

  // For geo visualizations
  geo?: {
    mapKey: GeoMapKey;
    regionField: string;  // Field containing region codes (state abbrev, country code)
    valueField: string;   // Field containing the value to display
    colorScale?: 'sequential' | 'diverging';
  };

  // For flow maps
  flow?: {
    originField: string;
    destinationField: string;
    valueField: string;
  };

  // For KPIs
  kpi?: {
    format: 'number' | 'currency' | 'percent';
    comparisonField?: string;
    trendDirection?: 'up_is_good' | 'down_is_good';
  };

  // Chart styling
  colors?: string[];
  showLegend?: boolean;
  showLabels?: boolean;
}

// =============================================================================
// LOGIC BLOCKS
// =============================================================================

export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'not_in';

export interface FilterBlock {
  id: string;
  type: 'filter';
  field: string;
  operator: FilterOperator;
  value: string | number | boolean | string[];
  enabled: boolean;
}

export interface AILogicBlock {
  id: string;
  type: 'ai';
  prompt: string;
  
  /** 
   * Compiled output from AI - becomes deterministic at runtime.
   * AI runs at authoring time only, not at widget execution time.
   */
  compiledRule?: CompiledRule;
  
  /** Status of AI compilation */
  status: 'pending' | 'compiling' | 'compiled' | 'error';
  error?: string;
  enabled: boolean;
}

export interface CompiledRule {
  filters: Array<{
    field: string;
    operator: FilterOperator;
    value: string | number | boolean | string[];
  }>;
}

export type LogicBlock = FilterBlock | AILogicBlock;

// =============================================================================
// PUBLISH CONFIG
// =============================================================================

export interface PublishConfig {
  scope: 'system' | 'customer';
  customerId?: number;
  placement: 'pulse' | 'hub' | 'dashboard' | 'report';
  sectionId?: string;
  displayOrder?: number;
  size: 1 | 2 | 3;
}

// =============================================================================
// BUILDER SCHEMA (Complete State)
// =============================================================================

export interface VisualBuilderSchema {
  /** Unique ID for this builder session (becomes instance ID on publish) */
  id: string;

  /** Widget definition ID this is based on (optional - can be custom) */
  widgetId?: string;

  /** Display metadata */
  title: string;
  description: string;

  /** Data source configuration */
  dataSource: {
    table: string;
    columns: string[];
  };

  /** Visualization configuration */
  visualization: VisualizationConfig;

  /** Base execution parameters */
  executionParams: ExecutionParams;

  /** Logic blocks (filters + AI rules) */
  logicBlocks: LogicBlock[];

  /** Publishing configuration */
  publish: PublishConfig;

  /** Builder UI state (not persisted) */
  ui: {
    activePanel: 'visualization' | 'fields' | 'logic' | 'preview' | 'publish';
    previewLoading: boolean;
    previewError?: string;
    isDirty: boolean;
  };
}

// =============================================================================
// DEFAULTS
// =============================================================================

export function createDefaultBuilderSchema(): VisualBuilderSchema {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return {
    id: crypto.randomUUID(),
    title: 'New Widget',
    description: '',
    dataSource: {
      table: 'shipment_report_view',
      columns: [],
    },
    visualization: {
      type: 'bar',
      aggregation: 'sum',
    },
    executionParams: {
      dateRange: {
        start: thirtyDaysAgo.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
      },
      limit: 1000,
    },
    logicBlocks: [],
    publish: {
      scope: 'system',
      placement: 'hub',
      size: 2,
    },
    ui: {
      activePanel: 'visualization',
      previewLoading: false,
      isDirty: false,
    },
  };
}

// =============================================================================
// VALIDATION
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateBuilderSchema(schema: VisualBuilderSchema): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Title required
  if (!schema.title.trim()) {
    errors.push('Title is required');
  }

  // Visualization type required
  if (!schema.visualization.type) {
    errors.push('Visualization type is required');
  }

  // Field mappings for chart types
  if (['bar', 'line', 'area', 'scatter'].includes(schema.visualization.type)) {
    if (!schema.visualization.xField) {
      errors.push('X-axis field is required for this chart type');
    }
    if (!schema.visualization.yField) {
      errors.push('Y-axis field is required for this chart type');
    }
  }

  // Geo config for geo types
  if (['choropleth', 'flow'].includes(schema.visualization.type)) {
    if (schema.visualization.type === 'choropleth' && !schema.visualization.geo) {
      errors.push('Geo configuration is required for choropleth maps');
    }
    if (schema.visualization.type === 'flow' && !schema.visualization.flow) {
      errors.push('Flow configuration is required for flow maps');
    }
  }

  // KPI config
  if (schema.visualization.type === 'kpi' && !schema.visualization.yField) {
    errors.push('Value field is required for KPI widgets');
  }

  // Check for uncompiled AI blocks
  const uncompiled = schema.logicBlocks.filter(
    b => b.type === 'ai' && b.enabled && b.status !== 'compiled'
  );
  if (uncompiled.length > 0) {
    warnings.push(`${uncompiled.length} AI logic block(s) not compiled yet`);
  }

  // Customer scope requires customer ID
  if (schema.publish.scope === 'customer' && !schema.publish.customerId) {
    errors.push('Customer ID is required for customer-scoped widgets');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
