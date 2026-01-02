// ============================================================================
// FILE 1: src/ai/investigator/types.ts
// ============================================================================

// src/ai/investigator/types.ts
// The Investigator - Core Type Definitions

// ============================================================================
// INVESTIGATION TYPES
// ============================================================================

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

// ============================================================================
// TOOL EXECUTION TYPES
// ============================================================================

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

// ============================================================================
// REPORT BUILDING TYPES
// ============================================================================

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

// ============================================================================
// LEARNING TYPES
// ============================================================================

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

// ============================================================================
// NARRATIVE TYPES
// ============================================================================

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

// ============================================================================
// CONVERSATION TYPES
// ============================================================================

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
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalCostUsd: number;
    latencyMs: number;
    toolCalls: number;
  };
}

// ============================================================================
// ANOMALY DETECTION TYPES
// ============================================================================

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

// ============================================================================
// ROOT CAUSE ANALYSIS TYPES
// ============================================================================

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

// ============================================================================
// PROACTIVE INSIGHT TYPES
// ============================================================================

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


// ============================================================================
// FILE 2: src/ai/investigator/tools.ts
// ============================================================================

// src/ai/investigator/tools.ts
// The Investigator Tool Definitions

import { ToolDefinition } from './types';

export const INVESTIGATOR_TOOLS: ToolDefinition[] = [
  // ==========================================================================
  // DATA EXPLORATION TOOLS
  // ==========================================================================
  {
    name: 'explore_field',
    description: `Explore a data field to understand its values, distribution, and quality.
ALWAYS use this before referencing a field in reports.
Returns: unique values, coverage %, top values with counts, data quality assessment.`,
    parameters: {
      type: 'object',
      properties: {
        field_name: {
          type: 'string',
          description: 'Field to explore (e.g., "carrier_name", "destination_state")'
        },
        sample_size: {
          type: 'number',
          description: 'Number of top values to return (default: 15)'
        },
        include_nulls: {
          type: 'boolean',
          description: 'Include null/empty analysis (default: true)'
        }
      },
      required: ['field_name']
    }
  },
  {
    name: 'preview_aggregation',
    description: `Preview what an aggregation looks like with REAL DATA.
Use this to validate groupings and see actual numbers before adding to report.
Returns: actual aggregated values, group counts, insights about the data.`,
    parameters: {
      type: 'object',
      properties: {
        group_by: {
          type: 'string',
          description: 'Field to group by'
        },
        metric: {
          type: 'string',
          description: 'Field to aggregate'
        },
        aggregation: {
          type: 'string',
          description: 'Aggregation type',
          enum: ['sum', 'avg', 'count', 'countDistinct', 'min', 'max']
        },
        secondary_group_by: {
          type: 'string',
          description: 'Optional second grouping field'
        },
        filters: {
          type: 'array',
          description: 'Optional filters to apply',
          items: { type: 'object' }
        },
        limit: {
          type: 'number',
          description: 'Max groups to return (default: 15)'
        },
        sort: {
          type: 'string',
          description: 'Sort direction',
          enum: ['desc', 'asc']
        }
      },
      required: ['group_by', 'metric', 'aggregation']
    }
  },
  {
    name: 'compare_periods',
    description: `Compare a metric across two time periods.
Use for trend analysis, period-over-period comparisons.
Returns: values for both periods, change %, insights about significance.`,
    parameters: {
      type: 'object',
      properties: {
        metric: {
          type: 'string',
          description: 'Metric to compare'
        },
        aggregation: {
          type: 'string',
          description: 'How to aggregate',
          enum: ['sum', 'avg', 'count', 'countDistinct']
        },
        period1: {
          type: 'string',
          description: 'First period (e.g., "last30", "2024-Q3")'
        },
        period2: {
          type: 'string',
          description: 'Second period to compare against'
        },
        group_by: {
          type: 'string',
          description: 'Optional grouping for breakdown'
        }
      },
      required: ['metric', 'aggregation', 'period1', 'period2']
    }
  },
  {
    name: 'detect_anomalies',
    description: `Automatically detect anomalies in the data.
Finds spikes, drops, outliers, and unusual patterns.`,
    parameters: {
      type: 'object',
      properties: {
        metric: {
          type: 'string',
          description: 'Metric to analyze for anomalies'
        },
        group_by: {
          type: 'string',
          description: 'Optional grouping (e.g., find anomalies per carrier)'
        },
        sensitivity: {
          type: 'string',
          description: 'Detection sensitivity',
          enum: ['high', 'medium', 'low']
        },
        baseline: {
          type: 'string',
          description: 'What to compare against',
          enum: ['historical_avg', 'previous_period', 'peer_group']
        }
      },
      required: ['metric']
    }
  },
  {
    name: 'investigate_cause',
    description: `Perform root cause analysis for an observed issue.
Drills down into data to find contributing factors.`,
    parameters: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The question to investigate'
        },
        metric: {
          type: 'string',
          description: 'Primary metric involved'
        },
        context: {
          type: 'object',
          description: 'Additional context (filters, time range, etc.)'
        },
        max_depth: {
          type: 'number',
          description: 'How many levels deep to investigate (default: 3)'
        }
      },
      required: ['question', 'metric']
    }
  },

  // ==========================================================================
  // REPORT BUILDING TOOLS
  // ==========================================================================
  {
    name: 'create_report_draft',
    description: `Start a new report draft with metadata.
Always call this first before adding sections.`,
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Report title'
        },
        description: {
          type: 'string',
          description: 'Report description'
        },
        theme: {
          type: 'string',
          description: 'Color theme',
          enum: ['blue', 'green', 'orange', 'purple', 'red', 'teal', 'slate']
        },
        date_range: {
          type: 'string',
          description: 'Date range preset',
          enum: ['last7', 'last30', 'last90', 'last6months', 'ytd', 'lastYear', 'all']
        }
      },
      required: ['name']
    }
  },
  {
    name: 'add_section',
    description: `Add a section to the report WITH IMMEDIATE DATA PREVIEW.
The section is executed against real data and results are returned.`,
    parameters: {
      type: 'object',
      properties: {
        section_type: {
          type: 'string',
          description: 'Type of section',
          enum: ['hero', 'stat-row', 'chart', 'table', 'map', 'header', 'category-grid']
        },
        title: {
          type: 'string',
          description: 'Section title'
        },
        config: {
          type: 'object',
          description: 'Section configuration (varies by type)'
        },
        position: {
          type: 'number',
          description: 'Position in report (omit to append)'
        },
        generate_insight: {
          type: 'boolean',
          description: 'Generate AI insight for this section (default: true)'
        }
      },
      required: ['section_type', 'config']
    }
  },
  {
    name: 'modify_section',
    description: `Modify an existing section and re-preview.`,
    parameters: {
      type: 'object',
      properties: {
        section_index: {
          type: 'number',
          description: 'Index of section to modify (0-based)'
        },
        updates: {
          type: 'object',
          description: 'Properties to update'
        },
        regenerate_insight: {
          type: 'boolean',
          description: 'Regenerate insight after modification'
        }
      },
      required: ['section_index', 'updates']
    }
  },
  {
    name: 'remove_section',
    description: `Remove a section from the report.`,
    parameters: {
      type: 'object',
      properties: {
        section_index: {
          type: 'number',
          description: 'Index of section to remove (0-based)'
        }
      },
      required: ['section_index']
    }
  },
  {
    name: 'reorder_sections',
    description: `Reorder sections in the report.`,
    parameters: {
      type: 'object',
      properties: {
        new_order: {
          type: 'array',
          description: 'Array of section indices in new order',
          items: { type: 'number' }
        }
      },
      required: ['new_order']
    }
  },
  {
    name: 'preview_report',
    description: `Execute and preview the entire report with real data.`,
    parameters: {
      type: 'object',
      properties: {
        include_insights: {
          type: 'boolean',
          description: 'Generate insights for each section'
        },
        include_narrative: {
          type: 'boolean',
          description: 'Generate executive narrative'
        }
      },
      required: []
    }
  },
  {
    name: 'finalize_report',
    description: `Finalize the report and mark as ready to save.`,
    parameters: {
      type: 'object',
      properties: {
        generate_narrative: {
          type: 'boolean',
          description: 'Include AI-generated narrative (default: true)'
        },
        summary: {
          type: 'string',
          description: 'Brief conversational summary for user'
        }
      },
      required: ['summary']
    }
  },

  // ==========================================================================
  // LEARNING TOOLS
  // ==========================================================================
  {
    name: 'learn_terminology',
    description: `Record customer-specific terminology.`,
    parameters: {
      type: 'object',
      properties: {
        term: {
          type: 'string',
          description: 'The term/abbreviation used by customer'
        },
        meaning: {
          type: 'string',
          description: 'What it means'
        },
        maps_to_field: {
          type: 'string',
          description: 'Database field this relates to'
        },
        maps_to_filter: {
          type: 'object',
          description: 'Filter to apply when this term is used'
        },
        confidence: {
          type: 'string',
          description: 'How confident are you?',
          enum: ['high', 'medium', 'low']
        }
      },
      required: ['term', 'meaning', 'confidence']
    }
  },
  {
    name: 'learn_preference',
    description: `Record a user preference for future use.`,
    parameters: {
      type: 'object',
      properties: {
        preference_type: {
          type: 'string',
          description: 'Type of preference',
          enum: ['chart_type', 'sort_order', 'grouping', 'theme', 'detail_level', 'metric']
        },
        key: {
          type: 'string',
          description: 'What the preference is about'
        },
        value: {
          type: 'string',
          description: 'The preferred value'
        },
        context: {
          type: 'string',
          description: 'When this preference applies'
        }
      },
      required: ['preference_type', 'key', 'value']
    }
  },
  {
    name: 'record_correction',
    description: `Record when user corrects the AI.`,
    parameters: {
      type: 'object',
      properties: {
        original: {
          type: 'string',
          description: 'What AI said/did'
        },
        corrected: {
          type: 'string',
          description: 'What user wanted'
        },
        context: {
          type: 'string',
          description: 'Full context of the correction'
        },
        apply_immediately: {
          type: 'boolean',
          description: 'Apply to current report? (default: true)'
        }
      },
      required: ['original', 'corrected', 'context']
    }
  },
  {
    name: 'get_customer_memory',
    description: `Retrieve what we've learned about this customer.`,
    parameters: {
      type: 'object',
      properties: {
        include_terminology: {
          type: 'boolean',
          description: 'Include learned terminology'
        },
        include_preferences: {
          type: 'boolean',
          description: 'Include preferences'
        },
        include_history: {
          type: 'boolean',
          description: 'Include recent corrections'
        }
      },
      required: []
    }
  },

  // ==========================================================================
  // NARRATIVE TOOLS
  // ==========================================================================
  {
    name: 'generate_insight',
    description: `Generate an insight about specific data.`,
    parameters: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          description: 'The data to analyze'
        },
        context: {
          type: 'string',
          description: 'What question this answers'
        },
        comparison_type: {
          type: 'string',
          description: 'Type of comparison',
          enum: ['period', 'peer', 'target', 'trend', 'benchmark']
        },
        audience: {
          type: 'string',
          description: 'Who is this for?',
          enum: ['executive', 'analyst', 'operations']
        }
      },
      required: ['data', 'context']
    }
  },
  {
    name: 'generate_recommendation',
    description: `Generate actionable recommendation from data.`,
    parameters: {
      type: 'object',
      properties: {
        finding: {
          type: 'string',
          description: 'The finding that prompts the recommendation'
        },
        data_support: {
          type: 'object',
          description: 'Data supporting the recommendation'
        },
        action_type: {
          type: 'string',
          description: 'Type of action',
          enum: ['negotiate', 'investigate', 'monitor', 'change', 'escalate']
        },
        urgency: {
          type: 'string',
          description: 'How urgent',
          enum: ['immediate', 'this_week', 'this_month', 'next_quarter']
        }
      },
      required: ['finding', 'data_support', 'action_type']
    }
  },

  // ==========================================================================
  // CLARIFICATION TOOLS
  // ==========================================================================
  {
    name: 'ask_clarification',
    description: `Ask user for clarification when request is ambiguous.`,
    parameters: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The clarifying question'
        },
        options: {
          type: 'array',
          description: 'Suggested options (if applicable)',
          items: { type: 'string' }
        },
        context: {
          type: 'string',
          description: 'Why you need this clarification'
        },
        default_if_no_response: {
          type: 'string',
          description: 'What you\'ll assume if no response'
        }
      },
      required: ['question']
    }
  },
  {
    name: 'confirm_understanding',
    description: `Confirm your interpretation before proceeding.`,
    parameters: {
      type: 'object',
      properties: {
        interpretation: {
          type: 'string',
          description: 'Your interpretation of the request'
        },
        planned_actions: {
          type: 'array',
          description: 'What you plan to do',
          items: { type: 'string' }
        },
        assumptions: {
          type: 'array',
          description: 'Assumptions you\'re making',
          items: { type: 'string' }
        }
      },
      required: ['interpretation']
    }
  }
];

