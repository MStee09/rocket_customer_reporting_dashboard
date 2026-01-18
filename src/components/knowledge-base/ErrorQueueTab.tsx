import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Database,
  Code,
  HelpCircle,
  Zap,
  MessageSquare,
  Eye,
  X,
} from 'lucide-react';

interface AIError {
  id: string;
  error_type: string;
  error_subtype: string | null;
  error_message: string;
  error_details: Record<string, unknown>;
  customer_id: number | null;
  question: string | null;
  tool_name: string | null;
  tool_input: Record<string, unknown> | null;
  suggested_fix_type: string | null;
  suggested_fix_details: Record<string, unknown> | null;
  occurrence_count: number;
  first_occurred_at: string;
  last_occurred_at: string;
  status: 'new' | 'reviewing' | 'fixed' | 'dismissed' | 'wont_fix';
  resolution_notes: string | null;
}

interface ErrorSummary {
  total_new: number;
  total_reviewing: number;
  total_fixed: number;
  total_dismissed: number;
  by_type: Record<string, number>;
  top_errors: AIError[];
  recent_errors: AIError[];
}

const ERROR_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  schema_error: { label: 'Schema Error', icon: Database, color: 'text-red-600 bg-red-50' },
  query_error: { label: 'Query Error', icon: Code, color: 'text-orange-600 bg-orange-50' },
  unknown_term: { label: 'Unknown Term', icon: HelpCircle, color: 'text-yellow-600 bg-yellow-50' },
  tool_error: { label: 'Tool Error', icon: Zap, color: 'text-purple-600 bg-purple-50' },
  timeout_error: { label: 'Timeout', icon: Clock, color: 'text-blue-600 bg-blue-50' },
  other: { label: 'Other', icon: AlertTriangle, color: 'text-slate-600 bg-slate-50' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-red-100 text-red-700' },
  reviewing: { label: 'Reviewing', color: 'bg-yellow-100 text-yellow-700' },
  fixed: { label: 'Fixed', color: 'bg-green-100 text-green-700' },
  dismissed: { label: 'Dismissed', color: 'bg-slate-100 text-slate-700' },
  wont_fix: { label: "Won't Fix", color: 'bg-slate-100 text-slate-500' },
};

