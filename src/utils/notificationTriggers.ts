import { createNotification, NotificationPriority } from '../services/notificationService';

export async function notifyReportReady(
  userId: string,
  reportName: string,
  reportId: string
) {
  return createNotification({
    userId,
    type: 'report_ready',
    title: 'Report Ready',
    message: `Your scheduled report "${reportName}" is ready to view.`,
    priority: 'medium',
    actionUrl: `/reports/${reportId}`,
    actionLabel: 'View Report',
    metadata: { reportId, reportName }
  });
}

export async function notifyShipmentDelivered(
  userId: string,
  loadId: number,
  destination: string
) {
  return createNotification({
    userId,
    type: 'shipment_delivered',
    title: 'Shipment Delivered',
    message: `Load #${loadId} has been delivered to ${destination}.`,
    priority: 'low',
    actionUrl: `/shipments?load=${loadId}`,
    actionLabel: 'View Shipment',
    metadata: { loadId, destination }
  });
}

export async function notifyShipmentException(
  userId: string,
  loadId: number,
  exceptionType: string,
  details: string
) {
  return createNotification({
    userId,
    type: 'shipment_exception',
    title: 'Shipment Exception',
    message: `Load #${loadId}: ${exceptionType} - ${details}`,
    priority: 'high',
    actionUrl: `/shipments?load=${loadId}`,
    actionLabel: 'View Details',
    metadata: { loadId, exceptionType, details }
  });
}

export async function notifyShipmentDelayed(
  userId: string,
  loadId: number,
  originalDate: string,
  newDate: string,
  reason?: string
) {
  return createNotification({
    userId,
    type: 'shipment_delayed',
    title: 'Shipment Delayed',
    message: `Load #${loadId} delivery changed from ${originalDate} to ${newDate}.${reason ? ` Reason: ${reason}` : ''}`,
    priority: 'medium',
    actionUrl: `/shipments?load=${loadId}`,
    actionLabel: 'View Shipment',
    metadata: { loadId, originalDate, newDate, reason }
  });
}

export async function notifyLearningQueueItem(
  userId: string,
  customerName: string,
  unknownTerm: string
) {
  return createNotification({
    userId,
    type: 'learning_queue',
    title: 'New Learning Item',
    message: `AI encountered unknown term "${unknownTerm}" for ${customerName}. Review needed.`,
    priority: 'low',
    actionUrl: '/admin/knowledge-base?tab=learning',
    actionLabel: 'Review',
    metadata: { customerName, unknownTerm }
  });
}

export async function notifyScheduleComplete(
  userId: string,
  scheduleName: string,
  recipientCount: number
) {
  return createNotification({
    userId,
    type: 'schedule_run',
    title: 'Scheduled Report Sent',
    message: `"${scheduleName}" was sent to ${recipientCount} recipient${recipientCount !== 1 ? 's' : ''}.`,
    priority: 'low',
    actionUrl: '/scheduled-reports',
    actionLabel: 'View Schedule',
    metadata: { scheduleName, recipientCount }
  });
}

export async function notifySystem(
  userId: string,
  title: string,
  message: string,
  priority: NotificationPriority = 'medium',
  actionUrl?: string,
  actionLabel?: string
) {
  return createNotification({
    userId,
    type: 'system',
    title,
    message,
    priority,
    actionUrl,
    actionLabel
  });
}
