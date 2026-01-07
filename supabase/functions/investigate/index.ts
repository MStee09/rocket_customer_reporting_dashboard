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

interface Visualization {
  id: string;
  type: 'bar' | 'pie' | 'line' | 'stat' | 'table';
  title: string;
  data: unknown;
  config?: Record<string, unknown>;
}

const INVESTIGATION_TOOLS: Anthropic.Tool[] = [
  {
    name: "explore_field",
    description: `Explore a data field to understand its values, distribution, and quality.
Returns: unique values, coverage %, top values with counts, data quality assessment.
Use this to understand what data exists before aggregating.`,
    input_schema: {
      type: "object" as const,
      properties: {
        field_name: { type: "string", description: "Field to explore (e.g., 'carrier_name', 'destination_state', 'mode_name')" },
        sample_size: { type: "number", description: "Number of top values to return (default: 15)" }
      },
      required: ["field_name"]
    }
  },
  {
    name: "preview_aggregation",
    description: `Get aggregated metrics grouped by a dimension with REAL DATA.
Returns: actual aggregated values with counts per group.
Use this for "show me X by Y" type questions.`,
    input_schema: {
      type: "object" as const,
      properties: {
        group_by: { type: "string", description: "Field to group by (e.g., 'carrier_name', 'origin_state')" },
        metric: { type: "string", description: "Field to aggregate (e.g., 'cost', 'retail', 'miles')" },
        aggregation: { type: "string", enum: ["sum", "avg", "count", "countDistinct", "min", "max"], description: "Aggregation type" },
        secondary_group_by: { type: "string", description: "Optional second grouping field for breakdown" },
        limit: { type: "number", description: "Max groups to return (default: 15)" },
        sort: { type: "string", enum: ["desc", "asc"], description: "Sort direction (default: desc)" }
      },
      required: ["group_by", "metric", "aggregation"]
    }
  },
  {
    name: "compare_periods",
    description: `Compare a metric across two time periods to show change.
Returns: values for both periods, absolute change, percent change.
Use for "how has X changed" or "compare this month to last month" questions.`,
    input_schema: {
      type: "object" as const,
      properties: {
        metric: { type: "string", description: "Metric to compare (e.g., 'cost', 'retail')" },
        aggregation: { type: "string", enum: ["sum", "avg", "count", "countDistinct"], description: "How to aggregate" },
        period1: { type: "string", description: "Current period (e.g., 'last30', 'last7', 'last90')" },
        period2: { type: "string", description: "Previous period to compare against (e.g., 'last60', 'last180')" },
        group_by: { type: "string", description: "Optional grouping for breakdown by dimension" }
      },
      required: ["metric", "aggregation", "period1", "period2"]
    }
  },
  {
    name: "detect_anomalies",
    description: `Find anomalies - spikes, drops, outliers, unusual patterns in data.
Returns: list of anomalies with deviation scores and type (high/low).
Use for "what's unusual" or "find problems" type questions.`,
    input_schema: {
      type: "object" as const,
      properties: {
        metric: { type: "string", description: "Metric to analyze for anomalies" },
        group_by: { type: "string", description: "Grouping dimension (e.g., find anomalies per carrier)" },
        sensitivity: { type: "string", enum: ["high", "medium", "low"], description: "Detection sensitivity (high catches more)" }
      },
      required: ["metric"]
    }
  },
  {
    name: "investigate_root_cause",
    description: `Deep dive root cause analysis across multiple dimensions.
Returns: breakdown by carrier, origin, destination, mode to find where issues come from.
Use for "why is X happening" or diagnostic questions.`,
    input_schema: {
      type: "object" as const,
      properties: {
        question: { type: "string", description: "The question to investigate" },
        metric: { type: "string", description: "Primary metric to analyze" },
        filters: { type: "object", description: "Optional filters to narrow scope" },
        max_depth: { type: "number", description: "How many dimensions to analyze (default: 3)" }
      },
      required: ["question", "metric"]
    }
  },
  {
    name: "get_trend",
    description: `Get time-series trend data for a metric.
Returns: data points over time (daily, weekly, or monthly).
Use for "show me trend" or "how has X changed over time" questions.`,
    input_schema: {
      type: "object" as const,
      properties: {
        metric: { type: "string", description: "Metric to trend (e.g., 'cost', 'retail', 'miles')" },
        aggregation: { type: "string", enum: ["sum", "avg", "count"], description: "Aggregation" },
        period: { type: "string", enum: ["daily", "weekly", "monthly"], description: "Time granularity" },
        range: { type: "string", description: "Time range (e.g., 'last30', 'last90', 'last180')" }
      },
      required: ["metric", "aggregation", "period"]
    }
  },
  {
    name: "get_summary_stats",
    description: `Get summary statistics for the customer's data.
Returns: total shipments, total spend, avg cost, top carriers, date range.
Use as a starting point for overview questions.`,
    input_schema: {
      type: "object" as const,
      properties: {
        time_range: { type: "string", description: "Time range (e.g., 'last30', 'last90', 'all')" }
      },
      required: []
    }
  }
];

