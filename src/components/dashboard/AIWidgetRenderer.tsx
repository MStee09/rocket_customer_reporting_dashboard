import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, RefreshCw, ExternalLink, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CustomWidgetDefinition } from '../../config/widgets/customWidgetTypes';
import { executeAIWidget, deleteAIWidget } from '../../services/aiWidgetService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ReportRenderer } from '../reports/studio/ReportRenderer';
import { AIReportDefinition, ExecutedReportData } from '../../types/aiReport';

interface AIWidgetRendererProps {
  widget: CustomWidgetDefinition;
  onDelete?: () => void;
  onRefresh?: () => void;
  compact?: boolean;
}

export function AIWidgetRenderer({
  widget,
  onDelete,
  onRefresh,
  compact = true
}: AIWidgetRendererProps) {
  const navigate = useNavigate();
  const { effectiveCustomerId, isAdmin, isViewingAsCustomer } = useAuth();
  const [executedData, setExecutedData] = useState<ExecutedReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasValidConfig = widget && widget.config;

  const config = (widget?.config || {}) as {
    reportDefinition?: AIReportDefinition;
    sectionIndices?: number[];
    sourceReportId?: string;
    compact?: boolean;
  };

  const miniReport: AIReportDefinition | null = config.reportDefinition ? {
    ...config.reportDefinition,
    sections: (config.sectionIndices || [])
      .map(idx => config.reportDefinition!.sections[idx])
      .filter(Boolean),
  } : null;

  useEffect(() => {
    if (hasValidConfig) {
      loadWidgetData();
    }
  }, [widget?.id, effectiveCustomerId, hasValidConfig]);

  const loadWidgetData = async () => {
    if (!effectiveCustomerId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await executeAIWidget(
        supabase,
        widget,
        String(effectiveCustomerId),
        isAdmin() && !isViewingAsCustomer
      );

      if (result.success && result.data) {
        setExecutedData(result.data);
      } else {
        setError(result.error || 'Failed to load widget data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load widget');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadWidgetData();
    onRefresh?.();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteAIWidget(
        supabase,
        widget.id,
        effectiveCustomerId ? Number(effectiveCustomerId) : undefined
      );

      if (result.success) {
        onDelete?.();
      } else {
        setError(result.error || 'Failed to delete widget');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete widget');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleOpenInStudio = () => {
    if (config.sourceReportId) {
      navigate(`/ai-studio?reportId=${config.sourceReportId}&mode=edit`);
    }
  };

  if (!hasValidConfig) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 h-full">
        <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
          <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
          <p className="text-gray-600 text-center">Widget configuration not found</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 h-full">
        <div className="flex items-center justify-center h-full min-h-[200px]">
          <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
          <span className="ml-2 text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 h-full">
        <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
          <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
          <p className="text-sm text-gray-600 mb-3 text-center">{error}</p>
          <button
            onClick={handleRefresh}
            className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden group relative h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
          <span className="font-medium text-sm truncate">{widget.name}</span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleRefresh}
            className="p-1.5 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {config.sourceReportId && (
            <button
              onClick={handleOpenInStudio}
              className="p-1.5 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700"
              title="Open in AI Studio"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1.5 hover:bg-red-100 rounded text-gray-500 hover:text-red-600"
            title="Remove widget"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto" style={{ maxHeight: compact ? 350 : undefined }}>
        {miniReport && executedData ? (
          <ReportRenderer
            report={miniReport}
            data={executedData}
            embedded={true}
            compact={compact}
          />
        ) : (
          <div className="p-8 text-center text-gray-500">
            No data available
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 border-t bg-gray-50 text-xs text-gray-400 flex items-center justify-between flex-shrink-0">
        <span>
          {executedData?.executedAt
            ? `Updated: ${new Date(executedData.executedAt).toLocaleTimeString()}`
            : 'AI Generated'
          }
        </span>
        <span className="text-purple-500">
          {config.sectionIndices?.length || 0} section{(config.sectionIndices?.length || 0) !== 1 ? 's' : ''}
        </span>
      </div>

      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-white/95 flex items-center justify-center z-10">
          <div className="text-center p-4">
            <p className="text-gray-900 font-medium mb-4">Remove this widget?</p>
            <div className="flex items-center gap-2 justify-center">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Removing...
                  </>
                ) : (
                  'Remove'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIWidgetRenderer;
