# PHASE 8A: AI Edge Function Upgrade

This phase upgrades the edge function to use all the infrastructure you've built. It adds:
- Knowledge base integration
- Customer profiles and terminology
- Access control (prompt + validation)
- Data exploration behavior
- Learning capture
- Output validation

**This is the critical missing piece that makes your AI system fully functional.**

---

## File 1: Upgraded Edge Function

### Replace: supabase/functions/generate-report/index.ts

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

// =============================================================================
// CORS HEADERS
// =============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// =============================================================================
// TYPES
// =============================================================================

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
  source: "explicit" | "inferred";
}

// =============================================================================
// ADMIN-ONLY FIELDS
// =============================================================================

const ADMIN_ONLY_FIELDS = ["cost", "margin", "margin_percent", "carrier_cost", "cost_per_mile"];

// =============================================================================
// SCHEMA COMPILER
// =============================================================================

async function compileSchemaContext(
  supabase: SupabaseClient,
  customerId: string
): Promise<{ fields: SchemaField[]; dataProfile: DataProfile }> {
  // Get schema columns
  const { data: columns } = await supabase
    .from("schema_columns")
    .select("*")
    .eq("view_name", "shipment_report_view")
    .order("ordinal_position");

  // Get field business context
  const { data: fieldContext } = await supabase
    .from("field_business_context")
    .select("*");

  // Get data profile
  let dataProfile: DataProfile = {
    totalShipments: 0,
    stateCount: 0,
    carrierCount: 0,
    monthsOfData: 0,
    topStates: [],
    topCarriers: [],
    avgShipmentsPerDay: 0,
  };

  try {
    const { data: profileData } = await supabase.rpc("get_customer_data_profile", {
      p_customer_id: customerId,
    });
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

  // Build context map
  const contextMap = new Map<string, any>();
  (fieldContext || []).forEach((fc: any) => contextMap.set(fc.field_name, fc));

  // Merge columns with context
  const fields: SchemaField[] = (columns || []).map((col: any) => {
    const context = contextMap.get(col.column_name);
    return {
      name: col.column_name,
      type: col.data_type,
      isGroupable: col.is_groupable ?? true,
      isAggregatable: col.is_aggregatable ?? false,
      businessContext: context?.business_description,
      aiInstructions: context?.ai_instructions,
      adminOnly: ADMIN_ONLY_FIELDS.includes(col.column_name) || context?.admin_only,
    };
  });

  return { fields, dataProfile };
}

function formatSchemaForPrompt(
  fields: SchemaField[],
  dataProfile: DataProfile,
  isAdmin: boolean
): string {
  let output = "## AVAILABLE DATA FIELDS\n\n";
  output += "You can ONLY use these fields in reports. Do NOT reference any field not listed here.\n\n";
  output += "| Field | Type | Group By | Aggregate | Description |\n";
  output += "|-------|------|----------|-----------|-------------|\n";

  for (const field of fields) {
    if (!isAdmin && field.adminOnly) continue;

    const groupable = field.isGroupable ? "✓" : "";
    const aggregatable = field.isAggregatable ? "SUM/AVG" : "COUNT";
    const description = field.businessContext || "";
    const adminNote = field.adminOnly ? " (ADMIN)" : "";

    output += `| ${field.name} | ${field.type} | ${groupable} | ${aggregatable} | ${description}${adminNote} |\n`;
  }

  output += "\n## CUSTOMER DATA PROFILE\n\n";
  output += `- **Total Shipments:** ${dataProfile.totalShipments.toLocaleString()}\n`;
  output += `- **Ships to:** ${dataProfile.stateCount} states`;
  if (dataProfile.hasCanadaData) output += " (including Canadian provinces)";
  output += "\n";
  output += `- **Uses:** ${dataProfile.carrierCount} carriers\n`;
  output += `- **Data History:** ${dataProfile.monthsOfData} months\n`;
  output += `- **Volume:** ~${dataProfile.avgShipmentsPerDay.toFixed(1)} shipments/day\n`;

  if (dataProfile.topStates.length > 0) {
    output += `- **Top Destinations:** ${dataProfile.topStates.slice(0, 5).join(", ")}\n`;
  }
  if (dataProfile.topCarriers.length > 0) {
    output += `- **Top Carriers:** ${dataProfile.topCarriers.slice(0, 3).join(", ")}\n`;
  }

  return output;
}

// =============================================================================
// KNOWLEDGE COMPILER
// =============================================================================

async function compileKnowledgeContext(
  supabase: SupabaseClient,
  customerId: string,
  isAdmin: boolean
): Promise<{ terms: TermDefinition[]; products: ProductMapping[] }> {
  // Fetch unified knowledge
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
      key: t.key,
      label: t.label,
      definition: t.definition || "",
      aiInstructions: t.ai_instructions,
      scope: t.scope as "global" | "customer",
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

function formatKnowledgeForPrompt(
  terms: TermDefinition[],
  products: ProductMapping[]
): string {
  let output = "## KNOWLEDGE BASE\n\n";

  const customerTerms = terms.filter((t) => t.scope === "customer");
  const globalTerms = terms.filter((t) => t.scope === "global");

  if (customerTerms.length > 0) {
    output += "### Customer Terminology (USE THESE)\n";
    output += "When the customer uses these terms, this is what they mean:\n\n";
    for (const term of customerTerms) {
      const aliases = term.aliases?.length ? ` (also: ${term.aliases.join(", ")})` : "";
      output += `- **"${term.key}"**${aliases}: ${term.definition}\n`;
      if (term.aiInstructions) output += `  - AI Note: ${term.aiInstructions}\n`;
    }
    output += "\n";
  }

  if (globalTerms.length > 0) {
    output += "### Industry Terms\n";
    for (const term of globalTerms.slice(0, 15)) {
      output += `- **${term.key}**: ${term.definition}\n`;
    }
    output += "\n";
  }

  if (products.length > 0) {
    output += "### Product Categories\n";
    output += "When user asks about products, use these categorizations:\n";
    for (const product of products) {
      output += `- **${product.name}**: Search \`${product.searchField}\` for: ${product.keywords.join(", ")}\n`;
    }
    output += "\n";
  }

  return output;
}

// =============================================================================
// CUSTOMER PROFILE
// =============================================================================

async function getCustomerProfile(
  supabase: SupabaseClient,
  customerId: string
): Promise<CustomerProfile | null> {
  try {
    const { data: profile } = await supabase
      .from("customer_intelligence_profiles")
      .select("*")
      .eq("customer_id", parseInt(customerId))
      .single();

    if (!profile) return null;

    // Get learned terminology
    const { data: learnedTerms } = await supabase
      .from("ai_knowledge")
      .select("key, label, definition, source")
      .eq("scope", "customer")
      .eq("customer_id", customerId)
      .eq("knowledge_type", "term")
      .eq("is_active", true);

    const adminTerminology = (profile.terminology || []).map((t: any) => ({
      term: t.term || t.key,
      means: t.means || t.definition,
      source: "admin",
    }));

    const learnedTerminology = (learnedTerms || []).map((t: any) => ({
      term: t.key,
      means: t.definition || t.label,
      source: "learned",
    }));

    return {
      priorities: profile.priorities || [],
      products: profile.products || [],
      keyMarkets: profile.key_markets || [],
      terminology: [...adminTerminology, ...learnedTerminology],
      benchmarkPeriod: profile.benchmark_period,
      accountNotes: profile.account_notes,
      preferences: profile.preferences || {},
    };
  } catch (e) {
    console.error("Failed to get customer profile:", e);
    return null;
  }
}

function formatProfileForPrompt(profile: CustomerProfile): string {
  let output = "## CUSTOMER INTELLIGENCE\n\n";
  output += "Use this context to personalize your responses:\n\n";

  if (profile.priorities.length > 0) {
    output += `**Customer Priorities:** ${profile.priorities.join(", ")}\n`;
    output += "Frame insights in terms of these priorities when relevant.\n\n";
  }

  if (profile.keyMarkets.length > 0) {
    output += `**Key Markets:** ${profile.keyMarkets.join(", ")}\n`;
    output += "These are their most important regions.\n\n";
  }

  if (profile.terminology.length > 0) {
    output += "**Customer Terminology:**\n";
    for (const term of profile.terminology) {
      output += `- "${term.term}" → ${term.means}\n`;
    }
    output += "\nUse their terminology when possible.\n\n";
  }

  if (profile.products.length > 0) {
    output += "**Product Categories:**\n";
    for (const product of profile.products) {
      output += `- **${product.name}**: Search \`${product.field}\` for: ${product.keywords.join(", ")}\n`;
    }
    output += "\n";
  }

  const chartPref = profile.preferences?.chartTypes;
  if (chartPref) {
    const entries = Object.entries(chartPref).sort((a, b) => (b[1] as number) - (a[1] as number));
    if (entries.length > 0 && (entries[0][1] as number) > 0.5) {
      output += `**Note:** This customer often prefers ${entries[0][0]} charts.\n`;
    }
  }

  if (profile.accountNotes) {
    output += `\n**Account Notes:** ${profile.accountNotes}\n`;
  }

  return output;
}

// =============================================================================
// ACCESS CONTROL
// =============================================================================

function getAccessControlPrompt(isAdmin: boolean): string {
  if (isAdmin) {
    return `## ACCESS LEVEL: ADMIN

You have full access to all data fields including:
- cost (carrier cost)
- margin (profit margin)
- margin_percent
- cost_per_mile
- All financial metrics

You can build reports using any available field.`;
  }

  return `## ACCESS LEVEL: CUSTOMER

RESTRICTED FIELDS - DO NOT USE:
- cost
- margin
- margin_percent
- cost_per_mile
- carrier_cost

These fields contain sensitive financial data. If the user asks about:
- Cost, margin, or profit → Explain that cost data is not available in their view
- Offer alternatives: revenue/retail trends, carrier performance by volume, shipment counts

NEVER include restricted fields in any report section, calculated field, or filter.`;
}

function validateAccessControl(
  report: any,
  isAdmin: boolean
): { valid: boolean; violations: string[] } {
  if (isAdmin) return { valid: true, violations: [] };

  const violations: string[] = [];
  const reportStr = JSON.stringify(report).toLowerCase();

  for (const field of ADMIN_ONLY_FIELDS) {
    if (reportStr.includes(`"${field}"`) || reportStr.includes(`'${field}'`)) {
      violations.push(`Report contains restricted field: ${field}`);
    }
  }

  return { valid: violations.length === 0, violations };
}

function sanitizeReport(report: any, isAdmin: boolean): any {
  if (isAdmin) return report;

  const sanitized = JSON.parse(JSON.stringify(report));

  // Remove sections that use restricted fields
  if (sanitized.sections && Array.isArray(sanitized.sections)) {
    sanitized.sections = sanitized.sections.filter((section: any) => {
      const sectionStr = JSON.stringify(section).toLowerCase();
      return !ADMIN_ONLY_FIELDS.some(
        (field) => sectionStr.includes(`"${field}"`) || sectionStr.includes(`'${field}'`)
      );
    });
  }

  // Remove restricted calculated fields
  if (sanitized.calculatedFields && Array.isArray(sanitized.calculatedFields)) {
    sanitized.calculatedFields = sanitized.calculatedFields.filter((calc: any) => {
      const calcStr = JSON.stringify(calc).toLowerCase();
      return !ADMIN_ONLY_FIELDS.some(
        (field) => calcStr.includes(`"${field}"`) || calcStr.includes(`'${field}'`)
      );
    });
  }

  return sanitized;
}

// =============================================================================
// DATA EXPLORATION BEHAVIOR
// =============================================================================

const DATA_EXPLORATION_BEHAVIOR = `## DATA EXPLORATION BEHAVIOR

When you receive DATA EXPLORATION RESULTS in the context:

1. **Check field coverage before recommending fields**
   - Fields with <50% coverage may not have useful data
   - Always prefer fields with higher coverage

2. **Use the best field for the job**
   - For item counts: Check piece_count, quantity, number_of_pallets - use the one with highest coverage
   - For products: Check description, commodity_description - use the one with most unique values

3. **Show sample values when categorizing**
   - Before building categorization rules, show the user sample values
   - Ask what categories they want based on the actual data

4. **Confirm approach before building**
   - If coverage is low, warn the user
   - If there are multiple options, ask which they prefer

5. **Dynamic date ranges**
   - Always use dynamic date range types (last30, last90, ytd, etc.)
   - Never use fixed dates - the report should show current data when viewed`;

// =============================================================================
// LEARNING BEHAVIOR
// =============================================================================

const LEARNING_BEHAVIOR = `## LEARNING FROM CONVERSATIONS

When you learn something new about the customer's terminology or preferences:

1. **Terminology Learning**
   If the user defines a term, output a learning flag:
   
   <learning_flag>
   term: CG
   user_said: When I say CG, I mean Cargoglide products
   ai_understood: CG refers to Cargoglide truck bed products
   confidence: high
   maps_to_field: description
   </learning_flag>

2. **Product Category Learning**
   If the user defines product categories:
   
   <learning_flag>
   term: Drawers
   user_said: Drawers are our Decked drawer systems
   ai_understood: Decked drawer systems for truck beds
   confidence: high
   suggested_category: product
   </learning_flag>

3. **Correction Detection**
   If the user corrects you, acknowledge and learn:
   
   <learning_flag>
   term: [corrected term]
   user_said: No, that's not what I meant
   ai_understood: [your correction]
   confidence: medium
   </learning_flag>

Learning flags help the system remember customer preferences across conversations.`;

// =============================================================================
// REPORT STRUCTURE
// =============================================================================

const REPORT_STRUCTURE = `## REPORT GENERATION

When generating a report, respond with:
1. A brief conversational message explaining what you created
2. The report JSON in a code block

### Report Structure
\`\`\`json
{
  "name": "Report Title",
  "description": "Brief description",
  "dateRange": { "type": "last90" },
  "theme": "blue",
  "calculatedFields": [...],
  "sections": [...]
}
\`\`\`

### Date Range Types
- "last7": Last 7 days
- "last30": Last 30 days  
- "last90": Last 90 days (default)
- "last6months": Last 6 months
- "ytd": Year to date
- "lastYear": Last 12 months
- "all": All available data

### Section Types
- **hero**: Large metric card
- **stat-row**: Row of 2-4 metrics
- **chart**: Visualization (bar, line, pie, area, treemap, radar, funnel, heatmap)
- **table**: Data table with columns
- **map**: Geographic visualization (choropleth, flow, cluster)
- **category-grid**: Category breakdown cards
- **header**: Section divider

### Chart Config
\`\`\`json
{
  "type": "chart",
  "title": "Revenue by Carrier",
  "config": {
    "chartType": "bar",
    "title": "Revenue by Carrier",
    "groupBy": "carrier_name",
    "metric": { "field": "retail", "aggregation": "sum" },
    "sortBy": "value",
    "sortOrder": "desc",
    "limit": 10
  }
}
\`\`\`

### Calculated Fields
Define at report level, then reference by name:
\`\`\`json
"calculatedFields": [{
  "name": "revenue_per_shipment",
  "label": "Revenue/Shipment",
  "formula": "divide",
  "fields": ["retail", "load_id"],
  "aggregations": ["sum", "count"],
  "format": "currency"
}]
\`\`\`

### Categorization (in chart/table sections)
\`\`\`json
{
  "type": "chart",
  "title": "Revenue by Product Category",
  "config": {
    "chartType": "pie",
    "groupBy": "description",
    "categorization": {
      "rules": [
        { "contains": ["cargoglide", "CG"], "category": "Cargoglide" },
        { "contains": ["drawer", "decked"], "category": "Drawers" }
      ],
      "defaultCategory": "Other"
    },
    "metric": { "field": "retail", "aggregation": "sum" }
  }
}
\`\`\`

### Important Rules
1. Only use fields from AVAILABLE DATA FIELDS
2. Define calculated fields at report level before using
3. Respect access control restrictions
4. Use dynamic date ranges, not fixed dates
5. Include clear titles for each section`;

// =============================================================================
// CORE SYSTEM PROMPT
// =============================================================================

const CORE_SYSTEM_PROMPT = `You are an expert logistics data analyst for Go Rocket Shipping. You help users build beautiful, insightful reports from their shipment data.

Your approach:
- Be conversational but efficient
- Ask clarifying questions when requests are ambiguous
- Never guess at what fields or terms mean - ask the user
- Provide insights when you notice patterns
- Suggest next steps after generating reports

When in doubt, ask. When you know what the user wants, build it.`;

// =============================================================================
// LEARNING EXTRACTION
// =============================================================================

function extractLearnings(
  prompt: string,
  response: string,
  conversationHistory: ConversationMessage[]
): LearningExtraction[] {
  const learnings: LearningExtraction[] = [];

  // Check for learning flags in AI response
  const flagMatch = response.match(/<learning_flag>([\s\S]*?)<\/learning_flag>/);
  if (flagMatch) {
    const flagContent = flagMatch[1];
    const lines: Record<string, string> = {};
    
    for (const line of flagContent.trim().split("\n")) {
      const colonIndex = line.indexOf(":");
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        if (key && value) lines[key] = value;
      }
    }

    if (lines.term) {
      learnings.push({
        type: lines.suggested_category === "product" ? "product" : "terminology",
        key: lines.term.toLowerCase().replace(/\s+/g, "_"),
        value: lines.ai_understood || lines.user_said || lines.term,
        confidence: lines.confidence === "high" ? 0.9 : lines.confidence === "low" ? 0.5 : 0.7,
        source: "inferred",
      });
    }
  }

  // Check for explicit terminology in user prompt
  const termPatterns = [
    /when I say ['"]?([^'"]+)['"]?,?\s*I mean (.+)/gi,
    /by ['"]?([^'"]+)['"]?,?\s*I mean (.+)/gi,
    /['"]?([^'"]+)['"]?\s*(?:means|refers to|is)\s+(.+)/gi,
  ];

  const allUserMessages = [
    ...conversationHistory.filter((m) => m.role === "user").map((m) => m.content),
    prompt,
  ].join("\n");

  for (const pattern of termPatterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(allUserMessages)) !== null) {
      const term = match[1]?.trim();
      const meaning = match[2]?.trim();
      if (term && term.length < 50 && meaning) {
        learnings.push({
          type: "terminology",
          key: term.toLowerCase().replace(/\s+/g, "_"),
          value: meaning,
          confidence: 1.0,
          source: "explicit",
        });
      }
    }
  }

  return learnings;
}