const DEFAULT_SYSTEM_PROMPT = `You are an expert logistics data analyst. Your job is to investigate shipping data and provide actionable insights.

## APPROACH
1. Understand what the user is asking
2. Form hypotheses about what might be happening
3. Use tools to test hypotheses with REAL DATA
4. Synthesize findings into clear explanations
5. Suggest follow-up questions

## AVAILABLE TOOLS
- explore_field: See what values exist in a field
- preview_aggregation: Get aggregated metrics by dimension
- compare_periods: Compare time periods
- detect_anomalies: Find unusual patterns
- investigate_root_cause: Deep dive into causes
- get_trend: See metrics over time
- get_summary_stats: Get overview statistics

## RESPONSE FORMAT
After investigating:
1. Lead with a direct answer
2. Include key supporting data points
3. Note any caveats
4. Suggest 2-3 follow-up questions

ALWAYS use tools to get real data - never guess at numbers.`;

async function loadSystemPrompt(supabase: SupabaseClient): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('ai_settings')
      .select('setting_value')
      .eq('setting_key', 'investigator_system_prompt')
      .maybeSingle();

    if (error) {
      console.warn('[Investigate] Failed to load custom system prompt:', error.message);
      return DEFAULT_SYSTEM_PROMPT;
    }

    return data?.setting_value || DEFAULT_SYSTEM_PROMPT;
  } catch (err) {
    console.warn('[Investigate] Error loading system prompt:', err);
    return DEFAULT_SYSTEM_PROMPT;
  }
}

