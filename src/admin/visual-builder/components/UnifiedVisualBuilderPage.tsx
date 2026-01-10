import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  LineChart,
  PieChart,
  Map,
  Hash,
  Table,
  TrendingUp,
  Database,
  Filter,
  Upload,
  RotateCcw,
  AlertCircle,
  Sparkles,
  Search,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Settings,
  Palette,
} from 'lucide-react';

import {
  BuilderProvider,
  useBuilder,
  loadDraftFromStorage,
  clearDraftFromStorage
} from './BuilderContext';
import { PreviewPanel } from './panels/PreviewPanel';
import { PublishPanel } from './panels/PublishPanel';

import type {
  VisualBuilderSchema,
  FilterBlock,
  FilterCondition,
  VisualizationType,
  BuilderFieldDefinition,
} from '../types/BuilderSchema';

import {
  getAllBuilderFields,
  getDimensionFields,
  getMeasureFields,
  getDateFields,
  AGGREGATION_OPTIONS,
  FILTER_OPERATORS,
  getOperatorsForFieldType,
} from '../services/fieldService';

import { supabase } from '../../../lib/supabase';

interface FilterValueOption {
  value: string;
  label: string;
  count: number;
}

interface ProductSearchResult {
  value: string;
  count: number;
  sample: string;
}

const CHART_TYPES: { id: VisualizationType; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'bar', label: 'Bar', icon: <BarChart3 className="w-5 h-5" />, desc: 'Compare categories' },
  { id: 'line', label: 'Line', icon: <LineChart className="w-5 h-5" />, desc: 'Show trends' },
  { id: 'area', label: 'Area', icon: <TrendingUp className="w-5 h-5" />, desc: 'Cumulative trends' },
  { id: 'pie', label: 'Pie', icon: <PieChart className="w-5 h-5" />, desc: 'Show proportions' },
  { id: 'kpi', label: 'KPI', icon: <Hash className="w-5 h-5" />, desc: 'Single metric' },
  { id: 'table', label: 'Table', icon: <Table className="w-5 h-5" />, desc: 'Detailed data' },
  { id: 'choropleth', label: 'Map', icon: <Map className="w-5 h-5" />, desc: 'Geographic' },
  { id: 'treemap', label: 'Treemap', icon: <Database className="w-5 h-5" />, desc: 'Hierarchical' },
];

export function UnifiedVisualBuilderPage() {
  const navigate = useNavigate();
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [savedDraft, setSavedDraft] = useState<VisualBuilderSchema | null>(null);

  useEffect(() => {
    const draft = loadDraftFromStorage();
    if (draft && draft.ui.isDirty) {
      setSavedDraft(draft);
      setShowDraftModal(true);
    }
  }, []);

  const handleRestoreDraft = () => {
    setShowDraftModal(false);
  };

  const handleDiscardDraft = () => {
    clearDraftFromStorage();
    setSavedDraft(null);
    setShowDraftModal(false);
  };

  return (
    <BuilderProvider initialSchema={showDraftModal ? undefined : savedDraft || undefined}>
      <div className="min-h-screen bg-slate-100">
        <Header onBack={() => navigate(-1)} />

        <main className="max-w-[1800px] mx-auto p-4">
          <BuilderInterface />
        </main>

        {showDraftModal && savedDraft && (
          <DraftRecoveryModal
            draft={savedDraft}
            onRestore={handleRestoreDraft}
            onDiscard={handleDiscardDraft}
          />
        )}
      </div>
    </BuilderProvider>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  const { state, reset } = useBuilder();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Widget Builder</h1>
            <p className="text-xs text-slate-500">
              {state.title || 'New Widget'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {state.ui.isDirty && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
              Unsaved
            </span>
          )}
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>
    </header>
  );
}

