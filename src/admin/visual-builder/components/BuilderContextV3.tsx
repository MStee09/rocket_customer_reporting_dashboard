import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import {
  BuilderState,
  BuilderAction,
  initialBuilderState,
  builderReducer,
  WidgetQueryFilter,
  WidgetQueryJoin,
  WidgetQueryConfig,
  WidgetDefinitionV3,
  WidgetVisibility,
  WidgetPlacement,
  AIResult,
  BuilderStep,
  BuilderMode,
  ChartType,
  buildQueryConfig as buildQueryConfigFromState,
  buildWidgetDefinition as buildWidgetDefinitionFromState,
} from '../types/BuilderSchemaV3';
import { useAuth } from '../../../contexts/AuthContext';

interface BuilderContextValue {
  state: BuilderState;
  dispatch: React.Dispatch<BuilderAction>;
  setMode: (mode: BuilderMode) => void;
  setStep: (step: BuilderStep) => void;
  setAIPrompt: (prompt: string) => void;
  setAIProcessing: (processing: boolean) => void;
  setAIResult: (result: AIResult | null) => void;
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setChartType: (chartType: ChartType) => void;
  setBaseTable: (table: string) => void;
  addJoin: (join: WidgetQueryJoin) => void;
  removeJoin: (table: string) => void;
  setXField: (field: string) => void;
  setYField: (field: string) => void;
  setAggregation: (aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max') => void;
  addFilter: (filter: WidgetQueryFilter) => void;
  updateFilter: (index: number, filter: WidgetQueryFilter) => void;
  removeFilter: (index: number) => void;
  setGroupBy: (fields: string[]) => void;
  setOrderBy: (field: string) => void;
  setOrderDir: (dir: 'asc' | 'desc') => void;
  setLimit: (limit: number) => void;
  setCustomerScope: (scope: 'all' | 'specific', customerId?: number) => void;
  setPreviewDateRange: (range: { start: string; end: string }) => void;
  setPreviewData: (data: any[] | null) => void;
  setPreviewLoading: (loading: boolean) => void;
  setPreviewError: (error: string | null) => void;
  setVisibility: (visibility: WidgetVisibility) => void;
  setPlacement: (placement: WidgetPlacement) => void;
  setSection: (section: string) => void;
  applyAISuggestion: (suggestion: AIResult['suggestedWidget']) => void;
  reset: () => void;
  canProceed: () => boolean;
  canPublish: () => boolean;
  canProceedToPreview: () => boolean;
  getValidationErrors: () => string[];
  buildQueryConfig: () => WidgetQueryConfig;
  buildWidgetDefinition: () => WidgetDefinitionV3;
}

const BuilderContext = createContext<BuilderContextValue | null>(null);

interface BuilderProviderProps {
  children: ReactNode;
  initialState?: Partial<BuilderState>;
}

export function BuilderProviderV3({ children, initialState }: BuilderProviderProps) {
  const { user, isAdmin } = useAuth();
  const [state, dispatch] = useReducer(
    builderReducer,
    initialState ? { ...initialBuilderState, ...initialState } : initialBuilderState
  );

  const setMode = useCallback((mode: BuilderMode) => {
    dispatch({ type: 'SET_MODE', mode });
  }, []);

  const setStep = useCallback((step: BuilderStep) => {
    dispatch({ type: 'SET_STEP', step });
  }, []);

  const setAIPrompt = useCallback((prompt: string) => {
    dispatch({ type: 'SET_AI_PROMPT', prompt });
  }, []);

  const setAIProcessing = useCallback((processing: boolean) => {
    dispatch({ type: 'SET_AI_PROCESSING', processing });
  }, []);

  const setAIResult = useCallback((result: AIResult | null) => {
    dispatch({ type: 'SET_AI_RESULT', result });
  }, []);

  const setName = useCallback((name: string) => {
    dispatch({ type: 'SET_NAME', name });
  }, []);

  const setDescription = useCallback((description: string) => {
    dispatch({ type: 'SET_DESCRIPTION', description });
  }, []);

  const setChartType = useCallback((chartType: ChartType) => {
    dispatch({ type: 'SET_CHART_TYPE', chartType });
  }, []);

  const setBaseTable = useCallback((table: string) => {
    dispatch({ type: 'SET_BASE_TABLE', table });
  }, []);

  const addJoin = useCallback((join: WidgetQueryJoin) => {
    dispatch({ type: 'ADD_JOIN', join });
  }, []);

  const removeJoin = useCallback((table: string) => {
    dispatch({ type: 'REMOVE_JOIN', table });
  }, []);

  const setXField = useCallback((field: string) => {
    dispatch({ type: 'SET_X_FIELD', field });
  }, []);

  const setYField = useCallback((field: string) => {
    dispatch({ type: 'SET_Y_FIELD', field });
  }, []);

  const setAggregation = useCallback((aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max') => {
    dispatch({ type: 'SET_AGGREGATION', aggregation });
  }, []);

  const addFilter = useCallback((filter: WidgetQueryFilter) => {
    dispatch({ type: 'ADD_FILTER', filter });
  }, []);

  const updateFilter = useCallback((index: number, filter: WidgetQueryFilter) => {
    dispatch({ type: 'UPDATE_FILTER', index, filter });
  }, []);

  const removeFilter = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_FILTER', index });
  }, []);

  const setGroupBy = useCallback((fields: string[]) => {
    dispatch({ type: 'SET_GROUP_BY', fields });
  }, []);

  const setOrderBy = useCallback((field: string) => {
    dispatch({ type: 'SET_ORDER_BY', field });
  }, []);

  const setOrderDir = useCallback((dir: 'asc' | 'desc') => {
    dispatch({ type: 'SET_ORDER_DIR', dir });
  }, []);

  const setLimit = useCallback((limit: number) => {
    dispatch({ type: 'SET_LIMIT', limit });
  }, []);

  const setCustomerScope = useCallback((scope: 'all' | 'specific', customerId?: number) => {
    dispatch({ type: 'SET_CUSTOMER_SCOPE', scope, customerId });
  }, []);

  const setPreviewDateRange = useCallback((range: { start: string; end: string }) => {
    dispatch({ type: 'SET_PREVIEW_DATE_RANGE', range });
  }, []);

  const setPreviewData = useCallback((data: any[] | null) => {
    dispatch({ type: 'SET_PREVIEW_DATA', data });
  }, []);

  const setPreviewLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_PREVIEW_LOADING', loading });
  }, []);

  const setPreviewError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_PREVIEW_ERROR', error });
  }, []);

  const setVisibility = useCallback((visibility: WidgetVisibility) => {
    dispatch({ type: 'SET_VISIBILITY', visibility });
  }, []);

  const setPlacement = useCallback((placement: WidgetPlacement) => {
    dispatch({ type: 'SET_PLACEMENT', placement });
  }, []);

  const setSection = useCallback((section: string) => {
    dispatch({ type: 'SET_SECTION', section });
  }, []);

  const applyAISuggestion = useCallback((suggestion: AIResult['suggestedWidget']) => {
    dispatch({ type: 'APPLY_AI_SUGGESTION', suggestion });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const canProceed = useCallback((): boolean => {
    switch (state.step) {
      case 'input':
        return state.mode === 'manual' || (state.aiResult?.success ?? false);
      case 'configure':
        return !!state.name && !!state.chartType && (!!state.xField || state.chartType === 'kpi');
      case 'preview':
        return state.previewData !== null && state.previewData.length > 0;
      case 'publish':
        return true;
      default:
        return false;
    }
  }, [state]);

  const canPublish = useCallback((): boolean => {
    return !!state.name && state.previewData !== null && state.previewData.length > 0;
  }, [state.name, state.previewData]);

  const canProceedToPreview = useCallback((): boolean => {
    return !!state.name && !!state.chartType && !!state.yField && (!!state.xField || state.chartType === 'kpi');
  }, [state.name, state.chartType, state.xField, state.yField]);

  const getValidationErrors = useCallback((): string[] => {
    const errors: string[] = [];
    if (!state.name) errors.push('Name is required');
    if (!state.chartType) errors.push('Chart type is required');
    if (state.chartType !== 'kpi' && !state.xField) errors.push('X-axis field is required');
    if (!state.yField) errors.push('Y-axis field is required');
    if (state.customerScope === 'specific' && !state.selectedCustomerId) {
      errors.push('Customer must be selected for customer-specific scope');
    }
    return errors;
  }, [state]);

  const buildQueryConfig = useCallback((): WidgetQueryConfig => {
    return buildQueryConfigFromState(state);
  }, [state]);

  const buildWidgetDefinition = useCallback((): WidgetDefinitionV3 => {
    return buildWidgetDefinitionFromState(state, user?.id || '', user?.email || '', isAdmin());
  }, [state, user, isAdmin]);

  const value: BuilderContextValue = {
    state,
    dispatch,
    setMode,
    setStep,
    setAIPrompt,
    setAIProcessing,
    setAIResult,
    setName,
    setDescription,
    setChartType,
    setBaseTable,
    addJoin,
    removeJoin,
    setXField,
    setYField,
    setAggregation,
    addFilter,
    updateFilter,
    removeFilter,
    setGroupBy,
    setOrderBy,
    setOrderDir,
    setLimit,
    setCustomerScope,
    setPreviewDateRange,
    setPreviewData,
    setPreviewLoading,
    setPreviewError,
    setVisibility,
    setPlacement,
    setSection,
    applyAISuggestion,
    reset,
    canProceed,
    canPublish,
    canProceedToPreview,
    getValidationErrors,
    buildQueryConfig,
    buildWidgetDefinition,
  };

  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>;
}

export function useBuilderV3() {
  const context = useContext(BuilderContext);
  if (!context) {
    throw new Error('useBuilderV3 must be used within a BuilderProviderV3');
  }
  return context;
}

export { BuilderContext };
