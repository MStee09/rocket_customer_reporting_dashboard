import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { RESTRICTED_FIELDS, isRestrictedField, findRestrictedFieldsInString, getAccessControlPrompt } from "./services/restrictedFields.ts";
import { TokenBudgetService, createBudgetExhaustedResponse } from "./services/tokenBudget.ts";
import { getClaudeCircuitBreaker, createCircuitOpenResponse } from "./services/circuitBreaker.ts";
import { RateLimitService, createRateLimitResponse } from "./services/rateLimit.ts";
import { ContextService } from "./services/contextService.ts";
import { ToolExecutor, LearningExtraction as ToolLearning } from "./services/toolExecutor.ts";
import { maybeSummarizeConversation } from "./services/summarizationService.ts";
import { processAIResponse } from "./services/outputValidation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  prompt: string;
  conversationHistory: ConversationMessage[];
  customerId: string;
  isAdmin?: boolean;
  knowledgeContext?: string;
  currentReport?: Record<string, unknown>;
  customerName?: string;
  useTools?: boolean;
  userId?: string;
  userEmail?: string;
  sessionId?: string;
  mode?: 'investigate' | 'build' | 'analyze';
}

interface ToolExecution {
  toolName: string;
  toolInput: Record<string, unknown>;
  result: unknown;
  timestamp: string;
  duration?: number;
}

interface SchemaField {
  name: string;
  type: string;
  isGroupable: boolean;
  isAggregatable: boolean;
  businessContext?: string;
  aiInstructions?: string;
  adminOnly?: boolean;
}

interface DataProfile {
  totalShipments: number;
  stateCount: number;
  carrierCount: number;
  monthsOfData: number;
  topStates: string[];
  topCarriers: string[];
  avgShipmentsPerDay: number;
  hasCanadaData?: boolean;
}

interface TermDefinition {
  key: string;
  label?: string;
  definition: string;
  aiInstructions?: string;
  scope: "global" | "customer";
  aliases?: string[];
}

interface ProductMapping {
  name: string;
  keywords: string[];
  searchField: string;
}

interface CustomerProfile {
  priorities: string[];
  products: Array<{ name: string; keywords: string[]; field: string }>;
  keyMarkets: string[];
  terminology: Array<{ term: string; means: string; source: string }>;
  benchmarkPeriod?: string;
  accountNotes?: string;
  preferences?: Record<string, Record<string, number>>;
}

interface LearningExtraction {
  type: "terminology" | "product" | "preference" | "correction";
  key: string;
  value: string;
  confidence: number;
  source: "explicit" | "inferred" | "tool";
}

async function verifyAdminRole(supabase: SupabaseClient, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('user_role')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.log(`[Auth] No role found for user ${userId}, defaulting to non-admin`);
      return false;
    }

    const isAdmin = data.user_role === 'admin';
    console.log(`[Auth] User ${userId} verified role: ${data.user_role}, isAdmin: ${isAdmin}`);
    return isAdmin;
  } catch (e) {
    console.error('[Auth] Error verifying admin role:', e);
    return false;
  }
}

async function logUsage(
  supabase: SupabaseClient,
  params: {
    userId: string;
    userEmail?: string;
    customerId?: string;
    customerName?: string;
    requestType?: string;
    sessionId?: string;
    inputTokens: number;
    outputTokens: number;
    modelUsed?: string;
    latencyMs?: number;
    toolTurns?: number;
    status: string;
    errorMessage?: string;
  }
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('log_ai_usage', {
      p_user_id: params.userId,
      p_user_email: params.userEmail || null,
      p_customer_id: params.customerId ? parseInt(params.customerId, 10) : null,
      p_customer_name: params.customerName || null,
      p_request_type: params.requestType || 'report',
      p_session_id: params.sessionId || null,
      p_input_tokens: params.inputTokens || 0,
      p_output_tokens: params.outputTokens || 0,
      p_model_used: params.modelUsed || 'claude-sonnet-4-20250514',
      p_latency_ms: params.latencyMs || null,
      p_tool_turns: params.toolTurns || 0,
      p_status: params.status,
      p_error_message: params.errorMessage || null
    });

    if (error) {
      console.error('[Usage Log] Failed:', error);
      return null;
    }

    console.log('[Usage Log] Success:', data);
    return data;
  } catch (e) {
    console.error('[Usage Log] Exception:', e);
    return null;
  }
}

async function getRelevantKnowledge(
  supabase: SupabaseClient,
  query: string,
  customerId: string,
  limit: number = 5
): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('search-knowledge', {
      body: { query, customerId, threshold: 0.5, limit }
    });

    if (!error && data?.chunks?.length > 0) {
      const chunks = data.chunks.map((c: { chunk_text: string; similarity: number }, i: number) =>
        `[Source ${i + 1} - Relevance: ${Math.round(c.similarity * 100)}%]\n${c.chunk_text}`
      );
      return `## RELEVANT KNOWLEDGE BASE CONTENT\n\n${chunks.join('\n\n---\n\n')}`;
    }

    const { data: docs } = await supabase
      .from('ai_knowledge_documents')
      .select('file_name, extracted_text')
      .eq('customer_id', customerId)
      .not('extracted_text', 'is', null)
      .limit(2);

    if (!docs || docs.length === 0) return '';

    const fallbackContext = docs.map(doc => {
      const preview = doc.extracted_text.length > 1000
        ? doc.extracted_text.substring(0, 1000) + '...[truncated]'
        : doc.extracted_text;
      return `### ${doc.file_name}\n${preview}`;
    }).join('\n\n');

    return `## KNOWLEDGE BASE (No Embeddings)\n\n${fallbackContext}`;
  } catch (error) {
    console.error('[getRelevantKnowledge] Error:', error);
    return '';
  }
}

