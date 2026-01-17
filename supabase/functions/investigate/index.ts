import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  question: string;
  customerId: string;
  userId: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  preferences?: {
    showReasoning?: boolean;
    forceMode?: 'quick' | 'deep' | 'visual';
  };
}

interface ReasoningStep {
  type: 'routing' | 'thinking' | 'tool_call' | 'tool_result';
  content: string;
  toolName?: string;
}

interface FollowUpQuestion {
  id: string;
  question: string;
}

type VisualizationType = 'bar' | 'pie' | 'line' | 'area' | 'stat' | 'treemap' | 'table';

interface Visualization {
  id: string;
  type: VisualizationType;
  title: string;
  subtitle?: string;
  data: unknown;
  config?: Record<string, unknown>;
}

const MCP_TOOLS: Anthropic.Tool[] = [
  {
    name: "discover_tables",
    description: "List all available database tables. Call this FIRST to understand what data exists.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: ["core", "reference", "analytics"],
          description: "Filter by table category"
        }
      },
      required: []
    }
  },
  {
    name: "discover_fields",
    description: "Get all fields for a specific table with their types, whether they can be grouped/aggregated, and AI instructions.",
    input_schema: {
      type: "object" as const,
      properties: {
        table_name: {
          type: "string",
          description: "Table name (e.g., 'shipment', 'carrier', 'shipment_item')"
        }
      },
      required: ["table_name"]
    }
  },
  {
    name: "discover_joins",
    description: "Get available join relationships for a table. Shows how tables connect.",
    input_schema: {
      type: "object" as const,
      properties: {
        table_name: { type: "string", description: "Table to find joins for" }
      },
      required: ["table_name"]
    }
  },
  {
    name: "search_text",
    description: "Search for text across all searchable fields. Use to find specific carriers, products, references, etc. Returns which tables/fields contain matches.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Text to search for (e.g., 'cargoglide', 'fedex', 'PO12345')"
        },
        match_type: {
          type: "string",
          enum: ["contains", "exact", "starts_with"],
          description: "How to match (default: contains)"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "query_table",
    description: "Query a single table with filters and aggregations. Customer filtering is automatic.",
    input_schema: {
      type: "object" as const,
      properties: {
        table_name: { type: "string", description: "Table to query" },
        select: {
          type: "array",
          items: { type: "string" },
          description: "Fields to select (default: all)"
        },
        filters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field: { type: "string" },
              operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte", "ilike", "in", "between", "is_null", "is_not_null"] },
              value: {}
            },
            required: ["field", "operator", "value"]
          },
          description: "Filter conditions"
        },
        group_by: {
          type: "array",
          items: { type: "string" },
          description: "Fields to group by"
        },
        aggregations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field: { type: "string" },
              function: { type: "string", enum: ["sum", "avg", "min", "max", "count"] },
              alias: { type: "string" }
            },
            required: ["field", "function"]
          },
          description: "Aggregations to perform"
        },
        order_by: { type: "string", description: "Field to order by" },
        order_dir: { type: "string", enum: ["asc", "desc"] },
        limit: { type: "number", description: "Max rows (default: 100)" }
      },
      required: ["table_name"]
    }
  },
  {
    name: "query_with_join",
    description: "Query across multiple tables with automatic joins. Use for questions involving carrier names, addresses, item details, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        base_table: { type: "string", description: "Primary table (usually 'shipment')" },
        joins: {
          type: "array",
          items: {
            type: "object",
            properties: {
              table: { type: "string", description: "Table to join" },
              type: { type: "string", enum: ["left", "inner"], description: "Join type (default: left)" }
            },
            required: ["table"]
          },
          description: "Tables to join (join conditions are automatic)"
        },
        select: {
          type: "array",
          items: { type: "string" },
          description: "Fields to select (use table.field format)"
        },
        filters: { type: "array", description: "Filter conditions" },
        group_by: { type: "array", items: { type: "string" } },
        aggregations: { type: "array" },
        order_by: { type: "string" },
        limit: { type: "number" }
      },
      required: ["base_table", "joins"]
    }
  },
  {
    name: "aggregate",
    description: "Simple group-by aggregation. Shortcut for common 'X by Y' questions.",
    input_schema: {
      type: "object" as const,
      properties: {
        table_name: { type: "string", description: "Table to query" },
        group_by: { type: "string", description: "Field to group by" },
        metric: { type: "string", description: "Field to aggregate" },
        aggregation: { type: "string", enum: ["sum", "avg", "min", "max", "count"] },
        filters: { type: "array", description: "Optional filters" },
        limit: { type: "number", description: "Max groups (default: 20)" }
      },
      required: ["table_name", "group_by", "metric", "aggregation"]
    }
  }
];

