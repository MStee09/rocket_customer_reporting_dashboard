export interface InvestigationContext {
  customerId: string;
  customerName?: string;
  isAdmin: boolean;
  userId?: string;
  userEmail?: string;
  sessionId?: string;
}

export interface DataInsight {
  type: 'anomaly' | 'trend' | 'comparison' | 'recommendation' | 'warning';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  dataPoints?: Record<string, unknown>;
  suggestedAction?: string;
  confidence: number;
}

export interface FieldExploration {
  fieldName: string;
  uniqueCount: number;
  populatedPercent: number;
  topValues: Array<{ value: string; count: number; percent: number }>;
  dataType: string;
  nullCount: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  qualityIssues?: string[];
}

export interface GroupingPreview {
  groupBy: string;
  metric: string;
  aggregation: string;
  totalGroups: number;
  totalValue: number;
  results: Array<{
    name: string;
    value: number;
    count: number;
    percentOfTotal: number;
  }>;
  quality: 'good' | 'many_groups' | 'single_group' | 'empty';
  warning?: string;
  insight?: DataInsight;
}

export interface SectionPreview {
  sectionIndex: number;
  sectionType: string;
  title: string;
  dataPreview: {
    rowCount: number;
    sampleData: unknown[];
    aggregatedValues?: Record<string, number>;
  };
  executionTime: number;
  quality: 'valid' | 'empty' | 'error';
  error?: string;
  insights?: DataInsight[];
}

export interface ToolDefinition {
  name: string;
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

export interface ToolExecution {
  toolName: string;
  toolInput: Record<string, unknown>;
  result: unknown;
  timestamp: string;
  duration: number;
  tokenCost?: number;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  insights?: DataInsight[];
  tokenCost?: number;
}

export interface ReportDraft {
  id: string;
  name: string;
  description?: string;
  theme: ReportTheme;
  dateRange: DateRangeConfig;
  sections: DraftSection[];
  calculatedFields: CalculatedFieldDef[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    validationState: 'draft' | 'validated' | 'error';
    validationErrors: string[];
    totalDataPreviewTime: number;
  };
  customerId?: string;
}

export interface DraftSection {
  id: string;
  type: SectionType;
  title?: string;
  config: Record<string, unknown>;
  preview?: SectionPreview;
  validationState: 'pending' | 'valid' | 'invalid';
  validationErrors: string[];
  insights: DataInsight[];
}

export type SectionType = 'hero' | 'stat-row' | 'chart' | 'table' | 'map' | 'header' | 'category-grid';
export type ReportTheme = 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'teal' | 'slate';
export type ChartType = 'bar' | 'line' | 'pie' | 'treemap' | 'radar' | 'area' | 'scatter' | 'bump' | 'funnel' | 'heatmap';
export type MapType = 'choropleth' | 'flow' | 'cluster' | 'arc';
export type AggregationType = 'sum' | 'avg' | 'count' | 'countDistinct' | 'min' | 'max';

export interface DateRangeConfig {
  type: 'last7' | 'last30' | 'last90' | 'last6months' | 'ytd' | 'lastYear' | 'all' | 'custom';
  customStart?: string;
  customEnd?: string;
}

export interface CalculatedFieldDef {
  name: string;
  label: string;
  formula: string;
  fields: string[];
  format: 'number' | 'currency' | 'percent';
}

export interface LearningEntry {
  type: 'terminology' | 'product' | 'preference' | 'correction' | 'pattern';
  key: string;
  value: string;
  mapsToField?: string;
  mapsToFilter?: FilterMapping;
  confidence: number;
  source: 'explicit' | 'inferred' | 'correction';
  usageCount: number;
  lastUsed: string;
  createdAt: string;
}

export interface FilterMapping {
  field: string;
  operator: 'eq' | 'contains' | 'in' | 'gt' | 'lt' | 'between';
  value: unknown;
}

export interface CustomerLearningProfile {
  customerId: string;
  terminology: LearningEntry[];
  products: LearningEntry[];
  preferences: {
    chartTypes: Record<string, number>;
    sortPreferences: Record<string, 'asc' | 'desc'>;
    commonFilters: FilterMapping[];
    focusMetrics: string[];
  };
  corrections: Array<{
    original: string;
    corrected: string;
    context: string;
    timestamp: string;
  }>;
  conversationPatterns: {
    avgQuestionsPerSession: number;
    commonTopics: string[];
    preferredDetailLevel: 'summary' | 'detailed' | 'comprehensive';
  };
}

export interface NarrativeSection {
  title: string;
  content: string;
  dataReferences: Array<{
    metric: string;
    value: number;
    format: string;
    comparison?: {
      type: 'period' | 'benchmark' | 'target';
      value: number;
      percentChange: number;
      direction: 'up' | 'down' | 'flat';
    };
  }>;
  insights: DataInsight[];
  recommendedActions: string[];
}

export interface ReportNarrative {
  executiveSummary: string;
  keyFindings: DataInsight[];
  sectionNarratives: NarrativeSection[];
  recommendedNextSteps: string[];
  confidenceLevel: 'high' | 'medium' | 'low';
  dataQualityNotes?: string[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  toolExecutions?: ToolExecution[];
  reportDraft?: ReportDraft;
  insights?: DataInsight[];
}

export interface InvestigatorRequest {
  prompt: string;
  conversationHistory: ConversationMessage[];
  context: InvestigationContext;
  currentReport?: ReportDraft;
  mode: 'investigate' | 'build' | 'modify' | 'analyze';
}

export interface InvestigatorResponse {
  success: boolean;
  message: string;
  report?: ReportDraft;
  narrative?: ReportNarrative;
  insights?: DataInsight[];
  toolExecutions: ToolExecution[];
  learnings?: LearningEntry[];
  needsClarification?: boolean;
  clarificationQuestion?: string;
  clarificationOptions?: string[];
  summarized?: boolean;
  tokensSaved?: number;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalCostUsd: number;
    latencyMs: number;
    toolCalls: number;
  };
}

export interface AnomalyDetectionConfig {
  field: string;
  baseline: 'historical' | 'peer' | 'target';
  thresholds: {
    warning: number;
    critical: number;
  };
  groupBy?: string;
  timeframe?: string;
}

export interface DetectedAnomaly {
  type: 'spike' | 'drop' | 'outlier' | 'missing' | 'pattern_break';
  field: string;
  currentValue: number;
  expectedValue: number;
  deviation: number;
  deviationPercent: number;
  severity: 'info' | 'warning' | 'critical';
  context: {
    groupBy?: string;
    groupValue?: string;
    timeframe?: string;
  };
  possibleCauses: string[];
  suggestedActions: string[];
}

export interface RootCauseAnalysis {
  question: string;
  conclusion: string;
  confidence: number;
  supportingData: Array<{
    finding: string;
    data: Record<string, unknown>;
    contributionPercent: number;
  }>;
  investigationSteps: Array<{
    step: number;
    action: string;
    result: string;
    toolUsed?: string;
  }>;
  alternativeExplanations?: string[];
  recommendedActions: string[];
}

export interface ProactiveInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'trend' | 'anomaly' | 'milestone';
  priority: 'high' | 'medium' | 'low';
  title: string;
  summary: string;
  detailedExplanation: string;
  dataEvidence: Array<{
    metric: string;
    value: number;
    comparison: string;
  }>;
  potentialImpact: {
    metric: string;
    estimate: number;
    confidence: number;
  };
  suggestedActions: string[];
  expiresAt?: string;
  acknowledgedAt?: string;
}
