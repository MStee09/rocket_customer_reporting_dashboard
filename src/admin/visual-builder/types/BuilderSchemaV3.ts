export interface WidgetQueryFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'ilike' | 'between' | 'is_null' | 'is_not_null';
  value: any;
  useDateRange?: boolean;
}

export interface WidgetQueryAggregation {
  field: string;
  function: 'sum' | 'avg' | 'count' | 'min' | 'max';
  alias?: string;
}

export interface WidgetQueryJoin {
  table: string;
  type: 'left' | 'inner';
}

export interface WidgetQueryConfig {
  baseTable: string;
  joins?: WidgetQueryJoin[];
  select?: string[];
  filters?: WidgetQueryFilter[];
  groupBy?: string[];
  aggregations?: WidgetQueryAggregation[];
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  limit?: number;
}

export type ChartType = 'bar' | 'line' | 'pie' | 'kpi' | 'table' | 'area';

export interface VisualizationConfig {
  type: ChartType;
  xField?: string;
  yField?: string;
  valueFormat?: 'number' | 'currency' | 'percent';
}

export type WidgetVisibility =
  | { type: 'private'; ownerId: string }
  | { type: 'all_customers' }
  | { type: 'admin_only' }
  | { type: 'customer_specific'; targetCustomerId: number; targetCustomerName?: string };

export type WidgetPlacement = 'pulse' | 'analytics_hub' | 'both';

