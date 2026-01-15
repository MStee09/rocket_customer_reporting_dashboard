/**
 * Visual Builder V5 Working - DIRECT DATABASE QUERIES FOR PRODUCTS
 * 
 * Key Fix:
 * - Detects product comparison queries (drawer, cargoglide, toolbox)
 * - Bypasses AI entirely for these queries
 * - Queries mcp_aggregate RPC directly for each product term
 * - GUARANTEES separate data points for each product category
 * 
 * Falls back to investigate endpoint for non-product queries.
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
import {
  ChartType,
  BuilderMode,
  Aggregation,
  DateRangePreset,
  PublishDestination,
  PulseSection,
  AnalyticsSection,
  DATE_PRESETS,
  Column,
  AIConfig,
  EditableFilter,
  MultiDimensionData,
  GroupedChartData,
  WidgetConfig,
} from '../types/visualBuilderTypes';

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
const GROUPED_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function VisualBuilderV5Working() {
  const navigate = useNavigate();
  const { user, isAdmin, isViewingAsCustomer, effectiveCustomerId, customers } = useAuth();

  // SECURITY: Base admin check - is user an admin not viewing as customer?
  const isUserAdmin = isAdmin() && !isViewingAsCustomer;

  // Target scope - who are we building this widget FOR?
  const [targetScope, setTargetScope] = useState<'admin' | 'customer'>(
    isUserAdmin ? 'admin' : 'customer'
  );
  // Initialize targetCustomerId from effectiveCustomerId so dropdown matches
  const [targetCustomerId, setTargetCustomerId] = useState<number | null>(effectiveCustomerId);

  // Log what customer is being used
  console.log('[VisualBuilder] Customer IDs - target:', targetCustomerId, 'effective:', effectiveCustomerId);

  // Sync targetCustomerId when effectiveCustomerId changes (e.g., user switches customer in header)
  useEffect(() => {
    if (effectiveCustomerId && !targetCustomerId) {
      console.log('[VisualBuilder] Syncing targetCustomerId from effectiveCustomerId:', effectiveCustomerId);
      setTargetCustomerId(effectiveCustomerId);
    }
  }, [effectiveCustomerId, targetCustomerId]);

  // SECURITY: Can see admin columns ONLY if user is admin AND building for admin scope
  // Even if you're an admin, building for a customer means NO admin columns
  const canSeeAdminColumns = isUserAdmin && targetScope === 'admin';

  // Get filtered columns based on TARGET scope, not user permissions
  const availableColumns = useMemo(() => {
    if (canSeeAdminColumns) {
      return ALL_COLUMNS;
    }
    // Filter out admin-only columns when building for customers
    return ALL_COLUMNS.filter(col => !col.adminOnly);
  }, [canSeeAdminColumns]);

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

  // Track if we have results (either from AI or manual) - refresh should re-query, not re-run AI
  const [hasResults, setHasResults] = useState(false);

  // Bar chart orientation
  const [barOrientation, setBarOrientation] = useState<'horizontal' | 'vertical'>('horizontal');

  // Toast notification for feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Show toast helper
  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

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

      // STEP 0: Check if this is a multi-dimension query
      const multiDimConfig = detectMultiDimensionQuery(aiPrompt);

      if (multiDimConfig) {
        console.log('[VisualBuilder] Multi-dimension query detected:', multiDimConfig);
        setAiReasoning([
          { type: 'routing', content: `Multi-dimension analysis: ${multiDimConfig.metric} by ${multiDimConfig.primaryGroupBy} and ${multiDimConfig.secondaryGroupBy}` },
          { type: 'thinking', content: 'Using grouped aggregation for dual-dimension breakdown' }
        ]);

        try {
          const queryCustomerId = targetScope === 'admin' ? null : (targetCustomerId || effectiveCustomerId);
          const productTerms = extractProductTerms(aiPrompt);

          const { raw, grouped, secondaryGroups } = await queryMultiDimension(
            multiDimConfig,
            queryCustomerId,
            dateRange,
            productTerms.length > 0 ? productTerms : undefined
          );

          if (grouped.length > 0) {
            setConfig(prev => ({
              ...prev,
              name: `${multiDimConfig.aggregation.toUpperCase()} ${multiDimConfig.metric} by ${multiDimConfig.primaryGroupBy} and ${multiDimConfig.secondaryGroupBy}`,
              description: `Shows ${multiDimConfig.aggregation} ${multiDimConfig.metric} broken down by ${multiDimConfig.primaryGroupBy} and ${multiDimConfig.secondaryGroupBy}`,
              chartType: 'grouped_bar',
              groupByColumn: multiDimConfig.primaryGroupBy,
              secondaryGroupBy: multiDimConfig.secondaryGroupBy,
              metricColumn: multiDimConfig.metric,
              aggregation: multiDimConfig.aggregation as Aggregation,
              data: grouped,
              rawMultiDimData: raw,
              secondaryGroups: secondaryGroups,
              isMultiDimension: true,
              aiConfig: {
                title: `${multiDimConfig.metric} by ${multiDimConfig.primaryGroupBy} and ${multiDimConfig.secondaryGroupBy}`,
                xAxis: multiDimConfig.primaryGroupBy,
                yAxis: multiDimConfig.metric,
                aggregation: multiDimConfig.aggregation.toUpperCase(),
                filters: [],
                searchTerms: productTerms
              }
            }));

            setHasResults(true);
            setAiReasoning(prev => [...prev,
              { type: 'tool_result', content: `Found ${grouped.length} primary groups x ${secondaryGroups.length} secondary groups` }
            ]);
            setAiLoading(false);
            return;
          }
        } catch (err) {
          console.error('[VisualBuilder] Multi-dimension query failed:', err);
          setAiError(`Multi-dimension query failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setAiLoading(false);
          return;
        }
      }

      // STEP 1: Check if this is a product comparison query we can handle directly
      const productTerms = extractProductTerms(aiPrompt);

      if (productTerms.length >= 2) {
        // DIRECT QUERY PATH - bypass AI entirely for product comparisons
        console.log('[VisualBuilder] Product comparison detected:', productTerms);
        setAiReasoning([
          { type: 'routing', content: `Detected product comparison: ${productTerms.join(', ')}` },
          { type: 'thinking', content: 'Using direct database queries for accurate category comparison' }
        ]);
        
        // Determine which customer ID to use
        const queryCustomerId = targetScope === 'admin' ? null : (targetCustomerId || effectiveCustomerId);
        console.log('[VisualBuilder] Product query using customer ID:', queryCustomerId, '(target:', targetCustomerId, 'effective:', effectiveCustomerId, 'scope:', targetScope, ')');
        
        const results = await queryProductCategories(
          productTerms,
          canSeeAdminColumns ? 'cost' : 'retail',
          'avg',
          queryCustomerId,
          dateRange  // Pass date range for filtering
        );
        
        if (results.length > 0) {
          const aiConfig: AIConfig = {
            title: `Average ${canSeeAdminColumns ? 'Cost' : 'Retail'} by Product Category`,
            xAxis: 'Product Category',
            yAxis: canSeeAdminColumns ? 'cost' : 'retail',
            aggregation: 'AVG',
            filters: productTerms.map(t => `item_description ILIKE '%${t}%'`),
            searchTerms: productTerms
          };
          
          syncFiltersFromAI(productTerms);
          
          setConfig(prev => ({
            ...prev,
            name: aiConfig.title,
            description: `Shows average ${canSeeAdminColumns ? 'cost' : 'retail'} for products: ${productTerms.join(', ')}`,
            chartType: 'bar',
            groupByColumn: 'item_description',
            metricColumn: canSeeAdminColumns ? 'cost' : 'retail',
            aggregation: 'avg',
            data: results,
            aiConfig,
          }));
          
          setHasResults(true);
          setIsProductQuery(true);  // Mark this as a product query for refresh handling
          setAiReasoning(prev => [...prev, 
            { type: 'tool_result', content: `Found ${results.length} categories with data` }
          ]);
          return;
        } else {
          // Product query returned no results - give helpful feedback
          const dateRangeStr = `${dateRange.start} to ${dateRange.end}`;
          setAiError(`No product data found for "${productTerms.join(', ')}" in the selected date range (${dateRangeStr}). Try expanding the date range or check if this customer has shipments with these products.`);
          setAiLoading(false);
          return;
        }
      }

      // STEP 2: Fall back to investigate endpoint for other queries
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

        // IMPORTANT: Map AI config to manual mode fields so refresh works
        // Find the best matching columns for what AI used
        const xAxisColumn = mapAIFieldToColumn(aiConfig.xAxis, availableColumns);
        const yAxisColumn = mapAIFieldToColumn(aiConfig.yAxis, availableColumns);
        const aggregation = mapAIAggregation(aiConfig.aggregation);

        setConfig(prev => ({
          ...prev,
          name: viz.title || '',
          description: generateDescription(aiPrompt, aiConfig, secureData),
          chartType: mapAIChartType(viz.type),
          // Populate manual mode fields from AI results
          groupByColumn: xAxisColumn,
          metricColumn: yAxisColumn,
          aggregation: aggregation,
          data: secureData,
          aiConfig,
        }));

        // Mark that we have results - refresh should re-query, not re-run AI
        setHasResults(true);
      } else {
        throw new Error('AI could not generate visualization. Try a prompt like: "Average cost for drawer, cargoglide, toolbox"');
      }
    } catch (err) {
      // Provide better error messages
      let errorMessage = 'AI request failed';
      if (err instanceof Error) {
        if (err.message.includes('Unexpected end of JSON')) {
          errorMessage = 'Request timed out. Try a simpler query or check your connection.';
        } else if (err.message.includes('500') || err.message.includes('502')) {
          errorMessage = 'Server error. Please try again in a moment.';
        } else {
          errorMessage = err.message;
        }
      }
      setAiError(errorMessage);
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, aiLoading, targetScope, targetCustomerId, effectiveCustomerId, user?.id, canSeeAdminColumns, availableColumns]);

  // Extract product terms from user prompt
  const extractProductTerms = (prompt: string): string[] => {
    const promptLower = prompt.toLowerCase();
    const found: string[] = [];
    
    // Check for "drawer system" first (more specific) before "drawer" (less specific)
    if (/drawer\s*system/i.test(promptLower)) {
      found.push('Drawer System');
    } else if (/drawer/i.test(promptLower)) {
      // Only add "Drawer" if "Drawer System" wasn't already found
      found.push('Drawer');
    }
    
    if (/cargoglide|cargo\s*glide/i.test(promptLower)) {
      found.push('CargoGlide');
    }
    
    if (/toolbox|tool\s*box/i.test(promptLower)) {
      found.push('Tool Box');
    }
    
    return found;
  };

  // Query product categories using mcp_aggregate RPC
  // Requires the fixed mcp_aggregate function that supports shipment_item table
  const queryProductCategories = async (
    terms: string[],
    metric: string,
    aggregation: string,
    customerId: number | null,
    dateFilter?: { start: string; end: string }
  ): Promise<Array<{ label: string; value: number }>> => {
    const results: Array<{ label: string; value: number }> = [];
    
    console.log('[VisualBuilder] Product query - terms:', terms, 'metric:', metric, 'dateFilter:', dateFilter);
    
    for (const term of terms) {
      try {
        // Build filters: description match + optional date range
        const filters: Array<{ field: string; operator: string; value: string }> = [
          { field: 'description', operator: 'ilike', value: term }
        ];
        
        if (dateFilter?.start && dateFilter?.end) {
          filters.push({ field: 'pickup_date', operator: 'gte', value: dateFilter.start });
          filters.push({ field: 'pickup_date', operator: 'lte', value: dateFilter.end });
        }
        
        console.log(`[VisualBuilder] Querying "${term}" with filters:`, filters);
        
        const { data, error } = await supabase.rpc('mcp_aggregate', {
          p_table_name: 'shipment_item',  // Query shipment_item table
          p_customer_id: customerId || 0,
          p_is_admin: customerId === null || customerId === 0,
          p_group_by: 'description',
          p_metric: metric,
          p_aggregation: aggregation,
          p_filters: filters,
          p_limit: 100
        });
        
        if (error) {
          console.error(`[VisualBuilder] RPC error for "${term}":`, error);
          continue;
        }
        
        // Parse response - handle both string and object responses
        let parsed = typeof data === 'string' ? JSON.parse(data) : data;
        console.log(`[VisualBuilder] Raw result for "${term}":`, parsed);
        
        // Supabase RPC returns the result directly, not wrapped
        // But the function returns {data: [...]} or {error: ...}
        if (parsed?.error) {
          console.error(`[VisualBuilder] Query error for "${term}":`, parsed.error);
          continue;
        }
        
        // Get rows from the data array
        const rows = parsed?.data || [];
        console.log(`[VisualBuilder] Rows for "${term}":`, rows.length, rows);
        
        if (rows.length > 0) {
          // Sum up all matching rows for this term
          let totalValue = 0;
          let count = 0;
          for (const row of rows) {
            if (row.value !== null && row.value !== undefined) {
              totalValue += Number(row.value);
              count++;
            }
          }
          
          if (count > 0) {
            const finalValue = aggregation === 'avg' ? totalValue / count : totalValue;
            results.push({
              label: term,
              value: Math.round(finalValue * 100) / 100
            });
            console.log(`[VisualBuilder] ✓ ${term}: ${finalValue.toFixed(2)}`);
          }
        } else {
          console.log(`[VisualBuilder] No data for "${term}"`);
        }
      } catch (err) {
        console.error(`[VisualBuilder] Exception for "${term}":`, err);
      }
    }
    
    console.log('[VisualBuilder] Final results:', results);
    return results;
  };

  interface MultiDimensionConfig {
    primaryGroupBy: string;
    secondaryGroupBy: string;
    metric: string;
    aggregation: string;
    isMultiDimension: true;
  }

  const detectMultiDimensionQuery = (prompt: string): MultiDimensionConfig | null => {
    const lowerPrompt = prompt.toLowerCase();

    // Column mapping - user-friendly names to actual column names
    const columnMap: Record<string, string> = {
      'product': 'description',
      'products': 'description',
      'item': 'description',
      'items': 'description',
      'description': 'description',
      'category': 'description',
      'categories': 'description',
      'state': 'origin_state',
      'states': 'origin_state',
      'origin': 'origin_state',
      'origins': 'origin_state',
      'destination': 'dest_state',
      'dest': 'dest_state',
      'carrier': 'carrier_name',
      'carriers': 'carrier_name',
      'mode': 'mode_name',
      'modes': 'mode_name',
      'location': 'origin_state',
    };

    // Metric mapping - note: 'cost' maps to 'retail' for customer-facing queries
    const metricMap: Record<string, string> = {
      'cost': 'retail',
      'costs': 'retail',
      'price': 'retail',
      'prices': 'retail',
      'retail': 'retail',
      'revenue': 'retail',
      'charge': 'retail',
      'charges': 'retail',
      'weight': 'weight',
      'weights': 'weight',
      'miles': 'miles',
      'mileage': 'miles',
      'distance': 'miles',
      'shipments': 'load_id',
      'shipment': 'load_id',
      'count': 'load_id',
      'volume': 'load_id',
    };

    // Helper to resolve column names
    const resolveColumn = (dim: string): string => {
      const cleaned = dim.replace(/[^a-z]/g, '');
      return columnMap[cleaned] || cleaned;
    };

    // Helper to resolve metric names
    const resolveMetric = (met: string): string => {
      const cleaned = met.replace(/[^a-z]/g, '');
      return metricMap[cleaned] || 'retail';
    };

    // Helper to determine aggregation
    const determineAggregation = (p: string): string => {
      if (p.includes('total') || p.includes('sum')) return 'sum';
      if (p.includes('count') || p.includes('how many') || p.includes('number of')) return 'count';
      if (p.includes('min') || p.includes('minimum') || p.includes('lowest')) return 'min';
      if (p.includes('max') || p.includes('maximum') || p.includes('highest')) return 'max';
      return 'avg';
    };

    // APPROACH 1: Traditional regex patterns for structured queries
    const patterns = [
      // "average cost by product by origin"
      /(?:average|avg|total|sum|count|show|get)\s+(\w+)\s+(?:by|per|for)\s+(\w+)\s+(?:by|and|per|grouped by|for each|&)\s+(\w+)/i,
      // "cost per product by origin"
      /(\w+)\s+(?:per|by|for)\s+(\w+)\s+(?:by|and|per|grouped by|&)\s+(\w+)/i,
      // "breakdown of cost by product and origin"
      /breakdown\s+of\s+(\w+)\s+by\s+(\w+)\s+(?:and|&|by)\s+(\w+)/i,
      // "cost by product grouped by origin"
      /(\w+)\s+by\s+(\w+)\s+grouped\s+by\s+(\w+)/i,
    ];

    for (const pattern of patterns) {
      const match = lowerPrompt.match(pattern);
      if (match) {
        const [, metric, primaryDim, secondaryDim] = match;

        const resolvedPrimary = resolveColumn(primaryDim);
        const resolvedSecondary = resolveColumn(secondaryDim);
        const resolvedMetric = resolveMetric(metric);

        // Skip if we accidentally captured non-dimension words
        if (!columnMap[primaryDim.toLowerCase()] && !['cost', 'price', 'retail', 'weight', 'miles'].includes(primaryDim.toLowerCase())) {
          continue;
        }

        console.log('[VisualBuilder] Detected multi-dimension query (regex):', {
          pattern: pattern.toString(),
          metric: resolvedMetric,
          primaryGroupBy: resolvedPrimary,
          secondaryGroupBy: resolvedSecondary,
        });

        return {
          primaryGroupBy: resolvedPrimary,
          secondaryGroupBy: resolvedSecondary,
          metric: resolvedMetric,
          aggregation: determineAggregation(lowerPrompt),
          isMultiDimension: true
        };
      }
    }

    // APPROACH 2: Keyword-based detection for more natural language
    // Detect if there's a secondary dimension mentioned anywhere
    const secondaryDimKeywords = [
      { pattern: /(?:by|per|split\s*(?:up|out)?\s*by|broken?\s*(?:down|out)\s*by|grouped\s*by|also\s*by|and\s*(?:by|per)|as\s*well\s*(?:as|by)?)\s*(origin|state|destination|carrier|mode)/i, dim: 1 },
      { pattern: /(origin|state|destination|carrier|mode)\s*(?:as\s*well|too|also)/i, dim: 1 },
      { pattern: /for\s*each\s*(origin|state|destination|carrier|mode)/i, dim: 1 },
    ];

    // Check if this is a product-based query
    const productTerms = ['drawer', 'cargoglide', 'cargo glide', 'toolbox', 'tool box', 'product', 'item', 'category'];
    const hasProductTerms = productTerms.some(term => lowerPrompt.includes(term));

    // Check if it has a metric keyword
    const hasMetricKeyword = ['cost', 'price', 'retail', 'average', 'avg', 'total', 'sum', 'count', 'charge'].some(
      term => lowerPrompt.includes(term)
    );

    if (hasProductTerms && hasMetricKeyword) {
      // Look for secondary dimension
      for (const { pattern, dim } of secondaryDimKeywords) {
        const match = lowerPrompt.match(pattern);
        if (match && match[dim]) {
          const secondaryDim = match[dim].toLowerCase();
          const resolvedSecondary = resolveColumn(secondaryDim);

          // Determine metric
          let metric = 'retail';
          if (lowerPrompt.includes('weight')) metric = 'weight';
          if (lowerPrompt.includes('miles') || lowerPrompt.includes('mileage')) metric = 'miles';
          if (lowerPrompt.includes('count') || lowerPrompt.includes('how many')) metric = 'load_id';

          console.log('[VisualBuilder] Detected multi-dimension query (keyword):', {
            secondaryMatch: match[0],
            metric,
            primaryGroupBy: 'description',
            secondaryGroupBy: resolvedSecondary,
          });

          return {
            primaryGroupBy: 'description',
            secondaryGroupBy: resolvedSecondary,
            metric,
            aggregation: determineAggregation(lowerPrompt),
            isMultiDimension: true
          };
        }
      }
    }

    // APPROACH 3: Check for explicit "and" or "&" between two dimension words
    const andPattern = /by\s+(\w+)\s+(?:and|&)\s+(\w+)/i;
    const andMatch = lowerPrompt.match(andPattern);
    if (andMatch) {
      const [, dim1, dim2] = andMatch;
      const resolved1 = resolveColumn(dim1);
      const resolved2 = resolveColumn(dim2);

      // Only proceed if both are valid dimensions
      if (columnMap[dim1.toLowerCase()] || columnMap[dim2.toLowerCase()]) {
        let metric = 'retail';
        if (lowerPrompt.includes('weight')) metric = 'weight';
        if (lowerPrompt.includes('miles')) metric = 'miles';
        if (lowerPrompt.includes('count')) metric = 'load_id';

        console.log('[VisualBuilder] Detected multi-dimension query (and-pattern):', {
          metric,
          primaryGroupBy: resolved1,
          secondaryGroupBy: resolved2,
        });

        return {
          primaryGroupBy: resolved1,
          secondaryGroupBy: resolved2,
          metric,
          aggregation: determineAggregation(lowerPrompt),
          isMultiDimension: true
        };
      }
    }

    return null;
  };

  const queryMultiDimension = async (
    config: MultiDimensionConfig,
    customerId: number | null,
    dateFilter?: { start: string; end: string },
    productFilters?: string[]
  ): Promise<{ raw: MultiDimensionData[]; grouped: GroupedChartData[]; secondaryGroups: string[] }> => {
    console.log('[VisualBuilder] Multi-dimension query:', config);

    const needsShipmentItem = config.primaryGroupBy === 'description' ||
                              (productFilters && productFilters.length > 0);
    const tableName = needsShipmentItem ? 'shipment_item' : 'shipment';

    // For product category queries, we want to aggregate BY CATEGORY, not by individual product
    // So we query each category separately and combine the results
    if (productFilters && productFilters.length > 0 && config.primaryGroupBy === 'description') {
      console.log('[VisualBuilder] Product category query - aggregating by category');

      // Map to store: categoryName -> { state1: value, state2: value, ... }
      const categoryData = new Map<string, Map<string, { total: number; count: number }>>();
      const allSecondaryGroups = new Set<string>();
      const allRawData: MultiDimensionData[] = [];

      for (const term of productFilters) {
        const filters: Array<{ field: string; operator: string; value: string }> = [];

        if (dateFilter?.start && dateFilter?.end) {
          filters.push({ field: 'pickup_date', operator: 'gte', value: dateFilter.start });
          filters.push({ field: 'pickup_date', operator: 'lte', value: dateFilter.end });
        }

        // Single product filter for this query
        filters.push({ field: 'description', operator: 'ilike', value: term });

        console.log(`[VisualBuilder] Querying multi-dim for category "${term}"`);

        const { data, error } = await supabase.rpc('mcp_aggregate', {
          p_table_name: tableName,
          p_customer_id: customerId || 0,
          p_is_admin: customerId === null || customerId === 0,
          p_group_by: `description,${config.secondaryGroupBy}`,
          p_metric: config.metric,
          p_aggregation: config.aggregation,
          p_filters: filters,
          p_limit: 100
        });

        if (error) {
          console.error(`[VisualBuilder] Multi-dimension RPC error for "${term}":`, error);
          continue;
        }

        const parsed = typeof data === 'string' ? JSON.parse(data) : data;

        if (parsed?.error) {
          console.error(`[VisualBuilder] Multi-dimension query error for "${term}":`, parsed.error);
          continue;
        }

        const rows = parsed?.data || [];
        console.log(`[VisualBuilder] Results for "${term}":`, rows.length, 'rows');

        // Initialize category map if needed
        if (!categoryData.has(term)) {
          categoryData.set(term, new Map());
        }
        const categoryStates = categoryData.get(term)!;

        // Aggregate all results for this category by secondary group (state)
        for (const row of rows) {
          const state = row.secondary_group || 'Unknown';
          allSecondaryGroups.add(state);

          if (!categoryStates.has(state)) {
            categoryStates.set(state, { total: 0, count: 0 });
          }

          const stateData = categoryStates.get(state)!;
          // For AVG, we need to track total and count to compute weighted average
          // For SUM, just add the values
          // For COUNT, add the counts
          if (config.aggregation === 'avg') {
            stateData.total += row.value * row.count; // weighted
            stateData.count += row.count;
          } else if (config.aggregation === 'sum') {
            stateData.total += row.value;
            stateData.count += row.count;
          } else if (config.aggregation === 'count') {
            stateData.total += row.count;
            stateData.count += 1;
          } else {
            stateData.total += row.value;
            stateData.count += 1;
          }

          // Also keep raw data for reference
          allRawData.push({
            primary_group: term, // Use category name, not individual product
            secondary_group: state,
            value: row.value,
            count: row.count
          });
        }
      }

      // Convert aggregated data to grouped format
      const secondaryGroups = Array.from(allSecondaryGroups).sort();
      const grouped: GroupedChartData[] = [];

      for (const [category, stateMap] of categoryData) {
        const entry: GroupedChartData = { primaryGroup: category };

        for (const [state, data] of stateMap) {
          let value: number;
          if (config.aggregation === 'avg') {
            value = data.count > 0 ? data.total / data.count : 0;
          } else {
            value = data.total;
          }
          entry[state] = Math.round(value * 100) / 100;
        }

        grouped.push(entry);
      }

      console.log('[VisualBuilder] Category aggregation complete:', grouped.length, 'categories,', secondaryGroups.length, 'states');
      console.log('[VisualBuilder] Grouped data:', grouped);

      return { raw: allRawData, grouped, secondaryGroups };
    }

    // Non-product queries - use original single-query logic
    const filters: Array<{ field: string; operator: string; value: string }> = [];

    if (dateFilter?.start && dateFilter?.end) {
      filters.push({ field: 'pickup_date', operator: 'gte', value: dateFilter.start });
      filters.push({ field: 'pickup_date', operator: 'lte', value: dateFilter.end });
    }

    const groupBy = `${config.primaryGroupBy},${config.secondaryGroupBy}`;

    const { data, error } = await supabase.rpc('mcp_aggregate', {
      p_table_name: tableName,
      p_customer_id: customerId || 0,
      p_is_admin: customerId === null || customerId === 0,
      p_group_by: groupBy,
      p_metric: config.metric,
      p_aggregation: config.aggregation,
      p_filters: filters,
      p_limit: 200
    });

    if (error) {
      console.error('[VisualBuilder] Multi-dimension RPC error:', error);
      throw error;
    }

    const parsed = typeof data === 'string' ? JSON.parse(data) : data;

    if (parsed?.error) {
      console.error('[VisualBuilder] Multi-dimension query error:', parsed.error);
      throw new Error(parsed.error);
    }

    const rawData: MultiDimensionData[] = parsed?.data || [];
    console.log('[VisualBuilder] Multi-dimension raw results:', rawData.length, 'rows');

    const secondaryGroups = [...new Set(rawData.map(d => d.secondary_group))].filter(Boolean).sort();
    const groupedMap = new Map<string, GroupedChartData>();

    for (const row of rawData) {
      if (!row.primary_group) continue;

      if (!groupedMap.has(row.primary_group)) {
        groupedMap.set(row.primary_group, { primaryGroup: row.primary_group });
      }

      const entry = groupedMap.get(row.primary_group)!;
      entry[row.secondary_group] = Math.round(row.value * 100) / 100;
    }

    const grouped = Array.from(groupedMap.values());
    console.log('[VisualBuilder] Transformed:', grouped.length, 'primary groups,', secondaryGroups.length, 'secondary groups');

    return { raw: rawData, grouped, secondaryGroups };
  };

  // Generate a meaningful description based on the query
  const generateDescription = (
    prompt: string, 
    aiConfig: AIConfig, 
    data: Array<{ label: string; value: number }>
  ): string => {
    const filterTerms = aiConfig.searchTerms.length > 0 
      ? aiConfig.searchTerms.join(', ') 
      : 'all items';
    
    const aggregation = aiConfig.aggregation || 'Average';
    const metric = aiConfig.yAxis || 'cost';
    const dataPointCount = data.length;
    
    // Build a human-readable description
    const parts: string[] = [];
    
    // What we're measuring
    parts.push(`Shows ${aggregation.toLowerCase()} ${formatFieldName(metric).toLowerCase()}`);
    
    // What we're filtering by
    if (aiConfig.searchTerms.length > 0) {
      parts.push(`for products matching: ${filterTerms}`);
    }
    
    // How many results
    parts.push(`(${dataPointCount} ${dataPointCount === 1 ? 'category' : 'categories'})`);
    
    return parts.join(' ');
  };

  // Build improved AI prompt
  const buildAIPrompt = (userPrompt: string, isAdminUser: boolean): string => {
    const promptLower = userPrompt.toLowerCase();
    
    // Check if user specified a metric
    const hasMetric = ['cost', 'retail', 'price', 'charge', 'average', 'total', 'sum', 'count', 'margin', 'weight'].some(
      term => promptLower.includes(term)
    );
    
    // Check if this looks like a product comparison request
    const productTerms = ['drawer', 'cargoglide', 'toolbox', 'cargo glide', 'drawer system', 'tool box'];
    const mentionedProducts = productTerms.filter(term => promptLower.includes(term));
    const isProductComparison = mentionedProducts.length > 0;
    
    // Build metric suggestion if missing
    let metricHint = '';
    if (!hasMetric) {
      const defaultMetric = isAdminUser ? 'average cost per shipment' : 'average retail (your charge) per shipment';
      metricHint = `\n\nNOTE: The user didn't specify a metric. Default to ${defaultMetric}.`;
    }
    
    // Build product comparison hint
    let productHint = '';
    if (isProductComparison && mentionedProducts.length >= 2) {
      productHint = `\n\nIMPORTANT - PRODUCT COMPARISON DETECTED:
The user wants to compare these ${mentionedProducts.length} product categories: ${mentionedProducts.join(', ')}
You MUST return ${mentionedProducts.length} SEPARATE data points, one for each category.
DO NOT combine them into a single value.

For each product term, run a separate query:
${mentionedProducts.map((p, i) => `${i + 1}. Filter: item_description ILIKE '%${p}%' → Return as "${p}" category`).join('\n')}`;
    }
    
    const restrictedFields = isAdminUser ? '' : `
SECURITY: This user is a CUSTOMER. Never include: cost, margin, margin_percent, carrier_total, linehaul, target_rate, cost_without_tax. Use 'retail' for financial data.`;

    return `Create a dashboard widget visualization.

User request: "${userPrompt}"
${metricHint}${productHint}

Instructions:
1. If specific products are mentioned, return SEPARATE data points for EACH product category
2. Use the appropriate aggregation: 
   - "average" or "avg" = use AVG aggregation
   - "total" or "sum" = use SUM aggregation  
   - "how many" or "count" = use COUNT aggregation
3. Search the item_description field for product terms
4. Limit results to top 15 groups maximum
${restrictedFields}

Return a clear visualization with properly grouped data.`;
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

  // Map AI field names to actual column IDs
  const mapAIFieldToColumn = (aiField: string, columns: Column[]): string | null => {
    if (!aiField) return null;
    
    const normalized = aiField.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Direct match
    const direct = columns.find(c => c.id.toLowerCase() === aiField.toLowerCase());
    if (direct) return direct.id;
    
    // Common AI field mappings
    const fieldMappings: Record<string, string[]> = {
      'item_description': ['product', 'description', 'productdescription', 'itemdescription', 'item'],
      'cost': ['cost', 'carrierpay', 'carriercost'],
      'retail': ['retail', 'revenue', 'charge', 'price'],
      'carrier_name': ['carrier', 'carriername'],
      'origin_state': ['origin', 'originstate', 'fromstate'],
      'dest_state': ['destination', 'deststate', 'tostate'],
      'mode_name': ['mode', 'modename', 'shipmentmode'],
      'pickup_date': ['date', 'pickupdate', 'shipdate'],
      'weight': ['weight', 'totalweight'],
    };
    
    for (const [columnId, aliases] of Object.entries(fieldMappings)) {
      if (aliases.some(alias => normalized.includes(alias) || alias.includes(normalized))) {
        const col = columns.find(c => c.id === columnId);
        if (col) return col.id;
      }
    }
    
    // Fuzzy match - find column with similar label
    const fuzzy = columns.find(c => 
      c.label.toLowerCase().includes(aiField.toLowerCase()) ||
      aiField.toLowerCase().includes(c.label.toLowerCase())
    );
    if (fuzzy) return fuzzy.id;
    
    return null;
  };

  // Map AI aggregation to our aggregation type
  const mapAIAggregation = (aiAgg: string): Aggregation => {
    const normalized = (aiAgg || '').toLowerCase();
    if (normalized.includes('avg') || normalized.includes('average')) return 'avg';
    if (normalized.includes('sum') || normalized.includes('total')) return 'sum';
    if (normalized.includes('count')) return 'count';
    if (normalized.includes('min')) return 'min';
    if (normalized.includes('max')) return 'max';
    return 'avg'; // Default to avg for "average cost" type queries
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
    const filterToRemove = editableFilters.find(f => f.id === id);
    setEditableFilters(prev => prev.filter(f => f.id !== id));
    showToast(`Filter "${filterToRemove?.value || 'item'}" removed`, 'info');
    // Set a flag to trigger refresh after state updates
    setNeedsRefresh(true);
  }, [editableFilters, showToast]);

  // State to trigger auto-refresh when filters change
  const [needsRefresh, setNeedsRefresh] = useState(false);

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

  // Track if current results are from a product query (need special refresh handling)
  const [isProductQuery, setIsProductQuery] = useState(false);

  // Unified refresh function that works for both product queries and regular queries
  const refreshData = useCallback(async () => {
    if (!hasResults) return;
    
    setPreviewLoading(true);
    setPreviewError(null);
    
    try {
      // Get current filter terms from editable filters
      const filterTerms = editableFilters
        .filter(f => f.field === 'item_description' && f.value.trim())
        .map(f => f.value.trim());
      
      // Determine if we should use product query or regular query
      // Use product query if:
      // 1. groupByColumn is item_description AND we have filter terms
      // 2. OR this was originally a product query and we still have product filters
      const shouldUseProductQuery = 
        (config.groupByColumn === 'item_description' && filterTerms.length > 0) ||
        (isProductQuery && filterTerms.length > 0 && config.groupByColumn === 'item_description');
      
      if (shouldUseProductQuery) {
        console.log('[VisualBuilder] Refreshing product query with terms:', filterTerms);
        
        const results = await queryProductCategories(
          filterTerms,
          config.metricColumn || (canSeeAdminColumns ? 'cost' : 'retail'),
          config.aggregation || 'avg',
          targetScope === 'admin' ? null : (targetCustomerId || effectiveCustomerId),
          dateRange
        );
        
        setConfig(prev => ({
          ...prev,
          data: results,
          aiConfig: prev.aiConfig ? {
            ...prev.aiConfig,
            searchTerms: filterTerms,
          } : undefined,
        }));
        
        showToast(`Updated: ${results.length} categories`, 'success');
      } else if (config.groupByColumn && config.metricColumn) {
        // Regular query using handleRunQuery
        console.log('[VisualBuilder] Refreshing regular query:', config.groupByColumn, config.metricColumn);
        // Mark this as not a product query anymore
        setIsProductQuery(false);
        
        // Build filters from date range AND editable filters
        const queryFilters = [
          { field: 'pickup_date', operator: 'gte', value: dateRange.start },
          { field: 'pickup_date', operator: 'lte', value: dateRange.end },
          ...editableFilters.filter(f => f.value.trim()).map(f => ({
            field: f.field,
            operator: f.operator === 'contains' ? 'ilike' : f.operator,
            value: f.operator === 'contains' ? `%${f.value}%` : f.value,
          })),
        ];

        const { data, error } = await supabase.rpc('mcp_aggregate', {
          p_table_name: 'shipment',
          p_customer_id: targetScope === 'admin' ? 0 : (targetCustomerId || effectiveCustomerId || 0),
          p_is_admin: targetScope === 'admin' && canSeeAdminColumns,
          p_group_by: config.groupByColumn,
          p_metric: config.metricColumn,
          p_aggregation: config.aggregation,
          p_filters: queryFilters,
          p_limit: 20,
        });

        if (error) throw error;

        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        const rows = parsed?.data || parsed || [];

        const chartData = rows.map((row: any) => ({
          label: String(row.label || 'Unknown'),
          value: Number(row.value || 0),
        }));

        setConfig(prev => ({ ...prev, data: chartData }));
        showToast(`Updated: ${chartData.length} data points`, 'success');
      } else {
        showToast('Select both X and Y axis to refresh', 'info');
      }
    } catch (err) {
      console.error('[VisualBuilder] Refresh error:', err);
      setPreviewError(err instanceof Error ? err.message : 'Refresh failed');
      showToast('Refresh failed', 'error');
    } finally {
      setPreviewLoading(false);
    }
  }, [hasResults, isProductQuery, editableFilters, config.groupByColumn, config.metricColumn, config.aggregation, canSeeAdminColumns, targetScope, targetCustomerId, effectiveCustomerId, dateRange, showToast, queryProductCategories]);

  // Auto-refresh when filters are deleted
  useEffect(() => {
    if (needsRefresh && hasResults) {
      setNeedsRefresh(false);
      const timer = setTimeout(() => {
        refreshData();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [needsRefresh, hasResults, refreshData]);

  // Track previous column values to detect changes
  const prevGroupByRef = React.useRef(config.groupByColumn);
  const prevMetricRef = React.useRef(config.metricColumn);
  const prevAggregationRef = React.useRef(config.aggregation);

  // Auto-refresh when X/Y axis or aggregation changes (but not on initial load)
  useEffect(() => {
    const groupByChanged = prevGroupByRef.current !== config.groupByColumn && prevGroupByRef.current !== null;
    const metricChanged = prevMetricRef.current !== config.metricColumn && prevMetricRef.current !== null;
    const aggregationChanged = prevAggregationRef.current !== config.aggregation;
    
    // Update refs
    prevGroupByRef.current = config.groupByColumn;
    prevMetricRef.current = config.metricColumn;
    prevAggregationRef.current = config.aggregation;
    
    // If either axis changed and we have both columns set, refresh
    if ((groupByChanged || metricChanged || aggregationChanged) && 
        config.groupByColumn && config.metricColumn && hasResults) {
      console.log('[VisualBuilder] Column/aggregation changed, triggering refresh');
      showToast('Updating preview...', 'info');
      const timer = setTimeout(() => {
        refreshData();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [config.groupByColumn, config.metricColumn, config.aggregation, hasResults, refreshData, showToast]);

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

      // Determine which table to query based on columns
      // If grouping by item_description, use shipment_item table
      const isProductQuery = config.groupByColumn === 'item_description' || config.groupByColumn === 'description';
      const tableName = isProductQuery ? 'shipment_item' : 'shipment';
      const groupByField = isProductQuery ? 'description' : config.groupByColumn;

      // Build filters from date range AND editable filters
      const queryFilters = [
        { field: 'pickup_date', operator: 'gte', value: dateRange.start },
        { field: 'pickup_date', operator: 'lte', value: dateRange.end },
        // Add editable filters
        ...editableFilters.filter(f => f.value.trim()).map(f => ({
          field: f.field === 'item_description' ? 'description' : f.field,
          operator: f.operator === 'contains' ? 'ilike' : f.operator,
          value: f.operator === 'contains' ? `%${f.value}%` : f.value,
        })),
      ];

      console.log('[VisualBuilder] Manual query - table:', tableName, 'groupBy:', groupByField, 'metric:', config.metricColumn);

      const { data, error } = await supabase.rpc('mcp_aggregate', {
        p_table_name: tableName,
        p_customer_id: targetScope === 'admin' ? 0 : (targetCustomerId || effectiveCustomerId || 0),
        p_is_admin: targetScope === 'admin' && canSeeAdminColumns,
        p_group_by: groupByField,
        p_metric: config.metricColumn,
        p_aggregation: config.aggregation,
        p_filters: queryFilters,
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
  }, [config.groupByColumn, config.metricColumn, config.aggregation, targetScope, targetCustomerId, effectiveCustomerId, dateRange, canSeeAdminColumns, availableColumns, editableFilters]);

  // =============================================================================
  // UNIFIED REFRESH - Uses current config, doesn't re-run AI
  // =============================================================================

  const handleRefreshData = useCallback(() => {
    // Use the unified refresh function that handles both product queries and regular queries
    refreshData();
  }, [refreshData]);

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

      // For private widgets, we need to know which customer they're for
      const targetCustomer = targetCustomerId || effectiveCustomerId;
      
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
        // Include customer ID for private widgets
        visibility: { 
          type: visibility,
          customerId: visibility === 'private' ? targetCustomer : null
        },
        // For private widgets, store which customer this is for
        customerId: visibility === 'private' ? targetCustomer : null,
        // SECURITY: Mark if widget contains admin-only data
        containsAdminData: config.metricColumn ? ADMIN_ONLY_COLUMNS.has(config.metricColumn) : false,
        dataSource: {
          groupByColumn: config.groupByColumn,
          secondaryGroupBy: config.secondaryGroupBy,
          isMultiDimension: config.isMultiDimension,
          metricColumn: config.metricColumn,
          aggregation: config.aggregation,
          filters: editableFilters,
          aiConfig: config.aiConfig,
          datePreset,
        },
        visualization: {
          type: config.chartType,
          data: config.data,
          secondaryGroups: config.secondaryGroups,
        },
        createdAt: new Date().toISOString(),
      };

      // Storage path - use same structure as customWidgetStorage.ts
      // admin widgets go to admin/, customer widgets go to customer/{id}/
      let storagePath: string;
      if (visibility === 'admin_only') {
        storagePath = `admin/${widgetId}.json`;
      } else if (visibility === 'private' && targetCustomer) {
        storagePath = `customer/${targetCustomer}/${widgetId}.json`;
      } else {
        // all_customers = system-wide
        storagePath = `system/${widgetId}.json`;
      }

      console.log('[VisualBuilder] Publishing widget to:', storagePath);

      const { error } = await supabase.storage
        .from('custom-widgets')
        .upload(storagePath, JSON.stringify(widgetDefinition, null, 2), {
          contentType: 'application/json',
          upsert: true,
        });

      if (error) throw error;

      // Also add to dashboard_widgets table so it shows up immediately
      const dashboardCustomerId = visibility === 'private' ? targetCustomer : null;
      const { error: dbError } = await supabase
        .from('dashboard_widgets')
        .insert({
          widget_id: widgetId,
          customer_id: dashboardCustomerId,
          position: 999,
          size: 'medium',
          tab: 'overview',
        });

      if (dbError) {
        console.warn('[VisualBuilder] Could not add to dashboard_widgets:', dbError);
        // Don't fail the whole publish for this
      }

      setPublishResult({ success: true, message: `Widget "${config.name}" published to ${publishDestination === 'pulse' ? 'Pulse Dashboard' : 'Analytics Hub'}!` });
      setShowPublishModal(false);
    } catch (err) {
      setPublishResult({ success: false, message: err instanceof Error ? err.message : 'Publish failed' });
    } finally {
      setIsPublishing(false);
    }
  }, [config, mode, visibility, user, isAdmin, effectiveCustomerId, targetCustomerId, publishDestination, pulseSection, analyticsSection, editableFilters, datePreset]);

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

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-right ${
          toast.type === 'success' ? 'bg-green-500 text-white' :
          toast.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {toast.type === 'success' && <CheckCircle className="w-4 h-4" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4" />}
          {toast.type === 'info' && <RefreshCw className="w-4 h-4" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Scope Selector - Only show for admins */}
        {isUserAdmin && (
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
                availableColumns={availableColumns}
                onRerunWithFilters={() => {
                  showToast('Re-running query with updated filters...', 'info');
                  handleAISubmit();
                }}
              />
            ) : (
              <ManualSection
                config={config}
                setConfig={setConfig}
                columns={availableColumns}
                onRunQuery={handleRunQuery}
                previewLoading={previewLoading}
                canSeeAdminColumns={canSeeAdminColumns}
                barOrientation={barOrientation}
                setBarOrientation={setBarOrientation}
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
              onRefresh={handleRefreshData}
              barOrientation={barOrientation}
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
                    className={`flex-1 flex flex-col items-center justify-center gap-1 p-3 rounded-lg border text-sm ${
                      visibility === 'admin_only' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span className="font-medium">Admin Only</span>
                    <span className="text-xs text-slate-500">Only you and other admins</span>
                  </button>
                  <button
                    onClick={() => setVisibility('all_customers')}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 p-3 rounded-lg border text-sm ${
                      visibility === 'all_customers' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span className="font-medium">All Customers</span>
                    <span className="text-xs text-slate-500">System-wide widget</span>
                  </button>
                  <button
                    onClick={() => setVisibility('private')}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 p-3 rounded-lg border text-sm ${
                      visibility === 'private' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    <span className="font-medium">This Customer</span>
                    <span className="text-xs text-slate-500">
                      {customers?.find((c: any) => c.customer_id === (targetCustomerId || effectiveCustomerId))?.customer_name || 'Selected customer'} only
                    </span>
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
  availableColumns,
  onRerunWithFilters,
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
  availableColumns: Column[];
  onRerunWithFilters: () => void;
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
                {/* X-Axis shows the metric (horizontal axis = values) */}
                <div className="flex gap-2 items-center">
                  <span className="text-slate-500 w-16">X-Axis:</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={config.aggregation || 'avg'}
                      onChange={(e) => setConfig(prev => ({ ...prev, aggregation: e.target.value as any }))}
                      className="text-xs px-2 py-1 border border-slate-200 rounded bg-white font-medium text-slate-900"
                    >
                      <option value="avg">AVG</option>
                      <option value="sum">SUM</option>
                      <option value="count">COUNT</option>
                      <option value="min">MIN</option>
                      <option value="max">MAX</option>
                    </select>
                    <span className="font-medium text-slate-900">
                      of {config.metricColumn 
                        ? availableColumns.find(c => c.id === config.metricColumn)?.label || formatFieldName(config.metricColumn)
                        : config.aiConfig?.yAxis && config.aiConfig.yAxis !== ''
                          ? formatFieldName(config.aiConfig.yAxis)
                          : config.name?.toLowerCase().includes('cost')
                            ? 'Cost'
                            : config.name?.toLowerCase().includes('retail')
                              ? 'Retail'
                              : config.name?.toLowerCase().includes('margin')
                                ? 'Margin'
                                : 'Value'
                      }
                    </span>
                  </div>
                </div>
                {/* Y-Axis shows the grouping with filters (vertical axis = categories) */}
                <div className="flex gap-2 items-start">
                  <span className="text-slate-500 w-16 pt-0.5">Y-Axis:</span>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-slate-900">
                      {config.groupByColumn 
                        ? availableColumns.find(c => c.id === config.groupByColumn)?.label || formatFieldName(config.groupByColumn)
                        : config.aiConfig?.xAxis && config.aiConfig.xAxis !== ''
                          ? formatFieldName(config.aiConfig.xAxis)
                          : config.aiConfig?.groupingLogic
                            ? 'Product Category'
                            : config.name?.includes('by ')
                              ? config.name.split('by ').pop()?.split(' ')[0] || 'Category'
                              : 'Category'
                      }
                    </span>
                    {config.aiConfig?.searchTerms && config.aiConfig.searchTerms.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {config.aiConfig.searchTerms.map((term, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            {term}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {config.aiConfig?.groupingLogic && (
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
            
            {/* Re-run with Filters Button - Always visible when we have filters and AI results */}
            {hasData && editableFilters.length > 0 && (
              <button
                onClick={onRerunWithFilters}
                className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Apply Filter Changes
              </button>
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
  barOrientation,
  setBarOrientation,
}: {
  config: WidgetConfig;
  setConfig: React.Dispatch<React.SetStateAction<WidgetConfig>>;
  columns: Column[];
  onRunQuery: () => void;
  previewLoading: boolean;
  canSeeAdminColumns: boolean;
  barOrientation: 'horizontal' | 'vertical';
  setBarOrientation: (orientation: 'horizontal' | 'vertical') => void;
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

        {/* Bar Orientation Toggle - only show for bar charts */}
        {config.chartType === 'bar' && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">Bar Direction</span>
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                <button
                  onClick={() => setBarOrientation('horizontal')}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${
                    barOrientation === 'horizontal' ? 'bg-white shadow text-blue-600 font-medium' : 'text-slate-600'
                  }`}
                >
                  ← → Horizontal
                </button>
                <button
                  onClick={() => setBarOrientation('vertical')}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${
                    barOrientation === 'vertical' ? 'bg-white shadow text-blue-600 font-medium' : 'text-slate-600'
                  }`}
                >
                  ↑ ↓ Vertical
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Group By - Only text/category fields (things you can group by) */}
      <ColumnPicker
        title="Group By (X-Axis)"
        subtitle="What do you want to compare?"
        columns={columns.filter(c => c.type === 'string' || c.type === 'date')}
        selectedColumn={config.groupByColumn}
        onSelect={(col) => setConfig(prev => ({ ...prev, groupByColumn: col }))}
        highlightColor="blue"
      />

      {/* Metric - Only numeric fields (things you can measure) */}
      <ColumnPicker
        title="Metric (Y-Axis)"
        subtitle="What do you want to measure?"
        columns={columns.filter(c => c.type === 'number')}
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
  barOrientation,
}: {
  config: WidgetConfig;
  datePreset: DateRangePreset;
  setDatePreset: (preset: DateRangePreset) => void;
  showDateDropdown: boolean;
  setShowDateDropdown: (show: boolean) => void;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  barOrientation: 'horizontal' | 'vertical';
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
            <ChartRenderer
              type={config.chartType}
              data={config.data}
              barOrientation={barOrientation}
              secondaryGroups={config.secondaryGroups}
              metricColumn={config.metricColumn || undefined}
            />
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

function ChartRenderer({
  type,
  data,
  barOrientation = 'horizontal',
  secondaryGroups,
  metricColumn,
}: {
  type: ChartType;
  data: Array<{ label: string; value: number }> | GroupedChartData[];
  barOrientation?: 'horizontal' | 'vertical';
  secondaryGroups?: string[];
  metricColumn?: string;
}) {
  switch (type) {
    case 'grouped_bar':
      if (!secondaryGroups || secondaryGroups.length === 0) {
        return <div className="text-slate-500 text-sm">No secondary groups for grouped chart</div>;
      }
      const groupedData = data as GroupedChartData[];
      const isCurrencyMetric = metricColumn === 'retail' || metricColumn === 'cost';
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={groupedData} margin={{ top: 10, right: 10, left: 10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis
              dataKey="primaryGroup"
              tick={{ fontSize: 9 }}
              angle={-45}
              textAnchor="end"
              height={60}
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(val) => {
                if (isCurrencyMetric) {
                  if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
                  return `$${val}`;
                }
                return val.toLocaleString();
              }}
              width={50}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                isCurrencyMetric
                  ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : value.toLocaleString(),
                name
              ]}
              contentStyle={{ fontSize: 11 }}
            />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 5 }} iconSize={8} />
            {secondaryGroups.map((group, index) => (
              <Bar
                key={group}
                dataKey={group}
                name={group}
                fill={GROUPED_COLORS[index % GROUPED_COLORS.length]}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    case 'bar': {
      const barData = data as Array<{ label: string; value: number }>;
      if (barOrientation === 'vertical') {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ left: 20, right: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tickFormatter={formatValue} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => formatValue(v)} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {barData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      }
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} layout="vertical" margin={{ left: 80, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={formatValue} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => formatValue(v)} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {barData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }
    case 'line': {
      const lineData = data as Array<{ label: string; value: number }>;
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLine data={lineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} />
            <YAxis tickFormatter={formatValue} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => formatValue(v)} />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
          </RechartsLine>
        </ResponsiveContainer>
      );
    }
    case 'area': {
      const areaData = data as Array<{ label: string; value: number }>;
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={areaData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} />
            <YAxis tickFormatter={formatValue} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => formatValue(v)} />
            <Area type="monotone" dataKey="value" fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" />
          </AreaChart>
        </ResponsiveContainer>
      );
    }
    case 'pie': {
      const pieData = data as Array<{ label: string; value: number }>;
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPie>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}
              labelLine={{ strokeWidth: 1 }}
            >
              {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => formatValue(v)} />
          </RechartsPie>
        </ResponsiveContainer>
      );
    }
    case 'kpi': {
      const kpiData = data as Array<{ label: string; value: number }>;
      const total = kpiData.reduce((s, r) => s + r.value, 0);
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-4xl font-bold text-slate-900">{formatValue(total)}</div>
          <div className="text-sm text-slate-500 mt-2">Total ({kpiData.length} items)</div>
        </div>
      );
    }
    case 'table': {
      const tableData = data as Array<{ label: string; value: number }>;
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
              {tableData.map((row, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-slate-900">{row.label}</td>
                  <td className="px-3 py-2 text-slate-900 text-right font-medium">{formatValue(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
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

export default VisualBuilderV5Working;
