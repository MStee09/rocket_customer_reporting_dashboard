/**
 * Visual Builder V5.1 - ENHANCED
 * 
 * Based on V5 (working AI) with additions:
 * 1. Editable filters with delete functionality
 * 2. Date range presets dropdown (matches dashboards)
 * 3. Publish destination selector (Pulse Dashboard vs Analytics Hub)
 * 4. Raw data export to CSV
 * 
 * Original V5 features preserved:
 * - SECURITY: Admin-only columns hidden from customers
 * - AI: Better prompt engineering for correct grouping
 * - DATA: Proper validation and formatting
 */

import React, { useState, useCallback, useMemo } from 'react';
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
  AlertTriangle,
  Download,
  Trash2,
  Plus,
  Layout,
  BarChart2,
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
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

// =============================================================================
// TYPES
// =============================================================================

type ChartType = 'bar' | 'line' | 'pie' | 'kpi' | 'table' | 'area';
type BuilderMode = 'ai' | 'manual';
type Aggregation = 'sum' | 'avg' | 'count' | 'min' | 'max';
type DateRangePreset = 'last7' | 'last30' | 'last90' | 'thisMonth' | 'lastMonth';
type PublishDestination = 'pulse' | 'analytics';
type PulseSection = 'key_metrics' | 'shipment_analysis' | 'financial_overview' | 'custom';
type AnalyticsSection = 'overview' | 'trends' | 'comparisons' | 'custom';

const DATE_PRESETS: Array<{ value: DateRangePreset; label: string }> = [
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'last90', label: 'Last 90 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
];

interface Column {
  id: string;
  label: string;
  category: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  description?: string;
  adminOnly?: boolean; // SECURITY: true = hidden from customers
}

interface AIConfig {
  title: string;
  xAxis: string;
  yAxis: string;
  aggregation: string;
  filters: Array<{ field: string; operator: string; value: string }>;
  searchTerms: string[];
  groupingLogic?: string;
}

