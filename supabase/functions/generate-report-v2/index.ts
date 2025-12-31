import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TOOLS = [
  {
    name: "explore_field",
    description: "Explore a data field to understand its values, distribution, and data quality. Use this before building reports to ensure fields have data.",
    input_schema: {
      type: "object",
      properties: {
        fieldName: { type: "string", description: "The name of the field to explore" },
        sampleSize: { type: "number", description: "Number of sample values (default: 10)" }
      },
      required: ["fieldName"]
    }
  },
  {
    name: "preview_grouping",
    description: "Preview what a grouping would look like with actual data. Use this to validate that a groupBy field makes sense before adding it to a report.",
    input_schema: {
      type: "object",
      properties: {
        groupBy: { type: "string", description: "Field to group by" },
        metric: { type: "string", description: "Field to aggregate" },
        aggregation: { type: "string", enum: ["sum", "avg", "count", "countDistinct", "min", "max"] },
        limit: { type: "number", description: "Number of groups to preview (default: 10)" }
      },
      required: ["groupBy", "metric", "aggregation"]
    }
  },
  {
    name: "get_customer_context",
    description: "Load customer-specific terminology, products, and preferences. Use when you want to personalize the report.",
    input_schema: {
      type: "object",
      properties: {
        includePreferences: { type: "boolean" },
        includeTerminology: { type: "boolean" },
        includeProducts: { type: "boolean" }
      },
      required: []
    }
  },
  {
    name: "suggest_visualization",
    description: "Get a recommendation for the best chart type based on data characteristics.",
    input_schema: {
      type: "object",
      properties: {
        groupBy: { type: "string", description: "Field being grouped" },
        metric: { type: "string", description: "Field being measured" },
        uniqueGroups: { type: "number", description: "Approximate number of unique groups" },
        isTimeSeries: { type: "boolean", description: "Whether groupBy is a date/time field" }
      },
      required: ["groupBy", "metric"]
    }
  },
  {
    name: "add_report_section",
    description: "Add a new section to the report being built. Build reports incrementally - add sections one at a time.",
    input_schema: {
      type: "object",
      properties: {
        sectionType: { 
          type: "string", 
          enum: ["hero", "stat-row", "chart", "table", "map", "header", "category-grid"],
          description: "Type of section"
        },
        title: { type: "string", description: "Section title" },
        config: { type: "object", description: "Section configuration object" }
      },
      required: ["sectionType", "config"]
    }
  },
  {
    name: "modify_report_section",
    description: "Modify an existing section in the report.",
    input_schema: {
      type: "object",
      properties: {
        sectionIndex: { type: "number", description: "Index of section to modify (0-indexed)" },
        updates: { type: "object", description: "Properties to update" }
      },
      required: ["sectionIndex", "updates"]
    }
  },
  {
    name: "set_report_metadata",
    description: "Set report-level metadata like name, description, theme, and date range.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Report name" },
        description: { type: "string", description: "Report description" },
        theme: { type: "string", enum: ["blue", "green", "orange", "purple", "red", "teal", "slate"] },
        dateRangeType: { type: "string", enum: ["last7", "last30", "last90", "last6months", "ytd", "lastYear", "all"] }
      },
      required: []
    }
  },
  {
    name: "finalize_report",
    description: "Mark the report as complete and ready for display. Call this when the report is done.",
    input_schema: {
      type: "object",
      properties: {
        validate: { type: "boolean", description: "Whether to validate before finalizing (default: true)" }
      },
      required: []
    }
  }
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  prompt: string;
  conversationHistory: Message[];
  customerId: string;
  isAdmin: boolean;
  customerName?: string;
  conversationState?: any;
}

interface ToolContext {
  supabase: SupabaseClient;
  customerId: string;
  isAdmin: boolean;
  schemaFields: any[];
  reportInProgress: any;
}

