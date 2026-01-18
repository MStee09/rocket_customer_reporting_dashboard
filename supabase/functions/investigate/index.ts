// ============================================================================
// UNIFIED AI INVESTIGATE EDGE FUNCTION v2.8
// Phase 1: Context Compiler + Mode Router + Compile Mode
// v2.1: Fixed generateVisualization for stat cards vs bar charts
// v2.2: Polished visualization titles, labels, and formatting
// v2.3: Optimized system prompt to reduce tool calls
// v2.4: Smart model routing (Haiku/Sonnet) + parallel tool execution
// v2.5: Fixed MCP function calls to use correct names (mcp_discover_tables)
//       Added shipment_mode and equipment_type to known schema
// v2.6: Fixed duplicate visualizations - skip ID fields when name fields exist
//       Prevents "Equipment Type Id by Equipment Type Id" charts
// v2.7: Skip visualizations for lookup tables (shipment_mode, equipment_type)
//       They show ALL values, not customer-specific data
// v2.8: mcp_aggregate now AUTO-RESOLVES IDs to names (mode_id → "LTL")
//       Returns 'label' key with human-readable names automatically
//       No manual joins needed for simple breakdowns
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ============================================================================
// MODELS - v2.4
// ============================================================================

const MODELS = {
  HAIKU: "claude-haiku-4-5-20251001",
  SONNET: "claude-sonnet-4-20250514"
} as const;

type ModelType = typeof MODELS[keyof typeof MODELS];

// ============================================================================
// TYPES
// ============================================================================

type Mode = 'question' | 'widget' | 'report' | 'analyze' | 'compile';

interface RequestBody {
  question: string;
  customerId: string;
  userId: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  preferences?: {
    mode?: Mode;
    showReasoning?: boolean;
    forceMode?: 'quick' | 'deep' | 'visual';
    maxTokens?: number;
  };
  context?: {
    availableFields?: Array<{ name: string; type: string; description?: string }>;
    widgetType?: string;
  };
}

interface ReasoningStep {
  type: 'routing' | 'thinking' | 'tool_call' | 'tool_result' | 'context' | 'model';
  content: string;
  toolName?: string;
}

interface Visualization {
  id: string;
  type: 'bar' | 'pie' | 'line' | 'area' | 'stat' | 'treemap' | 'table';
  title: string;
  subtitle?: string;
  data: unknown;
  config?: Record<string, unknown>;
}

// ============================================================================
// SMART MODEL ROUTER - v2.4
// Conservative approach: only use Haiku for patterns we're confident about
// ============================================================================

interface ModelSelection {
  model: ModelType;
  reason: string;
  confidence: number;
}

