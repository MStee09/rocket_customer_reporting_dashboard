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
import { logger } from '../../../utils/logger';
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
import { useAuth } from '../../../contexts/AuthContext';
import { BuilderChartRenderer, CHART_COLORS, formatValue } from './BuilderChartRenderer';
import { BuilderPublishModal } from './BuilderPublishModal';
import { BuilderScopeSelector } from './BuilderScopeSelector';
import { BuilderColumnPicker } from './BuilderColumnPicker';
import { BuilderPreview } from './BuilderPreview';
import { BuilderManualSection } from './BuilderManualSection';
import { BuilderAISection } from './BuilderAISection';
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
import { ALL_COLUMNS, ADMIN_ONLY_COLUMNS } from '../config/columnDefinitions';
import {
  extractProductTerms,
  detectMultiDimensionQuery,
  generateDescription,
  buildAIPrompt,
  filterAdminData,
  parseAIConfig,
  mapAIChartType,
  mapAIFieldToColumn,
  mapAIAggregation,
  formatFieldName,
  type MultiDimensionConfig,
} from '../utils/visualBuilderUtils';

interface AggregateRow {
  label?: string;
  value?: number;
  secondary_group?: string;
  count?: number;
  [key: string]: string | number | undefined;
}

interface CustomerRecord {
  customer_id: number;
  customer_name: string;
}

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
  logger.log('[VisualBuilder] Customer IDs - target:', targetCustomerId, 'effective:', effectiveCustomerId);

  // Sync targetCustomerId when effectiveCustomerId changes (e.g., user switches customer in header)
  useEffect(() => {
    if (effectiveCustomerId && !targetCustomerId) {
      logger.log('[VisualBuilder] Syncing targetCustomerId from effectiveCustomerId:', effectiveCustomerId);
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
        logger.log('[VisualBuilder] Multi-dimension query detected:', multiDimConfig);
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
        logger.log('[VisualBuilder] Product comparison detected:', productTerms);
        setAiReasoning([
          { type: 'routing', content: `Detected product comparison: ${productTerms.join(', ')}` },
          { type: 'thinking', content: 'Using direct database queries for accurate category comparison' }
        ]);
        
        // Determine which customer ID to use
        const queryCustomerId = targetScope === 'admin' ? null : (targetCustomerId || effectiveCustomerId);
        logger.log('[VisualBuilder] Product query using customer ID:', queryCustomerId, '(target:', targetCustomerId, 'effective:', effectiveCustomerId, 'scope:', targetScope, ')');
        
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
    
    logger.log('[VisualBuilder] Product query - terms:', terms, 'metric:', metric, 'dateFilter:', dateFilter);
    
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
        
        logger.log(`[VisualBuilder] Querying "${term}" with filters:`, filters);
        
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
        logger.log(`[VisualBuilder] Raw result for "${term}":`, parsed);
        
        // Supabase RPC returns the result directly, not wrapped
        // But the function returns {data: [...]} or {error: ...}
        if (parsed?.error) {
          console.error(`[VisualBuilder] Query error for "${term}":`, parsed.error);
          continue;
        }
        
        // Get rows from the data array
        const rows = parsed?.data || [];
        logger.log(`[VisualBuilder] Rows for "${term}":`, rows.length, rows);
        
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
            logger.log(`[VisualBuilder] ✓ ${term}: ${finalValue.toFixed(2)}`);
          }
        } else {
          logger.log(`[VisualBuilder] No data for "${term}"`);
        }
      } catch (err) {
        console.error(`[VisualBuilder] Exception for "${term}":`, err);
      }
    }
    
    logger.log('[VisualBuilder] Final results:', results);
    return results;
  };

  const queryMultiDimension = async (
    config: MultiDimensionConfig,
    customerId: number | null,
    dateFilter?: { start: string; end: string },
    productFilters?: string[]
  ): Promise<{ raw: MultiDimensionData[]; grouped: GroupedChartData[]; secondaryGroups: string[] }> => {
    logger.log('[VisualBuilder] Multi-dimension query:', config);

    const needsShipmentItem = config.primaryGroupBy === 'description' ||
                              (productFilters && productFilters.length > 0);
    const tableName = needsShipmentItem ? 'shipment_item' : 'shipment';

    // For product category queries, we want to aggregate BY CATEGORY, not by individual product
    // So we query each category separately and combine the results
    if (productFilters && productFilters.length > 0 && config.primaryGroupBy === 'description') {
      logger.log('[VisualBuilder] Product category query - aggregating by category');

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

        logger.log(`[VisualBuilder] Querying multi-dim for category "${term}"`);

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
        logger.log(`[VisualBuilder] Results for "${term}":`, rows.length, 'rows');

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

      logger.log('[VisualBuilder] Category aggregation complete:', grouped.length, 'categories,', secondaryGroups.length, 'states');
      logger.log('[VisualBuilder] Grouped data:', grouped);

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
    logger.log('[VisualBuilder] Multi-dimension raw results:', rawData.length, 'rows');

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
    logger.log('[VisualBuilder] Transformed:', grouped.length, 'primary groups,', secondaryGroups.length, 'secondary groups');

    return { raw: rawData, grouped, secondaryGroups };
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
        logger.log('[VisualBuilder] Refreshing product query with terms:', filterTerms);
        
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
        logger.log('[VisualBuilder] Refreshing regular query:', config.groupByColumn, config.metricColumn);
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
        const rows: AggregateRow[] = parsed?.data || parsed || [];

        const chartData = rows.map((row: AggregateRow) => ({
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
      logger.log('[VisualBuilder] Column/aggregation changed, triggering refresh');
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

      logger.log('[VisualBuilder] Manual query - table:', tableName, 'groupBy:', groupByField, 'metric:', config.metricColumn);

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
      const rows: AggregateRow[] = parsed?.data || parsed || [];

      const chartData = rows.map((row: AggregateRow) => {
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

      logger.log('[VisualBuilder] Publishing widget to:', storagePath);

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
          <BuilderScopeSelector
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
              <BuilderAISection
                prompt={aiPrompt}
                setPrompt={setAiPrompt}
                loading={aiLoading}
                error={aiError}
                reasoning={aiReasoning}
                config={config}
                setConfig={setConfig}
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
              <BuilderManualSection
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

            <BuilderPublishModal
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
            <BuilderPreview
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
                      {(customers as CustomerRecord[] | undefined)?.find((c: CustomerRecord) => c.customer_id === (targetCustomerId || effectiveCustomerId))?.customer_name || 'Selected customer'} only
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

export default VisualBuilderV5Working;
