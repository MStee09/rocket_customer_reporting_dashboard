/**
 * Visual Builder V7 - COMPLETE FIXES
 * 
 * Fixes from V6:
 * 1. X-Axis and Y-Axis show actual field names (not just "Category")
 * 2. Delete filter button works
 * 3. Publish asks WHERE to put widget (Pulse/Analytics, which section)
 * 4. Date range matches dashboard (Last 7/30/90 days dropdown)
 * 5. Manual mode toggle restored
 */

import React, { useState, useCallback, useMemo } from 'react';
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
  Lightbulb,
  Map,
  GitBranch,
  Plus,
  Trash2,
  Database,
  Grid3X3,
  Activity,
  Layout,
  BarChart2,
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
type DateRangePreset = 'last7' | 'last30' | 'last90' | 'thisMonth' | 'lastMonth' | 'custom';
type PublishDestination = 'pulse' | 'analytics';
type PulseSection = 'key_metrics' | 'shipment_analysis' | 'financial_overview' | 'custom';
type AnalyticsSection = 'overview' | 'trends' | 'comparisons' | 'custom';

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
  fieldLabel: string;
  operator: 'contains' | 'equals' | 'gt' | 'lt' | 'gte' | 'lte';
  value: string;
}

interface DataPoint {
  label: string;
  value: number;
  count?: number;
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
}

interface PublishSettings {
  destination: PublishDestination;
  pulseSection: PulseSection;
  analyticsSection: AnalyticsSection;
  visibility: 'admin_only' | 'all_customers' | 'private';
}

// =============================================================================
// COLUMN DEFINITIONS
// =============================================================================