export interface WidgetDefinitionV3 {
  id: string;
  name: string;
  description: string;
  type: ChartType;
  category: string;
  source: 'ai' | 'manual';
  createdBy: {
    userId: string;
    userEmail: string;
    isAdmin: boolean;
    timestamp: string;
  };
  visibility: WidgetVisibility;
  placement: { placement: WidgetPlacement; section?: string };
  dataSource: {
    type: 'query' | 'ai_generated';
    query: WidgetQueryConfig;
  };
  visualization: VisualizationConfig;
  display: {
    icon: string;
    iconColor: string;
    defaultSize: 1 | 2 | 3 | 4;
  };
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type BuilderMode = 'ai' | 'manual';
export type BuilderStep = 'input' | 'configure' | 'preview' | 'publish';

export interface AIResult {
  success: boolean;
  answer: string;
  explanation: string;
  reasoning: Array<{ type: string; content: string; toolName?: string }>;
  suggestedWidget?: {
    name: string;
    description: string;
    chartType: ChartType;
    xField: string;
    yField: string;
    aggregation: string;
    query: WidgetQueryConfig;
    data: any[];
  };
  error?: string;
}

export interface BuilderState {
  mode: BuilderMode;
  step: BuilderStep;
  aiPrompt: string;
  aiProcessing: boolean;
  aiResult: AIResult | null;
  name: string;
  description: string;
  chartType: ChartType;
  baseTable: string;
  joins: WidgetQueryJoin[];
  xField: string;
  yField: string;
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
  filters: WidgetQueryFilter[];
  groupBy: string[];
  orderBy: string;
  orderDir: 'asc' | 'desc';
  limit: number;
  customerScope: 'all' | 'specific';
  selectedCustomerId?: number;
  previewDateRange: { start: string; end: string };
  previewData: any[] | null;
  previewLoading: boolean;
  previewError: string | null;
  visibility: WidgetVisibility;
  placement: WidgetPlacement;
  section: string;
}

export type BuilderAction =
  | { type: 'SET_MODE'; mode: BuilderMode }
  | { type: 'SET_STEP'; step: BuilderStep }
  | { type: 'SET_AI_PROMPT'; prompt: string }
  | { type: 'SET_AI_PROCESSING'; processing: boolean }
  | { type: 'SET_AI_RESULT'; result: AIResult | null }
  | { type: 'SET_NAME'; name: string }
  | { type: 'SET_DESCRIPTION'; description: string }
  | { type: 'SET_CHART_TYPE'; chartType: ChartType }
  | { type: 'SET_BASE_TABLE'; table: string }
  | { type: 'ADD_JOIN'; join: WidgetQueryJoin }
  | { type: 'REMOVE_JOIN'; table: string }
  | { type: 'SET_X_FIELD'; field: string }
  | { type: 'SET_Y_FIELD'; field: string }
  | { type: 'SET_AGGREGATION'; aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' }
  | { type: 'ADD_FILTER'; filter: WidgetQueryFilter }
  | { type: 'UPDATE_FILTER'; index: number; filter: WidgetQueryFilter }
  | { type: 'REMOVE_FILTER'; index: number }
  | { type: 'SET_GROUP_BY'; fields: string[] }
  | { type: 'SET_ORDER_BY'; field: string }
  | { type: 'SET_ORDER_DIR'; dir: 'asc' | 'desc' }
  | { type: 'SET_LIMIT'; limit: number }
  | { type: 'SET_CUSTOMER_SCOPE'; scope: 'all' | 'specific'; customerId?: number }
  | { type: 'SET_PREVIEW_DATE_RANGE'; range: { start: string; end: string } }
  | { type: 'SET_PREVIEW_DATA'; data: any[] | null }
  | { type: 'SET_PREVIEW_LOADING'; loading: boolean }
  | { type: 'SET_PREVIEW_ERROR'; error: string | null }
  | { type: 'SET_VISIBILITY'; visibility: WidgetVisibility }
  | { type: 'SET_PLACEMENT'; placement: WidgetPlacement }
  | { type: 'SET_SECTION'; section: string }
  | { type: 'APPLY_AI_SUGGESTION'; suggestion: AIResult['suggestedWidget'] }
  | { type: 'RESET' };

export const initialBuilderState: BuilderState = {
  mode: 'ai',
  step: 'input',
  aiPrompt: '',
  aiProcessing: false,
  aiResult: null,
  name: '',
  description: '',
  chartType: 'bar',
  baseTable: 'shipment',
  joins: [],
  xField: '',
  yField: 'retail',
  aggregation: 'sum',
  filters: [],
  groupBy: [],
  orderBy: '',
  orderDir: 'desc',
  limit: 100,
  customerScope: 'all',
  selectedCustomerId: undefined,
  previewDateRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  },
  previewData: null,
  previewLoading: false,
  previewError: null,
  visibility: { type: 'admin_only' },
  placement: 'analytics_hub',
  section: 'custom',
};

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.mode };
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'SET_AI_PROMPT':
      return { ...state, aiPrompt: action.prompt };
    case 'SET_AI_PROCESSING':
      return { ...state, aiProcessing: action.processing };
    case 'SET_AI_RESULT':
      return { ...state, aiResult: action.result };
    case 'SET_NAME':
      return { ...state, name: action.name };
    case 'SET_DESCRIPTION':
      return { ...state, description: action.description };
    case 'SET_CHART_TYPE':
      return { ...state, chartType: action.chartType };
    case 'SET_BASE_TABLE':
      return { ...state, baseTable: action.table, xField: '', yField: 'retail', filters: [], groupBy: [] };
    case 'ADD_JOIN':
      return { ...state, joins: [...state.joins, action.join] };
    case 'REMOVE_JOIN':
      return { ...state, joins: state.joins.filter(j => j.table !== action.table) };
    case 'SET_X_FIELD':
      return { ...state, xField: action.field, groupBy: action.field ? [action.field] : [] };
    case 'SET_Y_FIELD':
      return { ...state, yField: action.field };
    case 'SET_AGGREGATION':
      return { ...state, aggregation: action.aggregation };
    case 'ADD_FILTER':
      return { ...state, filters: [...state.filters, action.filter] };
    case 'UPDATE_FILTER':
      return {
        ...state,
        filters: state.filters.map((f, i) => (i === action.index ? action.filter : f)),
      };
    case 'REMOVE_FILTER':
      return { ...state, filters: state.filters.filter((_, i) => i !== action.index) };
    case 'SET_GROUP_BY':
      return { ...state, groupBy: action.fields };
    case 'SET_ORDER_BY':
      return { ...state, orderBy: action.field };
    case 'SET_ORDER_DIR':
      return { ...state, orderDir: action.dir };
    case 'SET_LIMIT':
      return { ...state, limit: action.limit };
    case 'SET_CUSTOMER_SCOPE':
      return { ...state, customerScope: action.scope, selectedCustomerId: action.customerId };
    case 'SET_PREVIEW_DATE_RANGE':
      return { ...state, previewDateRange: action.range };
    case 'SET_PREVIEW_DATA':
      return { ...state, previewData: action.data };
    case 'SET_PREVIEW_LOADING':
      return { ...state, previewLoading: action.loading };
    case 'SET_PREVIEW_ERROR':
      return { ...state, previewError: action.error };
    case 'SET_VISIBILITY':
      return { ...state, visibility: action.visibility };
    case 'SET_PLACEMENT':
      return { ...state, placement: action.placement };
    case 'SET_SECTION':
      return { ...state, section: action.section };
    case 'APPLY_AI_SUGGESTION':
      if (!action.suggestion) return state;
      return {
        ...state,
        name: action.suggestion.name,
        description: action.suggestion.description,
        chartType: action.suggestion.chartType,
        xField: action.suggestion.xField,
        yField: action.suggestion.yField,
        aggregation: action.suggestion.aggregation as BuilderState['aggregation'],
        baseTable: action.suggestion.query.baseTable,
        filters: action.suggestion.query.filters || [],
        groupBy: action.suggestion.query.groupBy || [],
        orderBy: action.suggestion.query.orderBy || '',
        orderDir: action.suggestion.query.orderDir || 'desc',
        limit: action.suggestion.query.limit || 100,
        previewData: action.suggestion.data,
        step: 'configure',
      };
    case 'RESET':
      return initialBuilderState;
    default:
      return state;
  }
}