const MCP_SYSTEM_PROMPT = `You are an expert logistics data analyst for Go Rocket Shipping. You investigate shipping data and provide actionable insights.

## YOUR APPROACH: DISCOVER FIRST, THEN QUERY

You have access to a Model Context Protocol (MCP) that lets you discover the database schema dynamically.

### CRITICAL WORKFLOW
1. **SEARCH FIRST** for any specific terms (carriers, products, references)
   - "cargoglide shipments" -> search_text("cargoglide") to find where it exists
   - "fedex costs" -> search_text("fedex") to locate carrier data

2. **DISCOVER** the schema when needed
   - discover_tables() -> see all available tables
   - discover_fields("shipment") -> see fields in shipment table
   - discover_joins("shipment") -> see how tables connect

3. **QUERY** with the right approach
   - Simple metrics: aggregate()
   - Need carrier names: query_with_join() with carrier table
   - Complex filters: query_table() with filters array

### COMMON PATTERNS

| Question | First Tool | Then |
|----------|-----------|------|
| "cargoglide average price" | search_text("cargoglide") | query_with_join to get matching shipments with carrier |
| "cost by carrier" | query_with_join(shipment + carrier) | group by carrier_name |
| "my top lanes" | aggregate(shipment, group_by: origin+dest) | |
| "what carriers do I use" | query_with_join(shipment + carrier, group_by carrier) | |

### IMPORTANT FIELD NOTES
- **carrier_name** is in the 'carrier' table, NOT shipment. Always JOIN to get carrier names.
- **retail** = customer's cost (what they pay)
- **cost** = carrier cost (ADMIN ONLY - don't show to customers)
- Use **shipment_carrier** table to get carrier info (JOIN shipment.load_id = shipment_carrier.load_id, then shipment_carrier.carrier_id = carrier.carrier_id)
- The shipment_carrier table contains the ACTUAL hauling carrier

### RESPONSE STYLE
- Lead with a DIRECT answer and specific numbers
- Show your reasoning briefly
- Suggest 1-2 follow-up questions
- If search returns no results, tell the user and suggest alternatives

### EXAMPLE INVESTIGATION
User: "What's the average price of cargoglide shipments?"

1. search_text("cargoglide") -> Found in carrier.carrier_name
2. query_with_join(base: shipment, joins: [carrier], filters: carrier_name ILIKE '%cargoglide%', aggregations: [avg(retail)])
3. Answer: "CargoGlide shipments average $342.50 across 127 shipments..."`;

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
      const { data, error } = await supabase.rpc('mcp_get_tables', {
        p_category: (toolInput.category as string) || null,
        p_include_row_counts: false
      });
      if (error) return { success: false, error: error.message };
      return {
        success: true,
        tables: data || [],
        count: data?.length || 0,
        hint: "Use discover_fields(table_name) to see fields, or search_text() to find specific data"
      };
    }

    case 'discover_fields': {
      const tableName = toolInput.table_name as string;
      if (!tableName) return { success: false, error: "table_name is required" };

      const { data, error } = await supabase.rpc('mcp_get_fields', {
        p_table_name: tableName,
        p_include_samples: true,
        p_admin_mode: isAdmin
      });
      if (error) return { success: false, error: error.message };

      const fields = data || [];
      return {
        success: true,
        table_name: tableName,
        field_count: fields.length,
        fields,
        summary: {
          groupable: fields.filter((f: Record<string, unknown>) => f.is_groupable).map((f: Record<string, unknown>) => f.field_name),
          aggregatable: fields.filter((f: Record<string, unknown>) => f.is_aggregatable).map((f: Record<string, unknown>) => f.field_name),
          searchable: fields.filter((f: Record<string, unknown>) => f.is_searchable).map((f: Record<string, unknown>) => f.field_name)
        }
      };
    }

    case 'discover_joins': {
      const tableName = toolInput.table_name as string;
      if (!tableName) return { success: false, error: "table_name is required" };

      const { data, error } = await supabase.rpc('mcp_get_table_joins', {
        p_table_name: tableName
      });
      if (error) return { success: false, error: error.message };
      return {
        success: true,
        table_name: tableName,
        joins: data || [],
        hint: "Use query_with_join() to query across these tables"
      };
    }

    case 'search_text': {
      const query = toolInput.query as string;
      if (!query) return { success: false, error: "query is required" };

      const { data, error } = await supabase.rpc('mcp_search_text', {
        p_search_query: query,
        p_customer_id: customerIdInt,
        p_is_admin: isAdmin,
        p_match_type: (toolInput.match_type as string) || 'contains',
        p_limit: 10
      });
      if (error) return { success: false, error: error.message };

      const result = typeof data === 'string' ? JSON.parse(data) : data;
      return {
        success: true,
        query,
        matches: result?.results || [],
        total_matches: result?.total_matches || 0,
        hint: result?.total_matches > 0
          ? "Use query_with_join() to get full details for matching records"
          : "No matches found. Try different spelling or search terms."
      };
    }

    case 'query_table': {
      const tableName = toolInput.table_name as string;
      if (!tableName) return { success: false, error: "table_name is required" };

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
      return {
        success: result?.success ?? true,
        table: tableName,
        row_count: result?.row_count || 0,
        data: result?.data || [],
        query: result?.query
      };
    }

    case 'query_with_join': {
      const baseTable = toolInput.base_table as string;
      if (!baseTable) return { success: false, error: "base_table is required" };

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
      return {
        success: result?.success ?? true,
        base_table: baseTable,
        joined_tables: result?.joined_tables || [],
        row_count: result?.row_count || 0,
        data: result?.data || [],
        query: result?.query
      };
    }

    case 'aggregate': {
      const tableName = toolInput.table_name as string;
      const groupBy = toolInput.group_by as string;
      const metric = toolInput.metric as string;
      const aggregation = toolInput.aggregation as string;

      if (!tableName || !groupBy || !metric || !aggregation) {
        return { success: false, error: "table_name, group_by, metric, and aggregation are required" };
      }

      const { data, error } = await supabase.rpc('mcp_aggregate', {
        p_table_name: tableName,
        p_customer_id: customerIdInt,
        p_is_admin: isAdmin,
        p_group_by: groupBy,
        p_metric: metric,
        p_aggregation: aggregation,
        p_filters: toolInput.filters || [],
        p_limit: (toolInput.limit as number) || 20
      });
      if (error) return { success: false, error: error.message };

      const result = typeof data === 'string' ? JSON.parse(data) : data;
      return {
        success: result?.success ?? true,
        group_by: groupBy,
        metric,
        aggregation,
        row_count: result?.row_count || 0,
        data: result?.data || [],
        query: result?.query
      };
    }

    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}

