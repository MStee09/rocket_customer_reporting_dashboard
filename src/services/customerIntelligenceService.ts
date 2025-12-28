import { supabase } from '../lib/supabase';
import type {
  CustomerIntelligenceProfile,
  CustomerPriority,
  ProductMapping,
  KeyMarket,
  TermMapping,
  ProfileHistoryEntry,
  CorrelationValidationResult,
} from '../types/customerIntelligence';

function dbToProfile(row: any): CustomerIntelligenceProfile {
  return {
    id: row.id,
    customerId: row.customer_id,
    priorities: row.priorities || [],
    products: row.products || [],
    keyMarkets: row.key_markets || [],
    terminology: row.terminology || [],
    benchmarkPeriod: row.benchmark_period,
    accountNotes: row.account_notes,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

function dbToHistoryEntry(row: any): ProfileHistoryEntry {
  return {
    id: row.id,
    profileId: row.profile_id,
    customerId: row.customer_id,
    timestamp: row.timestamp,
    userId: row.user_id,
    userEmail: row.user_email,
    changeType: row.change_type,
    fieldChanged: row.field_changed,
    previousValue: row.previous_value,
    newValue: row.new_value,
    userInput: row.user_input,
    aiInterpretation: row.ai_interpretation,
    correlationData: row.correlation_data,
  };
}

export async function getProfile(customerId: number): Promise<CustomerIntelligenceProfile | null> {
  try {
    const { data, error } = await supabase
      .from('customer_intelligence_profiles')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data ? dbToProfile(data) : null;
  } catch (err) {
    console.error('Error in getProfile:', err);
    return null;
  }
}

export async function createProfile(
  customerId: number,
  userId: string,
  userEmail: string
): Promise<CustomerIntelligenceProfile> {
  try {
    const { data, error } = await supabase
      .from('customer_intelligence_profiles')
      .insert({
        customer_id: customerId,
        priorities: [],
        products: [],
        key_markets: [],
        terminology: [],
        created_by: userEmail,
        updated_by: userEmail,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      throw error;
    }

    const profile = dbToProfile(data);

    await supabase.from('customer_intelligence_history').insert({
      profile_id: profile.id,
      customer_id: customerId,
      user_id: userId,
      user_email: userEmail,
      change_type: 'create',
      field_changed: 'profile',
      previous_value: null,
      new_value: { created: true },
    });

    return profile;
  } catch (err) {
    console.error('Error in createProfile:', err);
    throw err;
  }
}

export async function updateProfile(
  customerId: number,
  updates: Partial<CustomerIntelligenceProfile>,
  userId: string,
  userEmail: string,
  changeDetails: { field: string; previousValue: any; newValue: any; userInput?: string }
): Promise<CustomerIntelligenceProfile> {
  try {
    const dbUpdates: Record<string, any> = {
      updated_by: userEmail,
      updated_at: new Date().toISOString(),
    };

    if (updates.priorities !== undefined) dbUpdates.priorities = updates.priorities;
    if (updates.products !== undefined) dbUpdates.products = updates.products;
    if (updates.keyMarkets !== undefined) dbUpdates.key_markets = updates.keyMarkets;
    if (updates.terminology !== undefined) dbUpdates.terminology = updates.terminology;
    if (updates.benchmarkPeriod !== undefined) dbUpdates.benchmark_period = updates.benchmarkPeriod;
    if (updates.accountNotes !== undefined) dbUpdates.account_notes = updates.accountNotes;

    const { data, error } = await supabase
      .from('customer_intelligence_profiles')
      .update(dbUpdates)
      .eq('customer_id', customerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }

    const profile = dbToProfile(data);

    await supabase.from('customer_intelligence_history').insert({
      profile_id: profile.id,
      customer_id: customerId,
      user_id: userId,
      user_email: userEmail,
      change_type: 'modify',
      field_changed: changeDetails.field,
      previous_value: changeDetails.previousValue,
      new_value: changeDetails.newValue,
      user_input: changeDetails.userInput,
    });

    return profile;
  } catch (err) {
    console.error('Error in updateProfile:', err);
    throw err;
  }
}

export async function addPriority(
  customerId: number,
  priority: { name: string; type: 'hard' | 'soft'; context?: string },
  userId: string,
  userEmail: string,
  userInput?: string
): Promise<CustomerIntelligenceProfile> {
  try {
    const profile = await getProfile(customerId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const newPriority: CustomerPriority = {
      id: crypto.randomUUID(),
      name: priority.name,
      type: priority.type,
      context: priority.context,
      addedAt: new Date().toISOString(),
      addedBy: userEmail,
    };

    const updatedPriorities = [...profile.priorities, newPriority];

    const { data, error } = await supabase
      .from('customer_intelligence_profiles')
      .update({
        priorities: updatedPriorities,
        updated_by: userEmail,
        updated_at: new Date().toISOString(),
      })
      .eq('customer_id', customerId)
      .select()
      .single();

    if (error) {
      console.error('Error adding priority:', error);
      throw error;
    }

    await supabase.from('customer_intelligence_history').insert({
      profile_id: profile.id,
      customer_id: customerId,
      user_id: userId,
      user_email: userEmail,
      change_type: 'add',
      field_changed: 'priorities',
      previous_value: null,
      new_value: newPriority,
      user_input: userInput,
    });

    return dbToProfile(data);
  } catch (err) {
    console.error('Error in addPriority:', err);
    throw err;
  }
}

export async function removePriority(
  customerId: number,
  priorityId: string,
  userId: string,
  userEmail: string
): Promise<CustomerIntelligenceProfile> {
  try {
    const profile = await getProfile(customerId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const removedPriority = profile.priorities.find((p) => p.id === priorityId);
    const updatedPriorities = profile.priorities.filter((p) => p.id !== priorityId);

    const { data, error } = await supabase
      .from('customer_intelligence_profiles')
      .update({
        priorities: updatedPriorities,
        updated_by: userEmail,
        updated_at: new Date().toISOString(),
      })
      .eq('customer_id', customerId)
      .select()
      .single();

    if (error) {
      console.error('Error removing priority:', error);
      throw error;
    }

    await supabase.from('customer_intelligence_history').insert({
      profile_id: profile.id,
      customer_id: customerId,
      user_id: userId,
      user_email: userEmail,
      change_type: 'remove',
      field_changed: 'priorities',
      previous_value: removedPriority,
      new_value: null,
    });

    return dbToProfile(data);
  } catch (err) {
    console.error('Error in removePriority:', err);
    throw err;
  }
}

export async function addProduct(
  customerId: number,
  product: Omit<ProductMapping, 'id'>,
  userId: string,
  userEmail: string,
  userInput?: string,
  correlationData?: any
): Promise<CustomerIntelligenceProfile> {
  try {
    const profile = await getProfile(customerId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const newProduct: ProductMapping = {
      id: crypto.randomUUID(),
      ...product,
    };

    const updatedProducts = [...profile.products, newProduct];

    const { data, error } = await supabase
      .from('customer_intelligence_profiles')
      .update({
        products: updatedProducts,
        updated_by: userEmail,
        updated_at: new Date().toISOString(),
      })
      .eq('customer_id', customerId)
      .select()
      .single();

    if (error) {
      console.error('Error adding product:', error);
      throw error;
    }

    await supabase.from('customer_intelligence_history').insert({
      profile_id: profile.id,
      customer_id: customerId,
      user_id: userId,
      user_email: userEmail,
      change_type: 'add',
      field_changed: 'products',
      previous_value: null,
      new_value: newProduct,
      user_input: userInput,
      correlation_data: correlationData,
    });

    return dbToProfile(data);
  } catch (err) {
    console.error('Error in addProduct:', err);
    throw err;
  }
}

export async function removeProduct(
  customerId: number,
  productId: string,
  userId: string,
  userEmail: string
): Promise<CustomerIntelligenceProfile> {
  try {
    const profile = await getProfile(customerId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const removedProduct = profile.products.find((p) => p.id === productId);
    const updatedProducts = profile.products.filter((p) => p.id !== productId);

    const { data, error } = await supabase
      .from('customer_intelligence_profiles')
      .update({
        products: updatedProducts,
        updated_by: userEmail,
        updated_at: new Date().toISOString(),
      })
      .eq('customer_id', customerId)
      .select()
      .single();

    if (error) {
      console.error('Error removing product:', error);
      throw error;
    }

    await supabase.from('customer_intelligence_history').insert({
      profile_id: profile.id,
      customer_id: customerId,
      user_id: userId,
      user_email: userEmail,
      change_type: 'remove',
      field_changed: 'products',
      previous_value: removedProduct,
      new_value: null,
    });

    return dbToProfile(data);
  } catch (err) {
    console.error('Error in removeProduct:', err);
    throw err;
  }
}

export async function addTerminology(
  customerId: number,
  term: { term: string; meaning: string },
  userId: string,
  userEmail: string
): Promise<CustomerIntelligenceProfile> {
  try {
    const profile = await getProfile(customerId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const newTerm: TermMapping = {
      id: crypto.randomUUID(),
      term: term.term,
      meaning: term.meaning,
    };

    const updatedTerminology = [...profile.terminology, newTerm];

    const { data, error } = await supabase
      .from('customer_intelligence_profiles')
      .update({
        terminology: updatedTerminology,
        updated_by: userEmail,
        updated_at: new Date().toISOString(),
      })
      .eq('customer_id', customerId)
      .select()
      .single();

    if (error) {
      console.error('Error adding terminology:', error);
      throw error;
    }

    await supabase.from('customer_intelligence_history').insert({
      profile_id: profile.id,
      customer_id: customerId,
      user_id: userId,
      user_email: userEmail,
      change_type: 'add',
      field_changed: 'terminology',
      previous_value: null,
      new_value: newTerm,
    });

    return dbToProfile(data);
  } catch (err) {
    console.error('Error in addTerminology:', err);
    throw err;
  }
}

export async function removeTerminology(
  customerId: number,
  termId: string,
  userId: string,
  userEmail: string
): Promise<CustomerIntelligenceProfile> {
  try {
    const profile = await getProfile(customerId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const removedTerm = profile.terminology.find((t) => t.id === termId);
    const updatedTerminology = profile.terminology.filter((t) => t.id !== termId);

    const { data, error } = await supabase
      .from('customer_intelligence_profiles')
      .update({
        terminology: updatedTerminology,
        updated_by: userEmail,
        updated_at: new Date().toISOString(),
      })
      .eq('customer_id', customerId)
      .select()
      .single();

    if (error) {
      console.error('Error removing terminology:', error);
      throw error;
    }

    await supabase.from('customer_intelligence_history').insert({
      profile_id: profile.id,
      customer_id: customerId,
      user_id: userId,
      user_email: userEmail,
      change_type: 'remove',
      field_changed: 'terminology',
      previous_value: removedTerm,
      new_value: null,
    });

    return dbToProfile(data);
  } catch (err) {
    console.error('Error in removeTerminology:', err);
    throw err;
  }
}

export async function addMarket(
  customerId: number,
  market: { region: string; states: string[]; volumePercent?: number },
  userId: string,
  userEmail: string
): Promise<CustomerIntelligenceProfile> {
  try {
    const profile = await getProfile(customerId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const newMarket: KeyMarket = {
      id: crypto.randomUUID(),
      region: market.region,
      states: market.states,
      volumePercent: market.volumePercent,
    };

    const updatedMarkets = [...profile.keyMarkets, newMarket];

    const { data, error } = await supabase
      .from('customer_intelligence_profiles')
      .update({
        key_markets: updatedMarkets,
        updated_by: userEmail,
        updated_at: new Date().toISOString(),
      })
      .eq('customer_id', customerId)
      .select()
      .single();

    if (error) {
      console.error('Error adding market:', error);
      throw error;
    }

    await supabase.from('customer_intelligence_history').insert({
      profile_id: profile.id,
      customer_id: customerId,
      user_id: userId,
      user_email: userEmail,
      change_type: 'add',
      field_changed: 'keyMarkets',
      previous_value: null,
      new_value: newMarket,
    });

    return dbToProfile(data);
  } catch (err) {
    console.error('Error in addMarket:', err);
    throw err;
  }
}

export async function removeMarket(
  customerId: number,
  marketId: string,
  userId: string,
  userEmail: string
): Promise<CustomerIntelligenceProfile> {
  try {
    const profile = await getProfile(customerId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const removedMarket = profile.keyMarkets.find((m) => m.id === marketId);
    const updatedMarkets = profile.keyMarkets.filter((m) => m.id !== marketId);

    const { data, error } = await supabase
      .from('customer_intelligence_profiles')
      .update({
        key_markets: updatedMarkets,
        updated_by: userEmail,
        updated_at: new Date().toISOString(),
      })
      .eq('customer_id', customerId)
      .select()
      .single();

    if (error) {
      console.error('Error removing market:', error);
      throw error;
    }

    await supabase.from('customer_intelligence_history').insert({
      profile_id: profile.id,
      customer_id: customerId,
      user_id: userId,
      user_email: userEmail,
      change_type: 'remove',
      field_changed: 'keyMarkets',
      previous_value: removedMarket,
      new_value: null,
    });

    return dbToProfile(data);
  } catch (err) {
    console.error('Error in removeMarket:', err);
    throw err;
  }
}

export async function updateBenchmarkPeriod(
  customerId: number,
  period: string | null,
  userId: string,
  userEmail: string
): Promise<CustomerIntelligenceProfile> {
  try {
    const profile = await getProfile(customerId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const previousValue = profile.benchmarkPeriod;

    const { data, error } = await supabase
      .from('customer_intelligence_profiles')
      .update({
        benchmark_period: period,
        updated_by: userEmail,
        updated_at: new Date().toISOString(),
      })
      .eq('customer_id', customerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating benchmark period:', error);
      throw error;
    }

    await supabase.from('customer_intelligence_history').insert({
      profile_id: profile.id,
      customer_id: customerId,
      user_id: userId,
      user_email: userEmail,
      change_type: 'modify',
      field_changed: 'benchmarkPeriod',
      previous_value: previousValue,
      new_value: period,
    });

    return dbToProfile(data);
  } catch (err) {
    console.error('Error in updateBenchmarkPeriod:', err);
    throw err;
  }
}

export async function updateAccountNotes(
  customerId: number,
  notes: string,
  userId: string,
  userEmail: string
): Promise<CustomerIntelligenceProfile> {
  try {
    const profile = await getProfile(customerId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const previousValue = profile.accountNotes;

    const { data, error } = await supabase
      .from('customer_intelligence_profiles')
      .update({
        account_notes: notes,
        updated_by: userEmail,
        updated_at: new Date().toISOString(),
      })
      .eq('customer_id', customerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating account notes:', error);
      throw error;
    }

    await supabase.from('customer_intelligence_history').insert({
      profile_id: profile.id,
      customer_id: customerId,
      user_id: userId,
      user_email: userEmail,
      change_type: 'modify',
      field_changed: 'accountNotes',
      previous_value: previousValue,
      new_value: notes,
    });

    return dbToProfile(data);
  } catch (err) {
    console.error('Error in updateAccountNotes:', err);
    throw err;
  }
}

export async function getProfileHistory(
  customerId: number,
  limit: number = 100
): Promise<ProfileHistoryEntry[]> {
  try {
    const { data, error } = await supabase
      .from('customer_intelligence_history')
      .select('*')
      .eq('customer_id', customerId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching profile history:', error);
      return [];
    }

    return (data || []).map(dbToHistoryEntry);
  } catch (err) {
    console.error('Error in getProfileHistory:', err);
    return [];
  }
}

export async function validateProductCorrelation(
  customerId: number,
  field: string,
  keywords: string[]
): Promise<CorrelationValidationResult> {
  try {
    const { count: totalCount } = await supabase
      .from('shipment_report_view')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId);

    const total = totalCount || 0;

    if (total === 0) {
      return {
        field,
        keywords,
        matchCount: 0,
        matchPercent: 0,
        sampleMatches: [],
        isValid: false,
      };
    }

    const keywordConditions = keywords.map((k) => `${field}.ilike.%${k}%`);
    const orCondition = keywordConditions.join(',');

    const { data: matchData, count: matchCount } = await supabase
      .from('shipment_report_view')
      .select(field, { count: 'exact' })
      .eq('customer_id', customerId)
      .or(orCondition);

    const matches = matchCount || 0;

    const sampleMatches: string[] = [];
    if (matchData && matchData.length > 0) {
      const uniqueValues = new Set<string>();
      for (const row of matchData) {
        const value = row[field];
        if (value && typeof value === 'string' && !uniqueValues.has(value)) {
          uniqueValues.add(value);
          if (uniqueValues.size >= 5) break;
        }
      }
      sampleMatches.push(...Array.from(uniqueValues));
    }

    return {
      field,
      keywords,
      matchCount: matches,
      matchPercent: total > 0 ? Math.round((matches / total) * 100) : 0,
      sampleMatches,
      isValid: matches > 0,
    };
  } catch (err) {
    console.error('Error in validateProductCorrelation:', err);
    return {
      field,
      keywords,
      matchCount: 0,
      matchPercent: 0,
      sampleMatches: [],
      isValid: false,
    };
  }
}

export async function getAllProfiles(): Promise<
  Array<CustomerIntelligenceProfile & { customerName: string }>
> {
  try {
    const { data, error } = await supabase
      .from('customer_intelligence_profiles')
      .select(`
        *,
        customer:customers(customer_name)
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching all profiles:', error);
      return [];
    }

    return (data || []).map((row) => ({
      ...dbToProfile(row),
      customerName: row.customer?.customer_name || 'Unknown',
    }));
  } catch (err) {
    console.error('Error in getAllProfiles:', err);
    return [];
  }
}
