import { supabase } from '../../../lib/supabase';
import { ToolResult, AIToolContext } from '../types';

interface KnowledgeSearchResult {
  id: string;
  title: string;
  category: string;
  relevanceScore: number;
  excerpt: string;
  fullContent?: string;
}

export async function executeSearchKnowledge(
  toolCallId: string,
  args: Record<string, unknown>,
  context: AIToolContext
): Promise<ToolResult> {
  const query = args.query as string;
  const category = args.category as string | undefined;
  const maxResults = (args.maxResults as number) || 3;

  if (!query || query.length < 2) {
    return {
      toolCallId,
      success: false,
      error: 'Search query must be at least 2 characters'
    };
  }

  try {
    let docsQuery = supabase
      .from('ai_knowledge_documents')
      .select('id, title, description, category, extracted_text, priority')
      .eq('is_active', true)
      .or(`scope.eq.global,customer_id.eq.${context.customerId}`);

    if (category && category !== 'all') {
      docsQuery = docsQuery.eq('category', category);
    }

    const { data: documents, error: docsError } = await docsQuery;

    if (docsError) {
      throw new Error(docsError.message);
    }

    const searchTerms = query.toLowerCase().split(/\s+/);
    const scoredResults: KnowledgeSearchResult[] = [];

    for (const doc of documents || []) {
      const titleLower = doc.title.toLowerCase();
      const textLower = doc.extracted_text?.toLowerCase() || '';
      const descLower = doc.description?.toLowerCase() || '';

      let score = 0;

      for (const term of searchTerms) {
        if (titleLower.includes(term)) score += 10;
        if (descLower.includes(term)) score += 5;
        const contentMatches = (textLower.match(new RegExp(term, 'g')) || []).length;
        score += Math.min(contentMatches, 5);
      }

      score *= (doc.priority || 5) / 5;

      if (score > 0) {
        const excerpt = extractRelevantExcerpt(doc.extracted_text || '', searchTerms, 200);

        scoredResults.push({
          id: doc.id,
          title: doc.title,
          category: doc.category,
          relevanceScore: score,
          excerpt,
          fullContent: doc.extracted_text
        });
      }
    }

    scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const topResults = scoredResults.slice(0, maxResults);

    const { data: terms } = await supabase
      .from('ai_knowledge')
      .select('key, label, definition')
      .eq('is_active', true)
      .or(`scope.eq.global,customer_id.eq.${context.customerId}`)
      .ilike('definition', `%${query}%`)
      .limit(3);

    const terminology = (terms || []).map(t => ({
      term: t.key,
      label: t.label,
      definition: t.definition
    }));

    if (topResults.length === 0 && terminology.length === 0) {
      return {
        toolCallId,
        success: true,
        data: {
          documents: [],
          terminology: [],
          message: `No results found for "${query}"`
        },
        suggestions: [
          'Try different search terms',
          'Use broader keywords',
          category ? 'Try searching all categories' : undefined
        ].filter(Boolean) as string[]
      };
    }

    return {
      toolCallId,
      success: true,
      data: {
        documents: topResults.map(r => ({
          title: r.title,
          category: r.category,
          relevance: Math.round(r.relevanceScore),
          excerpt: r.excerpt
        })),
        terminology,
        totalFound: scoredResults.length + terminology.length
      }
    };
  } catch (error) {
    return {
      toolCallId,
      success: false,
      error: `Knowledge search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

function extractRelevantExcerpt(text: string, searchTerms: string[], maxLength: number): string {
  if (!text) return '';

  const lower = text.toLowerCase();
  let bestStart = 0;
  let bestScore = 0;

  for (let i = 0; i < text.length - maxLength; i += 50) {
    const chunk = lower.substring(i, i + maxLength);
    let score = 0;
    for (const term of searchTerms) {
      if (chunk.includes(term)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestStart = i;
    }
  }

  let start = bestStart;
  let end = Math.min(bestStart + maxLength, text.length);

  const prevPeriod = text.lastIndexOf('. ', bestStart);
  if (prevPeriod > bestStart - 100) {
    start = prevPeriod + 2;
  }

  const nextPeriod = text.indexOf('. ', end - 50);
  if (nextPeriod > 0 && nextPeriod < end + 50) {
    end = nextPeriod + 1;
  }

  let excerpt = text.substring(start, end).trim();

  if (start > 0) excerpt = '...' + excerpt;
  if (end < text.length) excerpt = excerpt + '...';

  return excerpt;
}
