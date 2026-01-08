import React from 'react';
import { Database, ArrowRight, X } from 'lucide-react';
import { useBuilder } from '../BuilderContext';
import { AVAILABLE_FIELDS } from '../../logic/aiCompilation';

const FIELD_GROUPS = {
  dimensions: ['carrier_name', 'service_type', 'mode', 'origin_state', 'destination_state', 'origin_city', 'destination_city', 'status'],
  measures: ['retail', 'carrier_cost', 'total_weight'],
  dates: ['ship_date', 'delivery_date'],
};

export function FieldMappingPanel() {
  const { state, setVisualizationConfig, setDataSource } = useBuilder();
  const config = state.visualization;
  const vizType = config.type;

  const requiresXY = ['bar', 'line', 'area', 'scatter'].includes(vizType);
  const requiresGeo = vizType === 'choropleth';
  const requiresFlow = vizType === 'flow';
  const requiresKPI = vizType === 'kpi';

  const getFieldLabel = (fieldName: string) => {
    const field = AVAILABLE_FIELDS.find(f => f.name === fieldName);
    return field?.label || fieldName;
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Database className="w-4 h-4" />
        <span>Map data fields to visualization dimensions</span>
      </div>

      {requiresXY && (
        <>
          <FieldSelector
            label="X-Axis (Category)"
            value={config.xField}
            onChange={(field) => setVisualizationConfig({ xField: field })}
            fields={[...FIELD_GROUPS.dimensions, ...FIELD_GROUPS.dates]}
            getLabel={getFieldLabel}
          />

          <FieldSelector
            label="Y-Axis (Value)"
            value={config.yField}
            onChange={(field) => setVisualizationConfig({ yField: field })}
            fields={FIELD_GROUPS.measures}
            getLabel={getFieldLabel}
          />

          <FieldSelector
            label="Group By (Optional)"
            value={config.groupBy}
            onChange={(field) => setVisualizationConfig({ groupBy: field || undefined })}
            fields={FIELD_GROUPS.dimensions}
            getLabel={getFieldLabel}
            optional
          />
        </>
      )}

      {vizType === 'pie' && (
        <>
          <FieldSelector
            label="Category"
            value={config.xField}
            onChange={(field) => setVisualizationConfig({ xField: field })}
            fields={FIELD_GROUPS.dimensions}
            getLabel={getFieldLabel}
          />

          <FieldSelector
            label="Value"
            value={config.yField}
            onChange={(field) => setVisualizationConfig({ yField: field })}
            fields={FIELD_GROUPS.measures}
            getLabel={getFieldLabel}
          />
        </>
      )}

      {requiresKPI && (
        <>
          <FieldSelector
            label="Metric Value"
            value={config.yField}
            onChange={(field) => setVisualizationConfig({ yField: field })}
            fields={FIELD_GROUPS.measures}
            getLabel={getFieldLabel}
          />

          <FieldSelector
            label="Comparison Field (Optional)"
            value={config.kpi?.comparisonField}
            onChange={(field) => setVisualizationConfig({
              kpi: { ...config.kpi, format: config.kpi?.format || 'number', comparisonField: field || undefined }
            })}
            fields={FIELD_GROUPS.measures}
            getLabel={getFieldLabel}
            optional
          />
        </>
      )}

      {requiresGeo && (
        <>
          <FieldSelector
            label="Region Field"
            value={config.geo?.regionField}
            onChange={(field) => setVisualizationConfig({
              geo: { ...config.geo!, regionField: field || '' }
            })}
            fields={['origin_state', 'destination_state']}
            getLabel={getFieldLabel}
          />

          <FieldSelector
            label="Value Field"
            value={config.geo?.valueField}
            onChange={(field) => setVisualizationConfig({
              geo: { ...config.geo!, valueField: field || '' }
            })}
            fields={FIELD_GROUPS.measures}
            getLabel={getFieldLabel}
          />
        </>
      )}

      {requiresFlow && (
        <>
          <FieldSelector
            label="Origin Field"
            value={config.flow?.originField}
            onChange={(field) => setVisualizationConfig({
              flow: { ...config.flow!, originField: field || '' }
            })}
            fields={['origin_state', 'origin_city']}
            getLabel={getFieldLabel}
          />

          <FieldSelector
            label="Destination Field"
            value={config.flow?.destinationField}
            onChange={(field) => setVisualizationConfig({
              flow: { ...config.flow!, destinationField: field || '' }
            })}
            fields={['destination_state', 'destination_city']}
            getLabel={getFieldLabel}
          />

          <FieldSelector
            label="Value Field"
            value={config.flow?.valueField}
            onChange={(field) => setVisualizationConfig({
              flow: { ...config.flow!, valueField: field || '' }
            })}
            fields={FIELD_GROUPS.measures}
            getLabel={getFieldLabel}
          />
        </>
      )}

      {vizType === 'table' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">Table Columns</label>
          <div className="space-y-2">
            {AVAILABLE_FIELDS.map((field) => (
              <label
                key={field.name}
                className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={state.dataSource.columns.includes(field.name)}
                  onChange={(e) => {
                    const newColumns = e.target.checked
                      ? [...state.dataSource.columns, field.name]
                      : state.dataSource.columns.filter(c => c !== field.name);
                    setDataSource(state.dataSource.table, newColumns);
                  }}
                  className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-slate-700">{field.label}</span>
                <span className="text-xs text-slate-400">({field.type})</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <FieldMappingPreview />
    </div>
  );
}

interface FieldSelectorProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  fields: string[];
  getLabel: (name: string) => string;
  optional?: boolean;
}

function FieldSelector({ label, value, onChange, fields, getLabel, optional }: FieldSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {optional && <span className="text-slate-400 font-normal ml-1">(optional)</span>}
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        <option value="">Select field...</option>
        {fields.map((field) => (
          <option key={field} value={field}>
            {getLabel(field)}
          </option>
        ))}
      </select>
    </div>
  );
}

function FieldMappingPreview() {
  const { state } = useBuilder();
  const config = state.visualization;
  const vizType = config.type;

  const getMappings = () => {
    const mappings: { label: string; field: string }[] = [];

    if (['bar', 'line', 'area', 'scatter', 'pie'].includes(vizType)) {
      if (config.xField) mappings.push({ label: 'X-Axis', field: config.xField });
      if (config.yField) mappings.push({ label: 'Y-Axis', field: config.yField });
      if (config.groupBy) mappings.push({ label: 'Group', field: config.groupBy });
    }

    if (vizType === 'kpi' && config.yField) {
      mappings.push({ label: 'Value', field: config.yField });
    }

    if (vizType === 'choropleth' && config.geo) {
      if (config.geo.regionField) mappings.push({ label: 'Region', field: config.geo.regionField });
      if (config.geo.valueField) mappings.push({ label: 'Value', field: config.geo.valueField });
    }

    if (vizType === 'flow' && config.flow) {
      if (config.flow.originField) mappings.push({ label: 'Origin', field: config.flow.originField });
      if (config.flow.destinationField) mappings.push({ label: 'Dest', field: config.flow.destinationField });
      if (config.flow.valueField) mappings.push({ label: 'Value', field: config.flow.valueField });
    }

    return mappings;
  };

  const mappings = getMappings();

  if (mappings.length === 0) return null;

  return (
    <div className="pt-4 border-t border-slate-200">
      <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Current Mapping</h4>
      <div className="flex flex-wrap gap-2">
        {mappings.map((m, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded text-xs"
          >
            <span className="text-slate-500">{m.label}:</span>
            <span className="font-medium text-slate-700">{m.field}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FieldMappingPanel;
