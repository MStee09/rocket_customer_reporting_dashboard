import { supabase } from '../lib/supabase';

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  category?: string;
  aliases: string[];
  related_fields: string[];
  ai_instructions?: string;
  source: string;
  confidence: string;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  created_by: string;
}

export interface GlobalGlossaryTerm extends GlossaryTerm {}

export interface CustomerGlossaryTerm extends GlossaryTerm {
  customer_id: string;
}

export interface LearningQueueItem {
  id: string;
  term: string;
  user_explanation?: string;
  ai_interpretation?: string;
  original_query?: string;
  customer_id: string;
  customer_name?: string;
  suggested_scope: string;
  suggested_category?: string;
  confidence_score?: number;
  conflicts_with_global: boolean;
  conflicts_with_customer: boolean;
  similar_existing_terms: any[];
  status: string;
  created_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
}

export interface ConflictCheck {
  has_global_conflict: boolean;
  global_definition?: string;
  has_customer_conflict: boolean;
  customer_definition?: string;
  similar_terms: string[];
}

export async function getGlossaryForAI(customerId: string): Promise<{
  global: GlobalGlossaryTerm[];
  customer: CustomerGlossaryTerm[];
}> {
  const { data: global } = await supabase
    .from('glossary_global')
    .select('*')
    .eq('is_active', true)
    .order('usage_count', { ascending: false });

  const { data: customer } = await supabase
    .from('glossary_customer')
    .select('*')
    .eq('customer_id', customerId)
    .eq('is_active', true)
    .order('usage_count', { ascending: false });

  return {
    global: global || [],
    customer: customer || [],
  };
}

export function formatGlossaryForAI(
  global: GlobalGlossaryTerm[],
  customer: CustomerGlossaryTerm[]
): string {
  let output = '\n## BUSINESS GLOSSARY\n\n';

  if (customer.length > 0) {
    output += '### Your Company Terms\n\n';
    customer.forEach(term => {
      output += `**${term.term}**`;
      if (term.aliases?.length > 0) {
        output += ` (also: ${term.aliases.join(', ')})`;
      }
      output += `\n${term.definition}\n`;
      if (term.related_fields?.length > 0) {
        output += `Related fields: ${term.related_fields.map(f => '`' + f + '`').join(', ')}\n`;
      }
      if (term.ai_instructions) {
        output += `Usage: ${term.ai_instructions}\n`;
      }
      output += '\n';
    });
  }

  if (global.length > 0) {
    output += '### Industry Terms\n\n';

    const byCategory: Record<string, GlobalGlossaryTerm[]> = {};
    global.forEach(term => {
      const cat = term.category || 'General';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(term);
    });

    for (const [category, terms] of Object.entries(byCategory)) {
      output += `#### ${category}\n\n`;
      terms.forEach(term => {
        output += `**${term.term}**`;
        if (term.aliases?.length > 0) {
          output += ` (also: ${term.aliases.join(', ')})`;
        }
        output += `\n${term.definition}\n`;
        if (term.related_fields?.length > 0) {
          output += `Related fields: ${term.related_fields.map(f => '`' + f + '`').join(', ')}\n`;
        }
        if (term.ai_instructions) {
          output += `Usage: ${term.ai_instructions}\n`;
        }
        output += '\n';
      });
    }
  }

  return output;
}

export async function getGlobalGlossary(): Promise<GlobalGlossaryTerm[]> {
  const { data, error } = await supabase
    .from('glossary_global')
    .select('*')
    .order('term');

  if (error) throw error;
  return data || [];
}

