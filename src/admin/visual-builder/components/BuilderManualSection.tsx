import React from 'react';
import {
  BarChart3,
  LineChart,
  PieChart,
  Hash,
  Table,
  TrendingUp,
  Shield,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { BuilderColumnPicker } from './BuilderColumnPicker';
import type { WidgetConfig, Column, ChartType, Aggregation } from '../types/visualBuilderTypes';

const CHART_TYPES: Array<{ type: ChartType; label: string; icon: React.ElementType }> = [
  { type: 'bar', label: 'Bar', icon: BarChart3 },
  { type: 'line', label: 'Line', icon: LineChart },
  { type: 'pie', label: 'Pie', icon: PieChart },
  { type: 'kpi', label: 'KPI', icon: Hash },
  { type: 'table', label: 'Table', icon: Table },
  { type: 'area', label: 'Area', icon: TrendingUp },
];

const AGGREGATIONS: Array<{ value: Aggregation; label: string }> = [
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'count', label: 'Count' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' },
];

interface BuilderManualSectionProps {
  config: WidgetConfig;
  setConfig: React.Dispatch<React.SetStateAction<WidgetConfig>>;
  columns: Column[];
  onRunQuery: () => void;
  previewLoading: boolean;
  canSeeAdminColumns: boolean;
  barOrientation: 'horizontal' | 'vertical';
  setBarOrientation: (orientation: 'horizontal' | 'vertical') => void;
}

export function BuilderManualSection({
  config,
  setConfig,
  columns,
  onRunQuery,
  previewLoading,
  canSeeAdminColumns,
  barOrientation,
  setBarOrientation,
}: BuilderManualSectionProps) {
  return (
    <div className="space-y-4">
      {!canSeeAdminColumns && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            You're viewing customer-safe data only. Cost and margin fields are not available.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-900 text-sm mb-3">Chart Type</h3>
        <div className="grid grid-cols-6 gap-2">
          {CHART_TYPES.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => setConfig(prev => ({ ...prev, chartType: type }))}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${
                config.chartType === type ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${config.chartType === type ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className={`text-xs ${config.chartType === type ? 'text-blue-700 font-medium' : 'text-slate-600'}`}>
                {label}
              </span>
            </button>
          ))}
        </div>

        {config.chartType === 'bar' && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">Bar Direction</span>
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                <button
                  onClick={() => setBarOrientation('horizontal')}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${
                    barOrientation === 'horizontal' ? 'bg-white shadow text-blue-600 font-medium' : 'text-slate-600'
                  }`}
                >
                  Horizontal
                </button>
                <button
                  onClick={() => setBarOrientation('vertical')}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${
                    barOrientation === 'vertical' ? 'bg-white shadow text-blue-600 font-medium' : 'text-slate-600'
                  }`}
                >
                  Vertical
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <BuilderColumnPicker
        title="Group By (X-Axis)"
        subtitle="What do you want to compare?"
        columns={columns.filter(c => c.type === 'string' || c.type === 'date')}
        selectedColumn={config.groupByColumn}
        onSelect={(col) => setConfig(prev => ({ ...prev, groupByColumn: col }))}
        highlightColor="blue"
      />

      <BuilderColumnPicker
        title="Metric (Y-Axis)"
        subtitle="What do you want to measure?"
        columns={columns.filter(c => c.type === 'number')}
        selectedColumn={config.metricColumn}
        onSelect={(col) => setConfig(prev => ({ ...prev, metricColumn: col }))}
        highlightColor="green"
      />

      {config.metricColumn && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900 text-sm mb-2">Aggregation</h3>
          <p className="text-xs text-slate-500 mb-3">How should values be combined?</p>
          <div className="grid grid-cols-5 gap-2">
            {AGGREGATIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setConfig(prev => ({ ...prev, aggregation: value }))}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  config.aggregation === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onRunQuery}
        disabled={!config.groupByColumn || !config.metricColumn || previewLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed font-medium text-sm"
      >
        {previewLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Running...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Run Query
          </>
        )}
      </button>
    </div>
  );
}
