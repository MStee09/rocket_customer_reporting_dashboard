import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Flag, CheckCircle, Eye, Clock, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

interface AuditLog {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  user_request: string;
  ai_interpretation: string | null;
  report_definition: Record<string, unknown> | null;
  query_used: string | null;
  conversation: Array<{ role: string; content: string }> | null;
  user_feedback: string | null;
  feedback_type: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

type FilterStatus = 'flagged' | 'ok' | 'reviewed' | 'fixed' | 'all';

export function AIAuditLog() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('flagged');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedConversation, setExpandedConversation] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [filter]);

  const loadLogs = async () => {
    setLoading(true);
    let query = supabase
      .from('ai_report_audit')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Failed to load audit logs:', error);
    }
    setLogs(data || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string, notes?: string) => {
    const updates: Record<string, unknown> = { status };
    if (notes !== undefined) {
      updates.admin_notes = notes;
    }
    if (status === 'reviewed' || status === 'fixed') {
      updates.reviewed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('ai_report_audit')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Failed to update status:', error);
      return;
    }

    if (selectedLog?.id === id) {
      setSelectedLog({ ...selectedLog, status, admin_notes: notes || selectedLog.admin_notes });
    }
    loadLogs();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'flagged':
        return <Flag className="w-4 h-4 text-red-500" />;
      case 'reviewed':
        return <Eye className="w-4 h-4 text-amber-500" />;
      case 'fixed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      flagged: 'bg-red-100 text-red-700',
      ok: 'bg-gray-100 text-gray-700',
      reviewed: 'bg-amber-100 text-amber-700',
      fixed: 'bg-green-100 text-green-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.ok}`}>
        {status}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const flaggedCount = logs.filter(l => l.status === 'flagged').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">AI Audit Log</h2>
          <p className="text-sm text-gray-500">Review flagged reports and see what went wrong</p>
        </div>
        <div className="flex items-center gap-4">
          {filter === 'flagged' && flaggedCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-red-700">{flaggedCount} flagged</span>
            </div>
          )}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterStatus)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="flagged">Flagged Issues</option>
            <option value="ok">Recent Reports</option>
            <option value="reviewed">Reviewed</option>
            <option value="fixed">Fixed</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No audit logs found</p>
          <p className="text-sm text-gray-400 mt-1">
            {filter === 'flagged' ? 'No flagged reports to review' : 'Reports will appear here as they are generated'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2 max-h-[600px] overflow-auto pr-2">
            {logs.map((log) => (
              <div
                key={log.id}
                onClick={() => {
                  setSelectedLog(log);
                  setExpandedConversation(false);
                }}
                className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                  selectedLog?.id === log.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(log.status)}
                    <span className="font-medium text-gray-900 text-sm">
                      {log.customer_name || 'Unknown Customer'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(log.created_at)}</span>
                </div>
                <p className="text-sm text-gray-600 truncate">{log.user_request}</p>
                {log.user_feedback && (
                  <p className="text-sm text-red-600 truncate mt-1 italic">"{log.user_feedback}"</p>
                )}
              </div>
            ))}
          </div>

          {selectedLog ? (
            <div className="border border-gray-200 rounded-lg p-4 space-y-4 max-h-[600px] overflow-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Audit Details</h3>
                {getStatusBadge(selectedLog.status)}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  User Asked
                </label>
                <p className="bg-gray-50 p-3 rounded-lg text-sm text-gray-800">
                  {selectedLog.user_request}
                </p>
              </div>

              {selectedLog.user_feedback && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-red-500 uppercase tracking-wide">
                    User Complaint
                  </label>
                  <p className="bg-red-50 p-3 rounded-lg text-sm text-red-800 border border-red-100">
                    {selectedLog.user_feedback}
                  </p>
                </div>
              )}

              {selectedLog.ai_interpretation && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    AI Understood
                  </label>
                  <p className="bg-gray-50 p-3 rounded-lg text-sm text-gray-800">
                    {selectedLog.ai_interpretation}
                  </p>
                </div>
              )}

              {selectedLog.report_definition && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Report Built
                  </label>
                  <pre className="bg-gray-100 p-3 rounded-lg text-xs overflow-auto max-h-40 text-gray-700">
                    {JSON.stringify(selectedLog.report_definition, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.query_used && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Query Used
                  </label>
                  <pre className="bg-gray-100 p-3 rounded-lg text-xs overflow-auto max-h-40 text-gray-700 font-mono">
                    {selectedLog.query_used}
                  </pre>
                </div>
              )}

              {selectedLog.conversation && selectedLog.conversation.length > 0 && (
                <div className="space-y-1">
                  <button
                    onClick={() => setExpandedConversation(!expandedConversation)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    {expandedConversation ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    View Full Conversation ({selectedLog.conversation.length} messages)
                  </button>
                  {expandedConversation && (
                    <div className="bg-gray-100 p-3 rounded-lg space-y-2 max-h-60 overflow-auto">
                      {selectedLog.conversation.map((msg, i) => (
                        <div
                          key={i}
                          className={`p-2 rounded text-sm ${
                            msg.role === 'user'
                              ? 'bg-blue-50 text-blue-900'
                              : 'bg-white text-gray-700'
                          }`}
                        >
                          <span className="font-medium capitalize">{msg.role}: </span>
                          <span className="whitespace-pre-wrap">{msg.content.substring(0, 500)}
                            {msg.content.length > 500 && '...'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedLog.admin_notes && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Admin Notes
                  </label>
                  <p className="bg-amber-50 p-3 rounded-lg text-sm text-amber-800 border border-amber-100">
                    {selectedLog.admin_notes}
                  </p>
                </div>
              )}

              {(selectedLog.status === 'flagged' || selectedLog.status === 'ok') && (
                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => updateStatus(selectedLog.id, 'reviewed')}
                    className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors"
                  >
                    Mark Reviewed
                  </button>
                  <button
                    onClick={() => updateStatus(selectedLog.id, 'fixed')}
                    className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                  >
                    Mark Fixed
                  </button>
                  <button
                    onClick={() => {
                      const notes = prompt('Add admin notes:');
                      if (notes) updateStatus(selectedLog.id, selectedLog.status, notes);
                    }}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    Add Notes
                  </button>
                </div>
              )}

              {selectedLog.status === 'reviewed' && (
                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => updateStatus(selectedLog.id, 'fixed')}
                    className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                  >
                    Mark Fixed
                  </button>
                  <button
                    onClick={() => updateStatus(selectedLog.id, 'flagged')}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                  >
                    Re-flag
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-8 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Select an audit log to view details</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