const AI_TOOLS: Anthropic.Tool[] = [
  {
    name: "explore_field",
    description: `Explore a data field to understand its values, distribution, and quality.
ALWAYS use this before referencing a field in reports.
Returns: unique values, coverage %, top values with counts, data quality assessment.`,
    input_schema: {
      type: "object" as const,
      properties: {
        field_name: { type: "string", description: "Field to explore (e.g., 'carrier_name', 'destination_state')" },
        sample_size: { type: "number", description: "Number of top values to return (default: 15)" },
        include_nulls: { type: "boolean", description: "Include null/empty analysis (default: true)" }
      },
      required: ["field_name"]
    }
  },
  {
    name: "preview_aggregation",
    description: `Preview what an aggregation looks like with REAL DATA.
Use this to validate groupings and see actual numbers before adding to report.
Returns: actual aggregated values, group counts, visualization suggestions.`,
    input_schema: {
      type: "object" as const,
      properties: {
        group_by: { type: "string", description: "Field to group by" },
        metric: { type: "string", description: "Field to aggregate" },
        aggregation: { type: "string", enum: ["sum", "avg", "count", "countDistinct", "min", "max"], description: "Aggregation type" },
        secondary_group_by: { type: "string", description: "Optional second grouping field" },
        limit: { type: "number", description: "Max groups to return (default: 15)" },
        sort: { type: "string", enum: ["desc", "asc"], description: "Sort direction" }
      },
      required: ["group_by", "metric", "aggregation"]
    }
  },
  {
    name: "compare_periods",
    description: `Compare a metric across two time periods.
Use for trend analysis, period-over-period comparisons.
Returns: values for both periods, change %, significance assessment.`,
    input_schema: {
      type: "object" as const,
      properties: {
        metric: { type: "string", description: "Metric to compare" },
        aggregation: { type: "string", enum: ["sum", "avg", "count", "countDistinct"], description: "How to aggregate" },
        period1: { type: "string", description: "First period (e.g., 'last30', 'last90')" },
        period2: { type: "string", description: "Second period to compare against" },
        group_by: { type: "string", description: "Optional grouping for breakdown" }
      },
      required: ["metric", "aggregation", "period1", "period2"]
    }
  },
  {
    name: "detect_anomalies",
    description: `Automatically detect anomalies in the data.
Finds spikes, drops, outliers, and unusual patterns using statistical analysis.`,
    input_schema: {
      type: "object" as const,
      properties: {
        metric: { type: "string", description: "Metric to analyze for anomalies" },
        group_by: { type: "string", description: "Optional grouping (e.g., find anomalies per carrier)" },
        sensitivity: { type: "string", enum: ["high", "medium", "low"], description: "Detection sensitivity (high = more anomalies detected)" },
        baseline: { type: "string", enum: ["historical_avg", "previous_period", "peer_group"], description: "What to compare against" }
      },
      required: ["metric"]
    }
  },
  {
    name: "investigate_cause",
    description: `Perform root cause analysis for an observed issue.
Drills down into data across multiple dimensions to find contributing factors.`,
    input_schema: {
      type: "object" as const,
      properties: {
        question: { type: "string", description: "The question to investigate (e.g., 'Why did costs increase?')" },
        metric: { type: "string", description: "Primary metric involved" },
        context: { type: "object", description: "Additional context (filters, time range, etc.)" },
        max_depth: { type: "number", description: "How many dimensions to analyze (default: 3)" }
      },
      required: ["question", "metric"]
    }
  },
  {
    name: "create_report_draft",
    description: `Start a new report draft with metadata.
Call this first before adding sections. Sets up the report structure.`,
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Report title" },
        description: { type: "string", description: "Report description" },
        theme: { type: "string", enum: ["blue", "green", "orange", "purple", "red", "teal", "slate"], description: "Color theme" },
        date_range: { type: "string", enum: ["last7", "last30", "last90", "last6months", "ytd", "lastYear", "all"], description: "Date range preset" }
      },
      required: ["name"]
    }
  },
  {
    name: "add_section",
    description: `Add a section to the report WITH IMMEDIATE DATA PREVIEW.
The section is executed against real data and results are returned.`,
    input_schema: {
      type: "object" as const,
      properties: {
        section_type: { type: "string", enum: ["hero", "stat-row", "chart", "table", "map", "header", "category-grid"], description: "Type of section" },
        title: { type: "string", description: "Section title" },
        config: { type: "object", description: "Section configuration (groupBy, metric, chartType, etc.)" },
        position: { type: "number", description: "Position in report (omit to append)" },
        generate_insight: { type: "boolean", description: "Generate AI insight for this section (default: true)" }
      },
      required: ["section_type", "config"]
    }
  },
  {
    name: "modify_section",
    description: `Modify an existing section and re-preview the results.`,
    input_schema: {
      type: "object" as const,
      properties: {
        section_index: { type: "number", description: "Index of section to modify (0-based)" },
        updates: { type: "object", description: "Properties to update" },
        regenerate_insight: { type: "boolean", description: "Regenerate insight after modification" }
      },
      required: ["section_index", "updates"]
    }
  },
  {
    name: "remove_section",
    description: `Remove a section from the report.`,
    input_schema: {
      type: "object" as const,
      properties: {
        section_index: { type: "number", description: "Index of section to remove (0-based)" }
      },
      required: ["section_index"]
    }
  },
  {
    name: "reorder_sections",
    description: `Reorder sections in the report.`,
    input_schema: {
      type: "object" as const,
      properties: {
        new_order: { type: "array", items: { type: "number" }, description: "Array of section indices in new order" }
      },
      required: ["new_order"]
    }
  },
  {
    name: "preview_report",
    description: `Execute and preview the entire report with real data.
Useful for validating the report before finalizing.`,
    input_schema: {
      type: "object" as const,
      properties: {
        include_insights: { type: "boolean", description: "Generate insights for each section" },
        include_narrative: { type: "boolean", description: "Generate executive narrative" }
      },
      required: []
    }
  },
  {
    name: "finalize_report",
    description: `Finalize the report and mark as ready to save.
Call this when the report is complete and ready for the user.`,
    input_schema: {
      type: "object" as const,
      properties: {
        report: { type: "object", description: "The complete report definition (optional if using draft)" },
        summary: { type: "string", description: "Brief conversational summary for user" },
        generate_narrative: { type: "boolean", description: "Include AI-generated narrative (default: true)" }
      },
      required: ["summary"]
    }
  },
  {
    name: "learn_terminology",
    description: `Record customer-specific terminology for future conversations.
Use when the customer uses terms, abbreviations, or names that have specific meanings.`,
    input_schema: {
      type: "object" as const,
      properties: {
        term: { type: "string", description: "The term/abbreviation used by customer" },
        meaning: { type: "string", description: "What it means" },
        maps_to_field: { type: "string", description: "Database field this relates to" },
        maps_to_filter: { type: "object", description: "Filter to apply when this term is used" },
        confidence: { type: "string", enum: ["high", "medium", "low"], description: "How confident are you in this interpretation?" }
      },
      required: ["term", "meaning", "confidence"]
    }
  },
  {
    name: "learn_preference",
    description: `Record a user preference for future use.
Remember how the user likes things done.`,
    input_schema: {
      type: "object" as const,
      properties: {
        preference_type: { type: "string", enum: ["chart_type", "sort_order", "grouping", "theme", "detail_level", "metric"], description: "Type of preference" },
        key: { type: "string", description: "What the preference is about" },
        value: { type: "string", description: "The preferred value" },
        context: { type: "string", description: "When this preference applies" }
      },
      required: ["preference_type", "key", "value"]
    }
  },
  {
    name: "record_correction",
    description: `Record when user corrects the AI to improve future responses.`,
    input_schema: {
      type: "object" as const,
      properties: {
        original: { type: "string", description: "What AI said/did" },
        corrected: { type: "string", description: "What user wanted" },
        context: { type: "string", description: "Full context of the correction" },
        apply_immediately: { type: "boolean", description: "Apply to current report? (default: true)" }
      },
      required: ["original", "corrected", "context"]
    }
  },
  {
    name: "get_customer_memory",
    description: `Retrieve what we've learned about this customer.
Use at conversation start to personalize responses.`,
    input_schema: {
      type: "object" as const,
      properties: {
        include_terminology: { type: "boolean", description: "Include learned terminology" },
        include_preferences: { type: "boolean", description: "Include preferences" },
        include_history: { type: "boolean", description: "Include recent corrections" }
      },
      required: []
    }
  },
  {
    name: "generate_insight",
    description: `Generate an insight about specific data.
Creates a human-readable insight tailored to the audience.`,
    input_schema: {
      type: "object" as const,
      properties: {
        data: { type: "object", description: "The data to analyze" },
        context: { type: "string", description: "What question this answers" },
        comparison_type: { type: "string", enum: ["period", "peer", "target", "trend", "benchmark"], description: "Type of comparison" },
        audience: { type: "string", enum: ["executive", "analyst", "operations"], description: "Who is this for?" }
      },
      required: ["data", "context"]
    }
  },
  {
    name: "generate_recommendation",
    description: `Generate actionable recommendation from data findings.
Suggests specific actions based on analysis.`,
    input_schema: {
      type: "object" as const,
      properties: {
        finding: { type: "string", description: "The finding that prompts the recommendation" },
        data_support: { type: "object", description: "Data supporting the recommendation" },
        action_type: { type: "string", enum: ["negotiate", "investigate", "monitor", "change", "escalate"], description: "Type of action" },
        urgency: { type: "string", enum: ["immediate", "this_week", "this_month", "next_quarter"], description: "How urgent" }
      },
      required: ["finding", "data_support", "action_type"]
    }
  },
  {
    name: "ask_clarification",
    description: `Ask user for clarification when request is ambiguous.
Don't guess - ask!`,
    input_schema: {
      type: "object" as const,
      properties: {
        question: { type: "string", description: "The clarifying question" },
        options: { type: "array", items: { type: "string" }, description: "Suggested options (if applicable)" },
        context: { type: "string", description: "Why you need this clarification" },
        default_if_no_response: { type: "string", description: "What you'll assume if no response" }
      },
      required: ["question"]
    }
  },
  {
    name: "confirm_understanding",
    description: `Confirm your interpretation before proceeding with complex requests.
Use for multi-step or ambiguous requests.`,
    input_schema: {
      type: "object" as const,
      properties: {
        interpretation: { type: "string", description: "Your interpretation of the request" },
        planned_actions: { type: "array", items: { type: "string" }, description: "What you plan to do" },
        assumptions: { type: "array", items: { type: "string" }, description: "Assumptions you're making" }
      },
      required: ["interpretation"]
    }
  }
];

