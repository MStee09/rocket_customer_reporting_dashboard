import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Database
} from 'lucide-react';

interface FeedbackItem {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  trigger_type: 'correction' | 'frustration' | 'clarification' | 'data_issue';
  user_message: string;
  ai_assumption: string | null;
  actual_intent: string | null;
  field_or_calculation: string | null;
  suggested_improvement: string | null;
  conversation_context: Array<{ role: string; content: string }> | null;
  admin_notes: string | null;
  status: 'pending_review' | 'reviewed' | 'implemented' | 'dismissed';
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

type FilterStatus = 'pending_review' | 'all';

export function AIFeedbackQueue() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('pending_review');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');

  useEffect(() => {
    loadFeedback();
  }, [filter]);

  const loadFeedback = async () => {
    setLoading(true);
    let query = supabase
      .from('ai_learning_feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter === 'pending_review') {
      query = query.eq('status', 'pending_review');
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error loading feedback:', error);
    }
    setFeedback(data || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string, notes?: string) => {
    const { error } = await supabase
      .from('ai_learning_feedback')
      .update({
        status,
        admin_notes: notes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating status:', error);
      return;
    }

    loadFeedback();
    setEditingNotes(null);
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'correction':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'frustration':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'clarification':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'data_issue':
        return <Database className="w-4 h-4 text-yellow-500" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'correction':
        return 'Correction';
      case 'frustration':
        return 'Frustration';
      case 'clarification':
        return 'Clarification';
      case 'data_issue':
        return 'Data Issue';
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_review':
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      case 'reviewed':
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            Reviewed
          </span>
        );
      case 'implemented':
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
            Implemented
          </span>
        );
      case 'dismissed':
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            Dismissed
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const pendingCount = feedback.filter(f => f.status === 'pending_review').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">AI Feedback Queue</h2>
          <p className="text-sm text-gray-500">
            Review user corrections and frustration signals to improve AI responses
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterStatus)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="pending_review">Pending Review ({pendingCount})</option>
            <option value="all">All Feedback</option>
          </select>
          <button
            onClick={loadFeedback}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      ) : feedback.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
          <p className="text-gray-600 font-medium">No feedback to review!</p>
          <p className="text-sm text-gray-500 mt-1">
            {filter === 'pending_review'
              ? 'All feedback has been reviewed.'
              : 'No feedback has been captured yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedback.map((item) => (
            <div
              key={item.id}
              className="border border-gray-200 rounded-lg bg-white overflow-hidden"
            >
              <div
                className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleExpanded(item.id)}
              >
                <button className="mt-1 text-gray-400">
                  {expandedItems.has(item.id) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getTypeIcon(item.trigger_type)}
                    <span className="font-medium text-gray-900">
                      {getTypeLabel(item.trigger_type)}
                    </span>
                    {getStatusBadge(item.status)}
                    {item.customer_name && (
                      <span className="text-sm text-gray-500">
                        from {item.customer_name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 truncate">
                    "{item.user_message}"
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  {formatDate(item.created_at)}
                </div>
              </div>

              {expandedItems.has(item.id) && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-100 bg-gray-50">
                  <div className="mt-3 space-y-3">
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        User Message
                      </p>
                      <p className="text-sm text-gray-800">{item.user_message}</p>
                    </div>

                    {item.conversation_context && item.conversation_context.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                          Conversation Context
                        </p>
                        <div className="space-y-2 bg-white rounded-lg p-3 border border-gray-200 max-h-60 overflow-y-auto">
                          {item.conversation_context.map((msg, idx) => (
                            <div
                              key={idx}
                              className={`text-sm p-2 rounded ${
                                msg.role === 'user'
                                  ? 'bg-blue-50 text-blue-900'
                                  : 'bg-gray-50 text-gray-700'
                              }`}
                            >
                              <span className="font-medium capitalize">{msg.role}:</span>{' '}
                              {msg.content.length > 200
                                ? msg.content.substring(0, 200) + '...'
                                : msg.content}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.admin_notes && (
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Admin Notes
                        </p>
                        <p className="text-sm text-gray-700">{item.admin_notes}</p>
                      </div>
                    )}

                    {item.status === 'pending_review' && (
                      <div className="pt-3 border-t border-gray-200">
                        {editingNotes === item.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={notesText}
                              onChange={(e) => setNotesText(e.target.value)}
                              placeholder="Add notes about what was learned or how to improve..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateStatus(item.id, 'implemented', notesText)}
                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                              >
                                Mark Implemented
                              </button>
                              <button
                                onClick={() => updateStatus(item.id, 'reviewed', notesText)}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                              >
                                Mark Reviewed
                              </button>
                              <button
                                onClick={() => {
                                  setEditingNotes(null);
                                  setNotesText('');
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingNotes(item.id);
                                setNotesText(item.admin_notes || '');
                              }}
                              className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                            >
                              Add Notes & Review
                            </button>
                            <button
                              onClick={() => updateStatus(item.id, 'implemented')}
                              className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                            >
                              Quick Implement
                            </button>
                            <button
                              onClick={() => updateStatus(item.id, 'dismissed')}
                              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {item.reviewed_at && (
                      <p className="text-xs text-gray-500">
                        Reviewed on {formatDate(item.reviewed_at)}
                        {item.reviewed_by && ` by ${item.reviewed_by}`}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