async function executeExploreField(
  args: { fieldName: string; sampleSize?: number },
  ctx: ToolContext
): Promise<any> {
  const { fieldName, sampleSize = 10 } = args;
  
  const field = ctx.schemaFields.find(
    (f: any) => f.name.toLowerCase() === fieldName.toLowerCase()
  );
  
  if (!field) {
    const available = ctx.schemaFields.slice(0, 8).map((f: any) => f.name).join(", ");
    return { 
      success: false,
      error: `Field "${fieldName}" not found.`,
      suggestion: `Available fields include: ${available}...`
    };
  }
  
  if (field.adminOnly && !ctx.isAdmin) {
    return { 
      success: false,
      error: `Field "${fieldName}" is not available in customer view.`,
      suggestion: "Try using 'retail' instead of cost fields, or 'carrier_name' for carrier analysis."
    };
  }

  try {
    const { data, error } = await ctx.supabase.rpc("explore_single_field", {
      p_customer_id: ctx.customerId,
      p_field_name: field.name,
      p_sample_size: sampleSize
    });

    if (error) throw error;

    const coverage = data.populated_percent || 0;
    let recommendation = "Good - field is well populated";
    if (coverage < 30) {
      recommendation = "Warning: Low coverage (<30%). Consider using a different field.";
    } else if (coverage < 70) {
      recommendation = "Moderate coverage. May have some gaps in data.";
    }

    return {
      success: true,
      fieldName: field.name,
      displayName: field.displayName,
      dataType: data.data_type || field.dataType,
      totalRecords: data.total_count || 0,
      populatedRecords: data.populated_count || 0,
      coveragePercent: coverage,
      uniqueValues: data.unique_count,
      sampleValues: data.sample_values?.slice(0, sampleSize),
      numericStats: data.numeric_stats,
      recommendation
    };
  } catch (e) {
    return { success: false, error: `Exploration failed: ${e}` };
  }
}

async function executePreviewGrouping(
  args: { groupBy: string; metric: string; aggregation: string; limit?: number },
  ctx: ToolContext
): Promise<any> {
  const { groupBy, metric, aggregation, limit = 10 } = args;

  const groupField = ctx.schemaFields.find((f: any) => f.name.toLowerCase() === groupBy.toLowerCase());
  const metricField = ctx.schemaFields.find((f: any) => f.name.toLowerCase() === metric.toLowerCase());

  if (!groupField) {
    return { success: false, error: `Group by field "${groupBy}" not found.` };
  }
  if (!metricField) {
    return { success: false, error: `Metric field "${metric}" not found.` };
  }
  if (!groupField.isGroupable) {
    return { success: false, error: `Field "${groupBy}" cannot be used for grouping.` };
  }

  try {
    const { data, error } = await ctx.supabase.rpc("preview_grouping", {
      p_customer_id: ctx.customerId,
      p_group_by: groupField.name,
      p_metric: metricField.name,
      p_aggregation: aggregation,
      p_limit: limit + 5
    });

    if (error) throw error;

    const results = data.results?.slice(0, limit) || [];
    const totalGroups = data.total_groups || results.length;

    let recommendation = "Good for visualization";
    let suggestedChartType = "bar";

    if (totalGroups > 30) {
      recommendation = "Too many groups. Consider filtering or using a different field.";
      suggestedChartType = "table";
    } else if (totalGroups > 15) {
      recommendation = "Many groups. Consider horizontal bar chart or table.";
      suggestedChartType = "bar";
    } else if (totalGroups <= 6) {
      suggestedChartType = "pie";
      recommendation = "Good for pie chart or bar chart.";
    }

    return {
      success: true,
      groupBy: groupField.name,
      metric: metricField.name,
      aggregation,
      totalGroups,
      previewData: results.map((r: any) => ({
        name: r.name || "Unknown",
        value: r.value || 0,
        count: r.count || 0
      })),
      recommendation,
      suggestedChartType
    };
  } catch (e) {
    return { success: false, error: `Preview failed: ${e}` };
  }
}

