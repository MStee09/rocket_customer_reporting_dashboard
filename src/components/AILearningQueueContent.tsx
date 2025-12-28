import { useState, useEffect } from 'react';
import { Loader2, X, AlertTriangle, CheckCircle, XCircle, GitMerge, Clock } from 'lucide-react';
import {
  getLearningQueue,
  approveAsGlobal,
  approveAsCustomer,
  rejectQueueItem,
  LearningQueueItem
} from '../services/glossaryService';
import { useAuth } from '../contexts/AuthContext';

interface ReviewModalProps {
  item: LearningQueueItem;
  onClose: () => void;
  onApproveGlobal: () => void;
  onApproveCustomer: () => void;
  onReject: (reason: string) => void;
}

function ReviewModal({ item, onClose, onApproveGlobal, onApproveCustomer, onReject }: ReviewModalProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [editedDefinition, setEditedDefinition] = useState(
    item.ai_interpretation || item.user_explanation || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApproveGlobal = async () => {
    setIsSubmitting(true);
    await onApproveGlobal();
    setIsSubmitting(false);
  };

  const handleApproveCustomer = async () => {
    setIsSubmitting(true);
    await onApproveCustomer();
    setIsSubmitting(false);
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    await onReject(rejectReason);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            Review Term: <span className="text-blue-600">{item.term}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-sm font-medium text-slate-500 mb-1">Original Query</div>
            <div className="text-slate-800">{item.original_query || 'N/A'}</div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-sm font-medium text-slate-500 mb-1">User's Explanation</div>
            <div className="text-slate-800">{item.user_explanation || 'N/A'}</div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-sm font-medium text-slate-500 mb-1">AI's Interpretation</div>
            <div className="text-slate-800">{item.ai_interpretation || 'N/A'}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Definition (editable)</label>
            <textarea
              value={editedDefinition}
              onChange={(e) => setEditedDefinition(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-slate-500">Customer:</span>{' '}
              <span className="font-medium">{item.customer_name || item.customer_id}</span>
            </div>
            <div>
              <span className="text-slate-500">Suggested Scope:</span>{' '}
              <span className="font-medium">{item.suggested_scope}</span>
            </div>
            <div>
              <span className="text-slate-500">Confidence:</span>{' '}
              <span className="font-medium">{item.confidence_score?.toFixed(2) || 'N/A'}</span>
            </div>
          </div>

          {(item.conflicts_with_global || item.conflicts_with_customer) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 font-medium text-amber-800 mb-1">
                <AlertTriangle className="w-4 h-4" />
                Conflicts Detected
              </div>
              {item.conflicts_with_global && (
                <div className="text-sm text-amber-700">
                  This term already exists in the global glossary with a different definition.
                </div>
              )}
              {item.conflicts_with_customer && (
                <div className="text-sm text-amber-700">
                  This term already exists for this customer.
                </div>
              )}
            </div>
          )}

          {item.similar_existing_terms?.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="font-medium text-blue-800 mb-2">Similar Existing Terms</div>
              <div className="flex flex-wrap gap-2">
                {item.similar_existing_terms.map((t: string, i: number) => (
                  <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200">
          {!showRejectForm ? (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleApproveGlobal}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Add to Global Glossary
              </button>
              <button
                onClick={handleApproveCustomer}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Add to {item.customer_name || item.customer_id} Only
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rejection Reason</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 h-20 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Why is this term being rejected?"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={!rejectReason || isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Reject
                </button>
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface AILearningQueueContentProps {
  onPendingCountChange?: (count: number) => void;
}

export function AILearningQueueContent({ onPendingCountChange }: AILearningQueueContentProps) {
  const { user } = useAuth();
  const [queueItems, setQueueItems] = useState<LearningQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedItem, setSelectedItem] = useState<LearningQueueItem | null>(null);

  useEffect(() => {
    fetchQueue();
  }, [statusFilter]);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const items = await getLearningQueue(statusFilter === 'all' ? undefined : statusFilter);
      setQueueItems(items);
      const pendingCount = statusFilter === 'pending' ? items.length :
        items.filter(i => i.status === 'pending').length;
      onPendingCountChange?.(pendingCount);
    } catch (error) {
      console.error('Error fetching queue:', error);
    }
    setLoading(false);
  };

  const pendingCount = queueItems.filter(i => i.status === 'pending').length;
  const approvedGlobalCount = queueItems.filter(i => i.status === 'approved_global').length;
  const approvedCustomerCount = queueItems.filter(i => i.status === 'approved_customer').length;
  const rejectedCount = queueItems.filter(i => i.status === 'rejected').length;
  const mergedCount = queueItems.filter(i => i.status === 'merged').length;

  const handleApproveGlobal = async (item: LearningQueueItem) => {
    try {
      await approveAsGlobal(
        item.id,
        {
          term: item.term,
          definition: item.ai_interpretation || item.user_explanation || '',
          category: item.suggested_category,
        },
        user?.email || 'admin'
      );
      fetchQueue();
      setSelectedItem(null);
    } catch (error) {
      console.error('Error approving:', error);
    }
  };

  const handleApproveCustomer = async (item: LearningQueueItem) => {
    try {
      await approveAsCustomer(
        item.id,
        item.customer_id,
        {
          term: item.term,
          definition: item.ai_interpretation || item.user_explanation || '',
          category: item.suggested_category,
        },
        user?.email || 'admin'
      );
      fetchQueue();
      setSelectedItem(null);
    } catch (error) {
      console.error('Error approving:', error);
    }
  };

  const handleReject = async (item: LearningQueueItem, reason: string) => {
    try {
      await rejectQueueItem(item.id, user?.email || 'admin', reason);
      fetchQueue();
      setSelectedItem(null);
    } catch (error) {
      console.error('Error rejecting:', error);
    }
  };

  const getConfidenceBadge = (score?: number) => {
    if (!score) return null;
    if (score >= 0.8) return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">High</span>;
    if (score >= 0.5) return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">Medium</span>;
    return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">Low</span>;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; icon: React.ReactNode }> = {
      pending: { bg: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3 h-3" /> },
      approved_global: { bg: 'bg-blue-100 text-blue-700', icon: <CheckCircle className="w-3 h-3" /> },
      approved_customer: { bg: 'bg-teal-100 text-teal-700', icon: <CheckCircle className="w-3 h-3" /> },
      rejected: { bg: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
      merged: { bg: 'bg-cyan-100 text-cyan-700', icon: <GitMerge className="w-3 h-3" /> },
    };
    const style = styles[status] || { bg: 'bg-slate-100 text-slate-700', icon: null };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${style.bg}`}>
        {style.icon}
        {status.replace('_', ' ')}
      </span>
    );
  };

  if (loading && queueItems.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
          <div className="text-sm text-slate-500">Pending Review</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{approvedGlobalCount}</div>
          <div className="text-sm text-slate-500">Added to Global</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-teal-600">{approvedCustomerCount}</div>
          <div className="text-sm text-slate-500">Added to Customer</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
          <div className="text-sm text-slate-500">Rejected</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-cyan-600">{mergedCount}</div>
          <div className="text-sm text-slate-500">Merged</div>
        </div>
      </div>

      <div className="flex gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="pending">Pending</option>
          <option value="approved_global">Approved (Global)</option>
          <option value="approved_customer">Approved (Customer)</option>
          <option value="rejected">Rejected</option>
          <option value="merged">Merged</option>
          <option value="all">All</option>
        </select>
        {loading && <Loader2 className="w-5 h-5 text-blue-600 animate-spin self-center" />}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Term</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">User Explanation</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Confidence</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Conflicts</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {queueItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                  No items in queue
                </td>
              </tr>
            ) : (
              queueItems.map(item => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{item.term}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                    {item.user_explanation || item.ai_interpretation || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium">
                      {item.customer_name || item.customer_id}
                    </span>
                  </td>
                  <td className="px-4 py-3">{getConfidenceBadge(item.confidence_score)}</td>
                  <td className="px-4 py-3">
                    {item.conflicts_with_global && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium mr-1">Global</span>
                    )}
                    {item.conflicts_with_customer && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">Customer</span>
                    )}
                    {!item.conflicts_with_global && !item.conflicts_with_customer && (
                      <span className="text-slate-400">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                  <td className="px-4 py-3">
                    {item.status === 'pending' && (
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        Review
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <ReviewModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onApproveGlobal={() => handleApproveGlobal(selectedItem)}
          onApproveCustomer={() => handleApproveCustomer(selectedItem)}
          onReject={(reason) => handleReject(selectedItem, reason)}
        />
      )}
    </div>
  );
}
