import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { RESTRICTED_FIELDS, isRestrictedField, findRestrictedFieldsInString, getAccessControlPrompt } from "./services/restrictedFields.ts";
import { TokenBudgetService, createBudgetExhaustedResponse } from "./services/tokenBudget.ts";

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
  isAdmin: boolean;
  knowledgeContext?: string;
  currentReport?: Record<string, unknown>;
  customerName?: string;
  useTools?: boolean;
  userId?: string;
  userEmail?: string;
  sessionId?: string;
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

const AI_TOOLS: Anthropic.Tool[] = [
  {
    name: "explore_field",
    description: "Explore a data field to understand its values, distribution, and data quality. ALWAYS use this before building reports to verify fields have data.",
    input_schema: {
      type: "object" as const,
      properties: {
        field_name: { type: "string", description: "The field to explore (e.g., 'carrier_name')" },
        sample_size: { type: "number", description: "Number of sample values (default: 10)" }
      },
      required: ["field_name"]
    }
  },
  {
    name: "preview_grouping",
    description: "Preview what a grouping would look like with actual data. Use to validate groupBy fields before adding to reports.",
    input_schema: {
      type: "object" as const,
      properties: {
        group_by: { type: "string", description: "The field to group by" },
        metric: { type: "string", description: "The field to aggregate" },
        aggregation: { type: "string", enum: ["sum", "avg", "count", "countDistinct", "min", "max"], description: "Aggregation type" },
        limit: { type: "number", description: "Number of groups to preview (default: 10)" }
      },
      required: ["group_by", "metric", "aggregation"]
    }
  },
  {
    name: "emit_learning",
    description: "Record something learned about the customer's terminology or preferences.",
    input_schema: {
      type: "object" as const,
      properties: {
        learning_type: { type: "string", enum: ["terminology", "product", "preference"], description: "Type of learning" },
        key: { type: "string", description: "The term or preference key" },
        value: { type: "string", description: "What it means" },
        confidence: { type: "string", enum: ["high", "medium", "low"], description: "Confidence level" },
        maps_to_field: { type: "string", description: "Optional: which database field this relates to" }
      },
      required: ["learning_type", "key", "value", "confidence"]
    }
  },
  {
    name: "finalize_report",
    description: "Finalize and return the report. Call when ready to deliver.",
    input_schema: {
      type: "object" as const,
      properties: {
        report: { type: "object", description: "The complete report definition" },
        summary: { type: "string", description: "Brief conversational summary" }
      },
      required: ["report", "summary"]
    }
  },
  {
    name: "ask_clarification",
    description: "Ask a clarifying question when the request is ambiguous.",
    input_schema: {
      type: "object" as const,
      properties: {
        question: { type: "string", description: "The clarifying question" },
        options: { type: "array", items: { type: "string" }, description: "Optional multiple choice options" }
      },
      required: ["question"]
    }
  }
];