function BuilderInterface() {
  const [activeTab, setActiveTab] = useState<'config' | 'filters' | 'style'>('config');

  return (
    <div className="grid grid-cols-12 gap-4 min-h-[calc(100vh-100px)]">
      <div className="col-span-12 lg:col-span-5 space-y-4">
        <AIInputBar />

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-200">
            {[
              { id: 'config', label: 'Configure', icon: <Settings className="w-4 h-4" /> },
              { id: 'filters', label: 'Filters', icon: <Filter className="w-4 h-4" /> },
              { id: 'style', label: 'Style', icon: <Palette className="w-4 h-4" /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'config' | 'filters' | 'style')}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors
                  ${activeTab === tab.id
                    ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50/50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
            {activeTab === 'config' && <ConfigPanel />}
            {activeTab === 'filters' && <FiltersPanel />}
            {activeTab === 'style' && <StylePanel />}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="font-medium text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Publish
            </h3>
          </div>
          <PublishPanel />
        </div>
      </div>

      <div className="col-span-12 lg:col-span-7">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
          <PreviewPanel />
        </div>
      </div>
    </div>
  );
}

function AIInputBar() {
  const { setVisualization, setTitle, addLogicBlock } = useBuilder();
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsProcessing(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/widget-builder-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ prompt }),
        }
      );

      const result = await response.json();

      if (result.success) {
        setVisualization({
          type: result.visualizationType || 'bar',
          xField: result.xField,
          yField: result.yField,
          aggregation: result.aggregation || 'sum',
        });

        if (result.summary) {
          setTitle(result.summary);
        }

        if (result.filters && result.filters.length > 0) {
          const filterBlock: FilterBlock = {
            id: crypto.randomUUID(),
            type: 'filter',
            conditions: result.filters.map((f: { field: string; operator: string; value: unknown }) => ({
              field: f.field,
              operator: f.operator,
              value: f.value,
            })),
            enabled: true,
            label: 'AI Generated Filter',
          };
          addLogicBlock(filterBlock);
        }

        setPrompt('');
      }
    } catch (err) {
      console.error('AI generation error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span className="font-medium text-slate-700">AI Assistant</span>
          <span className="text-xs text-slate-400">— describe what you want</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="e.g., Average revenue by carrier for drawer products"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <button
              onClick={handleGenerate}
              disabled={isProcessing || !prompt.trim()}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-slate-300 transition-colors text-sm font-medium flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin">...</span>
                  Working
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2">
            {[
              'Revenue by carrier',
              'Shipments by origin state',
              'Monthly cost trend',
              'Top 10 products',
            ].map((example, i) => (
              <button
                key={i}
                onClick={() => setPrompt(example)}
                className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ConfigPanel() {
  const { state, setVisualization, setTitle, setDescription } = useBuilder();
  const dimensions = useMemo(() => getDimensionFields(true), []);
  const measures = useMemo(() => getMeasureFields(true), []);
  const dateFields = useMemo(() => getDateFields(true), []);

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
          <input
            type="text"
            value={state.title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Widget"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <input
            type="text"
            value={state.description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this widget show?"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Chart Type</label>
        <div className="grid grid-cols-4 gap-2">
          {CHART_TYPES.map(chart => (
            <button
              key={chart.id}
              onClick={() => setVisualization({ type: chart.id })}
              className={`
                p-3 rounded-lg border-2 text-center transition-all
                ${state.visualization.type === chart.id
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 hover:border-slate-300'
                }
              `}
              title={chart.desc}
            >
              <div className={`mx-auto mb-1 ${state.visualization.type === chart.id ? 'text-orange-600' : 'text-slate-500'}`}>
                {chart.icon}
              </div>
              <div className={`text-xs font-medium ${state.visualization.type === chart.id ? 'text-orange-700' : 'text-slate-600'}`}>
                {chart.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {state.visualization.type === 'kpi' ? 'Group By (optional)' : 'X-Axis / Breakdown'}
        </label>
        <FieldSelect
          value={state.visualization.xField}
          onChange={(v) => setVisualization({ xField: v })}
          fields={[...dimensions, ...dateFields]}
          placeholder="Select field..."
          allowClear
        />

        {state.visualization.xField && !state.visualization.xField.includes('date') && (
          <BreakdownValuePicker field={state.visualization.xField} />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {state.visualization.type === 'kpi' ? 'Value' : 'Y-Axis / Measure'}
        </label>
        <FieldSelect
          value={state.visualization.yField}
          onChange={(v) => setVisualization({ yField: v })}
          fields={measures}
          placeholder="Select measure..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Aggregation</label>
        <div className="flex flex-wrap gap-2">
          {AGGREGATION_OPTIONS.map(agg => (
            <button
              key={agg.value}
              onClick={() => setVisualization({ aggregation: agg.value as 'sum' | 'avg' | 'count' | 'min' | 'max' })}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${state.visualization.aggregation === agg.value
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }
              `}
            >
              {agg.label}
            </button>
          ))}
        </div>
      </div>

      {['bar', 'line', 'area'].includes(state.visualization.type) && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Series / Group By <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <FieldSelect
            value={state.visualization.groupBy}
            onChange={(v) => setVisualization({ groupBy: v })}
            fields={dimensions}
            placeholder="None"
            allowClear
          />
        </div>
      )}
    </div>
  );
}

interface FieldSelectProps {
  value?: string;
  onChange: (value: string) => void;
  fields: BuilderFieldDefinition[];
  placeholder?: string;
  allowClear?: boolean;
}

function FieldSelect({ value, onChange, fields, placeholder, allowClear }: FieldSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredFields = useMemo(() => {
    if (!search.trim()) return fields;
    const lower = search.toLowerCase();
    return fields.filter(f =>
      f.name.toLowerCase().includes(lower) ||
      f.label.toLowerCase().includes(lower)
    );
  }, [fields, search]);

  const selectedField = fields.find(f => f.name === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-left flex items-center justify-between hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        <span className={selectedField ? 'text-slate-900' : 'text-slate-400'}>
          {selectedField?.label || placeholder || 'Select...'}
        </span>
        <div className="flex items-center gap-1">
          {allowClear && value && (
            <button
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="p-0.5 hover:bg-slate-200 rounded"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          )}
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </div>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-64 overflow-hidden">
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search fields..."
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {allowClear && (
                <button
                  onClick={() => { onChange(''); setIsOpen(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-50"
                >
                  None
                </button>
              )}
              {filteredFields.map(field => (
                <button
                  key={field.name}
                  onClick={() => { onChange(field.name); setIsOpen(false); setSearch(''); }}
                  className={`
                    w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between
                    ${value === field.name ? 'bg-orange-50 text-orange-700' : 'text-slate-700'}
                  `}
                >
                  <span>{field.label}</span>
                  <span className="text-xs text-slate-400">{field.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function BreakdownValuePicker({ field }: { field: string }) {
  const { state, addLogicBlock, updateLogicBlock, removeLogicBlock } = useBuilder();
  const [isExpanded, setIsExpanded] = useState(false);
  const [availableValues, setAvailableValues] = useState<FilterValueOption[]>([]);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  const existingFilter = state.logicBlocks.find(
    b => b.type === 'filter' && (b as FilterBlock).conditions.some(c => c.field === field)
  ) as FilterBlock | undefined;

  useEffect(() => {
    if (isExpanded && availableValues.length === 0) {
      loadValues();
    }
  }, [isExpanded, field]);

  useEffect(() => {
    if (existingFilter) {
      const cond = existingFilter.conditions.find(c => c.field === field);
      if (cond && Array.isArray(cond.value)) {
        setSelectedValues(cond.value as string[]);
      }
    }
  }, [existingFilter, field]);

  const loadValues = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('shipment_report_view')
        .select(field)
        .not(field, 'is', null)
        .limit(1000);

      if (data) {
        const counts = new Map<string, number>();
        for (const row of data) {
          const val = (row as Record<string, unknown>)[field] as string;
          if (val) counts.set(val, (counts.get(val) || 0) + 1);
        }

        setAvailableValues(
          Array.from(counts.entries())
            .map(([value, count]) => ({ value, label: value, count }))
            .sort((a, b) => b.count - a.count)
        );
      }
    } catch (err) {
      console.error('Error loading breakdown values:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFilter = (values: string[]) => {
    setSelectedValues(values);

    if (values.length === 0 || values.length === availableValues.length) {
      if (existingFilter) {
        removeLogicBlock(existingFilter.id);
      }
      return;
    }

    const condition: FilterCondition = {
      field,
      operator: 'in',
      value: values,
    };

    if (existingFilter) {
      updateLogicBlock(existingFilter.id, { conditions: [condition] });
    } else {
      addLogicBlock({
        id: crypto.randomUUID(),
        type: 'filter',
        conditions: [condition],
        enabled: true,
        label: `${field} filter`,
      });
    }
  };

  const toggleValue = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    updateFilter(newValues);
  };

  const selectTop = (n: number) => {
    updateFilter(availableValues.slice(0, n).map(v => v.value));
  };

  const filteredValues = search
    ? availableValues.filter(v => v.value.toLowerCase().includes(search.toLowerCase()))
    : availableValues;

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700"
      >
        <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        {selectedValues.length > 0 && selectedValues.length < availableValues.length
          ? `${selectedValues.length} of ${availableValues.length} selected`
          : 'Select specific values'
        }
      </button>

      {isExpanded && (
        <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
          {isLoading ? (
            <div className="text-sm text-slate-500 text-center py-4">Loading values...</div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500">{availableValues.length} values available</span>
                <div className="flex gap-1">
                  <button onClick={() => selectTop(5)} className="text-xs px-2 py-0.5 bg-white border rounded hover:bg-slate-100">Top 5</button>
                  <button onClick={() => selectTop(10)} className="text-xs px-2 py-0.5 bg-white border rounded hover:bg-slate-100">Top 10</button>
                  <button onClick={() => updateFilter(availableValues.map(v => v.value))} className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded hover:bg-orange-200">All</button>
                  <button onClick={() => updateFilter([])} className="text-xs px-2 py-0.5 bg-white border rounded hover:bg-slate-100">Clear</button>
                </div>
              </div>

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full px-2 py-1 border border-slate-200 rounded text-xs mb-2"
              />

              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {filteredValues.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => toggleValue(item.value)}
                    className={`
                      w-full flex items-center justify-between px-2 py-1 rounded text-xs
                      ${selectedValues.includes(item.value) ? 'bg-orange-100 text-orange-700' : 'hover:bg-white'}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded border ${selectedValues.includes(item.value) ? 'bg-orange-500 border-orange-500' : 'border-slate-300'}`}>
                        {selectedValues.includes(item.value) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span>{item.label}</span>
                    </div>
                    <span className="text-slate-400">{item.count}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function FiltersPanel() {
  const { state, addLogicBlock, updateLogicBlock, removeLogicBlock } = useBuilder();
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<ProductSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const allFields = useMemo(() => getAllBuilderFields(true), []);

  const productFilter = state.logicBlocks.find(
    b => b.type === 'filter' && b.label === 'Product Filter'
  ) as FilterBlock | undefined;

  const selectedProducts = productFilter?.conditions.find(c => c.field === 'description')?.value as string[] || [];

  const handleProductSearch = async () => {
    if (!productSearch.trim()) return;
    setIsSearching(true);

    try {
      const { data } = await supabase
        .from('shipment_item')
        .select('description')
        .ilike('description', `%${productSearch}%`)
        .limit(100);

      if (data) {
        const counts = new Map<string, number>();
        for (const row of data) {
          if (row.description) {
            const upper = row.description.toUpperCase();
            counts.set(upper, (counts.get(upper) || 0) + 1);
          }
        }

        setProductResults(
          Array.from(counts.entries())
            .map(([value, count]) => ({ value, count, sample: value }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 15)
        );
      }
    } catch (err) {
      console.error('Product search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleProduct = (value: string) => {
    const newProducts = selectedProducts.includes(value)
      ? selectedProducts.filter(p => p !== value)
      : [...selectedProducts, value];

    if (newProducts.length === 0) {
      if (productFilter) removeLogicBlock(productFilter.id);
      return;
    }

    const condition: FilterCondition = {
      field: 'description',
      operator: 'contains_any',
      value: newProducts,
    };

    if (productFilter) {
      updateLogicBlock(productFilter.id, { conditions: [condition] });
    } else {
      addLogicBlock({
        id: crypto.randomUUID(),
        type: 'filter',
        conditions: [condition],
        enabled: true,
        label: 'Product Filter',
      });
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Filter by Product
        </label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleProductSearch()}
              placeholder="Search products (e.g., drawer, cargoglide)"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <button
            onClick={handleProductSearch}
            disabled={isSearching}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:bg-slate-400 text-sm"
          >
            {isSearching ? '...' : 'Search'}
          </button>
        </div>

        <div className="flex gap-1 mt-2">
          {['drawer', 'cargoglide', 'toolbox'].map(term => (
            <button
              key={term}
              onClick={() => setProductSearch(term)}
              className="text-xs px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600"
            >
              {term}
            </button>
          ))}
        </div>

        {productResults.length > 0 && (
          <div className="mt-3 max-h-48 overflow-y-auto space-y-1">
            {productResults.map((result, i) => {
              const isSelected = selectedProducts.includes(result.value);
              return (
                <button
                  key={i}
                  onClick={() => toggleProduct(result.value)}
                  className={`
                    w-full flex items-center justify-between p-2 rounded-lg text-sm
                    ${isSelected ? 'bg-orange-100 border border-orange-300' : 'bg-slate-50 hover:bg-slate-100'}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-300'}`}>
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                    <span className="truncate">{result.value}</span>
                  </div>
                  <span className="text-xs text-slate-500">{result.count}</span>
                </button>
              );
            })}
          </div>
        )}

        {selectedProducts.length > 0 && (
          <div className="mt-3 p-3 bg-orange-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-orange-700">
                {selectedProducts.length} products selected
              </span>
              <button
                onClick={() => productFilter && removeLogicBlock(productFilter.id)}
                className="text-xs text-red-500 hover:text-red-600"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedProducts.map(product => (
                <span
                  key={product}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-orange-200 rounded text-xs text-orange-700"
                >
                  {product.length > 20 ? product.slice(0, 20) + '...' : product}
                  <button onClick={() => toggleProduct(product)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-700">Additional Filters</label>
          <button
            onClick={() => {
              addLogicBlock({
                id: crypto.randomUUID(),
                type: 'filter',
                conditions: [{ field: '', operator: 'eq', value: '' }],
                enabled: true,
              });
            }}
            className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Filter
          </button>
        </div>

        <div className="space-y-2">
          {state.logicBlocks
            .filter(b => b.type === 'filter' && b.label !== 'Product Filter')
            .map((block) => (
              <FilterBlockEditor
                key={block.id}
                block={block as FilterBlock}
                fields={allFields}
                onUpdate={(updates) => updateLogicBlock(block.id, updates)}
                onRemove={() => removeLogicBlock(block.id)}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

interface FilterBlockEditorProps {
  block: FilterBlock;
  fields: BuilderFieldDefinition[];
  onUpdate: (updates: Partial<FilterBlock>) => void;
  onRemove: () => void;
}

function FilterBlockEditor({ block, fields, onUpdate, onRemove }: FilterBlockEditorProps) {
  const condition = block.conditions[0] || { field: '', operator: 'eq', value: '' };
  const selectedField = fields.find(f => f.name === condition.field);
  const operators = selectedField ? getOperatorsForFieldType(selectedField.type) : FILTER_OPERATORS;

  const updateCondition = (updates: Partial<FilterCondition>) => {
    onUpdate({
      conditions: [{ ...condition, ...updates }],
    });
  };

  return (
    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 flex items-center gap-2">
          <select
            value={condition.field}
            onChange={(e) => updateCondition({ field: e.target.value })}
            className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm"
          >
            <option value="">Select field...</option>
            {fields.map(f => (
              <option key={f.name} value={f.name}>{f.label}</option>
            ))}
          </select>

          <select
            value={condition.operator}
            onChange={(e) => updateCondition({ operator: e.target.value })}
            className="px-2 py-1.5 border border-slate-200 rounded text-sm"
          >
            {operators.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={onRemove}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {!['is_null', 'is_not_null'].includes(condition.operator) && (
        <input
          type="text"
          value={condition.value as string || ''}
          onChange={(e) => updateCondition({ value: e.target.value })}
          placeholder="Value..."
          className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
        />
      )}

      <label className="flex items-center gap-2 mt-2 text-xs text-slate-500">
        <input
          type="checkbox"
          checked={block.enabled}
          onChange={(e) => onUpdate({ enabled: e.target.checked })}
          className="rounded border-slate-300"
        />
        Enabled
      </label>
    </div>
  );
}

function StylePanel() {
  const { state, setVisualization } = useBuilder();

  const colorPalettes = [
    { name: 'Default', colors: ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#8b5cf6', '#06b6d4'] },
    { name: 'Ocean', colors: ['#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16'] },
    { name: 'Sunset', colors: ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1'] },
    { name: 'Earth', colors: ['#78716c', '#a8a29e', '#57534e', '#44403c', '#292524', '#1c1917'] },
  ];

  return (
    <div className="p-4 space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Color Palette</label>
        <div className="grid grid-cols-2 gap-2">
          {colorPalettes.map((palette, i) => (
            <button
              key={i}
              onClick={() => setVisualization({ colors: palette.colors })}
              className={`
                p-3 rounded-lg border-2 transition-all
                ${JSON.stringify(state.visualization.colors) === JSON.stringify(palette.colors)
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 hover:border-slate-300'
                }
              `}
            >
              <div className="flex gap-1 mb-1">
                {palette.colors.slice(0, 5).map((color, j) => (
                  <div key={j} className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                ))}
              </div>
              <div className="text-xs text-slate-600">{palette.name}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center justify-between">
          <span className="text-sm text-slate-700">Show Legend</span>
          <button
            onClick={() => setVisualization({ showLegend: !state.visualization.showLegend })}
            className={`
              w-10 h-6 rounded-full transition-colors relative
              ${state.visualization.showLegend ? 'bg-orange-500' : 'bg-slate-300'}
            `}
          >
            <div className={`
              w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform
              ${state.visualization.showLegend ? 'translate-x-4' : 'translate-x-0.5'}
            `} />
          </button>
        </label>

        <label className="flex items-center justify-between">
          <span className="text-sm text-slate-700">Show Labels</span>
          <button
            onClick={() => setVisualization({ showLabels: !state.visualization.showLabels })}
            className={`
              w-10 h-6 rounded-full transition-colors relative
              ${state.visualization.showLabels ? 'bg-orange-500' : 'bg-slate-300'}
            `}
          >
            <div className={`
              w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform
              ${state.visualization.showLabels ? 'translate-x-4' : 'translate-x-0.5'}
            `} />
          </button>
        </label>

        <label className="flex items-center justify-between">
          <span className="text-sm text-slate-700">Show Grid</span>
          <button
            onClick={() => setVisualization({ showGrid: !state.visualization.showGrid })}
            className={`
              w-10 h-6 rounded-full transition-colors relative
              ${state.visualization.showGrid ? 'bg-orange-500' : 'bg-slate-300'}
            `}
          >
            <div className={`
              w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform
              ${state.visualization.showGrid ? 'translate-x-4' : 'translate-x-0.5'}
            `} />
          </button>
        </label>
      </div>
    </div>
  );
}

function DraftRecoveryModal({
  draft,
  onRestore,
  onDiscard
}: {
  draft: VisualBuilderSchema;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  const { loadSchema } = useBuilder();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-amber-100 rounded-lg">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Recover Draft?</h3>
            <p className="text-sm text-slate-500 mt-1">
              Found unsaved: <strong>"{draft.title || 'Untitled'}"</strong>
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onDiscard}
            className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
          >
            Discard
          </button>
          <button
            onClick={() => { loadSchema(draft); onRestore(); }}
            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Restore
          </button>
        </div>
      </div>
    </div>
  );
}

export default UnifiedVisualBuilderPage;
