import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { findWidgetDefinition } from '../registry/widgetRegistry';
import { mergeExecutionParams, createDefaultExecutionParams } from '../types/ExecutionParams';
import { withLimit } from '../utils/withLimit';
import { WidgetRenderer } from '../../components/widgets/WidgetRenderer';
import type { WidgetInstance, WidgetData } from '../types/WidgetTypes';
import type { ExecutionParams } from '../types/ExecutionParams';

interface WidgetInstanceRendererProps {
  instance: WidgetInstance;
  customerId: number;
  executionParams?: Partial<ExecutionParams>;
  height?: number | string;
  showTitle?: boolean;
  showRefresh?: boolean;
  className?: string;
  onDataLoad?: (data: WidgetData) => void;
  onError?: (error: Error) => void;
}

interface WidgetState {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: WidgetData | null;
  error: string | null;
  lastUpdated: Date | null;
}

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

  const definition = findWidgetDefinition(instance.definitionId);

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
      const baseParams = createDefaultExecutionParams(instance.defaultParams);
      const mergedParams = mergeExecutionParams(baseParams, executionParams || {});
      const safeParams = withLimit(mergedParams);

      const startTime = performance.now();
      const data = await definition.calculate({
        supabase,
        customerId,
        params: safeParams,
        mode: 'visual',
      });
      const executionTime = performance.now() - startTime;

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

  useEffect(() => {
    executeWidget();
  }, [executeWidget]);

  const displayTitle = instance.titleOverride || definition?.name || 'Widget';
  const displayDescription = instance.descriptionOverride || definition?.description;

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

export default WidgetInstanceRenderer;
