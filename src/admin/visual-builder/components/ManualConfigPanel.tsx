import React, { useState, useEffect } from 'react';
import { Database, Link2, X, Plus, BarChart3, LineChart, PieChart, Hash, Table, TrendingUp, Filter, ChevronDown } from 'lucide-react';
import { useBuilderV3 } from './BuilderContextV3';
import { useDynamicSchema, FieldInfo, JoinInfo } from '../hooks/useDynamicSchema';
import { ChartType, WidgetQueryFilter } from '../types/VisualBuilderTypes';

const CHART_TYPES: Array<{ type: ChartType; label: string; icon: React.ElementType }> = [
  { type: 'bar', label: 'Bar', icon: BarChart3 },
  { type: 'line', label: 'Line', icon: LineChart },
  { type: 'pie', label: 'Pie', icon: PieChart },
  { type: 'kpi', label: 'KPI', icon: Hash },
  { type: 'table', label: 'Table', icon: Table },
  { type: 'area', label: 'Area', icon: TrendingUp },
];

const AGGREGATIONS = [
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'count', label: 'Count' },
  { value: 'min', label: 'Min' },
  { value: 'max', label: 'Max' },
];

export function ManualConfigPanel() {
  const { state, dispatch } = useBuilderV3();
  const schema = useDynamicSchema();

  const [availableJoins, setAvailableJoins] = useState<JoinInfo[]>([]);
  const [groupableFields, setGroupableFields] = useState<FieldInfo[]>([]);
  const [aggregatableFields, setAggregatableFields] = useState<FieldInfo[]>([]);
  const [filterableFields, setFilterableFields] = useState<FieldInfo[]>([]);

  useEffect(() => {
    const loadFields = async () => {
      const tables = [state.baseTable, ...state.joins.map(j => j.table)];
      for (const table of tables) {
        await schema.loadFieldsForTable(table);
      }
      setGroupableFields(schema.getGroupableFields(tables));
      setAggregatableFields(schema.getAggregatableFields(tables));
      setFilterableFields(schema.getFilterableFields(tables));
    };
    loadFields();
  }, [state.baseTable, state.joins, schema]);

  useEffect(() => {
    const loadJoins = async () => {
      const joins = await schema.loadJoinsForTable(state.baseTable);
      setAvailableJoins(joins);
    };
    loadJoins();
  }, [state.baseTable, schema]);

  return (
    <div className="space-y-6">
      <Section title="Data Source" icon={Database}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Primary Table</label>
          <select
            value={state.baseTable}
            onChange={(e) => dispatch({ type: 'SET_BASE_TABLE', table: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          >
            {schema.tables.map((table) => (
              <option key={table.name} value={table.name}>{table.displayName}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2 mt-4">
          <label className="text-sm font-medium text-slate-700">Joins</label>
          {state.joins.length > 0 && (
            <div className="space-y-2 mb-3">
              {state.joins.map((join) => (
                <div key={join.table} className="flex items-center justify-between px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-900">{join.table}</span>
                  </div>
                  <button onClick={() => dispatch({ type: 'REMOVE_JOIN', table: join.table })} className="p-1 hover:bg-blue-100 rounded">
                    <X className="w-4 h-4 text-blue-600" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {availableJoins.filter(j => !state.joins.some(sj => sj.table === j.toTable)).map((join) => (
              <button
                key={join.toTable}
                onClick={() => dispatch({ type: 'ADD_JOIN', join: { table: join.toTable, type: join.joinType } })}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:border-blue-300"
              >
                <Plus className="w-3 h-3" />
                {join.displayName}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Chart Type" icon={BarChart3}>
        <div className="grid grid-cols-3 gap-2">
          {CHART_TYPES.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => dispatch({ type: 'SET_CHART_TYPE', chartType: type })}
              className={`p-3 rounded-lg border-2 ${state.chartType === type ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
            >
              <Icon className={`w-6 h-6 mx-auto mb-1 ${state.chartType === type ? 'text-blue-600' : 'text-slate-400'}`} />
              <div className="text-sm font-medium text-slate-900">{label}</div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Metrics" icon={TrendingUp}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Group By (X-Axis)</label>
          <select
            value={state.xField}
            onChange={(e) => dispatch({ type: 'SET_X_FIELD', field: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          >
            <option value="">Select field...</option>
            {groupableFields.map((field) => (
              <option key={`${field.tableName}.${field.name}`} value={field.name}>{field.displayName} ({field.tableName})</option>
            ))}
          </select>
        </div>

        <div className="space-y-2 mt-4">
          <label className="text-sm font-medium text-slate-700">Metric (Y-Axis)</label>
          <select
            value={state.yField}
            onChange={(e) => dispatch({ type: 'SET_Y_FIELD', field: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          >
            <option value="">Select field...</option>
            {aggregatableFields.map((field) => (
              <option key={`${field.tableName}.${field.name}`} value={field.name}>{field.displayName} ({field.tableName})</option>
            ))}
          </select>
        </div>

        <div className="space-y-2 mt-4">
          <label className="text-sm font-medium text-slate-700">Aggregation</label>
          <div className="flex flex-wrap gap-2">
            {AGGREGATIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => dispatch({ type: 'SET_AGGREGATION', aggregation: value as 'sum' | 'avg' | 'count' | 'min' | 'max' })}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${state.aggregation === value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Filters" icon={Filter}>
        <div className="space-y-3">
          {state.filters.map((filter, index) => (
            <FilterRow
              key={index}
              filter={filter}
              fields={filterableFields}
              onUpdate={(f) => dispatch({ type: 'UPDATE_FILTER', index, filter: f })}
              onRemove={() => dispatch({ type: 'REMOVE_FILTER', index })}
            />
          ))}
          <button
            onClick={() => dispatch({ type: 'ADD_FILTER', filter: { field: '', operator: 'eq', value: '' } })}
            className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Add Filter
          </button>
        </div>
      </Section>

      <Section title="Sorting & Limit" icon={ChevronDown}>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Order By</label>
            <select
              value={state.orderBy}
              onChange={(e) => dispatch({ type: 'SET_ORDER_BY', field: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            >
              <option value="">Default</option>
              <option value="value">Value</option>
              {groupableFields.map((field) => (
                <option key={field.name} value={field.name}>{field.displayName}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Direction</label>
            <select
              value={state.orderDir}
              onChange={(e) => dispatch({ type: 'SET_ORDER_DIR', dir: e.target.value as 'asc' | 'desc' })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
        <div className="space-y-2 mt-4">
          <label className="text-sm font-medium text-slate-700">Limit</label>
          <input
            type="number"
            value={state.limit}
            onChange={(e) => dispatch({ type: 'SET_LIMIT', limit: parseInt(e.target.value) || 100 })}
            min={1}
            max={1000}
            className="w-32 px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-slate-500" />
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function FilterRow({ filter, fields, onUpdate, onRemove }: { filter: WidgetQueryFilter; fields: FieldInfo[]; onUpdate: (f: WidgetQueryFilter) => void; onRemove: () => void }) {
  const operators = [
    { value: 'eq', label: 'equals' },
    { value: 'neq', label: 'not equals' },
    { value: 'gt', label: '>' },
    { value: 'gte', label: '>=' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '<=' },
    { value: 'ilike', label: 'contains' },
  ];

  return (
    <div className="flex items-center gap-2">
      <select
        value={filter.field}
        onChange={(e) => onUpdate({ ...filter, field: e.target.value })}
        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
      >
        <option value="">Select field...</option>
        {fields.map((field) => (
          <option key={`${field.tableName}.${field.name}`} value={field.name}>{field.displayName}</option>
        ))}
      </select>
      <select
        value={filter.operator}
        onChange={(e) => onUpdate({ ...filter, operator: e.target.value as WidgetQueryFilter['operator'] })}
        className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm"
      >
        {operators.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>
      <input
        type="text"
        value={filter.value}
        onChange={(e) => onUpdate({ ...filter, value: e.target.value })}
        placeholder="Value..."
        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
      />
      <button onClick={onRemove} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
