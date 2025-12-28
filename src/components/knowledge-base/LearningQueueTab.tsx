import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Inbox, ChevronDown, ChevronRight, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getPendingNotifications,
  getResolvedNotifications,
  dismissNotification,
} from '../../services/learningNotificationService';
import type { AILearningNotification } from '../../types/customerIntelligence';
import { LearningNotificationCard } from './LearningNotificationCard';

interface DismissModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
  isLoading: boolean;
}

function DismissModal({ isOpen, onClose, onConfirm, isLoading }: DismissModalProps) {
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    onConfirm(notes);
    setNotes('');
  };

  const handleClose = () => {
    setNotes('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Dismiss Notification</h3>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Why is this being dismissed? e.g., 'Not relevant', 'Already handled', etc."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Dismissing...
              </>
            ) : (
              'Dismiss'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LearningQueueTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingNotifications, setPendingNotifications] = useState<AILearningNotification[]>([]);
  const [resolvedNotifications, setResolvedNotifications] = useState<AILearningNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [dismissModalOpen, setDismissModalOpen] = useState(false);
  const [dismissingNotification, setDismissingNotification] = useState<AILearningNotification | null>(null);
  const [isDismissing, setIsDismissing] = useState(false);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pending, resolved] = await Promise.all([
        getPendingNotifications(),
        getResolvedNotifications(20),
      ]);
      setPendingNotifications(pending);
      setResolvedNotifications(resolved);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleAddToProfile = (notification: AILearningNotification) => {
    navigate(`/admin/customer-profiles/${notification.customerId}/edit`);
  };

  const handleDefineMapping = (notification: AILearningNotification) => {
    navigate(`/admin/customer-profiles/${notification.customerId}/edit`);
  };

  const handleDismissClick = (notification: AILearningNotification) => {
    setDismissingNotification(notification);
    setDismissModalOpen(true);
  };

  const handleDismissConfirm = async (notes: string) => {
    if (!dismissingNotification || !user) return;

    setIsDismissing(true);
    try {
      await dismissNotification(dismissingNotification.id, user.id, notes || undefined);
      setPendingNotifications((prev) =>
        prev.filter((n) => n.id !== dismissingNotification.id)
      );
      loadNotifications();
      setDismissModalOpen(false);
      setDismissingNotification(null);
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    } finally {
      setIsDismissing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Loading learning queue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Pending Review</p>
          <p className="text-2xl font-bold text-amber-600">{pendingNotifications.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Resolved</p>
          <p className="text-2xl font-bold text-green-600">
            {resolvedNotifications.filter((n) => n.status === 'resolved').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Dismissed</p>
          <p className="text-2xl font-bold text-gray-500">
            {resolvedNotifications.filter((n) => n.status === 'dismissed').length}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Pending Review ({pendingNotifications.length})
        </h3>

        {pendingNotifications.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h4>
            <p className="text-sm text-gray-500">
              No pending notifications to review. The AI is learning well!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingNotifications.map((notification) => (
              <LearningNotificationCard
                key={notification.id}
                notification={notification}
                onAddToProfile={() => handleAddToProfile(notification)}
                onDefineMapping={() => handleDefineMapping(notification)}
                onDismiss={() => handleDismissClick(notification)}
              />
            ))}
          </div>
        )}
      </div>

      {resolvedNotifications.length > 0 && (
        <div className="border-t border-gray-200 pt-6">
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            {showResolved ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
            <span className="font-medium">Resolved ({resolvedNotifications.length})</span>
          </button>

          {showResolved && (
            <div className="mt-4 space-y-3">
              {resolvedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`bg-gray-50 rounded-lg border p-3 ${
                    notification.status === 'resolved'
                      ? 'border-l-4 border-l-green-500 border-gray-200'
                      : 'border-l-4 border-l-gray-400 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {notification.status === 'resolved' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-sm font-medium text-gray-900">
                          {notification.unknownTerm}
                        </span>
                        <span className="text-xs text-gray-400">|</span>
                        <span className="text-xs text-gray-500">
                          {notification.customerName || `Customer #${notification.customerId}`}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{notification.userQuery}</p>
                      {notification.resolutionNotes && (
                        <p className="text-xs text-gray-400 mt-1 italic">
                          {notification.resolutionNotes}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        notification.status === 'resolved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {notification.resolutionType === 'added_hard'
                        ? 'Added (Hard)'
                        : notification.resolutionType === 'added_soft'
                        ? 'Added (Soft)'
                        : 'Dismissed'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <DismissModal
        isOpen={dismissModalOpen}
        onClose={() => {
          setDismissModalOpen(false);
          setDismissingNotification(null);
        }}
        onConfirm={handleDismissConfirm}
        isLoading={isDismissing}
      />
    </div>
  );
}

export default LearningQueueTab;
