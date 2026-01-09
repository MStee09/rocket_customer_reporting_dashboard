import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  prompt: string;
  customerId?: string;
  userId?: string;
}

interface WidgetSuggestion {
  success: boolean;
  summary: string;
  visualizationType: string;
  xField?: string;
  yField?: string;
  aggregation?: string;
  filters?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  aiPrompt?: string;
  info?: string;
  warning?: string;
  limitations?: string[];
  mcpQuery?: any;
  reasoning?: string[];
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
          description: "Filter by table category (optional)"
        }
      },
      required: []
    }
  },
  {
    name: "discover_fields",
    description: "Get all fields for a specific table with their types and whether they can be grouped/aggregated.",
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
    description: "Search for text across all searchable fields. Use to find specific carriers, products, references. Returns which tables/fields contain matches and sample data.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Text to search for (e.g., 'cargoglide', 'fedex', 'drawer system')"
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
    name: "sample_field_values",
    description: "Get sample values from a specific field to understand what data looks like.",
    input_schema: {
      type: "object" as const,
      properties: {
        table_name: { type: "string" },
        field_name: { type: "string" },
        limit: { type: "number", description: "Number of samples (default: 10)" }
      },
      required: ["table_name", "field_name"]
    }
  }
];

const WIDGET_BUILDER_SYSTEM_PROMPT = `You are an AI assistant helping configure a Visual Widget Builder for a logistics dashboard.

## YOUR TASK
Analyze the user's request and determine:
1. What visualization type best fits (bar, line, pie, choropleth, table, kpi)
2. What fields should be used (x-axis, y-axis, grouping)
3. What filters are needed
4. Whether the request is possible with available data

## CRITICAL: DISCOVER FIRST
Before suggesting fields, you MUST:
1. Call discover_tables() to see what tables exist
2. Call discover_fields() on relevant tables to see actual field names
3. Call search_text() if the user mentions specific products, carriers, or terms

## COMMON PATTERNS

### Product-based queries (drawer system, cargoglide, toolbox, etc.)
1. search_text("drawer system") - find where this exists
2. Usually in shipment_item.description
3. Requires join: shipment -> shipment_item
4. Group by description, aggregate retail/cost

### Carrier-based queries
1. carrier_name is in 'carrier' table, NOT shipment
2. Requires join: shipment -> carrier via rate_carrier_id
3. Use carrier.carrier_name for display

### Geographic queries
1. origin_state, destination_state are in shipment_address
2. Requires join: shipment -> shipment_address

### Time-based queries
1. Use pickup_date or created_date from shipment table
2. These exist directly, no join needed

## FIELD NAMING RULES
- Always use exact field names from discover_fields()
- For joins, use table.field format (e.g., shipment_item.description)
- Common fields: retail (revenue), cost (carrier cost - admin only), pickup_date, load_id

## VISUALIZATION SELECTION
- bar: Comparing categories (carriers, products, states)
- line: Trends over time
- pie: Distribution/breakdown (limit to <8 categories)
- choropleth: Geographic data with state codes
- kpi: Single metric (total, average)
- table: Detailed data listing

## RESPONSE FORMAT
After discovery, provide your recommendation as a JSON object with:
{
  "visualizationType": "bar|line|pie|choropleth|table|kpi",
  "xField": "field_name",
  "yField": "field_name",
  "aggregation": "sum|avg|count|min|max",
  "filters": [{"field": "...", "operator": "ilike|eq|in", "value": "..."}],
  "requiresJoin": true/false,
  "joinTable": "table_name if needed",
  "limitations": ["any limitations or caveats"],
  "summary": "human readable explanation"
}

Be HONEST about limitations. If something can't be done, explain why.`;