async function saveLearnings(
  supabase: SupabaseClient,
  customerId: string,
  learnings: LearningExtraction[]
): Promise<void> {
  for (const learning of learnings) {
    try {
      if (learning.type === "terminology" || learning.type === "product") {
        await supabase.from("ai_knowledge").upsert(
          {
            knowledge_type: learning.type === "terminology" ? "term" : "product",
            key: learning.key,
            label: learning.value,
            definition: learning.value,
            scope: "customer",
            customer_id: customerId,
            source: learning.source === "explicit" ? "learned" : "inferred",
            confidence: learning.confidence,
            needs_review: learning.confidence < 0.8,
            is_active: learning.confidence >= 0.8,
          },
          {
            onConflict: "knowledge_type,key,scope,customer_id",
          }
        );
      }
    } catch (e) {
      console.error("Failed to save learning:", learning, e);
    }
  }
}

// =============================================================================
// OUTPUT VALIDATION
// =============================================================================

const VALID_SECTION_TYPES = ["hero", "stat-row", "category-grid", "chart", "table", "header", "map"];
const VALID_CHART_TYPES = ["bar", "line", "pie", "treemap", "radar", "area", "scatter", "bump", "funnel", "heatmap"];

function validateReportOutput(
  report: any,
  availableFields: string[]
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!report.name || typeof report.name !== "string") {
    errors.push("Report must have a name");
  }

  if (!report.sections || !Array.isArray(report.sections)) {
    errors.push("Report must have a sections array");
    return { valid: false, errors, warnings };
  }

  for (let i = 0; i < report.sections.length; i++) {
    const section = report.sections[i];
    const sectionId = `Section ${i + 1}`;

    if (!section.type || !VALID_SECTION_TYPES.includes(section.type)) {
      errors.push(`${sectionId}: Invalid section type "${section.type}"`);
      continue;
    }

    if (section.type === "chart") {
      const chartType = section.config?.chartType;
      if (chartType && !VALID_CHART_TYPES.includes(chartType)) {
        warnings.push(`${sectionId}: Unknown chart type "${chartType}", defaulting to bar`);
      }
    }

    // Check field references
    const fieldRefs = extractFieldReferences(section.config || {});
    for (const field of fieldRefs) {
      if (!isCalculatedField(field) && !availableFields.includes(field.toLowerCase())) {
        errors.push(`${sectionId}: Unknown field "${field}"`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function extractFieldReferences(config: any): string[] {
  const fields: string[] = [];
  
  if (config.metric?.field) fields.push(config.metric.field);
  if (config.groupBy) fields.push(config.groupBy);
  if (config.secondaryGroupBy) fields.push(config.secondaryGroupBy);

  if (config.metrics && Array.isArray(config.metrics)) {
    for (const m of config.metrics) {
      if (m.field) fields.push(m.field);
    }
  }

  if (config.columns && Array.isArray(config.columns)) {
    for (const col of config.columns) {
      if (col.field) fields.push(col.field);
    }
  }

  return fields;
}

function isCalculatedField(fieldName: string): boolean {
  return fieldName.includes("_per_") || fieldName.startsWith("calc_") || fieldName.startsWith("computed_");
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

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
    const { prompt, conversationHistory, customerId, isAdmin, knowledgeContext, currentReport, customerName } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // =========================================================================
    // BUILD FULL CONTEXT
    // =========================================================================

    console.log(`[AI] Building context for customer ${customerId} (admin: ${isAdmin})`);

    // 1. Schema context
    const { fields: schemaFields, dataProfile } = await compileSchemaContext(supabase, customerId);
    const schemaPrompt = formatSchemaForPrompt(schemaFields, dataProfile, isAdmin);

    // 2. Knowledge context
    const { terms, products } = await compileKnowledgeContext(supabase, customerId, isAdmin);
    const knowledgePrompt = terms.length > 0 || products.length > 0
      ? formatKnowledgeForPrompt(terms, products)
      : "";

    // 3. Customer profile
    const profile = await getCustomerProfile(supabase, customerId);
    const profilePrompt = profile ? formatProfileForPrompt(profile) : "";

    // 4. Access control
    const accessPrompt = getAccessControlPrompt(isAdmin);

    // 5. Build full system prompt
    const systemPromptParts = [
      CORE_SYSTEM_PROMPT,
      accessPrompt,
      schemaPrompt,
      knowledgePrompt,
      profilePrompt,
      DATA_EXPLORATION_BEHAVIOR,
      LEARNING_BEHAVIOR,
      REPORT_STRUCTURE,
    ].filter(Boolean);

    let fullSystemPrompt = systemPromptParts.join("\n\n");

    // 6. Add customer name context
    if (customerName) {
      fullSystemPrompt += `\n\n## CURRENT CUSTOMER\nYou are helping: **${customerName}**\nGenerate reports relevant to their data.`;
    }

    // 7. Add any client-side enhancement context
    if (knowledgeContext) {
      fullSystemPrompt += `\n\n${knowledgeContext}`;
    }

    // 8. Add current report if editing
    if (currentReport) {
      fullSystemPrompt += `\n\n## CURRENT REPORT (EDITING)\n\nThe user is viewing this report. Modify it when asked:\n\n\`\`\`json\n${JSON.stringify(currentReport, null, 2)}\n\`\`\`\n\nFor modifications: Keep sections intact unless specifically asked to change.`;
    }

    console.log(`[AI] System prompt: ${fullSystemPrompt.length} chars, ${terms.length} terms, ${products.length} products`);

    // =========================================================================
    // CALL CLAUDE
    // =========================================================================

    const messages: Anthropic.MessageParam[] = [];

    for (const msg of conversationHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }

    messages.push({ role: "user", content: prompt });

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: fullSystemPrompt,
      messages,
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from AI");
    }

    const responseText = textContent.text;

    // =========================================================================
    // PARSE RESPONSE
    // =========================================================================

    let jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    let jsonStr = jsonMatch ? jsonMatch[1] : "";

    if (!jsonMatch) {
      const braceMatch = responseText.match(/\{[\s\S]*"name"[\s\S]*"sections"[\s\S]*\}/);
      if (braceMatch) {
        jsonStr = braceMatch[0];
      }
    }

    let parsedReport = null;
    let parseError = null;

    if (jsonStr) {
      try {
        parsedReport = JSON.parse(jsonStr);
      } catch (e) {
        parseError = e;
        console.error("Failed to parse AI response:", e);
      }
    }

    // =========================================================================
    // VALIDATE AND SANITIZE
    // =========================================================================

    if (parsedReport) {
      // Add required fields
      if (!parsedReport.id) {
        parsedReport.id = crypto.randomUUID();
      }
      if (!parsedReport.createdAt) {
        parsedReport.createdAt = new Date().toISOString();
      }
      parsedReport.customerId = customerId;

      // Validate output
      const availableFieldNames = schemaFields
        .filter((f) => isAdmin || !f.adminOnly)
        .map((f) => f.name.toLowerCase());

      const validation = validateReportOutput(parsedReport, availableFieldNames);
      
      if (!validation.valid) {
        console.warn("[AI] Validation errors:", validation.errors);
      }

      // Access control validation
      const accessCheck = validateAccessControl(parsedReport, isAdmin);
      if (!accessCheck.valid) {
        console.warn("[AI] Access violations:", accessCheck.violations);
        parsedReport = sanitizeReport(parsedReport, isAdmin);
      }
    }

    // =========================================================================
    // EXTRACT AND SAVE LEARNINGS
    // =========================================================================

    const learnings = extractLearnings(prompt, responseText, conversationHistory);
    if (learnings.length > 0) {
      console.log(`[AI] Extracted ${learnings.length} learnings`);
      await saveLearnings(supabase, customerId, learnings);
    }

    // =========================================================================
    // AUDIT LOGGING
    // =========================================================================

    try {
      await supabase.from("ai_report_audit").insert({
        customer_id: parseInt(customerId, 10),
        user_prompt: prompt,
        generated_report: parsedReport,
        ai_response: responseText.slice(0, 5000),
        success: !!parsedReport,
        context_used: {
          termsCount: terms.length,
          productsCount: products.length,
          hasProfile: !!profile,
          hasEnhancement: !!knowledgeContext?.includes("CUSTOM REPORT"),
        },
      });
    } catch (auditError) {
      console.error("Failed to log audit:", auditError);
    }

    // =========================================================================
    // RESPONSE
    // =========================================================================

    // Extract message (remove JSON and learning flags)
    const cleanMessage = responseText
      .replace(/```json[\s\S]*?```/g, "")
      .replace(/<learning_flag>[\s\S]*?<\/learning_flag>/g, "")
      .trim();

    return new Response(
      JSON.stringify({
        report: parsedReport || null,
        message: cleanMessage || (parsedReport ? "Report generated successfully" : responseText),
        rawResponse: responseText,
        learnings: learnings.length > 0 ? learnings : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate report error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        report: null,
        message: "Sorry, I encountered an error generating the report.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## What This Upgrade Adds

| Feature | Before | After |
|---------|--------|-------|
| **Knowledge Base** | ❌ Not used | ✅ Fetches terms, products from ai_knowledge |
| **Customer Terminology** | ❌ Not used | ✅ Includes in prompt |
| **Customer Profile** | ❌ Not used | ✅ Priorities, products, preferences |
| **Access Control (Prompt)** | ❌ Basic | ✅ Clear restrictions for customers |
| **Access Control (Validation)** | ❌ None | ✅ Scans output for violations |
| **Access Control (Sanitize)** | ❌ None | ✅ Removes restricted fields |
| **Data Exploration Behavior** | ❌ None | ✅ Instructions for using exploration |
| **Learning Capture** | ❌ None | ✅ Extracts and saves learnings |
| **Output Validation** | ❌ Basic parse | ✅ Validates fields, chart types |
| **Audit Logging** | ⚠️ Basic | ✅ Includes context info |
| **System Prompt** | 122 lines | ~600 lines with full context |

---

## Testing Checklist

After deploying:

### 1. Knowledge Base Integration
- [ ] Create a customer term in ai_knowledge table
- [ ] Ask the AI about that term → Should use the definition
- [ ] Create a product mapping → Should categorize correctly

### 2. Access Control
- [ ] As customer: Ask for "cost by carrier" → Should refuse/suggest alternatives
- [ ] As admin: Ask for "cost by carrier" → Should work
- [ ] Check that generated reports don't contain cost/margin for customers

### 3. Customer Profile
- [ ] Set priorities in customer_intelligence_profiles
- [ ] Ask for a report → Should mention priorities if relevant

### 4. Learning
- [ ] Say "When I say CG, I mean Cargoglide"
- [ ] Check ai_knowledge table → Should have new term
- [ ] In new conversation → AI should know CG

### 5. Data Exploration
- [ ] Ask for "cost per item by product"
- [ ] Should use exploration results to pick best fields

---

## Deployment Notes

1. **No database changes required** - Uses existing tables
2. **No client changes required** - Same API interface
3. **Backward compatible** - Still accepts same request body
4. **Enhanced response** - Now includes `learnings` array

Deploy by replacing the edge function file and running:
```bash
supabase functions deploy generate-report
```

---

# END OF PHASE 8A

This is the critical upgrade that connects your sophisticated client-side architecture to Claude. All the infrastructure you built now gets used.
