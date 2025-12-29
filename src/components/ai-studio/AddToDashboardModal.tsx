import { useState, useEffect } from 'react';
import { X, LayoutDashboard, Eye, EyeOff, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { SavedAIReport } from '../../services/aiReportService';
import { executeReportData } from '../../services/reportDataExecutor';
import { supabase } from '../../lib/supabase';
import { ExecutedReportData, ReportSection } from '../../types/aiReport';
import { ReportRenderer } from '../reports/studio/ReportRenderer';
import { useAuth } from '../../contexts/AuthContext';

export interface AIReportWidgetConfig {
  reportId: string;
  title: string;
  size: 'small' | 'medium' | 'wide' | 'full';
  sections: string[];
  refreshInterval: number;
}

interface AddToDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: SavedAIReport | null;
  onAdd: (config: AIReportWidgetConfig) => void;
}

interface SectionInfo {
  id: string;
  type: string;
  label: string;
  included: boolean;
}

function getSectionLabel(section: ReportSection): string {
  const config = section.config as Record<string, unknown>;
  switch (section.type) {
    case 'hero':
      return `Hero: ${(config.metric as { label?: string })?.label || 'Main Metric'}`;
    case 'stat-row': {
      const stats = config.stats as unknown[];
      return `Stats: ${stats?.length || 0} cards`;
    }
    case 'chart':
      return `Chart: ${config.title || config.chartType || 'Visualization'}`;
    case 'table':
      return `Table: ${config.title || 'Data Table'}`;
    case 'category-grid':
      return `Categories: ${config.title || 'Breakdown'}`;
    case 'header':
      return `Header: ${config.title || 'Section Header'}`;
    default:
      return `Section: ${section.type}`;
  }
}