async function executeMCPTool(
  supabase: SupabaseClient,
  toolName: string,
  input: Record<string, unknown>
): Promise<unknown> {
  console.log(`[WidgetBuilderAI] Executing tool: ${toolName}`, input);

  switch (toolName) {
    case "discover_tables": {
      const { data, error } = await supabase.rpc('mcp_get_tables', {
        p_category: input.category || null,
        p_include_row_counts: false
      });
      if (error) throw error;
      return data;
    }

    case "discover_fields": {
      const { data, error } = await supabase.rpc('mcp_get_fields', {
        p_table_name: input.table_name,
        p_include_samples: true,
        p_admin_mode: true
      });
      if (error) throw error;
      return data;
    }

    case "discover_joins": {
      const { data, error } = await supabase.rpc('mcp_get_table_joins', {
        p_table_name: input.table_name
      });
      if (error) throw error;
      return data;
    }

    case "search_text": {
      const { data, error } = await supabase.rpc('mcp_search_text', {
        p_search_query: input.query,
        p_customer_id: 0,
        p_is_admin: true,
        p_match_type: input.match_type || 'contains',
        p_limit: 50
      });
      if (error) throw error;
      return data;
    }

    case "sample_field_values": {
      const tableName = input.table_name as string;
      const fieldName = input.field_name as string;
      const limit = (input.limit as number) || 10;

      const { data, error } = await supabase
        .from(tableName)
        .select(fieldName)
        .not(fieldName, 'is', null)
        .limit(limit);

      if (error) throw error;
      return {
        table: tableName,
        field: fieldName,
        samples: data?.map(r => r[fieldName]) || []
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
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
    const { prompt, customerId, userId } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ success: false, error: "prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    const reasoning: string[] = [];
    let toolCallCount = 0;

    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: `User wants to create a widget: "${prompt}"

Please:
1. Discover what tables and fields are available
2. Search for any specific terms mentioned (products, carriers, etc.)
3. Recommend the best widget configuration

Return your final recommendation as a JSON code block.`
      }
    ];

    const maxTurns = 6;
    let currentMessages = [...messages];
    let finalAnswer = "";

    for (let turn = 0; turn < maxTurns; turn++) {
      console.log(`[WidgetBuilderAI] Turn ${turn + 1}/${maxTurns}`);

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: WIDGET_BUILDER_SYSTEM_PROMPT,
        messages: currentMessages,
        tools: MCP_TOOLS,
        tool_choice: { type: "auto" }
      });

      for (const block of response.content) {
        if (block.type === 'text' && block.text) {
          reasoning.push(block.text.slice(0, 300));
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

        toolCallCount++;
        reasoning.push(`Called ${toolUse.name}(${JSON.stringify(toolUse.input).slice(0, 100)})`);

        try {
          const result = await executeMCPTool(
            supabase,
            toolUse.name,
            toolUse.input as Record<string, unknown>
          );

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(result)
          });
        } catch (err) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify({ error: err instanceof Error ? err.message : "Tool execution failed" })
          });
        }
      }

      currentMessages.push({ role: "user", content: toolResults });
    }

    const suggestion = parseAIResponse(finalAnswer, reasoning);

    return new Response(
      JSON.stringify({
        ...suggestion,
        metadata: {
          processingTimeMs: Date.now() - startTime,
          toolCallCount,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[WidgetBuilderAI] Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Widget builder AI failed",
        summary: "I encountered an error analyzing your request. Please try again.",
        visualizationType: "bar",
        reasoning: []
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function parseAIResponse(answer: string, reasoning: string[]): WidgetSuggestion {
  const jsonMatch = answer.match(/```json\s*([\s\S]*?)\s*```/) ||
                    answer.match(/```\s*([\s\S]*?)\s*```/) ||
                    answer.match(/\{[\s\S]*"visualizationType"[\s\S]*\}/);

  let config: any = {};

  if (jsonMatch) {
    try {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      config = JSON.parse(jsonStr.trim());
    } catch (e) {
      console.error("[WidgetBuilderAI] Failed to parse JSON:", e);
    }
  }

  return {
    success: true,
    summary: config.summary || extractSummary(answer),
    visualizationType: config.visualizationType || 'bar',
    xField: config.xField,
    yField: config.yField,
    aggregation: config.aggregation || 'sum',
    filters: config.filters,
    aiPrompt: config.aiPrompt,
    info: config.requiresJoin ? `This query requires joining ${config.joinTable || 'related tables'}` : undefined,
    warning: config.warning,
    limitations: config.limitations,
    mcpQuery: config.mcpQuery,
    reasoning
  };
}

function extractSummary(text: string): string {
  const lines = text.split('\n').filter(l => l.trim());
  for (const line of lines) {
    if (line.length > 20 && line.length < 200 && !line.startsWith('{') && !line.startsWith('```')) {
      return line.trim();
    }
  }
  return "Widget configuration ready";
}