/**
 * Get tool definitions formatted for Claude API
 */
export function getToolsForClaude(): Array<{
  name: string;
  description: string;
  input_schema: object;
}> {
  return INVESTIGATOR_TOOLS.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters
  }));
}

/**
 * Get tools by category
 */
export function getToolsByCategory(): Record<string, ToolDefinition[]> {
  return {
    exploration: INVESTIGATOR_TOOLS.filter(t => 
      ['explore_field', 'preview_aggregation', 'compare_periods', 'detect_anomalies', 'investigate_cause'].includes(t.name)
    ),
    building: INVESTIGATOR_TOOLS.filter(t => 
      ['create_report_draft', 'add_section', 'modify_section', 'remove_section', 'reorder_sections', 'preview_report', 'finalize_report'].includes(t.name)
    ),
    learning: INVESTIGATOR_TOOLS.filter(t => 
      ['learn_terminology', 'learn_preference', 'record_correction', 'get_customer_memory'].includes(t.name)
    ),
    narrative: INVESTIGATOR_TOOLS.filter(t => 
      ['generate_insight', 'generate_recommendation'].includes(t.name)
    ),
    clarification: INVESTIGATOR_TOOLS.filter(t => 
      ['ask_clarification', 'confirm_understanding'].includes(t.name)
    )
  };
}