interface EditableFilter {
  id: string;
  field: string;
  operator: 'contains' | 'equals' | 'gt' | 'lt';
  value: string;
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
// COLUMN DEFINITIONS WITH SECURITY FLAGS
// =============================================================================

const ALL_COLUMNS: Column[] = [
  // ============ SHIPMENT INFO ============
  { id: 'load_id', label: 'Load ID', category: 'shipment', type: 'number', description: 'Unique shipment identifier' },
  { id: 'reference_number', label: 'Reference Number', category: 'shipment', type: 'string' },
  { id: 'bol_number', label: 'BOL Number', category: 'shipment', type: 'string' },
  { id: 'pro_number', label: 'PRO Number', category: 'shipment', type: 'string' },
  { id: 'po_reference', label: 'PO Reference', category: 'shipment', type: 'string' },
  { id: 'status_name', label: 'Status', category: 'shipment', type: 'string', description: 'Current shipment status' },
  { id: 'mode_name', label: 'Mode', category: 'shipment', type: 'string', description: 'LTL, TL, Parcel, etc.' },
  { id: 'equipment_name', label: 'Equipment Type', category: 'shipment', type: 'string' },
  { id: 'service_type', label: 'Service Type', category: 'shipment', type: 'string' },
  { id: 'pickup_date', label: 'Pickup Date', category: 'shipment', type: 'date' },
  { id: 'delivery_date', label: 'Delivery Date', category: 'shipment', type: 'date' },
  { id: 'shipped_date', label: 'Shipped Date', category: 'shipment', type: 'date' },
  { id: 'created_date', label: 'Created Date', category: 'shipment', type: 'date' },
  { id: 'miles', label: 'Miles', category: 'shipment', type: 'number', description: 'Distance in miles' },
  { id: 'weight', label: 'Weight (lbs)', category: 'shipment', type: 'number' },
  { id: 'number_of_pallets', label: 'Pallets', category: 'shipment', type: 'number' },
  { id: 'linear_feet', label: 'Linear Feet', category: 'shipment', type: 'number' },
  { id: 'is_completed', label: 'Is Completed', category: 'shipment', type: 'boolean' },
  { id: 'is_cancelled', label: 'Is Cancelled', category: 'shipment', type: 'boolean' },
  { id: 'is_late', label: 'Is Late', category: 'shipment', type: 'boolean' },

  // ============ FINANCIAL - CUSTOMER VISIBLE ============
  { id: 'retail', label: 'Retail (Your Charge)', category: 'financial', type: 'number', description: 'Amount you pay for shipping' },
  { id: 'retail_without_tax', label: 'Retail (No Tax)', category: 'financial', type: 'number' },
  { id: 'fuel_surcharge', label: 'Fuel Surcharge', category: 'financial', type: 'number' },
  { id: 'accessorial_total', label: 'Accessorial Charges', category: 'financial', type: 'number' },
  { id: 'shipment_value', label: 'Declared Value', category: 'financial', type: 'number' },

  // ============ FINANCIAL - ADMIN ONLY (SENSITIVE) ============
  { id: 'cost', label: 'Cost (Carrier Pay)', category: 'financial', type: 'number', description: 'Amount paid to carrier', adminOnly: true },
  { id: 'cost_without_tax', label: 'Cost (No Tax)', category: 'financial', type: 'number', adminOnly: true },
  { id: 'margin', label: 'Margin ($)', category: 'financial', type: 'number', description: 'Profit margin in dollars', adminOnly: true },
  { id: 'margin_percent', label: 'Margin (%)', category: 'financial', type: 'number', description: 'Profit margin percentage', adminOnly: true },
  { id: 'linehaul', label: 'Linehaul Cost', category: 'financial', type: 'number', adminOnly: true },
  { id: 'carrier_total', label: 'Carrier Total', category: 'financial', type: 'number', adminOnly: true },
  { id: 'target_rate', label: 'Target Rate', category: 'financial', type: 'number', adminOnly: true },

  // ============ ORIGIN ============
  { id: 'origin_city', label: 'Origin City', category: 'origin', type: 'string' },
  { id: 'origin_state', label: 'Origin State', category: 'origin', type: 'string' },
  { id: 'origin_zip', label: 'Origin ZIP', category: 'origin', type: 'string' },
  { id: 'origin_country', label: 'Origin Country', category: 'origin', type: 'string' },
  { id: 'shipper_name', label: 'Shipper Name', category: 'origin', type: 'string' },

  // ============ DESTINATION ============
  { id: 'dest_city', label: 'Destination City', category: 'destination', type: 'string' },
  { id: 'dest_state', label: 'Destination State', category: 'destination', type: 'string' },
  { id: 'dest_zip', label: 'Destination ZIP', category: 'destination', type: 'string' },
  { id: 'dest_country', label: 'Destination Country', category: 'destination', type: 'string' },
  { id: 'consignee_name', label: 'Consignee Name', category: 'destination', type: 'string' },

  // ============ CARRIER ============
  { id: 'carrier_name', label: 'Carrier Name', category: 'carrier', type: 'string', description: 'Trucking company' },
  { id: 'carrier_code', label: 'Carrier Code', category: 'carrier', type: 'string' },
  { id: 'scac', label: 'SCAC Code', category: 'carrier', type: 'string' },
  { id: 'carrier_pro', label: 'Carrier PRO #', category: 'carrier', type: 'string' },

  // ============ PRODUCTS / LINE ITEMS ============
  { id: 'item_description', label: 'Product Description', category: 'products', type: 'string', description: 'Item/product name' },
  { id: 'item_descriptions', label: 'All Products', category: 'products', type: 'string', description: 'All products in shipment' },
  { id: 'commodity', label: 'Commodity', category: 'products', type: 'string' },
  { id: 'freight_class', label: 'Freight Class', category: 'products', type: 'string' },
  { id: 'nmfc_code', label: 'NMFC Code', category: 'products', type: 'string' },
  { id: 'sku', label: 'SKU', category: 'products', type: 'string' },
  { id: 'package_type', label: 'Package Type', category: 'products', type: 'string' },
  { id: 'item_weight', label: 'Item Weight', category: 'products', type: 'number' },
  { id: 'item_quantity', label: 'Item Quantity', category: 'products', type: 'number' },
  { id: 'item_count', label: 'Line Item Count', category: 'products', type: 'number' },
  { id: 'declared_value', label: 'Declared Value', category: 'products', type: 'number' },
  { id: 'has_hazmat', label: 'Has Hazmat', category: 'products', type: 'boolean' },

  // ============ CUSTOMER ============
  { id: 'customer_name', label: 'Customer Name', category: 'customer', type: 'string' },
  { id: 'customer_id', label: 'Customer ID', category: 'customer', type: 'number' },

  // ============ TIME PERIODS (for grouping) ============
  { id: 'pickup_month', label: 'Pickup Month', category: 'time', type: 'string', description: 'YYYY-MM format' },
  { id: 'pickup_week', label: 'Pickup Week', category: 'time', type: 'string' },
  { id: 'pickup_year', label: 'Pickup Year', category: 'time', type: 'number' },
  { id: 'day_of_week', label: 'Day of Week', category: 'time', type: 'string' },
];

// Admin-only column IDs for quick lookup
const ADMIN_ONLY_COLUMNS = new Set(
  ALL_COLUMNS.filter(c => c.adminOnly).map(c => c.id)
);

const CATEGORIES: Record<string, { label: string; icon: React.ElementType }> = {
  shipment: { label: 'Shipment Info', icon: Package },
  financial: { label: 'Financial', icon: DollarSign },
  origin: { label: 'Origin', icon: MapPin },
  destination: { label: 'Destination', icon: Flag },
  carrier: { label: 'Carrier', icon: Truck },
  products: { label: 'Products', icon: Box },
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

const AGGREGATIONS: Array<{ value: Aggregation; label: string; description: string }> = [
  { value: 'sum', label: 'Sum', description: 'Add up all values' },
  { value: 'avg', label: 'Average', description: 'Calculate the mean' },
  { value: 'count', label: 'Count', description: 'Count number of records' },
  { value: 'min', label: 'Minimum', description: 'Find the smallest value' },
  { value: 'max', label: 'Maximum', description: 'Find the largest value' },
];

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#64748b', '#0891b2'];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function VisualBuilderV5_1() {
  const navigate = useNavigate();
  const { user, isAdmin, isViewingAsCustomer, effectiveCustomerId, customers } = useAuth();

  // SECURITY: Determine if user can see admin-only columns
  const canSeeAdminColumns = isAdmin() && !isViewingAsCustomer;

  // Get filtered columns based on user permissions
  const availableColumns = useMemo(() => {
    if (canSeeAdminColumns) {
      return ALL_COLUMNS;
    }
    // Filter out admin-only columns for customers
    return ALL_COLUMNS.filter(col => !col.adminOnly);
  }, [canSeeAdminColumns]);

  // Target scope
  const [targetScope, setTargetScope] = useState<'admin' | 'customer'>(
    canSeeAdminColumns ? 'admin' : 'customer'
  );
  const [targetCustomerId, setTargetCustomerId] = useState<number | null>(null);

  // Mode
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

  // Date range - now with presets
  const [datePreset, setDatePreset] = useState<DateRangePreset>('last30');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Visibility
  const [visibility, setVisibility] = useState<'admin_only' | 'all_customers' | 'private'>('admin_only');

  // Publish destination
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishDestination, setPublishDestination] = useState<PublishDestination>('pulse');
  const [pulseSection, setPulseSection] = useState<PulseSection>('custom');
  const [analyticsSection, setAnalyticsSection] = useState<AnalyticsSection>('custom');