async function executeExploreField(
  supabase: SupabaseClient,
  customerId: string,
  input: { field_name: string; sample_size?: number }
): Promise<unknown> {
  const { field_name, sample_size = 10 } = input;

  try {
    const { data, error } = await supabase.rpc("explore_single_field", {
      p_customer_id: customerId,
      p_field_name: field_name,
      p_sample_size: sample_size
    });

    if (error) return { error: error.message };
    return data || { error: "No data returned" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

async function executePreviewGrouping(
  supabase: SupabaseClient,
  customerId: string,
  input: { group_by: string; metric: string; aggregation: string; limit?: number }
): Promise<unknown> {
  const { group_by, metric, aggregation, limit = 15 } = input;

  try {
    const { data, error } = await supabase.rpc("preview_grouping", {
      p_customer_id: customerId,
      p_group_by: group_by,
      p_metric: metric,
      p_aggregation: aggregation,
      p_limit: limit
    });

    if (error) return { error: error.message };

    const results = data?.results || [];
    const totalGroups = data?.total_groups || 0;

    let quality = "good";
    let warning = null;

    if (totalGroups === 0) {
      quality = "empty";
      warning = "No data found for this grouping";
    } else if (totalGroups > 50) {
      quality = "many_groups";
      warning = `This grouping has ${totalGroups} unique values - consider using top N limit`;
    } else if (totalGroups === 1) {
      quality = "single_group";
      warning = "Only one group found - might not make a useful chart";
    }

    return { ...data, quality, warning };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

async function executeEmitLearning(
  supabase: SupabaseClient,
  customerId: string,
  input: { learning_type: string; key: string; value: string; confidence: string; maps_to_field?: string }
): Promise<LearningExtraction> {
  const confidenceMap: Record<string, number> = { high: 0.9, medium: 0.7, low: 0.5 };

  const learning: LearningExtraction = {
    type: input.learning_type as "terminology" | "product" | "preference",
    key: input.key.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
    value: input.value,
    confidence: confidenceMap[input.confidence] || 0.7,
    source: "tool"
  };

  try {
    await supabase.from("ai_knowledge").upsert(
      {
        knowledge_type: learning.type === "terminology" ? "term" : learning.type,
        key: learning.key,
        label: input.key,
        definition: learning.value,
        scope: "customer",
        customer_id: customerId,
        source: "learned",
        confidence: learning.confidence,
        needs_review: learning.confidence < 0.8,
        is_active: learning.confidence >= 0.8,
        metadata: input.maps_to_field ? { maps_to_field: input.maps_to_field } : null
      },
      { onConflict: "knowledge_type,key,scope,customer_id" }
    );
  } catch (e) {
    console.error("Failed to save learning:", e);
  }

  return learning;
}

function executeFinalizeReport(
  input: { report: unknown; summary: string },
  availableFields: string[],
  isAdmin: boolean,
  customerId: string
): { report: Record<string, unknown>; summary: string; validation: { valid: boolean; errors: string[] } } {
  const report = input.report as Record<string, unknown>;
  const errors: string[] = [];

  if (!report.name) errors.push("Report must have a name");
  if (!report.sections || !Array.isArray(report.sections)) {
    errors.push("Report must have a sections array");
  }

  if (!report.id) report.id = crypto.randomUUID();
  if (!report.createdAt) report.createdAt = new Date().toISOString();
  if (!report.dateRange) report.dateRange = { type: "last90" };
  report.customerId = customerId;

  const sections = (report.sections as unknown[]) || [];
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i] as Record<string, unknown>;
    const config = section.config as Record<string, unknown> | undefined;

    if (config) {
      const groupBy = config.groupBy as string | undefined;
      if (groupBy && !availableFields.includes(groupBy.toLowerCase())) {
        errors.push(`Section ${i + 1}: Unknown field "${groupBy}"`);
      }

      const metric = config.metric as Record<string, unknown> | undefined;
      if (metric?.field && !availableFields.includes((metric.field as string).toLowerCase())) {
        errors.push(`Section ${i + 1}: Unknown metric field "${metric.field}"`);
      }
    }
  }

  if (!isAdmin) {
    const reportStr = JSON.stringify(report).toLowerCase();
    const foundRestricted = findRestrictedFieldsInString(reportStr);
    for (const field of foundRestricted) {
      errors.push(`Report contains restricted field: ${field}`);
    }
  }

  return { report, summary: input.summary, validation: { valid: errors.length === 0, errors } };
}

async function compileSchemaContext(
  supabase: SupabaseClient,
  customerId: string
): Promise<{ fields: SchemaField[]; dataProfile: DataProfile; fieldNames: string[] }> {
  const { data: columns } = await supabase
    .from("schema_columns")
    .select("*")
    .eq("view_name", "shipment_report_view")
    .order("ordinal_position");

  const { data: fieldContext } = await supabase.from("field_business_context").select("*");

  let dataProfile: DataProfile = {
    totalShipments: 0, stateCount: 0, carrierCount: 0, monthsOfData: 0,
    topStates: [], topCarriers: [], avgShipmentsPerDay: 0,
  };

  try {
    const { data: profileData } = await supabase.rpc("get_customer_data_profile", { p_customer_id: customerId });
    if (profileData) {
      dataProfile = {
        totalShipments: profileData.totalShipments || 0,
        stateCount: profileData.stateCount || 0,
        carrierCount: profileData.carrierCount || 0,
        monthsOfData: profileData.monthsOfData || 0,
        topStates: profileData.topStates || [],
        topCarriers: profileData.topCarriers || [],
        avgShipmentsPerDay: profileData.avgShipmentsPerDay || 0,
        hasCanadaData: profileData.hasCanadaData,
      };
    }
  } catch (e) {
    console.error("Error fetching data profile:", e);
  }

  const contextMap = new Map<string, any>();
  (fieldContext || []).forEach((fc: any) => contextMap.set(fc.field_name, fc));

  const fields: SchemaField[] = (columns || []).map((col: any) => {
    const context = contextMap.get(col.column_name);
    return {
      name: col.column_name,
      type: col.data_type,
      isGroupable: col.is_groupable ?? true,
      isAggregatable: col.is_aggregatable ?? false,
      businessContext: context?.business_description,
      aiInstructions: context?.ai_instructions,
      adminOnly: isRestrictedField(col.column_name) || context?.admin_only,
    };
  });

  return { fields, dataProfile, fieldNames: fields.map(f => f.name.toLowerCase()) };
}

function formatSchemaForPrompt(fields: SchemaField[], dataProfile: DataProfile, isAdmin: boolean): string {
  let output = "## AVAILABLE DATA FIELDS\n\n";
  output += "You can ONLY use these fields in reports.\n\n";
  output += "| Field | Type | Group By | Aggregate | Description |\n";
  output += "|-------|------|----------|-----------|-------------|\n";

  for (const field of fields) {
    if (!isAdmin && field.adminOnly) continue;
    const groupable = field.isGroupable ? "yes" : "";
    const aggregatable = field.isAggregatable ? "SUM/AVG" : "COUNT";
    output += `| ${field.name} | ${field.type} | ${groupable} | ${aggregatable} | ${field.businessContext || ""} |\n`;
  }

  output += "\n## CUSTOMER DATA PROFILE\n\n";
  output += `- **Total Shipments:** ${dataProfile.totalShipments.toLocaleString()}\n`;
  output += `- **Ships to:** ${dataProfile.stateCount} states${dataProfile.hasCanadaData ? " (including Canada)" : ""}\n`;
  output += `- **Uses:** ${dataProfile.carrierCount} carriers\n`;
  output += `- **Data History:** ${dataProfile.monthsOfData} months\n`;
  if (dataProfile.topStates.length > 0) output += `- **Top Destinations:** ${dataProfile.topStates.slice(0, 5).join(", ")}\n`;
  if (dataProfile.topCarriers.length > 0) output += `- **Top Carriers:** ${dataProfile.topCarriers.slice(0, 3).join(", ")}\n`;

  return output;
}

async function compileKnowledgeContext(
  supabase: SupabaseClient,
  customerId: string,
  isAdmin: boolean
): Promise<{ terms: TermDefinition[]; products: ProductMapping[] }> {
  const { data: knowledge } = await supabase
    .from("ai_knowledge")
    .select("*")
    .eq("is_active", true)
    .or(`scope.eq.global,and(scope.eq.customer,customer_id.eq.${customerId})`)
    .order("confidence", { ascending: false });

  const allKnowledge = knowledge || [];

  const terms: TermDefinition[] = allKnowledge
    .filter((k: any) => k.knowledge_type === "term")
    .filter((k: any) => isAdmin || k.is_visible_to_customers !== false)
    .map((t: any) => ({
      key: t.key, label: t.label, definition: t.definition || "",
      aiInstructions: t.ai_instructions, scope: t.scope as "global" | "customer",
      aliases: (t.metadata?.aliases as string[]) || [],
    }));

  const products: ProductMapping[] = allKnowledge
    .filter((k: any) => k.knowledge_type === "product")
    .map((p: any) => ({
      name: p.label || p.key,
      keywords: (p.metadata?.keywords as string[]) || [],
      searchField: (p.metadata?.search_field as string) || "description",
    }));

  return { terms, products };
}

function formatKnowledgeForPrompt(terms: TermDefinition[], products: ProductMapping[]): string {
  let output = "## KNOWLEDGE BASE\n\n";

  const customerTerms = terms.filter((t) => t.scope === "customer");
  if (customerTerms.length > 0) {
    output += "### Customer Terminology\n";
    for (const term of customerTerms) {
      const aliases = term.aliases?.length ? ` (also: ${term.aliases.join(", ")})` : "";
      output += `- **"${term.key}"**${aliases}: ${term.definition}\n`;
    }
    output += "\n";
  }

  if (products.length > 0) {
    output += "### Product Categories\n";
    for (const product of products) {
      output += `- **${product.name}**: Search \`${product.searchField}\` for: ${product.keywords.join(", ")}\n`;
    }
  }

  return output;
}

async function getCustomerProfile(supabase: SupabaseClient, customerId: string): Promise<CustomerProfile | null> {
  try {
    const { data: profile } = await supabase
      .from("customer_intelligence_profiles")
      .select("*")
      .eq("customer_id", parseInt(customerId))
      .single();

    if (!profile) return null;

    const { data: learnedTerms } = await supabase
      .from("ai_knowledge")
      .select("key, label, definition, source")
      .eq("scope", "customer")
      .eq("customer_id", customerId)
      .eq("knowledge_type", "term")
      .eq("is_active", true);

    return {
      priorities: profile.priorities || [],
      products: profile.products || [],
      keyMarkets: profile.key_markets || [],
      terminology: [
        ...(profile.terminology || []).map((t: any) => ({ term: t.term || t.key, means: t.means || t.definition, source: "admin" })),
        ...(learnedTerms || []).map((t: any) => ({ term: t.key, means: t.definition || t.label, source: "learned" }))
      ],
      benchmarkPeriod: profile.benchmark_period,
      accountNotes: profile.account_notes,
      preferences: profile.preferences || {},
    };
  } catch (e) {
    return null;
  }
}

function formatProfileForPrompt(profile: CustomerProfile): string {
  let output = "## CUSTOMER INTELLIGENCE\n\n";
  if (profile.priorities.length > 0) output += `**Priorities:** ${profile.priorities.join(", ")}\n\n`;
  if (profile.keyMarkets.length > 0) output += `**Key Markets:** ${profile.keyMarkets.join(", ")}\n\n`;
  if (profile.terminology.length > 0) {
    output += "**Terminology:**\n";
    for (const term of profile.terminology) output += `- "${term.term}" -> ${term.means}\n`;
  }
  return output;
}

const CORE_SYSTEM_PROMPT = `You are an expert logistics data analyst for Go Rocket Shipping. You help users build beautiful, insightful reports from their shipment data.

Your approach:
- Be conversational but efficient
- Ask clarifying questions when requests are ambiguous
- Never guess at what fields or terms mean - ask the user
- Provide insights when you notice patterns`;

const TOOL_BEHAVIOR_PROMPT = `## TOOL USAGE BEHAVIOR

You have tools to help build better reports:

1. **ALWAYS explore data before building reports**
   - Use explore_field to check field coverage and sample values
   - Use preview_grouping to validate aggregations

2. **Learn from the user**
   - When users define terms, use emit_learning to remember

3. **Build incrementally**
   - Gather information first with tools
   - Then finalize_report when ready`;

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

  try {
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body: RequestBody = await req.json();
    const { prompt, conversationHistory, isAdmin, knowledgeContext, currentReport, useTools = true, sessionId } = body;
    customerId = body.customerId;
    customerName = body.customerName;
    
    userId = body.userId;
    userEmail = body.userEmail;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[AI] User: ${userEmail || userId || 'unknown'}, Customer: ${customerId}, Admin: ${isAdmin}, Tools: ${useTools}`);

    const { fields: schemaFields, dataProfile, fieldNames } = await compileSchemaContext(supabase, customerId);
    const schemaPrompt = formatSchemaForPrompt(schemaFields, dataProfile, isAdmin);
    const { terms, products } = await compileKnowledgeContext(supabase, customerId, isAdmin);
    const knowledgePrompt = terms.length > 0 || products.length > 0 ? formatKnowledgeForPrompt(terms, products) : "";
    const profile = await getCustomerProfile(supabase, customerId);
    const profilePrompt = profile ? formatProfileForPrompt(profile) : "";
    const accessPrompt = getAccessControlPrompt(isAdmin);

    const availableFieldNames = schemaFields.filter(f => isAdmin || !f.adminOnly).map(f => f.name.toLowerCase());

    const systemPromptParts = useTools
      ? [CORE_SYSTEM_PROMPT, TOOL_BEHAVIOR_PROMPT, accessPrompt, schemaPrompt, knowledgePrompt, profilePrompt, REPORT_STRUCTURE]
      : [CORE_SYSTEM_PROMPT, accessPrompt, schemaPrompt, knowledgePrompt, profilePrompt, LEGACY_LEARNING_BEHAVIOR, LEGACY_REPORT_STRUCTURE];

    let fullSystemPrompt = systemPromptParts.filter(Boolean).join("\n\n");
    if (customerName) fullSystemPrompt += `\n\n## CURRENT CUSTOMER\nYou are helping: **${customerName}**`;
    if (knowledgeContext) fullSystemPrompt += `\n\n${knowledgeContext}`;
    if (currentReport) fullSystemPrompt += `\n\n## CURRENT REPORT (EDITING)\n\`\`\`json\n${JSON.stringify(currentReport, null, 2)}\n\`\`\``;

    const messages: Anthropic.MessageParam[] = [
      ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
      { role: "user", content: prompt }
    ];

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

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

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8192,
          system: fullSystemPrompt,
          messages: currentMessages,
          tools: AI_TOOLS,
          tool_choice: { type: "auto" }
        });

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

          const toolStartTime = Date.now();
          let result: unknown;

          console.log(`[AI] Tool: ${toolUse.name}`);

          switch (toolUse.name) {
            case "explore_field":
              result = await executeExploreField(supabase, customerId, toolUse.input as any);
              break;
            case "preview_grouping":
              result = await executePreviewGrouping(supabase, customerId, toolUse.input as any);
              break;
            case "emit_learning":
              const learning = await executeEmitLearning(supabase, customerId, toolUse.input as any);
              learnings.push(learning);
              result = { success: true, learning };
              break;
            case "finalize_report":
              const finalized = executeFinalizeReport(toolUse.input as any, availableFieldNames, isAdmin, customerId);
              if (finalized.validation.valid) {
                finalReport = finalized.report;
                finalMessage = finalized.summary;
              }
              result = finalized;
              break;
            case "ask_clarification":
              const input = toolUse.input as { question: string; options?: string[] };
              needsClarification = true;
              clarificationQuestion = input.question;
              clarificationOptions = input.options;
              result = { needsClarification: true };
              break;
            default:
              result = { error: `Unknown tool: ${toolUse.name}` };
          }

          toolExecutions.push({
            toolName: toolUse.name,
            toolInput: toolUse.input as Record<string, unknown>,
            result,
            timestamp: new Date().toISOString(),
            duration: Date.now() - toolStartTime
          });

          toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(result) });
        }

        if (finalReport || needsClarification) break;
        currentMessages.push({ role: "user", content: toolResults });
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

      const inputCost = totalInputTokens * 0.000003;
      const outputCost = totalOutputTokens * 0.000015;
      const totalCost = inputCost + outputCost;

      return new Response(JSON.stringify({
        report: finalReport,
        message: needsClarification ? clarificationQuestion : finalMessage,
        toolExecutions,
        learnings: learnings.length > 0 ? learnings : undefined,
        needsClarification,
        clarificationOptions,
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

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: fullSystemPrompt,
      messages,
    });

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

    const inputCost = response.usage.input_tokens * 0.000003;
    const outputCost = response.usage.output_tokens * 0.000015;
    const totalCost = inputCost + outputCost;

    return new Response(JSON.stringify({
      report: parsedReport,
      message: cleanMessage || (parsedReport ? "Report generated" : responseText),
      learnings: learnings.length > 0 ? learnings : undefined,
      toolExecutions: [],
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