function classifyQuestion(question: string): { mode: 'quick' | 'deep' | 'visual'; confidence: number; reason: string } {
  const q = question.toLowerCase();

  const quickPatterns = [
    /^(how many|what('?s| is) the (total|count|number)|count of)/i,
    /^(what|who) (is|are) (the )?(top|best|worst|highest|lowest)/i,
    /simple|quick|fast|just tell me/i
  ];

  const visualPatterns = [
    /show me|visualize|chart|graph|plot|display|breakdown/i,
    /over time|trend|by (month|week|day|year)/i,
    /compare|vs|versus|distribution/i
  ];

  const deepPatterns = [
    /why|how come|explain|analyze|investigate|dig into/i,
    /root cause|problem|issue|anomal/i,
    /understand|figure out|what('?s| is) (happening|going on|wrong)/i
  ];

  for (const pattern of quickPatterns) {
    if (pattern.test(q)) {
      return { mode: 'quick', confidence: 0.8, reason: 'Simple factual question' };
    }
  }

  for (const pattern of visualPatterns) {
    if (pattern.test(q)) {
      return { mode: 'visual', confidence: 0.85, reason: 'Visualization requested' };
    }
  }

  for (const pattern of deepPatterns) {
    if (pattern.test(q)) {
      return { mode: 'deep', confidence: 0.9, reason: 'Analytical investigation needed' };
    }
  }

  if (q.length > 100) {
    return { mode: 'deep', confidence: 0.7, reason: 'Complex question' };
  }

  return { mode: 'deep', confidence: 0.6, reason: 'Default to thorough analysis' };
}

function generateVisualization(toolName: string, toolInput: Record<string, unknown>, result: unknown): Visualization | null {
  const id = crypto.randomUUID();

  if (toolName === 'preview_aggregation' && result && typeof result === 'object') {
    const data = result as { groups?: Array<{ group: string; value: number; count: number }> };
    if (data.groups && data.groups.length > 0) {
      return {
        id,
        type: 'bar',
        title: `${toolInput.metric} by ${toolInput.group_by}`,
        data: data.groups.map(g => ({ name: g.group, value: g.value, count: g.count })),
        config: { metric: toolInput.metric, groupBy: toolInput.group_by }
      };
    }
  }

  if (toolName === 'get_trend' && result && typeof result === 'object') {
    const data = result as { trend?: Array<{ period: string; value: number; count: number }> };
    if (data.trend && data.trend.length > 0) {
      return {
        id,
        type: 'line',
        title: `${toolInput.metric} over time`,
        data: data.trend.map(t => ({ date: t.period, value: t.value })),
        config: { metric: toolInput.metric, period: toolInput.period }
      };
    }
  }

  if (toolName === 'compare_periods' && result && typeof result === 'object') {
    const data = result as {
      period1: { label: string; value: number };
      period2: { label: string; value: number };
      change: { percent: number };
    };
    return {
      id,
      type: 'stat',
      title: `${toolInput.metric} comparison`,
      data: {
        current: data.period1.value,
        previous: data.period2.value,
        changePercent: data.change.percent,
        period1Label: data.period1.label,
        period2Label: data.period2.label
      },
      config: { metric: toolInput.metric }
    };
  }

  if (toolName === 'explore_field' && result && typeof result === 'object') {
    const data = result as { values?: Array<{ value: string; count: number }> };
    if (data.values && data.values.length > 0 && data.values.length <= 10) {
      return {
        id,
        type: 'pie',
        title: `${toolInput.field_name} distribution`,
        data: data.values.map(v => ({ name: v.value, value: v.count })),
        config: { field: toolInput.field_name }
      };
    }
  }

  return null;
}

async function executeToolCall(
  supabase: SupabaseClient,
  customerId: string,
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case 'explore_field': {
      const fieldName = toolInput.field_name as string;
      const sampleSize = (toolInput.sample_size as number) || 15;

      const { data, error } = await supabase.rpc('explore_single_field', {
        p_customer_id: parseInt(customerId, 10),
        p_field_name: fieldName,
        p_sample_size: sampleSize
      });

      if (error) {
        console.error('explore_field error:', error);
        return { error: error.message, values: [] };
      }
      return data || { values: [], total_count: 0 };
    }

    case 'preview_aggregation': {
      const { data, error } = await supabase.rpc('preview_grouping', {
        p_customer_id: parseInt(customerId, 10),
        p_group_by: toolInput.group_by as string,
        p_metric: toolInput.metric as string,
        p_aggregation: toolInput.aggregation as string,
        p_secondary_group_by: toolInput.secondary_group_by as string || null,
        p_limit: (toolInput.limit as number) || 15
      });

      if (error) {
        console.error('preview_aggregation error:', error);
        return { error: error.message, groups: [] };
      }
      return data || { groups: [] };
    }

    case 'compare_periods': {
      const periodDays: Record<string, number> = {
        'last7': 7, 'last30': 30, 'last60': 60, 'last90': 90,
        'last180': 180, 'lastyear': 365
      };
      const days1 = periodDays[(toolInput.period1 as string).toLowerCase()] || 30;
      const days2 = periodDays[(toolInput.period2 as string).toLowerCase()] || 60;

      const { data: period1Data } = await supabase
        .from('shipment_report_view')
        .select(toolInput.metric as string)
        .eq('customer_id', parseInt(customerId, 10))
        .gte('created_date', new Date(Date.now() - days1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      const { data: period2Data } = await supabase
        .from('shipment_report_view')
        .select(toolInput.metric as string)
        .eq('customer_id', parseInt(customerId, 10))
        .gte('created_date', new Date(Date.now() - days2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .lt('created_date', new Date(Date.now() - days1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      const agg = toolInput.aggregation as string;
      const calcValue = (data: any[], field: string, agg: string) => {
        if (!data || data.length === 0) return 0;
        const values = data.map(r => parseFloat(r[field]) || 0).filter(v => !isNaN(v));
        if (values.length === 0) return 0;
        switch (agg) {
          case 'sum': return values.reduce((a, b) => a + b, 0);
          case 'avg': return values.reduce((a, b) => a + b, 0) / values.length;
          case 'count': return data.length;
          case 'countDistinct': return new Set(values).size;
          default: return values.reduce((a, b) => a + b, 0);
        }
      };

      const val1 = calcValue(period1Data || [], toolInput.metric as string, agg);
      const val2 = calcValue(period2Data || [], toolInput.metric as string, agg);
      const changePercent = val2 !== 0 ? ((val1 - val2) / val2) * 100 : 0;

      return {
        period1: { label: toolInput.period1, value: val1, count: period1Data?.length || 0 },
        period2: { label: toolInput.period2, value: val2, count: period2Data?.length || 0 },
        change: { absolute: val1 - val2, percent: changePercent }
      };
    }

    case 'detect_anomalies': {
      const metric = toolInput.metric as string;
      const groupBy = toolInput.group_by as string;

      const { data } = await supabase.rpc('preview_grouping', {
        p_customer_id: parseInt(customerId, 10),
        p_group_by: groupBy || 'carrier_name',
        p_metric: metric,
        p_aggregation: 'sum',
        p_secondary_group_by: null,
        p_limit: 50
      });

      if (!data || !data.groups || data.groups.length < 3) {
        return { anomalies: [], message: 'Not enough data for anomaly detection' };
      }

      const values = data.groups.map((g: any) => g.value);
      const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(values.reduce((sum: number, v: number) => sum + Math.pow(v - mean, 2), 0) / values.length);
      const threshold = toolInput.sensitivity === 'high' ? 1.5 : toolInput.sensitivity === 'low' ? 3 : 2;

      const anomalies = data.groups
        .filter((g: any) => Math.abs(g.value - mean) > threshold * stdDev)
        .map((g: any) => ({
          group: g.group,
          value: g.value,
          deviation: ((g.value - mean) / stdDev).toFixed(2),
          type: g.value > mean ? 'high' : 'low'
        }));

      return { anomalies, stats: { mean, stdDev, threshold } };
    }

    case 'investigate_root_cause': {
      const dimensions = ['carrier_name', 'origin_state', 'destination_state', 'mode_name'];
      const results: Record<string, any> = {};

      for (const dim of dimensions.slice(0, (toolInput.max_depth as number) || 3)) {
        const { data } = await supabase.rpc('preview_grouping', {
          p_customer_id: parseInt(customerId, 10),
          p_group_by: dim,
          p_metric: toolInput.metric as string,
          p_aggregation: 'sum',
          p_secondary_group_by: null,
          p_limit: 10
        });
        results[dim] = data?.groups || [];
      }

      return {
        question: toolInput.question,
        metric: toolInput.metric,
        breakdown_by_dimension: results
      };
    }

    case 'get_trend': {
      const metric = toolInput.metric as string;
      const period = toolInput.period as string;
      const range = (toolInput.range as string) || 'last90';

      const rangeDays: Record<string, number> = {
        'last30': 30, 'last60': 60, 'last90': 90, 'last180': 180, 'lastyear': 365
      };
      const days = rangeDays[range.toLowerCase()] || 90;

      const { data } = await supabase
        .from('shipment_report_view')
        .select(`created_date, ${metric}`)
        .eq('customer_id', parseInt(customerId, 10))
        .gte('created_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('created_date', { ascending: true });

      if (!data || data.length === 0) {
        return { trend: [], message: 'No data found for the specified period' };
      }

      const grouped = new Map<string, number[]>();
      for (const row of data) {
        const date = new Date(row.created_date);
        let key: string;
        if (period === 'daily') key = date.toISOString().split('T')[0];
        else if (period === 'weekly') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(parseFloat(row[metric]) || 0);
      }

      const agg = toolInput.aggregation as string;
      const trend = Array.from(grouped.entries()).map(([period, values]) => {
        let value: number;
        switch (agg) {
          case 'sum': value = values.reduce((a, b) => a + b, 0); break;
          case 'avg': value = values.reduce((a, b) => a + b, 0) / values.length; break;
          case 'count': value = values.length; break;
          default: value = values.reduce((a, b) => a + b, 0);
        }
        return { period, value, count: values.length };
      });

      return { trend };
    }

    case 'get_summary_stats': {
      const timeRange = (toolInput.time_range as string) || 'last90';
      const rangeDays: Record<string, number> = {
        'last30': 30, 'last60': 60, 'last90': 90, 'last180': 180, 'lastyear': 365, 'all': 9999
      };
      const days = rangeDays[timeRange.toLowerCase()] || 90;

      const dateFilter = days < 9999
        ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : '1900-01-01';

      const { data: shipments } = await supabase
        .from('shipment_report_view')
        .select('cost, retail, miles, carrier_name, created_date')
        .eq('customer_id', parseInt(customerId, 10))
        .gte('created_date', dateFilter);

      if (!shipments || shipments.length === 0) {
        return { message: 'No shipments found', stats: {} };
      }

      const totalCost = shipments.reduce((sum, s) => sum + (parseFloat(s.cost) || 0), 0);
      const totalRetail = shipments.reduce((sum, s) => sum + (parseFloat(s.retail) || 0), 0);
      const totalMiles = shipments.reduce((sum, s) => sum + (parseFloat(s.miles) || 0), 0);
      const carriers = new Set(shipments.map(s => s.carrier_name).filter(Boolean));
      const dates = shipments.map(s => s.created_date).filter(Boolean).sort();

      return {
        total_shipments: shipments.length,
        total_cost: totalCost,
        total_retail: totalRetail,
        total_miles: totalMiles,
        avg_cost: totalCost / shipments.length,
        avg_miles: totalMiles / shipments.length,
        unique_carriers: carriers.size,
        date_range: {
          earliest: dates[0],
          latest: dates[dates.length - 1]
        }
      };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
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

    if (!question || !customerId) {
      return new Response(
        JSON.stringify({ success: false, error: "question and customerId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const systemPrompt = await loadSystemPrompt(supabase);

    const classification = classifyQuestion(question);
    const mode = preferences.forceMode || classification.mode;

    console.log(`[Investigate] Mode: ${mode}, Confidence: ${classification.confidence}, Reason: ${classification.reason}`);

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

    const maxTurns = mode === 'quick' ? 3 : mode === 'visual' ? 5 : 8;
    let currentMessages = [...messages];
    let finalAnswer = "";

    for (let turn = 0; turn < maxTurns; turn++) {
      console.log(`[Investigate] Turn ${turn + 1}/${maxTurns}`);

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: mode === 'quick' ? 2048 : 4096,
        system: systemPrompt,
        messages: currentMessages,
        tools: INVESTIGATION_TOOLS,
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

        toolCallCount++;
        console.log(`[Investigate] Tool: ${toolUse.name}`);

        reasoningSteps.push({
          type: 'tool_call',
          content: `Calling ${toolUse.name}`,
          toolName: toolUse.name
        });

        const result = await executeToolCall(
          supabase,
          customerId,
          toolUse.name,
          toolUse.input as Record<string, unknown>
        );

        const viz = generateVisualization(toolUse.name, toolUse.input as Record<string, unknown>, result);
        if (viz) {
          visualizations.push(viz);
        }

        const resultSummary = JSON.stringify(result).slice(0, 400);
        reasoningSteps.push({
          type: 'tool_result',
          content: resultSummary,
          toolName: toolUse.name
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
    const followUpMatch = finalAnswer.match(/follow[- ]?up questions?:?\s*\n([\s\S]*?)(?:\n\n|$)/i);
    if (followUpMatch) {
      const lines = followUpMatch[1].split('\n').filter(l => l.trim());
      for (const line of lines.slice(0, 3)) {
        const cleaned = line.replace(/^[-\d.)\*]+\s*/, '').trim();
        if (cleaned.length > 10) {
          followUpQuestions.push({
            id: crypto.randomUUID(),
            question: cleaned
          });
        }
      }
    }

    if (followUpQuestions.length === 0) {
      const contextualFollowUps = [
        "How does this compare to previous periods?",
        "What's driving these numbers?",
        "Are there any outliers I should know about?"
      ];
      for (const q of contextualFollowUps) {
        followUpQuestions.push({ id: crypto.randomUUID(), question: q });
      }
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
          },
          iterations: currentMessages.length - messages.length
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
          mode: 'deep',
          iterations: 0
        }
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});