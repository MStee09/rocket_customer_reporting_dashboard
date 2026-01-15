import { useState, useCallback } from 'react';
import {
  X,
  Plus,
  Pencil,
  Copy,
  Trash2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isSystemWidget } from '../../config/widgets';
import { WidgetIcon } from './WidgetIcon';
import { WidgetOverviewTab } from './inspector/WidgetOverviewTab';
import { WidgetPreviewTab } from './inspector/WidgetPreviewTab';
import { WidgetQueryTab } from './inspector/WidgetQueryTab';
import { WidgetUsageTab } from './inspector/WidgetUsageTab';
import { WidgetHistoryTab } from './inspector/WidgetHistoryTab';
import type { WidgetDefinition } from '../../types/widgets';
import type { CustomWidgetDefinition } from '../../config/widgets/customWidgetTypes';

type InspectorWidget = WidgetDefinition | CustomWidgetDefinition;

interface WidgetInspectorModalProps {
  widget: InspectorWidget;
  isAdmin: boolean;
  isCustomerCreatedTab?: boolean;
  onClose: () => void;
  onAddToDashboard?: (widgetId: string) => void;
  onEdit?: (widget: InspectorWidget) => void;
  onDuplicate?: (widget: InspectorWidget) => void;
  onDelete?: (widgetId: string) => void;
  onCloneToSystem?: () => void;
}

export const WidgetInspectorModal = ({
  widget: initialWidget,
  isAdmin,
  isCustomerCreatedTab = false,
  onClose,
  onAddToDashboard,
  onEdit,
  onDuplicate,
  onDelete,
  onCloneToSystem,
}: WidgetInspectorModalProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [widget, setWidget] = useState(initialWidget);
  const { effectiveCustomerId } = useAuth();
  const isSystem = isSystemWidget(widget.id);
  const isCustom = !isSystem;

  const handleWidgetUpdated = useCallback((updatedWidget: InspectorWidget) => {
    setWidget(updatedWidget);
  }, []);

  const tabs = [
    { id: 'overview', label: 'Overview', show: true },
    { id: 'preview', label: 'Preview', show: true },
    { id: 'query', label: 'Query Details', show: isAdmin },
    { id: 'usage', label: 'Usage', show: isAdmin && isCustom },
    { id: 'history', label: 'History', show: isAdmin && isCustom },
  ].filter(tab => tab.show);

  const iconColor = widget.iconColor || widget.display?.iconColor || 'bg-slate-500';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">

        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${iconColor} flex items-center justify-center`}>
              <WidgetIcon name={widget.icon || widget.display?.icon} className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-900">{widget.name}</h2>
                {isSystem && (
                  <span className="text-xs px-2 py-0.5 bg-rocket-100 text-rocket-700 rounded-full flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    System
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 line-clamp-1">{widget.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="px-6 border-b flex-shrink-0">
          <div className="flex gap-1 -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-rocket-500 text-rocket-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'overview' && (
            <WidgetOverviewTab
              widget={widget}
              isAdmin={isAdmin}
              customerId={effectiveCustomerId || undefined}
              onWidgetUpdated={handleWidgetUpdated}
            />
          )}
          {activeTab === 'preview' && (
            <WidgetPreviewTab widget={widget} isAdmin={isAdmin} />
          )}
          {activeTab === 'query' && isAdmin && (
            <WidgetQueryTab widget={widget} />
          )}
          {activeTab === 'usage' && isAdmin && isCustom && (
            <WidgetUsageTab widget={widget} />
          )}
          {activeTab === 'history' && isAdmin && isCustom && (
            <WidgetHistoryTab widget={widget} />
          )}
        </div>

        <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between rounded-b-2xl flex-shrink-0">
          <div className="flex items-center gap-2">
            {isCustom && !isCustomerCreatedTab && (
              <>
                {onEdit && (
                  <button
                    onClick={() => onEdit(widget)}
                    className="px-3 py-1.5 text-sm text-slate-600 hover:bg-white rounded-lg border border-slate-200 flex items-center gap-1.5 transition"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                )}
                {onDuplicate && (
                  <button
                    onClick={() => onDuplicate(widget)}
                    className="px-3 py-1.5 text-sm text-slate-600 hover:bg-white rounded-lg border border-slate-200 flex items-center gap-1.5 transition"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(widget.id)}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200 flex items-center gap-1.5 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </>
            )}

            {isAdmin && isCustomerCreatedTab && onCloneToSystem && (
              <button
                onClick={onCloneToSystem}
                className="px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-1.5 transition"
              >
                <Copy className="w-4 h-4" />
                Clone to System Widget
              </button>
            )}

            {isSystem && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                System widgets cannot be edited
              </span>
            )}
          </div>

          {onAddToDashboard && (
            <button
              onClick={() => onAddToDashboard(widget.id)}
              className="px-4 py-2 bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              Add to Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WidgetInspectorModal;
