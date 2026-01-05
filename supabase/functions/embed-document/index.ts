import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const model = new Supabase.ai.Session('gte-small');

interface Chunk {
  text: string;
  index: number;
  tokenCount: number;
}

function chunkText(text: string, maxTokens = 400, overlap = 50): Chunk[] {
  const chunks: Chunk[] = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';
  let currentTokens = 0;
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = Math.ceil(paragraph.length / 4);

    if (paragraphTokens > maxTokens) {
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        const sentenceTokens = Math.ceil(sentence.length / 4);

        if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
          chunks.push({
            text: currentChunk.trim(),
            index: chunkIndex++,
            tokenCount: currentTokens
          });

          const words = currentChunk.split(' ');
          const overlapWords = words.slice(-Math.ceil(overlap / 2));
          currentChunk = overlapWords.join(' ') + ' ' + sentence;
          currentTokens = Math.ceil(currentChunk.length / 4);
        } else {
          currentChunk += ' ' + sentence;
          currentTokens += sentenceTokens;
        }
      }
    } else {
      if (currentTokens + paragraphTokens > maxTokens && currentChunk) {
        chunks.push({
          text: currentChunk.trim(),
          index: chunkIndex++,
          tokenCount: currentTokens
        });
        currentChunk = paragraph;
        currentTokens = paragraphTokens;
      } else {
        currentChunk += '\n\n' + paragraph;
        currentTokens += paragraphTokens;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      index: chunkIndex,
      tokenCount: Math.ceil(currentChunk.length / 4)
    });
  }

  return chunks;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const output = await model.run(text, { mean_pool: true, normalize: true });
  return Array.from(output);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { documentId, customerId, text, fileName } = await req.json();

    if (!documentId || !customerId || !text) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: documentId, customerId, text' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    await supabase
      .from('knowledge_embeddings')
      .delete()
      .eq('document_id', documentId);

    const chunks = chunkText(text);

    if (chunks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, chunksCreated: 0, message: 'No text to embed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[embed-document] Processing ${chunks.length} chunks for ${fileName || documentId}`);

    const embeddings: Array<{
      document_id: string;
      customer_id: string;
      chunk_index: number;
      chunk_text: string;
      embedding: string;
      token_count: number;
    }> = [];

    for (const chunk of chunks) {
      try {
        const embedding = await generateEmbedding(chunk.text);
        embeddings.push({
          document_id: documentId,
          customer_id: customerId,
          chunk_index: chunk.index,
          chunk_text: chunk.text,
          embedding: `[${embedding.join(',')}]`,
          token_count: chunk.tokenCount
        });
      } catch (err) {
        console.error(`[embed-document] Error embedding chunk ${chunk.index}:`, err);
      }
    }

    if (embeddings.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to generate any embeddings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: insertError } = await supabase
      .from('knowledge_embeddings')
      .insert(embeddings);

    if (insertError) throw insertError;

    const duration = Date.now() - startTime;
    console.log(`[embed-document] Embedded ${embeddings.length} chunks in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        chunksCreated: embeddings.length,
        totalTokens: embeddings.reduce((sum, e) => sum + e.token_count, 0),
        durationMs: duration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[embed-document] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
