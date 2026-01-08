/**
 * BuilderSchema - Single source of truth for Visual Builder state
 *
 * This defines the complete shape of what the Visual Builder manages.
 * It gets compiled into a WidgetInstance when published.
 *
 * LOCATION: /src/admin/visual-builder/types/BuilderSchema.ts
 *
 * v2.0 Updates:
 * - Compound filter support (multiple conditions on same field)
 * - Version tracking for widget publishes
 * - Drill-down configuration
 * - Enhanced geo visualization config
 */

import type { ExecutionParams } from '../../../widgets/types/ExecutionParams';
import type { FieldCategory } from '../../../config/schema/fieldSchema';

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
  | 'kpi'
  | 'histogram'
  | 'treemap'
  | 'funnel'
  | 'sparkline';

export type GeoMapKey = 'us_states' | 'ca_provinces' | 'us_ca_combined' | 'world_countries';

// =============================================================================
// FIELD DEFINITION FOR BUILDER (derived from schema)
// =============================================================================

export interface BuilderFieldDefinition {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency';
  category: 'dimension' | 'measure' | 'date';
  fieldCategory: FieldCategory;
  description?: string;
  sampleValues?: string[];
  isGroupable: boolean;
  isAggregatable: boolean;
  defaultAggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

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
    regionField: string;
    valueField: string;
    colorScale?: 'sequential' | 'diverging';
    minColor?: string;
    maxColor?: string;
  };

  // For flow maps
  flow?: {
    originField: string;
    destinationField: string;
    valueField: string;
    arcStyle?: 'curved' | 'straight';
    showArrows?: boolean;
  };

  // For KPIs
  kpi?: {
    format: 'number' | 'currency' | 'percent';
    comparisonField?: string;
    trendDirection?: 'up_is_good' | 'down_is_good';
    showSparkline?: boolean;
    prefix?: string;
    suffix?: string;
  };

  // For histograms
  histogram?: {
    binCount?: number;
    binWidth?: number;
  };

  // Chart styling
  colors?: string[];
  showLegend?: boolean;
  showLabels?: boolean;
  showGrid?: boolean;

  // Drill-down configuration
  drillDown?: {
    enabled: boolean;
    targetField?: string;
    action?: 'filter' | 'navigate' | 'modal';
    targetWidgetId?: string;
  };
}

// =============================================================================
// LOGIC BLOCKS - Updated for compound filters
// =============================================================================

export type FilterOperator =
  | 'eq' | 'neq'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains' | 'not_contains' | 'starts_with' | 'ends_with'
  | 'in' | 'not_in'
  | 'is_null' | 'is_not_null'
  | 'between'
  // New operators for OR logic
  | 'contains_any'      // Field contains ANY of the values (OR)
  | 'contains_all'      // Field contains ALL of the values (AND)
  | 'matches_any';      // Field equals ANY of the values (same as 'in' but clearer)

/** How multiple conditions within a block are combined */
export type ConditionLogic = 'AND' | 'OR';

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: string | number | boolean | string[] | [number, number];
}

export interface FilterBlock {
  id: string;
  type: 'filter';
  /** Multiple conditions - combined using conditionLogic */
  conditions: FilterCondition[];
  /** How to combine conditions: AND (all must match) or OR (any must match) */
  conditionLogic?: ConditionLogic;
  enabled: boolean;
  label?: string;
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

  /** Explanation from AI about what the rule does */
  explanation?: string;
}

export interface CompiledRule {
  filters: FilterCondition[];
  /** Natural language explanation of what this rule does */
  explanation?: string;
}

export type LogicBlock = FilterBlock | AILogicBlock;

// =============================================================================
// PUBLISH CONFIG - Updated with versioning
// =============================================================================

export interface PublishConfig {
  scope: 'system' | 'customer';
  customerId?: number;
  placement: 'pulse' | 'hub' | 'dashboard' | 'report';
  sectionId?: string;
  displayOrder?: number;
  size: 1 | 2 | 3;

