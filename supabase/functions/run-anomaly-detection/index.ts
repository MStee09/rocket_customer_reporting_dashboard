import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  customer_id?: number;
  force?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    let body: RequestBody = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        // Empty body is fine
      }
    }

    const { customer_id, force = false } = body;

    let result;

    if (customer_id) {
      console.log(`[Anomaly Detection] Scanning customer ${customer_id}, force=${force}`);

      const { data, error } = await supabase.rpc("run_anomaly_scan_for_customer", {
        p_customer_id: customer_id,
        p_force_scan: force,
      });

      if (error) {
        console.error("[Anomaly Detection] Error:", error);
        throw error;
      }

      result = data;
    } else {
      console.log(`[Anomaly Detection] Scanning all customers, force=${force}`);

      const { data, error } = await supabase.rpc("run_anomaly_scan_all_customers", {
        p_force_scan: force,
      });

      if (error) {
        console.error("[Anomaly Detection] Error:", error);
        throw error;
      }

      result = data;
    }

    console.log("[Anomaly Detection] Scan complete:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      status: 200,
    });
  } catch (error) {
    console.error("[Anomaly Detection] Unhandled error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      }
    );
  }
});
