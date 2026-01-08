/**
 * PreviewPanel - Live Preview of Widget
 * 
 * Shows a real-time preview of the widget using the actual widget execution system.
 * This ensures exact parity between what admin sees and what customers will see.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Loader2,
  AlertCircle,
  Maximize2,
  Minimize2,
  Calendar,
  Database,
} from 'lucide-react';
import { useBuilder } from '../BuilderContext';
import { supabase } from '../../../../lib/supabase';
import { withLimit } from '../../../../widgets/utils/withLimit';
import { WidgetRenderer } from '../../../../components/widgets/WidgetRenderer';
import type { VisualizationConfig } from '../../types/BuilderSchema';
import type { ExecutionParams } from '../../../../widgets/types/ExecutionParams';

// =============================================================================
// DATA FETCHERS
// =============================================================================

async function fetchKPIData(
  viz: VisualizationConfig,
  params: ExecutionParams
): Promise<any[]> {
  const { yField, aggregation = 'sum' } = viz;
  if (!yField) return [];

  // Build aggregation query
  let selectStr = '';
  switch (aggregation) {
    case 'sum': selectStr = `${yField}.sum()`; break;
    case 'avg': selectStr = `${yField}.avg()`; break;
    case 'count': selectStr = 'count'; break;
    case 'min': selectStr = `${yField}.min()`; break;
    case 'max': selectStr = `${yField}.max()`; break;
    default: selectStr = `${yField}.sum()`;
  }

  // For KPIs, we just get the total
  const { data, error, count } = await supabase
    .from('shipment_report_view')
    .select(yField, { count: 'exact' })
    .gte('pickup_date', params.dateRange.start)
    .lte('pickup_date', params.dateRange.end)
    .limit(params.limit || 10000);

  if (error) throw new Error(error.message);

  // Calculate aggregation client-side
  if (!data || data.length === 0) return [{ name: 'Total', value: 0 }];

  let value = 0;
  switch (aggregation) {
    case 'sum':
      value = data.reduce((sum, row) => sum + (Number(row[yField]) || 0), 0);
      break;
    case 'avg':
      value = data.reduce((sum, row) => sum + (Number(row[yField]) || 0), 0) / data.length;
      break;
    case 'count':
      value = count || data.length;
      break;
    case 'min':
      value = Math.min(...data.map(row => Number(row[yField]) || 0));
      break;
    case 'max':
      value = Math.max(...data.map(row => Number(row[yField]) || 0));
      break;
  }

  return [{ name: 'Total', value }];
}

async function fetchAggregatedData(
  viz: VisualizationConfig,
  params: ExecutionParams
): Promise<any[]> {
  const { xField, yField, groupBy, aggregation = 'sum' } = viz;
  if (!xField || !yField) return [];

  // Fetch raw data
  const columns = [xField, yField];
  if (groupBy) columns.push(groupBy);

  const { data, error } = await supabase
    .from('shipment_report_view')
    .select(columns.join(','))
    .gte('pickup_date', params.dateRange.start)
    .lte('pickup_date', params.dateRange.end)
    .limit(params.limit || 10000);

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  // Aggregate client-side
  const grouped = new Map<string, number>();
  
  for (const row of data) {
    const key = String(row[xField] || 'Unknown');
    const val = Number(row[yField]) || 0;
    
    switch (aggregation) {
      case 'sum':
        grouped.set(key, (grouped.get(key) || 0) + val);
        break;
      case 'count':
        grouped.set(key, (grouped.get(key) || 0) + 1);
        break;
      case 'avg':
        // Store sum and count for averaging later
        const existing = grouped.get(key) || 0;
        grouped.set(key, existing + val);
        break;
      case 'max':
        grouped.set(key, Math.max(grouped.get(key) || -Infinity, val));
        break;
      case 'min':
        grouped.set(key, Math.min(grouped.get(key) || Infinity, val));
        break;
    }
  }

  // Convert to array
  const result = Array.from(grouped.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20); // Top 20 for readability

  return result;
}

async function fetchTableData(
  viz: VisualizationConfig,
  params: ExecutionParams
): Promise<any[]> {
  const columns = [
    viz.xField,
    viz.yField,
    viz.groupBy,
    'carrier_name',
    'origin_state',
    'destination_state',
    'retail',
    'pickup_date'
  ].filter(Boolean).slice(0, 8);

  const { data, error } = await supabase
    .from('shipment_report_view')
    .select(columns.join(','))
    .gte('pickup_date', params.dateRange.start)
    .lte('pickup_date', params.dateRange.end)
    .order('pickup_date', { ascending: false })
    .limit(Math.min(params.limit || 100, 100));

  if (error) throw new Error(error.message);
  return data || [];
}

async function fetchGeoData(
  viz: VisualizationConfig,
  params: ExecutionParams
): Promise<any[]> {
  const regionField = viz.geo?.regionField || viz.flow?.originField || 'origin_state';
  const valueField = viz.geo?.valueField || viz.flow?.valueField || 'retail';

  const { data, error } = await supabase
    .from('shipment_report_view')
    .select(`${regionField},${valueField}`)
    .gte('pickup_date', params.dateRange.start)
    .lte('pickup_date', params.dateRange.end)
    .limit(params.limit || 10000);

  if (error) throw new Error(error.message);
  if (!data) return [];

  // Aggregate by region
  const grouped = new Map<string, number>();
  for (const row of data) {
    const key = String(row[regionField] || 'Unknown');
    const val = Number(row[valueField]) || 0;
    grouped.set(key, (grouped.get(key) || 0) + val);
  }

  return Array.from(grouped.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

// =============================================================================
// COMPONENT
// =============================================================================

export function PreviewPanel() {
  const { state, compiledParams, validation } = useBuilder();
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch preview data
  const fetchPreview = useCallback(async () => {
    // Validate minimum requirements
    if (!state.visualization.type) {
      setError('Select a visualization type');
      return;
    }

    if (['bar', 'line', 'area', 'scatter'].includes(state.visualization.type)) {
      if (!state.visualization.xField || !state.visualization.yField) {
        setError('Map X and Y axis fields to see preview');
        return;
      }
    }

    if (state.visualization.type === 'kpi' && !state.visualization.yField) {
      setError('Select a value field for KPI');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const safeParams = withLimit(compiledParams);
      
      // Build the query based on visualization type
      let data: any[] = [];

      if (state.visualization.type === 'kpi') {
        data = await fetchKPIData(state.visualization, safeParams);
      } else if (['bar', 'line', 'area', 'pie'].includes(state.visualization.type)) {
        data = await fetchAggregatedData(state.visualization, safeParams);
      } else if (state.visualization.type === 'table') {
        data = await fetchTableData(state.visualization, safeParams);
      } else if (['choropleth', 'flow'].includes(state.visualization.type)) {
        data = await fetchGeoData(state.visualization, safeParams);
      } else {
        data = await fetchTableData(state.visualization, safeParams);
      }

      setPreviewData(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
      setPreviewData(null);
    } finally {
      setIsLoading(false);
    }
  }, [state.visualization, compiledParams]);

  // Auto-refresh when config changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPreview();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchPreview]);

  // Map viz type to WidgetRenderer type
  const getRendererType = () => {
    const mapping: Record<string, string> = {
      bar: 'bar_chart',
      line: 'line_chart',
      area: 'area_chart',
      pie: 'pie_chart',
      kpi: 'kpi',
      table: 'table',
    };
    return mapping[state.visualization.type] || 'table';
  };

  return (
    <div className={`flex flex-col h-full ${isExpanded ? 'fixed inset-4 z-50 bg-white rounded-xl shadow-2xl' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Preview</h3>
          {lastRefresh && (
            <span className="text-xs text-slate-400">
              Updated {formatTime(lastRefresh)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchPreview}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh preview"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 p-4 overflow-auto">
        {/* Validation Warnings */}
        {validation.warnings.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
              <div className="text-xs text-amber-700">
                {validation.warnings.map((w, i) => (
                  <div key={i}>{w}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Date Range Info */}
        <div className="mb-4 flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{compiledParams.dateRange.start} to {compiledParams.dateRange.end}</span>
          </div>
          {previewData && (
            <div className="flex items-center gap-1">
              <Database className="w-3 h-3" />
              <span>{previewData.length} data points</span>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-sm">Loading preview...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-2 text-slate-400 text-center px-4">
              <AlertCircle className="w-8 h-8" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Preview Widget */}
        {!isLoading && !error && previewData && (
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="mb-2">
              <h4 className="font-semibold text-slate-900">{state.title || 'Untitled Widget'}</h4>
              {state.description && (
                <p className="text-xs text-slate-500">{state.description}</p>
              )}
            </div>
            <WidgetRenderer
              type={getRendererType()}
              data={previewData}
              height={isExpanded ? 400 : 256}
              showLegend={state.visualization.showLegend !== false}
              valuePrefix={state.visualization.kpi?.format === 'currency' ? '$' : ''}
              valueSuffix={state.visualization.kpi?.format === 'percent' ? '%' : ''}
            />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && (!previewData || previewData.length === 0) && (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-2 text-slate-400 text-center">
              <Database className="w-8 h-8" />
              <span className="text-sm">No data to preview</span>
              <span className="text-xs">Configure fields and filters to see data</span>
            </div>
          </div>
        )}
      </div>

      {/* Expanded backdrop */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/50 -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
}

function formatTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return date.toLocaleTimeString();
}

export default PreviewPanel;
