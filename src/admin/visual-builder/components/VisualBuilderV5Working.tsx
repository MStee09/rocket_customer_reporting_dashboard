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
import { VisualBuilderPublishModal } from './VisualBuilderPublishModal';
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
import {
  queryProductCategories,
  queryMultiDimension,
} from '../utils/visualBuilderQueries';
import { useVisualBuilderState } from '../hooks/useVisualBuilderState';

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

  const {
    isUserAdmin,
    canSeeAdminColumns,
    availableColumns,
    targetScope,
    setTargetScope,
    targetCustomerId,
    setTargetCustomerId,
    mode,
    setMode,
    aiPrompt,
    setAiPrompt,
    aiLoading,
    setAiLoading,
    aiError,
    setAiError,
    aiReasoning,
    setAiReasoning,
    config,
    setConfig,
    previewLoading,
    setPreviewLoading,
    previewError,
    setPreviewError,
    isPublishing,
    setIsPublishing,
    publishResult,
    setPublishResult,
    datePreset,
    setDatePreset,
    showDateDropdown,
    setShowDateDropdown,
    dateRange,
    setDateRange,
    visibility,
    setVisibility,
    showPublishModal,
    setShowPublishModal,
    publishDestination,
    setPublishDestination,
    pulseSection,
    setPulseSection,
    analyticsSection,
    setAnalyticsSection,
    editableFilters,
    setEditableFilters,
    showRawData,
    setShowRawData,
    hasResults,
    setHasResults,
    barOrientation,
    setBarOrientation,
    toast,
    needsRefresh,
    setNeedsRefresh,
    isProductQuery,
    setIsProductQuery,
    showToast,
    updateDateRange,
    addFilter,
    updateFilter,
    removeFilter,
    syncFiltersFromAI,
  } = useVisualBuilderState({
    user,
    isAdmin,
    isViewingAsCustomer,
    effectiveCustomerId,
    customers,
  });

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
  }, [aiPrompt, aiLoading, targetScope, targetCustomerId, effectiveCustomerId, user?.id, canSeeAdminColumns, availableColumns, syncFiltersFromAI]);

  // =============================================================================
  // REFRESH DATA
  // =============================================================================

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

      <VisualBuilderPublishModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        publishDestination={publishDestination}
        setPublishDestination={setPublishDestination}
        pulseSection={pulseSection}
        setPulseSection={setPulseSection}
        analyticsSection={analyticsSection}
        setAnalyticsSection={setAnalyticsSection}
        visibility={visibility}
        setVisibility={setVisibility}
        isPublishing={isPublishing}
        onPublish={handlePublish}
        customers={customers as { customer_id: number; customer_name: string }[]}
        targetCustomerId={targetCustomerId}
        effectiveCustomerId={effectiveCustomerId}
      />
    </div>
  );
}

export default VisualBuilderV5Working;