function selectModel(question: string, mode: Mode): ModelSelection {
  const q = question.toLowerCase().trim();

  if (mode === 'analyze' || mode === 'report') {
    return {
      model: MODELS.SONNET,
      reason: 'Complex mode requires Sonnet',
      confidence: 1.0
    };
  }

  const complexPatterns = [
    /why\s/i,
    /compare|versus|vs\.?|compared to/i,
    /explain|analyze|investigate/i,
    /trend|pattern|change over/i,
    /recommend|suggest|should\s+i/i,
    /best|worst|most|least/i,
    /what.*if|how.*would/i,
    /correlat|relationship|impact/i,
    /unusual|anomal|outlier|strange/i,
    /multiple|several|various|all/i,
  ];

  for (const pattern of complexPatterns) {
    if (pattern.test(q)) {
      return {
        model: MODELS.SONNET,
        reason: `Complex pattern detected: ${pattern.source}`,
        confidence: 0.9
      };
    }
  }

  const simplePatterns = [
    {
      pattern: /^(what('?s| is| are)?|show( me)?|get( me)?|give( me)?)\s+(my\s+)?(total|overall)\s+(spend|cost|retail|shipment|revenue)/i,
      reason: 'Simple total aggregation'
    },
    {
      pattern: /^how many\s+(shipment|load|order|delivery|pickup)/i,
      reason: 'Simple count query'
    },
    {
      pattern: /^(what('?s| is)?|show( me)?)\s+(my\s+)?(average|avg|mean)\s+(spend|cost|retail|shipment)/i,
      reason: 'Simple average query'
    },
    {
      pattern: /^(spend|cost|shipment|revenue|retail)\s+by\s+(carrier|state|month|week|city|mode)/i,
      reason: 'Simple group-by query'
    },
    {
      pattern: /^(what('?s| is)?|show( me)?)\s+(my\s+)?(spend|cost|shipment).*(by|per|grouped by)\s+(carrier|state|month|mode)/i,
      reason: 'Simple breakdown query'
    },
    {
      pattern: /^(show|get|list|what are)\s+(my\s+)?(top|biggest|largest)\s+\d*\s*(lane|route|carrier|state|customer)/i,
      reason: 'Simple top-N query'
    },
    {
      pattern: /^(what('?s| is)?|show)\s+(the\s+)?(total|sum)\s+/i,
      reason: 'Simple sum query'
    },
    {
      pattern: /by\s+mode|by\s+equipment/i,
      reason: 'Simple mode/equipment breakdown'
    },
  ];

  for (const { pattern, reason } of simplePatterns) {
    if (pattern.test(q)) {
      return {
        model: MODELS.HAIKU,
        reason,
        confidence: 0.95
      };
    }
  }

  return {
    model: MODELS.SONNET,
    reason: 'Default to Sonnet for unrecognized patterns',
    confidence: 0.7
  };
}

// ============================================================================
// RESTRICTED FIELDS (inline service)
// ============================================================================

const RESTRICTED_FIELDS = [
  'cost', 'cost_amount', 'cost_per_mile', 'margin', 'margin_percent',
  'profit', 'markup', 'carrier_cost', 'carrier_pay', 'carrier_rate',
  'target_rate', 'buy_rate', 'net_revenue', 'commission'
];

function getAccessControlPrompt(isAdmin: boolean): string {
  if (isAdmin) {
    return `## ACCESS LEVEL: ADMIN
You have full access to all fields including cost, margin, carrier_cost, profit, commission.`;
  }
  return `## ACCESS LEVEL: CUSTOMER
RESTRICTED FIELDS (DO NOT USE): cost, margin, carrier_cost, profit, commission
When customers say "cost" or "spend", they mean **retail** (what they pay for shipping).`;
}

// ============================================================================
// CONTEXT COMPILER (inline service)
// ============================================================================

interface KnowledgeItem {
  id: number; type: string; key: string; label?: string;
  definition: string; ai_instructions?: string;
  metadata?: Record<string, unknown>; times_used: number;
}

interface CustomerProfile {
  priorities?: string[]; products?: Array<{ name: string; keywords: string[] }>;
  key_markets?: string[]; terminology?: Array<{ term: string; means: string }>;
  account_notes?: string;
}

interface AIContext {
  global_knowledge: KnowledgeItem[];
  customer_knowledge: KnowledgeItem[];
  global_documents: Array<{ id: number; title: string; content: string }>;
  customer_documents: Array<{ id: number; title: string; content: string }>;
  customer_profile: CustomerProfile;
}

// ============================================================================
// OPTIMIZED SYSTEM PROMPT - v2.5
// Added shipment_mode and equipment_type to known schema
// ============================================================================

const HARDCODED_SYSTEM_PROMPT = `You are an expert logistics data analyst for Go Rocket Shipping.

## CRITICAL: MINIMIZE TOOL CALLS

For common questions, query DIRECTLY using the known schema below. Do NOT call discover_tables or discover_fields for standard queries.

### KNOWN SCHEMA (use directly, no discovery needed)

**shipment table** (main table):
- retail (decimal) - customer's cost/spend/price
- cost (decimal) - carrier cost (ADMIN ONLY)
- margin (decimal) - profit margin (ADMIN ONLY)
- miles, total_weight, total_pieces (numeric)
- pickup_date, delivery_date, created_date (dates)
- origin_city, origin_state, origin_zip
- dest_city, dest_state, dest_zip
- customer_id, load_id
- mode_id (integer) - FK to shipment_mode table
- equipment_type_id (integer) - FK to equipment_type table

**shipment_mode table** (lookup for shipping modes):
- mode_id (PK), mode_name, mode_code
- Values: LTL, Truckload, Parcel, Intermodal, Ocean, Air, Rail, etc.

**equipment_type table** (lookup for equipment):
- equipment_type_id (PK), equipment_name, equipment_code
- Values: Van/Dry Van, Reefer, Flatbed, Step Deck, Container, etc.

**carrier table** (join via shipment_carrier):
- carrier_id, carrier_name, scac_code

**shipment_carrier table** (bridge table):
- load_id, carrier_id

**shipment_report_view** (pre-joined view - USE FOR COMPLEX QUERIES):
- Has ALL shipment fields PLUS: mode_name, equipment_name, carrier_name, origin/dest addresses
- Best choice when you need multiple lookups already joined

### ONE-CALL PATTERNS (use these directly!)

| Question | Tool | Parameters |
|----------|------|------------|
| "Total spend" | query_table | table: shipment, aggregations: [{function: SUM, field: retail, alias: total_spend}] |
| "How many shipments" | query_table | table: shipment, aggregations: [{function: COUNT, field: *, alias: count}] |
| "Average cost" | query_table | table: shipment, aggregations: [{function: AVG, field: retail, alias: avg_cost}] |
| "Spend by state" | aggregate | table: shipment, group_by: dest_state, metric: retail, aggregation: sum |
| "Spend by carrier" | query_with_join | base: shipment, joins: [shipment_carrier, carrier], select: [carrier.carrier_name], group_by: [carrier.carrier_name], aggregations: [{function: SUM, field: retail, alias: total_spend}] |
| "Spend by mode" | query_with_join | base: shipment, joins: [shipment_mode], select: [shipment_mode.mode_name], group_by: [shipment_mode.mode_name], aggregations: [{function: SUM, field: retail, alias: total_spend}] |
| "Spend by equipment" | query_with_join | base: shipment, joins: [equipment_type], select: [equipment_type.equipment_name], group_by: [equipment_type.equipment_name], aggregations: [{function: SUM, field: retail, alias: total_spend}] |
| "Top lanes" | get_lanes | limit: 10 |

### JOIN PATHS (IMPORTANT!)

**CRITICAL: Always include 'select' with dimension fields to get labels in results!**

**For carrier names:**
shipment.load_id → shipment_carrier.load_id → carrier.carrier_id
\`\`\`
query_with_join({
  base_table: "shipment",
  joins: [{"table": "shipment_carrier"}, {"table": "carrier"}],
  select: ["carrier.carrier_name"],
  group_by: ["carrier.carrier_name"],
  aggregations: [{"function": "SUM", "field": "retail", "alias": "total_spend"}, {"function": "COUNT", "field": "*", "alias": "shipment_count"}]
})
\`\`\`

**For mode names:**
shipment.mode_id → shipment_mode.mode_id
\`\`\`
query_with_join({
  base_table: "shipment",
  joins: [{"table": "shipment_mode"}],
  select: ["shipment_mode.mode_name"],
  group_by: ["shipment_mode.mode_name"],
  aggregations: [{"function": "SUM", "field": "retail", "alias": "total_spend"}, {"function": "COUNT", "field": "*", "alias": "shipment_count"}]
})
\`\`\`

**For equipment names:**
shipment.equipment_type_id → equipment_type.equipment_type_id
\`\`\`
query_with_join({
  base_table: "shipment",
  joins: [{"table": "equipment_type"}],
  select: ["equipment_type.equipment_name"],
  group_by: ["equipment_type.equipment_name"],
  aggregations: [{"function": "SUM", "field": "retail", "alias": "total_spend"}, {"function": "COUNT", "field": "*", "alias": "shipment_count"}]
})
\`\`\`

### WHEN TO USE DISCOVERY (only these cases)

- Unknown product names → search_text first
- User mentions unfamiliar table → discover_tables
- Need field details for complex filtering → discover_fields
- Complex multi-table joins → discover_joins

### RESPONSE STYLE
- Lead with the DIRECT answer and specific numbers
- Be concise
- Suggest 1-2 follow-up questions`;

async function compileContext(
  supabase: SupabaseClient,
  customerId: string,
  isAdmin: boolean
): Promise<{ systemPrompt: string; knowledgeIds: number[]; tokenEstimate: number }> {
  const customerIdInt = parseInt(customerId, 10);

  try {
    const { data, error } = await supabase.rpc('get_ai_context', {
      p_customer_id: customerIdInt,
      p_is_admin: isAdmin
    });

    if (error || !data) {
      console.error('[Context] Error:', error);
      const minPrompt = `${HARDCODED_SYSTEM_PROMPT}\n\n${getAccessControlPrompt(isAdmin)}`;
      return { systemPrompt: minPrompt, knowledgeIds: [], tokenEstimate: Math.ceil(minPrompt.length / 4) };
    }

    const ctx = data as AIContext;
    const sections: string[] = [HARDCODED_SYSTEM_PROMPT, getAccessControlPrompt(isAdmin)];
    const knowledgeIds: number[] = [];

    if (ctx.global_knowledge?.length > 0) {
      let kSection = '## BUSINESS KNOWLEDGE\n';
      const terms = ctx.global_knowledge.filter(k => k.type === 'term');
      const products = ctx.global_knowledge.filter(k => k.type === 'product');
      const fields = ctx.global_knowledge.filter(k => k.type === 'field');

      if (terms.length > 0) {
        kSection += '\n### Terms\n';
        for (const t of terms) {
          kSection += `- **${t.label || t.key}**: ${t.definition}`;
          if (t.ai_instructions) kSection += ` (${t.ai_instructions})`;
          kSection += '\n';
        }
      }

      if (products.length > 0) {
        kSection += '\n### Products\n';
        for (const p of products) {
          const keywords = p.metadata?.keywords || [p.key];
          kSection += `- **${p.label || p.key}**: Search for "${Array.isArray(keywords) ? keywords.join('", "') : keywords}"\n`;
        }
      }

      if (fields.length > 0) {
        kSection += '\n### Field Definitions\n';
        for (const f of fields) {
          kSection += `- **${f.label || f.key}**: ${f.definition}`;
          if (f.ai_instructions) kSection += ` → ${f.ai_instructions}`;
          kSection += '\n';
        }
      }

      sections.push(kSection);
      knowledgeIds.push(...ctx.global_knowledge.map(k => k.id));
    }

    if (ctx.customer_knowledge?.length > 0) {
      let cSection = '## CUSTOMER-SPECIFIC TERMS\n';
      for (const k of ctx.customer_knowledge) {
        cSection += `- **${k.label || k.key}**: ${k.definition}\n`;
      }
      sections.push(cSection);
      knowledgeIds.push(...ctx.customer_knowledge.map(k => k.id));
    }

    if (ctx.global_documents?.length > 0) {
      let dSection = '## REFERENCE DOCUMENTS\n';
      for (const d of ctx.global_documents) {
        dSection += `\n### ${d.title}\n${d.content}\n`;
      }
      sections.push(dSection);
    }

    if (ctx.customer_profile && Object.keys(ctx.customer_profile).length > 0) {
      const p = ctx.customer_profile;
      const parts: string[] = [];
      if (p.priorities?.length) parts.push(`**Priorities**: ${p.priorities.join(', ')}`);
      if (p.key_markets?.length) parts.push(`**Markets**: ${p.key_markets.join(', ')}`);
      if (p.terminology?.length) {
        const terms = p.terminology.map(t => `"${t.term}" = ${t.means}`).join(', ');
        parts.push(`**Terms**: ${terms}`);
      }
      if (p.account_notes) parts.push(`**Notes**: ${p.account_notes}`);
      if (parts.length > 0) {
        sections.push(`## CUSTOMER CONTEXT\n\n${parts.join('\n')}`);
      }
    }

    const fullPrompt = sections.join('\n\n');
    return {
      systemPrompt: fullPrompt,
      knowledgeIds,
      tokenEstimate: Math.ceil(fullPrompt.length / 4)
    };
  } catch (e) {
    console.error('[Context] Exception:', e);
    const minPrompt = `${HARDCODED_SYSTEM_PROMPT}\n\n${getAccessControlPrompt(isAdmin)}`;
    return { systemPrompt: minPrompt, knowledgeIds: [], tokenEstimate: Math.ceil(minPrompt.length / 4) };
  }
}

// ============================================================================
// COMPILE MODE (inline service)
// ============================================================================

interface CompiledFilter {
  field: string;
  operator: string;
  value: unknown;
}

interface CompileResult {
  success: boolean;
  compiledRule?: { filters: CompiledFilter[]; sort?: { field: string; direction: string }; limit?: number };
  reasoning?: string;
  confidence?: number;
  suggestions?: string[];
  error?: string;
}

const COMPILE_SYSTEM_PROMPT = `You are a filter compilation assistant. Convert natural language descriptions into structured filter rules.

## OUTPUT FORMAT
Respond with ONLY valid JSON:
{
  "compiledRule": {
    "filters": [{ "field": "field_name", "operator": "operator", "value": "value" }],
    "sort": { "field": "field_name", "direction": "asc|desc" },
    "limit": number
  },
  "reasoning": "Brief explanation",
  "confidence": 0.0-1.0,
  "suggestions": []
}

## OPERATORS
eq, neq, gt, gte, lt, lte, in, not_in, contains, between, is_null, is_not_null

## GEOGRAPHIC REGIONS
- "west coast" = ["CA", "OR", "WA", "NV", "AZ"]
- "east coast" = ["NY", "NJ", "PA", "MA", "CT", "ME", "NH", "VT", "RI", "DE", "MD", "VA", "NC", "SC", "GA", "FL"]
- "midwest" = ["IL", "OH", "MI", "IN", "WI", "MN", "IA", "MO", "ND", "SD", "NE", "KS"]
- "south" = ["TX", "OK", "AR", "LA", "MS", "AL", "TN", "KY"]

## RULES
1. Return ONLY valid JSON
2. Use customer terminology when provided
3. "cost" or "spend" for customers = retail field
4. Include confidence score`;

async function compileFilters(
  anthropic: Anthropic,
  prompt: string,
  knowledgeContext: string
): Promise<CompileResult> {
  try {
    const today = new Date().toISOString().split('T')[0];
    let userPrompt = `Today: ${today}\n\nConvert to filter rules: "${prompt}"`;

    if (knowledgeContext) {
      userPrompt = `${knowledgeContext}\n\n${userPrompt}`;
    }

    const response = await anthropic.messages.create({
      model: MODELS.HAIKU,
      max_tokens: 1024,
      system: COMPILE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }]
    });

    const textBlock = response.content.find(c => c.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return { success: false, error: 'No response from AI' };
    }

    const parsed = JSON.parse(textBlock.text.trim());

    if (parsed.error) {
      return { success: false, error: parsed.error, suggestions: parsed.suggestions };
    }

    return {
      success: true,
      compiledRule: parsed.compiledRule,
      reasoning: parsed.reasoning,
      confidence: parsed.confidence,
      suggestions: parsed.suggestions
    };
  } catch (error) {
    const localResult = parseSimpleLogic(prompt);
    if (localResult) {
      return { success: true, compiledRule: localResult, reasoning: 'Local pattern match', confidence: 0.7 };
    }
    return { success: false, error: error instanceof Error ? error.message : 'Compilation failed' };
  }
}

function parseSimpleLogic(prompt: string): { filters: CompiledFilter[] } | null {
  const filters: CompiledFilter[] = [];
  const lower = prompt.toLowerCase();

  const overMatch = lower.match(/(?:over|greater than|more than|above)\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (overMatch) {
    filters.push({ field: 'retail', operator: 'gt', value: parseFloat(overMatch[1].replace(/,/g, '')) });
  }

  const underMatch = lower.match(/(?:under|less than|below)\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (underMatch) {
    filters.push({ field: 'retail', operator: 'lt', value: parseFloat(underMatch[1].replace(/,/g, '')) });
  }

  const fromMatch = prompt.match(/(?:from|origin)\s+([A-Z]{2})\b/i);
  if (fromMatch) {
    filters.push({ field: 'origin_state', operator: 'eq', value: fromMatch[1].toUpperCase() });
  }

  const toMatch = prompt.match(/(?:to|destination)\s+([A-Z]{2})\b/i);
  if (toMatch) {
    filters.push({ field: 'destination_state', operator: 'eq', value: toMatch[1].toUpperCase() });
  }

  if (lower.includes('delivered')) {
    filters.push({ field: 'status_name', operator: 'eq', value: 'Delivered' });
  } else if (lower.includes('late')) {
    filters.push({ field: 'is_late', operator: 'eq', value: true });
  }

  return filters.length > 0 ? { filters } : null;
}

// ============================================================================
// MODE ROUTER
// ============================================================================

function routeMode(question: string, preferences?: RequestBody['preferences']): {
  mode: Mode; confidence: number; reason: string;
} {
  if (preferences?.mode) {
    return { mode: preferences.mode, confidence: 1.0, reason: 'Explicit mode' };
  }

  if (preferences?.forceMode) {
    const legacyMap: Record<string, Mode> = { 'quick': 'question', 'deep': 'analyze', 'visual': 'widget' };
    return { mode: legacyMap[preferences.forceMode] || 'question', confidence: 0.9, reason: 'Legacy mode' };
  }

  const q = question.toLowerCase();

  if (q.includes('compile') || q.includes('filter for') || q.includes('convert to')) {
    return { mode: 'compile', confidence: 0.85, reason: 'Filter compilation' };
  }
  if (q.includes('report') || q.includes('generate report')) {
    return { mode: 'report', confidence: 0.9, reason: 'Report generation' };
  }
  if (q.includes('widget') || q.includes('chart') || q.includes('visualization')) {
    return { mode: 'widget', confidence: 0.85, reason: 'Visualization' };
  }
  if (/why|investigate|analyze|compare|versus|driving|causing/i.test(q)) {
    return { mode: 'analyze', confidence: 0.85, reason: 'Deep analysis' };
  }

  return { mode: 'question', confidence: 0.7, reason: 'General Q&A' };
}

// ============================================================================
// MCP TOOLS
// ============================================================================

const MCP_TOOLS: Anthropic.Tool[] = [
  {
    name: "discover_tables",
    description: "List available database tables. Returns shipment, shipment_mode, equipment_type, carrier, etc.",
    input_schema: {
      type: "object" as const,
      properties: { category: { type: "string", enum: ["core", "reference", "analytics"] } },
      required: []
    }
  },
  {
    name: "discover_fields",
    description: "Get all fields for a specific table. Only use for tables NOT in the known schema above.",
    input_schema: {
      type: "object" as const,
      properties: { table_name: { type: "string" } },
      required: ["table_name"]
    }
  },
  {
    name: "discover_joins",
    description: "Get available join relationships for a table.",
    input_schema: {
      type: "object" as const,
      properties: { table_name: { type: "string" } },
      required: ["table_name"]
    }
  },
  {
    name: "search_text",
    description: "Search for text across all searchable fields. Use to find specific carriers, products, references.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string" },
        match_type: { type: "string", enum: ["contains", "exact", "starts_with"] }
      },
      required: ["query"]
    }
  },
  {
    name: "query_table",
    description: "Query a single table with filters and aggregations. Use for shipment table queries. Customer filtering is automatic.",
    input_schema: {
      type: "object" as const,
      properties: {
        table_name: { type: "string" },
        select: { type: "array", items: { type: "string" } },
        filters: { type: "array" },
        group_by: { type: "array", items: { type: "string" } },
        aggregations: { type: "array" },
        order_by: { type: "string" },
        order_dir: { type: "string", enum: ["asc", "desc"] },
        limit: { type: "number" }
      },
      required: ["table_name"]
    }
  },
  {
    name: "query_with_join",
    description: "Query across multiple tables with automatic joins. REQUIRED for carrier/mode/equipment names. IMPORTANT: Always include dimension fields in 'select' to get labels in results! Join paths: shipment→shipment_carrier→carrier, shipment→shipment_mode, shipment→equipment_type.",
    input_schema: {
      type: "object" as const,
      properties: {
        base_table: { type: "string", description: "Starting table, usually 'shipment'" },
        joins: { type: "array", description: "Tables to join: [{\"table\": \"shipment_mode\"}] or [{\"table\": \"shipment_carrier\"}, {\"table\": \"carrier\"}]" },
        select: { type: "array", items: { type: "string" }, description: "REQUIRED for labels! Fields to select, e.g. ['shipment_mode.mode_name'] - always include your group_by fields here" },
        filters: { type: "array" },
        group_by: { type: "array", items: { type: "string" }, description: "Fields to group by, e.g. ['shipment_mode.mode_name']" },
        aggregations: { type: "array", description: "Aggregations, e.g. [{\"function\": \"SUM\", \"field\": \"retail\", \"alias\": \"total_spend\"}]" },
        order_by: { type: "string" },
        limit: { type: "number" }
      },
      required: ["base_table", "joins"]
    }
  },
  {
    name: "aggregate",
    description: "Simple group-by aggregation for 'X by Y' questions on a SINGLE table. Do NOT use for carrier/mode/equipment queries - use query_with_join instead.",
    input_schema: {
      type: "object" as const,
      properties: {
        table_name: { type: "string" },
        group_by: { type: "string" },
        metric: { type: "string" },
        aggregation: { type: "string", enum: ["sum", "avg", "min", "max", "count"] },
        filters: { type: "array" },
        limit: { type: "number" }
      },
      required: ["table_name", "group_by", "metric", "aggregation"]
    }
  },
  {
    name: "get_lanes",
    description: "Get top shipping lanes (origin → destination pairs) with shipment counts and total spend.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Number of top lanes to return (default 20)" }
      },
      required: []
    }
  }
];

// ============================================================================
// TOOL EXECUTOR - v2.5 Fixed function names
// ============================================================================

async function executeMCPTool(
  supabase: SupabaseClient,
  customerId: string,
  isAdmin: boolean,
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<unknown> {
  const customerIdInt = parseInt(customerId, 10);

  switch (toolName) {
    case 'discover_tables': {
      // v2.5: Use mcp_discover_tables (new function with shipment_mode, equipment_type)
      const { data, error } = await supabase.rpc('mcp_discover_tables', {
        p_category: (toolInput.category as string) || null
      });
      if (error) {
        // Fallback to old function if new one doesn't exist
        const { data: fallbackData, error: fallbackError } = await supabase.rpc('mcp_get_tables', {
          p_category: (toolInput.category as string) || null,
          p_include_row_counts: false
        });
        if (fallbackError) return { success: false, error: fallbackError.message };
        return { success: true, tables: fallbackData || [], count: fallbackData?.length || 0 };
      }
      // mcp_discover_tables returns {success, tables, count} directly
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      return result;
    }

    case 'discover_fields': {
      const tableName = toolInput.table_name as string;
      if (!tableName) return { success: false, error: "table_name required" };
      const { data, error } = await supabase.rpc('mcp_get_fields', {
        p_table_name: tableName,
        p_include_samples: true,
        p_admin_mode: isAdmin
      });
      if (error) return { success: false, error: error.message };
      return { success: true, table_name: tableName, fields: data || [] };
    }

    case 'discover_joins': {
      const tableName = toolInput.table_name as string;
      // v2.5: mcp_get_table_joins now returns mode and equipment joins too
      const { data, error } = await supabase.rpc('mcp_get_table_joins');
      if (error) return { success: false, error: error.message };
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      return { success: true, table_name: tableName, ...result };
    }

    case 'search_text': {
      const query = toolInput.query as string;
      if (!query) return { success: false, error: "query required" };
      const { data, error } = await supabase.rpc('mcp_search_text', {
        p_search_query: query,
        p_customer_id: customerIdInt,
        p_is_admin: isAdmin,
        p_match_type: (toolInput.match_type as string) || 'contains',
        p_limit: 10
      });
      if (error) return { success: false, error: error.message };
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      return { success: true, query, matches: result?.results || [], total_matches: result?.total_matches || 0 };
    }

    case 'query_table': {
      const tableName = toolInput.table_name as string;
      if (!tableName) return { success: false, error: "table_name required" };
      const { data, error } = await supabase.rpc('mcp_query_table', {
        p_table_name: tableName,
        p_customer_id: customerIdInt,
        p_is_admin: isAdmin,
        p_select: (toolInput.select as string[]) || ['*'],
        p_filters: toolInput.filters || [],
        p_group_by: (toolInput.group_by as string[]) || null,
        p_aggregations: toolInput.aggregations || null,
        p_order_by: (toolInput.order_by as string) || null,
        p_order_dir: (toolInput.order_dir as string) || 'desc',
        p_limit: (toolInput.limit as number) || 100
      });
      if (error) return { success: false, error: error.message };
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      return { success: true, table: tableName, row_count: result?.row_count || 0, data: result?.data || [] };
    }

    case 'query_with_join': {
      const baseTable = toolInput.base_table as string;
      if (!baseTable) return { success: false, error: "base_table required" };
      const { data, error } = await supabase.rpc('mcp_query_with_join', {
        p_base_table: baseTable,
        p_customer_id: customerIdInt,
        p_is_admin: isAdmin,
        p_joins: toolInput.joins || [],
        p_filters: toolInput.filters || [],
        p_group_by: toolInput.group_by || [],
        p_select_fields: (toolInput.select as string[]) || [],
        p_aggregations: toolInput.aggregations || []
      });
      if (error) return { success: false, error: error.message };
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      return { success: true, base_table: baseTable, row_count: result?.row_count || 0, data: result?.data || [] };
    }

    case 'aggregate': {
      const tableName = toolInput.table_name as string;
      if (!tableName) return { success: false, error: "table_name required" };
      const { data, error } = await supabase.rpc('mcp_aggregate', {
        p_table_name: tableName,
        p_customer_id: customerIdInt,
        p_is_admin: isAdmin,
        p_group_by: toolInput.group_by as string,
        p_metric: toolInput.metric as string,
        p_aggregation: toolInput.aggregation as string,
        p_filters: toolInput.filters || [],
        p_order_dir: 'desc',
        p_limit: (toolInput.limit as number) || 20
      });
      if (error) return { success: false, error: error.message };
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      return { success: true, data: result?.data || [] };
    }

    case 'get_lanes': {
      const { data, error } = await supabase.rpc('mcp_get_lanes', {
        p_customer_id: customerIdInt,
        p_limit: (toolInput.limit as number) || 20
      });
      if (error) return { success: false, error: error.message };
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      return { success: true, data: result?.data || [] };
    }

    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}

// ============================================================================
// PARALLEL TOOL EXECUTOR - v2.4
// ============================================================================

interface ToolExecution {
  toolUse: Anthropic.ToolUseBlock;
  result: unknown;
  visualization: Visualization | null;
}

async function executeToolsInParallel(
  supabase: SupabaseClient,
  customerId: string,
  isAdmin: boolean,
  toolUseBlocks: Anthropic.ToolUseBlock[]
): Promise<ToolExecution[]> {
  const executions = await Promise.all(
    toolUseBlocks.map(async (toolUse): Promise<ToolExecution> => {
      const result = await executeMCPTool(
        supabase,
        customerId,
        isAdmin,
        toolUse.name,
        toolUse.input as Record<string, unknown>
      );

      const visualization = generateVisualization(
        toolUse.name,
        toolUse.input as Record<string, unknown>,
        result
      );

      return { toolUse, result, visualization };
    })
  );

  return executions;
}

// ============================================================================
// VISUALIZATION HELPERS - v2.2 Polished
// ============================================================================

function formatFieldName(name: string | null | undefined): string {
  if (!name) return 'Value';

  let clean = name.includes('.') ? name.split('.').pop() || name : name;

  const specialCases: Record<string, string> = {
    'carrier_name': 'Carrier',
    'mode_name': 'Mode',
    'equipment_name': 'Equipment',
    'shipment_count': 'Shipments',
    'total_cost': 'Total Cost',
    'total_spend': 'Total Spend',
    'total_retail': 'Total Spend',
    'retail': 'Spend',
    'cost': 'Cost',
    'margin': 'Margin',
    'avg_cost': 'Avg Cost',
    'avg_retail': 'Avg Spend',
    'origin_state': 'Origin State',
    'dest_state': 'Destination State',
    'destination_state': 'Destination State',
    'origin_city': 'Origin City',
    'dest_city': 'Destination City',
    'pickup_date': 'Pickup Date',
    'delivery_date': 'Delivery Date',
    'load_id': 'Load ID',
    'miles': 'Miles',
    'total_weight': 'Weight',
    'freight_class': 'Freight Class'
  };

  const lowerClean = clean.toLowerCase();
  if (specialCases[lowerClean]) {
    return specialCases[lowerClean];
  }

  return clean
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatAggregation(agg: string | null | undefined): string {
  if (!agg) return 'Total';

  const aggMap: Record<string, string> = {
    'sum': 'Total',
    'avg': 'Average',
    'average': 'Average',
    'count': 'Count',
    'min': 'Minimum',
    'max': 'Maximum'
  };

  return aggMap[agg.toLowerCase()] || agg.charAt(0).toUpperCase() + agg.slice(1);
}

function buildVisualizationTitle(
  aggregation: string | null | undefined,
  metric: string | null | undefined,
  groupBy: string | null | undefined,
  isStatCard: boolean
): string {
  const formattedMetric = formatFieldName(metric);
  const formattedAgg = formatAggregation(aggregation);

  if (isStatCard) {
    if (formattedMetric.toLowerCase().includes(formattedAgg.toLowerCase())) {
      return formattedMetric;
    }
    return `${formattedAgg} ${formattedMetric}`;
  }

  const formattedGroupBy = formatFieldName(groupBy);
  return `${formattedMetric} by ${formattedGroupBy}`;
}

function isCurrencyMetric(metric: string | null | undefined, valueKey: string | null | undefined): boolean {
  const toCheck = [metric, valueKey].filter(Boolean).join(' ').toLowerCase();

  const currencyKeywords = [
    'cost', 'retail', 'spend', 'price', 'margin', 'revenue',
    'amount', 'total_cost', 'total_spend', 'total_retail',
    'avg_cost', 'avg_retail', 'carrier_pay', 'charge'
  ];

  return currencyKeywords.some(kw => toCheck.includes(kw));
}

function findValueKey(row: Record<string, unknown>, keys: string[]): string | null {
  const priorityKeys = ['value', 'total', 'count', 'sum', 'avg', 'total_cost', 'total_spend',
                        'total_retail', 'shipment_count', 'avg_cost', 'avg_retail'];

  for (const pk of priorityKeys) {
    const found = keys.find(k => k.toLowerCase() === pk || k.toLowerCase().includes(pk));
    if (found && (typeof row[found] === 'number' || !isNaN(parseFloat(String(row[found]))))) {
      return found;
    }
  }

  return keys.find(k => typeof row[k] === 'number') || null;
}

function findLabelKey(row: Record<string, unknown>, keys: string[], excludeKey: string | null): string | null {
  const priorityKeys = ['carrier_name', 'mode_name', 'equipment_name', 'name', 'state', 'city', 'mode', 'status',
                        'origin_state', 'dest_state', 'destination_state', 'lane'];

  for (const pk of priorityKeys) {
    const found = keys.find(k => k.toLowerCase() === pk || k.toLowerCase().includes(pk));
    if (found && found !== excludeKey && typeof row[found] === 'string') {
      return found;
    }
  }

  return keys.find(k => typeof row[k] === 'string' && k !== excludeKey) || keys[0];
}

// ============================================================================
// VISUALIZATION GENERATOR - v2.2 Polished
// ============================================================================

function generateVisualization(
  toolName: string,
  toolInput: Record<string, unknown>,
  result: unknown
): Visualization | null {
  const r = result as { success?: boolean; data?: unknown[] };

  if (!r?.success || !r?.data || !Array.isArray(r.data) || r.data.length === 0) {
    console.log('[Viz] No data to visualize');
    return null;
  }

  const rows = r.data as Array<Record<string, unknown>>;

  console.log('[Viz] Processing:', {
    toolName,
    rowCount: rows.length,
    hasGroupBy: !!toolInput.group_by,
    firstRowKeys: Object.keys(rows[0] || {})
  });

  const metric = toolInput.metric as string | undefined;
  const aggregation = toolInput.aggregation as string | undefined;
  const groupByRaw = toolInput.group_by;
  const groupByField = Array.isArray(groupByRaw)
    ? (groupByRaw[0] as string)?.split('.').pop()
    : typeof groupByRaw === 'string'
      ? groupByRaw.split('.').pop()
      : null;

  if (toolName === 'get_lanes') {
    const laneData = rows.slice(0, 15).map(row => {
      const lane = row.lane ||
        `${row.origin_city || '?'}, ${row.origin_state || '?'} → ${row.dest_city || '?'}, ${row.dest_state || '?'}`;
      const value = Number(row.shipment_count || row.total_spend || 0);
      return { label: String(lane), value };
    });

    return {
      id: crypto.randomUUID(),
      type: 'bar',
      title: 'Top Shipping Lanes',
      subtitle: `${rows.length} lanes by volume`,
      data: {
        data: laneData,
        format: 'number'
      },
      config: {
        xField: 'lane',
        yField: 'shipment_count',
        orientation: 'horizontal'
      }
    };
  }

  if (rows.length === 1) {
    const row = rows[0];
    const keys = Object.keys(row);

    console.log('[Viz] Single row detected:', { keys, row });

    const valueKey = findValueKey(row, keys);

    if (valueKey) {
      const rawValue = row[valueKey];
      const value = typeof rawValue === 'number'
        ? rawValue
        : parseFloat(String(rawValue));

      if (!isNaN(value)) {
        const isCurrency = isCurrencyMetric(metric, valueKey);
        const title = buildVisualizationTitle(aggregation, metric || valueKey, null, true);

        console.log('[Viz] Creating STAT card:', { title, value, isCurrency });

        return {
          id: crypto.randomUUID(),
          type: 'stat',
          title,
          data: {
            value: value,
            format: isCurrency ? 'currency' : 'number'
          }
        };
      }
    }

    const firstKey = keys[0];
    const firstValue = row[firstKey];
    if (typeof firstValue === 'number') {
      return {
        id: crypto.randomUUID(),
        type: 'stat',
        title: formatFieldName(firstKey),
        data: {
          value: firstValue,
          format: isCurrencyMetric(null, firstKey) ? 'currency' : 'number'
        }
      };
    }

    console.log('[Viz] Single row but no displayable value');
  }

  if (rows.length > 1) {
    const firstRow = rows[0];
    const rowKeys = Object.keys(firstRow);

    const valueKey = findValueKey(firstRow, rowKeys);
    const labelKey = findLabelKey(firstRow, rowKeys, valueKey);

    if (!valueKey) {
      console.log('[Viz] No value key found for bar chart');
      return null;
    }

    const isCurrency = isCurrencyMetric(metric, valueKey);
    const title = buildVisualizationTitle(aggregation, metric || valueKey, groupByField || labelKey, false);

    const chartData = rows.slice(0, 15).map(row => ({
      label: String(row[labelKey!] || 'Unknown'),
      value: Number(row[valueKey]) || 0
    }));

    chartData.sort((a, b) => b.value - a.value);

    console.log('[Viz] Creating BAR chart:', {
      title,
      labelKey,
      valueKey,
      rowCount: rows.length,
      isCurrency
    });

    return {
      id: crypto.randomUUID(),
      type: 'bar',
      title,
      subtitle: `${rows.length} ${formatFieldName(groupByField || labelKey).toLowerCase()}s`,
      data: {
        data: chartData,
        format: isCurrency ? 'currency' : 'number'
      },
      config: {
        xField: labelKey,
        yField: valueKey,
        metric: metric || valueKey,
        groupBy: groupByField || labelKey,
        orientation: 'horizontal',
        showValues: true
      }
    };
  }

  console.log('[Viz] No visualization match');
  return null;
}

// ============================================================================
// ADMIN CHECK
// ============================================================================

async function verifyAdminRole(supabase: SupabaseClient, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('user_role')
      .eq('user_id', userId)
      .single();
    if (error || !data) return false;
    return data.user_role === 'admin';
  } catch {
    return false;
  }
}

// ============================================================================
// CIRCUIT BREAKER (simple inline version)
// ============================================================================

let failureCount = 0;
let lastFailureTime = 0;
const FAILURE_THRESHOLD = 5;
const RESET_TIMEOUT = 60000;

function canExecute(): boolean {
  if (failureCount < FAILURE_THRESHOLD) return true;
  if (Date.now() - lastFailureTime > RESET_TIMEOUT) {
    failureCount = 0;
    return true;
  }
  return false;
}

function recordSuccess(): void { failureCount = 0; }
function recordFailure(): void { failureCount++; lastFailureTime = Date.now(); }

// ============================================================================
// TRACK KNOWLEDGE USAGE (safe wrapper)
// ============================================================================

async function trackKnowledgeUsage(supabase: SupabaseClient, knowledgeIds: number[]): Promise<void> {
  if (knowledgeIds.length === 0) return;
  try {
    await supabase.rpc('increment_knowledge_usage', { p_knowledge_ids: knowledgeIds });
  } catch (e) {
    console.error('[Investigate] Knowledge tracking error:', e);
  }
}

// ============================================================================
// MAIN HANDLER - v2.5 with Smart Model Routing + Parallel Tools + Fixed MCP calls
// ============================================================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  if (!canExecute()) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Service temporarily unavailable',
        answer: 'The AI service is temporarily unavailable. Please try again in a moment.',
        metadata: { processingTimeMs: Date.now() - startTime, toolCallCount: 0, mode: 'error', tier: 'dynamic' }
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RequestBody = await req.json();
    const { question, customerId, userId, conversationHistory = [], preferences = {} } = body;

    console.log('[Investigate] Request:', { question: question?.substring(0, 100), customerId, mode: preferences?.mode });

    if (!question || !customerId) {
      return new Response(
        JSON.stringify({ success: false, error: "question and customerId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    const isAdmin = userId ? await verifyAdminRole(supabase, userId) : false;

    const routing = routeMode(question, preferences);
    console.log(`[Investigate] Mode: ${routing.mode}, Admin: ${isAdmin}`);

    const compiledContext = await compileContext(supabase, customerId, isAdmin);
    console.log(`[Investigate] Context: ${compiledContext.tokenEstimate} tokens, ${compiledContext.knowledgeIds.length} knowledge items`);

    if (routing.mode === 'compile') {
      const compileResult = await compileFilters(anthropic, question, compiledContext.systemPrompt);

      await trackKnowledgeUsage(supabase, compiledContext.knowledgeIds);

      recordSuccess();
      return new Response(JSON.stringify({
        success: compileResult.success,
        answer: compileResult.reasoning || (compileResult.success ? 'Filter compiled' : 'Failed'),
        compiledRule: compileResult.compiledRule,
        confidence: compileResult.confidence,
        suggestions: compileResult.suggestions,
        reasoning: [{ type: 'routing', content: 'Mode: compile' }],
        metadata: {
          processingTimeMs: Date.now() - startTime,
          toolCallCount: 0,
          mode: 'compile',
          tier: 'compile',
          model: MODELS.HAIKU,
          contextTokens: compiledContext.tokenEstimate,
          knowledgeItemsUsed: compiledContext.knowledgeIds.length
        },
        error: compileResult.error
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const modelSelection = selectModel(question, routing.mode);
    console.log(`[Investigate] Model: ${modelSelection.model} (${modelSelection.reason})`);

    const reasoningSteps: ReasoningStep[] = [
      { type: 'routing', content: `Mode: ${routing.mode} (${routing.reason})` },
      { type: 'context', content: `Loaded ${compiledContext.knowledgeIds.length} knowledge items` },
      { type: 'model', content: `Using ${modelSelection.model === MODELS.HAIKU ? 'Haiku (fast)' : 'Sonnet (smart)'}: ${modelSelection.reason}` }
    ];
    let toolCallCount = 0;
    const visualizations: Visualization[] = [];

    const messages: Anthropic.MessageParam[] = [
      ...conversationHistory.map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content })),
      { role: "user", content: question }
    ];

    const maxTurns = routing.mode === 'analyze' ? 10 : routing.mode === 'report' ? 8 : 6;
    let currentMessages = [...messages];
    let finalAnswer = "";
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let currentModel = modelSelection.model;

    for (let turn = 0; turn < maxTurns; turn++) {
      console.log(`[Investigate] Turn ${turn + 1}/${maxTurns} (${currentModel})`);

      const response = await anthropic.messages.create({
        model: currentModel,
        max_tokens: routing.mode === 'analyze' ? 4096 : 2048,
        system: compiledContext.systemPrompt,
        messages: currentMessages,
        tools: MCP_TOOLS,
        tool_choice: { type: "auto" }
      });

      totalInputTokens += response.usage?.input_tokens || 0;
      totalOutputTokens += response.usage?.output_tokens || 0;

      for (const block of response.content) {
        if (block.type === 'text' && block.text) {
          reasoningSteps.push({ type: 'thinking', content: block.text.slice(0, 500) });
        }
      }

      if (response.stop_reason === "end_turn") {
        const textBlock = response.content.find(c => c.type === "text");
        if (textBlock && textBlock.type === "text") finalAnswer = textBlock.text;
        break;
      }

      const toolUseBlocks = response.content.filter(
        (c): c is Anthropic.ToolUseBlock => c.type === "tool_use"
      );

      if (toolUseBlocks.length === 0) {
        const textBlock = response.content.find(c => c.type === "text");
        if (textBlock && textBlock.type === "text") finalAnswer = textBlock.text;
        break;
      }

      currentMessages.push({ role: "assistant", content: response.content });

      console.log(`[Investigate] Executing ${toolUseBlocks.length} tool(s) in parallel`);

      const executions = await executeToolsInParallel(
        supabase,
        customerId,
        isAdmin,
        toolUseBlocks
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const execution of executions) {
        toolCallCount++;
        console.log(`[Investigate] Tool: ${execution.toolUse.name}`, JSON.stringify(execution.toolUse.input).slice(0, 300));
        reasoningSteps.push({ type: 'tool_call', content: `Calling ${execution.toolUse.name}`, toolName: execution.toolUse.name });

        if (execution.visualization) {
          console.log('[Investigate] Visualization created:', { type: execution.visualization.type, title: execution.visualization.title });
          visualizations.push(execution.visualization);
        }

        reasoningSteps.push({ type: 'tool_result', content: JSON.stringify(execution.result).slice(0, 500), toolName: execution.toolUse.name });
        toolResults.push({
          type: "tool_result",
          tool_use_id: execution.toolUse.id,
          content: JSON.stringify(execution.result)
        });
      }

      currentMessages.push({ role: "user", content: toolResults });
    }

    await trackKnowledgeUsage(supabase, compiledContext.knowledgeIds);

    const followUpQuestions = [
      { id: crypto.randomUUID(), question: "How does this compare to previous periods?" },
      { id: crypto.randomUUID(), question: "What's driving these numbers?" },
      { id: crypto.randomUUID(), question: "Can you break this down further?" }
    ];

    recordSuccess();
    return new Response(JSON.stringify({
      success: true,
      answer: finalAnswer,
      visualizations,
      reasoning: preferences?.showReasoning !== false ? reasoningSteps : undefined,
      followUpQuestions,
      metadata: {
        processingTimeMs: Date.now() - startTime,
        toolCallCount,
        mode: routing.mode,
        tier: 'dynamic',
        model: currentModel,
        modelReason: modelSelection.reason,
        tokensUsed: { input: totalInputTokens, output: totalOutputTokens },
        contextTokens: compiledContext.tokenEstimate,
        knowledgeItemsUsed: compiledContext.knowledgeIds.length
      }
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("[Investigate] Error:", error);
    recordFailure();

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Investigation failed",
      answer: "I encountered an error. Please try again.",
      reasoning: [],
      followUpQuestions: [],
      visualizations: [],
      metadata: { processingTimeMs: Date.now() - startTime, toolCallCount: 0, mode: 'error', tier: 'dynamic' }
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