// ============================================================================
// FILE 3: src/ai/investigator/clientService.ts
// ============================================================================

// src/ai/investigator/clientService.ts
// Secure client service - calls Edge Function instead of direct Claude API

import { supabase } from '../../lib/supabase';
import type {
  InvestigationContext,
  InvestigatorRequest,
  InvestigatorResponse,
  ConversationMessage,
  ReportDraft,
} from './types';

/**
 * Secure Investigator Client
 * 
 * Calls the Supabase Edge Function instead of Claude directly.
 * This keeps the API key server-side where it belongs.
 */
export class InvestigatorClient {
  /**
   * Process a request through the secure edge function
   */
  async processRequest(request: InvestigatorRequest): Promise<InvestigatorResponse> {
    try {
      // Use existing generate-report edge function with investigator mode
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
          prompt: request.prompt,
          conversationHistory: request.conversationHistory.map(m => ({
            role: m.role,
            content: m.content
          })),
          customerId: request.context.customerId,
          customerName: request.context.customerName,
          isAdmin: request.context.isAdmin,
          userId: request.context.userId,
          userEmail: request.context.userEmail,
          sessionId: request.context.sessionId,
          mode: request.mode,
          currentReport: request.currentReport,
          useTools: true,
          investigatorMode: true
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        return {
          success: false,
          message: error.message || 'Failed to process request',
          toolExecutions: [],
          usage: {
            inputTokens: 0,
            outputTokens: 0,
            totalCostUsd: 0,
            latencyMs: 0,
            toolCalls: 0,
          },
        };
      }

      return {
        success: !data.error,
        message: data.message || '',
        report: data.report || undefined,
        insights: data.insights || [],
        toolExecutions: data.toolExecutions || [],
        learnings: data.learnings,
        needsClarification: data.needsClarification,
        clarificationQuestion: data.clarificationQuestion,
        clarificationOptions: data.clarificationOptions,
        usage: data.usage || {
          inputTokens: 0,
          outputTokens: 0,
          totalCostUsd: 0,
          latencyMs: 0,
          toolCalls: data.toolExecutions?.length || 0,
        },
      };
    } catch (error) {
      console.error('Client error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        toolExecutions: [],
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalCostUsd: 0,
          latencyMs: 0,
          toolCalls: 0,
        },
      };
    }
  }
}

