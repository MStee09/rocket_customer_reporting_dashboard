/**
 * Visualization Panel
 * 
 * LOCATION: /src/admin/visual-builder/components/panels/VisualizationPanel.tsx
 * 
 * Allows admins to select and configure visualization types.
 */

import React from 'react';
import {
  BarChart3,
  LineChart,
  PieChart,
  AreaChart,
  ScatterChart,
  Map,
  ArrowRightLeft,
  Table2,
  TrendingUp,
  GitBranch,
  Layers,
  Activity,
  Grid3X3,
} from 'lucide-react';
import { useBuilder } from '../BuilderContext';
import type { VisualizationType } from '../../types/BuilderSchema';

interface VizOption {
  type: VisualizationType;
  label: string;
  icon: React.ElementType;
  description: string;
  category: 'standard' | 'geo' | 'specialized';
}

const VIZ_OPTIONS: VizOption[] = [
  // Standard charts
  { type: 'bar', label: 'Bar Chart', icon: BarChart3, description: 'Compare values across categories', category: 'standard' },
  { type: 'line', label: 'Line Chart', icon: LineChart, description: 'Show trends over time', category: 'standard' },
  { type: 'area', label: 'Area Chart', icon: AreaChart, description: 'Show cumulative trends', category: 'standard' },
  { type: 'pie', label: 'Pie Chart', icon: PieChart, description: 'Show parts of a whole', category: 'standard' },
  { type: 'scatter', label: 'Scatter Plot', icon: ScatterChart, description: 'Show correlations between values', category: 'standard' },
  { type: 'table', label: 'Data Table', icon: Table2, description: 'Show raw data in rows', category: 'standard' },
  
  // Geo charts
  { type: 'choropleth', label: 'Choropleth Map', icon: Map, description: 'Color regions by value', category: 'geo' },
  { type: 'flow', label: 'Flow Map', icon: ArrowRightLeft, description: 'Show origin-destination flows', category: 'geo' },
  
  // Specialized
  { type: 'kpi', label: 'KPI Card', icon: TrendingUp, description: 'Single value with trend', category: 'specialized' },
  { type: 'histogram', label: 'Histogram', icon: BarChart3, description: 'Show value distribution', category: 'specialized' },
  { type: 'treemap', label: 'Treemap', icon: Grid3X3, description: 'Hierarchical data as nested rectangles', category: 'specialized' },
  { type: 'funnel', label: 'Funnel', icon: GitBranch, description: 'Show stages in a process', category: 'specialized' },
  { type: 'sparkline', label: 'Sparkline', icon: Activity, description: 'Compact trend line', category: 'specialized' },
  { type: 'heatmap', label: 'Heatmap', icon: Layers, description: 'Show density with color', category: 'specialized' },
];