const CORE_SYSTEM_PROMPT = `You are an expert logistics data analyst for Go Rocket Shipping. You help users build beautiful, insightful reports from their shipment data.

Your approach:
- Be conversational but efficient
- Ask clarifying questions when requests are ambiguous
- Never guess at what fields or terms mean - ask the user
- Provide insights when you notice patterns`;

const INVESTIGATE_SYSTEM_PROMPT = `You are an expert logistics data analyst for Go Rocket Shipping. You help users understand their shipping data through conversational analysis.

## YOUR ROLE IN INVESTIGATE MODE
You answer questions, explore data, find patterns, and provide insights conversationally. You do NOT create reports unless explicitly asked.

## TOOLS TO USE
- **explore_field**: Discover what values exist in a field
- **preview_aggregation**: Get actual numbers for metrics
- **compare_periods**: Compare time periods
- **detect_anomalies**: Find unusual patterns
- **investigate_cause**: Drill into root causes
- **generate_insight**: Create AI-powered insights
- **generate_recommendation**: Provide actionable recommendations

## TOOLS TO AVOID (unless user explicitly asks for a report)
- create_report_draft
- add_section
- modify_section
- finalize_report

## RESPONSE STYLE
- Be conversational and direct
- Lead with the answer, then explain
- Use specific numbers from your tool calls
- Offer follow-up questions or deeper analysis
- If the user wants a report, tell them to switch to "Build Report" mode or say "create a report"

## EXAMPLE
User: "Why is Old Dominion handling 72% of my shipments?"
Good response: "Old Dominion handles 72% of your shipments primarily because... [explanation with data]. Would you like me to analyze cost efficiency by carrier, or explore alternatives?"
Bad response: "I've created a report with 4 sections..." (DON'T DO THIS)
`;

