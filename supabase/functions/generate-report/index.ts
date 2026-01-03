import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { RESTRICTED_FIELDS, isRestrictedField, findRestrictedFieldsInString, getAccessControlPrompt } from "./services/restrictedFields.ts";
import { TokenBudgetService, createBudgetExhaustedResponse } from "./services/tokenBudget.ts";
import { getClaudeCircuitBreaker, createCircuitOpenResponse } from "./services/circuitBreaker.ts";
import { RateLimitService, createRateLimitResponse } from "./services/rateLimit.ts";
import { ContextService } from "./services/contextService.ts";
import { ToolExecutor, LearningExtraction as ToolLearning } from "./services/toolExecutor.ts";

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
  let isAdmin = false;

  try {
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body: RequestBody = await req.json();
    const { prompt, conversationHistory, knowledgeContext, currentReport, useTools = true, sessionId } = body;
    customerId = body.customerId;
    customerName = body.customerName;
    
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

    console.log(`[AI] User: ${userEmail || userId || 'unknown'}, Customer: ${customerId}, Admin: ${isAdmin}, Tools: ${useTools}`);

    const contextService = new ContextService(supabase);
    const context = await contextService.compileContext(customerId, isAdmin);
    const { schemaFields, dataProfile, fieldNames, availableFieldNames, terms, products, customerProfile: profile, prompts } = context;
    const { schema: schemaPrompt, knowledge: knowledgePrompt, profile: profilePrompt, access: accessPrompt } = prompts;

    const toolExecutor = new ToolExecutor(supabase, customerId, isAdmin, availableFieldNames);

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
            tools: AI_TOOLS,
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
          }

          toolExecutions.push(execution);

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