import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import {
  VisualBuilderSchema,
  createDefaultBuilderSchema,
  VisualizationType,
  VisualizationConfig,
  LogicBlock,
  PublishConfig,
} from '../types/BuilderSchema';
import type { ExecutionParams } from '../../../widgets/types/ExecutionParams';

const STORAGE_KEY = 'visual-builder-draft';

type BuilderAction =
  | { type: 'SET_TITLE'; payload: string }
  | { type: 'SET_DESCRIPTION'; payload: string }
  | { type: 'SET_VISUALIZATION_TYPE'; payload: VisualizationType }
  | { type: 'SET_VISUALIZATION_CONFIG'; payload: Partial<VisualizationConfig> }
  | { type: 'SET_EXECUTION_PARAMS'; payload: Partial<ExecutionParams> }
  | { type: 'SET_DATA_SOURCE'; payload: { table: string; columns: string[] } }
  | { type: 'ADD_LOGIC_BLOCK'; payload: LogicBlock }
  | { type: 'UPDATE_LOGIC_BLOCK'; payload: { id: string; updates: Partial<LogicBlock> } }
  | { type: 'REMOVE_LOGIC_BLOCK'; payload: string }
  | { type: 'TOGGLE_LOGIC_BLOCK'; payload: string }
  | { type: 'SET_PUBLISH_CONFIG'; payload: Partial<PublishConfig> }
  | { type: 'SET_ACTIVE_PANEL'; payload: VisualBuilderSchema['ui']['activePanel'] }
  | { type: 'SET_PREVIEW_LOADING'; payload: boolean }
  | { type: 'SET_PREVIEW_ERROR'; payload: string | undefined }
  | { type: 'LOAD_SCHEMA'; payload: VisualBuilderSchema }
  | { type: 'RESET' };

function builderReducer(state: VisualBuilderSchema, action: BuilderAction): VisualBuilderSchema {
  switch (action.type) {
    case 'SET_TITLE':
      return { ...state, title: action.payload, ui: { ...state.ui, isDirty: true } };

    case 'SET_DESCRIPTION':
      return { ...state, description: action.payload, ui: { ...state.ui, isDirty: true } };

    case 'SET_VISUALIZATION_TYPE':
      return {
        ...state,
        visualization: { ...state.visualization, type: action.payload },
        ui: { ...state.ui, isDirty: true },
      };

    case 'SET_VISUALIZATION_CONFIG':
      return {
        ...state,
        visualization: { ...state.visualization, ...action.payload },
        ui: { ...state.ui, isDirty: true },
      };

    case 'SET_EXECUTION_PARAMS':
      return {
        ...state,
        executionParams: { ...state.executionParams, ...action.payload },
        ui: { ...state.ui, isDirty: true },
      };

    case 'SET_DATA_SOURCE':
      return {
        ...state,
        dataSource: action.payload,
        ui: { ...state.ui, isDirty: true },
      };

    case 'ADD_LOGIC_BLOCK':
      return {
        ...state,
        logicBlocks: [...state.logicBlocks, action.payload],
        ui: { ...state.ui, isDirty: true },
      };

    case 'UPDATE_LOGIC_BLOCK':
      return {
        ...state,
        logicBlocks: state.logicBlocks.map(block =>
          block.id === action.payload.id ? { ...block, ...action.payload.updates } : block
        ),
        ui: { ...state.ui, isDirty: true },
      };

    case 'REMOVE_LOGIC_BLOCK':
      return {
        ...state,
        logicBlocks: state.logicBlocks.filter(block => block.id !== action.payload),
        ui: { ...state.ui, isDirty: true },
      };

    case 'TOGGLE_LOGIC_BLOCK':
      return {
        ...state,
        logicBlocks: state.logicBlocks.map(block =>
          block.id === action.payload ? { ...block, enabled: !block.enabled } : block
        ),
        ui: { ...state.ui, isDirty: true },
      };

    case 'SET_PUBLISH_CONFIG':
      return {
        ...state,
        publish: { ...state.publish, ...action.payload },
        ui: { ...state.ui, isDirty: true },
      };

    case 'SET_ACTIVE_PANEL':
      return { ...state, ui: { ...state.ui, activePanel: action.payload } };

    case 'SET_PREVIEW_LOADING':
      return { ...state, ui: { ...state.ui, previewLoading: action.payload } };

    case 'SET_PREVIEW_ERROR':
      return { ...state, ui: { ...state.ui, previewError: action.payload } };

    case 'LOAD_SCHEMA':
      return { ...action.payload, ui: { ...action.payload.ui, isDirty: false } };

    case 'RESET':
      return createDefaultBuilderSchema();

    default:
      return state;
  }
}

