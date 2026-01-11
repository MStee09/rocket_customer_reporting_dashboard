/**
 * Visual Builder V6 - UNIFIED EDIT EXPERIENCE
 * 
 * Features:
 * 1. Unified edit panel - AI results are immediately editable
 * 2. Raw data access with drill-down and export
 * 3. More chart types: Map, Treemap, Funnel, Waterfall, Combo
 * 4. Recommended charts based on data analysis
 * 5. Full transparency on X/Y axis and filters
 * 6. Security: Admin-only columns protected
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
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
  Calendar,
  Search,
  AlertTriangle,
  Download,
  Eye,
  Edit3,
  Lightbulb,
  Map,
  GitBranch,
  Filter,
  Plus,
  Trash2,
  ExternalLink,
  Database,
  Layers,
  Grid3X3,
  Activity,
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
  Treemap,
  FunnelChart,
  Funnel,
  LabelList,
  ComposedChart,
} from 'recharts';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

// =============================================================================
// TYPES
// =============================================================================

type ChartType = 'bar' | 'line' | 'pie' | 'kpi' | 'table' | 'area' | 'treemap' | 'funnel' | 'map' | 'combo';
type Aggregation = 'sum' | 'avg' | 'count' | 'min' | 'max';

interface Column {
  id: string;
  label: string;
  category: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  description?: string;
  adminOnly?: boolean;
}

interface FilterConfig {
  id: string;
  field: string;
  operator: 'contains' | 'equals' | 'gt' | 'lt' | 'gte' | 'lte' | 'between';
  value: string;
  value2?: string; // For between
}

interface DataPoint {
  label: string;
  value: number;
  count?: number;
  rawRecords?: any[];
}

interface WidgetConfig {
  name: string;
  description: string;
  chartType: ChartType;
  xAxis: string | null;
  xAxisLabel: string;
  yAxis: string | null;
  yAxisLabel: string;
  aggregation: Aggregation;
  filters: FilterConfig[];
  data: DataPoint[] | null;
  totalRecords: number;
  queryUsed?: string;
}

// =============================================================================
// COLUMN DEFINITIONS WITH SECURITY
// =============================================================================

const ALL_COLUMNS: Column[] = [
  // Shipment Info
  { id: 'load_id', label: 'Load ID', category: 'shipment', type: 'number', description: 'Unique shipment identifier' },
  { id: 'reference_number', label: 'Reference Number', category: 'shipment', type: 'string' },
  { id: 'bol_number', label: 'BOL Number', category: 'shipment', type: 'string' },
  { id: 'pro_number', label: 'PRO Number', category: 'shipment', type: 'string' },
  { id: 'status_name', label: 'Status', category: 'shipment', type: 'string' },
  { id: 'mode_name', label: 'Mode', category: 'shipment', type: 'string', description: 'LTL, TL, Parcel' },
  { id: 'equipment_name', label: 'Equipment Type', category: 'shipment', type: 'string' },
  { id: 'service_type', label: 'Service Type', category: 'shipment', type: 'string' },
  { id: 'pickup_date', label: 'Pickup Date', category: 'shipment', type: 'date' },
  { id: 'delivery_date', label: 'Delivery Date', category: 'shipment', type: 'date' },
  { id: 'miles', label: 'Miles', category: 'shipment', type: 'number' },
  { id: 'weight', label: 'Weight (lbs)', category: 'shipment', type: 'number' },
  { id: 'number_of_pallets', label: 'Pallets', category: 'shipment', type: 'number' },

  // Financial - Customer visible
  { id: 'retail', label: 'Retail (Your Charge)', category: 'financial', type: 'number', description: 'Amount charged' },
  { id: 'fuel_surcharge', label: 'Fuel Surcharge', category: 'financial', type: 'number' },
  { id: 'accessorial_total', label: 'Accessorials', category: 'financial', type: 'number' },

  // Financial - Admin only
  { id: 'cost', label: 'Cost (Carrier Pay)', category: 'financial', type: 'number', adminOnly: true },
  { id: 'margin', label: 'Margin ($)', category: 'financial', type: 'number', adminOnly: true },
  { id: 'margin_percent', label: 'Margin (%)', category: 'financial', type: 'number', adminOnly: true },
  { id: 'linehaul', label: 'Linehaul', category: 'financial', type: 'number', adminOnly: true },
  { id: 'carrier_total', label: 'Carrier Total', category: 'financial', type: 'number', adminOnly: true },

  // Origin
  { id: 'origin_city', label: 'Origin City', category: 'origin', type: 'string' },
  { id: 'origin_state', label: 'Origin State', category: 'origin', type: 'string' },
  { id: 'origin_zip', label: 'Origin ZIP', category: 'origin', type: 'string' },
  { id: 'shipper_name', label: 'Shipper', category: 'origin', type: 'string' },

  // Destination
  { id: 'dest_city', label: 'Destination City', category: 'destination', type: 'string' },
  { id: 'dest_state', label: 'Destination State', category: 'destination', type: 'string' },
  { id: 'dest_zip', label: 'Destination ZIP', category: 'destination', type: 'string' },
  { id: 'consignee_name', label: 'Consignee', category: 'destination', type: 'string' },

  // Carrier
  { id: 'carrier_name', label: 'Carrier Name', category: 'carrier', type: 'string' },
  { id: 'carrier_code', label: 'Carrier Code', category: 'carrier', type: 'string' },
  { id: 'scac', label: 'SCAC', category: 'carrier', type: 'string' },

  // Products
  { id: 'item_description', label: 'Product Description', category: 'products', type: 'string' },
  { id: 'item_descriptions', label: 'All Products', category: 'products', type: 'string' },
  { id: 'commodity', label: 'Commodity', category: 'products', type: 'string' },
  { id: 'freight_class', label: 'Freight Class', category: 'products', type: 'string' },
  { id: 'sku', label: 'SKU', category: 'products', type: 'string' },
  { id: 'item_weight', label: 'Item Weight', category: 'products', type: 'number' },
  { id: 'item_count', label: 'Item Count', category: 'products', type: 'number' },

  // Customer
  { id: 'customer_name', label: 'Customer Name', category: 'customer', type: 'string' },
  { id: 'customer_id', label: 'Customer ID', category: 'customer', type: 'number' },

  // Time
  { id: 'pickup_month', label: 'Pickup Month', category: 'time', type: 'string' },
  { id: 'pickup_week', label: 'Pickup Week', category: 'time', type: 'string' },
  { id: 'pickup_year', label: 'Pickup Year', category: 'time', type: 'number' },
  { id: 'day_of_week', label: 'Day of Week', category: 'time', type: 'string' },
];

const ADMIN_ONLY_COLUMNS = new Set(ALL_COLUMNS.filter(c => c.adminOnly).map(c => c.id));

const CATEGORIES: Record<string, { label: string; icon: React.ElementType }> = {
  shipment: { label: 'Shipment', icon: Package },
  financial: { label: 'Financial', icon: DollarSign },
  origin: { label: 'Origin', icon: MapPin },
  destination: { label: 'Destination', icon: Flag },
  carrier: { label: 'Carrier', icon: Truck },
  products: { label: 'Products', icon: Box },
  customer: { label: 'Customer', icon: Building },
  time: { label: 'Time', icon: Calendar },
};

// Chart types with more options
const CHART_TYPES: Array<{ type: ChartType; label: string; icon: React.ElementType; description: string }> = [
  { type: 'bar', label: 'Bar', icon: BarChart3, description: 'Compare values across categories' },
  { type: 'line', label: 'Line', icon: LineChart, description: 'Show trends over time' },
  { type: 'area', label: 'Area', icon: TrendingUp, description: 'Show cumulative trends' },
  { type: 'pie', label: 'Pie', icon: PieChart, description: 'Show proportions of a whole' },
  { type: 'treemap', label: 'Treemap', icon: Grid3X3, description: 'Hierarchical data as nested rectangles' },
  { type: 'funnel', label: 'Funnel', icon: GitBranch, description: 'Show stages in a process' },
  { type: 'kpi', label: 'KPI', icon: Hash, description: 'Single important number' },
  { type: 'table', label: 'Table', icon: Table, description: 'Detailed data view' },
  { type: 'map', label: 'Map', icon: Map, description: 'Geographic distribution' },
  { type: 'combo', label: 'Combo', icon: Activity, description: 'Bar + Line together' },
];

const AGGREGATIONS: Array<{ value: Aggregation; label: string; symbol: string }> = [
  { value: 'sum', label: 'Sum', symbol: 'Σ' },
  { value: 'avg', label: 'Average', symbol: 'x̄' },
  { value: 'count', label: 'Count', symbol: '#' },
  { value: 'min', label: 'Min', symbol: '↓' },
  { value: 'max', label: 'Max', symbol: '↑' },
];

const FILTER_OPERATORS = [
  { value: 'contains', label: 'Contains' },
  { value: 'equals', label: 'Equals' },
  { value: 'gt', label: 'Greater than' },
  { value: 'lt', label: 'Less than' },
  { value: 'gte', label: 'Greater or equal' },
  { value: 'lte', label: 'Less or equal' },
];

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#64748b', '#0891b2'];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function VisualBuilderV6() {
  const navigate = useNavigate();
  const { user, isAdmin, isViewingAsCustomer, effectiveCustomerId, customers } = useAuth();
  const canSeeAdminColumns = isAdmin() && !isViewingAsCustomer;

  // Available columns based on permissions
  const availableColumns = useMemo(() => {
    return canSeeAdminColumns ? ALL_COLUMNS : ALL_COLUMNS.filter(c => !c.adminOnly);
  }, [canSeeAdminColumns]);

  // State
  const [targetScope, setTargetScope] = useState<'admin' | 'customer'>(canSeeAdminColumns ? 'admin' : 'customer');
  const [targetCustomerId, setTargetCustomerId] = useState<number | null>(null);
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [config, setConfig] = useState<WidgetConfig>({
    name: '',
    description: '',
    chartType: 'bar',
    xAxis: null,
    xAxisLabel: '',
    yAxis: null,
    yAxisLabel: '',
    aggregation: 'sum',
    filters: [],
    data: null,
    totalRecords: 0,
  });

  const [showRawData, setShowRawData] = useState(false);
  const [selectedDataPoint, setSelectedDataPoint] = useState<DataPoint | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [recommendedChart, setRecommendedChart] = useState<ChartType | null>(null);

  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const [visibility, setVisibility] = useState<'admin_only' | 'all_customers' | 'private'>('admin_only');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ success: boolean; message: string } | null>(null);

  // =============================================================================
  // AI SUBMISSION
  // =============================================================================

  const handleAISubmit = useCallback(async () => {
    if (!aiPrompt.trim() || aiLoading) return;

    setAiLoading(true);
    setAiError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      // Build enhanced prompt
      const enhancedPrompt = `Create a dashboard widget visualization.

User request: "${aiPrompt}"

CRITICAL INSTRUCTIONS:
1. If user mentions specific terms (like "drawer system", "cargoglide", "toolbox"), GROUP results into those categories
2. Use correct aggregation: "average" = AVG, "total/sum" = SUM, "count/how many" = COUNT
3. Return the aggregated metric value, not just counts
4. Include the count of records in each group
5. Limit to top 15 groups
${!canSeeAdminColumns ? '\n6. NEVER use cost, margin, or carrier_total fields - this is a customer user' : ''}

Return visualization with data array containing: label, value, count (records per group)`;

      const response = await fetch(`${supabaseUrl}/functions/v1/investigate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          question: enhancedPrompt,
          customerId: targetScope === 'admin' ? '0' : String(targetCustomerId || effectiveCustomerId),
          userId: user?.id,
          conversationHistory: [],
          preferences: { showReasoning: true, forceMode: 'visual' },
        }),
      });

      if (!response.ok) throw new Error(`Request failed: ${response.status}`);

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'AI investigation failed');

      if (data.visualizations && data.visualizations.length > 0) {
        const viz = data.visualizations[0];
        const vizData = viz.data?.data || [];

        // Parse AI config
        const xAxis = viz.config?.groupBy || 'category';
        const yAxis = viz.config?.metric || 'value';
        const aggregation = parseAggregation(data.reasoning || [], viz);
        const filters = parseFilters(data.reasoning || [], aiPrompt);

        // Calculate total records
        const totalRecords = vizData.reduce((sum: number, d: any) => sum + (d.count || 1), 0);

        // Recommend chart type based on data
        const recommended = recommendChartType(vizData, xAxis);

        setConfig({
          name: viz.title || 'Custom Widget',
          description: viz.subtitle || aiPrompt,
          chartType: viz.type === 'stat' ? 'kpi' : (viz.type as ChartType) || recommended,
          xAxis,
          xAxisLabel: formatFieldName(xAxis),
          yAxis,
          yAxisLabel: formatFieldName(yAxis),
          aggregation,
          filters,
          data: vizData.map((d: any) => ({
            label: d.label || 'Unknown',
            value: Number(d.value) || 0,
            count: d.count || 1,
          })),
          totalRecords,
          queryUsed: viz.config?.query,
        });

        setRecommendedChart(recommended);
      } else {
        throw new Error('AI could not generate visualization. Try being more specific.');
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI request failed');
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, aiLoading, targetScope, targetCustomerId, effectiveCustomerId, user?.id, canSeeAdminColumns]);

  // =============================================================================
  // MANUAL QUERY
  // =============================================================================

  const handleRunQuery = useCallback(async () => {
    if (!config.xAxis || !config.yAxis) {
      setAiError('Select both X-Axis and Y-Axis');
      return;
    }

    // Security check
    if (!canSeeAdminColumns && (ADMIN_ONLY_COLUMNS.has(config.xAxis) || ADMIN_ONLY_COLUMNS.has(config.yAxis))) {
      setAiError('Access denied: Cannot view this data');
      return;
    }

    setQueryLoading(true);
    setAiError(null);

    try {
      // Build filter array for RPC
      const filterArray = [
        { field: 'pickup_date', operator: 'gte', value: dateRange.start },
        { field: 'pickup_date', operator: 'lte', value: dateRange.end },
        ...config.filters.map(f => ({
          field: f.field,
          operator: f.operator === 'contains' ? 'ilike' : f.operator,
          value: f.operator === 'contains' ? `%${f.value}%` : f.value,
        })),
      ];

      const { data, error } = await supabase.rpc('mcp_aggregate', {
        p_table_name: 'shipment',
        p_customer_id: targetScope === 'admin' ? 0 : (targetCustomerId || effectiveCustomerId || 0),
        p_is_admin: targetScope === 'admin' && canSeeAdminColumns,
        p_group_by: config.xAxis,
        p_metric: config.yAxis,
        p_aggregation: config.aggregation,
        p_filters: filterArray,
        p_limit: 20,
      });

      if (error) throw error;

      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      const rows = parsed?.data || parsed || [];

      const chartData = rows.map((row: any) => {
        const labelKey = Object.keys(row).find(k => typeof row[k] === 'string') || config.xAxis;
        const valueKey = Object.keys(row).find(k => 
          k.includes(config.aggregation) || k === 'value' || 
          (typeof row[k] === 'number' && k !== 'count' && k !== labelKey)
        );
        return {
          label: String(row[labelKey!] || 'Unknown'),
          value: Number(row[valueKey!] || row.value || 0),
          count: row.count || 1,
        };
      });

      const totalRecords = chartData.reduce((sum: number, d: DataPoint) => sum + (d.count || 1), 0);
      const recommended = recommendChartType(chartData, config.xAxis);

      setConfig(prev => ({
        ...prev,
        data: chartData,
        totalRecords,
        xAxisLabel: availableColumns.find(c => c.id === config.xAxis)?.label || config.xAxis || '',
        yAxisLabel: availableColumns.find(c => c.id === config.yAxis)?.label || config.yAxis || '',
      }));

      setRecommendedChart(recommended);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Query failed');
    } finally {
      setQueryLoading(false);
    }
  }, [config, targetScope, targetCustomerId, effectiveCustomerId, dateRange, canSeeAdminColumns, availableColumns]);

  // =============================================================================
  // HELPERS
  // =============================================================================

  const parseAggregation = (reasoning: any[], viz: any): Aggregation => {
    const content = JSON.stringify(reasoning).toLowerCase();
    if (content.includes('avg(') || content.includes('average')) return 'avg';
    if (content.includes('sum(') || content.includes('total')) return 'sum';
    if (content.includes('count(')) return 'count';
    if (content.includes('min(')) return 'min';
    if (content.includes('max(')) return 'max';
    return 'avg';
  };

  const parseFilters = (reasoning: any[], prompt: string): FilterConfig[] => {
    const filters: FilterConfig[] = [];
    const terms = ['drawer', 'cargoglide', 'toolbox', 'drawer system', 'cargo glide'];
    
    terms.forEach(term => {
      if (prompt.toLowerCase().includes(term)) {
        filters.push({
          id: `filter_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          field: 'item_description',
          operator: 'contains',
          value: term,
        });
      }
    });

    return filters;
  };

  const recommendChartType = (data: DataPoint[], xAxis: string | null): ChartType => {
    if (!data || data.length === 0) return 'bar';
    
    // Single value = KPI
    if (data.length === 1) return 'kpi';
    
    // Time-based = Line
    if (xAxis && ['pickup_month', 'pickup_week', 'pickup_date', 'day_of_week'].includes(xAxis)) {
      return 'line';
    }
    
    // Geographic = Map (if states)
    if (xAxis && ['origin_state', 'dest_state'].includes(xAxis)) {
      return 'map';
    }
    
    // Few categories with big differences = Pie
    if (data.length <= 5) {
      const values = data.map(d => d.value);
      const max = Math.max(...values);
      const min = Math.min(...values);
      if (max / min > 3) return 'pie';
    }
    
    // Many categories = Treemap
    if (data.length > 10) return 'treemap';
    
    // Default = Bar
    return 'bar';
  };

  // =============================================================================
  // FILTER MANAGEMENT
  // =============================================================================

  const addFilter = () => {
    setConfig(prev => ({
      ...prev,
      filters: [...prev.filters, {
        id: `filter_${Date.now()}`,
        field: availableColumns[0]?.id || '',
        operator: 'contains',
        value: '',
      }],
    }));
  };

  const updateFilter = (id: string, updates: Partial<FilterConfig>) => {
    setConfig(prev => ({
      ...prev,
      filters: prev.filters.map(f => f.id === id ? { ...f, ...updates } : f),
    }));
  };

  const removeFilter = (id: string) => {
    setConfig(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.id !== id),
    }));
  };

  // =============================================================================
  // EXPORT
  // =============================================================================

  const exportToCSV = () => {
    if (!config.data) return;

    const headers = ['Label', 'Value', 'Record Count'];
    const rows = config.data.map(d => [d.label, d.value, d.count || 1]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name || 'widget_data'}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
  };

  // =============================================================================
  // PUBLISH
  // =============================================================================

  const handlePublish = useCallback(async () => {
    if (!config.name.trim() || !config.data) {
      setPublishResult({ success: false, message: 'Name and data required' });
      return;
    }

    setIsPublishing(true);
    setPublishResult(null);

    try {
      const widgetId = `widget_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const usesAdminData = config.yAxis && ADMIN_ONLY_COLUMNS.has(config.yAxis);

      const widgetDef = {
        id: widgetId,
        name: config.name,
        description: config.description,
        chartType: config.chartType,
        xAxis: config.xAxis,
        yAxis: config.yAxis,
        aggregation: config.aggregation,
        filters: config.filters,
        visibility: usesAdminData ? 'admin_only' : visibility,
        containsAdminData: usesAdminData,
        data: config.data,
        createdBy: { userId: user?.id, timestamp: new Date().toISOString() },
      };

      const path = visibility === 'admin_only' ? `admin/${widgetId}.json` : `shared/${widgetId}.json`;

      const { error } = await supabase.storage
        .from('custom-widgets')
        .upload(path, JSON.stringify(widgetDef, null, 2), { contentType: 'application/json', upsert: true });

      if (error) throw error;
      setPublishResult({ success: true, message: 'Widget published!' });
    } catch (err) {
      setPublishResult({ success: false, message: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setIsPublishing(false);
    }
  }, [config, visibility, user]);

  // =============================================================================
  // RENDER
  // =============================================================================

  const hasData = config.data && config.data.length > 0;
  const usesAdminData = config.yAxis && ADMIN_ONLY_COLUMNS.has(config.yAxis);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Visual Widget Builder</h1>
              <p className="text-xs text-slate-500">Create and customize dashboard widgets</p>
            </div>
          </div>
          {canSeeAdminColumns && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
              <Shield className="w-3 h-3" />
              Admin Access
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* Scope Selector */}
        {canSeeAdminColumns && (
          <div className="bg-white rounded-lg border p-4 mb-4">
            <div className="flex gap-3">
              <button
                onClick={() => setTargetScope('admin')}
                className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border-2 text-sm ${
                  targetScope === 'admin' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'
                }`}
              >
                <Shield className="w-4 h-4" />
                All Customers
              </button>
              <button
                onClick={() => setTargetScope('customer')}
                className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border-2 text-sm ${
                  targetScope === 'customer' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                Specific Customer
              </button>
            </div>
            {targetScope === 'customer' && customers && (
              <select
                value={targetCustomerId || ''}
                onChange={(e) => setTargetCustomerId(Number(e.target.value) || null)}
                className="w-full mt-3 px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">Select...</option>
                {customers.map((c: any) => (
                  <option key={c.customer_id} value={c.customer_id}>{c.customer_name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* AI Input */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-slate-900">Describe Your Widget</span>
          </div>
          <div className="relative">
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Example: Average cost per shipment by product for drawer systems, cargoglide, and toolboxes"
              className="w-full px-3 py-2 pr-12 border rounded-lg text-sm resize-none"
              rows={2}
              disabled={aiLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAISubmit();
                }
              }}
            />
            <button
              onClick={handleAISubmit}
              disabled={!aiPrompt.trim() || aiLoading}
              className="absolute right-2 bottom-2 p-2 bg-blue-600 text-white rounded-lg disabled:bg-slate-300"
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {aiError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{aiError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left: Configuration Panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* Chart Type */}
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Chart Type</h3>
                {recommendedChart && recommendedChart !== config.chartType && (
                  <button
                    onClick={() => setConfig(prev => ({ ...prev, chartType: recommendedChart }))}
                    className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs hover:bg-amber-100"
                  >
                    <Lightbulb className="w-3 h-3" />
                    Try {recommendedChart}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {CHART_TYPES.map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    onClick={() => setConfig(prev => ({ ...prev, chartType: type }))}
                    className={`flex flex-col items-center p-2 rounded border text-xs ${
                      config.chartType === type ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'
                    }`}
                    title={CHART_TYPES.find(c => c.type === type)?.description}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* X-Axis */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold text-sm mb-1">X-Axis (Group By)</h3>
              <p className="text-xs text-slate-500 mb-2">How to categorize the data</p>
              {config.xAxisLabel && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded mb-2">
                  <span className="text-sm font-medium text-blue-700">{config.xAxisLabel}</span>
                  <button onClick={() => setConfig(prev => ({ ...prev, xAxis: null, xAxisLabel: '' }))} className="ml-auto text-blue-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <ColumnSelector
                columns={availableColumns}
                selected={config.xAxis}
                onSelect={(col) => setConfig(prev => ({
                  ...prev,
                  xAxis: col,
                  xAxisLabel: availableColumns.find(c => c.id === col)?.label || col || '',
                }))}
              />
            </div>

            {/* Y-Axis */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold text-sm mb-1">Y-Axis (Metric)</h3>
              <p className="text-xs text-slate-500 mb-2">What to measure</p>
              {config.yAxisLabel && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded mb-2">
                  <span className="text-sm font-medium text-green-700">
                    {AGGREGATIONS.find(a => a.value === config.aggregation)?.symbol} {config.yAxisLabel}
                  </span>
                  <button onClick={() => setConfig(prev => ({ ...prev, yAxis: null, yAxisLabel: '' }))} className="ml-auto text-green-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <ColumnSelector
                columns={availableColumns}
                selected={config.yAxis}
                onSelect={(col) => setConfig(prev => ({
                  ...prev,
                  yAxis: col,
                  yAxisLabel: availableColumns.find(c => c.id === col)?.label || col || '',
                }))}
              />
              
              {/* Aggregation */}
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-slate-500 mb-2">Aggregation</p>
                <div className="flex gap-1">
                  {AGGREGATIONS.map(({ value, label, symbol }) => (
                    <button
                      key={value}
                      onClick={() => setConfig(prev => ({ ...prev, aggregation: value }))}
                      className={`flex-1 px-2 py-1.5 rounded text-xs font-medium ${
                        config.aggregation === value ? 'bg-blue-600 text-white' : 'bg-slate-100'
                      }`}
                    >
                      {symbol} {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">Filters</h3>
                <button onClick={addFilter} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
              
              {config.filters.length === 0 ? (
                <p className="text-xs text-slate-500">No filters applied</p>
              ) : (
                <div className="space-y-2">
                  {config.filters.map((filter) => (
                    <div key={filter.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded text-xs">
                      <select
                        value={filter.field}
                        onChange={(e) => updateFilter(filter.id, { field: e.target.value })}
                        className="flex-1 px-2 py-1 border rounded text-xs"
                      >
                        {availableColumns.map(col => (
                          <option key={col.id} value={col.id}>{col.label}</option>
                        ))}
                      </select>
                      <select
                        value={filter.operator}
                        onChange={(e) => updateFilter(filter.id, { operator: e.target.value as any })}
                        className="px-2 py-1 border rounded text-xs"
                      >
                        {FILTER_OPERATORS.map(op => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={filter.value}
                        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                        placeholder="Value"
                        className="flex-1 px-2 py-1 border rounded text-xs"
                      />
                      <button onClick={() => removeFilter(filter.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Run Query / Refresh */}
            <button
              onClick={handleRunQuery}
              disabled={!config.xAxis || !config.yAxis || queryLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg disabled:bg-slate-300 font-medium"
            >
              {queryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {queryLoading ? 'Running...' : 'Run Query'}
            </button>
          </div>

          {/* Right: Preview & Data */}
          <div className="lg:col-span-3 space-y-4">
            {/* Preview */}
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{config.name || 'Preview'}</h3>
                  {hasData && (
                    <p className="text-xs text-slate-500">{config.data?.length} groups • {config.totalRecords.toLocaleString()} records</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="px-2 py-1 text-xs border rounded"
                  />
                  <span className="text-xs text-slate-400">to</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="px-2 py-1 text-xs border rounded"
                  />
                </div>
              </div>

              <div className="p-4 min-h-[300px] flex items-center justify-center">
                {aiLoading || queryLoading ? (
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-sm">Loading...</span>
                  </div>
                ) : !hasData ? (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Eye className="w-8 h-8" />
                    <span className="text-sm">Configure and run query to see preview</span>
                  </div>
                ) : (
                  <div className="w-full h-[280px]">
                    <ChartRenderer
                      type={config.chartType}
                      data={config.data!}
                      onDataPointClick={setSelectedDataPoint}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Raw Data */}
            {hasData && (
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <button
                    onClick={() => setShowRawData(!showRawData)}
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    <Database className="w-4 h-4" />
                    Raw Data
                    {showRawData ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={exportToCSV}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Download className="w-3 h-3" />
                    Export CSV
                  </button>
                </div>

                {showRawData && (
                  <div className="max-h-64 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">{config.xAxisLabel || 'Label'}</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">
                            {AGGREGATIONS.find(a => a.value === config.aggregation)?.label} of {config.yAxisLabel}
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Records</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {config.data?.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-2 text-slate-900">{row.label}</td>
                            <td className="px-4 py-2 text-right font-medium">{formatValue(row.value)}</td>
                            <td className="px-4 py-2 text-right text-slate-500">{row.count?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-100 font-medium">
                        <tr>
                          <td className="px-4 py-2">Total</td>
                          <td className="px-4 py-2 text-right">
                            {formatValue(config.data?.reduce((s, r) => s + r.value, 0) || 0)}
                          </td>
                          <td className="px-4 py-2 text-right">{config.totalRecords.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Publish */}
            {hasData && (
              <div className="bg-white rounded-lg border p-4 space-y-3">
                <h3 className="font-semibold text-sm">Publish Widget</h3>
                
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Widget name"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />

                {usesAdminData && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded flex items-center gap-2 text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4" />
                    Uses admin data - Admin Only visibility
                  </div>
                )}

                <div className="flex gap-2">
                  {[
                    { v: 'admin_only', label: 'Admin Only', icon: Shield },
                    { v: 'all_customers', label: 'All', icon: Users },
                    { v: 'private', label: 'Private', icon: Lock },
                  ].map(({ v, label, icon: Icon }) => (
                    <button
                      key={v}
                      onClick={() => setVisibility(v as any)}
                      disabled={usesAdminData && v !== 'admin_only'}
                      className={`flex-1 flex items-center justify-center gap-1 p-2 rounded border text-xs ${
                        visibility === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'
                      } ${usesAdminData && v !== 'admin_only' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </button>
                  ))}
                </div>

                {publishResult && (
                  <div className={`p-2 rounded text-xs ${publishResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {publishResult.message}
                  </div>
                )}

                <button
                  onClick={handlePublish}
                  disabled={!config.name.trim() || isPublishing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg disabled:from-slate-400 disabled:to-slate-400 text-sm font-medium"
                >
                  {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                  Publish
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// =============================================================================
// COLUMN SELECTOR
// =============================================================================

function ColumnSelector({
  columns,
  selected,
  onSelect,
}: {
  columns: Column[];
  selected: string | null;
  onSelect: (col: string | null) => void;
}) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search) return columns;
    const s = search.toLowerCase();
    return columns.filter(c =>
      c.label.toLowerCase().includes(s) ||
      c.id.toLowerCase().includes(s) ||
      c.category.toLowerCase().includes(s)
    );
  }, [columns, search]);

  const byCategory = useMemo(() => {
    const result: Record<string, Column[]> = {};
    filtered.forEach(col => {
      if (!result[col.category]) result[col.category] = [];
      result[col.category].push(col);
    });
    return result;
  }, [filtered]);

  return (
    <div>
      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full pl-8 pr-3 py-1.5 border rounded text-xs"
        />
      </div>

      <div className="max-h-48 overflow-y-auto border rounded">
        {Object.entries(CATEGORIES).map(([cat, { label, icon: Icon }]) => {
          const cols = byCategory[cat] || [];
          if (cols.length === 0) return null;

          const isOpen = expanded.has(cat) || search.length > 0;

          return (
            <div key={cat} className="border-b last:border-b-0">
              <button
                onClick={() => setExpanded(prev => {
                  const next = new Set(prev);
                  next.has(cat) ? next.delete(cat) : next.add(cat);
                  return next;
                })}
                className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3 h-3 text-slate-400" />
                  <span className="font-medium">{label}</span>
                  <span className="text-slate-400">({cols.length})</span>
                </div>
                {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              {isOpen && (
                <div className="px-1 pb-1">
                  {cols.map(col => (
                    <button
                      key={col.id}
                      onClick={() => onSelect(col.id)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs ${
                        selected === col.id ? 'bg-blue-100 text-blue-800' : 'hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.adminOnly && <span className="px-1 py-0.5 bg-amber-100 text-amber-700 text-[9px] rounded">Admin</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// CHART RENDERER
// =============================================================================

function ChartRenderer({
  type,
  data,
  onDataPointClick,
}: {
  type: ChartType;
  data: DataPoint[];
  onDataPointClick?: (point: DataPoint | null) => void;
}) {
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

  const handleClick = (d: any) => {
    if (onDataPointClick && d?.payload) {
      onDataPointClick(d.payload);
    }
  };

  switch (type) {
    case 'bar':
      return (
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={formatValue} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => formatValue(v)} />
            <Bar dataKey="value" onClick={handleClick} cursor="pointer">
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );

    case 'line':
      return (
        <ResponsiveContainer>
          <RechartsLine data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} />
            <YAxis tickFormatter={formatValue} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => formatValue(v)} />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ cursor: 'pointer' }} onClick={handleClick} />
          </RechartsLine>
        </ResponsiveContainer>
      );

    case 'area':
      return (
        <ResponsiveContainer>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} />
            <YAxis tickFormatter={formatValue} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => formatValue(v)} />
            <Area type="monotone" dataKey="value" fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" />
          </AreaChart>
        </ResponsiveContainer>
      );

    case 'pie':
      return (
        <ResponsiveContainer>
          <RechartsPie>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={80}
              onClick={handleClick}
              cursor="pointer"
              label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}
              labelLine={{ strokeWidth: 1 }}
            >
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => formatValue(v)} />
          </RechartsPie>
        </ResponsiveContainer>
      );

    case 'treemap':
      const treemapData = data.map(d => ({ name: d.label, size: d.value, count: d.count }));
      return (
        <ResponsiveContainer>
          <Treemap
            data={treemapData}
            dataKey="size"
            aspectRatio={4/3}
            stroke="#fff"
            fill="#3b82f6"
          >
            <Tooltip formatter={(v: number) => formatValue(v)} />
          </Treemap>
        </ResponsiveContainer>
      );

    case 'funnel':
      return (
        <ResponsiveContainer>
          <FunnelChart>
            <Tooltip formatter={(v: number) => formatValue(v)} />
            <Funnel dataKey="value" data={data} isAnimationActive>
              <LabelList position="center" fill="#fff" stroke="none" dataKey="label" fontSize={10} />
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      );

    case 'combo':
      return (
        <ResponsiveContainer>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} />
            <YAxis tickFormatter={formatValue} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => formatValue(v)} />
            <Bar dataKey="value" fill="#3b82f6" />
            <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      );

    case 'map':
      // Simplified map - would need actual geo library for real maps
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-500">
          <Map className="w-12 h-12 mb-2" />
          <p className="text-sm">Map visualization</p>
          <p className="text-xs">Requires geographic data (state/country)</p>
          {/* Fallback to table */}
          <div className="mt-4 w-full max-h-48 overflow-auto">
            <table className="w-full text-xs">
              <tbody>
                {data.map((d, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-1">{d.label}</td>
                    <td className="p-1 text-right font-medium">{formatValue(d.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case 'kpi':
      const total = data.reduce((s, r) => s + r.value, 0);
      const avg = total / data.length;
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-4xl font-bold text-slate-900">{formatValue(total)}</div>
          <div className="text-sm text-slate-500 mt-1">Total</div>
          <div className="text-xs text-slate-400 mt-2">{data.length} groups • Avg {formatValue(avg)}</div>
        </div>
      );

    case 'table':
      return (
        <div className="overflow-auto max-h-full w-full">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Label</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Value</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 cursor-pointer" onClick={() => onDataPointClick?.(row)}>
                  <td className="px-3 py-2">{row.label}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatValue(row.value)}</td>
                  <td className="px-3 py-2 text-right text-slate-500">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      return <div>Unknown chart type</div>;
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function formatFieldName(name: string): string {
  if (!name) return '';
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatValue(value: number): string {
  if (typeof value !== 'number' || isNaN(value)) return '$0';
  if (Math.abs(value) >= 1000000) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(value);
  }
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
}

export default VisualBuilderV6;
