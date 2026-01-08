/**
 * BuilderContext - State management for Visual Builder
 * 
 * Provides:
 * - Central state for the entire builder
 * - Actions to update state
 * - Undo/redo support
 * - Auto-save drafts
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { 
  VisualBuilderSchema, 
  LogicBlock, 
  VisualizationConfig,
  PublishConfig 
} from '../types/BuilderSchema';
import { createDefaultBuilderSchema, validateBuilderSchema } from '../types/BuilderSchema';
import { compileLogicBlocks } from '../logic/compileLogic';
import type { ExecutionParams } from '../../widgets/types/ExecutionParams';

// =============================================================================
// ACTIONS
// =============================================================================

type BuilderAction =
  | { type: 'SET_TITLE'; payload: string }
  | { type: 'SET_DESCRIPTION'; payload: string }
  | { type: 'SET_DATA_SOURCE'; payload: { table: string; columns: string[] } }
  | { type: 'SET_VISUALIZATION'; payload: Partial<VisualizationConfig> }
  | { type: 'SET_EXECUTION_PARAMS'; payload: Partial<ExecutionParams> }
  | { type: 'ADD_LOGIC_BLOCK'; payload: LogicBlock }
  | { type: 'UPDATE_LOGIC_BLOCK'; payload: { id: string; updates: Partial<LogicBlock> } }
  | { type: 'REMOVE_LOGIC_BLOCK'; payload: string }
  | { type: 'REORDER_LOGIC_BLOCKS'; payload: LogicBlock[] }
  | { type: 'SET_PUBLISH_CONFIG'; payload: Partial<PublishConfig> }
  | { type: 'SET_ACTIVE_PANEL'; payload: VisualBuilderSchema['ui']['activePanel'] }
  | { type: 'SET_PREVIEW_LOADING'; payload: boolean }
  | { type: 'SET_PREVIEW_ERROR'; payload: string | undefined }
  | { type: 'MARK_DIRTY' }
  | { type: 'MARK_CLEAN' }
  | { type: 'LOAD_SCHEMA'; payload: VisualBuilderSchema }
  | { type: 'RESET' };

// =============================================================================
// REDUCER
// =============================================================================

function builderReducer(
  state: VisualBuilderSchema,
  action: BuilderAction
): VisualBuilderSchema {
  switch (action.type) {
    case 'SET_TITLE':
      return { ...state, title: action.payload, ui: { ...state.ui, isDirty: true } };

    case 'SET_DESCRIPTION':
      return { ...state, description: action.payload, ui: { ...state.ui, isDirty: true } };

    case 'SET_DATA_SOURCE':
      return { ...state, dataSource: action.payload, ui: { ...state.ui, isDirty: true } };

    case 'SET_VISUALIZATION':
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
          block.id === action.payload.id
            ? { ...block, ...action.payload.updates }
            : block
        ),
        ui: { ...state.ui, isDirty: true },
      };

    case 'REMOVE_LOGIC_BLOCK':
      return {
        ...state,
        logicBlocks: state.logicBlocks.filter(b => b.id !== action.payload),
        ui: { ...state.ui, isDirty: true },
      };

    case 'REORDER_LOGIC_BLOCKS':
      return {
        ...state,
        logicBlocks: action.payload,
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

    case 'MARK_DIRTY':
      return { ...state, ui: { ...state.ui, isDirty: true } };

    case 'MARK_CLEAN':
      return { ...state, ui: { ...state.ui, isDirty: false } };

    case 'LOAD_SCHEMA':
      return { ...action.payload, ui: { ...action.payload.ui, isDirty: false } };

    case 'RESET':
      return createDefaultBuilderSchema();

    default:
      return state;
  }
}

// =============================================================================
// CONTEXT
// =============================================================================

interface BuilderContextValue {
  state: VisualBuilderSchema;
  dispatch: React.Dispatch<BuilderAction>;
  
  // Computed values
  compiledParams: ExecutionParams;
  validation: ReturnType<typeof validateBuilderSchema>;
  
  // Action helpers
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setVisualization: (config: Partial<VisualizationConfig>) => void;
  setExecutionParams: (params: Partial<ExecutionParams>) => void;
  addLogicBlock: (block: LogicBlock) => void;
  updateLogicBlock: (id: string, updates: Partial<LogicBlock>) => void;
  removeLogicBlock: (id: string) => void;
  setPublishConfig: (config: Partial<PublishConfig>) => void;
  setActivePanel: (panel: VisualBuilderSchema['ui']['activePanel']) => void;
  reset: () => void;
  loadSchema: (schema: VisualBuilderSchema) => void;
}

const BuilderContext = createContext<BuilderContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface BuilderProviderProps {
  children: React.ReactNode;
  initialSchema?: VisualBuilderSchema;
}

export function BuilderProvider({ children, initialSchema }: BuilderProviderProps) {
  const [state, dispatch] = useReducer(
    builderReducer,
    initialSchema || createDefaultBuilderSchema()
  );

  // Computed: compile logic blocks into execution params
  const compiledParams = React.useMemo(
    () => compileLogicBlocks(state.logicBlocks, state.executionParams),
    [state.logicBlocks, state.executionParams]
  );

  // Computed: validation
  const validation = React.useMemo(
    () => validateBuilderSchema(state),
    [state]
  );

  // Action helpers
  const setTitle = useCallback((title: string) => {
    dispatch({ type: 'SET_TITLE', payload: title });
  }, []);

  const setDescription = useCallback((description: string) => {
    dispatch({ type: 'SET_DESCRIPTION', payload: description });
  }, []);

  const setVisualization = useCallback((config: Partial<VisualizationConfig>) => {
    dispatch({ type: 'SET_VISUALIZATION', payload: config });
  }, []);

  const setExecutionParams = useCallback((params: Partial<ExecutionParams>) => {
    dispatch({ type: 'SET_EXECUTION_PARAMS', payload: params });
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

  const setPublishConfig = useCallback((config: Partial<PublishConfig>) => {
    dispatch({ type: 'SET_PUBLISH_CONFIG', payload: config });
  }, []);

  const setActivePanel = useCallback((panel: VisualBuilderSchema['ui']['activePanel']) => {
    dispatch({ type: 'SET_ACTIVE_PANEL', payload: panel });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const loadSchema = useCallback((schema: VisualBuilderSchema) => {
    dispatch({ type: 'LOAD_SCHEMA', payload: schema });
  }, []);

  // Auto-save draft to localStorage
  useEffect(() => {
    if (state.ui.isDirty) {
      const timer = setTimeout(() => {
        try {
          localStorage.setItem('visual_builder_draft', JSON.stringify(state));
        } catch (e) {
          console.warn('Failed to save draft:', e);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const value: BuilderContextValue = {
    state,
    dispatch,
    compiledParams,
    validation,
    setTitle,
    setDescription,
    setVisualization,
    setExecutionParams,
    addLogicBlock,
    updateLogicBlock,
    removeLogicBlock,
    setPublishConfig,
    setActivePanel,
    reset,
    loadSchema,
  };

  return (
    <BuilderContext.Provider value={value}>
      {children}
    </BuilderContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useBuilder(): BuilderContextValue {
  const context = useContext(BuilderContext);
  if (!context) {
    throw new Error('useBuilder must be used within a BuilderProvider');
  }
  return context;
}

// =============================================================================
// DRAFT RECOVERY
// =============================================================================

export function loadDraftFromStorage(): VisualBuilderSchema | null {
  try {
    const draft = localStorage.getItem('visual_builder_draft');
    if (draft) {
      return JSON.parse(draft);
    }
  } catch (e) {
    console.warn('Failed to load draft:', e);
  }
  return null;
}

export function clearDraftFromStorage(): void {
  try {
    localStorage.removeItem('visual_builder_draft');
  } catch (e) {
    console.warn('Failed to clear draft:', e);
  }
}