/**
 * Create a secure investigator client
 */
export function createSecureInvestigator(): InvestigatorClient {
  return new InvestigatorClient();
}

/**
 * Simple wrapper for one-off secure requests
 */
export async function investigateSecure(
  prompt: string,
  context: InvestigationContext,
  options: {
    conversationHistory?: ConversationMessage[];
    currentReport?: ReportDraft;
    mode?: 'investigate' | 'build' | 'modify' | 'analyze';
  } = {}
): Promise<InvestigatorResponse> {
  const client = createSecureInvestigator();
  
  return client.processRequest({
    prompt,
    conversationHistory: options.conversationHistory || [],
    context,
    currentReport: options.currentReport,
    mode: options.mode || 'investigate',
  });
}


// ============================================================================
// FILE 4: src/ai/investigator/index.ts
// ============================================================================

// src/ai/investigator/index.ts
// Barrel exports for the Investigator module

export * from './types';
export * from './tools';
export * from './clientService';


// ============================================================================
// FILE 5: src/hooks/useInvestigator.ts
// ============================================================================

// src/hooks/useInvestigator.ts
// React hook for the Investigator service

import { useState, useCallback, useRef, useEffect } from 'react';
import { createSecureInvestigator, InvestigatorClient } from '../ai/investigator/clientService';
import type {
  InvestigatorResponse,
  ConversationMessage,
  ReportDraft,
  DataInsight,
  ToolExecution,
  LearningEntry,
} from '../ai/investigator/types';

