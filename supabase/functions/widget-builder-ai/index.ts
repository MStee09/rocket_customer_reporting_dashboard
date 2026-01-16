import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";

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

const SCHEMA_CONTEXT = `
## AVAILABLE TABLES AND FIELDS

### shipment (Primary table for freight data)
Main Fields:
- load_id (integer) - Primary key, unique shipment ID
- customer_id (integer) - Customer this shipment belongs to
- pickup_date (date) - When shipment picked up
- delivery_date (date) - When delivered
- created_date (timestamp) - When record created
- retail (numeric) - Revenue/retail rate (SHOW TO CUSTOMERS)
- cost (numeric) - Carrier cost (ADMIN ONLY - never show to customers)
- target_rate (numeric) - Target rate (ADMIN ONLY)
- weight (numeric) - Total weight in lbs
- origin_city, origin_state, origin_zip (text) - Origin location
- destination_city, destination_state, destination_zip (text) - Destination
- status (text) - Shipment status
- Carrier info is in shipment_carrier table (joined via load_id), NOT directly on shipment

Aggregatable: retail, cost, weight, target_rate
Groupable: customer_id, origin_state, destination_state, status, pickup_date, delivery_date

### shipment_item (Line items - products shipped)
- shipment_id (integer) - FK to shipment.load_id
- description (text) - PRODUCT NAME (e.g., "drawer system", "cargoglide", "toolbox")
- quantity (integer)
- weight (numeric)

CRITICAL: When user asks about "drawer system", "cargoglide", "toolbox", etc.,
they mean shipment_item.description. This requires a JOIN from shipment to shipment_item.

### carrier (Carrier/trucking companies)
- carrier_id (integer) - Primary key
- carrier_name (text) - Name like "FedEx Freight", "XPO Logistics"
- scac (text) - Standard carrier alpha code
- mc_number (text) - Motor carrier number

### customer (Customer companies)
- customer_id (integer) - Primary key
- company_name (text) - Customer company name
- is_active (boolean)

## COMMON QUERIES AND HOW TO BUILD THEM

### "Average cost per shipment by product type"
- visualizationType: "bar"
- xField: "shipment_item.description" (requires join)
- yField: "retail" (or "cost" for admin)
- aggregation: "avg"
- filters: [{ field: "shipment_item.description", operator: "ilike", value: "%drawer%|%cargoglide%|%toolbox%" }]

### "Show shipments by carrier"
- visualizationType: "bar"
- xField: "carrier.carrier_name" (requires join via shipment_carrier table: shipment.load_id -> shipment_carrier.load_id -> shipment_carrier.carrier_id -> carrier.carrier_id)
- yField: "retail"
- aggregation: "sum"

### "Shipments by origin state"
- visualizationType: "bar" or "choropleth"
- xField: "origin_state"
- yField: "load_id"
- aggregation: "count"

### "Revenue over time"
- visualizationType: "line"
- xField: "pickup_date"
- yField: "retail"
- aggregation: "sum"

### "Average weight by destination state"
- visualizationType: "bar"
- xField: "destination_state"
- yField: "weight"
- aggregation: "avg"

## RULES
1. Use exact field names from the schema above
2. For products (drawer system, cargoglide, toolbox), use shipment_item.description
3. For carriers, use carrier.carrier_name
4. Default aggregation is "sum" for money fields, "count" for IDs
5. Revenue = retail, Cost = cost (admin only)
6. When user says "by product" or mentions specific products, filter on shipment_item.description
`;

const SYSTEM_PROMPT = `You are an AI assistant helping configure a Visual Widget Builder for a logistics dashboard.

${SCHEMA_CONTEXT}

## YOUR TASK
Given a user's natural language request, determine the best widget configuration.

## RESPONSE FORMAT
Respond with ONLY a valid JSON object (no markdown, no explanation):
{
  "visualizationType": "bar" | "line" | "pie" | "choropleth" | "table" | "kpi",
  "xField": "field_name or table.field_name",
  "yField": "field_name",
  "aggregation": "sum" | "avg" | "count" | "min" | "max",
  "filters": [
    {"field": "field_name", "operator": "eq|ilike|in|gt|lt", "value": "..."}
  ],
  "summary": "Brief human-readable explanation of what this widget shows",
  "requiresJoin": true | false,
  "joinInfo": "shipment_item or carrier if join needed",
  "limitations": ["Any caveats or limitations"],
  "reasoning": ["Step 1...", "Step 2..."]
}

IMPORTANT:
- For product queries (drawer system, cargoglide, toolbox), use xField: "shipment_item.description"
- For carrier queries, use xField: "carrier.carrier_name"
- Always use real field names from the schema
- Be specific in your summary
- If the request can't be fulfilled, explain why in limitations`;

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
    const { prompt } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ success: false, error: "prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[WidgetBuilderAI] Processing prompt: "${prompt}"`);

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Configure a widget for: "${prompt}"`
        }
      ]
    });

    const textContent = response.content.find(b => b.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error("No text response from AI");
    }

    let config;
    try {
      let jsonText = textContent.text.trim();

      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }

      config = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[WidgetBuilderAI] Failed to parse AI response:', textContent.text);
      throw new Error("AI response was not valid JSON");
    }

    const result = {
      success: true,
      visualizationType: config.visualizationType || 'bar',
      xField: config.xField,
      yField: config.yField,
      aggregation: config.aggregation || 'sum',
      filters: config.filters || [],
      summary: config.summary || 'Widget configured by AI',
      info: config.requiresJoin ? `Requires join to ${config.joinInfo}` : undefined,
      limitations: config.limitations || [],
      reasoning: config.reasoning || [],
      mcpQuery: {
        requiresJoin: config.requiresJoin,
        joinTable: config.joinInfo
      },
      metadata: {
        processingTimeMs: Date.now() - startTime
      }
    };

    console.log(`[WidgetBuilderAI] Success in ${Date.now() - startTime}ms:`, result);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error(`[WidgetBuilderAI] Error:`, error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        visualizationType: 'bar',
        xField: 'origin_state',
        yField: 'retail',
        aggregation: 'sum',
        summary: 'Fallback: Revenue by origin state',
        limitations: ['AI configuration failed, showing default widget']
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});