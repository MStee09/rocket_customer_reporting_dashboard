import { useState, useCallback, useEffect } from 'react';

interface EditModeState {
  isEditing: boolean;
  isDragging: boolean;
  draggedWidgetId: string | null;
  selectedWidgetId: string | null;
  pendingChanges: boolean;
}

interface UseDashboardEditModeReturn {
  state: EditModeState;
  enterEditMode: () => void;
  exitEditMode: () => void;
  toggleEditMode: () => void;
  selectWidget: (widgetId: string | null) => void;
  startDrag: (widgetId: string) => void;
  endDrag: () => void;
  setPendingChanges: (pending: boolean) => void;
}

export function useDashboardEditMode(): UseDashboardEditModeReturn {
  const [state, setState] = useState<EditModeState>({
    isEditing: false,
    isDragging: false,
    draggedWidgetId: null,
    selectedWidgetId: null,
    pendingChanges: false,
  });

  const enterEditMode = useCallback(() => {
    setState(prev => ({ ...prev, isEditing: true }));
  }, []);

  const exitEditMode = useCallback(() => {
    setState({
      isEditing: false,
      isDragging: false,
      draggedWidgetId: null,
      selectedWidgetId: null,
      pendingChanges: false,
    });
  }, []);

  const toggleEditMode = useCallback(() => {
    setState(prev => {
      if (prev.isEditing) {
        return {
          isEditing: false,
          isDragging: false,
          draggedWidgetId: null,
          selectedWidgetId: null,
          pendingChanges: false,
        };
      }
      return { ...prev, isEditing: true };
    });
  }, []);

  const selectWidget = useCallback((widgetId: string | null) => {
    setState(prev => ({ ...prev, selectedWidgetId: widgetId }));
  }, []);

  const startDrag = useCallback((widgetId: string) => {
    setState(prev => ({
      ...prev,
      isDragging: true,
      draggedWidgetId: widgetId,
      selectedWidgetId: widgetId,
    }));
  }, []);

  const endDrag = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDragging: false,
      draggedWidgetId: null,
    }));
  }, []);

  const setPendingChanges = useCallback((pending: boolean) => {
    setState(prev => ({ ...prev, pendingChanges: pending }));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.isEditing) {
        exitEditMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isEditing, exitEditMode]);

  return {
    state,
    enterEditMode,
    exitEditMode,
    toggleEditMode,
    selectWidget,
    startDrag,
    endDrag,
    setPendingChanges,
  };
}