const ALL_COLUMNS: Column[] = [
  // Shipment Info
  { id: 'load_id', label: 'Load ID', category: 'shipment', type: 'number' },
  { id: 'reference_number', label: 'Reference Number', category: 'shipment', type: 'string' },
  { id: 'bol_number', label: 'BOL Number', category: 'shipment', type: 'string' },
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
  { id: 'retail', label: 'Retail (Your Charge)', category: 'financial', type: 'number' },
  { id: 'fuel_surcharge', label: 'Fuel Surcharge', category: 'financial', type: 'number' },
  { id: 'accessorial_total', label: 'Accessorials', category: 'financial', type: 'number' },

  // Financial - Admin only
  { id: 'cost', label: 'Cost (Carrier Pay)', category: 'financial', type: 'number', adminOnly: true },
  { id: 'margin', label: 'Margin ($)', category: 'financial', type: 'number', adminOnly: true },
  { id: 'margin_percent', label: 'Margin (%)', category: 'financial', type: 'number', adminOnly: true },
  { id: 'linehaul', label: 'Linehaul', category: 'financial', type: 'number', adminOnly: true },

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
  { id: 'commodity', label: 'Commodity', category: 'products', type: 'string' },
  { id: 'freight_class', label: 'Freight Class', category: 'products', type: 'string' },
  { id: 'sku', label: 'SKU', category: 'products', type: 'string' },
  { id: 'item_weight', label: 'Item Weight', category: 'products', type: 'number' },
  { id: 'item_count', label: 'Item Count', category: 'products', type: 'number' },

  // Customer
  { id: 'customer_name', label: 'Customer Name', category: 'customer', type: 'string' },

  // Time
  { id: 'pickup_month', label: 'Pickup Month', category: 'time', type: 'string' },
  { id: 'pickup_week', label: 'Pickup Week', category: 'time', type: 'string' },
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

const CHART_TYPES: Array<{ type: ChartType; label: string; icon: React.ElementType }> = [
  { type: 'bar', label: 'Bar', icon: BarChart3 },
  { type: 'line', label: 'Line', icon: LineChart },
  { type: 'area', label: 'Area', icon: TrendingUp },
  { type: 'pie', label: 'Pie', icon: PieChart },
  { type: 'treemap', label: 'Treemap', icon: Grid3X3 },
  { type: 'funnel', label: 'Funnel', icon: GitBranch },
  { type: 'kpi', label: 'KPI', icon: Hash },
  { type: 'table', label: 'Table', icon: Table },
  { type: 'map', label: 'Map', icon: Map },
  { type: 'combo', label: 'Combo', icon: Activity },
];

const AGGREGATIONS: Array<{ value: Aggregation; label: string; symbol: string }> = [
  { value: 'sum', label: 'Sum', symbol: 'Σ' },
  { value: 'avg', label: 'Average', symbol: 'x̄' },
  { value: 'count', label: 'Count', symbol: '#' },
  { value: 'min', label: 'Min', symbol: '↓' },
  { value: 'max', label: 'Max', symbol: '↑' },
];

const DATE_PRESETS: Array<{ value: DateRangePreset; label: string }> = [
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'last90', label: 'Last 90 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
];

const FILTER_OPERATORS = [
  { value: 'contains', label: 'Contains' },
  { value: 'equals', label: 'Equals' },
  { value: 'gt', label: 'Greater than' },
  { value: 'lt', label: 'Less than' },
  { value: 'gte', label: '≥' },
  { value: 'lte', label: '≤' },
];

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function VisualBuilderV7() {
  const navigate = useNavigate();
  const { user, isAdmin, isViewingAsCustomer, effectiveCustomerId, customers } = useAuth();
  const canSeeAdminColumns = isAdmin() && !isViewingAsCustomer;

  const availableColumns = useMemo(() => {
    return canSeeAdminColumns ? ALL_COLUMNS : ALL_COLUMNS.filter(c => !c.adminOnly);
  }, [canSeeAdminColumns]);

  // Scope
  const [targetScope, setTargetScope] = useState<'admin' | 'customer'>(canSeeAdminColumns ? 'admin' : 'customer');
  const [targetCustomerId, setTargetCustomerId] = useState<number | null>(null);

  // AI State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Date Range - matches dashboard presets
  const [datePreset, setDatePreset] = useState<DateRangePreset>('last30');
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // Widget Config
  const [config, setConfig] = useState<WidgetConfig>({
    name: '',
    description: '',
    chartType: 'bar',
    xAxis: null,
    xAxisLabel: '',
    yAxis: null,
    yAxisLabel: '',
    aggregation: 'avg',
    filters: [],
    data: null,
    totalRecords: 0,
  });

  // UI State
  const [showRawData, setShowRawData] = useState(false);
  const [queryLoading, setQueryLoading] = useState(false);
  const [recommendedChart, setRecommendedChart] = useState<ChartType | null>(null);

  // Publish State
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishSettings, setPublishSettings] = useState<PublishSettings>({
    destination: 'pulse',
    pulseSection: 'custom',
    analyticsSection: 'custom',
    visibility: 'admin_only',
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ success: boolean; message: string } | null>(null);

  // =============================================================================
  // DATE RANGE CALCULATION
  // =============================================================================

  const getDateRange = useCallback(() => {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start: string;

    switch (datePreset) {
      case 'last7':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'last30':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'last90':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        break;
      case 'lastMonth':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        start = lastMonth.toISOString().split('T')[0];
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    return { start, end };
  }, [datePreset]);

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

      const response = await fetch(`${supabaseUrl}/functions/v1/investigate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          question: `Create a dashboard widget: ${aiPrompt}. Group by the requested categories and use the correct aggregation (avg/sum/count).`,
          customerId: targetScope === 'admin' ? '0' : String(targetCustomerId || effectiveCustomerId),
          userId: user?.id,
          conversationHistory: [],
          preferences: { showReasoning: true, forceMode: 'visual' },
        }),
      });

      if (!response.ok) throw new Error(`Request failed: ${response.status}`);

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'AI failed');

      if (data.visualizations && data.visualizations.length > 0) {
        const viz = data.visualizations[0];
        const vizData = viz.data?.data || [];

        // Get field labels
        const xAxisId = viz.config?.groupBy || 'category';
        const yAxisId = viz.config?.metric || 'value';
        const xAxisCol = availableColumns.find(c => c.id === xAxisId);
        const yAxisCol = availableColumns.find(c => c.id === yAxisId);

        // Parse filters from prompt
        const filters = parseFiltersFromPrompt(aiPrompt, availableColumns);

        const totalRecords = vizData.reduce((sum: number, d: any) => sum + (d.count || 1), 0);
        const recommended = recommendChartType(vizData, xAxisId);

        setConfig({
          name: viz.title || 'Custom Widget',
          description: aiPrompt,
          chartType: viz.type === 'stat' ? 'kpi' : (viz.type as ChartType) || recommended,
          xAxis: xAxisId,
          xAxisLabel: xAxisCol?.label || formatFieldName(xAxisId),
          yAxis: yAxisId,
          yAxisLabel: yAxisCol?.label || formatFieldName(yAxisId),
          aggregation: parseAggregation(data.reasoning || []),
          filters,
          data: vizData.map((d: any) => ({
            label: d.label || 'Unknown',
            value: Number(d.value) || 0,
            count: d.count || 1,
          })),
          totalRecords,
        });

        setRecommendedChart(recommended);
      } else {
        throw new Error('AI could not generate visualization');
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI failed');
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, aiLoading, targetScope, targetCustomerId, effectiveCustomerId, user?.id, availableColumns]);

  // =============================================================================
  // MANUAL QUERY
  // =============================================================================

  const handleRunQuery = useCallback(async () => {
    if (!config.xAxis || !config.yAxis) {
      setAiError('Select both X-Axis and Y-Axis');
      return;
    }

    if (!canSeeAdminColumns && (ADMIN_ONLY_COLUMNS.has(config.xAxis) || ADMIN_ONLY_COLUMNS.has(config.yAxis))) {
      setAiError('Access denied');
      return;
    }

    setQueryLoading(true);
    setAiError(null);

    try {
      const dateRange = getDateRange();

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

      setConfig(prev => ({ ...prev, data: chartData, totalRecords }));
      setRecommendedChart(recommendChartType(chartData, config.xAxis));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Query failed');
    } finally {
      setQueryLoading(false);
    }
  }, [config, targetScope, targetCustomerId, effectiveCustomerId, canSeeAdminColumns, getDateRange]);

  // =============================================================================
  // FILTER MANAGEMENT
  // =============================================================================

  const addFilter = useCallback(() => {
    const defaultCol = availableColumns[0];
    setConfig(prev => ({
      ...prev,
      filters: [...prev.filters, {
        id: `filter_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        field: defaultCol?.id || '',
        fieldLabel: defaultCol?.label || '',
        operator: 'contains',
        value: '',
      }],
    }));
  }, [availableColumns]);

  const updateFilter = useCallback((id: string, updates: Partial<FilterConfig>) => {
    setConfig(prev => ({
      ...prev,
      filters: prev.filters.map(f => {
        if (f.id !== id) return f;
        const updated = { ...f, ...updates };
        // Update label if field changed
        if (updates.field) {
          const col = availableColumns.find(c => c.id === updates.field);
          updated.fieldLabel = col?.label || updates.field;
        }
        return updated;
      }),
    }));
  }, [availableColumns]);

  const removeFilter = useCallback((id: string) => {
    console.log('Removing filter:', id); // Debug
    setConfig(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.id !== id),
    }));
  }, []);

  // =============================================================================
  // COLUMN SELECTION
  // =============================================================================

  const selectXAxis = useCallback((colId: string) => {
    const col = availableColumns.find(c => c.id === colId);
    setConfig(prev => ({
      ...prev,
      xAxis: colId,
      xAxisLabel: col?.label || colId,
    }));
  }, [availableColumns]);

  const selectYAxis = useCallback((colId: string) => {
    const col = availableColumns.find(c => c.id === colId);
    setConfig(prev => ({
      ...prev,
      yAxis: colId,
      yAxisLabel: col?.label || colId,
    }));
  }, [availableColumns]);

  const clearXAxis = useCallback(() => {
    setConfig(prev => ({ ...prev, xAxis: null, xAxisLabel: '' }));
  }, []);

  const clearYAxis = useCallback(() => {
    setConfig(prev => ({ ...prev, yAxis: null, yAxisLabel: '' }));
  }, []);

  // =============================================================================
  // EXPORT
  // =============================================================================

  const exportToCSV = useCallback(() => {
    if (!config.data) return;
    const headers = [config.xAxisLabel || 'Label', `${config.aggregation.toUpperCase()} of ${config.yAxisLabel}`, 'Records'];
    const rows = config.data.map(d => [d.label, d.value, d.count || 1]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name || 'widget_data'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [config]);

  // =============================================================================
  // PUBLISH
  // =============================================================================

  const handlePublish = useCallback(async () => {
    if (!config.name.trim() || !config.data) return;

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
        xAxisLabel: config.xAxisLabel,
        yAxis: config.yAxis,
        yAxisLabel: config.yAxisLabel,
        aggregation: config.aggregation,
        filters: config.filters,
        data: config.data,
        // NEW: Publish destination
        destination: publishSettings.destination,
        section: publishSettings.destination === 'pulse' ? publishSettings.pulseSection : publishSettings.analyticsSection,
        visibility: usesAdminData ? 'admin_only' : publishSettings.visibility,
        containsAdminData: usesAdminData,
        datePreset,
        createdBy: { userId: user?.id, email: user?.email, timestamp: new Date().toISOString() },
      };

      // Save to appropriate location based on destination
      const basePath = publishSettings.destination === 'pulse' ? 'pulse-widgets' : 'analytics-widgets';
      const visPath = publishSettings.visibility === 'admin_only' ? 'admin' : 'shared';
      const storagePath = `${basePath}/${visPath}/${widgetId}.json`;

      const { error } = await supabase.storage
        .from('custom-widgets')
        .upload(storagePath, JSON.stringify(widgetDef, null, 2), {
          contentType: 'application/json',
          upsert: true,
        });

      if (error) throw error;

      const destLabel = publishSettings.destination === 'pulse' ? 'Pulse Dashboard' : 'Analytics Hub';
      setPublishResult({ success: true, message: `Widget published to ${destLabel}!` });
      setShowPublishModal(false);
    } catch (err) {
      setPublishResult({ success: false, message: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setIsPublishing(false);
    }
  }, [config, publishSettings, datePreset, user]);

  // =============================================================================
  // HELPERS
  // =============================================================================

  const parseAggregation = (reasoning: any[]): Aggregation => {
    const content = JSON.stringify(reasoning).toLowerCase();
    if (content.includes('avg(') || content.includes('average')) return 'avg';
    if (content.includes('sum(') || content.includes('total')) return 'sum';
    if (content.includes('count(')) return 'count';
    return 'avg';
  };

  const parseFiltersFromPrompt = (prompt: string, columns: Column[]): FilterConfig[] => {
    const filters: FilterConfig[] = [];
    const terms = ['drawer', 'cargoglide', 'toolbox', 'drawer system'];
    const descCol = columns.find(c => c.id === 'item_description');

    terms.forEach(term => {
      if (prompt.toLowerCase().includes(term)) {
        filters.push({
          id: `filter_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          field: 'item_description',
          fieldLabel: descCol?.label || 'Product Description',
          operator: 'contains',
          value: term,
        });
      }
    });

    return filters;
  };

  const recommendChartType = (data: DataPoint[], xAxis: string | null): ChartType => {
    if (!data || data.length === 0) return 'bar';
    if (data.length === 1) return 'kpi';
    if (xAxis && ['pickup_month', 'pickup_week', 'day_of_week'].includes(xAxis)) return 'line';
    if (xAxis && ['origin_state', 'dest_state'].includes(xAxis)) return 'map';
    if (data.length <= 5) return 'pie';
    if (data.length > 10) return 'treemap';
    return 'bar';
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  const hasData = config.data && config.data.length > 0;
  const usesAdminData = config.yAxis && ADMIN_ONLY_COLUMNS.has(config.yAxis);
  const dateRange = getDateRange();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold">Visual Widget Builder</h1>
              <p className="text-xs text-slate-500">Create and customize dashboard widgets</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {canSeeAdminColumns && (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                <Shield className="w-3 h-3" />
                Admin
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* Scope Selector */}
        {canSeeAdminColumns && (
          <div className="bg-white rounded-lg border p-3 mb-4 flex items-center gap-3">
            <span className="text-sm text-slate-600">Data:</span>
            <button
              onClick={() => setTargetScope('admin')}
              className={`px-3 py-1.5 rounded-lg text-sm ${targetScope === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100'}`}
            >
              All Customers
            </button>
            <button
              onClick={() => setTargetScope('customer')}
              className={`px-3 py-1.5 rounded-lg text-sm ${targetScope === 'customer' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100'}`}
            >
              Specific Customer
            </button>
            {targetScope === 'customer' && customers && (
              <select
                value={targetCustomerId || ''}
                onChange={(e) => setTargetCustomerId(Number(e.target.value) || null)}
                className="px-2 py-1.5 border rounded-lg text-sm"
              >
                <option value="">Select...</option>
                {customers.map((c: any) => (
                  <option key={c.customer_id} value={c.customer_id}>{c.customer_name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* AI Input - Always visible */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Describe Your Widget</span>
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-800">{aiError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left: Configuration */}
          <div className="lg:col-span-2 space-y-4">
            {/* Chart Type */}
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Chart Type</h3>
                {recommendedChart && recommendedChart !== config.chartType && (
                  <button
                    onClick={() => setConfig(prev => ({ ...prev, chartType: recommendedChart }))}
                    className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs"
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
              
              {/* FIXED: Show actual field name */}
              {config.xAxis && (
                <div className="flex items-center justify-between px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg mb-2">
                  <div>
                    <span className="text-sm font-medium text-blue-700">{config.xAxisLabel}</span>
                    <span className="text-xs text-blue-500 ml-2">({config.xAxis})</span>
                  </div>
                  <button onClick={clearXAxis} className="text-blue-600 hover:text-blue-800">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              <ColumnSelector columns={availableColumns} selected={config.xAxis} onSelect={selectXAxis} />
            </div>

            {/* Y-Axis */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold text-sm mb-1">Y-Axis (Metric)</h3>
              <p className="text-xs text-slate-500 mb-2">What to measure</p>
              
              {/* FIXED: Show actual field name with aggregation */}
              {config.yAxis && (
                <div className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded-lg mb-2">
                  <div>
                    <span className="text-sm font-medium text-green-700">
                      {AGGREGATIONS.find(a => a.value === config.aggregation)?.symbol} {config.yAxisLabel}
                    </span>
                    <span className="text-xs text-green-500 ml-2">({config.yAxis})</span>
                  </div>
                  <button onClick={clearYAxis} className="text-green-600 hover:text-green-800">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              <ColumnSelector columns={availableColumns} selected={config.yAxis} onSelect={selectYAxis} />
              
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
              <div className="flex items-center justify-between mb-3">
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
                    <div key={filter.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                      <select
                        value={filter.field}
                        onChange={(e) => updateFilter(filter.id, { field: e.target.value })}
                        className="flex-1 px-2 py-1.5 border rounded text-xs"
                      >
                        {availableColumns.map(col => (
                          <option key={col.id} value={col.id}>{col.label}</option>
                        ))}
                      </select>
                      <select
                        value={filter.operator}
                        onChange={(e) => updateFilter(filter.id, { operator: e.target.value as any })}
                        className="px-2 py-1.5 border rounded text-xs"
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
                        className="flex-1 px-2 py-1.5 border rounded text-xs"
                      />
                      {/* FIXED: Delete button with proper onClick */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeFilter(filter.id);
                        }}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Run Query */}
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
                    <p className="text-xs text-slate-500">
                      {config.data?.length} groups • {config.totalRecords.toLocaleString()} records
                    </p>
                  )}
                </div>

                {/* FIXED: Date range dropdown matching dashboard */}
                <div className="relative">
                  <button
                    onClick={() => setShowDateDropdown(!showDateDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm hover:bg-slate-50"
                  >
                    <Calendar className="w-4 h-4 text-slate-500" />
                    {DATE_PRESETS.find(p => p.value === datePreset)?.label}
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>
                  {showDateDropdown && (
                    <div className="absolute right-0 mt-1 w-40 bg-white border rounded-lg shadow-lg z-10">
                      {DATE_PRESETS.map(preset => (
                        <button
                          key={preset.value}
                          onClick={() => {
                            setDatePreset(preset.value);
                            setShowDateDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                            datePreset === preset.value ? 'bg-orange-50 text-orange-700' : ''
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 min-h-[280px] flex items-center justify-center">
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
                  <div className="w-full h-[260px]">
                    <ChartRenderer type={config.chartType} data={config.data!} />
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
                  <button onClick={exportToCSV} className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded">
                    <Download className="w-3 h-3" />
                    Export CSV
                  </button>
                </div>

                {showRawData && (
                  <div className="max-h-48 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">{config.xAxisLabel}</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">
                            {AGGREGATIONS.find(a => a.value === config.aggregation)?.label} of {config.yAxisLabel}
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Records</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {config.data?.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-2">{row.label}</td>
                            <td className="px-4 py-2 text-right font-medium">{formatValue(row.value)}</td>
                            <td className="px-4 py-2 text-right text-slate-500">{row.count?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Publish Button */}
            {hasData && (
              <div className="bg-white rounded-lg border p-4">
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Widget name..."
                  className="w-full px-3 py-2 border rounded-lg text-sm mb-3"
                />

                {publishResult && (
                  <div className={`p-2 rounded text-xs mb-3 ${publishResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {publishResult.message}
                  </div>
                )}

                <button
                  onClick={() => setShowPublishModal(true)}
                  disabled={!config.name.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg disabled:from-slate-400 disabled:to-slate-400 font-medium"
                >
                  <Rocket className="w-4 h-4" />
                  Publish Widget
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* FIXED: Publish Modal with destination selection */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Publish Widget</h2>
              <button onClick={() => setShowPublishModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Destination */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Where do you want this widget?</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPublishSettings(prev => ({ ...prev, destination: 'pulse' }))}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 ${
                      publishSettings.destination === 'pulse' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                    }`}
                  >
                    <Layout className={`w-6 h-6 ${publishSettings.destination === 'pulse' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className={`text-sm font-medium ${publishSettings.destination === 'pulse' ? 'text-blue-700' : 'text-slate-700'}`}>
                      Pulse Dashboard
                    </span>
                  </button>
                  <button
                    onClick={() => setPublishSettings(prev => ({ ...prev, destination: 'analytics' }))}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 ${
                      publishSettings.destination === 'analytics' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                    }`}
                  >
                    <BarChart2 className={`w-6 h-6 ${publishSettings.destination === 'analytics' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className={`text-sm font-medium ${publishSettings.destination === 'analytics' ? 'text-blue-700' : 'text-slate-700'}`}>
                      Analytics Hub
                    </span>
                  </button>
                </div>
              </div>

              {/* Section */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Section</label>
                {publishSettings.destination === 'pulse' ? (
                  <select
                    value={publishSettings.pulseSection}
                    onChange={(e) => setPublishSettings(prev => ({ ...prev, pulseSection: e.target.value as PulseSection }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="key_metrics">Key Metrics (Top)</option>
                    <option value="shipment_analysis">Shipment Analysis</option>
                    <option value="financial_overview">Financial Overview</option>
                    <option value="custom">Custom Section (Bottom)</option>
                  </select>
                ) : (
                  <select
                    value={publishSettings.analyticsSection}
                    onChange={(e) => setPublishSettings(prev => ({ ...prev, analyticsSection: e.target.value as AnalyticsSection }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="overview">Overview</option>
                    <option value="trends">Trends</option>
                    <option value="comparisons">Comparisons</option>
                    <option value="custom">Custom Section</option>
                  </select>
                )}
              </div>

              {/* Visibility */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Who can see this?</label>
                {usesAdminData && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Uses admin data - Admin Only
                  </div>
                )}
                <div className="flex gap-2">
                  {[
                    { v: 'admin_only', label: 'Admin Only', icon: Shield },
                    { v: 'all_customers', label: 'All Customers', icon: Users },
                    { v: 'private', label: 'Private', icon: Lock },
                  ].map(({ v, label, icon: Icon }) => (
                    <button
                      key={v}
                      onClick={() => setPublishSettings(prev => ({ ...prev, visibility: v as any }))}
                      disabled={usesAdminData && v !== 'admin_only'}
                      className={`flex-1 flex items-center justify-center gap-1 p-2 rounded border text-xs ${
                        publishSettings.visibility === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'
                      } ${usesAdminData && v !== 'admin_only' ? 'opacity-50' : ''}`}
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setShowPublishModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:bg-slate-400"
              >
                {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                Publish
              </button>
            </div>
          </div>
        </div>
      )}
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
  onSelect: (col: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search) return columns;
    const s = search.toLowerCase();
    return columns.filter(c => c.label.toLowerCase().includes(s) || c.id.toLowerCase().includes(s));
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

      <div className="max-h-40 overflow-y-auto border rounded">
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
                      <span>{col.label}</span>
                      {col.adminOnly && <span className="ml-1 px-1 py-0.5 bg-amber-100 text-amber-700 text-[9px] rounded">Admin</span>}
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

function ChartRenderer({ type, data }: { type: ChartType; data: DataPoint[] }) {
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

  switch (type) {
    case 'bar':
      return (
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={formatValue} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => formatValue(v)} />
            <Bar dataKey="value">
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
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
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
            <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => formatValue(v)} />
          </RechartsPie>
        </ResponsiveContainer>
      );
    case 'treemap':
      return (
        <ResponsiveContainer>
          <Treemap data={data.map(d => ({ name: d.label, size: d.value }))} dataKey="size" stroke="#fff" fill="#3b82f6">
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
    case 'kpi':
      const total = data.reduce((s, r) => s + r.value, 0);
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-4xl font-bold">{formatValue(total)}</div>
          <div className="text-sm text-slate-500 mt-1">Total ({data.length} groups)</div>
        </div>
      );
    case 'table':
      return (
        <div className="overflow-auto max-h-full w-full">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs">Label</th>
                <th className="px-3 py-2 text-right text-xs">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((row, i) => (
                <tr key={i}>
                  <td className="px-3 py-2">{row.label}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatValue(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'map':
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-500">
          <Map className="w-10 h-10 mb-2" />
          <p className="text-sm">Map requires geographic data</p>
        </div>
      );
    default:
      return <div>Unknown chart</div>;
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
  if (Math.abs(value) >= 1000000) return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(value);
  if (Math.abs(value) >= 1000) return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
}

export default VisualBuilderV7;
