/**
 * VisualizationPanel - Select chart type and basic configuration
 */

import React from 'react';
import {
  BarChart3,
  LineChart,
  AreaChart,
  PieChart,
  Table2,
  Map,
  Gauge,
  ScatterChart,
  Grid3X3,
  GitBranch,
} from 'lucide-react';
import { useBuilder } from './BuilderContext';
import type { VisualizationType } from '../types/BuilderSchema';

// =============================================================================
// CHART TYPE OPTIONS
// =============================================================================

interface ChartOption {
  type: VisualizationType;
  label: string;
  icon: React.ReactNode;
  description: string;
  category: 'standard' | 'geo' | 'other';
}

const CHART_OPTIONS: ChartOption[] = [
  {
    type: 'bar',
    label: 'Bar Chart',
    icon: <BarChart3 className="w-5 h-5" />,
    description: 'Compare values across categories',
    category: 'standard',
  },
  {
    type: 'line',
    label: 'Line Chart',
    icon: <LineChart className="w-5 h-5" />,
    description: 'Show trends over time',
    category: 'standard',
  },
  {
    type: 'area',
    label: 'Area Chart',
    icon: <AreaChart className="w-5 h-5" />,
    description: 'Visualize cumulative values',
    category: 'standard',
  },
  {
    type: 'pie',
    label: 'Pie Chart',
    icon: <PieChart className="w-5 h-5" />,
    description: 'Show proportions of a whole',
    category: 'standard',
  },
  {
    type: 'scatter',
    label: 'Scatter Plot',
    icon: <ScatterChart className="w-5 h-5" />,
    description: 'Show correlation between values',
    category: 'standard',
  },
  {
    type: 'table',
    label: 'Data Table',
    icon: <Table2 className="w-5 h-5" />,
    description: 'Display raw data in rows',
    category: 'standard',
  },
  {
    type: 'kpi',
    label: 'KPI Card',
    icon: <Gauge className="w-5 h-5" />,
    description: 'Highlight a single metric',
    category: 'other',
  },
  {
    type: 'heatmap',
    label: 'Heatmap',
    icon: <Grid3X3 className="w-5 h-5" />,
    description: 'Show intensity across two dimensions',
    category: 'other',
  },
  {
    type: 'choropleth',
    label: 'Choropleth Map',
    icon: <Map className="w-5 h-5" />,
    description: 'Color regions by value',
    category: 'geo',
  },
  {
    type: 'flow',
    label: 'Flow Map',
    icon: <GitBranch className="w-5 h-5" />,
    description: 'Show movement between locations',
    category: 'geo',
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function VisualizationPanel() {
  const { state, setVisualization } = useBuilder();
  const selectedType = state.visualization.type;

  const standardCharts = CHART_OPTIONS.filter(c => c.category === 'standard');
  const geoCharts = CHART_OPTIONS.filter(c => c.category === 'geo');
  const otherCharts = CHART_OPTIONS.filter(c => c.category === 'other');

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-1">Visualization Type</h3>
        <p className="text-xs text-slate-500 mb-4">Choose how to display your data</p>
      </div>

      {/* Standard Charts */}
      <div>
        <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
          Standard Charts
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {standardCharts.map(option => (
            <ChartTypeButton
              key={option.type}
              option={option}
              selected={selectedType === option.type}
              onSelect={() => setVisualization({ type: option.type })}
            />
          ))}
        </div>
      </div>

      {/* Geographic */}
      <div>
        <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
          Geographic
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {geoCharts.map(option => (
            <ChartTypeButton
              key={option.type}
              option={option}
              selected={selectedType === option.type}
              onSelect={() => setVisualization({ type: option.type })}
            />
          ))}
        </div>
      </div>

      {/* Other */}
      <div>
        <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
          Other
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {otherCharts.map(option => (
            <ChartTypeButton
              key={option.type}
              option={option}
              selected={selectedType === option.type}
              onSelect={() => setVisualization({ type: option.type })}
            />
          ))}
        </div>
      </div>

      {/* Quick settings based on type */}
      <ChartSettings type={selectedType} />
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface ChartTypeButtonProps {
  option: ChartOption;
  selected: boolean;
  onSelect: () => void;
}

function ChartTypeButton({ option, selected, onSelect }: ChartTypeButtonProps) {
  return (
    <button
      onClick={onSelect}
      className={`
        flex items-center gap-3 p-3 rounded-lg border text-left transition-all
        ${selected
          ? 'border-orange-500 bg-orange-50 text-orange-700'
          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
        }
      `}
    >
      <div className={`${selected ? 'text-orange-500' : 'text-slate-400'}`}>
        {option.icon}
      </div>
      <div className="min-w-0">
        <div className="font-medium text-sm truncate">{option.label}</div>
        <div className="text-xs text-slate-500 truncate">{option.description}</div>
      </div>
    </button>
  );
}

function ChartSettings({ type }: { type: VisualizationType }) {
  const { state, setVisualization } = useBuilder();

  if (type === 'kpi') {
    return (
      <div className="pt-4 border-t border-slate-200 space-y-4">
        <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          KPI Settings
        </h4>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Format
          </label>
          <select
            value={state.visualization.kpi?.format || 'number'}
            onChange={(e) => setVisualization({
              kpi: { ...state.visualization.kpi, format: e.target.value as 'number' | 'currency' | 'percent' }
            })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="number">Number</option>
            <option value="currency">Currency ($)</option>
            <option value="percent">Percentage (%)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Trend Direction
          </label>
          <select
            value={state.visualization.kpi?.trendDirection || 'up_is_good'}
            onChange={(e) => setVisualization({
              kpi: { ...state.visualization.kpi, trendDirection: e.target.value as 'up_is_good' | 'down_is_good' }
            })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="up_is_good">Up is good (green)</option>
            <option value="down_is_good">Down is good (green)</option>
          </select>
        </div>
      </div>
    );
  }

  if (['bar', 'line', 'area', 'pie'].includes(type)) {
    return (
      <div className="pt-4 border-t border-slate-200 space-y-4">
        <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Chart Options
        </h4>
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={state.visualization.showLegend !== false}
              onChange={(e) => setVisualization({ showLegend: e.target.checked })}
              className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
            />
            <span className="text-sm text-slate-700">Show legend</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={state.visualization.showLabels === true}
              onChange={(e) => setVisualization({ showLabels: e.target.checked })}
              className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
            />
            <span className="text-sm text-slate-700">Show data labels</span>
          </label>
        </div>
      </div>
    );
  }

  return null;
}

export default VisualizationPanel;
