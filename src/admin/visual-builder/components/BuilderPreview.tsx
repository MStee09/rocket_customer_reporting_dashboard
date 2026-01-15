import React from 'react';
import {
  Calendar,
  ChevronDown,
  RefreshCw,
  Loader2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { BuilderChartRenderer } from './BuilderChartRenderer';
import type { WidgetConfig, DateRangePreset } from '../types/visualBuilderTypes';
import { DATE_PRESETS } from '../types/visualBuilderTypes';

interface BuilderPreviewProps {
  config: WidgetConfig;
  datePreset: DateRangePreset;
  setDatePreset: (preset: DateRangePreset) => void;
  showDateDropdown: boolean;
  setShowDateDropdown: (show: boolean) => void;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  barOrientation: 'horizontal' | 'vertical';
}

export function BuilderPreview({
  config,
  datePreset,
  setDatePreset,
  showDateDropdown,
  setShowDateDropdown,
  loading,
  error,
  onRefresh,
  barOrientation,
}: BuilderPreviewProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 text-sm">Preview</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-xs hover:bg-slate-50"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              {DATE_PRESETS.find(p => p.value === datePreset)?.label}
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {showDateDropdown && (
              <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg z-20">
                {DATE_PRESETS.map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => {
                      setDatePreset(preset.value);
                      setShowDateDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg ${
                      datePreset === preset.value ? 'bg-orange-50 text-orange-700 font-medium' : 'text-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={onRefresh} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-4 min-h-[300px] flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 text-red-500 max-w-xs text-center">
            <AlertCircle className="w-6 h-6" />
            <span className="text-sm">{error}</span>
          </div>
        ) : !config.data || config.data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Eye className="w-8 h-8" />
            <span className="text-sm">Configure and run query to see preview</span>
          </div>
        ) : (
          <div className="w-full h-[280px]">
            <BuilderChartRenderer
              type={config.chartType}
              data={config.data}
              barOrientation={barOrientation}
              secondaryGroups={config.secondaryGroups}
              metricColumn={config.metricColumn || undefined}
            />
          </div>
        )}
      </div>

      {config.data && config.data.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-600">
          {config.data.length} data points
        </div>
      )}
    </div>
  );
}