const BUILD_REPORT_SYSTEM_PROMPT = `You are an expert logistics data analyst for Go Rocket Shipping. You help users build beautiful, insightful reports from their shipment data.

## YOUR ROLE IN BUILD REPORT MODE
You create structured reports with sections, charts, and tables. Always start by understanding what the user wants, then build the report incrementally.

## WORKFLOW
1. Clarify what the user wants in their report
2. Call create_report_draft to start
3. Use explore_field and preview_aggregation to understand available data
4. Add sections one at a time with add_section
5. Each section should have real data previewed
6. Ask if user wants modifications or additions
7. Call finalize_report when complete

## TOOLS TO USE
- **explore_field**: Discover available data
- **preview_aggregation**: Get real numbers for sections
- **create_report_draft**: Start a new report
- **add_section**: Add sections with data preview
- **modify_section** / **remove_section**: Edit the report
- **finalize_report**: Complete the report

## RESPONSE STYLE
- Confirm understanding before building
- Show progress as you add sections
- Include data highlights in your messages
- Ask for feedback after adding sections
`;

const ANALYZE_SYSTEM_PROMPT = `You are an expert logistics data analyst for Go Rocket Shipping. You perform deep analysis on shipping data.

## YOUR ROLE IN ANALYZE MODE
You conduct thorough analysis using multiple tools, explore patterns, and provide comprehensive insights. This is for users who want detailed exploration.

## TOOLS TO USE
- All exploration tools (explore_field, preview_aggregation, compare_periods)
- All analysis tools (detect_anomalies, investigate_cause)
- All insight tools (generate_insight, generate_recommendation)

## DO NOT automatically create reports. Focus on analysis and insights.
`;

const REPORT_TOOLS = ['create_report_draft', 'add_section', 'modify_section', 'remove_section', 'reorder_sections', 'preview_report', 'finalize_report'];

const TOOL_BEHAVIOR_PROMPT = `## TOOL USAGE BEHAVIOR

You have powerful tools to help analyze data and build reports. Use them wisely:

### Exploration Tools
- **explore_field**: ALWAYS use before referencing any field. Verifies data exists and shows distribution.
- **preview_aggregation**: Validate groupings with real data before adding to reports.
- **compare_periods**: For trend analysis and period-over-period comparisons.
- **detect_anomalies**: Find unusual patterns, spikes, or outliers automatically.
- **investigate_cause**: Drill down to find root causes of issues.

### Report Building Tools
- **create_report_draft**: Start a new report (call once at beginning).
- **add_section**: Add sections with IMMEDIATE preview of real data.
- **modify_section** / **remove_section** / **reorder_sections**: Edit the report.
- **preview_report**: See the full report with all data populated.
- **finalize_report**: Mark report as complete and ready to save.

### Learning Tools
- **learn_terminology**: When user uses specific terms, save them for future.
- **learn_preference**: Remember how user likes things (chart types, sorting, etc.).
- **record_correction**: When corrected, save it to improve.
- **get_customer_memory**: Check what we know about this customer.

### Insight Tools
- **generate_insight**: Create human-readable insights from data.
- **generate_recommendation**: Suggest specific actions based on findings.

### Clarification Tools
- **ask_clarification**: When request is ambiguous, ASK don't guess.
- **confirm_understanding**: For complex requests, confirm before proceeding.

### Best Practices
1. ALWAYS explore data before building reports
2. Use preview_aggregation to validate numbers look right
3. Learn terminology when users use specific terms
4. For complex requests, confirm understanding first
5. Generate insights to add value beyond raw numbers`;

