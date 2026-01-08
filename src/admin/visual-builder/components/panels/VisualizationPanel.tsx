import React from 'react';
import {
  BarChart3,
  LineChart,
  PieChart,
  ScatterChart,
  Table2,
  Activity,
  Map,
  ArrowRightLeft,
  Grid3X3,
  TrendingUp,
} from 'lucide-react';
import { useBuilder } from '../BuilderContext';
import type { VisualizationType } from '../../types/BuilderSchema';

const CHART_OPTIONS: { type: VisualizationType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: 'bar', label: 'Bar Chart', icon: <BarChart3 className="w-5 h-5" />, description: 'Compare values across categories' },
  { type: 'line', label: 'Line Chart', icon: <LineChart className="w-5 h-5" />, description: 'Show trends over time' },
  { type: 'area', label: 'Area Chart', icon: <Activity className="w-5 h-5" />, description: 'Cumulative trends over time' },
  { type: 'pie', label: 'Pie Chart', icon: <PieChart className="w-5 h-5" />, description: 'Show proportions of a whole' },
  { type: 'scatter', label: 'Scatter Plot', icon: <ScatterChart className="w-5 h-5" />, description: 'Correlation between variables' },
  { type: 'heatmap', label: 'Heatmap', icon: <Grid3X3 className="w-5 h-5" />, description: 'Intensity across two dimensions' },
  { type: 'kpi', label: 'KPI Card', icon: <TrendingUp className="w-5 h-5" />, description: 'Single metric with trend' },
  { type: 'table', label: 'Data Table', icon: <Table2 className="w-5 h-5" />, description: 'Tabular data display' },
  { type: 'choropleth', label: 'Geo Map', icon: <Map className="w-5 h-5" />, description: 'Color-coded regions' },
  { type: 'flow', label: 'Flow Map', icon: <ArrowRightLeft className="w-5 h-5" />, description: 'Origin-destination flows' },
];

export function VisualizationPanel() {
  const { state, setVisualizationType, setTitle, setDescription } = useBuilder();
  const selectedType = state.visualization.type;

  return (
    <div className="p-4 space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Widget Title</label>
        <input
          type="text"
          value={state.title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter widget title..."
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <textarea
          value={state.description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
          rows={2}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">Visualization Type</label>
        <div className="grid grid-cols-2 gap-2">
          {CHART_OPTIONS.map((option) => (
            <button
              key={option.type}
              onClick={() => setVisualizationType(option.type)}
              className={`
                flex items-start gap-3 p-3 rounded-lg border text-left transition-all
                ${selectedType === option.type
                  ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }
              `}
            >
              <div className={`p-1.5 rounded ${selectedType === option.type ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                {option.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${selectedType === option.type ? 'text-orange-700' : 'text-slate-700'}`}>
                  {option.label}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                  {option.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedType && (
        <ChartOptions type={selectedType} />
      )}
    </div>
  );
}

function ChartOptions({ type }: { type: VisualizationType }) {
  const { state, setVisualizationConfig } = useBuilder();
  const config = state.visualization;

  if (['bar', 'line', 'area', 'scatter'].includes(type)) {
    return (
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h4 className="text-sm font-medium text-slate-700">Chart Options</h4>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Aggregation</label>
          <select
            value={config.aggregation || 'sum'}
            onChange={(e) => setVisualizationConfig({ aggregation: e.target.value as any })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="sum">Sum</option>
            <option value="avg">Average</option>
            <option value="count">Count</option>
            <option value="min">Minimum</option>
            <option value="max">Maximum</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={config.showLegend ?? true}
              onChange={(e) => setVisualizationConfig({ showLegend: e.target.checked })}
              className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
            />
            Show Legend
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={config.showLabels ?? false}
              onChange={(e) => setVisualizationConfig({ showLabels: e.target.checked })}
              className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
            />
            Show Labels
          </label>
        </div>
      </div>
    );
  }

  if (type === 'kpi') {
    return (
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h4 className="text-sm font-medium text-slate-700">KPI Options</h4>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Format</label>
          <select
            value={config.kpi?.format || 'number'}
            onChange={(e) => setVisualizationConfig({ kpi: { ...config.kpi, format: e.target.value as any } })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="number">Number</option>
            <option value="currency">Currency</option>
            <option value="percent">Percentage</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Trend Direction</label>
          <select
            value={config.kpi?.trendDirection || 'up_is_good'}
            onChange={(e) => setVisualizationConfig({ kpi: { ...config.kpi, format: config.kpi?.format || 'number', trendDirection: e.target.value as any } })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="up_is_good">Up is Good</option>
            <option value="down_is_good">Down is Good</option>
          </select>
        </div>
      </div>
    );
  }

  if (type === 'choropleth') {
    return (
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h4 className="text-sm font-medium text-slate-700">Map Options</h4>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Map Type</label>
          <select
            value={config.geo?.mapKey || 'us_states'}
            onChange={(e) => setVisualizationConfig({
              geo: {
                mapKey: e.target.value as any,
                regionField: config.geo?.regionField || '',
                valueField: config.geo?.valueField || '',
              }
            })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="us_states">US States</option>
            <option value="us_counties">US Counties</option>
            <option value="world_countries">World Countries</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Color Scale</label>
          <select
            value={config.geo?.colorScale || 'sequential'}
            onChange={(e) => setVisualizationConfig({
              geo: {
                ...config.geo!,
                colorScale: e.target.value as any,
              }
            })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="sequential">Sequential</option>
            <option value="diverging">Diverging</option>
          </select>
        </div>
      </div>
    );
  }

  return null;
}

export default VisualizationPanel;
