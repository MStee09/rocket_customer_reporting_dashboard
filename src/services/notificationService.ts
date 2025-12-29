import { supabase } from '../lib/supabase';

export type NotificationType =
  | 'shipment_delivered'
  | 'shipment_exception'
  | 'shipment_delayed'
  | 'report_ready'
  | 'schedule_run'
  | 'learning_queue'
  | 'system';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  priority: NotificationPriority;
  is_read: boolean;
  action_url?: string | null;
  action_label?: string | null;
  metadata?: Record<string, unknown> | null;
  scheduled_report_id?: string | null;
  scheduled_run_id?: string | null;
  report_url?: string | null;
  read_at?: string | null;
  created_at: string;
}

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  priority?: NotificationPriority;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  reportUrl?: string;
  scheduledReportId?: string;
  scheduledRunId?: string;
}

export async function getNotifications(
  userId: string,
  options?: { unreadOnly?: boolean; limit?: number }
): Promise<Notification[]> {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options?.unreadOnly) {
    query = query.eq('is_read', false);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return (data || []).map(n => ({
    ...n,
    priority: n.priority || 'medium'
  }));
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }

  return count || 0;
}

export async function createNotification(params: CreateNotificationParams): Promise<Notification | null> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message || null,
      priority: params.priority || 'medium',
      action_url: params.actionUrl || null,
      action_label: params.actionLabel || null,
      metadata: params.metadata || null,
      report_url: params.reportUrl || null,
      scheduled_report_id: params.scheduledReportId || null,
      scheduled_run_id: params.scheduledRunId || null,
      is_read: false
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    return null;
  }

  return data;
}

export async function markAsRead(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('id', notificationId);

  if (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }

  return true;
}

export async function markAllAsRead(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking all as read:', error);
    return false;
  }

  return true;
}

export async function deleteNotification(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    console.error('Error deleting notification:', error);
    return false;
  }

  return true;
}

export async function cleanupOldNotifications(userId: string, daysOld: number = 30): Promise<boolean> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .eq('is_read', true)
    .lt('created_at', cutoffDate.toISOString());

  if (error) {
    console.error('Error cleaning up notifications:', error);
    return false;
  }

  return true;
}

export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: Notification) => void
) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        const notif = payload.new as Notification;
        onNotification({
          ...notif,
          priority: notif.priority || 'medium'
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function createBulkNotifications(
  userIds: string[],
  params: Omit<CreateNotificationParams, 'userId'>
): Promise<number> {
  const notifications = userIds.map(userId => ({
    user_id: userId,
    type: params.type,
    title: params.title,
    message: params.message || null,
    priority: params.priority || 'medium',
    action_url: params.actionUrl || null,
    action_label: params.actionLabel || null,
    metadata: params.metadata || null,
    report_url: params.reportUrl || null,
    scheduled_report_id: params.scheduledReportId || null,
    scheduled_run_id: params.scheduledRunId || null,
    is_read: false
  }));

  const { data, error } = await supabase
    .from('notifications')
    .insert(notifications)
    .select();

  if (error) {
    console.error('Error creating bulk notifications:', error);
    return 0;
  }

  return data?.length || 0;
}

export async function getNotificationsByType(
  userId: string,
  type: NotificationType,
  options?: { limit?: number }
): Promise<Notification[]> {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('type', type)
    .order('created_at', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching notifications by type:', error);
    return [];
  }

  return (data || []).map(n => ({
    ...n,
    priority: n.priority || 'medium'
  }));
}

export async function getRecentNotifications(
  userId: string,
  hours: number = 24
): Promise<Notification[]> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hours);

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching recent notifications:', error);
    return [];
  }

  return (data || []).map(n => ({
    ...n,
    priority: n.priority || 'medium'
  }));
}