interface BuilderContextValue {
  state: VisualBuilderSchema;
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setVisualizationType: (type: VisualizationType) => void;
  setVisualizationConfig: (config: Partial<VisualizationConfig>) => void;
  setExecutionParams: (params: Partial<ExecutionParams>) => void;
  setDataSource: (table: string, columns: string[]) => void;
  addLogicBlock: (block: LogicBlock) => void;
  updateLogicBlock: (id: string, updates: Partial<LogicBlock>) => void;
  removeLogicBlock: (id: string) => void;
  toggleLogicBlock: (id: string) => void;
  setPublishConfig: (config: Partial<PublishConfig>) => void;
  setActivePanel: (panel: VisualBuilderSchema['ui']['activePanel']) => void;
  setPreviewLoading: (loading: boolean) => void;
  setPreviewError: (error: string | undefined) => void;
  loadSchema: (schema: VisualBuilderSchema) => void;
  reset: () => void;
}

const BuilderContext = createContext<BuilderContextValue | null>(null);

interface BuilderProviderProps {
  children: React.ReactNode;
  initialSchema?: VisualBuilderSchema;
}

export function BuilderProvider({ children, initialSchema }: BuilderProviderProps) {
  const [state, dispatch] = useReducer(
    builderReducer,
    initialSchema || createDefaultBuilderSchema()
  );

  useEffect(() => {
    if (state.ui.isDirty) {
      saveDraftToStorage(state);
    }
  }, [state]);

  const setTitle = useCallback((title: string) => {
    dispatch({ type: 'SET_TITLE', payload: title });
  }, []);

  const setDescription = useCallback((description: string) => {
    dispatch({ type: 'SET_DESCRIPTION', payload: description });
  }, []);

  const setVisualizationType = useCallback((type: VisualizationType) => {
    dispatch({ type: 'SET_VISUALIZATION_TYPE', payload: type });
  }, []);

  const setVisualizationConfig = useCallback((config: Partial<VisualizationConfig>) => {
    dispatch({ type: 'SET_VISUALIZATION_CONFIG', payload: config });
  }, []);

  const setExecutionParams = useCallback((params: Partial<ExecutionParams>) => {
    dispatch({ type: 'SET_EXECUTION_PARAMS', payload: params });
  }, []);

  const setDataSource = useCallback((table: string, columns: string[]) => {
    dispatch({ type: 'SET_DATA_SOURCE', payload: { table, columns } });
  }, []);

  const addLogicBlock = useCallback((block: LogicBlock) => {
    dispatch({ type: 'ADD_LOGIC_BLOCK', payload: block });
  }, []);

  const updateLogicBlock = useCallback((id: string, updates: Partial<LogicBlock>) => {
    dispatch({ type: 'UPDATE_LOGIC_BLOCK', payload: { id, updates } });
  }, []);

  const removeLogicBlock = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_LOGIC_BLOCK', payload: id });
  }, []);

  const toggleLogicBlock = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_LOGIC_BLOCK', payload: id });
  }, []);

  const setPublishConfig = useCallback((config: Partial<PublishConfig>) => {
    dispatch({ type: 'SET_PUBLISH_CONFIG', payload: config });
  }, []);

  const setActivePanel = useCallback((panel: VisualBuilderSchema['ui']['activePanel']) => {
    dispatch({ type: 'SET_ACTIVE_PANEL', payload: panel });
  }, []);

  const setPreviewLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_PREVIEW_LOADING', payload: loading });
  }, []);

  const setPreviewError = useCallback((error: string | undefined) => {
    dispatch({ type: 'SET_PREVIEW_ERROR', payload: error });
  }, []);

  const loadSchema = useCallback((schema: VisualBuilderSchema) => {
    dispatch({ type: 'LOAD_SCHEMA', payload: schema });
  }, []);

  const reset = useCallback(() => {
    clearDraftFromStorage();
    dispatch({ type: 'RESET' });
  }, []);

  const value: BuilderContextValue = {
    state,
    setTitle,
    setDescription,
    setVisualizationType,
    setVisualizationConfig,
    setExecutionParams,
    setDataSource,
    addLogicBlock,
    updateLogicBlock,
    removeLogicBlock,
    toggleLogicBlock,
    setPublishConfig,
    setActivePanel,
    setPreviewLoading,
    setPreviewError,
    loadSchema,
    reset,
  };

  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>;
}

export function useBuilder(): BuilderContextValue {
  const context = useContext(BuilderContext);
  if (!context) {
    throw new Error('useBuilder must be used within a BuilderProvider');
  }
  return context;
}

function saveDraftToStorage(schema: VisualBuilderSchema): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
  } catch {
    console.warn('Failed to save draft to localStorage');
  }
}

export function loadDraftFromStorage(): VisualBuilderSchema | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    console.warn('Failed to load draft from localStorage');
  }
  return null;
}

export function clearDraftFromStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    console.warn('Failed to clear draft from localStorage');
  }
}
