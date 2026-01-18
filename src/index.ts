// ============================================================================
// ANOMALY DETECTION EDGE FUNCTION
// Version: 1.0
// 
// This edge function triggers anomaly detection scans.
// It can be called:
// 1. Via cron job (scheduled)
// 2. Manually via API call
// 3. After significant data imports
//
// Endpoints:
// POST /run-anomaly-detection
//   - body: { customer_id?: number, force?: boolean }
//   - If customer_id provided, scans only that customer
//   - If force=true, bypasses the scan frequency check
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  customer_id?: number;
  force?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for full access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Parse request body
    let body: RequestBody = {};
    if (req.method === 'POST') {
      try {
        body = await req.json();
      } catch {
        // Empty body is fine
      }
    }

    const { customer_id, force = false } = body;
    
    let result;
    
    if (customer_id) {
      // Scan single customer
      console.log(`[Anomaly Detection] Scanning customer ${customer_id}, force=${force}`);
      
      const { data, error } = await supabase.rpc('run_anomaly_scan_for_customer', {
        p_customer_id: customer_id,
        p_force_scan: force
      });
      
      if (error) {
        console.error('[Anomaly Detection] Error:', error);
        throw error;
      }
      
      result = data;
      
    } else {
      // Scan all customers
      console.log(`[Anomaly Detection] Scanning all customers, force=${force}`);
      
      const { data, error } = await supabase.rpc('run_anomaly_scan_all_customers', {
        p_force_scan: force
      });
      
      if (error) {
        console.error('[Anomaly Detection] Error:', error);
        throw error;
      }
      
      result = data;
    }

    console.log('[Anomaly Detection] Scan complete:', JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('[Anomaly Detection] Unhandled error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