  // Editable filters
  const [editableFilters, setEditableFilters] = useState<EditableFilter[]>([]);
  const [showRawData, setShowRawData] = useState(false);

  // =============================================================================
  // AI MODE - IMPROVED PROMPT
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

      // IMPROVED: Build a more specific prompt for the AI
      const improvedPrompt = buildAIPrompt(aiPrompt, canSeeAdminColumns);

      const response = await fetch(`${supabaseUrl}/functions/v1/investigate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          question: improvedPrompt,
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

      setAiReasoning(data.reasoning || []);

      if (data.visualizations && data.visualizations.length > 0) {
        const viz = data.visualizations[0];
        const vizData = viz.data?.data || [];

        // SECURITY: Filter out any admin-only data if user is not admin
        const secureData = canSeeAdminColumns ? vizData : filterAdminData(vizData);

        const aiConfig = parseAIConfig(data.reasoning || [], viz, aiPrompt);

        // Sync editable filters from AI search terms
        if (aiConfig.searchTerms.length > 0) {
          syncFiltersFromAI(aiConfig.searchTerms);
        }

        setConfig(prev => ({
          ...prev,
          name: viz.title || '',
          description: viz.subtitle || aiPrompt,
          chartType: mapAIChartType(viz.type),
          data: secureData,
          aiConfig,
        }));
      } else {
        throw new Error('AI could not generate visualization. Try being more specific about what metric you want (sum, average, count) and how to group the data.');
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI request failed');
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, aiLoading, targetScope, targetCustomerId, effectiveCustomerId, user?.id, canSeeAdminColumns]);

  // Build improved AI prompt
  const buildAIPrompt = (userPrompt: string, isAdminUser: boolean): string => {
    const restrictedFields = isAdminUser ? '' : `
IMPORTANT: This user is a CUSTOMER. Never include or reference these fields: cost, margin, margin_percent, carrier_total, linehaul, target_rate, cost_without_tax. Only use 'retail' for financial data.`;

    return `Create a dashboard widget visualization.

User request: "${userPrompt}"

Instructions:
1. If the user mentions specific products/terms (like "drawer system", "cargoglide"), search for those terms and GROUP the results by those categories, not by individual product names
2. Use the appropriate aggregation: 
   - "average cost" or "avg" = use AVG aggregation
   - "total" or "sum" = use SUM aggregation  
   - "how many" or "count" = use COUNT aggregation
3. Return the aggregated VALUE, not counts of records (unless count was requested)
4. Limit results to top 10-15 groups maximum
${restrictedFields}

Return a clear visualization with properly aggregated data.`;
  };

  // Filter out admin data from AI results (defense in depth)
  const filterAdminData = (data: Array<{ label: string; value: number }>): Array<{ label: string; value: number }> => {
    // Check if any labels contain admin-only terms
    const adminTerms = ['cost', 'margin', 'carrier pay', 'linehaul', 'profit'];
    return data.filter(item => {
      const labelLower = item.label.toLowerCase();
      return !adminTerms.some(term => labelLower.includes(term));
    });
  };

  const parseAIConfig = (
    reasoning: Array<{ type: string; content: string; toolName?: string }>,
    viz: any,
    originalPrompt: string
  ): AIConfig => {
    const config: AIConfig = {
      title: viz.title || '',
      xAxis: viz.config?.groupBy || '',
      yAxis: viz.config?.metric || '',
      aggregation: '',
      filters: [],
      searchTerms: [],
      groupingLogic: '',
    };

    // Extract search terms from the original prompt
    const quotedTerms = originalPrompt.match(/"([^"]+)"/g);
    if (quotedTerms) {
      config.searchTerms = quotedTerms.map(t => t.replace(/"/g, ''));
    }

    // Also look for common product terms
    const productTerms = ['drawer', 'cargoglide', 'toolbox', 'cargo glide', 'drawer system'];
    productTerms.forEach(term => {
      if (originalPrompt.toLowerCase().includes(term) && !config.searchTerms.includes(term)) {
        config.searchTerms.push(term);
      }
    });

    // Extract aggregation from reasoning
    for (const step of reasoning) {
      if (step.content) {
        const content = step.content.toLowerCase();
        if (content.includes('avg(') || content.includes('average')) config.aggregation = 'AVG';
        else if (content.includes('sum(')) config.aggregation = 'SUM';
        else if (content.includes('count(')) config.aggregation = 'COUNT';

        // Look for ILIKE filters
        const ilikeMatches = step.content.match(/ILIKE\s+'%([^%]+)%'/gi);
        if (ilikeMatches) {
          ilikeMatches.forEach(match => {
            const term = match.match(/'%([^%]+)%'/)?.[1];
            if (term && !config.searchTerms.includes(term)) {
              config.searchTerms.push(term);
            }
          });
        }
      }
    }

    if (config.searchTerms.length > 0) {
      config.groupingLogic = `Grouped by products matching: ${config.searchTerms.join(', ')}`;
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
  // DATE RANGE HELPERS
  // =============================================================================

  const updateDateRange = useCallback((preset: DateRangePreset) => {
    setDatePreset(preset);
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start: string;

    switch (preset) {
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

    setDateRange({ start, end });
  }, []);

  // =============================================================================
  // EDITABLE FILTERS
  // =============================================================================

  const addFilter = useCallback(() => {
    const newFilter: EditableFilter = {
      id: `filter_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      field: 'item_description',
      operator: 'contains',
      value: '',
    };
    setEditableFilters(prev => [...prev, newFilter]);
  }, []);

  const updateFilter = useCallback((id: string, updates: Partial<EditableFilter>) => {
    setEditableFilters(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  const removeFilter = useCallback((id: string) => {
    setEditableFilters(prev => prev.filter(f => f.id !== id));
  }, []);

  // Sync AI search terms to editable filters when AI returns results
  const syncFiltersFromAI = useCallback((searchTerms: string[]) => {
    const newFilters: EditableFilter[] = searchTerms.map((term, i) => ({
      id: `ai_filter_${Date.now()}_${i}`,
      field: 'item_description',
      operator: 'contains' as const,
      value: term,
    }));
    setEditableFilters(newFilters);
  }, []);

  // =============================================================================
  // CSV EXPORT
  // =============================================================================

  const exportToCSV = useCallback(() => {
    if (!config.data) return;
    
    const groupCol = availableColumns.find(c => c.id === config.groupByColumn);
    const metricCol = availableColumns.find(c => c.id === config.metricColumn);
    
    const headers = [
      groupCol?.label || config.aiConfig?.xAxis || 'Category',
      `${config.aggregation.toUpperCase()} of ${metricCol?.label || config.aiConfig?.yAxis || 'Value'}`
    ];
    const rows = config.data.map(d => [d.label, d.value]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name || 'widget_data'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [config, availableColumns]);

  // =============================================================================
  // MANUAL MODE
  // =============================================================================

  const handleRunQuery = useCallback(async () => {
    if (!config.groupByColumn || !config.metricColumn) {
      setPreviewError('Select both Group By and Metric columns');
      return;
    }

    // SECURITY: Verify selected columns are allowed
    if (!canSeeAdminColumns) {
      if (ADMIN_ONLY_COLUMNS.has(config.metricColumn) || ADMIN_ONLY_COLUMNS.has(config.groupByColumn)) {
        setPreviewError('Access denied: You do not have permission to view this data');
        return;
      }
    }

    setPreviewLoading(true);
    setPreviewError(null);

    try {
      const groupCol = availableColumns.find(c => c.id === config.groupByColumn);
      const metricCol = availableColumns.find(c => c.id === config.metricColumn);

      if (!groupCol || !metricCol) {
        throw new Error('Invalid column selection');
      }

      const { data, error } = await supabase.rpc('mcp_aggregate', {
        p_table_name: 'shipment',
        p_customer_id: targetScope === 'admin' ? 0 : (targetCustomerId || effectiveCustomerId || 0),
        p_is_admin: targetScope === 'admin' && canSeeAdminColumns,
        p_group_by: config.groupByColumn,
        p_metric: config.metricColumn,
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

      const chartData = rows.map((row: any) => {
        const labelKey = Object.keys(row).find(k => typeof row[k] === 'string') || config.groupByColumn;
        const valueKey = Object.keys(row).find(k =>
          k.includes(config.aggregation!) ||
          k === 'value' ||
          (typeof row[k] === 'number' && k !== labelKey)
        );
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
  }, [config.groupByColumn, config.metricColumn, config.aggregation, targetScope, targetCustomerId, effectiveCustomerId, dateRange, canSeeAdminColumns, availableColumns]);

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
        source: mode === 'ai' ? 'ai' : 'manual',
        createdBy: {
          userId: user?.id,
          userEmail: user?.email,
          isAdmin: isAdmin(),
          timestamp: new Date().toISOString(),
        },
        // NEW: Publish destination
        destination: publishDestination,
        section: publishDestination === 'pulse' ? pulseSection : analyticsSection,
        visibility: { type: visibility },
        // SECURITY: Mark if widget contains admin-only data
        containsAdminData: config.metricColumn ? ADMIN_ONLY_COLUMNS.has(config.metricColumn) : false,
        dataSource: {
          groupByColumn: config.groupByColumn,
          metricColumn: config.metricColumn,
          aggregation: config.aggregation,
          filters: editableFilters,
          aiConfig: config.aiConfig,
          datePreset,
        },
        visualization: {
          type: config.chartType,
          data: config.data,
        },
        createdAt: new Date().toISOString(),
      };

      // NEW: Storage path based on destination
      const basePath = publishDestination === 'pulse' ? 'pulse-widgets' : 'analytics-widgets';
      const visPath = visibility === 'admin_only' ? 'admin' : 'shared';
      const storagePath = `${basePath}/${visPath}/${widgetId}.json`;

      const { error } = await supabase.storage
        .from('custom-widgets')
        .upload(storagePath, JSON.stringify(widgetDefinition, null, 2), {
          contentType: 'application/json',
          upsert: true,
        });

      if (error) throw error;

      setPublishResult({ success: true, message: `Widget "${config.name}" published to ${publishDestination === 'pulse' ? 'Pulse Dashboard' : 'Analytics Hub'}!` });
      setShowPublishModal(false);
    } catch (err) {
      setPublishResult({ success: false, message: err instanceof Error ? err.message : 'Publish failed' });
    } finally {
      setIsPublishing(false);
    }
  }, [config, mode, visibility, user, isAdmin, effectiveCustomerId, publishDestination, pulseSection, analyticsSection, editableFilters, datePreset]);

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

            <div className="flex items-center gap-3">
              {/* Security indicator */}
              {canSeeAdminColumns && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                  <Shield className="w-3 h-3" />
                  Admin Access
                </div>
              )}

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
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Scope Selector - Only show for admins */}
        {canSeeAdminColumns && (
          <ScopeSelector
            targetScope={targetScope}
            setTargetScope={setTargetScope}
            targetCustomerId={targetCustomerId}
            setTargetCustomerId={setTargetCustomerId}
            customers={customers}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Left: Configuration */}
          <div className="space-y-6">
            {mode === 'ai' ? (
              <AISection
                prompt={aiPrompt}
                setPrompt={setAiPrompt}
                loading={aiLoading}
                error={aiError}
                reasoning={aiReasoning}
                config={config}
                onSubmit={handleAISubmit}
                onEdit={() => setMode('manual')}
                canSeeAdminColumns={canSeeAdminColumns}
                editableFilters={editableFilters}
                addFilter={addFilter}
                updateFilter={updateFilter}
                removeFilter={removeFilter}
                exportToCSV={exportToCSV}
                showRawData={showRawData}
                setShowRawData={setShowRawData}
              />
            ) : (
              <ManualSection
                config={config}
                setConfig={setConfig}
                columns={availableColumns}
                onRunQuery={handleRunQuery}
                previewLoading={previewLoading}
                canSeeAdminColumns={canSeeAdminColumns}
              />
            )}

            <PublishSection
              config={config}
              setConfig={setConfig}
              onPublish={() => setShowPublishModal(true)}
              isPublishing={isPublishing}
              publishResult={publishResult}
              canSeeAdminColumns={canSeeAdminColumns}
            />
          </div>

          {/* Right: Preview */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <PreviewSection
              config={config}
              datePreset={datePreset}
              setDatePreset={updateDateRange}
              showDateDropdown={showDateDropdown}
              setShowDateDropdown={setShowDateDropdown}
              loading={previewLoading || aiLoading}
              error={previewError || aiError}
              onRefresh={mode === 'manual' ? handleRunQuery : handleAISubmit}
            />
          </div>
        </div>
      </main>

      {/* PUBLISH MODAL */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Publish Widget</h2>
              <button onClick={() => setShowPublishModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Destination */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Where do you want this widget?</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPublishDestination('pulse')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      publishDestination === 'pulse' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Layout className={`w-6 h-6 ${publishDestination === 'pulse' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className={`text-sm font-medium ${publishDestination === 'pulse' ? 'text-blue-700' : 'text-slate-700'}`}>
                      Pulse Dashboard
                    </span>
                  </button>
                  <button
                    onClick={() => setPublishDestination('analytics')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      publishDestination === 'analytics' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <BarChart2 className={`w-6 h-6 ${publishDestination === 'analytics' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className={`text-sm font-medium ${publishDestination === 'analytics' ? 'text-blue-700' : 'text-slate-700'}`}>
                      Analytics Hub
                    </span>
                  </button>
                </div>
              </div>

              {/* Section */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Section</label>
                {publishDestination === 'pulse' ? (
                  <select
                    value={pulseSection}
                    onChange={(e) => setPulseSection(e.target.value as PulseSection)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="key_metrics">Key Metrics (Top)</option>
                    <option value="shipment_analysis">Shipment Analysis</option>
                    <option value="financial_overview">Financial Overview</option>
                    <option value="custom">Custom Section (Bottom)</option>
                  </select>
                ) : (
                  <select
                    value={analyticsSection}
                    onChange={(e) => setAnalyticsSection(e.target.value as AnalyticsSection)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
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
                <div className="flex gap-2">
                  <button
                    onClick={() => setVisibility('admin_only')}
                    className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg border text-sm ${
                      visibility === 'admin_only' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Admin Only
                  </button>
                  <button
                    onClick={() => setVisibility('all_customers')}
                    className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg border text-sm ${
                      visibility === 'all_customers' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    All Customers
                  </button>
                  <button
                    onClick={() => setVisibility('private')}
                    className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg border text-sm ${
                      visibility === 'private' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    Private
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-slate-400"
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
// SCOPE SELECTOR
// =============================================================================

function ScopeSelector({
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
      <h2 className="text-sm font-semibold text-slate-900 mb-3">Data Scope</h2>
      <div className="flex gap-3">
        <button
          onClick={() => setTargetScope('admin')}
          className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
            targetScope === 'admin' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
          }`}
        >
          <Shield className={`w-4 h-4 ${targetScope === 'admin' ? 'text-blue-600' : 'text-slate-400'}`} />
          <span className={`text-sm font-medium ${targetScope === 'admin' ? 'text-blue-900' : 'text-slate-700'}`}>
            All Customers
          </span>
        </button>
        <button
          onClick={() => setTargetScope('customer')}
          className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
            targetScope === 'customer' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
          }`}
        >
          <Users className={`w-4 h-4 ${targetScope === 'customer' ? 'text-blue-600' : 'text-slate-400'}`} />
          <span className={`text-sm font-medium ${targetScope === 'customer' ? 'text-blue-900' : 'text-slate-700'}`}>
            Specific Customer
          </span>
        </button>
      </div>
      {targetScope === 'customer' && customers && (
        <select
          value={targetCustomerId || ''}
          onChange={(e) => setTargetCustomerId(Number(e.target.value) || null)}
          className="w-full mt-3 px-3 py-2 border border-slate-200 rounded-lg text-sm"
        >
          <option value="">Select customer...</option>
          {customers.map((c: any) => (
            <option key={c.customer_id} value={c.customer_id}>{c.customer_name}</option>
          ))}
        </select>
      )}
    </div>
  );
}

// =============================================================================
// AI SECTION
// =============================================================================

function AISection({
  prompt,
  setPrompt,
  loading,
  error,
  reasoning,
  config,
  onSubmit,
  onEdit,
  canSeeAdminColumns,
  editableFilters,
  addFilter,
  updateFilter,
  removeFilter,
  exportToCSV,
  showRawData,
  setShowRawData,
}: {
  prompt: string;
  setPrompt: (p: string) => void;
  loading: boolean;
  error: string | null;
  reasoning: Array<{ type: string; content: string; toolName?: string }>;
  config: WidgetConfig;
  onSubmit: () => void;
  onEdit: () => void;
  canSeeAdminColumns: boolean;
  editableFilters: EditableFilter[];
  addFilter: () => void;
  updateFilter: (id: string, updates: Partial<EditableFilter>) => void;
  removeFilter: (id: string) => void;
  exportToCSV: () => void;
  showRawData: boolean;
  setShowRawData: (show: boolean) => void;
}) {
  const [showReasoning, setShowReasoning] = useState(false);
  const hasData = config.data && config.data.length > 0;

  const examplePrompts = canSeeAdminColumns
    ? [
        'Average cost per shipment by carrier',
        'Total margin by destination state',
        'Shipment count by mode',
        'Average retail for drawer system products',
      ]
    : [
        'Total shipping charges by carrier',
        'Shipment count by destination state',
        'Average weight by mode',
        'Monthly shipping spend trend',
      ];

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Describe Your Widget</h3>
            <p className="text-xs text-slate-600">Be specific about metric (sum, average, count) and grouping</p>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: Show average shipping cost by carrier for the last 30 days"
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

        <div className="flex flex-wrap gap-2 mt-2">
          <span className="text-xs text-slate-500">Try:</span>
          {examplePrompts.map((ex, i) => (
            <button
              key={i}
              onClick={() => setPrompt(ex)}
              className="px-2 py-0.5 text-xs bg-white border border-slate-200 rounded-full hover:border-blue-300 truncate max-w-[200px]"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            <span className="text-slate-700 text-sm">AI is analyzing your request...</span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900 text-sm">Error</p>
              <p className="text-xs text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {hasData && !loading && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-green-50">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm">{config.name || 'Widget Generated'}</h4>
                  <p className="text-xs text-slate-600">{config.data?.length} data points</p>
                </div>
              </div>
              <button
                onClick={onEdit}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <Edit3 className="w-3 h-3" />
                Edit
              </button>
            </div>
          </div>

          {config.aiConfig && (
            <div className="p-4 border-b border-slate-100 text-sm">
              <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Configuration</h5>
              <div className="space-y-1.5">
                {config.aiConfig.xAxis && (
                  <div className="flex gap-2">
                    <span className="text-slate-500 w-16">X-Axis:</span>
                    <span className="font-medium text-slate-900">{formatFieldName(config.aiConfig.xAxis)}</span>
                  </div>
                )}
                {config.aiConfig.yAxis && (
                  <div className="flex gap-2">
                    <span className="text-slate-500 w-16">Y-Axis:</span>
                    <span className="font-medium text-slate-900">
                      {config.aiConfig.aggregation || 'Value'} of {formatFieldName(config.aiConfig.yAxis)}
                    </span>
                  </div>
                )}
                {config.aiConfig.searchTerms.length > 0 && (
                  <div className="flex gap-2">
                    <span className="text-slate-500 w-16">Filters:</span>
                    <div className="flex flex-wrap gap-1">
                      {config.aiConfig.searchTerms.map((term, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          {term}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {config.aiConfig.groupingLogic && (
                  <div className="text-xs text-slate-500 italic mt-2">{config.aiConfig.groupingLogic}</div>
                )}
              </div>
            </div>
          )}

          {/* EDITABLE FILTERS SECTION */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-semibold text-slate-500 uppercase">Filters</h5>
              <button
                onClick={addFilter}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
            {editableFilters.length === 0 ? (
              <p className="text-xs text-slate-400">No filters applied</p>
            ) : (
              <div className="space-y-2">
                {editableFilters.map((filter) => (
                  <div key={filter.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                    <select
                      value={filter.field}
                      onChange={(e) => updateFilter(filter.id, { field: e.target.value })}
                      className="flex-1 px-2 py-1 border rounded text-xs bg-white"
                    >
                      <option value="item_description">Product Description</option>
                      <option value="carrier_name">Carrier</option>
                      <option value="origin_state">Origin State</option>
                      <option value="dest_state">Dest State</option>
                      <option value="mode_name">Mode</option>
                      <option value="status_name">Status</option>
                    </select>
                    <select
                      value={filter.operator}
                      onChange={(e) => updateFilter(filter.id, { operator: e.target.value as any })}
                      className="px-2 py-1 border rounded text-xs bg-white"
                    >
                      <option value="contains">Contains</option>
                      <option value="equals">Equals</option>
                      <option value="gt">{'>'}</option>
                      <option value="lt">{'<'}</option>
                    </select>
                    <input
                      type="text"
                      value={filter.value}
                      onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                      placeholder="Value"
                      className="flex-1 px-2 py-1 border rounded text-xs"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeFilter(filter.id);
                      }}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DATA PREVIEW WITH EXPORT */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setShowRawData(!showRawData)}
                className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase"
              >
                <Database className="w-3 h-3" />
                Data Preview
                {showRawData ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              {config.data && (
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                >
                  <Download className="w-3 h-3" />
                  Export CSV
                </button>
              )}
            </div>
            {showRawData && (
              <div className="space-y-1">
                {config.data?.map((row, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 truncate mr-4">{row.label}</span>
                    <span className="font-medium text-slate-900 tabular-nums">{formatValue(row.value)}</span>
                  </div>
                ))}
              </div>
            )}
            {!showRawData && (
              <div className="space-y-1">
                {config.data?.slice(0, 5).map((row, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 truncate mr-4">{row.label}</span>
                    <span className="font-medium text-slate-900 tabular-nums">{formatValue(row.value)}</span>
                  </div>
                ))}
                {config.data && config.data.length > 5 && (
                  <div className="text-xs text-slate-500 pt-1">+ {config.data.length - 5} more...</div>
                )}
              </div>
            )}
          </div>

          {reasoning.length > 0 && (
            <div>
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="w-full px-4 py-2 flex items-center justify-between text-xs text-slate-600 hover:bg-slate-50"
              >
                <span>AI Reasoning ({reasoning.length} steps)</span>
                {showReasoning ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              {showReasoning && (
                <div className="px-4 pb-3 max-h-40 overflow-y-auto">
                  <div className="space-y-1 text-xs font-mono">
                    {reasoning.slice(0, 15).map((step, i) => (
                      <div key={i} className="flex gap-2 py-0.5">
                        <span className={`px-1 py-0.5 rounded text-[10px] ${
                          step.type === 'tool_call' ? 'bg-orange-100 text-orange-700' :
                          step.type === 'tool_result' ? 'bg-green-100 text-green-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {step.toolName || step.type}
                        </span>
                        <span className="text-slate-600 truncate">{step.content?.slice(0, 80)}</span>
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
// MANUAL SECTION
// =============================================================================

function ManualSection({
  config,
  setConfig,
  columns,
  onRunQuery,
  previewLoading,
  canSeeAdminColumns,
}: {
  config: WidgetConfig;
  setConfig: React.Dispatch<React.SetStateAction<WidgetConfig>>;
  columns: Column[];
  onRunQuery: () => void;
  previewLoading: boolean;
  canSeeAdminColumns: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Security Warning for Customers */}
      {!canSeeAdminColumns && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            You're viewing customer-safe data only. Cost and margin fields are not available.
          </p>
        </div>
      )}

      {/* Chart Type */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-900 text-sm mb-3">Chart Type</h3>
        <div className="grid grid-cols-6 gap-2">
          {CHART_TYPES.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => setConfig(prev => ({ ...prev, chartType: type }))}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${
                config.chartType === type ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
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

      {/* Group By */}
      <ColumnPicker
        title="Group By (X-Axis)"
        subtitle="What do you want to compare?"
        columns={columns}
        selectedColumn={config.groupByColumn}
        onSelect={(col) => setConfig(prev => ({ ...prev, groupByColumn: col }))}
        highlightColor="blue"
      />

      {/* Metric */}
      <ColumnPicker
        title="Metric (Y-Axis)"
        subtitle="What do you want to measure?"
        columns={columns}
        selectedColumn={config.metricColumn}
        onSelect={(col) => setConfig(prev => ({ ...prev, metricColumn: col }))}
        highlightColor="green"
      />

      {/* Aggregation */}
      {config.metricColumn && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900 text-sm mb-2">Aggregation</h3>
          <p className="text-xs text-slate-500 mb-3">How should values be combined?</p>
          <div className="grid grid-cols-5 gap-2">
            {AGGREGATIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setConfig(prev => ({ ...prev, aggregation: value }))}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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

      {/* Run Query */}
      <button
        onClick={onRunQuery}
        disabled={!config.groupByColumn || !config.metricColumn || previewLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed font-medium text-sm"
      >
        {previewLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Running...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Run Query
          </>
        )}
      </button>
    </div>
  );
}

// =============================================================================
// COLUMN PICKER - Both X and Y use same columns
// =============================================================================

function ColumnPicker({
  title,
  subtitle,
  columns,
  selectedColumn,
  onSelect,
  highlightColor,
}: {
  title: string;
  subtitle: string;
  columns: Column[];
  selectedColumn: string | null;
  onSelect: (col: string | null) => void;
  highlightColor: 'blue' | 'green';
}) {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const filteredColumns = useMemo(() => {
    if (!search) return columns;
    const s = search.toLowerCase();
    return columns.filter(c =>
      c.label.toLowerCase().includes(s) ||
      c.id.toLowerCase().includes(s) ||
      c.description?.toLowerCase().includes(s) ||
      c.category.toLowerCase().includes(s)
    );
  }, [columns, search]);

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

  const selectedCol = columns.find(c => c.id === selectedColumn);
  const colorClasses = highlightColor === 'blue'
    ? { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', selected: 'bg-blue-100 text-blue-800' }
    : { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', selected: 'bg-green-100 text-green-800' };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
      <p className="text-xs text-slate-500 mb-3">{subtitle}</p>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search columns..."
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
        />
      </div>

      {selectedCol && (
        <div className={`flex items-center justify-between px-3 py-2 rounded-lg border mb-3 ${colorClasses.bg} ${colorClasses.border}`}>
          <div className="flex items-center gap-2">
            <CheckCircle className={`w-4 h-4 ${colorClasses.text}`} />
            <div>
              <span className={`text-sm font-medium ${colorClasses.text}`}>{selectedCol.label}</span>
              {selectedCol.adminOnly && (
                <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded">Admin</span>
              )}
            </div>
          </div>
          <button onClick={() => onSelect(null)} className={colorClasses.text}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg">
        {Object.entries(CATEGORIES).map(([catKey, { label, icon: Icon }]) => {
          const catColumns = byCategory[catKey] || [];
          if (catColumns.length === 0) return null;

          const isExpanded = expandedCategories.has(catKey) || search.length > 0;
          const hasAdminCols = catColumns.some(c => c.adminOnly);

          return (
            <div key={catKey} className="border-b border-slate-100 last:border-b-0">
              <button
                onClick={() => toggleCategory(catKey)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                  <span className="text-xs text-slate-400 bg-slate-100 px-1.5 rounded">{catColumns.length}</span>
                  {hasAdminCols && <Shield className="w-3 h-3 text-amber-500" />}
                </div>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>
              {isExpanded && (
                <div className="px-2 pb-2 space-y-0.5">
                  {catColumns.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => onSelect(col.id)}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                        selectedColumn === col.id ? colorClasses.selected : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{col.label}</span>
                        {col.adminOnly && (
                          <span className="px-1 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded">Admin</span>
                        )}
                      </div>
                      {col.description && <div className="text-xs text-slate-500">{col.description}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredColumns.length === 0 && (
          <div className="p-4 text-center text-sm text-slate-500">No columns match "{search}"</div>
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
  datePreset,
  setDatePreset,
  showDateDropdown,
  setShowDateDropdown,
  loading,
  error,
  onRefresh,
}: {
  config: WidgetConfig;
  datePreset: DateRangePreset;
  setDatePreset: (preset: DateRangePreset) => void;
  showDateDropdown: boolean;
  setShowDateDropdown: (show: boolean) => void;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 text-sm">Preview</h3>
        <div className="flex items-center gap-2">
          {/* Date Presets Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-xs hover:bg-slate-50"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              {DATE_PRESETS.find(p => p.value === datePreset)?.label}
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {showDateDropdown && (
              <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg z-20">
                {DATE_PRESETS.map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => {
                      setDatePreset(preset.value);
                      setShowDateDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg ${
                      datePreset === preset.value ? 'bg-orange-50 text-orange-700 font-medium' : 'text-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={onRefresh} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-4 min-h-[300px] flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 text-red-500 max-w-xs text-center">
            <AlertCircle className="w-6 h-6" />
            <span className="text-sm">{error}</span>
          </div>
        ) : !config.data || config.data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Eye className="w-8 h-8" />
            <span className="text-sm">Configure and run query to see preview</span>
          </div>
        ) : (
          <div className="w-full h-[280px]">
            <ChartRenderer type={config.chartType} data={config.data} />
          </div>
        )}
      </div>

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
  switch (type) {
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={formatValue} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => formatValue(v)} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    case 'line':
      return (
        <ResponsiveContainer width="100%" height="100%">
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
        <ResponsiveContainer width="100%" height="100%">
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
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPie>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}
              labelLine={{ strokeWidth: 1 }}
            >
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => formatValue(v)} />
          </RechartsPie>
        </ResponsiveContainer>
      );
    case 'kpi':
      const total = data.reduce((s, r) => s + r.value, 0);
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-4xl font-bold text-slate-900">{formatValue(total)}</div>
          <div className="text-sm text-slate-500 mt-2">Total ({data.length} items)</div>
        </div>
      );
    case 'table':
      return (
        <div className="overflow-auto max-h-full w-full">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Label</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-slate-900">{row.label}</td>
                  <td className="px-3 py-2 text-slate-900 text-right font-medium">{formatValue(row.value)}</td>
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
// PUBLISH SECTION
// =============================================================================

function PublishSection({
  config,
  setConfig,
  onPublish,
  isPublishing,
  publishResult,
  canSeeAdminColumns,
}: {
  config: WidgetConfig;
  setConfig: React.Dispatch<React.SetStateAction<WidgetConfig>>;
  onPublish: () => void;
  isPublishing: boolean;
  publishResult: { success: boolean; message: string } | null;
  canSeeAdminColumns: boolean;
}) {
  const canPublish = config.name.trim() && config.data && config.data.length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
      <h3 className="font-semibold text-slate-900 text-sm">Publish Widget</h3>

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

      <div>
        <label className="text-xs font-medium text-slate-700">Description</label>
        <textarea
          value={config.description}
          onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
          rows={2}
          placeholder="Brief description of this widget"
          className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
        />
      </div>

      {publishResult && (
        <div className={`p-3 rounded-lg text-sm ${
          publishResult.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {publishResult.message}
        </div>
      )}

      <button
        onClick={onPublish}
        disabled={!canPublish || isPublishing}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-400 font-semibold text-sm"
      >
        {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
        {isPublishing ? 'Publishing...' : 'Publish Widget'}
      </button>
    </div>
  );
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