async function executeGetCustomerContext(args: any, ctx: ToolContext): Promise<any> {
  const result: any = { success: true };

  try {
    const { data: profile } = await ctx.supabase
      .from("customer_intelligence_profiles")
      .select("*")
      .eq("customer_id", parseInt(ctx.customerId))
      .single();

    if (profile) {
      result.priorities = profile.priorities || [];
      result.keyMarkets = profile.key_markets || [];
      if (args.includePreferences !== false) {
        result.preferences = profile.preferences;
      }
    }

    if (args.includeTerminology !== false) {
      const { data: terms } = await ctx.supabase
        .from("ai_knowledge")
        .select("key, label, definition")
        .eq("scope", "customer")
        .eq("customer_id", ctx.customerId)
        .eq("knowledge_type", "term")
        .eq("is_active", true);

      if (terms?.length) {
        result.terminology = terms.map((t: any) => ({
          term: t.key,
          meaning: t.definition || t.label
        }));
      }
    }

    if (args.includeProducts !== false) {
      const { data: products } = await ctx.supabase
        .from("ai_knowledge")
        .select("key, label, metadata")
        .eq("scope", "customer")
        .eq("customer_id", ctx.customerId)
        .eq("knowledge_type", "product")
        .eq("is_active", true);

      if (products?.length) {
        result.products = products.map((p: any) => ({
          name: p.label || p.key,
          keywords: p.metadata?.keywords || [],
          searchField: p.metadata?.search_field || "description"
        }));
      }
    }

    return result;
  } catch (e) {
    return { success: false, error: `Failed to load context: ${e}` };
  }
}

function executeSuggestVisualization(args: any, ctx: ToolContext): any {
  const { groupBy, metric, uniqueGroups, isTimeSeries } = args;
  const groups = uniqueGroups || 10;

  let chartType = "bar";
  let confidence = 0.8;
  let reasoning = "Bar charts work well for comparing values across categories.";
  const alternatives: string[] = [];

  if (isTimeSeries) {
    chartType = "line";
    confidence = 0.95;
    reasoning = "Time series data is best shown as a line chart to reveal trends.";
    alternatives.push("area");
  } else if (groups <= 6) {
    chartType = "pie";
    confidence = 0.85;
    reasoning = "With few categories, a pie chart shows proportions clearly.";
    alternatives.push("bar", "donut");
  } else if (groups > 20) {
    chartType = "table";
    confidence = 0.7;
    reasoning = "With many categories, a table may be more readable than a chart.";
    alternatives.push("treemap", "bar");
  } else {
    alternatives.push("horizontal_bar", "treemap");
  }

  const geoFields = ["state", "country", "region"];
  if (geoFields.some(g => groupBy.toLowerCase().includes(g))) {
    alternatives.unshift("choropleth_map");
  }

  return {
    success: true,
    recommendedChart: chartType,
    confidence,
    reasoning,
    alternatives: alternatives.slice(0, 3)
  };
}

function executeAddReportSection(
  args: { sectionType: string; title?: string; config: any },
  ctx: ToolContext
): any {
  if (!ctx.reportInProgress) {
    ctx.reportInProgress = {
      id: crypto.randomUUID(),
      name: "Untitled Report",
      createdAt: new Date().toISOString(),
      dateRange: { type: "last90" },
      theme: "blue",
      sections: []
    };
  }

  const validTypes = ["hero", "stat-row", "chart", "table", "map", "header", "category-grid"];
  if (!validTypes.includes(args.sectionType)) {
    return { success: false, error: `Invalid section type. Use: ${validTypes.join(", ")}` };
  }

  const section = {
    type: args.sectionType,
    config: {
      ...args.config,
      title: args.title || args.config?.title
    }
  };

  ctx.reportInProgress.sections.push(section);

  return {
    success: true,
    message: `Added ${args.sectionType} section`,
    sectionIndex: ctx.reportInProgress.sections.length - 1,
    totalSections: ctx.reportInProgress.sections.length,
    currentReport: {
      name: ctx.reportInProgress.name,
      sectionTypes: ctx.reportInProgress.sections.map((s: any) => s.type)
    }
  };
}

