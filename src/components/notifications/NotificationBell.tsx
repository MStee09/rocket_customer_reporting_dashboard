import { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, X, FileText, Clock, ExternalLink, Trash2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import * as notificationService from '../../services/notificationService';
import type { Notification, NotificationPriority } from '../../services/notificationService';

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        notificationService.getNotifications(user.id, { limit: 20 }),
        notificationService.getUnreadCount(user.id)
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = notificationService.subscribeToNotifications(user.id, (newNotif) => {
      setNotifications(prev => [newNotif, ...prev].slice(0, 20));
      setUnreadCount(prev => prev + 1);
    });

    return unsubscribe;
  }, [user?.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const success = await notificationService.markAsRead(id);
    if (success) {
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    const success = await notificationService.markAllAsRead(user.id);
    if (success) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const notification = notifications.find(n => n.id === id);
    const success = await notificationService.deleteNotification(id);
    if (success) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }

    const url = notification.action_url || notification.report_url;
    if (url) {
      if (url.startsWith('http')) {
        window.open(url, '_blank');
      } else {
        navigate(url);
      }
    }
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string, priority: NotificationPriority) => {
    if (priority === 'urgent') {
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }
    if (priority === 'high') {
      return <AlertCircle className="w-5 h-5 text-orange-500" />;
    }

    switch (type) {
      case 'scheduled_report':
      case 'report_ready':
      case 'schedule_run':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'shipment_delivered':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'shipment_exception':
      case 'shipment_delayed':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'learning_queue':
        return <Info className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPriorityBorder = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent': return 'border-l-4 border-l-red-500';
      case 'high': return 'border-l-4 border-l-orange-500';
      case 'medium': return 'border-l-4 border-l-blue-500';
      default: return 'border-l-4 border-l-gray-200';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No notifications yet</p>
                <p className="text-sm text-gray-400 mt-1">We'll notify you when something happens</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex items-start gap-3 px-4 py-3 border-b cursor-pointer transition-colors ${getPriorityBorder(notification.priority)} ${
                    notification.is_read
                      ? 'bg-white hover:bg-gray-50'
                      : 'bg-blue-50/50 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type, notification.priority)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <p className={`text-sm flex-1 ${notification.is_read ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"></span>
                      )}
                    </div>
                    {notification.message && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {notification.action_label && (notification.action_url || notification.report_url) && (
                        <span className="text-xs text-blue-600 flex items-center gap-1">
                          {notification.action_label}
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!notification.is_read && (
                      <button
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(notification.id, e)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t bg-gray-50">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/settings');
                }}
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
