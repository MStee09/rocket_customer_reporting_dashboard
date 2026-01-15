/**
 * BuilderSchema - Single source of truth for Visual Builder state
 *
 * This defines the complete shape of what the Visual Builder manages.
 * It gets compiled into a WidgetInstance when published.
 *
 * LOCATION: /src/admin/visual-builder/types/BuilderSchema.ts
 *
 * v2.1 Updates:
 * - Added CustomerScope (optional, backwards compatible)
 * - Added getChartTypeAvailability helper
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
// CUSTOMER SCOPE
// =============================================================================

export interface CustomerScope {
  mode: 'admin' | 'customer';
  customerId?: number;
  customerName?: string;
}

// =============================================================================
// CHART TYPE AVAILABILITY
// =============================================================================

export interface ChartTypeAvailability {
  type: VisualizationType;
  available: boolean;
  reason?: string;
}

export function getChartTypeAvailability(
  xField?: string,
  yField?: string,
  groupBy?: string
): ChartTypeAvailability[] {
  const hasXField = !!xField;
  const hasYField = !!yField;
  const hasGeoField = xField === 'origin_state' || xField === 'destination_state';
  const hasGroupBy = !!groupBy;

  return [
    { type: 'bar', available: true },
    { type: 'line', available: true },
    { type: 'area', available: true },
    { type: 'pie', available: true },
    { type: 'table', available: true },
    {
      type: 'kpi',
      available: hasYField,
      reason: !hasYField ? 'Select a value field (Y-axis)' : undefined
    },
    {
      type: 'scatter',
      available: hasXField && hasYField,
      reason: !hasXField || !hasYField ? 'Select both X and Y fields' : undefined
    },
    {
      type: 'choropleth',
      available: hasGeoField,
      reason: !hasGeoField ? 'Select origin_state or destination_state as X-axis' : undefined
    },
    {
      type: 'flow',
      available: false,
      reason: 'Configure origin and destination fields in Visualization settings'
    },
    {
      type: 'heatmap',
      available: hasXField && hasYField && hasGroupBy,
      reason: !hasXField || !hasYField || !hasGroupBy ? 'Select X, Y, and Group By fields' : undefined
    },
    {
      type: 'histogram',
      available: hasXField,
      reason: !hasXField ? 'Select a numeric field for X-axis' : undefined
    },
    {
      type: 'treemap',
      available: hasXField && hasYField,
      reason: !hasXField || !hasYField ? 'Select category and value fields' : undefined
    },
    {
      type: 'funnel',
      available: hasXField && hasYField,
      reason: !hasXField || !hasYField ? 'Select stage and value fields' : undefined
    },
    { type: 'sparkline', available: true },
  ];
}

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

  xField?: string;
  yField?: string;
  groupBy?: string;

  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';

  geo?: {
    mapKey: GeoMapKey;
    regionField: string;
    valueField: string;
    colorScale?: 'sequential' | 'diverging';
    minColor?: string;
    maxColor?: string;
  };

  flow?: {
    originField: string;
    destinationField: string;
    valueField: string;
    arcStyle?: 'curved' | 'straight';
    showArrows?: boolean;
  };

  kpi?: {
    format: 'number' | 'currency' | 'percent';
    comparisonField?: string;
    trendDirection?: 'up_is_good' | 'down_is_good';
    showSparkline?: boolean;
    prefix?: string;
    suffix?: string;
  };

  histogram?: {
    binCount?: number;
    binWidth?: number;
  };

  colors?: string[];
  showLegend?: boolean;
  showLabels?: boolean;
  showGrid?: boolean;

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
  | 'contains_any'
  | 'contains_all'
  | 'matches_any';

export type ConditionLogic = 'AND' | 'OR';

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: string | number | boolean | string[] | [number, number];
}

export interface FilterBlock {
  id: string;
  type: 'filter';
  conditions: FilterCondition[];
  conditionLogic?: ConditionLogic;
  enabled: boolean;
  label?: string;
}

export interface AILogicBlock {
  id: string;
  type: 'ai';
  prompt: string;
  compiledRule?: CompiledRule;
  status: 'pending' | 'compiling' | 'compiled' | 'error';
  error?: string;
  enabled: boolean;
  explanation?: string;
}

export interface CompiledRule {
  filters: FilterCondition[];
  explanation?: string;
}

export type LogicBlock = FilterBlock | AILogicBlock;

// =============================================================================
// PUBLISH CONFIG - Updated with versioning
// =============================================================================

export interface PublishConfig {
  scope: 'system' | 'customer';
  customerId?: number;
  placement: 'pulse' | 'analytics_hub';
  sectionId?: string;
  displayOrder?: number;
  size: 1 | 2 | 3;
  isUpdate?: boolean;
  existingWidgetId?: string;
  versionNotes?: string;
}

// =============================================================================
// BUILDER SCHEMA (Complete State)
// =============================================================================

export interface VisualBuilderSchema {
  id: string;
  widgetId?: string;
  sourceWidgetId?: string;
  title: string;
  description: string;

  customerScope?: CustomerScope;

  dataSource: {
    table: string;
    columns: string[];
  };

  visualization: VisualizationConfig;
  executionParams: ExecutionParams;
  logicBlocks: LogicBlock[];
  publish: PublishConfig;

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
    customerScope: {
      mode: 'admin',
    },
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
      placement: 'analytics_hub',
      size: 2,
    },
    ui: {
      activePanel: 'visualization',
      previewLoading: false,
      isDirty: false,
    },
  };
}

interface ExistingWidgetConfig {
  title?: string;
  description?: string;
  visualization?: VisualizationConfig;
  executionParams?: ExecutionParams;
  logicBlocks?: LogicBlock[];
}

export function createFromExistingWidget(widget: {
  widget_id: string;
  config: ExistingWidgetConfig;
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
    customerScope: widget.customer_id
      ? { mode: 'customer', customerId: widget.customer_id }
      : { mode: 'admin' },
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

  if (!schema.title.trim()) {
    errors.push('Title is required');
  }

  if (!schema.visualization.type) {
    errors.push('Visualization type is required');
  }

  if (['bar', 'line', 'area', 'scatter', 'histogram'].includes(schema.visualization.type)) {
    if (!schema.visualization.xField) {
      errors.push('X-axis field is required for this chart type');
    }
    if (!schema.visualization.yField && schema.visualization.type !== 'histogram') {
      errors.push('Y-axis field is required for this chart type');
    }
  }

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

  if (schema.visualization.type === 'kpi' && !schema.visualization.yField) {
    errors.push('Value field is required for KPI widgets');
  }

  const uncompiled = schema.logicBlocks.filter(
    b => b.type === 'ai' && b.enabled && b.status !== 'compiled'
  );
  if (uncompiled.length > 0) {
    warnings.push(`${uncompiled.length} AI logic block(s) need to be compiled before publishing`);
  }

  const emptyFilters = schema.logicBlocks.filter(
    b => b.type === 'filter' && b.enabled && b.conditions.length === 0
  );
  if (emptyFilters.length > 0) {
    warnings.push(`${emptyFilters.length} filter block(s) have no conditions`);
  }

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
