/**
 * Visual Builder V4
 * 
 * A proper visual widget builder that:
 * 1. Asks WHO the widget is for (Admin/Customer) first
 * 2. Has AI mode that shows AI results directly
 * 3. Has Manual mode with Report Builder-style column picker
 * 4. Uses pre-defined columns from reportColumns.ts (same as SimpleReportBuilder)
 * 5. Actually works
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Wrench,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  GripVertical,
  BarChart3,
  LineChart,
  PieChart,
  Hash,
  Table,
  TrendingUp,
  Package,
  DollarSign,
  MapPin,
  Flag,
  Truck,
  Box,
  Building,
  Shield,
  Users,
  Lock,
  Rocket,
  RefreshCw,
  Download,
  Eye,
  Edit3,
  Calendar,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart as RechartsLine,
  Line,
  PieChart as RechartsPie,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import {
  REPORT_COLUMNS,
  COLUMN_CATEGORIES,
  getColumnsByCategory,
  getColumnById,
  getAggregatableColumns,
  getGroupableColumns,
  ReportColumn,
} from '../../../config/reportColumns';

// =============================================================================
// TYPES
// =============================================================================

type ChartType = 'bar' | 'line' | 'pie' | 'kpi' | 'table' | 'area';
type BuilderMode = 'ai' | 'manual';
type Aggregation = 'sum' | 'avg' | 'count' | 'min' | 'max';

interface WidgetConfig {
  name: string;
  description: string;
  chartType: ChartType;
  groupByColumn: string | null;
  metricColumn: string | null;
  aggregation: Aggregation;
  filters: Array<{ columnId: string; operator: string; value: string }>;
  data: Array<{ label: string; value: number }> | null;
}

interface AIVisualization {
  type: string;
  title: string;
  subtitle?: string;
  data: { data: Array<{ label: string; value: number }> };
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CHART_TYPES: Array<{ type: ChartType; label: string; icon: React.ElementType }> = [
  { type: 'bar', label: 'Bar', icon: BarChart3 },
  { type: 'line', label: 'Line', icon: LineChart },
  { type: 'pie', label: 'Pie', icon: PieChart },
  { type: 'kpi', label: 'KPI', icon: Hash },
  { type: 'table', label: 'Table', icon: Table },
  { type: 'area', label: 'Area', icon: TrendingUp },
];

const AGGREGATIONS: Array<{ value: Aggregation; label: string }> = [
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'count', label: 'Count' },
  { value: 'min', label: 'Min' },
  { value: 'max', label: 'Max' },
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  shipment: Package,
  customer: Building,
  financial: DollarSign,
  origin: MapPin,
  destination: Flag,
  carrier: Truck,
  lineItems: Box,
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

const EXAMPLE_PROMPTS = [
  "Revenue by carrier for the last 30 days",
  "Average cost per shipment by state",
  "Shipment count by mode over time",
  "Cost breakdown by product description",
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function VisualBuilderV4() {
  const navigate = useNavigate();
  const { user, isAdmin, isViewingAsCustomer, effectiveCustomerId, customers } = useAuth();
  const canSeeAdminColumns = isAdmin() && !isViewingAsCustomer;

  // Step 1: Who is this for?
  const [targetScope, setTargetScope] = useState<'admin' | 'customer'>('admin');
  const [targetCustomerId, setTargetCustomerId] = useState<number | null>(null);

  // Mode: AI or Manual
  const [mode, setMode] = useState<BuilderMode>('ai');

  // AI State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{
    visualization: AIVisualization;
    reasoning: Array<{ type: string; content: string; toolName?: string }>;
  } | null>(null);

  // Widget Config (shared between AI and Manual)
  const [config, setConfig] = useState<WidgetConfig>({
    name: '',
    description: '',
    chartType: 'bar',
    groupByColumn: null,
    metricColumn: null,
    aggregation: 'sum',
    filters: [],
    data: null,
  });

  // Manual Mode: expanded categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['financial', 'carrier']));

  // Preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Publish state
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ success: boolean; message: string } | null>(null);

  // Date range for preview
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Visibility
  const [visibility, setVisibility] = useState<'admin_only' | 'all_customers' | 'private'>('admin_only');

  // Get groupable and aggregatable columns
  const groupableColumns = useMemo(() => getGroupableColumns(canSeeAdminColumns), [canSeeAdminColumns]);
  const aggregatableColumns = useMemo(() => getAggregatableColumns(canSeeAdminColumns), [canSeeAdminColumns]);

  // =============================================================================
  // AI MODE FUNCTIONS
  // =============================================================================

  const handleAISubmit = useCallback(async () => {
    if (!aiPrompt.trim() || aiLoading) return;

    setAiLoading(true);
    setAiError(null);
    setAiResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const response = await fetch(`${supabaseUrl}/functions/v1/investigate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          question: `Create a dashboard widget: ${aiPrompt}. Return visualization data.`,
          customerId: targetScope === 'admin' ? '0' : String(targetCustomerId || effectiveCustomerId),
          userId: user?.id,
          conversationHistory: [],
          preferences: { showReasoning: true, forceMode: 'visual' },
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'AI investigation failed');
      }

      if (data.visualizations && data.visualizations.length > 0) {
        const viz = data.visualizations[0];
        setAiResult({
          visualization: viz,
          reasoning: data.reasoning || [],
        });

        // Auto-apply AI results to config
        setConfig(prev => ({
          ...prev,
          name: viz.title || prev.name,
          description: viz.subtitle || aiPrompt,
          chartType: mapAIChartType(viz.type),
          data: viz.data?.data || null,
        }));
      } else {
        throw new Error('AI did not return visualization data');
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI request failed');
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, aiLoading, targetScope, targetCustomerId, effectiveCustomerId, user?.id]);

  const mapAIChartType = (aiType: string): ChartType => {
    const map: Record<string, ChartType> = {
      bar: 'bar',
      line: 'line',
      pie: 'pie',
      stat: 'kpi',
      table: 'table',
      area: 'area',
    };
    return map[aiType] || 'bar';
  };

  // =============================================================================
  // MANUAL MODE FUNCTIONS
  // =============================================================================

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleRunQuery = useCallback(async () => {
    if (!config.groupByColumn || !config.metricColumn) {
      setPreviewError('Select both Group By and Metric columns');
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);

    try {
      const groupCol = getColumnById(config.groupByColumn);
      const metricCol = getColumnById(config.metricColumn);

      if (!groupCol || !metricCol) {
        throw new Error('Invalid column selection');
      }

      // Build the query using the aggregate MCP function
      const { data, error } = await supabase.rpc('mcp_aggregate', {
        p_table_name: 'shipment',
        p_customer_id: targetScope === 'admin' ? 0 : (targetCustomerId || effectiveCustomerId || 0),
        p_is_admin: targetScope === 'admin',
        p_group_by: groupCol.column,
        p_metric: metricCol.column,
        p_aggregation: config.aggregation,
        p_filters: [
          { field: 'pickup_date', operator: 'gte', value: dateRange.start },
          { field: 'pickup_date', operator: 'lte', value: dateRange.end },
        ],
        p_limit: 20,
      });

      if (error) throw error;

      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      const rows = parsed?.data || parsed || [];

      // Transform to chart format
      const chartData = rows.map((row: any) => ({
        label: String(row[groupCol.column] || row.label || 'Unknown'),
        value: Number(row[`${config.aggregation}_${metricCol.column}`] || row.value || 0),
      }));

      setConfig(prev => ({ ...prev, data: chartData }));
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Query failed');
    } finally {
      setPreviewLoading(false);
    }
  }, [config.groupByColumn, config.metricColumn, config.aggregation, targetScope, targetCustomerId, effectiveCustomerId, dateRange]);

  // =============================================================================
  // PUBLISH
  // =============================================================================

  const handlePublish = useCallback(async () => {
    if (!config.name.trim() || !config.data || config.data.length === 0) {
      setPublishResult({ success: false, message: 'Name and data required' });
      return;
    }

    setIsPublishing(true);
    setPublishResult(null);

    try {
      const widgetId = `widget_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const widgetDefinition = {
        id: widgetId,
        name: config.name,
        description: config.description,
        type: config.chartType,
        category: 'custom',
        source: mode === 'ai' ? 'ai' : 'manual',
        createdBy: {
          userId: user?.id,
          userEmail: user?.email,
          isAdmin: isAdmin(),
          timestamp: new Date().toISOString(),
        },
        visibility: { type: visibility },
        dataSource: {
          type: mode === 'ai' ? 'ai_generated' : 'query',
          groupByColumn: config.groupByColumn,
          metricColumn: config.metricColumn,
          aggregation: config.aggregation,
        },
        visualization: {
          type: config.chartType,
          data: config.data,
        },
        createdAt: new Date().toISOString(),
      };

      const storagePath = visibility === 'admin_only'
        ? `admin/${widgetId}.json`
        : `customer/${effectiveCustomerId || 'shared'}/${widgetId}.json`;

      const { error } = await supabase.storage
        .from('custom-widgets')
        .upload(storagePath, JSON.stringify(widgetDefinition, null, 2), {
          contentType: 'application/json',
          upsert: true,
        });

      if (error) throw error;

      setPublishResult({ success: true, message: `Widget "${config.name}" published!` });
    } catch (err) {
      setPublishResult({ success: false, message: err instanceof Error ? err.message : 'Publish failed' });
    } finally {
      setIsPublishing(false);
    }
  }, [config, mode, visibility, user, isAdmin, effectiveCustomerId]);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Visual Widget Builder</h1>
                <p className="text-sm text-slate-500">Create custom dashboard widgets</p>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setMode('ai')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === 'ai' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                AI Mode
              </button>
              <button
                onClick={() => setMode('manual')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
                }`}
              >
                <Wrench className="w-4 h-4" />
                Manual
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Step 1: Target Scope */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Who is this widget for?</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setTargetScope('admin')}
              className={`flex-1 flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                targetScope === 'admin' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <Shield className={`w-6 h-6 ${targetScope === 'admin' ? 'text-blue-600' : 'text-slate-400'}`} />
              <div className="text-left">
                <p className={`font-medium ${targetScope === 'admin' ? 'text-blue-900' : 'text-slate-900'}`}>
                  Admin View
                </p>
                <p className="text-sm text-slate-500">See all customer data</p>
              </div>
            </button>
            <button
              onClick={() => setTargetScope('customer')}
              className={`flex-1 flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                targetScope === 'customer' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <Users className={`w-6 h-6 ${targetScope === 'customer' ? 'text-blue-600' : 'text-slate-400'}`} />
              <div className="text-left">
                <p className={`font-medium ${targetScope === 'customer' ? 'text-blue-900' : 'text-slate-900'}`}>
                  Specific Customer
                </p>
                <p className="text-sm text-slate-500">Build for one customer</p>
              </div>
            </button>
          </div>

          {targetScope === 'customer' && customers && customers.length > 0 && (
            <div className="mt-4">
              <select
                value={targetCustomerId || ''}
                onChange={(e) => setTargetCustomerId(Number(e.target.value) || null)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              >
                <option value="">Select customer...</option>
                {customers.map((c: any) => (
                  <option key={c.customer_id} value={c.customer_id}>
                    {c.customer_name} ({c.customer_id})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Configuration */}
          <div className="space-y-6">
            {mode === 'ai' ? (
              <AIInputSection
                prompt={aiPrompt}
                setPrompt={setAiPrompt}
                loading={aiLoading}
                error={aiError}
                result={aiResult}
                onSubmit={handleAISubmit}
                onEdit={() => setMode('manual')}
              />
            ) : (
              <ManualConfigSection
                config={config}
                setConfig={setConfig}
                expandedCategories={expandedCategories}
                toggleCategory={toggleCategory}
                groupableColumns={groupableColumns}
                aggregatableColumns={aggregatableColumns}
                canSeeAdminColumns={canSeeAdminColumns}
                onRunQuery={handleRunQuery}
                previewLoading={previewLoading}
              />
            )}

            {/* Publish Section */}
            <PublishSection
              config={config}
              setConfig={setConfig}
              visibility={visibility}
              setVisibility={setVisibility}
              onPublish={handlePublish}
              isPublishing={isPublishing}
              publishResult={publishResult}
            />
          </div>

          {/* Right: Preview */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <PreviewSection
              config={config}
              dateRange={dateRange}
              setDateRange={setDateRange}
              loading={previewLoading || aiLoading}
              error={previewError || aiError}
              onRefresh={mode === 'manual' ? handleRunQuery : handleAISubmit}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

// =============================================================================
// AI INPUT SECTION
// =============================================================================

interface AIInputSectionProps {
  prompt: string;
  setPrompt: (p: string) => void;
  loading: boolean;
  error: string | null;
  result: { visualization: AIVisualization; reasoning: any[] } | null;
  onSubmit: () => void;
  onEdit: () => void;
}

function AIInputSection({ prompt, setPrompt, loading, error, result, onSubmit, onEdit }: AIInputSectionProps) {
  const [showReasoning, setShowReasoning] = useState(false);

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Describe Your Widget</h3>
            <p className="text-sm text-slate-600">Tell me what you want to visualize</p>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: Show average shipping cost by carrier for the last month"
            className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
          />
          <button
            onClick={onSubmit}
            disabled={!prompt.trim() || loading}
            className="absolute right-3 bottom-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Examples */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="text-xs text-slate-500">Try:</span>
          {EXAMPLE_PROMPTS.map((ex, i) => (
            <button
              key={i}
              onClick={() => setPrompt(ex)}
              className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-full hover:border-blue-300"
            >
              {ex.length > 35 ? ex.slice(0, 35) + '...' : ex}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            <span className="text-slate-700">AI is analyzing your request...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <h4 className="font-medium text-slate-900">{result.visualization.title}</h4>
                  <p className="text-sm text-slate-500">{result.visualization.subtitle}</p>
                </div>
              </div>
              <button
                onClick={onEdit}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-b border-slate-100">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Chart Type</span>
                <p className="font-medium text-slate-900 capitalize">{result.visualization.type}</p>
              </div>
              <div>
                <span className="text-slate-500">Data Points</span>
                <p className="font-medium text-slate-900">{result.visualization.data?.data?.length || 0}</p>
              </div>
              <div>
                <span className="text-slate-500">Status</span>
                <p className="font-medium text-green-600">Ready</p>
              </div>
            </div>
          </div>

          {/* Reasoning (collapsed by default) */}
          {result.reasoning && result.reasoning.length > 0 && (
            <div className="border-t border-slate-100">
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="w-full px-4 py-2 flex items-center justify-between text-sm text-slate-600 hover:bg-slate-50"
              >
                <span>AI Reasoning ({result.reasoning.length} steps)</span>
                {showReasoning ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {showReasoning && (
                <div className="px-4 pb-4 max-h-60 overflow-y-auto">
                  <div className="space-y-2 text-xs">
                    {result.reasoning.slice(0, 10).map((step, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-slate-400">{i + 1}.</span>
                        <span className="text-slate-600">{step.content?.slice(0, 150)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MANUAL CONFIG SECTION
// =============================================================================

interface ManualConfigSectionProps {
  config: WidgetConfig;
  setConfig: React.Dispatch<React.SetStateAction<WidgetConfig>>;
  expandedCategories: Set<string>;
  toggleCategory: (cat: string) => void;
  groupableColumns: ReportColumn[];
  aggregatableColumns: ReportColumn[];
  canSeeAdminColumns: boolean;
  onRunQuery: () => void;
  previewLoading: boolean;
}

function ManualConfigSection({
  config,
  setConfig,
  expandedCategories,
  toggleCategory,
  groupableColumns,
  aggregatableColumns,
  canSeeAdminColumns,
  onRunQuery,
  previewLoading,
}: ManualConfigSectionProps) {
  // Group columns by category
  const groupableByCategory = useMemo(() => {
    const result: Record<string, ReportColumn[]> = {};
    for (const col of groupableColumns) {
      if (!result[col.category]) result[col.category] = [];
      result[col.category].push(col);
    }
    return result;
  }, [groupableColumns]);

  const aggregatableByCategory = useMemo(() => {
    const result: Record<string, ReportColumn[]> = {};
    for (const col of aggregatableColumns) {
      if (!result[col.category]) result[col.category] = [];
      result[col.category].push(col);
    }
    return result;
  }, [aggregatableColumns]);

  return (
    <div className="space-y-4">
      {/* Chart Type */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-900 mb-3">Chart Type</h3>
        <div className="grid grid-cols-6 gap-2">
          {CHART_TYPES.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => setConfig(prev => ({ ...prev, chartType: type }))}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                config.chartType === type
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-5 h-5 ${config.chartType === type ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className={`text-xs ${config.chartType === type ? 'text-blue-700 font-medium' : 'text-slate-600'}`}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Group By (X-Axis) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-900 mb-3">Group By (X-Axis)</h3>
        <p className="text-sm text-slate-500 mb-3">What do you want to compare?</p>

        <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
          {Object.entries(COLUMN_CATEGORIES).map(([category, { label }]) => {
            const columns = groupableByCategory[category] || [];
            if (columns.length === 0) return null;

            const CategoryIcon = CATEGORY_ICONS[category] || Package;
            const isExpanded = expandedCategories.has(category);

            return (
              <div key={category} className="border-b border-slate-100 last:border-b-0">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <CategoryIcon className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                    <span className="text-xs text-slate-400">({columns.length})</span>
                  </div>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>
                {isExpanded && (
                  <div className="px-3 pb-2 space-y-1">
                    {columns.map((col) => (
                      <button
                        key={col.id}
                        onClick={() => setConfig(prev => ({ ...prev, groupByColumn: col.id }))}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          config.groupByColumn === col.id
                            ? 'bg-blue-100 text-blue-700'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="font-medium">{col.label}</div>
                        {col.description && <div className="text-xs text-slate-500">{col.description}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {config.groupByColumn && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700">
              Selected: <strong>{getColumnById(config.groupByColumn)?.label}</strong>
            </span>
            <button
              onClick={() => setConfig(prev => ({ ...prev, groupByColumn: null }))}
              className="ml-auto text-blue-600 hover:text-blue-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Metric (Y-Axis) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-900 mb-3">Metric (Y-Axis)</h3>
        <p className="text-sm text-slate-500 mb-3">What do you want to measure?</p>

        <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
          {Object.entries(COLUMN_CATEGORIES).map(([category, { label }]) => {
            const columns = aggregatableByCategory[category] || [];
            if (columns.length === 0) return null;

            const CategoryIcon = CATEGORY_ICONS[category] || Package;
            const isExpanded = expandedCategories.has(category);

            return (
              <div key={category} className="border-b border-slate-100 last:border-b-0">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <CategoryIcon className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                    <span className="text-xs text-slate-400">({columns.length})</span>
                  </div>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>
                {isExpanded && (
                  <div className="px-3 pb-2 space-y-1">
                    {columns.map((col) => (
                      <button
                        key={col.id}
                        onClick={() => setConfig(prev => ({ ...prev, metricColumn: col.id }))}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          config.metricColumn === col.id
                            ? 'bg-green-100 text-green-700'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="font-medium">{col.label}</div>
                        {col.description && <div className="text-xs text-slate-500">{col.description}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {config.metricColumn && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">
              Selected: <strong>{getColumnById(config.metricColumn)?.label}</strong>
            </span>
            <button
              onClick={() => setConfig(prev => ({ ...prev, metricColumn: null }))}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Aggregation */}
        {config.metricColumn && (
          <div className="mt-3">
            <label className="text-sm font-medium text-slate-700 mb-2 block">Aggregation</label>
            <div className="flex flex-wrap gap-2">
              {AGGREGATIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setConfig(prev => ({ ...prev, aggregation: value }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    config.aggregation === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Run Query Button */}
      <button
        onClick={onRunQuery}
        disabled={!config.groupByColumn || !config.metricColumn || previewLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed font-medium"
      >
        {previewLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Running Query...
          </>
        ) : (
          <>
            <RefreshCw className="w-5 h-5" />
            Run Query & Preview
          </>
        )}
      </button>
    </div>
  );
}

// =============================================================================
// PREVIEW SECTION
// =============================================================================

interface PreviewSectionProps {
  config: WidgetConfig;
  dateRange: { start: string; end: string };
  setDateRange: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

function PreviewSection({ config, dateRange, setDateRange, loading, error, onRefresh }: PreviewSectionProps) {
  const formatValue = (value: number) => {
    if (config.metricColumn?.includes('cost') || config.metricColumn?.includes('retail') || config.metricColumn?.includes('charge')) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
    }
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Preview</h3>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="px-2 py-1 text-sm border border-slate-200 rounded"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="px-2 py-1 text-sm border border-slate-200 rounded"
          />
          <button onClick={onRefresh} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4 min-h-[350px] flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span>Loading...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 text-red-500">
            <AlertCircle className="w-8 h-8" />
            <span className="text-sm text-center max-w-xs">{error}</span>
          </div>
        ) : !config.data || config.data.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Eye className="w-12 h-12" />
            <span>Configure and run query to see preview</span>
          </div>
        ) : (
          <div className="w-full h-[320px]">
            <ChartRenderer type={config.chartType} data={config.data} formatValue={formatValue} />
          </div>
        )}
      </div>

      {/* Footer */}
      {config.data && config.data.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-sm text-slate-600">
          {config.data.length} data points
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CHART RENDERER
// =============================================================================

interface ChartRendererProps {
  type: ChartType;
  data: Array<{ label: string; value: number }>;
  formatValue: (v: number) => string;
}

function ChartRenderer({ type, data, formatValue }: ChartRendererProps) {
  switch (type) {
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(v) => formatValue(v)} />
            <YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => formatValue(v)} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );

    case 'line':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLine data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => formatValue(v)} />
            <Tooltip formatter={(v: number) => formatValue(v)} />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
          </RechartsLine>
        </ResponsiveContainer>
      );

    case 'area':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => formatValue(v)} />
            <Tooltip formatter={(v: number) => formatValue(v)} />
            <Area type="monotone" dataKey="value" fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" />
          </AreaChart>
        </ResponsiveContainer>
      );

    case 'pie':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPie>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}
              labelLine={{ strokeWidth: 1 }}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => formatValue(v)} />
            <Legend />
          </RechartsPie>
        </ResponsiveContainer>
      );

    case 'kpi':
      const total = data.reduce((s, r) => s + r.value, 0);
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-5xl font-bold text-slate-900">{formatValue(total)}</div>
          <div className="text-lg text-slate-500 mt-2">Total</div>
          <div className="text-sm text-slate-400 mt-1">{data.length} items</div>
        </div>
      );

    case 'table':
      return (
        <div className="overflow-auto max-h-full w-full">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Label</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-sm text-slate-900">{row.label}</td>
                  <td className="px-4 py-2 text-sm text-slate-900 text-right">{formatValue(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      return <div className="text-slate-500">Unknown chart type</div>;
  }
}

// =============================================================================
// PUBLISH SECTION
// =============================================================================

interface PublishSectionProps {
  config: WidgetConfig;
  setConfig: React.Dispatch<React.SetStateAction<WidgetConfig>>;
  visibility: 'admin_only' | 'all_customers' | 'private';
  setVisibility: (v: 'admin_only' | 'all_customers' | 'private') => void;
  onPublish: () => void;
  isPublishing: boolean;
  publishResult: { success: boolean; message: string } | null;
}

function PublishSection({
  config,
  setConfig,
  visibility,
  setVisibility,
  onPublish,
  isPublishing,
  publishResult,
}: PublishSectionProps) {
  const canPublish = config.name.trim() && config.data && config.data.length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
      <h3 className="font-semibold text-slate-900">Publish Widget</h3>

      {/* Name */}
      <div>
        <label className="text-sm font-medium text-slate-700">Widget Name *</label>
        <input
          type="text"
          value={config.name}
          onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Revenue by Carrier"
          className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-medium text-slate-700">Description</label>
        <textarea
          value={config.description}
          onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
          placeholder="What does this widget show?"
          rows={2}
          className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg resize-none"
        />
      </div>

      {/* Visibility */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 block">Visibility</label>
        <div className="space-y-2">
          {[
            { value: 'admin_only' as const, label: 'Admin Only', icon: Shield, desc: 'Only admins can see' },
            { value: 'all_customers' as const, label: 'All Customers', icon: Users, desc: 'Everyone can see' },
            { value: 'private' as const, label: 'Private', icon: Lock, desc: 'Only you can see' },
          ].map(({ value, label, icon: Icon, desc }) => (
            <button
              key={value}
              onClick={() => setVisibility(value)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left ${
                visibility === value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-5 h-5 ${visibility === value ? 'text-blue-600' : 'text-slate-400'}`} />
              <div>
                <p className={`font-medium ${visibility === value ? 'text-blue-900' : 'text-slate-900'}`}>{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Publish Result */}
      {publishResult && (
        <div className={`p-3 rounded-lg ${publishResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center gap-2">
            {publishResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <span className={publishResult.success ? 'text-green-800' : 'text-red-800'}>{publishResult.message}</span>
          </div>
        </div>
      )}

      {/* Publish Button */}
      <button
        onClick={onPublish}
        disabled={!canPublish || isPublishing}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-400 font-semibold"
      >
        {isPublishing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Publishing...
          </>
        ) : (
          <>
            <Rocket className="w-5 h-5" />
            Publish Widget
          </>
        )}
      </button>

      {!canPublish && (
        <p className="text-xs text-slate-500 text-center">
          {!config.name.trim() && 'Enter a name. '}
          {(!config.data || config.data.length === 0) && 'Run query to get data.'}
        </p>
      )}
    </div>
  );
}

export default VisualBuilderV4;
