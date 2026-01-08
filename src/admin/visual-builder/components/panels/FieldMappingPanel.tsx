/**
 * Field Mapping Panel
 *
 * LOCATION: /src/admin/visual-builder/components/panels/FieldMappingPanel.tsx
 *
 * Allows admins to configure data mappings for widget visualizations.
 * Uses dynamic field discovery from the centralized schema.
 */

import React, { useMemo } from 'react';
import { Database, ArrowRight, Search, Info } from 'lucide-react';
import { useBuilder } from '../BuilderContext';
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

  const allFields = useMemo(() => getAllBuilderFields(true), []);
  const dimensions = useMemo(() => getDimensionFields(true), []);
  const measures = useMemo(() => getMeasureFields(true), []);
  const dateFields = useMemo(() => getDateFields(true), []);
  const geoFields = useMemo(() => getGeoFields(true), []);

  const needsXField = ['bar', 'line', 'area', 'scatter', 'heatmap', 'histogram'].includes(vizType);
  const needsYField = ['bar', 'line', 'area', 'scatter', 'heatmap', 'kpi', 'funnel'].includes(vizType);
  const needsGroupBy = ['bar', 'line', 'area'].includes(vizType);
  const needsGeoFields = ['choropleth', 'flow'].includes(vizType);
  const needsAggregation = ['bar', 'line', 'area', 'pie', 'kpi', 'histogram', 'funnel', 'treemap'].includes(vizType);

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">Widget Details</h3>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Title
          </label>
          <input
            type="text"
            value={state.title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Widget"
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
            placeholder="What does this widget show?"
            rows={2}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          />
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900">Data Mapping</h3>

        {needsXField && (
          <FieldSelector
            label={vizType === 'bar' ? 'Category (X-Axis)' : vizType === 'histogram' ? 'Value Field' : 'X-Axis'}
            value={state.visualization.xField}
            onChange={(value) => setVisualization({ xField: value })}
            fields={[...dimensions, ...dateFields]}
            placeholder="Select field..."
          />
        )}

        {needsYField && (
          <FieldSelector
            label={vizType === 'kpi' ? 'Value Field' : 'Value (Y-Axis)'}
            value={state.visualization.yField}
            onChange={(value) => setVisualization({ yField: value })}
            fields={measures}
            placeholder="Select measure..."
          />
        )}

        {needsAggregation && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Aggregation
            </label>
            <select
              value={state.visualization.aggregation || 'sum'}
              onChange={(e) => setVisualization({ aggregation: e.target.value as any })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {AGGREGATION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} - {opt.description}
                </option>
              ))}
            </select>
          </div>
        )}

        {needsGroupBy && (
          <FieldSelector
            label="Group By (Optional)"
            value={state.visualization.groupBy}
            onChange={(value) => setVisualization({ groupBy: value })}
            fields={dimensions}
            placeholder="None"
            allowEmpty
          />
        )}

        {needsGeoFields && (
          <GeoFieldMapping geoFields={geoFields} measures={measures} />
        )}
      </div>

      <MappingSummary />

      <AvailableFieldsReference fields={allFields} />
    </div>
  );
}

interface FieldSelectorProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  fields: BuilderFieldDefinition[];
  placeholder?: string;
  allowEmpty?: boolean;
}

