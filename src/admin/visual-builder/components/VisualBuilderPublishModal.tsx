import React from 'react';
import {
  X,
  Layout,
  BarChart2,
  Shield,
  Users,
  Lock,
  Loader2,
  Rocket,
} from 'lucide-react';
import type {
  PublishDestination,
  PulseSection,
  AnalyticsSection,
} from '../types/visualBuilderTypes';

interface CustomerRecord {
  customer_id: number;
  customer_name: string;
}

interface VisualBuilderPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  publishDestination: PublishDestination;
  setPublishDestination: (dest: PublishDestination) => void;
  pulseSection: PulseSection;
  setPulseSection: (section: PulseSection) => void;
  analyticsSection: AnalyticsSection;
  setAnalyticsSection: (section: AnalyticsSection) => void;
  visibility: 'admin_only' | 'all_customers' | 'private';
  setVisibility: (vis: 'admin_only' | 'all_customers' | 'private') => void;
  isPublishing: boolean;
  onPublish: () => void;
  customers: CustomerRecord[];
  targetCustomerId: number | null;
  effectiveCustomerId: number | null;
}

export function VisualBuilderPublishModal({
  isOpen,
  onClose,
  publishDestination,
  setPublishDestination,
  pulseSection,
  setPulseSection,
  analyticsSection,
  setAnalyticsSection,
  visibility,
  setVisibility,
  isPublishing,
  onPublish,
  customers,
  targetCustomerId,
  effectiveCustomerId,
}: VisualBuilderPublishModalProps) {
  if (!isOpen) return null;

  const selectedCustomerName = customers?.find(
    (c) => c.customer_id === (targetCustomerId || effectiveCustomerId)
  )?.customer_name || 'Selected customer';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Publish Widget</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Where do you want this widget?</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPublishDestination('pulse')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  publishDestination === 'pulse' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Layout className={`w-6 h-6 ${publishDestination === 'pulse' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className={`text-sm font-medium ${publishDestination === 'pulse' ? 'text-blue-700' : 'text-slate-700'}`}>
                  Pulse Dashboard
                </span>
              </button>
              <button
                onClick={() => setPublishDestination('analytics')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  publishDestination === 'analytics' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <BarChart2 className={`w-6 h-6 ${publishDestination === 'analytics' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className={`text-sm font-medium ${publishDestination === 'analytics' ? 'text-blue-700' : 'text-slate-700'}`}>
                  Analytics Hub
                </span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Section</label>
            {publishDestination === 'pulse' ? (
              <select
                value={pulseSection}
                onChange={(e) => setPulseSection(e.target.value as PulseSection)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="key_metrics">Key Metrics (Top)</option>
                <option value="shipment_analysis">Shipment Analysis</option>
                <option value="financial_overview">Financial Overview</option>
                <option value="custom">Custom Section (Bottom)</option>
              </select>
            ) : (
              <select
                value={analyticsSection}
                onChange={(e) => setAnalyticsSection(e.target.value as AnalyticsSection)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="overview">Overview</option>
                <option value="trends">Trends</option>
                <option value="comparisons">Comparisons</option>
                <option value="custom">Custom Section</option>
              </select>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Who can see this?</label>
            <div className="flex gap-2">
              <button
                onClick={() => setVisibility('admin_only')}
                className={`flex-1 flex flex-col items-center justify-center gap-1 p-3 rounded-lg border text-sm ${
                  visibility === 'admin_only' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span className="font-medium">Admin Only</span>
                <span className="text-xs text-slate-500">Only you and other admins</span>
              </button>
              <button
                onClick={() => setVisibility('all_customers')}
                className={`flex-1 flex flex-col items-center justify-center gap-1 p-3 rounded-lg border text-sm ${
                  visibility === 'all_customers' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="font-medium">All Customers</span>
                <span className="text-xs text-slate-500">System-wide widget</span>
              </button>
              <button
                onClick={() => setVisibility('private')}
                className={`flex-1 flex flex-col items-center justify-center gap-1 p-3 rounded-lg border text-sm ${
                  visibility === 'private' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span className="font-medium">This Customer</span>
                <span className="text-xs text-slate-500">
                  {selectedCustomerName} only
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={onPublish}
            disabled={isPublishing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-slate-400"
          >
            {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}

export default VisualBuilderPublishModal;