function generateVisualization(
  toolName: string,
  toolInput: Record<string, unknown>,
  result: unknown
): Visualization | null {
  const id = crypto.randomUUID();
  const data = result as Record<string, unknown>;

  console.log('[generateVisualization] Input:', {
    toolName,
    dataSuccess: data.success,
    hasData: !!data.data,
    dataLength: Array.isArray(data.data) ? data.data.length : 0,
    dataKeys: Object.keys(data),
    toolInputKeys: Object.keys(toolInput)
  });

  if (!data.success || !data.data) {
    console.log('[generateVisualization] Returning null: success=', data.success, 'hasData=', !!data.data);
    return null;
  }
  const rows = data.data as Array<Record<string, unknown>>;
  if (!rows || rows.length === 0) return null;

  if ((toolName === 'aggregate' || toolName === 'query_with_join' || toolName === 'query_table') &&
      toolInput.aggregations || toolInput.group_by) {

    const groupBy = (toolInput.group_by as string[] | string)?.[0] || toolInput.group_by as string;
    const metric = (toolInput.metric as string) || 'value';

    const firstRow = rows[0];
    const valueKey = Object.keys(firstRow).find(k =>
      k === 'value' || k === 'count' || k.includes('sum') || k.includes('avg')
    ) || Object.keys(firstRow).find(k => typeof firstRow[k] === 'number');

    if (!valueKey) return null;

    const labelKey = Object.keys(firstRow).find(k =>
      typeof firstRow[k] === 'string' && k !== valueKey
    ) || Object.keys(firstRow)[0];

    return {
      id,
      type: 'bar',
      title: `${formatFieldName(metric)} by ${formatFieldName(groupBy || labelKey)}`,
      subtitle: `${rows.length} groups`,
      data: {
        data: rows.slice(0, 15).map(row => ({
          label: String(row[labelKey] || 'Unknown'),
          value: Number(row[valueKey]) || 0
        })),
        format: metric.includes('retail') || metric.includes('cost') ? 'currency' : 'number'
      },
      config: { metric, groupBy }
    };
  }

  if (toolName === 'query_table' && rows.length === 1) {
    const row = rows[0];
    const keys = Object.keys(row);
    if (keys.length <= 3) {
      const valueKey = keys.find(k => typeof row[k] === 'number') || keys[0];
      return {
        id,
        type: 'stat',
        title: formatFieldName(valueKey),
        data: {
          value: Number(row[valueKey]) || 0,
          format: valueKey.includes('retail') || valueKey.includes('cost') ? 'currency' : 'number'
        }
      };
    }
  }

  return null;
}

