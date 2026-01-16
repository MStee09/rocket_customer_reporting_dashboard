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
import { useVisualBuilderState } from '../hooks/useVisualBuilderState';
import { useAIQueryExecution } from '../hooks/useAIQueryExecution';
import { useWidgetPublisher } from '../hooks/useWidgetPublisher';
import { useQueryExecution } from '../hooks/useQueryExecution';

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

  const { executeAIQuery } = useAIQueryExecution({
    aiPrompt,
    aiLoading,
    targetScope,
    targetCustomerId,
    effectiveCustomerId,
    userId: user?.id,
    canSeeAdminColumns,
    availableColumns,
    dateRange,
    setAiLoading,
    setAiError,
    setAiReasoning,
    setConfig,
    setHasResults,
    setIsProductQuery,
    syncFiltersFromAI,
  });

  const { publishWidget, isPublishing, publishResult, setPublishResult } = useWidgetPublisher({
    config,
    mode,
    visibility,
    user,
    isAdmin,
    effectiveCustomerId,
    targetCustomerId,
    publishDestination,
    pulseSection,
    analyticsSection,
    editableFilters,
    datePreset,
    setShowPublishModal,
  });

  const { runManualQuery, refreshData, previewLoading, previewError } = useQueryExecution({
    config,
    setConfig,
    targetScope,
    targetCustomerId,
    effectiveCustomerId,
    canSeeAdminColumns,
    dateRange,
    editableFilters,
    availableColumns,
    setHasResults,
    showToast,
    isProductQuery,
    setIsProductQuery,
  });

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

    prevGroupByRef.current = config.groupByColumn;
    prevMetricRef.current = config.metricColumn;
    prevAggregationRef.current = config.aggregation;

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
                onSubmit={executeAIQuery}
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
                  executeAIQuery();
                }}
              />
            ) : (
              <BuilderManualSection
                config={config}
                setConfig={setConfig}
                columns={availableColumns}
                onRunQuery={runManualQuery}
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
              onRefresh={refreshData}
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
        onPublish={publishWidget}
        customers={customers as { customer_id: number; customer_name: string }[]}
        targetCustomerId={targetCustomerId}
        effectiveCustomerId={effectiveCustomerId}
      />
    </div>
  );
}

export default VisualBuilderV5Working;
