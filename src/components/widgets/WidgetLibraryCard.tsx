import { Lock, Sparkles, FileBarChart, Wrench, Globe, Users, Shield, ChevronRight, Mail, Copy, AlertTriangle, Circle, Activity, Plus, Check, AlertCircle, Camera, RefreshCw } from 'lucide-react';
import { isSystemWidget, sizeToColSpan } from '../../config/widgets';
import { WidgetIcon } from './WidgetIcon';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { duplicateCustomerWidgetToAdmin } from '../../config/widgets/customWidgetStorage';
import { useDashboardWidgets } from '../../hooks/useDashboardWidgets';
import { useAuth } from '../../contexts/AuthContext';

interface WidgetLibraryCardProps {
  widget: any;
  isAdmin: boolean;
  isCustomerCreated?: boolean;
  isAdminCustom?: boolean;
  currentUserId?: string;
  onClick: () => void;
}

export const WidgetLibraryCard = ({ widget, isAdmin, isCustomerCreated, isAdminCustom, currentUserId, onClick }: WidgetLibraryCardProps) => {
  const isSystem = isSystemWidget(widget.id);
  const isCustom = !isSystem;
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isAddingToDashboard, setIsAddingToDashboard] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addWidget, removeWidget, isWidgetOnDashboard } = useDashboardWidgets();
  const { isViewingAsCustomer, viewingCustomer } = useAuth();
  const onDashboard = isWidgetOnDashboard(widget.id);

  const iconColor = widget.iconColor || widget.display?.iconColor || 'bg-slate-500';
  const source = isSystem ? 'system' : (widget.source || 'custom');
  const size = widget.defaultSize || widget.display?.defaultSize || 'small';
  const sizeLabel = size === 'full' ? '3 cols' : size === 'wide' ? '2 cols' : '1 col';
  const dataMode = widget.dataMode || 'dynamic';
  const isStaticWidget = !isSystem && dataMode === 'static';

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDuplicating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const result = await duplicateCustomerWidgetToAdmin(
        supabase,
        widget,
        user.id,
        user.email || ''
      );

      if (result.success) {
        alert('Widget duplicated to your admin library');
        window.location.reload();
      } else {
        alert('Failed to duplicate widget: ' + result.error);
      }
    } catch (err) {
      alert('Error duplicating widget');
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleContactCustomer = (e: React.MouseEvent) => {
    e.stopPropagation();
    const email = widget.createdBy?.userEmail;
    if (email) {
      window.location.href = `mailto:${email}?subject=Regarding your widget: ${widget.name}`;
    }
  };

  const handleAddToDashboard = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isViewingAsCustomer) {
      setShowConfirmModal(true);
      return;
    }

    await performAddWidget();
  };

  const performAddWidget = async () => {
    setIsAddingToDashboard(true);
    setError(null);

    try {
      await addWidget(widget.id, { size });
      setShowConfirmModal(false);
    } catch (err: any) {
      console.error('Failed to add widget to dashboard:', err);
      setError(err.message || 'Failed to add widget to dashboard');
    } finally {
      setIsAddingToDashboard(false);
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${iconColor} flex items-center justify-center flex-shrink-0`}>
          <WidgetIcon name={widget.icon || widget.display?.icon} className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 truncate">{widget.name}</h3>
          <p className="text-sm text-slate-500 line-clamp-2">{widget.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full capitalize">
          {widget.type.replace('_', ' ')}
        </span>

        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
          {sizeLabel}
        </span>

        {isSystem ? (
          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
            <Lock className="w-3 h-3" />
            System
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full flex items-center gap-1">
            {source === 'ai' ? (
              <><Sparkles className="w-3 h-3" /> AI</>
            ) : source === 'report' ? (
              <><FileBarChart className="w-3 h-3" /> Report</>
            ) : (
              <><Wrench className="w-3 h-3" /> Custom</>
            )}
          </span>
        )}

        {isCustomerCreated && widget.createdBy && (
          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full flex items-center gap-1 max-w-[140px]">
            <Users className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{widget.createdBy.customerName || widget.createdBy.userEmail || 'Customer'}</span>
          </span>
        )}

        {isAdminCustom && widget.createdBy?.userEmail && (
          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full flex items-center gap-1">
            <Shield className="w-3 h-3" />
            {widget.createdBy.userEmail}
          </span>
        )}

        {isStaticWidget && (
          <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
            <Camera className="w-3 h-3" />
            Static
          </span>
        )}
      </div>

      {isCustomerCreated && widget.createdBy && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-700 mb-0.5">
                Created by:
              </div>
              <div className="text-xs text-slate-600 truncate">
                {widget.createdBy.userEmail || 'Unknown user'}
              </div>
              {widget.createdBy.customerName && (
                <div className="text-xs text-slate-500 truncate">
                  {widget.createdBy.customerName}
                </div>
              )}
            </div>
            <WidgetStatusBadge widget={widget} />
          </div>
          <div className="text-xs text-slate-500">
            {formatRelativeDate(widget.createdAt)}
          </div>
        </div>
      )}

      {isAdminCustom && widget.createdBy && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-700 mb-0.5">
                Created by:
              </div>
              <div className="text-xs text-slate-600 truncate">
                {widget.createdBy.userEmail || widget.createdBy.email || 'Admin'}
              </div>
            </div>
            <WidgetStatusBadge widget={widget} />
          </div>
          <div className="text-xs text-slate-500">
            {formatRelativeDate(widget.createdAt)}
          </div>
        </div>
      )}

      {isCustom && !isCustomerCreated && !isAdminCustom && widget.createdBy && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-start justify-between mb-1">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-700 mb-0.5">
                Created by:
              </div>
              <div className="text-xs text-slate-600 truncate">
                {widget.createdBy.userEmail || 'Unknown user'}
              </div>
              {widget.createdBy.customerName && (
                <div className="text-xs text-slate-500 truncate">
                  {widget.createdBy.customerName}
                </div>
              )}
            </div>
            <WidgetStatusBadge widget={widget} />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{widget.createdAt ? formatRelativeDate(widget.createdAt) : ''}</span>
            {isAdmin && <VisibilityBadge visibility={widget.visibility} />}
          </div>
        </div>
      )}

      {isCustomerCreated ? (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
          <button
            onClick={handleDuplicate}
            disabled={isDuplicating}
            className="flex-1 px-2 py-1.5 bg-blue-50 text-blue-600 rounded text-xs font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <Copy className="w-3 h-3" />
            {isDuplicating ? 'Duplicating...' : 'Duplicate'}
          </button>
          <button
            onClick={handleContactCustomer}
            className="px-2 py-1.5 bg-slate-50 text-slate-600 rounded text-xs font-medium hover:bg-slate-100 transition-colors flex items-center justify-center"
          >
            <Mail className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="mt-3 pt-3 border-t border-slate-100">
          {error && (
            <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              {error}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddToDashboard}
              disabled={isAddingToDashboard || onDashboard}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                onDashboard
                  ? 'bg-green-50 text-green-700 cursor-default'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              } disabled:opacity-50`}
            >
              {onDashboard ? (
                <>
                  <Check className="w-4 h-4" />
                  On Dashboard
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  {isAddingToDashboard ? 'Adding...' : 'Add to Dashboard'}
                </>
              )}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              className="px-3 py-2 bg-slate-50 text-slate-600 rounded-lg text-sm hover:bg-slate-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowConfirmModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">
                  Add to Customer Dashboard?
                </h3>
                <p className="text-sm text-slate-600">
                  You're currently viewing as <span className="font-medium text-slate-900">{viewingCustomer?.company_name}</span>. This widget will be added to their dashboard and will be visible to them.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <div className={`w-8 h-8 rounded-lg ${iconColor} flex items-center justify-center flex-shrink-0`}>
                  <WidgetIcon name={widget.icon || widget.display?.icon} className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 text-sm">{widget.name}</div>
                  <div className="text-xs text-slate-500">{widget.type.replace('_', ' ')}</div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setError(null);
                }}
                disabled={isAddingToDashboard}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={performAddWidget}
                disabled={isAddingToDashboard}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAddingToDashboard ? (
                  <>Adding...</>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Widget
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const WidgetStatusBadge = ({ widget }: { widget: any }) => {
  const lastUpdated = widget.updatedAt || widget.createdAt;
  const daysSinceUpdate = lastUpdated
    ? Math.floor((Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  if (daysSinceUpdate === null) {
    return (
      <span className="flex items-center gap-1 text-xs text-slate-400">
        <Circle className="w-2.5 h-2.5 fill-slate-400" />
        Unknown
      </span>
    );
  }

  if (daysSinceUpdate > 30) {
    return (
      <span className="flex items-center gap-1 text-xs text-slate-400">
        <Circle className="w-2.5 h-2.5 fill-slate-400" />
        Inactive
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-xs text-green-600">
      <Circle className="w-2.5 h-2.5 fill-green-600" />
      Active
    </span>
  );
};

const VisibilityBadge = ({ visibility }: { visibility: any }) => {
  if (!visibility) return null;

  switch (visibility.type) {
    case 'all_customers':
      return (
        <span className="flex items-center gap-1 text-slate-500">
          <Globe className="w-3 h-3" /> All
        </span>
      );
    case 'specific_customers':
      return (
        <span className="flex items-center gap-1 text-slate-500">
          <Users className="w-3 h-3" /> {visibility.customerIds?.length || 0}
        </span>
      );
    case 'private':
      return (
        <span className="flex items-center gap-1 text-slate-500">
          <Lock className="w-3 h-3" /> Private
        </span>
      );
    case 'admin_only':
      return (
        <span className="flex items-center gap-1 text-slate-500">
          <Shield className="w-3 h-3" /> Admin
        </span>
      );
    default:
      return null;
  }
};

const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
};

export default WidgetLibraryCard;
