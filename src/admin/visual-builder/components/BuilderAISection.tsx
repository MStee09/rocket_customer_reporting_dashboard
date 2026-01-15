import React, { useState } from 'react';
import {
  Sparkles,
  Loader2,
  Send,
  AlertCircle,
  CheckCircle,
  Edit3,
  Plus,
  Trash2,
  RefreshCw,
  Database,
  Download,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { formatValue } from './BuilderChartRenderer';
import type { WidgetConfig, Column, EditableFilter, Aggregation } from '../types/visualBuilderTypes';

interface BuilderAISectionProps {
  prompt: string;
  setPrompt: (p: string) => void;
  loading: boolean;
  error: string | null;
  reasoning: Array<{ type: string; content: string; toolName?: string }>;
  config: WidgetConfig;
  setConfig: React.Dispatch<React.SetStateAction<WidgetConfig>>;
  onSubmit: () => void;
  onEdit: () => void;
  canSeeAdminColumns: boolean;
  editableFilters: EditableFilter[];
  addFilter: () => void;
  updateFilter: (id: string, updates: Partial<EditableFilter>) => void;
  removeFilter: (id: string) => void;
  exportToCSV: () => void;
  showRawData: boolean;
  setShowRawData: (show: boolean) => void;
  availableColumns: Column[];
  onRerunWithFilters: () => void;
}

function formatFieldName(name: string): string {
  if (!name) return '';
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function BuilderAISection({
  prompt,
  setPrompt,
  loading,
  error,
  reasoning,
  config,
  setConfig,
  onSubmit,
  onEdit,
  canSeeAdminColumns,
  editableFilters,
  addFilter,
  updateFilter,
  removeFilter,
  exportToCSV,
  showRawData,
  setShowRawData,
  availableColumns,
  onRerunWithFilters,
}: BuilderAISectionProps) {
  const [showReasoning, setShowReasoning] = useState(false);
  const hasData = config.data && config.data.length > 0;

  const examplePrompts = canSeeAdminColumns
    ? [
        'Average cost per shipment by carrier',
        'Total margin by destination state',
        'Shipment count by mode',
        'Average retail for drawer system products',
      ]
    : [
        'Total shipping charges by carrier',
        'Shipment count by destination state',
        'Average weight by mode',
        'Monthly shipping spend trend',
      ];

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl p-5 border border-blue-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-sky-600 rounded-lg">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Describe Your Widget</h3>
            <p className="text-xs text-slate-600">Be specific about metric (sum, average, count) and grouping</p>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: Show average shipping cost by carrier for the last 30 days"
            className="w-full px-3 py-2 pr-12 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none text-sm"
            rows={2}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
          />
          <button
            onClick={onSubmit}
            disabled={!prompt.trim() || loading}
            className="absolute right-2 bottom-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          <span className="text-xs text-slate-500">Try:</span>
          {examplePrompts.map((ex, i) => (
            <button
              key={i}
              onClick={() => setPrompt(ex)}
              className="px-2 py-0.5 text-xs bg-white border border-slate-200 rounded-full hover:border-blue-300 truncate max-w-[200px]"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            <span className="text-slate-700 text-sm">AI is analyzing your request...</span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900 text-sm">Error</p>
              <p className="text-xs text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {hasData && !loading && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-green-50">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm">{config.name || 'Widget Generated'}</h4>
                  <p className="text-xs text-slate-600">{config.data?.length} data points</p>
                </div>
              </div>
              <button
                onClick={onEdit}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <Edit3 className="w-3 h-3" />
                Edit
              </button>
            </div>
          </div>

          {config.aiConfig && (
            <div className="p-4 border-b border-slate-100 text-sm">
              <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Configuration</h5>
              <div className="space-y-1.5">
                <div className="flex gap-2 items-center">
                  <span className="text-slate-500 w-16">X-Axis:</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={config.aggregation || 'avg'}
                      onChange={(e) => setConfig(prev => ({ ...prev, aggregation: e.target.value as Aggregation }))}
                      className="text-xs px-2 py-1 border border-slate-200 rounded bg-white font-medium text-slate-900"
                    >
                      <option value="avg">AVG</option>
                      <option value="sum">SUM</option>
                      <option value="count">COUNT</option>
                      <option value="min">MIN</option>
                      <option value="max">MAX</option>
                    </select>
                    <span className="font-medium text-slate-900">
                      of {config.metricColumn
                        ? availableColumns.find(c => c.id === config.metricColumn)?.label || formatFieldName(config.metricColumn)
                        : config.aiConfig?.yAxis && config.aiConfig.yAxis !== ''
                          ? formatFieldName(config.aiConfig.yAxis)
                          : config.name?.toLowerCase().includes('cost')
                            ? 'Cost'
                            : config.name?.toLowerCase().includes('retail')
                              ? 'Retail'
                              : config.name?.toLowerCase().includes('margin')
                                ? 'Margin'
                                : 'Value'
                      }
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="text-slate-500 w-16 pt-0.5">Y-Axis:</span>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-slate-900">
                      {config.groupByColumn
                        ? availableColumns.find(c => c.id === config.groupByColumn)?.label || formatFieldName(config.groupByColumn)
                        : config.aiConfig?.xAxis && config.aiConfig.xAxis !== ''
                          ? formatFieldName(config.aiConfig.xAxis)
                          : config.aiConfig?.groupingLogic
                            ? 'Product Category'
                            : config.name?.includes('by ')
                              ? config.name.split('by ').pop()?.split(' ')[0] || 'Category'
                              : 'Category'
                      }
                    </span>
                    {config.aiConfig?.searchTerms && config.aiConfig.searchTerms.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {config.aiConfig.searchTerms.map((term, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            {term}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {config.aiConfig?.groupingLogic && (
                  <div className="text-xs text-slate-500 italic mt-2">{config.aiConfig.groupingLogic}</div>
                )}
              </div>
            </div>
          )}

          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-semibold text-slate-500 uppercase">Filters</h5>
              <button
                onClick={addFilter}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
            {editableFilters.length === 0 ? (
              <p className="text-xs text-slate-400">No filters applied</p>
            ) : (
              <div className="space-y-2">
                {editableFilters.map((filter) => (
                  <div key={filter.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                    <select
                      value={filter.field}
                      onChange={(e) => updateFilter(filter.id, { field: e.target.value })}
                      className="flex-1 px-2 py-1 border rounded text-xs bg-white"
                    >
                      <option value="item_description">Product Description</option>
                      <option value="carrier_name">Carrier</option>
                      <option value="origin_state">Origin State</option>
                      <option value="dest_state">Dest State</option>
                      <option value="mode_name">Mode</option>
                      <option value="status_name">Status</option>
                    </select>
                    <select
                      value={filter.operator}
                      onChange={(e) => updateFilter(filter.id, { operator: e.target.value as EditableFilter['operator'] })}
                      className="px-2 py-1 border rounded text-xs bg-white"
                    >
                      <option value="contains">Contains</option>
                      <option value="equals">Equals</option>
                      <option value="gt">{'>'}</option>
                      <option value="lt">{'<'}</option>
                    </select>
                    <input
                      type="text"
                      value={filter.value}
                      onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                      placeholder="Value"
                      className="flex-1 px-2 py-1 border rounded text-xs"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeFilter(filter.id);
                      }}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {hasData && editableFilters.length > 0 && (
              <button
                onClick={onRerunWithFilters}
                className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Apply Filter Changes
              </button>
            )}
          </div>

          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setShowRawData(!showRawData)}
                className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase"
              >
                <Database className="w-3 h-3" />
                Data Preview
                {showRawData ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              {config.data && (
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                >
                  <Download className="w-3 h-3" />
                  Export CSV
                </button>
              )}
            </div>
            {showRawData && (
              <div className="space-y-1">
                {config.data?.map((row, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 truncate mr-4">{row.label}</span>
                    <span className="font-medium text-slate-900 tabular-nums">{formatValue(row.value)}</span>
                  </div>
                ))}
              </div>
            )}
            {!showRawData && (
              <div className="space-y-1">
                {config.data?.slice(0, 5).map((row, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 truncate mr-4">{row.label}</span>
                    <span className="font-medium text-slate-900 tabular-nums">{formatValue(row.value)}</span>
                  </div>
                ))}
                {config.data && config.data.length > 5 && (
                  <div className="text-xs text-slate-500 pt-1">+ {config.data.length - 5} more...</div>
                )}
              </div>
            )}
          </div>

          {reasoning.length > 0 && (
            <div>
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="w-full px-4 py-2 flex items-center justify-between text-xs text-slate-600 hover:bg-slate-50"
              >
                <span>AI Reasoning ({reasoning.length} steps)</span>
                {showReasoning ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              {showReasoning && (
                <div className="px-4 pb-3 max-h-40 overflow-y-auto">
                  <div className="space-y-1 text-xs font-mono">
                    {reasoning.slice(0, 15).map((step, i) => (
                      <div key={i} className="flex gap-2 py-0.5">
                        <span className={`px-1 py-0.5 rounded text-[10px] ${
                          step.type === 'tool_call' ? 'bg-orange-100 text-orange-700' :
                          step.type === 'tool_result' ? 'bg-green-100 text-green-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {step.toolName || step.type}
                        </span>
                        <span className="text-slate-600 truncate">{step.content?.slice(0, 80)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