export function AddToDashboardModal({ isOpen, onClose, report, onAdd }: AddToDashboardModalProps) {
  const { effectiveCustomerId, isAdmin } = useAuth();
  const [sections, setSections] = useState<SectionInfo[]>([]);
  const [executedData, setExecutedData] = useState<ExecutedReportData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [config, setConfig] = useState({
    title: '',
    size: 'medium' as const,
    refreshInterval: 60
  });

  useEffect(() => {
    if (isOpen && report) {
      setConfig(prev => ({
        ...prev,
        title: report.name
      }));

      if (report.definition?.sections) {
        const sectionList = report.definition.sections.map((section, index) => ({
          id: `section-${index}`,
          type: section.type,
          label: getSectionLabel(section),
          included: index < 3
        }));
        setSections(sectionList);
      }

      loadPreviewData();
    }
  }, [isOpen, report]);

  const loadPreviewData = async () => {
    if (!report || !effectiveCustomerId) return;

    setLoadingPreview(true);
    try {
      const data = await executeReportData(
        supabase,
        report.definition,
        String(effectiveCustomerId),
        isAdmin()
      );
      setExecutedData(data);
    } catch (err) {
      console.error('Failed to load preview:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const toggleSection = (id: string) => {
    setSections(prev => prev.map(s =>
      s.id === id ? { ...s, included: !s.included } : s
    ));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    setSections(newSections);
  };

  const selectAll = () => {
    setSections(prev => prev.map(s => ({ ...s, included: true })));
  };

  const selectMinimal = () => {
    setSections(prev => prev.map((s, i) => ({ ...s, included: i < 2 })));
  };

  const selectedIndices = sections
    .filter(s => s.included)
    .map(s => parseInt(s.id.split('-')[1]));

  const previewReport = report ? {
    ...report.definition,
    sections: selectedIndices
      .map(idx => report.definition.sections[idx])
      .filter(Boolean)
  } : null;

  const previewData = executedData ? {
    ...executedData,
    sections: selectedIndices
      .map(idx => executedData.sections[idx])
      .filter(Boolean)
  } : null;

  const includedCount = sections.filter(s => s.included).length;

  const handleAdd = () => {
    if (!report) return;
    onAdd({
      reportId: report.id,
      title: config.title,
      size: config.size,
      sections: sections.filter(s => s.included).map(s => s.id),
      refreshInterval: config.refreshInterval
    });
    onClose();
  };

  if (!isOpen || !report) return null;

  const previewMaxWidth = config.size === 'small' ? 350 :
    config.size === 'medium' ? 500 :
      config.size === 'large' ? 700 : undefined;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-rocket-600" />
              Add to Dashboard
            </h2>
            <p className="text-sm text-gray-500 mt-1">Select which sections to display in your widget</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          <div className="w-80 border-r flex flex-col bg-white">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-medium text-gray-900">Report Sections</h3>
              <p className="text-sm text-gray-500">{includedCount} of {sections.length} selected</p>
            </div>

            <div className="flex-1 overflow-auto p-3">
              {sections.map((section, index) => (
                <div
                  key={section.id}
                  className={`flex items-center gap-2 p-3 rounded-lg mb-2 border transition-all ${
                    section.included
                      ? 'bg-rocket-50 border-rocket-200'
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveSection(index, 'up')}
                      disabled={index === 0}
                      className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveSection(index, 'down')}
                      disabled={index === sections.length - 1}
                      className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{section.label}</div>
                    <div className="text-xs text-gray-500 capitalize">{section.type.replace('-', ' ')}</div>
                  </div>

                  <button
                    onClick={() => toggleSection(section.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      section.included
                        ? 'bg-rocket-600 text-white hover:bg-rocket-700'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {section.included ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>

            <div className="p-3 border-t bg-gray-50">
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-white transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={selectMinimal}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-white transition-colors"
                >
                  Minimal
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
            <div className="px-4 py-3 border-b bg-white">
              <h3 className="font-medium text-gray-900">Widget Preview</h3>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {loadingPreview ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Loading preview...</span>
                </div>
              ) : (
                <div
                  className="bg-white rounded-lg shadow-lg mx-auto overflow-hidden"
                  style={{ maxWidth: previewMaxWidth }}
                >
                  <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gray-50">
                    <span className="font-medium text-sm truncate">{config.title}</span>
                    <div className="flex gap-1">
                      <div className="w-4 h-4 rounded bg-gray-300" />
                      <div className="w-4 h-4 rounded bg-gray-300" />
                    </div>
                  </div>

                  {includedCount > 0 && previewReport ? (
                    <div className="max-h-[400px] overflow-auto">
                      <ReportRenderer
                        report={previewReport}
                        data={previewData}
                        embedded={true}
                        compact={true}
                      />
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      Select at least one section to preview
                    </div>
                  )}

                  <div className="px-3 py-1.5 border-t bg-gray-50 text-xs text-gray-400">
                    Updated: Just now
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-64 border-l flex flex-col bg-white">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-medium text-gray-900">Widget Settings</h3>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500 outline-none"
                  placeholder="Widget title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                <div className="space-y-2">
                  {[
                    { value: 'small', label: 'Small', desc: '1 column' },
                    { value: 'medium', label: 'Medium', desc: '1 column' },
                    { value: 'wide', label: 'Wide', desc: '2 columns' },
                    { value: 'full', label: 'Full', desc: '3 columns' }
                  ].map(({ value, label, desc }) => (
                    <button
                      key={value}
                      onClick={() => setConfig({ ...config, size: value as 'small' | 'medium' | 'wide' | 'full' })}
                      className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm transition-all ${
                        config.size === value
                          ? 'bg-rocket-50 border-rocket-300 text-rocket-700'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-medium">{label}</span>
                      <span className="text-gray-500 text-xs">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Auto Refresh</label>
                <select
                  value={config.refreshInterval}
                  onChange={(e) => setConfig({ ...config, refreshInterval: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500 outline-none"
                >
                  <option value={0}>Manual only</option>
                  <option value={15}>Every 15 min</option>
                  <option value={30}>Every 30 min</option>
                  <option value={60}>Hourly</option>
                  <option value={1440}>Daily</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <p className="text-sm text-gray-500">
            {includedCount} section{includedCount !== 1 ? 's' : ''} will be displayed
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={includedCount === 0}
              className="px-4 py-2 bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