  // Versioning support
  isUpdate?: boolean;
  existingWidgetId?: string;
  versionNotes?: string;
}

// =============================================================================
// BUILDER SCHEMA (Complete State)
// =============================================================================

export interface VisualBuilderSchema {
  /** Unique ID for this builder session (becomes instance ID on publish) */
  id: string;

  /** Widget definition ID this is based on (optional - can be custom) */
  widgetId?: string;

  /** If editing existing widget, the original widget ID */
  sourceWidgetId?: string;

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
    previewRowCount?: number;
    isDirty: boolean;
    lastSaved?: string;
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
      showLegend: true,
      showGrid: true,
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

/**
 * Create a builder schema from an existing widget (for cloning/editing)
 */
export function createFromExistingWidget(widget: {
  widget_id: string;
  config: any;
  customer_id?: number;
}): VisualBuilderSchema {
  const base = createDefaultBuilderSchema();
  const config = widget.config || {};

  return {
    ...base,
    id: crypto.randomUUID(),
    sourceWidgetId: widget.widget_id,
    title: config.title ? `${config.title} (Copy)` : 'Widget Copy',
    description: config.description || '',
    visualization: config.visualization || base.visualization,
    executionParams: config.executionParams || base.executionParams,
    logicBlocks: config.logicBlocks || [],
    publish: {
      ...base.publish,
      scope: widget.customer_id ? 'customer' : 'system',
      customerId: widget.customer_id,
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
  if (['bar', 'line', 'area', 'scatter', 'histogram'].includes(schema.visualization.type)) {
    if (!schema.visualization.xField) {
      errors.push('X-axis field is required for this chart type');
    }
    if (!schema.visualization.yField && schema.visualization.type !== 'histogram') {
      errors.push('Y-axis field is required for this chart type');
    }
  }

  // Geo config for geo types
  if (schema.visualization.type === 'choropleth') {
    if (!schema.visualization.geo?.regionField) {
      errors.push('Region field is required for choropleth maps');
    }
    if (!schema.visualization.geo?.valueField) {
      errors.push('Value field is required for choropleth maps');
    }
  }

  if (schema.visualization.type === 'flow') {
    if (!schema.visualization.flow?.originField) {
      errors.push('Origin field is required for flow maps');
    }
    if (!schema.visualization.flow?.destinationField) {
      errors.push('Destination field is required for flow maps');
    }
    if (!schema.visualization.flow?.valueField) {
      errors.push('Value field is required for flow maps');
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
    warnings.push(`${uncompiled.length} AI logic block(s) need to be compiled before publishing`);
  }

  // Check for empty filter blocks
  const emptyFilters = schema.logicBlocks.filter(
    b => b.type === 'filter' && b.enabled && b.conditions.length === 0
  );
  if (emptyFilters.length > 0) {
    warnings.push(`${emptyFilters.length} filter block(s) have no conditions`);
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

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get a human-readable summary of the logic blocks
 */
export function getLogicSummary(blocks: LogicBlock[]): string {
  const enabled = blocks.filter(b => b.enabled);
  if (enabled.length === 0) return 'No filters applied';

  const parts: string[] = [];

  for (const block of enabled) {
    if (block.type === 'filter') {
      for (const cond of block.conditions) {
        parts.push(`${cond.field} ${cond.operator} ${JSON.stringify(cond.value)}`);
      }
    } else if (block.type === 'ai' && block.compiledRule) {
      for (const filter of block.compiledRule.filters) {
        parts.push(`${filter.field} ${filter.operator} ${JSON.stringify(filter.value)}`);
      }
    }
  }

  return parts.length > 0 ? parts.join(' AND ') : 'No active filters';
}

/**
 * Count total active filter conditions
 */
export function countActiveFilters(blocks: LogicBlock[]): number {
  let count = 0;

  for (const block of blocks) {
    if (!block.enabled) continue;

    if (block.type === 'filter') {
      count += block.conditions.length;
    } else if (block.type === 'ai' && block.compiledRule) {
      count += block.compiledRule.filters.length;
    }
  }

  return count;
}