export interface UseInvestigatorOptions {
  customerId: string;
  customerName?: string;
  isAdmin: boolean;
  userId?: string;
  userEmail?: string;
  onInsight?: (insight: DataInsight) => void;
  onLearning?: (learning: LearningEntry) => void;
  onToolExecution?: (execution: ToolExecution) => void;
  onReportUpdate?: (report: ReportDraft) => void;
}

export interface UseInvestigatorReturn {
  isLoading: boolean;
  error: string | null;
  messages: ConversationMessage[];
  currentReport: ReportDraft | null;
  insights: DataInsight[];
  toolExecutions: ToolExecution[];
  sendMessage: (message: string, mode?: 'investigate' | 'build' | 'modify' | 'analyze') => Promise<InvestigatorResponse | null>;
  clearConversation: () => void;
  setCurrentReport: (report: ReportDraft | null) => void;
  needsClarification: boolean;
  clarificationQuestion: string | null;
  clarificationOptions: string[] | null;
  respondToClarification: (response: string) => Promise<InvestigatorResponse | null>;
  usage: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
    totalToolCalls: number;
    sessionDuration: number;
  };
}

export function useInvestigator(options: UseInvestigatorOptions): UseInvestigatorReturn {
  const {
    customerId,
    customerName,
    isAdmin,
    userId,
    userEmail,
    onInsight,
    onLearning,
    onToolExecution,
    onReportUpdate,
  } = options;

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentReport, setCurrentReport] = useState<ReportDraft | null>(null);
  const [insights, setInsights] = useState<DataInsight[]>([]);
  const [toolExecutions, setToolExecutions] = useState<ToolExecution[]>([]);
  const [needsClarification, setNeedsClarification] = useState(false);
  const [clarificationQuestion, setClarificationQuestion] = useState<string | null>(null);
  const [clarificationOptions, setClarificationOptions] = useState<string[] | null>(null);
  const [usage, setUsage] = useState({
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    totalToolCalls: 0,
    sessionDuration: 0,
  });

  // Refs
  const clientRef = useRef<InvestigatorClient | null>(null);
  const sessionStartRef = useRef<number>(Date.now());
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const pendingClarificationRef = useRef<{
    originalMessage: string;
    mode: 'investigate' | 'build' | 'modify' | 'analyze';
  } | null>(null);

  // Initialize client
  useEffect(() => {
    clientRef.current = createSecureInvestigator();
  }, []);

  // Send a message through the secure edge function
  const sendMessage = useCallback(async (
    message: string,
    mode: 'investigate' | 'build' | 'modify' | 'analyze' = 'investigate'
  ): Promise<InvestigatorResponse | null> => {
    if (!clientRef.current) {
      setError('Client not initialized');
      return null;
    }

    setIsLoading(true);
    setError(null);
    setNeedsClarification(false);
    setClarificationQuestion(null);
    setClarificationOptions(null);

    // Add user message to history
    const userMessage: ConversationMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await clientRef.current.processRequest({
        prompt: message,
        conversationHistory: messages,
        context: {
          customerId,
          customerName,
          isAdmin,
          userId,
          userEmail,
          sessionId: sessionIdRef.current,
        },
        currentReport: currentReport || undefined,
        mode,
      });

      // Update usage
      setUsage(prev => ({
        totalInputTokens: prev.totalInputTokens + response.usage.inputTokens,
        totalOutputTokens: prev.totalOutputTokens + response.usage.outputTokens,
        totalCost: prev.totalCost + response.usage.totalCostUsd,
        totalToolCalls: prev.totalToolCalls + response.usage.toolCalls,
        sessionDuration: Date.now() - sessionStartRef.current,
      }));

      // Add assistant message
      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
        toolExecutions: response.toolExecutions,
        reportDraft: response.report,
        insights: response.insights,
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Update tool executions
      if (response.toolExecutions.length > 0) {
        setToolExecutions(prev => [...prev, ...response.toolExecutions]);
        response.toolExecutions.forEach(exec => onToolExecution?.(exec));
      }

      // Update insights
      if (response.insights && response.insights.length > 0) {
        setInsights(prev => [...prev, ...response.insights!]);
        response.insights.forEach(insight => onInsight?.(insight));
      }

      // Update learnings
      if (response.learnings) {
        response.learnings.forEach(learning => onLearning?.(learning));
      }

      // Update report
      if (response.report) {
        setCurrentReport(response.report);
        onReportUpdate?.(response.report);
      }

      // Handle clarification
      if (response.needsClarification) {
        setNeedsClarification(true);
        setClarificationQuestion(response.clarificationQuestion || null);
        setClarificationOptions(response.clarificationOptions || null);
        pendingClarificationRef.current = { originalMessage: message, mode };
      }

      setIsLoading(false);
      return response;

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      setError(errorMessage);
      setIsLoading(false);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I encountered an error: ${errorMessage}. Please try again.`,
        timestamp: new Date().toISOString(),
      }]);

      return null;
    }
  }, [messages, currentReport, customerId, customerName, isAdmin, userId, userEmail, onInsight, onLearning, onToolExecution, onReportUpdate]);

  // Respond to clarification
  const respondToClarification = useCallback(async (
    response: string
  ): Promise<InvestigatorResponse | null> => {
    if (!pendingClarificationRef.current) {
      setError('No pending clarification');
      return null;
    }

    const { mode } = pendingClarificationRef.current;
    pendingClarificationRef.current = null;

    return sendMessage(response, mode);
  }, [sendMessage]);

  // Clear conversation
  const clearConversation = useCallback(() => {
    setMessages([]);
    setInsights([]);
    setToolExecutions([]);
    setError(null);
    setNeedsClarification(false);
    setClarificationQuestion(null);
    setClarificationOptions(null);
    pendingClarificationRef.current = null;
    sessionIdRef.current = crypto.randomUUID();
    sessionStartRef.current = Date.now();
    setUsage({
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      totalToolCalls: 0,
      sessionDuration: 0,
    });
  }, []);

  return {
    isLoading,
    error,
    messages,
    currentReport,
    insights,
    toolExecutions,
    sendMessage,
    clearConversation,
    setCurrentReport,
    needsClarification,
    clarificationQuestion,
    clarificationOptions,
    respondToClarification,
    usage,
  };
}


// ============================================================================
// FILE 6: src/components/ai/InvestigatorStudio.tsx
// ============================================================================

// src/components/ai/InvestigatorStudio.tsx
// The Investigator Studio - Main UI for AI-powered analytics

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  Target,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Search,
  FileText,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  RefreshCw,
  HelpCircle,
  Brain,
} from 'lucide-react';
import { useInvestigator } from '../../hooks/useInvestigator';
import type {
  ConversationMessage,
  DataInsight,
  ToolExecution,
  ReportDraft,
} from '../../ai/investigator/types';

interface InvestigatorStudioProps {
  customerId: string;
  customerName?: string;
  isAdmin: boolean;
  userId?: string;
  userEmail?: string;
  onReportGenerated?: (report: ReportDraft) => void;
  embedded?: boolean;
}

export function InvestigatorStudio({
  customerId,
  customerName,
  isAdmin,
  userId,
  userEmail,
  onReportGenerated,
  embedded = false,
}: InvestigatorStudioProps) {
  const [inputValue, setInputValue] = useState('');
  const [showToolDetails, setShowToolDetails] = useState(false);
  const [mode, setMode] = useState<'investigate' | 'build' | 'analyze'>('investigate');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    isLoading,
    error,
    messages,
    insights,
    sendMessage,
    clearConversation,
    needsClarification,
    clarificationQuestion,
    clarificationOptions,
    respondToClarification,
    usage,
  } = useInvestigator({
    customerId,
    customerName,
    isAdmin,
    userId,
    userEmail,
    onReportUpdate: onReportGenerated,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle send
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue('');

    if (needsClarification) {
      await respondToClarification(message);
    } else {
      await sendMessage(message, mode);
    }
  }, [inputValue, isLoading, needsClarification, respondToClarification, sendMessage, mode]);

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle clarification option click
  const handleClarificationOption = async (option: string) => {
    await respondToClarification(option);
  };

  // Quick action suggestions
  const suggestions = [
    { icon: Search, label: 'Explore my data', action: 'Give me an overview of my shipping data' },
    { icon: TrendingUp, label: 'Find anomalies', action: 'Are there any anomalies in my recent shipments?' },
    { icon: BarChart3, label: 'Build a report', action: 'Create a carrier performance report' },
    { icon: Target, label: 'Cost analysis', action: 'Which lanes are most expensive?' },
  ];

  return (
    <div className={`flex flex-col ${embedded ? 'h-full' : 'h-[calc(100vh-200px)] min-h-[500px]'} bg-gray-50 rounded-xl overflow-hidden`}>
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">The Investigator</h2>
              <p className="text-xs text-gray-500">AI-powered logistics analytics</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { key: 'investigate', icon: Search, label: 'Investigate' },
                { key: 'build', icon: FileText, label: 'Build Report' },
                { key: 'analyze', icon: BarChart3, label: 'Deep Analysis' },
              ].map(m => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key as 'investigate' | 'build' | 'analyze')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    mode === m.key
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <m.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              ))}
            </div>

            {/* Clear button */}
            <button
              onClick={clearConversation}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="Clear conversation"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Usage stats */}
        {usage.totalToolCalls > 0 && (
          <div className="flex items-center gap-4 mt-2 pt-2 border-t text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {usage.totalToolCalls} tool calls
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              ${usage.totalCost.toFixed(4)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {Math.round(usage.sessionDuration / 1000)}s session
            </span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl mb-4">
              <Brain className="w-12 h-12 text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Ready to investigate
            </h3>
            <p className="text-gray-500 max-w-md mb-6">
              I can explore your data, find anomalies, build reports, and explain what everything means. 
              What would you like to know?
            </p>

            {/* Quick suggestions */}
            <div className="grid grid-cols-2 gap-2 max-w-md">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInputValue(suggestion.action);
                    inputRef.current?.focus();
                  }}
                  className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg text-left hover:border-orange-300 hover:bg-orange-50 transition-colors"
                >
                  <suggestion.icon className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-gray-700">{suggestion.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <MessageBubble
                key={index}
                message={message}
                showToolDetails={showToolDetails}
                onToggleToolDetails={() => setShowToolDetails(!showToolDetails)}
              />
            ))}

            {/* Clarification prompt */}
            {needsClarification && clarificationQuestion && clarificationOptions && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-2 mb-3">
                  <HelpCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                  <p className="text-amber-800">{clarificationQuestion}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {clarificationOptions.map((option, i) => (
                    <button
                      key={i}
                      onClick={() => handleClarificationOption(option)}
                      className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-sm text-amber-800 hover:bg-amber-100 transition-colors"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center gap-3 text-gray-500">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                </div>
                <span className="text-sm">Investigating...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Active insights bar */}
      {insights.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-t border-orange-200 px-4 py-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <Sparkles className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <span className="text-xs font-medium text-orange-700 flex-shrink-0">
              {insights.length} insight{insights.length > 1 ? 's' : ''} found:
            </span>
            {insights.slice(-3).map((insight, i) => (
              <span
                key={i}
                className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                  insight.severity === 'critical'
                    ? 'bg-red-100 text-red-700'
                    : insight.severity === 'warning'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {insight.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t p-4">
        {error && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={
                needsClarification
                  ? 'Type your response...'
                  : mode === 'build'
                  ? 'Describe the report you want to create...'
                  : mode === 'analyze'
                  ? 'What would you like me to analyze?'
                  : 'Ask me anything about your shipping data...'
              }
              rows={1}
              className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              style={{
                minHeight: '48px',
                maxHeight: '120px',
              }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="p-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Message bubble component
interface MessageBubbleProps {
  message: ConversationMessage;
  showToolDetails: boolean;
  onToggleToolDetails: () => void;
}

function MessageBubble({ message, showToolDetails, onToggleToolDetails }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          isUser
            ? 'bg-blue-500'
            : 'bg-gradient-to-br from-orange-500 to-amber-500'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block p-3 rounded-xl ${
            isUser
              ? 'bg-blue-500 text-white'
              : 'bg-white border border-gray-200'
          }`}
        >
          <p className={`text-sm whitespace-pre-wrap ${isUser ? '' : 'text-gray-700'}`}>
            {message.content}
          </p>
        </div>

        {/* Tool executions */}
        {!isUser && message.toolExecutions && message.toolExecutions.length > 0 && (
          <div className="mt-2">
            <button
              onClick={onToggleToolDetails}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <Zap className="w-3 h-3" />
              {message.toolExecutions.length} tool call{message.toolExecutions.length > 1 ? 's' : ''}
              {showToolDetails ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            {showToolDetails && (
              <div className="mt-2 space-y-1">
                {message.toolExecutions.map((exec, i) => (
                  <ToolExecutionBadge key={i} execution={exec} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Insights */}
        {!isUser && message.insights && message.insights.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.insights.map((insight, i) => (
              <InsightBadge key={i} insight={insight} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Tool execution badge
function ToolExecutionBadge({ execution }: { execution: ToolExecution }) {
  const success = !(execution.result as Record<string, unknown>)?.error;

  return (
    <div className="flex items-center gap-2 text-xs bg-gray-50 border rounded-lg px-2 py-1">
      {success ? (
        <CheckCircle className="w-3 h-3 text-green-500" />
      ) : (
        <XCircle className="w-3 h-3 text-red-500" />
      )}
      <span className="font-medium text-gray-700">{execution.toolName}</span>
      <span className="text-gray-400">•</span>
      <span className="text-gray-500">{execution.duration}ms</span>
    </div>
  );
}

// Insight badge
function InsightBadge({ insight }: { insight: DataInsight }) {
  const Icon = insight.type === 'anomaly' ? AlertTriangle :
               insight.type === 'trend' ? TrendingUp :
               insight.type === 'recommendation' ? Lightbulb :
               Target;

  const colorClass = insight.severity === 'critical' ? 'bg-red-50 border-red-200 text-red-700' :
                     insight.severity === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                     'bg-blue-50 border-blue-200 text-blue-700';

  return (
    <div className={`flex items-start gap-2 p-2 rounded-lg border ${colorClass}`}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium">{insight.title}</p>
        <p className="text-xs opacity-80">{insight.description}</p>
        {insight.suggestedAction && (
          <p className="text-xs mt-1 font-medium">
            → {insight.suggestedAction}
          </p>
        )}
      </div>
    </div>
  );
}

export default InvestigatorStudio;