export async function createGlobalTerm(
  term: Omit<GlobalGlossaryTerm, 'id' | 'created_at' | 'usage_count'>,
  userId: string
): Promise<GlobalGlossaryTerm> {
  const { data, error } = await supabase
    .from('glossary_global')
    .insert({
      ...term,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  await logAudit('create', 'global', data.id, term.term, userId, null, data);

  return data;
}

export async function updateGlobalTerm(
  id: string,
  updates: Partial<GlobalGlossaryTerm>,
  userId: string
): Promise<GlobalGlossaryTerm> {
  const { data: oldData } = await supabase
    .from('glossary_global')
    .select('*')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('glossary_global')
    .update({
      ...updates,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await logAudit('update', 'global', id, data.term, userId, oldData, data);

  return data;
}

export async function deactivateGlobalTerm(id: string, userId: string, reason: string): Promise<void> {
  const { data: oldData } = await supabase
    .from('glossary_global')
    .select('*')
    .eq('id', id)
    .single();

  await supabase
    .from('glossary_global')
    .update({ is_active: false, updated_by: userId, updated_at: new Date().toISOString() })
    .eq('id', id);

  await logAudit('deactivate', 'global', id, oldData?.term, userId, oldData, { is_active: false }, reason);
}

export async function getCustomerGlossary(customerId: string): Promise<CustomerGlossaryTerm[]> {
  const { data, error } = await supabase
    .from('glossary_customer')
    .select('*')
    .eq('customer_id', customerId)
    .order('term');

  if (error) throw error;
  return data || [];
}

export async function getAllCustomerGlossaries(): Promise<CustomerGlossaryTerm[]> {
  const { data, error } = await supabase
    .from('glossary_customer')
    .select('*')
    .order('customer_id')
    .order('term');

  if (error) throw error;
  return data || [];
}

export async function createCustomerTerm(
  term: Omit<CustomerGlossaryTerm, 'id' | 'created_at' | 'usage_count'>,
  userId: string
): Promise<CustomerGlossaryTerm> {
  const { data, error } = await supabase
    .from('glossary_customer')
    .insert({
      ...term,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  await logAudit('create', 'customer', data.id, term.term, userId, null, data);

  return data;
}

export async function updateCustomerTerm(
  id: string,
  updates: Partial<CustomerGlossaryTerm>,
  userId: string
): Promise<CustomerGlossaryTerm> {
  const { data: oldData } = await supabase
    .from('glossary_customer')
    .select('*')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('glossary_customer')
    .update({
      ...updates,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await logAudit('update', 'customer', id, data.term, userId, oldData, data);

  return data;
}

export async function getLearningQueue(status?: string): Promise<LearningQueueItem[]> {
  let query = supabase
    .from('glossary_learning_queue')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function addToLearningQueue(item: {
  term: string;
  user_explanation?: string;
  ai_interpretation?: string;
  original_query?: string;
  customer_id: string;
  customer_name?: string;
  suggested_scope?: string;
  suggested_category?: string;
  confidence_score?: number;
}): Promise<LearningQueueItem> {
  const conflicts = await checkTermConflicts(item.term, item.customer_id);

  const { data: existing } = await supabase
    .from('glossary_learning_queue')
    .select('id')
    .ilike('term', item.term)
    .eq('customer_id', item.customer_id)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('glossary_learning_queue')
      .update({
        user_explanation: item.user_explanation,
        ai_interpretation: item.ai_interpretation,
        original_query: item.original_query,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('glossary_learning_queue')
    .insert({
      ...item,
      conflicts_with_global: conflicts.has_global_conflict,
      conflicts_with_customer: conflicts.has_customer_conflict,
      similar_existing_terms: conflicts.similar_terms,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function approveAsGlobal(
  queueId: string,
  termData: Partial<GlobalGlossaryTerm>,
  userId: string
): Promise<GlobalGlossaryTerm> {
  const newTerm = await createGlobalTerm(
    {
      term: termData.term!,
      definition: termData.definition!,
      category: termData.category,
      aliases: termData.aliases || [],
      related_fields: termData.related_fields || [],
      ai_instructions: termData.ai_instructions,
      source: 'learned_approved',
      confidence: 'medium',
      is_active: true,
      created_by: userId,
    } as Omit<GlobalGlossaryTerm, 'id' | 'created_at' | 'usage_count'>,
    userId
  );

  await supabase
    .from('glossary_learning_queue')
    .update({
      status: 'approved_global',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      created_glossary_id: newTerm.id,
      created_glossary_type: 'global',
    })
    .eq('id', queueId);

  return newTerm;
}

export async function approveAsCustomer(
  queueId: string,
  customerId: string,
  termData: Partial<CustomerGlossaryTerm>,
  userId: string
): Promise<CustomerGlossaryTerm> {
  const newTerm = await createCustomerTerm(
    {
      customer_id: customerId,
      term: termData.term!,
      definition: termData.definition!,
      category: termData.category,
      aliases: termData.aliases || [],
      related_fields: termData.related_fields || [],
      ai_instructions: termData.ai_instructions,
      source: 'learned_approved',
      confidence: 'medium',
      is_active: true,
      created_by: userId,
    } as Omit<CustomerGlossaryTerm, 'id' | 'created_at' | 'usage_count'>,
    userId
  );

  await supabase
    .from('glossary_learning_queue')
    .update({
      status: 'approved_customer',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      created_glossary_id: newTerm.id,
      created_glossary_type: 'customer',
    })
    .eq('id', queueId);

  return newTerm;
}

export async function rejectQueueItem(
  queueId: string,
  userId: string,
  reason: string
): Promise<void> {
  await supabase
    .from('glossary_learning_queue')
    .update({
      status: 'rejected',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      review_notes: reason,
    })
    .eq('id', queueId);
}

export async function mergeWithExisting(
  queueId: string,
  existingTermId: string,
  existingType: 'global' | 'customer',
  newAlias: string,
  userId: string
): Promise<void> {
  const table = existingType === 'global' ? 'glossary_global' : 'glossary_customer';

  const { data: existing } = await supabase
    .from(table)
    .select('*')
    .eq('id', existingTermId)
    .single();

  if (existing) {
    const updatedAliases = [...(existing.aliases || []), newAlias];

    await supabase
      .from(table)
      .update({
        aliases: updatedAliases,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingTermId);
  }

  await supabase
    .from('glossary_learning_queue')
    .update({
      status: 'merged',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      review_notes: `Merged as alias into existing ${existingType} term`,
      created_glossary_id: existingTermId,
      created_glossary_type: existingType,
    })
    .eq('id', queueId);
}

export async function checkTermConflicts(term: string, customerId: string): Promise<ConflictCheck> {
  const { data, error } = await supabase.rpc('check_term_conflicts', {
    p_term: term,
    p_customer_id: customerId,
  });

  if (error) {
    console.error('Error checking conflicts:', error);
    return {
      has_global_conflict: false,
      has_customer_conflict: false,
      similar_terms: [],
    };
  }

  return data as ConflictCheck;
}

export async function incrementUsage(termId: string, type: 'global' | 'customer'): Promise<void> {
  const table = type === 'global' ? 'glossary_global' : 'glossary_customer';

  const { data } = await supabase
    .from(table)
    .select('usage_count')
    .eq('id', termId)
    .single();

  if (data) {
    await supabase
      .from(table)
      .update({
        usage_count: (data.usage_count || 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', termId);
  }
}

async function logAudit(
  action: string,
  glossaryType: string,
  glossaryId: string,
  term: string | undefined,
  userId: string,
  oldValue: any,
  newValue: any,
  reason?: string
): Promise<void> {
  await supabase.from('glossary_audit_log').insert({
    action,
    glossary_type: glossaryType,
    glossary_id: glossaryId,
    term,
    user_id: userId,
    old_value: oldValue,
    new_value: newValue,
    reason,
  });
}

export async function getAuditLog(limit = 100): Promise<any[]> {
  const { data } = await supabase
    .from('glossary_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}
