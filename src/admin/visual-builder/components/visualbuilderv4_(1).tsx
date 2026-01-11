/**
 * Visual Builder V4 - FIXED
 * 
 * Fixes:
 * 1. Shows ALL columns (not just pre-filtered groupable/aggregatable)
 * 2. Search box for filtering columns
 * 3. AI result properly parsed - shows all data points, filters used, fields selected
 * 4. Chart displays actual AI data correctly
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
  X,
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
  Eye,
  Edit3,
  Calendar,
  Search,
  Filter,
  Database,
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
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// =============================================================================
// TYPES
// =============================================================================

type ChartType = 'bar' | 'line' | 'pie' | 'kpi' | 'table' | 'area';
type BuilderMode = 'ai' | 'manual';
type Aggregation = 'sum' | 'avg' | 'count' | 'min' | 'max';

interface Column {
  id: string;
  label: string;
  category: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  description?: string;
}

interface AIConfig {
  title: string;
  xAxis: string;
  yAxis: string;
  aggregation: string;
  filters: Array<{ field: string; operator: string; value: string }>;
  searchTerms: string[];
}

interface WidgetConfig {
  name: string;
  description: string;
  chartType: ChartType;
  groupByColumn: string | null;
  metricColumn: string | null;
  aggregation: Aggregation;
  filters: Array<{ field: string; operator: string; value: string }>;
  data: Array<{ label: string; value: number }> | null;
  aiConfig?: AIConfig;
}

// =============================================================================
// ALL AVAILABLE COLUMNS - Comprehensive list
// =============================================================================

const ALL_COLUMNS: Column[] = [
  // Shipment Info
  { id: 'load_id', label: 'Load ID', category: 'shipment', type: 'number', description: 'Unique shipment identifier' },
  { id: 'reference_number', label: 'Reference Number', category: 'shipment', type: 'string' },
  { id: 'bol_number', label: 'BOL Number', category: 'shipment', type: 'string' },
  { id: 'po_reference', label: 'PO Reference', category: 'shipment', type: 'string' },
  { id: 'status_name', label: 'Status', category: 'shipment', type: 'string', description: 'Current shipment status' },
  { id: 'mode_name', label: 'Mode', category: 'shipment', type: 'string', description: 'Transportation mode (TL, LTL, etc)' },
  { id: 'equipment_name', label: 'Equipment Type', category: 'shipment', type: 'string' },
  { id: 'pickup_date', label: 'Pickup Date', category: 'shipment', type: 'date' },
  { id: 'delivery_date', label: 'Delivery Date', category: 'shipment', type: 'date' },
  { id: 'shipped_date', label: 'Shipped Date', category: 'shipment', type: 'date' },
  { id: 'created_date', label: 'Created Date', category: 'shipment', type: 'date' },
  { id: 'miles', label: 'Miles', category: 'shipment', type: 'number', description: 'Distance in miles' },
  { id: 'weight', label: 'Weight', category: 'shipment', type: 'number', description: 'Total weight' },
  { id: 'number_of_pallets', label: 'Pallets', category: 'shipment', type: 'number' },
  { id: 'linear_feet', label: 'Linear Feet', category: 'shipment', type: 'number' },
  { id: 'is_completed', label: 'Is Completed', category: 'shipment', type: 'boolean' },
  { id: 'is_cancelled', label: 'Is Cancelled', category: 'shipment', type: 'boolean' },
  { id: 'is_late', label: 'Is Late', category: 'shipment', type: 'boolean' },
  
  // Financial
  { id: 'retail', label: 'Retail (Customer Charge)', category: 'financial', type: 'number', description: 'Amount charged to customer' },
  { id: 'cost', label: 'Cost (Carrier Pay)', category: 'financial', type: 'number', description: 'Amount paid to carrier' },
  { id: 'margin', label: 'Margin', category: 'financial', type: 'number', description: 'Profit margin' },
  { id: 'margin_percent', label: 'Margin %', category: 'financial', type: 'number' },
  { id: 'retail_without_tax', label: 'Retail (No Tax)', category: 'financial', type: 'number' },
  { id: 'cost_without_tax', label: 'Cost (No Tax)', category: 'financial', type: 'number' },
  { id: 'fuel_surcharge', label: 'Fuel Surcharge', category: 'financial', type: 'number' },
  { id: 'accessorial_total', label: 'Accessorial Total', category: 'financial', type: 'number' },
  { id: 'linehaul', label: 'Linehaul', category: 'financial', type: 'number' },
  { id: 'shipment_value', label: 'Shipment Value', category: 'financial', type: 'number' },
  { id: 'target_rate', label: 'Target Rate', category: 'financial', type: 'number' },
  
  // Origin
  { id: 'origin_city', label: 'Origin City', category: 'origin', type: 'string' },
  { id: 'origin_state', label: 'Origin State', category: 'origin', type: 'string' },
  { id: 'origin_zip', label: 'Origin ZIP', category: 'origin', type: 'string' },
  { id: 'origin_country', label: 'Origin Country', category: 'origin', type: 'string' },
  { id: 'origin_name', label: 'Origin Name', category: 'origin', type: 'string' },
  { id: 'shipper_name', label: 'Shipper Name', category: 'origin', type: 'string' },
  
  // Destination
  { id: 'dest_city', label: 'Destination City', category: 'destination', type: 'string' },
  { id: 'dest_state', label: 'Destination State', category: 'destination', type: 'string' },
  { id: 'dest_zip', label: 'Destination ZIP', category: 'destination', type: 'string' },
  { id: 'dest_country', label: 'Destination Country', category: 'destination', type: 'string' },
  { id: 'dest_name', label: 'Destination Name', category: 'destination', type: 'string' },
  { id: 'consignee_name', label: 'Consignee Name', category: 'destination', type: 'string' },
  
  // Carrier
  { id: 'carrier_name', label: 'Carrier Name', category: 'carrier', type: 'string', description: 'Carrier/trucking company' },
  { id: 'carrier_code', label: 'Carrier Code', category: 'carrier', type: 'string' },
  { id: 'scac', label: 'SCAC Code', category: 'carrier', type: 'string' },
  { id: 'carrier_pro', label: 'Carrier PRO', category: 'carrier', type: 'string' },
  { id: 'carrier_type', label: 'Carrier Type', category: 'carrier', type: 'string' },
  { id: 'service_type', label: 'Service Type', category: 'carrier', type: 'string' },
  
  // Line Items / Products
  { id: 'item_description', label: 'Item Description', category: 'products', type: 'string', description: 'Product/commodity description' },
  { id: 'item_descriptions', label: 'All Item Descriptions', category: 'products', type: 'string' },
  { id: 'commodity', label: 'Commodity', category: 'products', type: 'string' },
  { id: 'freight_class', label: 'Freight Class', category: 'products', type: 'string' },
  { id: 'nmfc_code', label: 'NMFC Code', category: 'products', type: 'string' },
  { id: 'sku', label: 'SKU', category: 'products', type: 'string' },
  { id: 'item_number', label: 'Item Number', category: 'products', type: 'string' },
  { id: 'package_type', label: 'Package Type', category: 'products', type: 'string' },
  { id: 'item_weight', label: 'Item Weight', category: 'products', type: 'number' },
  { id: 'item_quantity', label: 'Item Quantity', category: 'products', type: 'number' },
  { id: 'item_count', label: 'Item Count', category: 'products', type: 'number' },
  { id: 'total_quantity', label: 'Total Quantity', category: 'products', type: 'number' },
  { id: 'declared_value', label: 'Declared Value', category: 'products', type: 'number' },
  { id: 'has_hazmat', label: 'Has Hazmat', category: 'products', type: 'boolean' },
  
  // Customer
  { id: 'customer_id', label: 'Customer ID', category: 'customer', type: 'number' },
  { id: 'customer_name', label: 'Customer Name', category: 'customer', type: 'string' },
  { id: 'client_id', label: 'Client ID', category: 'customer', type: 'number' },
  
  // Time-based groupings (computed)
  { id: 'pickup_month', label: 'Pickup Month', category: 'time', type: 'string', description: 'Month of pickup (YYYY-MM)' },
  { id: 'pickup_week', label: 'Pickup Week', category: 'time', type: 'string', description: 'Week of pickup' },
  { id: 'pickup_year', label: 'Pickup Year', category: 'time', type: 'number' },
  { id: 'pickup_quarter', label: 'Pickup Quarter', category: 'time', type: 'string' },
  { id: 'day_of_week', label: 'Day of Week', category: 'time', type: 'string' },
];

const CATEGORIES: Record<string, { label: string; icon: React.ElementType }> = {
  shipment: { label: 'Shipment Info', icon: Package },
  financial: { label: 'Financial', icon: DollarSign },
  origin: { label: 'Origin', icon: MapPin },
  destination: { label: 'Destination', icon: Flag },
  carrier: { label: 'Carrier', icon: Truck },
  products: { label: 'Products / Line Items', icon: Box },
  customer: { label: 'Customer', icon: Building },
  time: { label: 'Time Periods', icon: Calendar },
};

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

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

const EXAMPLE_PROMPTS = [
  "Revenue by carrier for the last 30 days",
  "Average cost per shipment by state",
  "Shipment count by mode over time",
  "Cost breakdown for drawer, cargoglide, toolbox products",
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function VisualBuilderV4() {
  const navigate = useNavigate();
  const { user, isAdmin, isViewingAsCustomer, effectiveCustomerId, customers } = useAuth();

  // Step 1: Who is this for?
  const [targetScope, setTargetScope] = useState<'admin' | 'customer'>('admin');
  const [targetCustomerId, setTargetCustomerId] = useState<number | null>(null);

  // Mode: AI or Manual
  const [mode, setMode] = useState<BuilderMode>('ai');

  // AI State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiReasoning, setAiReasoning] = useState<Array<{ type: string; content: string; toolName?: string }>>([]);

  // Widget Config
  const [config, setConfig] = useState<WidgetConfig>({
    name: '',
    description: '',
    chartType: 'bar',
    groupByColumn: null,
    metricColumn: null,
    aggregation: 'sum',
    filters: [],
    data: null,
    aiConfig: undefined,
  });

  // Preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Publish state
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ success: boolean; message: string } | null>(null);

  // Date range
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Visibility
  const [visibility, setVisibility] = useState<'admin_only' | 'all_customers' | 'private'>('admin_only');

  // =============================================================================
  // AI MODE
  // =============================================================================

  const handleAISubmit = useCallback(async () => {
    if (!aiPrompt.trim() || aiLoading) return;

    setAiLoading(true);
    setAiError(null);
    setAiReasoning([]);
    setConfig(prev => ({ ...prev, data: null, aiConfig: undefined }));

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
          question: `Create a dashboard widget: ${aiPrompt}. Return visualization data with all data points.`,
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

      // Store reasoning
      setAiReasoning(data.reasoning || []);

      // Parse the visualization
      if (data.visualizations && data.visualizations.length > 0) {
        const viz = data.visualizations[0];
        const vizData = viz.data?.data || [];
        
        // Extract AI config from reasoning
        const aiConfig = parseAIConfig(data.reasoning || [], viz);

        setConfig(prev => ({
          ...prev,
          name: viz.title || '',
          description: viz.subtitle || aiPrompt,
          chartType: mapAIChartType(viz.type),
          data: vizData,
          aiConfig,
        }));
      } else {
        throw new Error('AI did not return visualization data. Try rephrasing your question.');
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI request failed');
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, aiLoading, targetScope, targetCustomerId, effectiveCustomerId, user?.id]);

  // Parse AI config from reasoning steps
  const parseAIConfig = (reasoning: Array<{ type: string; content: string; toolName?: string }>, viz: any): AIConfig => {
    const config: AIConfig = {
      title: viz.title || '',
      xAxis: viz.config?.groupBy || '',
      yAxis: viz.config?.metric || '',
      aggregation: '',
      filters: [],
      searchTerms: [],
    };

    // Extract info from tool calls
    for (const step of reasoning) {
      if (step.type === 'tool_call' && step.toolName === 'search_text') {
        // Extract search terms
        try {
          const match = step.content.match(/search_text.*?"([^"]+)"/);
          if (match) config.searchTerms.push(match[1]);
        } catch {}
      }
      
      if (step.type === 'tool_result' && step.content) {
        // Try to extract filters from query results
        try {
          const content = step.content;
          if (content.includes('ILIKE') || content.includes('ilike')) {
            const ilikeMatches = content.match(/(\w+)\s+ILIKE\s+'([^']+)'/gi);
            if (ilikeMatches) {
              ilikeMatches.forEach(match => {
                const parts = match.match(/(\w+)\s+ILIKE\s+'([^']+)'/i);
                if (parts) {
                  config.filters.push({ field: parts[1], operator: 'ilike', value: parts[2] });
                }
              });
            }
          }
          // Extract aggregation
          if (content.includes('avg(')) config.aggregation = 'avg';
          else if (content.includes('sum(')) config.aggregation = 'sum';
          else if (content.includes('count(')) config.aggregation = 'count';
          
          // Extract group by
          if (content.includes('group_by')) {
            const gbMatch = content.match(/group_by['":\s]+(\w+)/);
            if (gbMatch) config.xAxis = gbMatch[1];
          }
        } catch {}
      }
    }

    return config;
  };

  const mapAIChartType = (aiType: string): ChartType => {
    const map: Record<string, ChartType> = {
      bar: 'bar', line: 'line', pie: 'pie', stat: 'kpi', table: 'table', area: 'area',
    };
    return map[aiType] || 'bar';
  };

  // =============================================================================
  // MANUAL MODE
  // =============================================================================

  const handleRunQuery = useCallback(async () => {
    if (!config.groupByColumn || !config.metricColumn) {
      setPreviewError('Select both Group By and Metric columns');
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);

    try {
      const { data, error } = await supabase.rpc('mcp_aggregate', {
        p_table_name: 'shipment',
        p_customer_id: targetScope === 'admin' ? 0 : (targetCustomerId || effectiveCustomerId || 0),
        p_is_admin: targetScope === 'admin',
        p_group_by: config.groupByColumn,
        p_metric: config.metricColumn,
        p_aggregation: config.aggregation,
        p_filters: [
          { field: 'pickup_date', operator: 'gte', value: dateRange.start },
          { field: 'pickup_date', operator: 'lte', value: dateRange.end },
        ],
        p_limit: 25,
      });

      if (error) throw error;

      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      const rows = parsed?.data || parsed || [];

      // Transform to chart format
      const chartData = rows.map((row: any) => {
        const labelKey = Object.keys(row).find(k => typeof row[k] === 'string') || config.groupByColumn;
        const valueKey = Object.keys(row).find(k => k.includes(config.aggregation!) || typeof row[k] === 'number' && k !== labelKey);
        return {
          label: String(row[labelKey!] || 'Unknown'),
          value: Number(row[valueKey!] || row.value || 0),
        };
      });

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
          aiConfig: config.aiConfig,
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
        <TargetScopeSelector
          targetScope={targetScope}
          setTargetScope={setTargetScope}
          targetCustomerId={targetCustomerId}
          setTargetCustomerId={setTargetCustomerId}
          customers={customers}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Left: Configuration */}
          <div className="space-y-6">
            {mode === 'ai' ? (
              <AIInputSection
                prompt={aiPrompt}
                setPrompt={setAiPrompt}
                loading={aiLoading}
                error={aiError}
                reasoning={aiReasoning}
                config={config}
                onSubmit={handleAISubmit}
                onEdit={() => setMode('manual')}
              />
            ) : (
              <ManualConfigSection
                config={config}
                setConfig={setConfig}
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
// TARGET SCOPE SELECTOR
// =============================================================================

function TargetScopeSelector({
  targetScope,
  setTargetScope,
  targetCustomerId,
  setTargetCustomerId,
  customers,
}: {
  targetScope: 'admin' | 'customer';
  setTargetScope: (s: 'admin' | 'customer') => void;
  targetCustomerId: number | null;
  setTargetCustomerId: (id: number | null) => void;
  customers: any[] | null;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="text-base font-semibold text-slate-900 mb-3">Who is this widget for?</h2>
      <div className="flex gap-3">
        <button
          onClick={() => setTargetScope('admin')}
          className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
            targetScope === 'admin' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <Shield className={`w-5 h-5 ${targetScope === 'admin' ? 'text-blue-600' : 'text-slate-400'}`} />
          <div className="text-left">
            <p className={`font-medium text-sm ${targetScope === 'admin' ? 'text-blue-900' : 'text-slate-900'}`}>
              Admin View (All Data)
            </p>
          </div>
        </button>
        <button
          onClick={() => setTargetScope('customer')}
          className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
            targetScope === 'customer' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <Users className={`w-5 h-5 ${targetScope === 'customer' ? 'text-blue-600' : 'text-slate-400'}`} />
          <div className="text-left">
            <p className={`font-medium text-sm ${targetScope === 'customer' ? 'text-blue-900' : 'text-slate-900'}`}>
              Specific Customer
            </p>
          </div>
        </button>
      </div>

      {targetScope === 'customer' && customers && customers.length > 0 && (
        <select
          value={targetCustomerId || ''}
          onChange={(e) => setTargetCustomerId(Number(e.target.value) || null)}
          className="w-full mt-3 px-3 py-2 border border-slate-200 rounded-lg text-sm"
        >
          <option value="">Select customer...</option>
          {customers.map((c: any) => (
            <option key={c.customer_id} value={c.customer_id}>
              {c.customer_name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

// =============================================================================
// AI INPUT SECTION - FIXED
// =============================================================================

function AIInputSection({
  prompt,
  setPrompt,
  loading,
  error,
  reasoning,
  config,
  onSubmit,
  onEdit,
}: {
  prompt: string;
  setPrompt: (p: string) => void;
  loading: boolean;
  error: string | null;
  reasoning: Array<{ type: string; content: string; toolName?: string }>;
  config: WidgetConfig;
  onSubmit: () => void;
  onEdit: () => void;
}) {
  const [showReasoning, setShowReasoning] = useState(false);

  const hasData = config.data && config.data.length > 0;

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-5 border border-blue-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Describe Your Widget</h3>
            <p className="text-xs text-slate-600">Tell me what you want to visualize</p>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: Show average cost by product for drawer system, cargoglide, and toolbox"
            className="w-full px-3 py-2 pr-12 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none text-sm"
            rows={2}
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
            className="absolute right-2 bottom-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Examples */}
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="text-xs text-slate-500">Try:</span>
          {EXAMPLE_PROMPTS.map((ex, i) => (
            <button
              key={i}
              onClick={() => setPrompt(ex)}
              className="px-2 py-0.5 text-xs bg-white border border-slate-200 rounded-full hover:border-blue-300"
            >
              {ex.length > 30 ? ex.slice(0, 30) + '...' : ex}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            <span className="text-slate-700 text-sm">AI is analyzing your request...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-medium text-red-900 text-sm">Error</p>
              <p className="text-xs text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Result - FIXED to show actual data */}
      {hasData && !loading && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 bg-green-50">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <h4 className="font-semibold text-slate-900">{config.name || 'Widget Generated'}</h4>
                  <p className="text-sm text-slate-600">{config.data?.length} data points found</p>
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

          {/* AI Configuration Details */}
          {config.aiConfig && (
            <div className="p-4 border-b border-slate-100">
              <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Configuration Used</h5>
              <div className="space-y-2 text-sm">
                {config.aiConfig.xAxis && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">X-Axis:</span>
                    <span className="font-medium text-slate-900">{formatFieldName(config.aiConfig.xAxis)}</span>
                  </div>
                )}
                {config.aiConfig.yAxis && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Y-Axis:</span>
                    <span className="font-medium text-slate-900">
                      {config.aiConfig.aggregation && `${config.aiConfig.aggregation.toUpperCase()} of `}
                      {formatFieldName(config.aiConfig.yAxis)}
                    </span>
                  </div>
                )}
                {config.aiConfig.searchTerms.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-slate-500">Searched:</span>
                    <div className="flex flex-wrap gap-1">
                      {config.aiConfig.searchTerms.map((term, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          "{term}"
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {config.aiConfig.filters.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-slate-500">Filters:</span>
                    <div className="space-y-1">
                      {config.aiConfig.filters.map((f, i) => (
                        <div key={i} className="text-xs bg-slate-100 px-2 py-1 rounded">
                          {f.field} {f.operator} {f.value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Data Summary */}
          <div className="p-4 border-b border-slate-100">
            <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Data Found</h5>
            <div className="space-y-1">
              {config.data?.slice(0, 5).map((row, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{row.label}</span>
                  <span className="font-medium text-slate-900">{formatCurrency(row.value)}</span>
                </div>
              ))}
              {config.data && config.data.length > 5 && (
                <div className="text-xs text-slate-500 pt-1">
                  + {config.data.length - 5} more...
                </div>
              )}
            </div>
          </div>

          {/* Reasoning (collapsed) */}
          {reasoning.length > 0 && (
            <div>
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="w-full px-4 py-2 flex items-center justify-between text-xs text-slate-600 hover:bg-slate-50"
              >
                <span>AI Reasoning ({reasoning.length} steps)</span>
                {showReasoning ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {showReasoning && (
                <div className="px-4 pb-4 max-h-48 overflow-y-auto">
                  <div className="space-y-1 text-xs font-mono">
                    {reasoning.map((step, i) => (
                      <div key={i} className="flex gap-2 py-1 border-b border-slate-50">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          step.type === 'tool_call' ? 'bg-orange-100 text-orange-700' :
                          step.type === 'tool_result' ? 'bg-green-100 text-green-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {step.toolName || step.type}
                        </span>
                        <span className="text-slate-600 truncate">{step.content?.slice(0, 100)}</span>
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
// MANUAL CONFIG SECTION - WITH SEARCH
// =============================================================================

function ManualConfigSection({
  config,
  setConfig,
  onRunQuery,
  previewLoading,
}: {
  config: WidgetConfig;
  setConfig: React.Dispatch<React.SetStateAction<WidgetConfig>>;
  onRunQuery: () => void;
  previewLoading: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Chart Type */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-900 text-sm mb-3">Chart Type</h3>
        <div className="grid grid-cols-6 gap-2">
          {CHART_TYPES.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => setConfig(prev => ({ ...prev, chartType: type }))}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${
                config.chartType === type
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${config.chartType === type ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className={`text-xs ${config.chartType === type ? 'text-blue-700 font-medium' : 'text-slate-600'}`}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Group By (X-Axis) */}
      <ColumnPicker
        title="Group By (X-Axis)"
        subtitle="What do you want to compare?"
        selectedColumn={config.groupByColumn}
        onSelect={(col) => setConfig(prev => ({ ...prev, groupByColumn: col }))}
        color="blue"
      />

      {/* Metric (Y-Axis) */}
      <ColumnPicker
        title="Metric (Y-Axis)"
        subtitle="What do you want to measure?"
        selectedColumn={config.metricColumn}
        onSelect={(col) => setConfig(prev => ({ ...prev, metricColumn: col }))}
        color="green"
        filterNumeric
      />

      {/* Aggregation */}
      {config.metricColumn && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900 text-sm mb-3">Aggregation</h3>
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
// COLUMN PICKER - WITH SEARCH
// =============================================================================

function ColumnPicker({
  title,
  subtitle,
  selectedColumn,
  onSelect,
  color,
  filterNumeric,
}: {
  title: string;
  subtitle: string;
  selectedColumn: string | null;
  onSelect: (col: string | null) => void;
  color: 'blue' | 'green';
  filterNumeric?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Filter columns
  const filteredColumns = useMemo(() => {
    let cols = ALL_COLUMNS;
    if (filterNumeric) {
      cols = cols.filter(c => c.type === 'number');
    }
    if (search) {
      const s = search.toLowerCase();
      cols = cols.filter(c => 
        c.label.toLowerCase().includes(s) || 
        c.id.toLowerCase().includes(s) ||
        c.description?.toLowerCase().includes(s) ||
        c.category.toLowerCase().includes(s)
      );
    }
    return cols;
  }, [search, filterNumeric]);

  // Group by category
  const byCategory = useMemo(() => {
    const result: Record<string, Column[]> = {};
    for (const col of filteredColumns) {
      if (!result[col.category]) result[col.category] = [];
      result[col.category].push(col);
    }
    return result;
  }, [filteredColumns]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const selectedCol = ALL_COLUMNS.find(c => c.id === selectedColumn);
  const bgColor = color === 'blue' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200';
  const textColor = color === 'blue' ? 'text-blue-700' : 'text-green-700';
  const selectBg = color === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
      <p className="text-xs text-slate-500 mb-3">{subtitle}</p>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search columns..."
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Selected */}
      {selectedCol && (
        <div className={`flex items-center justify-between px-3 py-2 rounded-lg border mb-3 ${bgColor}`}>
          <div className="flex items-center gap-2">
            <CheckCircle className={`w-4 h-4 ${textColor}`} />
            <span className={`text-sm font-medium ${textColor}`}>{selectedCol.label}</span>
          </div>
          <button onClick={() => onSelect(null)} className={`${textColor} hover:opacity-70`}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Column List */}
      <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
        {Object.entries(CATEGORIES).map(([catKey, { label, icon: Icon }]) => {
          const columns = byCategory[catKey] || [];
          if (columns.length === 0) return null;

          const isExpanded = expandedCategories.has(catKey) || search.length > 0;

          return (
            <div key={catKey} className="border-b border-slate-100 last:border-b-0">
              <button
                onClick={() => toggleCategory(catKey)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                  <span className="text-xs text-slate-400 bg-slate-100 px-1.5 rounded">{columns.length}</span>
                </div>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>
              {isExpanded && (
                <div className="px-2 pb-2 space-y-0.5">
                  {columns.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => onSelect(col.id)}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                        selectedColumn === col.id ? selectBg : 'hover:bg-slate-100 text-slate-700'
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
        
        {filteredColumns.length === 0 && (
          <div className="p-4 text-center text-sm text-slate-500">
            No columns match "{search}"
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// PREVIEW SECTION
// =============================================================================

function PreviewSection({
  config,
  dateRange,
  setDateRange,
  loading,
  error,
  onRefresh,
}: {
  config: WidgetConfig;
  dateRange: { start: string; end: string };
  setDateRange: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 text-sm">Preview</h3>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="px-2 py-1 text-xs border border-slate-200 rounded"
          />
          <span className="text-slate-400 text-xs">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="px-2 py-1 text-xs border border-slate-200 rounded"
          />
          <button onClick={onRefresh} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4 min-h-[320px] flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 text-red-500">
            <AlertCircle className="w-8 h-8" />
            <span className="text-sm text-center max-w-xs">{error}</span>
          </div>
        ) : !config.data || config.data.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Eye className="w-10 h-10" />
            <span className="text-sm">Configure and run query to see preview</span>
          </div>
        ) : (
          <div className="w-full h-[300px]">
            <ChartRenderer type={config.chartType} data={config.data} />
          </div>
        )}
      </div>

      {/* Footer */}
      {config.data && config.data.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-600">
          {config.data.length} data points
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CHART RENDERER
// =============================================================================

function ChartRenderer({ type, data }: { type: ChartType; data: Array<{ label: string; value: number }> }) {
  const formatValue = (value: number) => formatCurrency(value);

  switch (type) {
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 100, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={formatValue} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 11 }} />
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
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={formatValue} tick={{ fontSize: 11 }} />
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
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={formatValue} tick={{ fontSize: 11 }} />
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
              outerRadius={90}
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
          <div className="text-4xl font-bold text-slate-900">{formatValue(total)}</div>
          <div className="text-base text-slate-500 mt-2">Total</div>
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
                  <td className="px-4 py-2 text-sm text-slate-900 text-right font-medium">{formatValue(row.value)}</td>
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

function PublishSection({
  config,
  setConfig,
  visibility,
  setVisibility,
  onPublish,
  isPublishing,
  publishResult,
}: {
  config: WidgetConfig;
  setConfig: React.Dispatch<React.SetStateAction<WidgetConfig>>;
  visibility: 'admin_only' | 'all_customers' | 'private';
  setVisibility: (v: 'admin_only' | 'all_customers' | 'private') => void;
  onPublish: () => void;
  isPublishing: boolean;
  publishResult: { success: boolean; message: string } | null;
}) {
  const canPublish = config.name.trim() && config.data && config.data.length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
      <h3 className="font-semibold text-slate-900 text-sm">Publish Widget</h3>

      {/* Name */}
      <div>
        <label className="text-xs font-medium text-slate-700">Widget Name *</label>
        <input
          type="text"
          value={config.name}
          onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Revenue by Carrier"
          className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-medium text-slate-700">Description</label>
        <textarea
          value={config.description}
          onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
          placeholder="What does this widget show?"
          rows={2}
          className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg resize-none text-sm"
        />
      </div>

      {/* Visibility */}
      <div>
        <label className="text-xs font-medium text-slate-700 mb-2 block">Visibility</label>
        <div className="space-y-2">
          {[
            { value: 'admin_only' as const, label: 'Admin Only', icon: Shield },
            { value: 'all_customers' as const, label: 'All Customers', icon: Users },
            { value: 'private' as const, label: 'Private', icon: Lock },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setVisibility(value)}
              className={`w-full flex items-center gap-2 p-2 rounded-lg border text-left text-sm ${
                visibility === value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${visibility === value ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className={visibility === value ? 'text-blue-900 font-medium' : 'text-slate-700'}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Publish Result */}
      {publishResult && (
        <div className={`p-3 rounded-lg text-sm ${publishResult.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          {publishResult.message}
        </div>
      )}

      {/* Publish Button */}
      <button
        onClick={onPublish}
        disabled={!canPublish || isPublishing}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-400 font-semibold text-sm"
      >
        {isPublishing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Publishing...
          </>
        ) : (
          <>
            <Rocket className="w-4 h-4" />
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

// =============================================================================
// HELPERS
// =============================================================================

function formatFieldName(name: string): string {
  if (!name) return '';
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 1, notation: 'compact' }).format(value);
  }
  if (value >= 1000) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
}

export default VisualBuilderV4;