export function buildQueryConfig(state: BuilderState): WidgetQueryConfig {
  return {
    baseTable: state.baseTable,
    joins: state.joins.length > 0 ? state.joins : undefined,
    groupBy: state.groupBy.length > 0 ? state.groupBy : undefined,
    aggregations: state.yField
      ? [{ field: state.yField, function: state.aggregation, alias: 'value' }]
      : undefined,
    filters: state.filters.length > 0 ? state.filters : undefined,
    orderBy: state.orderBy || undefined,
    orderDir: state.orderDir,
    limit: state.limit,
  };
}

export function buildWidgetDefinition(
  state: BuilderState,
  userId: string,
  userEmail: string,
  isAdmin: boolean
): WidgetDefinitionV3 {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: state.name,
    description: state.description,
    type: state.chartType,
    category: state.section,
    source: state.mode,
    createdBy: {
      userId,
      userEmail,
      isAdmin,
      timestamp: now,
    },
    visibility: state.visibility,
    placement: {
      placement: state.placement,
      section: state.section,
    },
    dataSource: {
      type: state.mode === 'ai' ? 'ai_generated' : 'query',
      query: buildQueryConfig(state),
    },
    visualization: {
      type: state.chartType,
      xField: state.xField || undefined,
      yField: state.yField || undefined,
      valueFormat: 'number',
    },
    display: {
      icon: getDefaultIcon(state.chartType),
      iconColor: '#3B82F6',
      defaultSize: 2,
    },
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

function getDefaultIcon(chartType: ChartType): string {
  const icons: Record<ChartType, string> = {
    bar: 'BarChart3',
    line: 'LineChart',
    pie: 'PieChart',
    kpi: 'TrendingUp',
    table: 'Table',
    area: 'AreaChart',
  };
  return icons[chartType] || 'BarChart3';
}
