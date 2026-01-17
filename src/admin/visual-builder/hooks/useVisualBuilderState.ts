import { useState, useCallback, useMemo, useEffect } from 'react';
import { logger } from '../../../utils/logger';
import { ALL_COLUMNS, ADMIN_ONLY_COLUMNS } from '../config/columnDefinitions';
import type {
  ChartType,
  BuilderMode,
  Aggregation,
  DateRangePreset,
  PublishDestination,
  PulseSection,
  AnalyticsSection,
  Column,
  EditableFilter,
  WidgetConfig,
} from '../types/visualBuilderTypes';

interface CustomerRecord {
  customer_id: number;
  customer_name: string;
}

interface UseVisualBuilderStateParams {
  user: { id: string } | null;
  isAdmin: () => boolean;
  isViewingAsCustomer: boolean;
  effectiveCustomerId: number | null;
  customers: CustomerRecord[];
}

interface ToastState {
  message: string;
  type: 'success' | 'info' | 'error';
}

export function useVisualBuilderState({
  user,
  isAdmin,
  isViewingAsCustomer,
  effectiveCustomerId,
  customers,
}: UseVisualBuilderStateParams) {
  const isUserAdmin = isAdmin() && !isViewingAsCustomer;

  const [targetScope, setTargetScope] = useState<'admin' | 'customer'>(
    isUserAdmin ? 'admin' : 'customer'
  );
  const [targetCustomerId, setTargetCustomerIdInternal] = useState<number | null>(() => effectiveCustomerId);
  const [hasExplicitSelection, setHasExplicitSelection] = useState(false);

  const setTargetCustomerId = useCallback((id: number | null) => {
    logger.log('[VisualBuilder] Explicit customer selection:', id);
    setHasExplicitSelection(true);
    setTargetCustomerIdInternal(id);
  }, []);

  useEffect(() => {
    if (!hasExplicitSelection && effectiveCustomerId) {
      if (!targetCustomerId || targetCustomerId !== effectiveCustomerId) {
        logger.log('[VisualBuilder] Syncing from effectiveCustomerId:', {
          from: targetCustomerId,
          to: effectiveCustomerId
        });
        setTargetCustomerIdInternal(effectiveCustomerId);
      }
    }
  }, [effectiveCustomerId, hasExplicitSelection]);

  const canSeeAdminColumns = isUserAdmin && targetScope === 'admin';

  const availableColumns = useMemo(() => {
    if (canSeeAdminColumns) {
      return ALL_COLUMNS;
    }
    return ALL_COLUMNS.filter(col => !col.adminOnly);
  }, [canSeeAdminColumns]);

  const [mode, setMode] = useState<BuilderMode>('ai');

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiReasoning, setAiReasoning] = useState<Array<{ type: string; content: string; toolName?: string }>>([]);

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

  const [datePreset, setDatePreset] = useState<DateRangePreset>('last30');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const [visibility, setVisibility] = useState<'admin_only' | 'all_customers' | 'private'>('admin_only');

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishDestination, setPublishDestination] = useState<PublishDestination>('pulse');
  const [pulseSection, setPulseSection] = useState<PulseSection>('custom');
  const [analyticsSection, setAnalyticsSection] = useState<AnalyticsSection>('custom');

  const [editableFilters, setEditableFilters] = useState<EditableFilter[]>([]);
  const [showRawData, setShowRawData] = useState(false);

  const [hasResults, setHasResults] = useState(false);

  const [barOrientation, setBarOrientation] = useState<'horizontal' | 'vertical'>('horizontal');

  const [toast, setToast] = useState<ToastState | null>(null);

  const [needsRefresh, setNeedsRefresh] = useState(false);

  const [isProductQuery, setIsProductQuery] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

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
    setNeedsRefresh(true);
  }, [editableFilters, showToast]);

  const syncFiltersFromAI = useCallback((searchTerms: string[]) => {
    const newFilters: EditableFilter[] = searchTerms.map((term, i) => ({
      id: `ai_filter_${Date.now()}_${i}`,
      field: 'item_description',
      operator: 'contains' as const,
      value: term,
    }));
    setEditableFilters(newFilters);
  }, []);

  return {
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
    setToast,

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
  };
}

export type VisualBuilderState = ReturnType<typeof useVisualBuilderState>;
