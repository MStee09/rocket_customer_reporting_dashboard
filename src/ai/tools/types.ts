import { AIReportDefinition } from '../../types/aiReport';

export type ToolName =
  | 'explore_field'
  | 'preview_grouping'
  | 'get_schema_info'
  | 'get_customer_context'
  | 'search_knowledge'
  | 'add_report_section'
  | 'modify_report_section'
  | 'remove_report_section'
  | 'set_report_metadata'
  | 'validate_report'
  | 'execute_preview'
  | 'suggest_visualization'
  | 'get_field_relationships'
  | 'build_widget_config';

export interface ToolDefinition {
  name: ToolName;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      items?: { type: string };
    }>;
    required: string[];
  };
}

export interface ToolCall {
  id: string;
  name: ToolName;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  success: boolean;
  data?: unknown;
  error?: string;
  suggestions?: string[];
}

export interface ConversationState {
  phase: 'exploring' | 'specifying' | 'refining' | 'complete';
  reportInProgress: Partial<AIReportDefinition> | null;
  confirmedFields: string[];
  confirmedFilters: ReportFilter[];
  exploredFields: Map<string, FieldExplorationResult>;
  pendingClarifications: string[];
  turnCount: number;
  lastToolCalls: ToolCall[];
}

export interface FieldExplorationResult {
  fieldName: string;
  dataType: 'text' | 'number' | 'date' | 'boolean';
  totalCount: number;
  populatedCount: number;
  populatedPercent: number;
  uniqueCount?: number;
  sampleValues?: string[];
  numericStats?: {
    min: number;
    max: number;
    avg: number;
    sum: number;
  };
  dateRange?: {
    min: string;
    max: string;
  };
}

export interface GroupingPreview {
  groupBy: string;
  metric: string;
  aggregation: string;
  results: Array<{
    name: string;
    value: number;
    count: number;
  }>;
  totalGroups: number;
  recommendation: 'good' | 'too_many' | 'too_few' | 'low_coverage';
  suggestionText?: string;
}

export interface VisualizationSuggestion {
  chartType: string;
  confidence: number;
  reasoning: string;
  alternativeTypes: string[];
  warnings?: string[];
}

export interface ReportFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'between';
  value: unknown;
}

export interface AIToolContext {
  customerId: string;
  isAdmin: boolean;
  conversationState: ConversationState;
  schemaFields: SchemaFieldInfo[];
  fieldRelationships: FieldRelationship[];
}

export interface SchemaFieldInfo {
  name: string;
  displayName: string;
  dataType: string;
  isGroupable: boolean;
  isAggregatable: boolean;
  isFilterable: boolean;
  businessContext?: string;
  category: 'dimension' | 'measure' | 'date' | 'identifier';
  relatedFields?: string[];
  sampleValues?: string[];
  adminOnly: boolean;
}

export interface FieldRelationship {
  fieldA: string;
  fieldB: string;
  relationshipType: 'lane_pair' | 'temporal_pair' | 'hierarchy' | 'ratio_candidate' | 'same_entity';
  description: string;
  suggestedUse?: string;
}