const REPORT_STRUCTURE = `## REPORT STRUCTURE

When generating via finalize_report:

{
  "name": "Report Title",
  "description": "Brief description",
  "dateRange": { "type": "last90" },
  "theme": "blue",
  "sections": [...]
}

### Section Types
- **hero**: Large metric card
- **stat-row**: Row of 2-4 metrics
- **chart**: bar, line, pie, area, treemap, radar, funnel, heatmap
- **table**: Data table
- **map**: Geographic (choropleth, flow, cluster)

### Chart Config Example
{
  "type": "chart",
  "title": "Revenue by Carrier",
  "config": {
    "chartType": "bar",
    "groupBy": "carrier_name",
    "metric": { "field": "retail", "aggregation": "sum" },
    "sortBy": "value",
    "sortOrder": "desc",
    "limit": 10
  }
}`;

const LEGACY_LEARNING_BEHAVIOR = `## LEARNING FROM CONVERSATIONS

When you learn something new, output:

<learning_flag>
term: CG
user_said: When I say CG, I mean Cargoglide products
ai_understood: CG refers to Cargoglide truck bed products
confidence: high
maps_to_field: description
</learning_flag>`;

const LEGACY_REPORT_STRUCTURE = `## REPORT GENERATION

Respond with a brief message, then the report JSON:

\`\`\`json
{
  "name": "Report Title",
  "description": "Brief description",
  "dateRange": { "type": "last90" },
  "theme": "blue",
  "sections": [...]
}
\`\`\``;

function extractLearnings(prompt: string, response: string, conversationHistory: ConversationMessage[]): LearningExtraction[] {
  const learnings: LearningExtraction[] = [];
  const seenKeys = new Set<string>();

  const flagMatch = response.match(/<learning_flag>([\s\S]*?)<\/learning_flag>/);
  if (flagMatch) {
    const lines: Record<string, string> = {};
    for (const line of flagMatch[1].trim().split("\n")) {
      const idx = line.indexOf(":");
      if (idx > 0) lines[line.substring(0, idx).trim().toLowerCase()] = line.substring(idx + 1).trim();
    }

    if (lines.term) {
      const key = lines.term.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      if (key.length >= 2) {
        seenKeys.add(key);
        learnings.push({
          type: lines.suggested_category === "product" ? "product" : "terminology",
          key, value: lines.ai_understood || lines.user_said || lines.term,
          confidence: lines.confidence === "high" ? 0.9 : lines.confidence === "low" ? 0.5 : 0.7,
          source: "inferred",
        });
      }
    }
  }

  return learnings;
}

async function saveLearnings(supabase: SupabaseClient, customerId: string, learnings: LearningExtraction[]): Promise<void> {
  for (const learning of learnings) {
    try {
      await supabase.from("ai_knowledge").upsert({
        knowledge_type: learning.type === "terminology" ? "term" : "product",
        key: learning.key, label: learning.value, definition: learning.value,
        scope: "customer", customer_id: customerId,
        source: learning.source === "explicit" ? "learned" : "inferred",
        confidence: learning.confidence, needs_review: learning.confidence < 0.8,
        is_active: learning.confidence >= 0.8,
      }, { onConflict: "knowledge_type,key,scope,customer_id" });
    } catch (e) {
      console.error("Failed to save learning:", e);
    }
  }
}

const VALID_SECTION_TYPES = ["hero", "stat-row", "category-grid", "chart", "table", "header", "map"];