function formatFieldName(name: string): string {
  if (!name) return 'Value';
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function classifyQuestion(question: string): { mode: 'quick' | 'deep' | 'visual'; confidence: number; reason: string } {
  const q = question.toLowerCase();

  const quickPatterns = [
    /^(what|how much|how many|who|which)\s+(is|are|was|were)\b/i,
    /total|count|average|sum|highest|lowest/i,
    /\?$/
  ];

  const visualPatterns = [
    /show|chart|graph|visualize|plot|display|compare.*vs|distribution/i,
    /by (carrier|state|mode|month|week)/i,
    /breakdown|split|trend/i
  ];

  const deepPatterns = [
    /why|how come|explain|analyze|investigate|dig into/i,
    /root cause|problem|issue|anomal/i,
    /understand|figure out/i
  ];

  for (const pattern of quickPatterns) {
    if (pattern.test(q)) return { mode: 'quick', confidence: 0.8, reason: 'Simple factual question' };
  }

  for (const pattern of visualPatterns) {
    if (pattern.test(q)) return { mode: 'visual', confidence: 0.85, reason: 'Visualization requested' };
  }

  for (const pattern of deepPatterns) {
    if (pattern.test(q)) return { mode: 'deep', confidence: 0.9, reason: 'Analytical investigation needed' };
  }

  return { mode: 'deep', confidence: 0.6, reason: 'Default to thorough analysis' };
}

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

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

    console.log('[Investigate] Request received:', {
      question: question?.substring(0, 100),
      customerId,
      userId,
      preferences,
      hasHistory: conversationHistory.length > 0
    });

    if (!question || !customerId) {
      return new Response(
        JSON.stringify({ success: false, error: "question and customerId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const isAdmin = userId ? await verifyAdminRole(supabase, userId) : false;

    const classification = classifyQuestion(question);
    const mode = preferences.forceMode || classification.mode;
    console.log(`[Investigate] Mode: ${mode}, Admin: ${isAdmin}, Question: ${question.slice(0, 100)}`);

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    const reasoningSteps: ReasoningStep[] = [{
      type: 'routing',
      content: `Mode: ${mode} (${classification.reason})`
    }];
    let toolCallCount = 0;
    const visualizations: Visualization[] = [];

    const messages: Anthropic.MessageParam[] = [
      ...conversationHistory.map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content })),
      { role: "user", content: question }
    ];

    const maxTurns = mode === 'quick' ? 4 : mode === 'visual' ? 6 : 10;
    let currentMessages = [...messages];
    let finalAnswer = "";

    for (let turn = 0; turn < maxTurns; turn++) {
      console.log(`[Investigate] Turn ${turn + 1}/${maxTurns}`);

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: mode === 'quick' ? 2048 : 4096,
        system: MCP_SYSTEM_PROMPT,
        messages: currentMessages,
        tools: MCP_TOOLS,
        tool_choice: { type: "auto" }
      });

      for (const block of response.content) {
        if (block.type === 'text' && block.text) {
          reasoningSteps.push({
            type: 'thinking',
            content: block.text.slice(0, 500)
          });
        }
      }

      if (response.stop_reason === "end_turn") {
        const textBlock = response.content.find(c => c.type === "text");
        if (textBlock && textBlock.type === "text") {
          finalAnswer = textBlock.text;
        }
        break;
      }

      const toolUseBlocks = response.content.filter(c => c.type === "tool_use");
      if (toolUseBlocks.length === 0) {
        const textBlock = response.content.find(c => c.type === "text");
        if (textBlock && textBlock.type === "text") {
          finalAnswer = textBlock.text;
        }
        break;
      }

      currentMessages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        if (toolUse.type !== "tool_use") continue;

        const toolName = toolUse.name;
        if (!toolName) {
          console.error('[Investigate] Tool use block missing name:', toolUse);
          continue;
        }

        toolCallCount++;
        console.log(`[Investigate] Tool: ${toolName}`, JSON.stringify(toolUse.input).slice(0, 200));

        reasoningSteps.push({
          type: 'tool_call',
          content: `Calling ${toolName}`,
          toolName: toolName
        });

        const result = await executeMCPTool(
          supabase,
          customerId,
          isAdmin,
          toolName,
          toolUse.input as Record<string, unknown>
        );

        console.log('[Investigate] Tool execution result:', {
          toolName,
          success: result?.success,
          hasData: !!result?.data,
          rowCount: result?.row_count || result?.data?.length || 0,
          hasQuery: !!result?.query,
          resultKeys: result ? Object.keys(result) : []
        });

        const viz = generateVisualization(toolName, toolUse.input as Record<string, unknown>, result);
        if (viz) visualizations.push(viz);

        const resultSummary = JSON.stringify(result).slice(0, 500);
        reasoningSteps.push({
          type: 'tool_result',
          content: resultSummary,
          toolName
        });

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result)
        });
      }

      currentMessages.push({ role: "user", content: toolResults });
    }

    const followUpQuestions: FollowUpQuestion[] = [];
    const defaultFollowUps = [
      "How does this compare to previous periods?",
      "What's driving these numbers?",
      "Can you break this down further?"
    ];
    for (const q of defaultFollowUps) {
      followUpQuestions.push({ id: crypto.randomUUID(), question: q });
    }

    const processingTimeMs = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        answer: finalAnswer,
        reasoning: preferences.showReasoning !== false ? reasoningSteps : [],
        followUpQuestions,
        visualizations,
        metadata: {
          processingTimeMs,
          toolCallCount,
          mode,
          classification: {
            detected: classification.mode,
            confidence: classification.confidence,
            reason: classification.reason
          }
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Investigate] Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Investigation failed",
        answer: "I encountered an error during the investigation. Please try again.",
        reasoning: [],
        followUpQuestions: [],
        visualizations: [],
        metadata: {
          processingTimeMs: Date.now() - startTime,
          toolCallCount: 0,
          mode: 'deep'
        }
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
