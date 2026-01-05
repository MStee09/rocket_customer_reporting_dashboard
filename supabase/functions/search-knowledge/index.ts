import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const model = new Supabase.ai.Session('gte-small');

async function generateQueryEmbedding(query: string): Promise<number[]> {
  const output = await model.run(query, { mean_pool: true, normalize: true });
  return Array.from(output);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, customerId, threshold = 0.5, limit = 5 } = await req.json();

    if (!query || !customerId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: query, customerId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: stats } = await supabase.rpc('get_embedding_stats', {
      p_customer_id: customerId
    });

    if (!stats || stats.total_chunks === 0) {
      return new Response(
        JSON.stringify({ success: true, chunks: [], message: 'No embedded documents found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[search-knowledge] Searching for: "${query.substring(0, 50)}..."`);
    const queryEmbedding = await generateQueryEmbedding(query);

    const { data, error } = await supabase.rpc('match_knowledge', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      p_customer_id: customerId,
      match_threshold: threshold,
      match_count: limit
    });

    if (error) throw error;

    console.log(`[search-knowledge] Found ${data?.length || 0} relevant chunks`);

    return new Response(
      JSON.stringify({ success: true, chunks: data || [], query, stats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[search-knowledge] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error', chunks: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
