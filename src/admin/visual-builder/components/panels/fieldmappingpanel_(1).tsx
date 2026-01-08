/**
 * Field Mapping Panel - Integrated Version
 *
 * LOCATION: /src/admin/visual-builder/components/panels/FieldMappingPanel.tsx
 *
 * Improvements over original:
 * - Searchable field dropdowns (combobox style)
 * - ALL fields available for X-axis (not just dimensions)
 * - Better visual hierarchy with query preview
 * - Preserved field reference browser from original
 */

import React, { useMemo, useState } from 'react';
import { Database, ArrowRight, Info, Sparkles, Search } from 'lucide-react';
import { useBuilder } from '../BuilderContext';
import { SearchableFieldSelect } from '../SearchableFieldSelect';
import {
  getAllBuilderFields,
  getDimensionFields,
  getMeasureFields,
  getDateFields,
  getGeoFields,
  AGGREGATION_OPTIONS,
  FIELD_SUBCATEGORIES,
} from '../../services/fieldService';
import type { BuilderFieldDefinition } from '../../types/BuilderSchema';

export function FieldMappingPanel() {
  const { state, setVisualization, setTitle, setDescription } = useBuilder();
  const vizType = state.visualization.type;

  // Get ALL fields for X-axis - not just dimensions!
  const allFields = useMemo(() => getAllBuilderFields(true), []);
  const dimensions = useMemo(() => getDimensionFields(true), []);
  const measures = useMemo(() => getMeasureFields(true), []);
  const dateFields = useMemo(() => getDateFields(true), []);
  const geoFields = useMemo(() => getGeoFields(true), []);
  
  // For X-axis, include all fields but sort so groupable fields come first
  const xAxisFields = useMemo(() => {
    return [...allFields].sort((a, b) => {
      if (a.isGroupable && !b.isGroupable) return -1;
      if (!a.isGroupable && b.isGroupable) return 1;
      return 0;
    });
  }, [allFields]);

  const needsXField = ['bar', 'line', 'area', 'scatter', 'heatmap', 'histogram', 'treemap', 'funnel'].includes(vizType);
  const needsYField = ['bar', 'line', 'area', 'scatter', 'heatmap', 'kpi', 'funnel', 'treemap'].includes(vizType);
  const needsGroupBy = ['bar', 'line', 'area'].includes(vizType);
  const needsGeoFields = ['choropleth', 'flow'].includes(vizType);
  const needsAggregation = ['bar', 'line', 'area', 'pie', 'kpi', 'histogram', 'funnel', 'treemap', 'choropleth'].includes(vizType);

  // Get appropriate label for X-axis based on chart type
  const getXAxisLabel = () => {
    switch (vizType) {
      case 'bar': return 'Category (X-Axis)';
      case 'histogram': return 'Value to Bin';
      case 'treemap': return 'Category';
      case 'funnel': return 'Stage Field';
      case 'pie': return 'Slices';
      default: return 'X-Axis Field';
    }
  };

  // Get appropriate label for Y-axis based on chart type
  const getYAxisLabel = () => {
    switch (vizType) {
      case 'kpi': return 'Metric Value';
      case 'treemap': return 'Size Value';
      case 'funnel': return 'Stage Value';
      default: return 'Value (Y-Axis)';
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Widget Details */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-400" />
          Widget Details
        </h3>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Title
          </label>
          <input
            type="text"
            value={state.title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Average Cost by Product"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Description
          </label>
          <textarea
            value={state.description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What insight does this widget provide?"
            rows={2}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          />
        </div>
      </div>

      {/* Data Mapping */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Data Mapping
        </h3>

        {/* X-Axis / Category Field */}
        {needsXField && (
          <SearchableFieldSelect
            label={getXAxisLabel()}
            value={state.visualization.xField}
            onChange={(value) => setVisualization({ xField: value })}
            fields={xAxisFields}
            placeholder="Search and select a field..."
            description={
              vizType === 'bar' 
                ? 'The field to group your data by (e.g., carrier_name, customer_name)'
                : vizType === 'histogram'
                ? 'The numeric field to create distribution bins from'
                : 'The field for the horizontal axis'
            }
          />
        )}

        {/* Y-Axis / Value Field */}
        {needsYField && (
          <SearchableFieldSelect
            label={getYAxisLabel()}
            value={state.visualization.yField}
            onChange={(value) => setVisualization({ yField: value })}
            fields={measures}
            placeholder="Search measure fields..."
            description="The numeric field to aggregate (e.g., retail cost, weight)"
          />
        )}

        {/* Aggregation */}
        {needsAggregation && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Aggregation
            </label>
            <div className="grid grid-cols-5 gap-1">
              {AGGREGATION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setVisualization({ aggregation: opt.value as any })}
                  className={`
                    px-2 py-2 text-xs font-medium rounded-lg transition-colors
                    ${state.visualization.aggregation === opt.value
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }
                  `}
                  title={opt.description}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {AGGREGATION_OPTIONS.find(o => o.value === state.visualization.aggregation)?.description || 'Select how to combine values'}
            </p>
          </div>
        )}

        {/* Group By (for series) */}
        {needsGroupBy && (
          <SearchableFieldSelect
            label="Color/Series (Optional)"
            value={state.visualization.groupBy}
            onChange={(value) => setVisualization({ groupBy: value })}
            fields={dimensions}
            placeholder="Add a second dimension..."
            allowEmpty
            description="Split data into colored series (e.g., by carrier, by mode)"
          />
        )}

        {/* Geo Fields */}
        {needsGeoFields && (
          <GeoFieldMapping geoFields={geoFields} measures={measures} />
        )}
      </div>

      {/* Query Summary */}
      <MappingSummary />

      {/* Quick Tips */}
      <QuickTips vizType={vizType} />

      {/* Available Fields Reference - kept from original */}
      <AvailableFieldsReference fields={allFields} />
    </div>
  );
}

function GeoFieldMapping({
  geoFields,
  measures,
}: {
  geoFields: BuilderFieldDefinition[];
  measures: BuilderFieldDefinition[];
}) {
  const { state, setVisualization } = useBuilder();
  const isFlow = state.visualization.type === 'flow';

  if (isFlow) {
    return (
      <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-2">
          🗺️ Flow Map Configuration
        </h4>

        <SearchableFieldSelect
          label="Origin Location"
          value={state.visualization.flow?.originField}
          onChange={(value) => setVisualization({
            flow: { ...state.visualization.flow, originField: value } as any
          })}
          fields={geoFields}
          placeholder="e.g., origin_state"
        />

        <div className="flex justify-center">
          <ArrowRight className="w-5 h-5 text-blue-400" />
        </div>

        <SearchableFieldSelect
          label="Destination Location"
          value={state.visualization.flow?.destinationField}
          onChange={(value) => setVisualization({
            flow: { ...state.visualization.flow, destinationField: value } as any
          })}
          fields={geoFields}
          placeholder="e.g., destination_state"
        />

        <SearchableFieldSelect
          label="Flow Value"
          value={state.visualization.flow?.valueField}
          onChange={(value) => setVisualization({
            flow: { ...state.visualization.flow, valueField: value } as any
          })}
          fields={measures}
          placeholder="e.g., retail (cost)"
        />

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={state.visualization.flow?.showArrows !== false}
            onChange={(e) => setVisualization({
              flow: { ...state.visualization.flow, showArrows: e.target.checked } as any
            })}
            className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
          />
          Show direction arrows
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-100">
      <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide flex items-center gap-2">
        🗺️ Choropleth Map Configuration
      </h4>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Map Region
        </label>
        <select
          value={state.visualization.geo?.mapKey || 'us_states'}
          onChange={(e) => setVisualization({
            geo: { ...state.visualization.geo, mapKey: e.target.value } as any
          })}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="us_states">🇺🇸 US States</option>
          <option value="ca_provinces">🇨🇦 Canadian Provinces</option>
          <option value="us_ca_combined">🇺🇸🇨🇦 US + Canada</option>
          <option value="world_countries">🌍 World Countries</option>
        </select>
      </div>

      <SearchableFieldSelect
        label="Region Field"
        value={state.visualization.geo?.regionField}
        onChange={(value) => setVisualization({
          geo: { ...state.visualization.geo, regionField: value } as any
        })}
        fields={geoFields}
        placeholder="e.g., origin_state"
        description="The field containing state/province/country codes"
      />

      <SearchableFieldSelect
        label="Color Value"
        value={state.visualization.geo?.valueField}
        onChange={(value) => setVisualization({
          geo: { ...state.visualization.geo, valueField: value } as any
        })}
        fields={measures}
        placeholder="e.g., retail (cost)"
        description="Darker colors = higher values"
      />

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Color Scale
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setVisualization({
              geo: { ...state.visualization.geo, colorScale: 'sequential' } as any
            })}
            className={`
              px-3 py-2 text-sm rounded-lg border transition-colors
              ${state.visualization.geo?.colorScale !== 'diverging'
                ? 'bg-orange-50 border-orange-200 text-orange-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }
            `}
          >
            <div className="h-2 w-full rounded mb-1 bg-gradient-to-r from-orange-100 to-orange-500" />
            Sequential
          </button>
          <button
            onClick={() => setVisualization({
              geo: { ...state.visualization.geo, colorScale: 'diverging' } as any
            })}
            className={`
              px-3 py-2 text-sm rounded-lg border transition-colors
              ${state.visualization.geo?.colorScale === 'diverging'
                ? 'bg-orange-50 border-orange-200 text-orange-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }
            `}
          >
            <div className="h-2 w-full rounded mb-1 bg-gradient-to-r from-blue-500 via-white to-red-500" />
            Diverging
          </button>
        </div>
      </div>
    </div>
  );
}

function MappingSummary() {
  const { state } = useBuilder();
  const viz = state.visualization;

  const getMappingText = () => {
    const parts: string[] = [];

    if (viz.type === 'choropleth' && viz.geo?.regionField) {
      return `Map ${viz.geo.regionField} colored by ${viz.aggregation || 'sum'}(${viz.geo.valueField || '?'})`;
    }

    if (viz.type === 'flow' && viz.flow?.originField) {
      return `Flow from ${viz.flow.originField} to ${viz.flow.destinationField} sized by ${viz.flow.valueField || '?'}`;
    }

    if (viz.yField) {
      parts.push(`${viz.aggregation || 'sum'}(${viz.yField})`);
    } else {
      parts.push('count(*)');
    }

    if (viz.xField) {
      parts.push(`by ${viz.xField}`);
    }

    if (viz.groupBy) {
      parts.push(`split by ${viz.groupBy}`);
    }

    return parts.length > 0 ? parts.join(' ') : 'Configure fields above';
  };

  const isComplete = () => {
    if (viz.type === 'choropleth') {
      return viz.geo?.regionField && viz.geo?.valueField;
    }
    if (viz.type === 'flow') {
      return viz.flow?.originField && viz.flow?.destinationField && viz.flow?.valueField;
    }
    if (viz.type === 'kpi') {
      return viz.yField;
    }
    return viz.xField;
  };

  return (
    <div className={`p-3 rounded-lg ${isComplete() ? 'bg-green-50 border border-green-200' : 'bg-slate-100'}`}>
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
        <Database className="w-3 h-3" />
        <span>Query Preview</span>
        {isComplete() && <span className="text-green-600">✓ Ready</span>}
      </div>
      <div className={`text-sm font-mono ${isComplete() ? 'text-green-700' : 'text-slate-500'}`}>
        SELECT {getMappingText()}
      </div>
    </div>
  );
}

function QuickTips({ vizType }: { vizType: string }) {
  const tips: Record<string, string> = {
    bar: '💡 Great for comparing categories. Use carrier_name, customer_name, or mode_name as Category.',
    line: '💡 Best for time series - use a date field for X-axis to show trends over time.',
    pie: '💡 Use for showing proportions - works best with 3-7 categories.',
    kpi: '💡 Shows a single big number - perfect for totals or averages.',
    choropleth: '💡 Use state fields to show geographic distribution of costs or volumes.',
    flow: '💡 Shows movement between locations - great for lane analysis.',
    histogram: '💡 Shows distribution of values - use for cost or weight analysis.',
    scatter: '💡 Compare two numeric fields to find correlations.',
    treemap: '💡 Shows hierarchical data as nested rectangles.',
    funnel: '💡 Shows progression through stages.',
  };

  const tip = tips[vizType];
  if (!tip) return null;

  return (
    <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
      <p className="text-xs text-amber-800">{tip}</p>
    </div>
  );
}

// Preserved from original - useful for field discovery
function AvailableFieldsReference({ fields }: { fields: BuilderFieldDefinition[] }) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');

  const filteredFields = useMemo(() => {
    if (!search.trim()) return fields.slice(0, expanded ? undefined : 0);
    const lower = search.toLowerCase();
    return fields.filter(f =>
      f.name.toLowerCase().includes(lower) ||
      f.label.toLowerCase().includes(lower) ||
      f.description?.toLowerCase().includes(lower)
    );
  }, [fields, search, expanded]);

  return (
    <div className="pt-4 border-t border-slate-200">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
      >
        <Info className="w-4 h-4" />
        {expanded ? 'Hide' : 'Show'} available fields ({fields.length})
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fields..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredFields.map(field => (
              <div key={field.name} className="px-2 py-1.5 text-xs bg-slate-50 rounded flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-700">{field.label}</span>
                  <span className="text-slate-400 ml-2">({field.name})</span>
                </div>
                <span className={`
                  px-1.5 py-0.5 rounded text-xs
                  ${field.category === 'measure' ? 'bg-blue-100 text-blue-700' : ''}
                  ${field.category === 'dimension' ? 'bg-green-100 text-green-700' : ''}
                  ${field.category === 'date' ? 'bg-amber-100 text-amber-700' : ''}
                `}>
                  {field.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default FieldMappingPanel;
