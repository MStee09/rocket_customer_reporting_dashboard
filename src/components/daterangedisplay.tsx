/**
 * DateRangeDisplay - Make date range visible in the UI
 * 
 * Shows and allows editing of the existing executionParams.dateRange
 * 
 * LOCATION: /src/admin/visual-builder/components/DateRangeDisplay.tsx
 */

import React from 'react';
import { Calendar, Info } from 'lucide-react';
import { useBuilder } from './BuilderContext';

const DATE_PRESETS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'mtd', label: 'Month to date' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'custom', label: 'Custom' },
];

export function DateRangeDisplay() {
  const { state, setExecutionParams } = useBuilder();
  const dateRange = state.executionParams.dateRange;

  const handlePresetChange = (preset: string) => {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start: Date;

    switch (preset) {
      case '7':
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        break;
      case '30':
        start = new Date(now);
        start.setDate(start.getDate() - 30);
        break;
      case '90':
        start = new Date(now);
        start.setDate(start.getDate() - 90);
        break;
      case 'mtd':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'ytd':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return; // Don't change for custom
    }

    setExecutionParams({
      dateRange: {
        start: start.toISOString().split('T')[0],
        end,
      },
    });
  };

  const handleStartChange = (value: string) => {
    setExecutionParams({
      dateRange: {
        ...dateRange,
        start: value,
      },
    });
  };

  const handleEndChange = (value: string) => {
    setExecutionParams({
      dateRange: {
        ...dateRange,
        end: value,
      },
    });
  };

  // Format for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Detect current preset
  const detectPreset = (): string => {
    if (!dateRange?.start || !dateRange?.end) return 'custom';
    
    const end = new Date(dateRange.end);
    const start = new Date(dateRange.start);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 7) return '7';
    if (diffDays === 30) return '30';
    if (diffDays === 90) return '90';
    
    return 'custom';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-blue-500" />
        <label className="text-sm font-medium text-slate-700">Date Range</label>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {DATE_PRESETS.slice(0, -1).map((preset) => (
          <button
            key={preset.value}
            onClick={() => handlePresetChange(preset.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              detectPreset() === preset.value
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Date inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Start</label>
          <input
            type="date"
            value={dateRange?.start || ''}
            onChange={(e) => handleStartChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">End</label>
          <input
            type="date"
            value={dateRange?.end || ''}
            onChange={(e) => handleEndChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Current range display */}
      <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700">
          <strong>Preview data:</strong> {formatDate(dateRange?.start || '')} – {formatDate(dateRange?.end || '')}
          <br />
          <span className="text-blue-600">Published widget will use the page's date selector.</span>
        </div>
      </div>
    </div>
  );
}
