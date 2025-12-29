// src/ai/learning/profileUpdater.ts
// Manages customer intelligence profiles

import { supabase } from '../../lib/supabase';
import { CustomerIntelligenceProfile } from '../types';

export async function getCustomerProfile(
  customerId: string
): Promise<CustomerIntelligenceProfile | null> {
  try {
    const { data: profile, error } = await supabase
      .from('customer_intelligence_profiles')
      .select('*')
      .eq('customer_id', parseInt(customerId))
      .single();

    if (error || !profile) return null;

    // Get learned terminology
    const { data: learnedTerms } = await supabase
      .from('ai_knowledge')
      .select('key, label, definition, source')
      .eq('scope', 'customer')
      .eq('customer_id', customerId)
      .eq('knowledge_type', 'term')
      .eq('is_active', true);

    // Get data profile
    const { data: dataProfile } = await supabase
      .rpc('get_customer_data_profile', { p_customer_id: customerId });

    const adminTerminology = (profile.terminology || []).map((t: any) => ({
      term: t.term || t.key,
      means: t.means || t.definition,
      source: 'admin' as const,
    }));

    const learnedTerminology = (learnedTerms || []).map(t => ({
      term: t.key,
      means: t.definition || t.label,
      source: 'learned' as const,
    }));

    return {
      customerId: parseInt(customerId),
      priorities: profile.priorities || [],
      products: profile.products || [],
      keyMarkets: profile.key_markets || [],
      terminology: [...adminTerminology, ...learnedTerminology],
      benchmarkPeriod: profile.benchmark_period,
      accountNotes: profile.account_notes,
      preferences: profile.preferences || {},
      operationalProfile: {
        avgShipmentsPerDay: dataProfile?.avgShipmentsPerDay || 0,
        peakDays: [],
        topLanes: [],
        carrierMix: {},
      },
    };
  } catch (e) {
    console.error('Failed to get customer profile:', e);
    return null;
  }
}

export function formatProfileForPrompt(profile: CustomerIntelligenceProfile): string {
  let output = '## CUSTOMER INTELLIGENCE\n\n';
  output += 'Use this context to personalize your responses:\n\n';

  if (profile.priorities.length > 0) {
    output += `**Customer Priorities:** ${profile.priorities.join(', ')}\n`;
    output += 'Frame insights in terms of these priorities when relevant.\n\n';
  }

  if (profile.keyMarkets.length > 0) {
    output += `**Key Markets:** ${profile.keyMarkets.join(', ')}\n`;
    output += 'These are their most important regions.\n\n';
  }

  if (profile.terminology.length > 0) {
    output += '**Customer Terminology:**\n';
    for (const term of profile.terminology) {
      output += `- "${term.term}" → ${term.means}\n`;
    }
    output += '\nUse their terminology when possible.\n\n';
  }

  if (profile.products.length > 0) {
    output += '**Product Categories:**\n';
    for (const product of profile.products) {
      output += `- **${product.name}**: Search \`${product.field}\` for: ${product.keywords.join(', ')}\n`;
    }
    output += '\n';
  }

  const chartPref = profile.preferences?.chartTypes;
  if (chartPref) {
    const entries = Object.entries(chartPref).sort((a, b) => b[1] - a[1]);
    if (entries.length > 0 && entries[0][1] > 0.5) {
      output += `**Note:** This customer often prefers ${entries[0][0]} charts.\n`;
    }
  }

  if (profile.accountNotes) {
    output += `\n**Account Notes:** ${profile.accountNotes}\n`;
  }

  return output;
}

export async function updateProfileField(
  customerId: string,
  field: string,
  value: any
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('customer_intelligence_profiles')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('customer_id', parseInt(customerId));
    return !error;
  } catch (e) {
    console.error('Failed to update profile field:', e);
    return false;
  }
}

export async function addLearnedTerm(
  customerId: string,
  term: string,
  meaning: string,
  confidence: number = 0.7
): Promise<boolean> {
  try {
    await supabase.from('ai_knowledge').upsert({
      knowledge_type: 'term',
      key: term.toLowerCase().replace(/\s+/g, '_'),
      label: term,
      definition: meaning,
      scope: 'customer',
      customer_id: customerId,
      source: 'learned',
      confidence,
      needs_review: confidence < 0.8,
      is_active: confidence >= 0.8,
    }, {
      onConflict: 'knowledge_type,key,scope,customer_id',
    });
    return true;
  } catch (e) {
    console.error('Failed to add learned term:', e);
    return false;
  }
}