function executeModifyReportSection(
  args: { sectionIndex: number; updates: any },
  ctx: ToolContext
): any {
  if (!ctx.reportInProgress?.sections) {
    return { success: false, error: "No report in progress. Add sections first." };
  }

  if (args.sectionIndex < 0 || args.sectionIndex >= ctx.reportInProgress.sections.length) {
    return { 
      success: false, 
      error: `Section ${args.sectionIndex} does not exist. Report has ${ctx.reportInProgress.sections.length} sections.` 
    };
  }

  const section = ctx.reportInProgress.sections[args.sectionIndex];
  ctx.reportInProgress.sections[args.sectionIndex] = {
    ...section,
    config: { ...section.config, ...args.updates }
  };

  return {
    success: true,
    message: `Updated section ${args.sectionIndex}`,
    updatedSection: ctx.reportInProgress.sections[args.sectionIndex]
  };
}

function executeSetReportMetadata(args: any, ctx: ToolContext): any {
  if (!ctx.reportInProgress) {
    ctx.reportInProgress = {
      id: crypto.randomUUID(),
      name: "Untitled Report",
      createdAt: new Date().toISOString(),
      dateRange: { type: "last90" },
      theme: "blue",
      sections: []
    };
  }

  if (args.name) ctx.reportInProgress.name = args.name;
  if (args.description) ctx.reportInProgress.description = args.description;
  if (args.theme) ctx.reportInProgress.theme = args.theme;
  if (args.dateRangeType) ctx.reportInProgress.dateRange = { type: args.dateRangeType };

  return {
    success: true,
    message: "Report metadata updated",
    report: {
      name: ctx.reportInProgress.name,
      description: ctx.reportInProgress.description,
      theme: ctx.reportInProgress.theme,
      dateRange: ctx.reportInProgress.dateRange
    }
  };
}

function executeFinalizeReport(args: any, ctx: ToolContext): any {
  if (!ctx.reportInProgress) {
    return { success: false, error: "No report to finalize. Add sections first." };
  }

  if (!ctx.reportInProgress.sections?.length) {
    return { success: false, error: "Report has no sections. Add at least one section." };
  }

  ctx.reportInProgress.customerId = ctx.customerId;

  const errors: string[] = [];
  for (let i = 0; i < ctx.reportInProgress.sections.length; i++) {
    const section = ctx.reportInProgress.sections[i];
    if (!section.type) errors.push(`Section ${i}: missing type`);
    if (!section.config && section.type !== "header") {
      errors.push(`Section ${i}: missing config`);
    }
  }

  if (errors.length > 0 && args.validate !== false) {
    return { success: false, error: `Validation failed: ${errors.join("; ")}` };
  }

  return {
    success: true,
    isComplete: true,
    report: ctx.reportInProgress,
    summary: {
      name: ctx.reportInProgress.name,
      sections: ctx.reportInProgress.sections.length,
      theme: ctx.reportInProgress.theme,
      dateRange: ctx.reportInProgress.dateRange?.type
    }
  };
}

async function executeTool(name: string, args: any, ctx: ToolContext): Promise<any> {
  console.log(`[Tool] Executing: ${name}`, args);
  
  switch (name) {
    case "explore_field":
      return executeExploreField(args, ctx);
    case "preview_grouping":
      return executePreviewGrouping(args, ctx);
    case "get_customer_context":
      return executeGetCustomerContext(args, ctx);
    case "suggest_visualization":
      return executeSuggestVisualization(args, ctx);
    case "add_report_section":
      return executeAddReportSection(args, ctx);
    case "modify_report_section":
      return executeModifyReportSection(args, ctx);
    case "set_report_metadata":
      return executeSetReportMetadata(args, ctx);
    case "finalize_report":
      return executeFinalizeReport(args, ctx);
    default:
      return { success: false, error: `Unknown tool: ${name}` };
  }
}

