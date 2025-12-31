import { supabase } from '../../../lib/supabase';
import { ToolResult, AIToolContext } from '../types';

interface CustomerContext {
  profile?: {
    priorities: string[];
    keyMarkets: string[];
    benchmarkPeriod?: string;
    accountNotes?: string;
  };
  terminology?: Array<{
    term: string;
    meaning: string;
    source: 'admin' | 'learned';
  }>;
  products?: Array<{
    name: string;
    keywords: string[];
    searchField: string;
  }>;
  preferences?: {
    chartTypes?: Record<string, number>;
    sortOrders?: Record<string, number>;
    commonFilters?: string[];
  };
}

export async function executeGetCustomerContext(
  toolCallId: string,
  args: Record<string, unknown>,
  context: AIToolContext
): Promise<ToolResult> {
  const includePreferences = args.includePreferences !== false;
  const includeTerminology = args.includeTerminology !== false;
  const includeProducts = args.includeProducts !== false;

  try {
    const customerContext: CustomerContext = {};

    const { data: profile } = await supabase
      .from('customer_intelligence_profiles')
      .select('*')
      .eq('customer_id', parseInt(context.customerId))
      .maybeSingle();

    if (profile) {
      customerContext.profile = {
        priorities: profile.priorities || [],
        keyMarkets: profile.key_markets || [],
        benchmarkPeriod: profile.benchmark_period,
        accountNotes: profile.account_notes
      };

      if (includePreferences && profile.preferences) {
        customerContext.preferences = profile.preferences;
      }
    }

    if (includeTerminology) {
      const { data: terms } = await supabase
        .from('ai_knowledge')
        .select('key, label, definition, source')
        .eq('scope', 'customer')
        .eq('customer_id', context.customerId)
        .eq('knowledge_type', 'term')
        .eq('is_active', true);

      if (terms && terms.length > 0) {
        customerContext.terminology = terms.map(t => ({
          term: t.key,
          meaning: t.definition || t.label,
          source: t.source === 'learned' ? 'learned' : 'admin'
        }));
      }
    }

    if (includeProducts) {
      const { data: products } = await supabase
        .from('ai_knowledge')
        .select('key, label, metadata')
        .eq('scope', 'customer')
        .eq('customer_id', context.customerId)
        .eq('knowledge_type', 'product')
        .eq('is_active', true);

      if (products && products.length > 0) {
        customerContext.products = products.map(p => ({
          name: p.label || p.key,
          keywords: ((p.metadata as Record<string, unknown>)?.keywords as string[]) || [],
          searchField: ((p.metadata as Record<string, unknown>)?.search_field as string) || 'description'
        }));
      }
    }

    const contextSummary: string[] = [];

    if (customerContext.profile?.priorities?.length) {
      contextSummary.push(`Customer priorities: ${customerContext.profile.priorities.join(', ')}`);
    }

    if (customerContext.profile?.keyMarkets?.length) {
      contextSummary.push(`Key markets: ${customerContext.profile.keyMarkets.join(', ')}`);
    }

    if (customerContext.terminology?.length) {
      contextSummary.push(`${customerContext.terminology.length} custom terminology definitions available`);
    }

    if (customerContext.products?.length) {
      contextSummary.push(`${customerContext.products.length} product categories defined`);
    }

    if (customerContext.preferences?.chartTypes) {
      const topChart = Object.entries(customerContext.preferences.chartTypes)
        .sort((a, b) => b[1] - a[1])[0];
      if (topChart && topChart[1] > 0.5) {
        contextSummary.push(`Customer often prefers ${topChart[0]} charts`);
      }
    }

    return {
      toolCallId,
      success: true,
      data: {
        context: customerContext,
        summary: contextSummary.join('. ') + '.'
      },
      suggestions: contextSummary.length === 0
        ? ['No customer-specific context found. Using defaults.']
        : undefined
    };
  } catch (error) {
    return {
      toolCallId,
      success: false,
      error: `Failed to load customer context: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
