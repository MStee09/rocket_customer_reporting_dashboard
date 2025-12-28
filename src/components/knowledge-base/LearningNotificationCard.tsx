import { AlertTriangle, CheckCircle, XCircle, Clock, User, MessageSquare, Search, Sparkles, ArrowRight, X } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import type { AILearningNotification } from '../../types/customerIntelligence';

interface LearningNotificationCardProps {
  notification: AILearningNotification;
  onAddToProfile: () => void;
  onDefineMapping: () => void;
  onDismiss: () => void;
}

function getStatusStyles(status: AILearningNotification['status']) {
  switch (status) {
    case 'pending':
      return {
        borderColor: 'border-l-amber-500',
        badgeBg: 'bg-amber-100 text-amber-700',
        icon: AlertTriangle,
        label: 'Pending',
      };
    case 'resolved':
      return {
        borderColor: 'border-l-green-500',
        badgeBg: 'bg-green-100 text-green-700',
        icon: CheckCircle,
        label: 'Resolved',
      };
    case 'dismissed':
      return {
        borderColor: 'border-l-gray-400',
        badgeBg: 'bg-gray-100 text-gray-600',
        icon: XCircle,
        label: 'Dismissed',
      };
    default:
      return {
        borderColor: 'border-l-gray-300',
        badgeBg: 'bg-gray-100 text-gray-600',
        icon: Clock,
        label: 'Unknown',
      };
  }
}

function getConfidenceStyles(confidence: AILearningNotification['confidence']) {
  switch (confidence) {
    case 'high':
      return 'text-green-600';
    case 'medium':
      return 'text-amber-600';
    case 'low':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

export function LearningNotificationCard({
  notification,
  onAddToProfile,
  onDefineMapping,
  onDismiss,
}: LearningNotificationCardProps) {
  const statusStyles = getStatusStyles(notification.status);
  const StatusIcon = statusStyles.icon;
  const timeAgo = formatDistanceToNow(parseISO(notification.createdAt), { addSuffix: true });
  const isPending = notification.status === 'pending';

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 border-l-4 ${statusStyles.borderColor} shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles.badgeBg}`}>
              <StatusIcon className="w-3 h-3" />
              {statusStyles.label}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <User className="w-3 h-3" />
            <span>{notification.customerName || `Customer #${notification.customerId}`}</span>
            <span className="text-gray-300">|</span>
            <Clock className="w-3 h-3" />
            <span>{timeAgo}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 mb-0.5">User asked:</p>
              <p className="text-sm text-gray-800">{notification.userQuery}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Unknown term:</p>
              <span className="inline-block px-2 py-0.5 bg-amber-50 border border-amber-200 rounded text-sm font-medium text-amber-800">
                {notification.unknownTerm}
              </span>
            </div>
          </div>

          {notification.aiResponse && (
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 mb-0.5">AI responded:</p>
                <p className="text-sm text-gray-600">{notification.aiResponse}</p>
              </div>
            </div>
          )}

          {notification.suggestedField && (
            <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
              <Search className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-blue-600 font-medium mb-1">AI Suggestion</p>
                <p className="text-sm text-blue-800">
                  Search <span className="font-medium">{notification.suggestedField}</span>
                  {notification.suggestedKeywords && notification.suggestedKeywords.length > 0 && (
                    <> for: {notification.suggestedKeywords.join(', ')}</>
                  )}
                </p>
                <p className={`text-xs mt-1 ${getConfidenceStyles(notification.confidence)}`}>
                  Confidence: {notification.confidence}
                </p>
              </div>
            </div>
          )}

          {notification.resolutionNotes && (
            <div className="text-xs text-gray-500 italic border-t border-gray-100 pt-2 mt-2">
              Note: {notification.resolutionNotes}
            </div>
          )}
        </div>

        {isPending && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={onAddToProfile}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add to Profile
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDefineMapping}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Define Mapping
            </button>
            <button
              onClick={onDismiss}
              className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 text-sm hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ml-auto"
            >
              <X className="w-3.5 h-3.5" />
              Dismiss
            </button>
          </div>
        )}

        {!isPending && notification.resolvedAt && notification.resolvedBy && (
          <div className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
            {notification.resolutionType === 'dismissed' ? 'Dismissed' : 'Resolved'} by{' '}
            {notification.resolvedBy} {formatDistanceToNow(parseISO(notification.resolvedAt), { addSuffix: true })}
          </div>
        )}
      </div>
    </div>
  );
}

export default LearningNotificationCard;
