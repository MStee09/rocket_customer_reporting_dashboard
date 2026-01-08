import React from 'react';
import { Database, ArrowRight } from 'lucide-react';
import { useBuilder } from '../BuilderContext';

interface FieldDefinition {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date';
  category: 'dimension' | 'measure' | 'date';
}

const AVAILABLE_FIELDS: FieldDefinition[] = [
  { name: 'carrier_name', label: 'Carrier', type: 'string', category: 'dimension' },
  { name: 'origin_state', label: 'Origin State', type: 'string', category: 'dimension' },
  { name: 'destination_state', label: 'Destination State', type: 'string', category: 'dimension' },
  { name: 'origin_city', label: 'Origin City', type: 'string', category: 'dimension' },
  { name: 'destination_city', label: 'Destination City', type: 'string', category: 'dimension' },
  { name: 'mode_name', label: 'Mode', type: 'string', category: 'dimension' },
  { name: 'equipment_name', label: 'Equipment', type: 'string', category: 'dimension' },
  { name: 'status_name', label: 'Status', type: 'string', category: 'dimension' },
  { name: 'retail', label: 'Cost ($)', type: 'number', category: 'measure' },
  { name: 'miles', label: 'Miles', type: 'number', category: 'measure' },
  { name: 'total_weight', label: 'Weight (lbs)', type: 'number', category: 'measure' },
  { name: 'shipment_count', label: 'Shipment Count', type: 'number', category: 'measure' },
  { name: 'pickup_date', label: 'Pickup Date', type: 'date', category: 'date' },
  { name: 'delivery_date', label: 'Delivery Date', type: 'date', category: 'date' },
  { name: 'created_date', label: 'Created Date', type: 'date', category: 'date' },
];

export function FieldMappingPanel() {
  const { state, setVisualization, setTitle, setDescription } = useBuilder();
  const vizType = state.visualization.type;

  const needsXField = ['bar', 'line', 'area', 'scatter', 'heatmap'].includes(vizType);
  const needsYField = ['bar', 'line', 'area', 'scatter', 'heatmap', 'kpi'].includes(vizType);
  const needsGroupBy = ['bar', 'line', 'area'].includes(vizType);
  const needsGeoFields = ['choropleth', 'flow'].includes(vizType);
  const needsAggregation = ['bar', 'line', 'area', 'pie', 'kpi'].includes(vizType);

  const dimensions = AVAILABLE_FIELDS.filter(f => f.category === 'dimension');
  const measures = AVAILABLE_FIELDS.filter(f => f.category === 'measure');
  const dates = AVAILABLE_FIELDS.filter(f => f.category === 'date');

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
            label={vizType === 'bar' ? 'Category (X-Axis)' : 'X-Axis'}
            value={state.visualization.xField}
            onChange={(value) => setVisualization({ xField: value })}
            fields={[...dimensions, ...dates]}
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
              <option value="sum">Sum</option>
              <option value="avg">Average</option>
              <option value="count">Count</option>
              <option value="min">Minimum</option>
              <option value="max">Maximum</option>
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
          <GeoFieldMapping />
        )}
      </div>

      <MappingSummary />
    </div>
  );
}

interface FieldSelectorProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  fields: FieldDefinition[];
  placeholder?: string;
  allowEmpty?: boolean;
}

function FieldSelector({ label, value, onChange, fields, placeholder, allowEmpty }: FieldSelectorProps) {
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
        {fields.map(field => (
          <option key={field.name} value={field.name}>
            {field.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function GeoFieldMapping() {
  const { state, setVisualization } = useBuilder();
  const isFlow = state.visualization.type === 'flow';

  const geoFields = AVAILABLE_FIELDS.filter(f =>
    f.name.includes('state') || f.name.includes('city')
  );
  const measures = AVAILABLE_FIELDS.filter(f => f.category === 'measure');

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
          <option value="us_counties">US Counties</option>
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

export default FieldMappingPanel;