export function ErrorQueueTab() {
  const [summary, setSummary] = useState<ErrorSummary | null>(null);
  const [errors, setErrors] = useState<AIError[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<AIError | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('new');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    loadData();
  }, [filterType, filterStatus]);

  const loadData = async () => {
    setLoading(true);

    const { data: summaryData } = await supabase.rpc('get_ai_error_summary');
    if (summaryData) {
      setSummary(summaryData);
    }

    let query = supabase
      .from('ai_error_log')
      .select('*')
      .order('last_occurred_at', { ascending: false })
      .limit(100);

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }
    if (filterType !== 'all') {
      query = query.eq('error_type', filterType);
    }

    const { data: errorData } = await query;
    setErrors(errorData || []);
    setLoading(false);
  };

  const resolveError = async (errorId: string, status: string) => {
    await supabase.rpc('resolve_ai_error', {
      p_error_id: errorId,
      p_status: status,
      p_resolution_notes: resolutionNotes || null,
    });
    setResolutionNotes('');
    setSelectedError(null);
    loadData();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const ErrorTypeIcon = ({ type }: { type: string }) => {
    const config = ERROR_TYPE_CONFIG[type] || ERROR_TYPE_CONFIG.other;
    const Icon = config.icon;
    return (
      <div className={`p-2 rounded-lg ${config.color}`}>
        <Icon className="w-4 h-4" />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-600 font-medium">New Errors</span>
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-700 mt-1">{summary.total_new}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-yellow-600 font-medium">Reviewing</span>
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-yellow-700 mt-1">{summary.total_reviewing}</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-600 font-medium">Fixed</span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-700 mt-1">{summary.total_fixed}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 font-medium">Dismissed</span>
              <XCircle className="w-5 h-5 text-slate-500" />
            </div>
            <p className="text-2xl font-bold text-slate-700 mt-1">{summary.total_dismissed}</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 bg-white border rounded-xl p-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-600">Filters:</span>
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 border rounded-lg text-sm"
        >
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="reviewing">Reviewing</option>
          <option value="fixed">Fixed</option>
          <option value="dismissed">Dismissed</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 border rounded-lg text-sm"
        >
          <option value="all">All Types</option>
          <option value="schema_error">Schema Errors</option>
          <option value="query_error">Query Errors</option>
          <option value="unknown_term">Unknown Terms</option>
          <option value="tool_error">Tool Errors</option>
          <option value="timeout_error">Timeouts</option>
        </select>

        <button
          onClick={loadData}
          className="ml-auto flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : errors.length === 0 ? (
        <div className="text-center py-12 bg-white border rounded-xl">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-900">No Errors Found</h3>
          <p className="text-slate-500 mt-1">
            {filterStatus === 'new'
              ? 'All errors have been addressed!'
              : 'No errors match the current filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {errors.map((error) => (
            <div
              key={error.id}
              className="bg-white border rounded-xl overflow-hidden"
            >
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50"
                onClick={() => setExpandedId(expandedId === error.id ? null : error.id)}
              >
                <ErrorTypeIcon type={error.error_type} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 truncate">
                      {error.error_message.slice(0, 80)}
                      {error.error_message.length > 80 && '...'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[error.status]?.color}`}>
                      {STATUS_CONFIG[error.status]?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span>{ERROR_TYPE_CONFIG[error.error_type]?.label}</span>
                    {error.error_subtype && (
                      <>
                        <span>•</span>
                        <span>{error.error_subtype}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{error.occurrence_count}x</span>
                    <span>•</span>
                    <span>{formatDate(error.last_occurred_at)}</span>
                  </div>
                </div>

                {expandedId === error.id ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>

              {expandedId === error.id && (
                <div className="border-t bg-slate-50 p-4 space-y-4">
                  {error.question && (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        User Question
                      </label>
                      <div className="flex items-start gap-2 bg-white p-3 rounded-lg border">
                        <MessageSquare className="w-4 h-4 text-slate-400 mt-0.5" />
                        <span className="text-sm text-slate-700">{error.question}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Error Message
                    </label>
                    <pre className="bg-red-50 text-red-700 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                      {error.error_message}
                    </pre>
                  </div>

                  {error.tool_name && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Tool
                        </label>
                        <code className="text-sm bg-slate-100 px-2 py-1 rounded">
                          {error.tool_name}
                        </code>
                      </div>
                      {error.tool_input && (
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">
                            Tool Input
                          </label>
                          <pre className="bg-slate-100 p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(error.tool_input, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {error.suggested_fix_details && (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Suggested Fix
                      </label>
                      <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg">
                        <p className="text-sm text-blue-700">
                          {(error.suggested_fix_details as Record<string, string>).suggestion ||
                           JSON.stringify(error.suggested_fix_details)}
                        </p>
                      </div>
                    </div>
                  )}

                  {error.status === 'new' || error.status === 'reviewing' ? (
                    <div className="flex items-center gap-3 pt-2 border-t">
                      <input
                        type="text"
                        placeholder="Add resolution notes (optional)"
                        value={selectedError?.id === error.id ? resolutionNotes : ''}
                        onChange={(e) => {
                          setSelectedError(error);
                          setResolutionNotes(e.target.value);
                        }}
                        className="flex-1 px-3 py-2 border rounded-lg text-sm"
                      />
                      <button
                        onClick={() => resolveError(error.id, 'fixed')}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
                      >
                        Mark Fixed
                      </button>
                      <button
                        onClick={() => resolveError(error.id, 'dismissed')}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300"
                      >
                        Dismiss
                      </button>
                      {error.status === 'new' && (
                        <button
                          onClick={() => resolveError(error.id, 'reviewing')}
                          className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200"
                        >
                          Start Review
                        </button>
                      )}
                    </div>
                  ) : (
                    error.resolution_notes && (
                      <div className="pt-2 border-t">
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Resolution Notes
                        </label>
                        <p className="text-sm text-slate-600">{error.resolution_notes}</p>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
