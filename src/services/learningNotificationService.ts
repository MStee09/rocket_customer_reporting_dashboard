import { supabase } from '../lib/supabase';
import type { AILearningNotification } from '../types/customerIntelligence';

interface LearningNotificationRow {
  id: string;
  customer_id: number;
  customer_name?: string;
  created_at: string;
  conversation_id?: string;
  user_query: string;
  unknown_term: string;
  ai_response?: string;
  suggested_field?: string;
  suggested_keywords?: string[];
  confidence: 'high' | 'medium' | 'low';
  status: 'pending' | 'resolved' | 'dismissed';
  resolved_by?: string;
  resolved_at?: string;
  resolution_type?: string;
  resolution_notes?: string;
}

function dbToNotification(row: LearningNotificationRow): AILearningNotification {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    createdAt: row.created_at,
    conversationId: row.conversation_id,
    userQuery: row.user_query,
    unknownTerm: row.unknown_term,
    aiResponse: row.ai_response,
    suggestedField: row.suggested_field,
    suggestedKeywords: row.suggested_keywords,
    confidence: row.confidence,
    status: row.status,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    resolutionType: row.resolution_type,
    resolutionNotes: row.resolution_notes,
  };
}

export async function createNotification(data: {
  customerId: number;
  customerName?: string;
  conversationId?: string;
  userQuery: string;
  unknownTerm: string;
  aiResponse?: string;
  suggestedField?: string;
  suggestedKeywords?: string[];
  confidence: 'high' | 'medium' | 'low';
}): Promise<AILearningNotification> {
  try {
    const { data: notification, error } = await supabase
      .from('ai_learning_notifications')
      .insert({
        customer_id: data.customerId,
        customer_name: data.customerName,
        conversation_id: data.conversationId,
        user_query: data.userQuery,
        unknown_term: data.unknownTerm,
        ai_response: data.aiResponse,
        suggested_field: data.suggestedField,
        suggested_keywords: data.suggestedKeywords,
        confidence: data.confidence,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      throw error;
    }

    return dbToNotification(notification);
  } catch (err) {
    console.error('Error in createNotification:', err);
    throw err;
  }
}

export async function getPendingNotifications(): Promise<AILearningNotification[]> {
  try {
    const { data, error } = await supabase
      .from('ai_learning_notifications')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending notifications:', error);
      return [];
    }

    return (data || []).map(dbToNotification);
  } catch (err) {
    console.error('Error in getPendingNotifications:', err);
    return [];
  }
}

export async function getNotificationsByCustomer(
  customerId: number
): Promise<AILearningNotification[]> {
  try {
    const { data, error } = await supabase
      .from('ai_learning_notifications')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications by customer:', error);
      return [];
    }

    return (data || []).map(dbToNotification);
  } catch (err) {
    console.error('Error in getNotificationsByCustomer:', err);
    return [];
  }
}

export async function getNotificationCounts(): Promise<{
  pending: number;
  resolved: number;
  dismissed: number;
}> {
  try {
    const [pendingResult, resolvedResult, dismissedResult] = await Promise.all([
      supabase
        .from('ai_learning_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('ai_learning_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolved'),
      supabase
        .from('ai_learning_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'dismissed'),
    ]);

    return {
      pending: pendingResult.count || 0,
      resolved: resolvedResult.count || 0,
      dismissed: dismissedResult.count || 0,
    };
  } catch (err) {
    console.error('Error in getNotificationCounts:', err);
    return { pending: 0, resolved: 0, dismissed: 0 };
  }
}

export async function resolveNotification(
  id: string,
  resolution: {
    type: 'added_hard' | 'added_soft' | 'dismissed';
    notes?: string;
    userId: string;
  }
): Promise<AILearningNotification> {
  try {
    const status = resolution.type === 'dismissed' ? 'dismissed' : 'resolved';

    const { data, error } = await supabase
      .from('ai_learning_notifications')
      .update({
        status,
        resolution_type: resolution.type,
        resolution_notes: resolution.notes,
        resolved_by: resolution.userId,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error resolving notification:', error);
      throw error;
    }

    return dbToNotification(data);
  } catch (err) {
    console.error('Error in resolveNotification:', err);
    throw err;
  }
}

export async function dismissNotification(
  id: string,
  userId: string,
  notes?: string
): Promise<AILearningNotification> {
  return resolveNotification(id, {
    type: 'dismissed',
    notes,
    userId,
  });
}

export async function getResolvedNotifications(
  limit: number = 50
): Promise<AILearningNotification[]> {
  try {
    const { data, error } = await supabase
      .from('ai_learning_notifications')
      .select('*')
      .in('status', ['resolved', 'dismissed'])
      .order('resolved_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching resolved notifications:', error);
      return [];
    }

    return (data || []).map(dbToNotification);
  } catch (err) {
    console.error('Error in getResolvedNotifications:', err);
    return [];
  }
}
