import { supabase } from '../lib/supabase';
import type { SavedView } from '../types/customerIntelligence';

function dbToSavedView(row: any): SavedView {
  return {
    id: row.id,
    userId: row.user_id,
    customerId: row.customer_id,
    name: row.name,
    description: row.description,
    viewType: row.view_type,
    viewConfig: row.view_config,
    isPinned: row.is_pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getSavedViews(
  userId: string,
  customerId?: number
): Promise<SavedView[]> {
  try {
    let query = supabase
      .from('saved_views')
      .select('*')
      .eq('user_id', userId);

    if (customerId !== undefined) {
      query = query.eq('customer_id', customerId);
    }

    const { data, error } = await query
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching saved views:', error);
      return [];
    }

    return (data || []).map(dbToSavedView);
  } catch (err) {
    console.error('Error in getSavedViews:', err);
    return [];
  }
}

export async function createSavedView(view: {
  userId: string;
  customerId?: number;
  name: string;
  description?: string;
  viewType: 'shipments' | 'report' | 'dashboard_filter';
  viewConfig: Record<string, any>;
  isPinned?: boolean;
}): Promise<SavedView> {
  try {
    const { data, error } = await supabase
      .from('saved_views')
      .insert({
        user_id: view.userId,
        customer_id: view.customerId,
        name: view.name,
        description: view.description,
        view_type: view.viewType,
        view_config: view.viewConfig,
        is_pinned: view.isPinned ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating saved view:', error);
      throw error;
    }

    return dbToSavedView(data);
  } catch (err) {
    console.error('Error in createSavedView:', err);
    throw err;
  }
}

export async function updateSavedView(
  id: string,
  updates: {
    name?: string;
    description?: string;
    viewConfig?: Record<string, any>;
    isPinned?: boolean;
  }
): Promise<SavedView> {
  try {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description;
    }
    if (updates.viewConfig !== undefined) {
      updateData.view_config = updates.viewConfig;
    }
    if (updates.isPinned !== undefined) {
      updateData.is_pinned = updates.isPinned;
    }

    const { data, error } = await supabase
      .from('saved_views')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating saved view:', error);
      throw error;
    }

    return dbToSavedView(data);
  } catch (err) {
    console.error('Error in updateSavedView:', err);
    throw err;
  }
}

export async function deleteSavedView(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('saved_views')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting saved view:', error);
      throw error;
    }
  } catch (err) {
    console.error('Error in deleteSavedView:', err);
    throw err;
  }
}

export async function togglePin(id: string): Promise<SavedView> {
  try {
    const { data: current, error: fetchError } = await supabase
      .from('saved_views')
      .select('is_pinned')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching view for toggle:', fetchError);
      throw fetchError;
    }

    const { data, error } = await supabase
      .from('saved_views')
      .update({
        is_pinned: !current.is_pinned,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling pin:', error);
      throw error;
    }

    return dbToSavedView(data);
  } catch (err) {
    console.error('Error in togglePin:', err);
    throw err;
  }
}

export async function getPinnedViews(userId: string): Promise<SavedView[]> {
  try {
    const { data, error } = await supabase
      .from('saved_views')
      .select('*')
      .eq('user_id', userId)
      .eq('is_pinned', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching pinned views:', error);
      return [];
    }

    return (data || []).map(dbToSavedView);
  } catch (err) {
    console.error('Error in getPinnedViews:', err);
    return [];
  }
}
