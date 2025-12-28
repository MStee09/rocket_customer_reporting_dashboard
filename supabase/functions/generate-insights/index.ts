import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { customerId, dateRange } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const currentStart = new Date(dateRange.start);
    const currentEnd = new Date(dateRange.end);
    const duration = currentEnd.getTime() - currentStart.getTime();
    const previousStart = new Date(currentStart.getTime() - duration - 86400000);
    const previousEnd = new Date(currentStart.getTime() - 86400000);

    console.log('Fetching insights for customer:', customerId, 'dateRange:', dateRange);

    const { data: currentData, error: currentError } = await supabase
      .from("shipment_report_view")
      .select("retail, mode_name, destination_state, pickup_date")
      .eq("customer_id", customerId)
      .gte("pickup_date", dateRange.start)
      .lte("pickup_date", dateRange.end);

    console.log('Current data query result:', { count: currentData?.length, error: currentError });

    const { data: previousData, error: previousError } = await supabase
      .from("shipment_report_view")
      .select("retail, mode_name, destination_state")
      .eq("customer_id", customerId)
      .gte("pickup_date", previousStart.toISOString().split("T")[0])
      .lte("pickup_date", previousEnd.toISOString().split("T")[0]);

    console.log('Previous data query result:', { count: previousData?.length, error: previousError });

    const current = calculateMetrics(currentData || []);
    const previous = calculateMetrics(previousData || []);

    const changes = {
      spendChange: calcChange(current.totalSpend, previous.totalSpend),
      volumeChange: calcChange(current.shipmentCount, previous.shipmentCount),
      avgCostChange: calcChange(current.avgCostPerShipment, previous.avgCostPerShipment),
    };

    const { data: profile } = await supabase
      .from("customer_intelligence_profiles")
      .select("priorities, products, key_markets, benchmark_period")
      .eq("customer_id", customerId)
      .maybeSingle();

    const insights = await generateInsightsText(current, previous, changes, profile);

    return new Response(
      JSON.stringify({
        insights,
        metrics: { current, previous, changes },
        generatedAt: new Date().toISOString(),
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

interface Shipment {
  retail?: number;
  mode_name?: string;
  destination_state?: string;
}

interface Metrics {
  totalSpend: number;
  shipmentCount: number;
  avgCostPerShipment: number;
  topMode: string;
  topModePercent: number;
  topDestinationState: string;
}

interface Changes {
  spendChange: number;
  volumeChange: number;
  avgCostChange: number;
}

interface Profile {
  priorities?: Array<{ name: string }>;
  products?: unknown;
  key_markets?: unknown;
  benchmark_period?: unknown;
}

function calculateMetrics(shipments: Shipment[]): Metrics {
  const totalSpend = shipments.reduce((sum, s) => sum + (s.retail || 0), 0);
  const shipmentCount = shipments.length;
  const avgCostPerShipment = shipmentCount > 0 ? totalSpend / shipmentCount : 0;

  const modeCounts: Record<string, number> = {};
  const stateCounts: Record<string, number> = {};

  shipments.forEach((s) => {
    if (s.mode_name) modeCounts[s.mode_name] = (modeCounts[s.mode_name] || 0) + 1;
    if (s.destination_state) stateCounts[s.destination_state] = (stateCounts[s.destination_state] || 0) + 1;
  });

  const topMode = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0];
  const topState = Object.entries(stateCounts).sort((a, b) => b[1] - a[1])[0];

  return {
    totalSpend,
    shipmentCount,
    avgCostPerShipment,
    topMode: topMode?.[0] || "N/A",
    topModePercent: topMode ? Math.round((topMode[1] / shipmentCount) * 100) : 0,
    topDestinationState: topState?.[0] || "N/A",
  };
}

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

async function generateInsightsText(
  current: Metrics,
  previous: Metrics,
  changes: Changes,
  profile: Profile | null
): Promise<string> {
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

  if (!anthropicKey) {
    return generateSimpleInsights(current, changes);
  }

  const priorities = profile?.priorities?.map((p) => p.name).join(", ") || "general cost and volume";

  const prompt = `Generate a 2-3 sentence executive summary of this freight data. Be concise and focus on what matters most.

Customer priorities: ${priorities}

Current period metrics:
- Total spend: $${current.totalSpend.toLocaleString()}
- Shipments: ${current.shipmentCount}
- Avg cost/shipment: $${current.avgCostPerShipment.toFixed(0)}
- Top mode: ${current.topMode} (${current.topModePercent}%)
- Top destination: ${current.topDestinationState}

Changes vs previous period:
- Spend: ${changes.spendChange > 0 ? "+" : ""}${changes.spendChange}%
- Volume: ${changes.volumeChange > 0 ? "+" : ""}${changes.volumeChange}%
- Avg cost: ${changes.avgCostChange > 0 ? "+" : ""}${changes.avgCostChange}%

Write naturally, mention significant changes (>5%), and relate to customer priorities if relevant. No bullet points.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    return data.content?.[0]?.text || generateSimpleInsights(current, changes);
  } catch (e) {
    console.error("AI generation failed:", e);
    return generateSimpleInsights(current, changes);
  }
}

function generateSimpleInsights(current: Metrics, changes: Changes): string {
  const spendDirection = changes.spendChange > 0 ? "increased" : "decreased";
  return `Your spend ${spendDirection} ${Math.abs(changes.spendChange)}% this period with ${current.shipmentCount} shipments totaling $${current.totalSpend.toLocaleString()}. ${current.topMode} accounted for ${current.topModePercent}% of your freight.`;
}