/**
 * WidgetInstanceRenderer
 * 
 * Renders a WidgetInstance by:
 * 1. Looking up the WidgetDefinition from registry
 * 2. Merging instance defaults with runtime params
 * 3. Executing the widget's calculate() function
 * 4. Rendering the appropriate visualization
 * 
 * This is the bridge between WidgetInstance (what) and WidgetDefinition (how).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getWidgetDefinition, findWidgetDefinition } from '../registry/widgetRegistry';
import { mergeExecutionParams, createDefaultExecutionParams } from '../types/ExecutionParams';
import { withLimit } from '../utils/withLimit';
import { WidgetRenderer } from '../../components/widgets/WidgetRenderer';
import type { WidgetInstance, WidgetDefinition, WidgetData } from '../types/WidgetTypes';
import type { ExecutionParams } from '../types/ExecutionParams';

// =============================================================================
// TYPES
// =============================================================================

interface WidgetInstanceRendererProps {
  /** The widget instance to render */
  instance: WidgetInstance;
  
  /** Customer ID for data fetching */
  customerId: number;
  
  /** Runtime execution params (override instance defaults) */
  executionParams?: Partial<ExecutionParams>;
  
  /** Height of the widget */
  height?: number | string;
  
  /** Show title header */
  showTitle?: boolean;
  
  /** Show refresh button */
  showRefresh?: boolean;
  
  /** Additional CSS class */
  className?: string;
  
  /** Callback when data loads */
  onDataLoad?: (data: WidgetData) => void;
  
  /** Callback on error */
  onError?: (error: Error) => void;
}

interface WidgetState {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: WidgetData | null;
  error: string | null;
  lastUpdated: Date | null;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function WidgetInstanceRenderer({
  instance,
  customerId,
  executionParams,
  height = 256,
  showTitle = true,
  showRefresh = true,
  className = '',
  onDataLoad,
  onError,
}: WidgetInstanceRendererProps) {
  const [state, setState] = useState<WidgetState>({
    status: 'idle',
    data: null,
    error: null,
    lastUpdated: null,
  });

  // Look up the widget definition
  const definition = findWidgetDefinition(instance.definitionId);

  // Execute the widget
  const executeWidget = useCallback(async () => {
    if (!definition) {
      setState({
        status: 'error',
        data: null,
        error: `Widget definition not found: ${instance.definitionId}`,
        lastUpdated: null,
      });
      return;
    }

    setState(prev => ({ ...prev, status: 'loading', error: null }));

    try {
      // Merge params: instance defaults + runtime overrides + safety limits
      const baseParams = createDefaultExecutionParams(instance.defaultParams);
      const mergedParams = mergeExecutionParams(baseParams, executionParams || {});
      const safeParams = withLimit(mergedParams);

      // Execute the widget's calculate function
      const startTime = performance.now();
      const data = await definition.calculate({
        supabase,
        customerId,
        params: safeParams,
        mode: 'visual',
      });
      const executionTime = performance.now() - startTime;

      // Add metadata
      const enrichedData: WidgetData = {
        ...data,
        metadata: {
          ...data.metadata,
          lastUpdated: new Date().toISOString(),
        },
      };

      setState({
        status: 'success',
        data: enrichedData,
        error: null,
        lastUpdated: new Date(),
      });

      onDataLoad?.(enrichedData);

      console.debug(`[Widget] ${instance.definitionId} executed in ${executionTime.toFixed(0)}ms`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState({
        status: 'error',
        data: null,
        error: error.message,
        lastUpdated: null,
      });
      onError?.(error);
      console.error(`[Widget] ${instance.definitionId} failed:`, error);
    }
  }, [definition, instance, customerId, executionParams, onDataLoad, onError]);

  // Execute on mount and when deps change
  useEffect(() => {
    executeWidget();
  }, [executeWidget]);

  // Get display title
  const displayTitle = instance.titleOverride || definition?.name || 'Widget';
  const displayDescription = instance.descriptionOverride || definition?.description;

  // Render loading state
  if (state.status === 'loading') {
    return (
      <WidgetCard
        title={showTitle ? displayTitle : undefined}
        className={className}
      >
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        </div>
      </WidgetCard>
    );
  }

  // Render error state
  if (state.status === 'error' || !definition) {
    return (
      <WidgetCard
        title={showTitle ? displayTitle : undefined}
        className={className}
        onRefresh={showRefresh ? executeWidget : undefined}
      >
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-red-500 flex flex-col items-center gap-2 text-center px-4">
            <AlertCircle className="w-8 h-8" />
            <span className="text-sm">{state.error || 'Widget not found'}</span>
          </div>
        </div>
      </WidgetCard>
    );
  }

  // Render widget data
  return (
    <WidgetCard
      title={showTitle ? displayTitle : undefined}
      description={displayDescription}
      className={className}
      onRefresh={showRefresh ? executeWidget : undefined}
      lastUpdated={state.lastUpdated}
    >
      <WidgetRenderer
        type={definition.visualization.type}
        data={state.data?.data || []}
        title={state.data?.label}
        height={height}
        valuePrefix={state.data?.format === 'currency' ? '$' : undefined}
        valueSuffix={state.data?.format === 'percent' ? '%' : undefined}
        loading={state.status === 'loading'}
        error={state.error}
      />
    </WidgetCard>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface WidgetCardProps {
  title?: string;
  description?: string;
  className?: string;
  onRefresh?: () => void;
  lastUpdated?: Date | null;
  children: React.ReactNode;
}

function WidgetCard({
  title,
  description,
  className = '',
  onRefresh,
  lastUpdated,
  children,
}: WidgetCardProps) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      {title && (
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
            {description && (
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-slate-400">
                {formatRelativeTime(lastUpdated)}
              </span>
            )}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return date.toLocaleDateString();
}

// =============================================================================
// EXPORT
// =============================================================================

export default WidgetInstanceRenderer;
