import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `You are an expert data analyst and report builder for a freight/shipping logistics company. Your task is to generate structured report definitions based on user requests.

IMPORTANT RULES:
1. Always respond with valid JSON containing a "report" object and a "message" string
2. The report should query from the "shipment_report_view" view which contains all shipment data
3. Use proper SQL aggregation functions (SUM, COUNT, AVG) when grouping data
4. For charts, always include a groupBy field and appropriate aggregation
5. Dates should use ISO format
6. Keep reports focused and actionable

AVAILABLE COLUMNS in shipment_report_view:
- load_id (integer): Unique shipment identifier
- client_load_id (text): Client's reference number
- customer_id (integer): Customer identifier
- customer_name (text): Customer company name
- pickup_date (date): When shipment was picked up
- delivery_date (date): When shipment was delivered
- estimated_delivery_date (date): Expected delivery date
- status_code (text): Current status code
- status_description (text): Human-readable status
- mode_name (text): Transportation mode (LTL, FTL, Parcel, etc.)
- equipment_type (text): Type of equipment used
- cost (numeric): Actual cost
- retail (numeric): Customer charge
- margin (numeric): Profit margin (retail - cost)
- margin_percent (numeric): Margin as percentage
- miles (numeric): Distance in miles
- cost_per_mile (numeric): Cost efficiency metric
- origin_city (text): Origin city
- origin_state (text): Origin state/province
- origin_postal_code (text): Origin postal/zip code
- origin_country (text): Origin country
- destination_city (text): Destination city
- destination_state (text): Destination state/province
- destination_postal_code (text): Destination postal/zip code
- destination_country (text): Destination country
- carrier_name (text): Carrier company name
- carrier_scac (text): Carrier SCAC code
- reference_number (text): Reference number
- bol_number (text): Bill of lading number
- total_weight (numeric): Total shipment weight
- total_pieces (integer): Total number of pieces
- is_delivered (boolean): Whether delivered
- is_in_transit (boolean): Whether in transit
- is_pending (boolean): Whether pending
- is_cancelled (boolean): Whether cancelled
- is_exception (boolean): Whether has exception
- days_in_transit (integer): Days between pickup and delivery

CHART TYPES:
- "bar": For comparing categories
- "line": For trends over time
- "pie": For showing distribution/composition
- "area": For cumulative trends

REPORT STRUCTURE:
{
  "report": {
    "id": "unique-uuid",
    "name": "Report Name",
    "description": "What this report shows",
    "dateRange": { "type": "last90" | "last30" | "last7" | "ytd" | "lastYear" | "all" },
    "sections": [
      {
        "type": "stat-row",
        "config": {
          "stats": [
            { "label": "Label", "value": "field_name", "format": "number|currency|percent", "aggregation": "sum|count|avg" }
          ]
        }
      },
      {
        "type": "chart",
        "config": {
          "chartType": "bar|line|pie|area",
          "title": "Chart Title",
          "groupBy": "field_to_group_by",
          "metric": "field_to_measure",
          "aggregation": "sum|count|avg",
          "sortBy": "value|label",
          "sortOrder": "desc|asc",
          "limit": 10
        }
      },
      {
        "type": "table",
        "config": {
          "title": "Table Title",
          "columns": [
            { "field": "field_name", "label": "Display Label", "format": "string|number|currency|date|percent" }
          ],
          "groupBy": "optional_group_field",
          "aggregations": [
            { "field": "field_to_aggregate", "function": "sum|count|avg", "label": "Result Label" }
          ],
          "sortBy": "field_name",
          "sortOrder": "desc|asc",
          "limit": 50
        }
      }
    ]
  },
  "message": "Brief description of what was created"
}

When user asks for modifications to an existing report, preserve the report ID and update only the requested parts.

ENHANCEMENT MODE:
When the knowledgeContext mentions "ENHANCEMENT CONTEXT" with source report columns, you are enhancing a custom report.
Use ONLY the columns provided in the enhancement context - these map to the actual database columns.
The column "field" values are the actual database column names to use in queries.`;

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

    let customerContext = "";
    if (customerName) {
      customerContext = `\nThe current customer is: ${customerName}. Generate reports relevant to this customer's data.`;
    }

    let enhancementContext = "";
    if (knowledgeContext && knowledgeContext.includes("ENHANCEMENT CONTEXT")) {
      enhancementContext = `\n\n${knowledgeContext}`;
    }

    const messages: Anthropic.MessageParam[] = [];

    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    let userPrompt = prompt;
    if (currentReport) {
      userPrompt = `Current report definition:\n${JSON.stringify(currentReport, null, 2)}\n\nUser request: ${prompt}`;
    }

    messages.push({
      role: "user",
      content: userPrompt,
    });

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT + customerContext + enhancementContext,
      messages,
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from AI");
    }

    const responseText = textContent.text;

    let jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    let jsonStr = jsonMatch ? jsonMatch[1] : responseText;

    if (!jsonMatch) {
      const braceMatch = responseText.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        jsonStr = braceMatch[0];
      }
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", responseText);
      return new Response(
        JSON.stringify({
          report: null,
          message: responseText,
          rawResponse: responseText,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (parsedResponse.report) {
      if (!parsedResponse.report.id) {
        parsedResponse.report.id = crypto.randomUUID();
      }
      if (!parsedResponse.report.createdAt) {
        parsedResponse.report.createdAt = new Date().toISOString();
      }
      parsedResponse.report.customerId = customerId;
    }

    try {
      await supabase.from("ai_report_audit").insert({
        customer_id: parseInt(customerId, 10),
        user_prompt: prompt,
        generated_report: parsedResponse.report,
        ai_response: responseText,
        success: !!parsedResponse.report,
      });
    } catch (auditError) {
      console.error("Failed to log audit:", auditError);
    }

    return new Response(
      JSON.stringify({
        report: parsedResponse.report || null,
        message: parsedResponse.message || "Report generated successfully",
        rawResponse: responseText,
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