function validateReportOutput(report: any, availableFields: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!report.name) errors.push("Report must have a name");
  if (!report.sections || !Array.isArray(report.sections)) {
    errors.push("Report must have sections array");
    return { valid: false, errors };
  }

  for (let i = 0; i < report.sections.length; i++) {
    const section = report.sections[i];
    if (!section.type || !VALID_SECTION_TYPES.includes(section.type)) {
      errors.push(`Section ${i + 1}: Invalid type "${section.type}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function sanitizeReport(report: any, isAdmin: boolean): any {
  if (isAdmin) return report;
  const sanitized = JSON.parse(JSON.stringify(report));

  if (sanitized.sections) {
    sanitized.sections = sanitized.sections.filter((section: any) => {
      const str = JSON.stringify(section).toLowerCase();
      return findRestrictedFieldsInString(str).length === 0;
    });
  }
  return sanitized;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();
  let supabase: SupabaseClient | undefined;
  let userId: string | undefined;
  let userEmail: string | undefined;
  let customerId: string | undefined;
  let customerName: string | undefined;
  let isAdmin = false;

  try {
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body: RequestBody = await req.json();

    const MAX_PROMPT_LENGTH = 10000;
    const MAX_CONVERSATION_MESSAGES = 50;
    const MAX_MESSAGE_LENGTH = 5000;

    if (!body.prompt || typeof body.prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'invalid_input', message: 'Prompt is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.prompt.length > MAX_PROMPT_LENGTH) {
      return new Response(
        JSON.stringify({ error: 'invalid_input', message: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.conversationHistory) {
      if (!Array.isArray(body.conversationHistory)) {
        return new Response(
          JSON.stringify({ error: 'invalid_input', message: 'Conversation history must be an array' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (body.conversationHistory.length > MAX_CONVERSATION_MESSAGES) {
        return new Response(
          JSON.stringify({ error: 'invalid_input', message: `Conversation history exceeds maximum of ${MAX_CONVERSATION_MESSAGES} messages` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      for (const msg of body.conversationHistory) {
        if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
          return new Response(
            JSON.stringify({ error: 'invalid_input', message: 'Invalid message role in conversation history' }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (typeof msg.content !== 'string' || msg.content.length > MAX_MESSAGE_LENGTH) {
          return new Response(
            JSON.stringify({ error: 'invalid_input', message: 'Invalid or too long message content in conversation history' }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    if (body.customerId && !/^\d+$/.test(body.customerId)) {
      return new Response(
        JSON.stringify({ error: 'invalid_input', message: 'Invalid customer ID format - must be numeric' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { prompt, conversationHistory, knowledgeContext, currentReport, useTools = true, sessionId } = body;
    customerId = body.customerId;
    customerName = body.customerName;
    const requestMode = body.mode || 'investigate';

    userId = body.userId;
    userEmail = body.userEmail;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (userId) {
      isAdmin = await verifyAdminRole(supabase, userId);
    }

    if (userId) {
      const rateLimitService = new RateLimitService(supabase);
      const rateLimitResult = await rateLimitService.checkLimit(userId);

      if (!rateLimitResult.allowed) {
        console.log(`[AI] Rate limit exceeded for user ${userId}`);
        return new Response(
          JSON.stringify(createRateLimitResponse(rateLimitResult)),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (customerId) {
        const { data: aiEnabled } = await supabase.rpc('is_ai_enabled_for_customer', {
          p_customer_id: parseInt(customerId, 10)
        });

        if (aiEnabled === false) {
          console.log(`[AI] AI disabled for customer ${customerId}`);
          return new Response(
            JSON.stringify({
              error: 'ai_disabled',
              message: 'AI features are not enabled for this account. Please contact your administrator.',
              report: null,
              toolExecutions: []
            }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      let dailyCap = 5.00;
      if (customerId) {
        const { data: capData } = await supabase.rpc('get_customer_daily_cap', {
          p_customer_id: parseInt(customerId, 10)
        });
        if (capData !== null) {
          dailyCap = capData;
        }
      }

      const { data: budgetCheck, error: budgetError } = await supabase.rpc('check_user_daily_budget', {
        p_user_id: userId,
        p_cap: dailyCap
      });

      if (!budgetError && budgetCheck && !budgetCheck.allowed) {
        console.log(`[AI] Daily budget exceeded for user ${userId}: ${budgetCheck.spent_today} / ${dailyCap}`);
        return new Response(
          JSON.stringify({
            error: 'daily_budget_exceeded',
            message: budgetCheck.message,
            report: null,
            toolExecutions: [],
            usage: {
              spentToday: budgetCheck.spent_today,
              dailyCap: budgetCheck.daily_cap
            }
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await rateLimitService.recordRequest(userId, customerId);
    }

    console.log(`[AI] User: ${userEmail || userId || 'unknown'}, Customer: ${customerId}, Admin: ${isAdmin}, Tools: ${useTools}, Mode: ${requestMode}`);

    const contextService = new ContextService(supabase);
    const context = await contextService.compileContext(customerId, isAdmin);
    const { schemaFields, dataProfile, fieldNames, availableFieldNames, terms, products, customerProfile: profile, prompts } = context;
    const { schema: schemaPrompt, knowledge: knowledgePrompt, profile: profilePrompt, access: accessPrompt } = prompts;

    const semanticKnowledge = await getRelevantKnowledge(supabase, prompt, customerId, 5);

    const toolExecutor = new ToolExecutor(supabase, customerId, isAdmin, availableFieldNames);

    let modeSystemPrompt: string;
    switch (requestMode) {
      case 'build':
        modeSystemPrompt = BUILD_REPORT_SYSTEM_PROMPT;
        break;
      case 'analyze':
        modeSystemPrompt = ANALYZE_SYSTEM_PROMPT;
        break;
      case 'investigate':
      default:
        modeSystemPrompt = INVESTIGATE_SYSTEM_PROMPT;
        break;
    }

    const availableTools = AI_TOOLS;

    const systemPromptParts = useTools
      ? [modeSystemPrompt, TOOL_BEHAVIOR_PROMPT, accessPrompt, schemaPrompt, knowledgePrompt, profilePrompt, semanticKnowledge, REPORT_STRUCTURE]
      : [CORE_SYSTEM_PROMPT, accessPrompt, schemaPrompt, knowledgePrompt, profilePrompt, semanticKnowledge, LEGACY_LEARNING_BEHAVIOR, LEGACY_REPORT_STRUCTURE];

    let fullSystemPrompt = systemPromptParts.filter(Boolean).join("\n\n");
    if (customerName) fullSystemPrompt += `\n\n## CURRENT CUSTOMER\nYou are helping: **${customerName}**`;
    if (knowledgeContext) fullSystemPrompt += `\n\n${knowledgeContext}`;
    if (currentReport) fullSystemPrompt += `\n\n## CURRENT REPORT (EDITING)\n\`\`\`json\n${JSON.stringify(currentReport, null, 2)}\n\`\`\``;

    const summarizationResult = await maybeSummarizeConversation(conversationHistory);

    if (summarizationResult.summarized) {
      console.log(`[AI] Summarized conversation: ${summarizationResult.originalCount} -> ${summarizationResult.newCount} messages, saved ${summarizationResult.tokensSaved} tokens`);
    }

    const messages: Anthropic.MessageParam[] = [
      ...summarizationResult.messages.map(msg => ({ role: msg.role, content: msg.content })),
      { role: "user", content: prompt }
    ];

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    const circuitBreaker = getClaudeCircuitBreaker();
    if (!circuitBreaker.canExecute()) {
      console.log('[AI] Circuit breaker OPEN - failing fast');
      return new Response(
        JSON.stringify(createCircuitOpenResponse(circuitBreaker.getTimeUntilRetry())),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (useTools) {
      const toolExecutions: ToolExecution[] = [];
      const learnings: LearningExtraction[] = [];
      let finalReport: Record<string, unknown> | null = null;
      let finalMessage = "";
      let needsClarification = false;
      let clarificationQuestion = "";
      let clarificationOptions: string[] | undefined;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      const MAX_TURNS = 10;
      const budgetService = new TokenBudgetService();
      let currentMessages = [...messages];

      for (let turn = 0; turn < MAX_TURNS; turn++) {
        const budgetCheck = budgetService.canProceed();
        if (!budgetCheck.allowed) {
          console.log(`[AI] Budget exhausted: ${budgetCheck.reason}`);
          finalMessage = budgetService.getStatusMessage();
          break;
        }

        console.log(`[AI] Turn ${turn + 1}/${MAX_TURNS}`);

        let response;
        try {
          response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 8192,
            system: fullSystemPrompt,
            messages: currentMessages,
            tools: availableTools,
            tool_choice: { type: "auto" }
          });
          circuitBreaker.recordSuccess();
        } catch (apiError) {
          circuitBreaker.recordFailure(apiError instanceof Error ? apiError : new Error(String(apiError)));
          throw apiError;
        }

        totalInputTokens += response.usage.input_tokens;
        totalOutputTokens += response.usage.output_tokens;
        budgetService.recordUsage(response.usage.input_tokens, response.usage.output_tokens);

        if (response.stop_reason === "end_turn") {
          const textBlock = response.content.find(c => c.type === "text");
          if (textBlock && textBlock.type === "text") finalMessage = textBlock.text;
          break;
        }

        const toolUseBlocks = response.content.filter(c => c.type === "tool_use");
        if (toolUseBlocks.length === 0) {
          const textBlock = response.content.find(c => c.type === "text");
          if (textBlock && textBlock.type === "text") finalMessage = textBlock.text;
          break;
        }

        currentMessages.push({ role: "assistant", content: response.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const toolUse of toolUseBlocks) {
          if (toolUse.type !== "tool_use") continue;

          console.log(`[AI] Tool: ${toolUse.name}`);

          const execution = await toolExecutor.execute(toolUse.name, toolUse.input as Record<string, unknown>);
          const result = execution.result;

          if (toolUse.name === 'emit_learning' && (result as any).learning) {
            learnings.push((result as any).learning);
          } else if (toolUse.name === 'finalize_report') {
            const finalized = result as { report: Record<string, unknown>; summary: string; validation: { valid: boolean } };
            if (finalized.validation.valid) {
              finalReport = finalized.report;
              finalMessage = finalized.summary;
            }
          } else if (toolUse.name === 'ask_clarification') {
            needsClarification = true;
            clarificationQuestion = (toolUse.input as any).question;
            clarificationOptions = (toolUse.input as any).options;
          } else if (toolUse.name === 'confirm_understanding') {
            needsClarification = true;
            const interpretation = (toolUse.input as any).interpretation;
            const plannedActions = (toolUse.input as any).planned_actions || [];
            const assumptions = (toolUse.input as any).assumptions || [];
            clarificationQuestion = `I understand you want to: ${interpretation}`;
            if (plannedActions.length > 0) {
              clarificationQuestion += `\n\nI plan to:\n${plannedActions.map((a: string, i: number) => `${i + 1}. ${a}`).join('\n')}`;
            }
            if (assumptions.length > 0) {
              clarificationQuestion += `\n\nAssumptions:\n${assumptions.map((a: string, i: number) => `- ${a}`).join('\n')}`;
            }
            clarificationQuestion += `\n\nIs this correct? (Reply "yes" to proceed or provide corrections)`;
          }

          toolExecutions.push(execution);

          toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(result) });
        }

        if (finalReport || needsClarification) break;
        currentMessages.push({ role: "user", content: toolResults });
      }

      if (!finalMessage && toolExecutions.length > 0) {
        const reportDraft = toolExecutions.find(t => t.toolName === 'create_report_draft');
        const addedSections = toolExecutions.filter(t => t.toolName === 'add_section');

        if (reportDraft || addedSections.length > 0) {
          const reportName = (reportDraft?.result as any)?.name || 'Your report';
          const sectionDescriptions = addedSections.map(s => {
            const result = s.result as any;
            return `- **${result.title || result.type}**${result.insight ? `: ${result.insight}` : ''}`;
          });

          finalMessage = `I've created **${reportName}** with ${addedSections.length} sections:\n\n${sectionDescriptions.join('\n')}\n\nWould you like me to modify any sections or add more?`;

          if (!finalReport && toolExecutor.getCurrentReport()) {
            finalReport = toolExecutor.getCurrentReport();
          }
        } else {
          const toolNames = [...new Set(toolExecutions.map(t => t.toolName))];
          finalMessage = `Analysis complete. I used ${toolExecutions.length} tool calls (${toolNames.join(', ')}).`;
        }
      }

      const latencyMs = Date.now() - startTime;

      if (userId) {
        await logUsage(supabase, {
          userId,
          userEmail,
          customerId: isAdmin ? undefined : customerId,
          customerName: isAdmin ? undefined : customerName,
          requestType: 'report',
          sessionId,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          latencyMs,
          toolTurns: toolExecutions.length,
          status: 'success'
        });
      }

      try {
        await supabase.from("ai_report_audit").insert({
          customer_id: parseInt(customerId, 10),
          user_request: prompt,
          ai_interpretation: finalMessage.slice(0, 5000),
          report_definition: finalReport,
          status: !!finalReport ? 'success' : 'pending',
          context_used: { 
            toolMode: true, 
            toolExecutions: toolExecutions.length, 
            learnings: learnings.length,
            tokens: { input: totalInputTokens, output: totalOutputTokens },
            latencyMs,
            userId,
            userEmail
          },
        });
      } catch (e) { console.error("Audit error:", e); }

      const messageToValidate = needsClarification ? clarificationQuestion : finalMessage;
      const messageValidation = processAIResponse(
        messageToValidate,
        isAdmin,
        { logViolations: true }
      );

      const inputCost = totalInputTokens * 0.000003;
      const outputCost = totalOutputTokens * 0.000015;
      const totalCost = inputCost + outputCost;

      return new Response(JSON.stringify({
        report: finalReport,
        message: messageValidation.message,
        toolExecutions,
        learnings: learnings.length > 0 ? learnings : undefined,
        needsClarification,
        clarificationOptions,
        summarized: summarizationResult.summarized,
        tokensSaved: summarizationResult.tokensSaved,
        outputValidation: messageValidation.wasModified ? {
          wasModified: true,
          severity: messageValidation.validation.severity,
          warnings: messageValidation.validation.warnings
        } : undefined,
        usage: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          totalTokens: totalInputTokens + totalOutputTokens,
          inputCostUsd: inputCost,
          outputCostUsd: outputCost,
          totalCostUsd: totalCost,
          latencyMs
        }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let response;
    try {
      response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: fullSystemPrompt,
        messages,
      });
      circuitBreaker.recordSuccess();
    } catch (apiError) {
      circuitBreaker.recordFailure(apiError instanceof Error ? apiError : new Error(String(apiError)));
      throw apiError;
    }

    const latencyMs = Date.now() - startTime;
    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") throw new Error("No text response");

    const responseText = textContent.text;

    let jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    let jsonStr = jsonMatch ? jsonMatch[1] : "";
    if (!jsonMatch) {
      const braceMatch = responseText.match(/\{[\s\S]*"name"[\s\S]*"sections"[\s\S]*\}/);
      if (braceMatch) jsonStr = braceMatch[0];
    }

    let parsedReport = null;
    if (jsonStr) {
      try {
        parsedReport = JSON.parse(jsonStr);
        if (!parsedReport.id) parsedReport.id = crypto.randomUUID();
        if (!parsedReport.createdAt) parsedReport.createdAt = new Date().toISOString();
        parsedReport.customerId = customerId;
        parsedReport = sanitizeReport(parsedReport, isAdmin);
      } catch (e) {
        console.error("JSON parse error:", e);
      }
    }

    const learnings = extractLearnings(prompt, responseText, conversationHistory);
    if (learnings.length > 0) await saveLearnings(supabase, customerId, learnings);

    if (userId) {
      await logUsage(supabase, {
        userId,
        userEmail,
        customerId: isAdmin ? undefined : customerId,
        customerName: isAdmin ? undefined : customerName,
        requestType: 'report',
        sessionId,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        latencyMs,
        toolTurns: 0,
        status: 'success'
      });
    }

    try {
      await supabase.from("ai_report_audit").insert({
        customer_id: parseInt(customerId, 10),
        user_request: prompt,
        ai_interpretation: responseText.slice(0, 5000),
        report_definition: parsedReport,
        status: !!parsedReport ? 'success' : 'pending',
        context_used: { 
          toolMode: false, 
          termsCount: terms.length,
          tokens: { input: response.usage.input_tokens, output: response.usage.output_tokens },
          latencyMs,
          userId,
          userEmail
        },
      });
    } catch (e) { console.error("Audit error:", e); }

    const cleanMessage = responseText
      .replace(/```json[\s\S]*?```/g, "")
      .replace(/<learning_flag>[\s\S]*?<\/learning_flag>/g, "")
      .trim();

    const messageToValidate = cleanMessage || (parsedReport ? "Report generated" : responseText);
    const messageValidation = processAIResponse(
      messageToValidate,
      isAdmin,
      { logViolations: true }
    );

    const inputCost = response.usage.input_tokens * 0.000003;
    const outputCost = response.usage.output_tokens * 0.000015;
    const totalCost = inputCost + outputCost;

    return new Response(JSON.stringify({
      report: parsedReport,
      message: messageValidation.message,
      learnings: learnings.length > 0 ? learnings : undefined,
      toolExecutions: [],
      summarized: summarizationResult.summarized,
      tokensSaved: summarizationResult.tokensSaved,
      outputValidation: messageValidation.wasModified ? {
        wasModified: true,
        severity: messageValidation.validation.severity,
        warnings: messageValidation.validation.warnings
      } : undefined,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        inputCostUsd: inputCost,
        outputCostUsd: outputCost,
        totalCostUsd: totalCost,
        latencyMs
      }
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Error:", error);
    
    const latencyMs = Date.now() - startTime;
    
    if (supabase && userId) {
      await logUsage(supabase, {
        userId,
        userEmail,
        customerId: isAdmin ? undefined : customerId,
        customerName: isAdmin ? undefined : customerName,
        requestType: 'report',
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
      report: null,
      message: "Sorry, I encountered an error.",
      toolExecutions: [],
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});