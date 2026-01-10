/**
 * ChartTypeSelector - Smart chart type selector with availability logic
 * 
 * Only shows available chart types based on current field selection.
 * Unavailable types show explanation of what's needed.
 * 
 * LOCATION: /src/admin/visual-builder/components/ChartTypeSelector.tsx
 */

import React from 'react';
import {
  BarChart3,
  LineChart,
  TrendingUp,
  PieChart,
  Table,
  Target,
  Crosshair,
  Map,
  Activity,
  LayoutGrid,
  Lock,
  Check,
} from 'lucide-react';
import { useBuilder } from './BuilderContext';
import { getChartTypeAvailability } from '../types/BuilderSchema';
import type { VisualizationType } from '../types/BuilderSchema';

const CHART_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  bar: BarChart3,
  line: LineChart,
  area: TrendingUp,
  pie: PieChart,
  table: Table,
  kpi: Target,
  scatter: Crosshair,
  choropleth: Map,
  flow: Activity,
  heatmap: LayoutGrid,
  histogram: BarChart3,
  treemap: LayoutGrid,
  funnel: TrendingUp,
  sparkline: Activity,
};

const CHART_LABELS: Record<string, string> = {
  bar: 'Bar Chart',
  line: 'Line Chart',
  area: 'Area Chart',
  pie: 'Pie Chart',
  table: 'Data Table',
  kpi: 'KPI Card',
  scatter: 'Scatter Plot',
  choropleth: 'State Map',
  flow: 'Flow Map',
  heatmap: 'Heatmap',
  histogram: 'Histogram',
  treemap: 'Treemap',
  funnel: 'Funnel',
  sparkline: 'Sparkline',
};

export function ChartTypeSelector() {
  const { state, setVisualization } = useBuilder();
  
  const availability = getChartTypeAvailability(
    state.visualization.xField,
    state.visualization.yField,
    state.visualization.groupBy
  );

  // Separate available and unavailable
  const available = availability.filter(c => c.available);
  const unavailable = availability.filter(c => !c.available);

  const handleSelect = (type: VisualizationType) => {
    setVisualization({ type });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700">Chart Type</label>
        <p className="text-xs text-slate-500 mt-0.5">
          Select a visualization type. Some require specific field selections.
        </p>
      </div>

      {/* Available Chart Types */}
      <div className="grid grid-cols-4 gap-2">
        {available.map(({ type }) => {
          const Icon = CHART_ICONS[type] || BarChart3;
          const isSelected = state.visualization.type === type;

          return (
            <button
              key={type}
              onClick={() => handleSelect(type)}
              className={`relative flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 hover:border-slate-300 text-slate-600'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{CHART_LABELS[type]}</span>
              {isSelected && (
                <div className="absolute top-1 right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Unavailable Chart Types */}
      {unavailable.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-2">Requires configuration:</p>
          <div className="grid grid-cols-4 gap-2">
            {unavailable.map(({ type, reason }) => {
              const Icon = CHART_ICONS[type] || BarChart3;

              return (
                <div
                  key={type}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed"
                  title={reason}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5 text-slate-400" />
                    <Lock className="w-3 h-3 text-slate-400 absolute -bottom-1 -right-1" />
                  </div>
                  <span className="text-xs text-slate-400">{CHART_LABELS[type]}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-2 italic">
            Hover for requirements
          </p>
        </div>
      )}
    </div>
  );
}