function buildSystemPrompt(
  customerId: string,
  isAdmin: boolean,
  schemaFields: any[],
  customerName?: string
): string {
  const accessibleFields = schemaFields.filter((f: any) => isAdmin || !f.adminOnly);

  const dimensionFields = accessibleFields
    .filter((f: any) => f.isGroupable && !f.isAggregatable)
    .map((f: any) => f.name);

  const measureFields = accessibleFields
    .filter((f: any) => f.isAggregatable)
    .map((f: any) => f.name);

  return `You are an expert logistics data analyst for Go Rocket Shipping. You help users understand their shipping data and build insightful reports.

## YOUR EXPERTISE

You have deep knowledge of freight, logistics, and shipping operations. USE THIS KNOWLEDGE:
- You understand LTL, FTL, freight terminology, carrier operations, shipping lanes
- You understand business concepts like "cost to serve", "expensive lanes", "freight spend"
- When customers say "cost" or "spend" - they mean what THEY pay for freight (the retail field)
- Apply common sense interpretation before asking clarifying questions

## CRITICAL: Understanding Customer "Cost" Language

When customers say "cost", "cost to serve", "spend", "expensive", or "how much":
- They mean **retail** (what they pay for shipping) - THIS IS ACCESSIBLE
- They do NOT mean carrier_cost (internal Go Rocket data) - this is restricted

**CORRECT interpretations:**
- "Which states cost the most to serve?" -> avg(retail) by destination_state, sorted DESC
- "Most expensive lanes" -> origin/destination by retail
- "Freight spend by carrier" -> sum(retail) by carrier_name
- "What's my average shipping cost?" -> avg(retail)
- "Cost breakdown" -> retail analysis

**DO NOT** say "cost data isn't available" for these questions - use the retail field!

## Your Approach
1. **Interpret confidently**: Use your logistics expertise to understand what they mean
2. **Map to available fields**: Find the right database fields for their intent
3. **Investigate before building**: Use explore_field to check data quality
4. **Preview groupings**: Use preview_grouping to validate combinations
5. **Build incrementally**: Add report sections one at a time
6. **Be conversational**: Explain what you're doing
7. **Finalize when done**: Call finalize_report when complete

## Access Level: ${isAdmin ? "ADMIN" : "CUSTOMER"}
${isAdmin
  ? "You have full access to all fields including cost, margin, and carrier_cost."
  : `**Restricted internal fields:** cost, margin, carrier_cost, carrier_pay (Go Rocket's internal data)
**Available for customer spend analysis:** retail (what customers pay)

Only explain restrictions if customer explicitly asks about Go Rocket's internal costs or margins.
For normal "cost" questions, USE THE RETAIL FIELD.`
}

## Available Fields

**Dimensions (for grouping):**
${dimensionFields.slice(0, 15).join(", ")}${dimensionFields.length > 15 ? "..." : ""}

**Measures (for aggregation):**
${measureFields.join(", ")}

## Common Mappings (for customer requests)
- "cost", "spend", "freight cost" -> use retail field
- "expensive", "most costly" -> sort by retail DESC
- "cost per shipment" -> avg(retail)
- "total spend" -> sum(retail)
- "cost to serve by state" -> avg(retail) grouped by destination_state

## Section Types
- **hero**: Large single metric card
- **stat-row**: Row of 2-4 metric cards
- **chart**: Visualization (bar, line, pie, area, treemap, radar)
- **table**: Data table with sortable columns
- **map**: Geographic visualization (choropleth, flow, cluster)
- **header**: Section divider with title

## Guidelines
- Check field coverage before using (use explore_field)
- If coverage < 50%, warn the user and suggest alternatives
- If grouping produces > 20 groups, suggest filtering or different grouping
- For time-based analysis, use line charts
- For comparisons, use bar charts
- For proportions with few categories, use pie charts
- Always set a meaningful report name with set_report_metadata
${customerName ? `\n## Current Customer: ${customerName}` : ""}
`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RequestBody = await req.json();
    const { prompt, conversationHistory, customerId, isAdmin, customerName, conversationState } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[AI] Request from customer ${customerId}, admin: ${isAdmin}`);

    const { data: columns } = await supabase
      .from("schema_columns")
      .select("*")
      .eq("view_name", "shipment_report_view")
      .order("ordinal_position");

    const { data: fieldContext } = await supabase
      .from("field_business_context")
      .select("*");

    const contextMap = new Map();
    (fieldContext || []).forEach((fc: any) => contextMap.set(fc.field_name, fc));

    const ADMIN_ONLY = ["cost", "margin", "margin_percent", "carrier_cost", "cost_per_mile", "carrier_pay"];
    
    const schemaFields = (columns || []).map((col: any) => {
      const ctx = contextMap.get(col.column_name);
      return {
        name: col.column_name,
        displayName: col.column_name.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        dataType: col.data_type,
        isGroupable: col.is_groupable ?? true,
        isAggregatable: col.is_aggregatable ?? false,
        businessContext: ctx?.business_description,
        adminOnly: ADMIN_ONLY.includes(col.column_name) || ctx?.admin_only
      };
    });

    const toolCtx: ToolContext = {
      supabase,
      customerId,
      isAdmin,
      schemaFields,
      reportInProgress: conversationState?.reportInProgress || null
    };

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });
    const systemPrompt = buildSystemPrompt(customerId, isAdmin, schemaFields, customerName);

    const messages: any[] = conversationHistory.map((m) => ({
      role: m.role,
      content: m.content
    }));
    messages.push({ role: "user", content: prompt });

    let finalReport = null;
    let finalMessage = "";
    let toolsUsed: string[] = [];
    let rounds = 0;
    const maxRounds = 8;

    while (rounds < maxRounds) {
      rounds++;
      console.log(`[AI] Round ${rounds}`);

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        tools: TOOLS as any,
        messages
      });

      const toolUses = response.content.filter((b) => b.type === "tool_use");
      const textContent = response.content.find((b) => b.type === "text");

      if (textContent && textContent.type === "text") {
        finalMessage = textContent.text;
      }

      if (toolUses.length === 0) {
        console.log(`[AI] No tool calls, finishing`);
        break;
      }

      const toolResults: any[] = [];
      for (const toolUse of toolUses) {
        if (toolUse.type !== "tool_use") continue;
        
        if (!toolsUsed.includes(toolUse.name)) {
          toolsUsed.push(toolUse.name);
        }

        const result = await executeTool(toolUse.name, toolUse.input, toolCtx);
        
        if (toolUse.name === "finalize_report" && result.isComplete) {
          finalReport = result.report;
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result)
        });
      }

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });

      if (finalReport) {
        console.log(`[AI] Report finalized, stopping`);
        break;
      }
    }

    if (!finalReport && toolCtx.reportInProgress?.sections?.length > 0) {
      finalReport = toolCtx.reportInProgress;
      finalReport.customerId = customerId;
    }

    console.log(`[AI] Complete. Tools used: ${toolsUsed.join(", ")}. Report: ${!!finalReport}`);

    try {
      await supabase.from("ai_report_audit").insert({
        customer_id: parseInt(customerId, 10),
        user_prompt: prompt,
        generated_report: finalReport,
        ai_response: finalMessage.slice(0, 5000),
        success: !!finalReport,
        context_used: { toolsUsed, rounds, customerName }
      });
    } catch (auditError) {
      console.error("Audit log failed:", auditError);
    }

    return new Response(
      JSON.stringify({
        report: finalReport,
        message: finalMessage || (finalReport 
          ? "I've created your report. Let me know if you'd like any changes!"
          : "How can I help you analyze your shipping data?"),
        toolsUsed,
        conversationState: { reportInProgress: toolCtx.reportInProgress }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Generate report error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        report: null,
        message: "Sorry, I encountered an error. Please try again."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});