export function VisualizationPanel() {
  const { state, setVisualization } = useBuilder();
  const selectedType = state.visualization.type;

  const standardCharts = VIZ_OPTIONS.filter(v => v.category === 'standard');
  const geoCharts = VIZ_OPTIONS.filter(v => v.category === 'geo');
  const specializedCharts = VIZ_OPTIONS.filter(v => v.category === 'specialized');

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Standard Charts</h3>
        <div className="grid grid-cols-2 gap-2">
          {standardCharts.map(viz => (
            <VizOptionCard
              key={viz.type}
              viz={viz}
              selected={selectedType === viz.type}
              onSelect={() => setVisualization({ type: viz.type })}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Geographic</h3>
        <div className="grid grid-cols-2 gap-2">
          {geoCharts.map(viz => (
            <VizOptionCard
              key={viz.type}
              viz={viz}
              selected={selectedType === viz.type}
              onSelect={() => setVisualization({ type: viz.type })}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Specialized</h3>
        <div className="grid grid-cols-2 gap-2">
          {specializedCharts.map(viz => (
            <VizOptionCard
              key={viz.type}
              viz={viz}
              selected={selectedType === viz.type}
              onSelect={() => setVisualization({ type: viz.type })}
            />
          ))}
        </div>
      </div>

      {/* Chart-specific options */}
      <ChartOptions />
    </div>
  );
}

interface VizOptionCardProps {
  viz: VizOption;
  selected: boolean;
  onSelect: () => void;
}

function VizOptionCard({ viz, selected, onSelect }: VizOptionCardProps) {
  const Icon = viz.icon;

  return (
    <button
      onClick={onSelect}
      className={`
        flex items-start gap-3 p-3 rounded-lg border text-left transition-all
        ${selected 
          ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' 
          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        }
      `}
    >
      <div className={`
        p-2 rounded-lg
        ${selected ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}
      `}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${selected ? 'text-orange-900' : 'text-slate-900'}`}>
          {viz.label}
        </div>
        <div className={`text-xs ${selected ? 'text-orange-700' : 'text-slate-500'}`}>
          {viz.description}
        </div>
      </div>
    </button>
  );
}

function ChartOptions() {
  const { state, setVisualization } = useBuilder();
  const viz = state.visualization;

  return (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <h3 className="text-sm font-semibold text-slate-900">Chart Options</h3>

      {/* Common options */}
      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={viz.showLegend !== false}
            onChange={(e) => setVisualization({ showLegend: e.target.checked })}
            className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
          />
          <span className="text-sm text-slate-700">Show legend</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={viz.showLabels === true}
            onChange={(e) => setVisualization({ showLabels: e.target.checked })}
            className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
          />
          <span className="text-sm text-slate-700">Show data labels</span>
        </label>

        {['bar', 'line', 'area', 'scatter'].includes(viz.type) && (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={viz.showGrid !== false}
              onChange={(e) => setVisualization({ showGrid: e.target.checked })}
              className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
            />
            <span className="text-sm text-slate-700">Show grid lines</span>
          </label>
        )}
      </div>

      {/* KPI-specific options */}
      {viz.type === 'kpi' && (
        <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">KPI Options</h4>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Format</label>
            <select
              value={viz.kpi?.format || 'number'}
              onChange={(e) => setVisualization({
                kpi: { ...viz.kpi, format: e.target.value as any }
              })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="number">Number</option>
              <option value="currency">Currency</option>
              <option value="percent">Percentage</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prefix</label>
              <input
                type="text"
                value={viz.kpi?.prefix || ''}
                onChange={(e) => setVisualization({
                  kpi: { ...viz.kpi, prefix: e.target.value }
                })}
                placeholder="e.g., $"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Suffix</label>
              <input
                type="text"
                value={viz.kpi?.suffix || ''}
                onChange={(e) => setVisualization({
                  kpi: { ...viz.kpi, suffix: e.target.value }
                })}
                placeholder="e.g., %"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Trend Direction</label>
            <select
              value={viz.kpi?.trendDirection || 'up_is_good'}
              onChange={(e) => setVisualization({
                kpi: { ...viz.kpi, trendDirection: e.target.value as any }
              })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="up_is_good">Up is good (green)</option>
              <option value="down_is_good">Down is good (green)</option>
            </select>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={viz.kpi?.showSparkline === true}
              onChange={(e) => setVisualization({
                kpi: { ...viz.kpi, showSparkline: e.target.checked }
              })}
              className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
            />
            <span className="text-sm text-slate-700">Show sparkline trend</span>
          </label>
        </div>
      )}

      {/* Histogram-specific options */}
      {viz.type === 'histogram' && (
        <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">Histogram Options</h4>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Number of Bins
            </label>
            <input
              type="number"
              value={viz.histogram?.binCount || 10}
              onChange={(e) => setVisualization({
                histogram: { ...viz.histogram, binCount: Number(e.target.value) }
              })}
              min={2}
              max={100}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              How many groups to divide the data into
            </p>
          </div>
        </div>
      )}

      {/* Color options */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Color Palette</label>
        <div className="flex gap-2">
          {[
            ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#8b5cf6'],
            ['#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'],
            ['#64748b', '#475569', '#334155', '#1e293b', '#0f172a'],
          ].map((palette, i) => (
            <button
              key={i}
              onClick={() => setVisualization({ colors: palette })}
              className={`
                flex gap-0.5 p-1.5 rounded border transition-all
                ${JSON.stringify(viz.colors) === JSON.stringify(palette)
                  ? 'border-orange-500 ring-1 ring-orange-500'
                  : 'border-slate-200 hover:border-slate-300'
                }
              `}
            >
              {palette.map((color, j) => (
                <div
                  key={j}
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: color }}
                />
              ))}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VisualizationPanel;
