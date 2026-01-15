import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Maximize2, MoreVertical, Trash2, Pencil, AlertCircle } from 'lucide-react';
import { loadAIReport, SavedAIReport } from '../../services/aiReportStorageService';
import { executeReportData } from '../../services/reportDataExecutor';
import { supabase } from '../../lib/supabase';
import { ExecutedReportData } from '../../types/aiReport';
import { AIReportWidgetConfig } from '../ai-studio/AddToDashboardModal';
import { ReportRenderer } from '../reports/studio/ReportRenderer';
import { Card } from '../ui/Card';

interface AIReportWidgetProps {
  config: AIReportWidgetConfig;
  customerId?: string;
  isAdmin?: boolean;
  onRemove?: () => void;
}

export function AIReportWidget({ config, customerId, isAdmin = false, onRemove }: AIReportWidgetProps) {
  const navigate = useNavigate();
  const [report, setReport] = useState<SavedAIReport | null>(null);
  const [executedData, setExecutedData] = useState<ExecutedReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [showMenu, setShowMenu] = useState(false);

  const loadReport = useCallback(async () => {
    if (!customerId) return;

    setLoading(true);
    setError(null);

    try {
      const loadedReport = await loadAIReport(customerId, config.reportId);
      if (!loadedReport) {
        setError('Report not found');
        setLoading(false);
        return;
      }
      setReport(loadedReport);

      const data = await executeReportData(
        supabase,
        loadedReport.definition,
        customerId,
        isAdmin
      );
      setExecutedData(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to load report:', err);
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [config.reportId, customerId, isAdmin]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    if (config.refreshInterval && config.refreshInterval > 0) {
      const interval = setInterval(() => {
        loadReport();
      }, config.refreshInterval * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [config.refreshInterval, loadReport]);

  const filteredReport = useMemo(() => {
    if (!report) return null;

    if (!config.sections || config.sections.length === 0) {
      return report.definition;
    }

    const selectedIndices = config.sections.map(sectionId => {
      return parseInt(sectionId.split('-')[1]);
    });

    const filteredSections = selectedIndices
      .map(idx => report.definition.sections?.[idx])
      .filter(Boolean);

    return {
      ...report.definition,
      sections: filteredSections
    };
  }, [report, config.sections]);

  const filteredData = useMemo(() => {
    if (!executedData) return null;

    if (!config.sections || config.sections.length === 0) {
      return executedData;
    }

    const selectedIndices = config.sections.map(sectionId => {
      return parseInt(sectionId.split('-')[1]);
    });

    const filteredSections = selectedIndices
      .map(idx => executedData.sections?.[idx])
      .filter(Boolean);

    return {
      ...executedData,
      sections: filteredSections
    };
  }, [executedData, config.sections]);

  const handleExpand = () => {
    navigate(`/ai-reports/${config.reportId}`);
  };

  const handleEdit = () => {
    navigate(`/ai-studio?reportId=${config.reportId}&mode=edit`);
  };

  const sizeClasses: Record<string, string> = {
    small: 'col-span-1',
    medium: 'col-span-1',
    wide: 'col-span-1 md:col-span-2',
    full: 'col-span-1 md:col-span-2 lg:col-span-3'
  };

  const maxHeights: Record<string, number> = {
    small: 300,
    medium: 400,
    wide: 500,
    full: 600
  };

  return (
    <Card variant="default" padding="none" className={`overflow-hidden ${sizeClasses[config.size]}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="font-medium text-gray-900 truncate flex-1">{config.title}</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={loadReport}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExpand}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="View Full Report"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleEdit();
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit Report
                  </button>
                  {onRemove && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onRemove();
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div
        className="overflow-auto"
        style={{ maxHeight: maxHeights[config.size] }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <AlertCircle className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm">{error}</p>
          </div>
        ) : filteredReport ? (
          <ReportRenderer
            report={filteredReport}
            data={filteredData}
            embedded={true}
            compact={true}
          />
        ) : (
          <div className="flex items-center justify-center h-48 text-gray-500">
            Report not found
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-400">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </p>
      </div>
    </Card>
  );
}