function FieldSelector({ label, value, onChange, fields, placeholder, allowEmpty }: FieldSelectorProps) {
  const groupedFields = useMemo(() => {
    const groups: Record<string, BuilderFieldDefinition[]> = {};
    for (const field of fields) {
      const cat = field.fieldCategory;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(field);
    }
    return groups;
  }, [fields]);

  const selectedField = fields.find(f => f.name === value);

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        {(allowEmpty || !value) && (
          <option value="">{placeholder || 'Select...'}</option>
        )}
        {Object.entries(groupedFields).map(([category, categoryFields]) => {
          const categoryInfo = FIELD_SUBCATEGORIES.find(c => c.id === category);
          return (
            <optgroup key={category} label={categoryInfo?.label || category}>
              {categoryFields.map(field => (
                <option key={field.name} value={field.name}>
                  {field.label}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
      {selectedField?.description && (
        <p className="mt-1 text-xs text-slate-500">{selectedField.description}</p>
      )}
    </div>
  );
}

function GeoFieldMapping({
  geoFields,
  measures
}: {
  geoFields: BuilderFieldDefinition[];
  measures: BuilderFieldDefinition[];
}) {
  const { state, setVisualization } = useBuilder();
  const isFlow = state.visualization.type === 'flow';

  if (isFlow) {
    return (
      <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
        <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Flow Map Configuration
        </h4>

        <FieldSelector
          label="Origin Field"
          value={state.visualization.flow?.originField}
          onChange={(value) => setVisualization({
            flow: { ...state.visualization.flow, originField: value } as any
          })}
          fields={geoFields}
          placeholder="Select origin..."
        />

        <div className="flex justify-center">
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>

        <FieldSelector
          label="Destination Field"
          value={state.visualization.flow?.destinationField}
          onChange={(value) => setVisualization({
            flow: { ...state.visualization.flow, destinationField: value } as any
          })}
          fields={geoFields}
          placeholder="Select destination..."
        />

        <FieldSelector
          label="Value Field"
          value={state.visualization.flow?.valueField}
          onChange={(value) => setVisualization({
            flow: { ...state.visualization.flow, valueField: value } as any
          })}
          fields={measures}
          placeholder="Select value..."
        />

        <div className="flex items-center gap-4 pt-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={state.visualization.flow?.showArrows !== false}
              onChange={(e) => setVisualization({
                flow: { ...state.visualization.flow, showArrows: e.target.checked } as any
              })}
              className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
            />
            Show arrows
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
      <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        Choropleth Map Configuration
      </h4>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Map Type
        </label>
        <select
          value={state.visualization.geo?.mapKey || 'us_states'}
          onChange={(e) => setVisualization({
            geo: { ...state.visualization.geo, mapKey: e.target.value } as any
          })}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="us_states">US States</option>
          <option value="ca_provinces">Canadian Provinces</option>
          <option value="us_ca_combined">US + Canada</option>
          <option value="world_countries">World Countries</option>
        </select>
      </div>

      <FieldSelector
        label="Region Field"
        value={state.visualization.geo?.regionField}
        onChange={(value) => setVisualization({
          geo: { ...state.visualization.geo, regionField: value } as any
        })}
        fields={geoFields}
        placeholder="Select region field..."
      />

      <FieldSelector
        label="Value Field"
        value={state.visualization.geo?.valueField}
        onChange={(value) => setVisualization({
          geo: { ...state.visualization.geo, valueField: value } as any
        })}
        fields={measures}
        placeholder="Select value..."
      />

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Color Scale
        </label>
        <select
          value={state.visualization.geo?.colorScale || 'sequential'}
          onChange={(e) => setVisualization({
            geo: { ...state.visualization.geo, colorScale: e.target.value as any } as any
          })}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="sequential">Sequential (low to high)</option>
          <option value="diverging">Diverging (negative to positive)</option>
        </select>
      </div>
    </div>
  );
}

function MappingSummary() {
  const { state } = useBuilder();
  const viz = state.visualization;

  const getMappingText = () => {
    const parts: string[] = [];

    if (viz.yField) {
      parts.push(`${viz.aggregation || 'sum'}(${viz.yField})`);
    }

    if (viz.xField) {
      parts.push(`by ${viz.xField}`);
    }

    if (viz.groupBy) {
      parts.push(`grouped by ${viz.groupBy}`);
    }

    return parts.length > 0 ? parts.join(' ') : 'No fields mapped yet';
  };

  return (
    <div className="p-3 bg-slate-100 rounded-lg">
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
        <Database className="w-3 h-3" />
        <span>Data Query</span>
      </div>
      <div className="text-sm text-slate-700 font-mono">
        {getMappingText()}
      </div>
    </div>
  );
}

function AvailableFieldsReference({ fields }: { fields: BuilderFieldDefinition[] }) {
  const [expanded, setExpanded] = React.useState(false);
  const [search, setSearch] = React.useState('');

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
