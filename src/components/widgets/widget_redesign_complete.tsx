// =============================================================================
// WIDGET SYSTEM REDESIGN - CONSOLIDATED IMPLEMENTATION
// =============================================================================
//
// Copy each section into the file path indicated. Work through in order.
//
// IMPLEMENTATION ORDER:
// 1. Config files (no dependencies)
// 2. Hooks
// 3. New components
// 4. Replace existing components
// 5. Replace DashboardPage
// 6. Add CSS
// 7. Cleanup old files
//
// =============================================================================


// =============================================================================
// STEP 1A: src/config/designTokens.ts (NEW FILE)
// =============================================================================

export const designTokens = {
  widget: {
    radius: '1rem',
    radiusLg: '1.25rem',
    shadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    shadowHover: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    shadowEdit: '0 0 0 2px rgb(249 115 22 / 0.5)',
    padding: '1rem',
    paddingLg: '1.5rem',
    gap: '1.5rem',
    headerHeight: '3.5rem',
    borderColor: 'rgb(226 232 240)',
    borderColorHover: 'rgb(203 213 225)',
  },
  colors: {
    primary: '#f97316',
    success: '#22c55e',
    info: '#3b82f6',
    warning: '#eab308',
    neutral: '#64748b',
    chart: [
      '#f97316', '#22c55e', '#3b82f6', '#eab308',
      '#8b5cf6', '#ec4899', '#06b6d4', '#64748b',
    ],
    iconBg: {
      primary: 'bg-orange-500',
      success: 'bg-green-500',
      info: 'bg-blue-500',
      warning: 'bg-yellow-500',
      neutral: 'bg-slate-500',
      violet: 'bg-violet-500',
      pink: 'bg-pink-500',
      cyan: 'bg-cyan-500',
    },
  },
  animation: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  typography: {
    kpiValue: {
      sm: 'text-2xl font-bold',
      md: 'text-3xl font-bold',
      lg: 'text-4xl font-bold',
    },
    kpiLabel: 'text-sm text-slate-500',
    widgetTitle: 'text-sm font-semibold text-slate-900',
    widgetTitleHero: 'text-base font-semibold text-slate-900',
  },
};


// =============================================================================
// STEP 1B: src/config/widgetConstraints.ts (NEW FILE)
// =============================================================================

export type WidgetSizeConstraint = 1 | 2 | 3;

export interface WidgetConstraints {
  minSize: WidgetSizeConstraint;
  maxSize: WidgetSizeConstraint;
  optimalSize: WidgetSizeConstraint;
  minHeight: number;
}

type WidgetType = 'kpi' | 'featured_kpi' | 'number' | 'currency' | 'percentage' |
                  'line_chart' | 'bar_chart' | 'pie_chart' | 'table' | 'map';

const widgetTypeConstraints: Record<WidgetType, WidgetConstraints> = {
  kpi: { minSize: 1, maxSize: 3, optimalSize: 1, minHeight: 120 },
  featured_kpi: { minSize: 1, maxSize: 3, optimalSize: 1, minHeight: 140 },
  number: { minSize: 1, maxSize: 3, optimalSize: 1, minHeight: 120 },
  currency: { minSize: 1, maxSize: 3, optimalSize: 1, minHeight: 120 },
  percentage: { minSize: 1, maxSize: 3, optimalSize: 1, minHeight: 120 },
  pie_chart: { minSize: 1, maxSize: 2, optimalSize: 1, minHeight: 200 },
  bar_chart: { minSize: 2, maxSize: 3, optimalSize: 2, minHeight: 280 },
  line_chart: { minSize: 2, maxSize: 3, optimalSize: 2, minHeight: 280 },
  table: { minSize: 2, maxSize: 3, optimalSize: 2, minHeight: 300 },
  map: { minSize: 2, maxSize: 3, optimalSize: 3, minHeight: 400 },
};

const widgetSpecificConstraints: Record<string, Partial<WidgetConstraints>> = {
  flow_map: { minSize: 3, maxSize: 3, optimalSize: 3, minHeight: 500 },
  cost_by_state: { minSize: 2, optimalSize: 3, minHeight: 400 },
  carrier_mix: { minSize: 1, maxSize: 2, optimalSize: 1, minHeight: 200 },
  top_lanes: { minSize: 2, optimalSize: 2, minHeight: 320 },
  monthly_spend: { minSize: 2, optimalSize: 2, minHeight: 280 },
};

export function getWidgetConstraints(widgetId: string, widgetType: string): WidgetConstraints {
  const typeConstraints = widgetTypeConstraints[widgetType as WidgetType] || widgetTypeConstraints.kpi;
  const specificOverrides = widgetSpecificConstraints[widgetId];
  return { ...typeConstraints, ...specificOverrides };
}

export function clampWidgetSize(
  requestedSize: WidgetSizeConstraint,
  widgetId: string,
  widgetType: string
): WidgetSizeConstraint {
  const constraints = getWidgetConstraints(widgetId, widgetType);
  return Math.max(constraints.minSize, Math.min(constraints.maxSize, requestedSize)) as WidgetSizeConstraint;
}

export function isValidWidgetSize(
  size: WidgetSizeConstraint,
  widgetId: string,
  widgetType: string
): boolean {
  const constraints = getWidgetConstraints(widgetId, widgetType);
  return size >= constraints.minSize && size <= constraints.maxSize;
}

export function getSizeLabel(size: WidgetSizeConstraint): string {
  switch (size) {
    case 1: return 'Small';
    case 2: return 'Medium';
    case 3: return 'Large';
    default: return 'Auto';
  }
}

export function getSizeColSpan(size: WidgetSizeConstraint): string {
  switch (size) {
    case 1: return 'col-span-1';
    case 2: return 'col-span-1 md:col-span-2';
    case 3: return 'col-span-1 md:col-span-2 lg:col-span-3';
    default: return 'col-span-1';
  }
}


// =============================================================================
// STEP 2: src/hooks/useDashboardEditMode.ts (NEW FILE)
// =============================================================================

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


// =============================================================================
// STEP 3A: src/components/dashboard/WidgetSkeleton.tsx (NEW FILE)
// =============================================================================

import React from 'react';

type WidgetType = 'kpi' | 'featured_kpi' | 'number' | 'currency' | 'percentage' |
                  'line_chart' | 'bar_chart' | 'pie_chart' | 'table' | 'map';

interface WidgetSkeletonProps {
  widgetType: WidgetType | string;
  size?: 1 | 2 | 3;
  showHeader?: boolean;
}

export function WidgetSkeleton({
  widgetType,
  size = 1,
  showHeader = true
}: WidgetSkeletonProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
      {showHeader && (
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-200 rounded-xl" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-slate-200 rounded" />
          </div>
        </div>
      )}
      <div className="p-4">
        {renderSkeletonContent(widgetType, size)}
      </div>
    </div>
  );
}

function renderSkeletonContent(widgetType: string, size: number) {
  switch (widgetType) {
    case 'kpi':
    case 'featured_kpi':
    case 'number':
    case 'currency':
    case 'percentage':
      return <KPISkeleton />;
    case 'bar_chart':
      return <BarChartSkeleton bars={size === 3 ? 12 : size === 2 ? 8 : 5} />;
    case 'line_chart':
      return <LineChartSkeleton />;
    case 'pie_chart':
      return <PieChartSkeleton showLegend={size >= 2} />;
    case 'table':
      return <TableSkeleton rows={size === 3 ? 8 : size === 2 ? 5 : 3} />;
    case 'map':
      return <MapSkeleton />;
    default:
      return <KPISkeleton />;
  }
}

function KPISkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-10 w-32 bg-slate-200 rounded" />
      <div className="h-4 w-24 bg-slate-100 rounded" />
    </div>
  );
}

function BarChartSkeleton({ bars = 7 }: { bars?: number }) {
  return (
    <div className="space-y-4">
      <div className="h-48 flex items-end gap-2">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-slate-200 rounded-t"
            style={{ height: `${30 + Math.random() * 70}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between">
        {Array.from({ length: Math.min(bars, 6) }).map((_, i) => (
          <div key={i} className="h-3 w-8 bg-slate-100 rounded" />
        ))}
      </div>
    </div>
  );
}

function LineChartSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="w-8 flex flex-col justify-between">
          <div className="h-3 w-full bg-slate-100 rounded" />
          <div className="h-3 w-full bg-slate-100 rounded" />
          <div className="h-3 w-full bg-slate-100 rounded" />
        </div>
        <div className="flex-1 h-48 bg-slate-100 rounded relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200/50 to-transparent animate-shimmer" />
        </div>
      </div>
      <div className="flex justify-between ml-10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-3 w-8 bg-slate-100 rounded" />
        ))}
      </div>
    </div>
  );
}

function PieChartSkeleton({ showLegend = true }: { showLegend?: boolean }) {
  return (
    <div className={`flex ${showLegend ? 'gap-6' : 'justify-center'}`}>
      <div className="w-32 h-32 rounded-full border-8 border-slate-200 relative">
        <div className="absolute inset-2 rounded-full border-4 border-slate-100" />
      </div>
      {showLegend && (
        <div className="flex-1 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-200" />
              <div className="h-3 flex-1 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 pb-2 border-b border-slate-100">
        <div className="h-4 w-1/4 bg-slate-200 rounded" />
        <div className="h-4 w-1/4 bg-slate-200 rounded" />
        <div className="h-4 w-1/4 bg-slate-200 rounded" />
        <div className="h-4 w-1/4 bg-slate-200 rounded" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-4 w-1/4 bg-slate-100 rounded" />
          <div className="h-4 w-1/4 bg-slate-100 rounded" />
          <div className="h-4 w-1/4 bg-slate-100 rounded" />
          <div className="h-4 w-1/4 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="h-64 bg-slate-100 rounded-xl relative overflow-hidden">
      <svg viewBox="0 0 100 60" className="absolute inset-0 w-full h-full opacity-20">
        <path
          d="M10,20 L20,15 L35,18 L50,15 L65,18 L80,15 L90,20 L92,35 L85,45 L70,48 L50,50 L30,48 L15,45 L8,35 Z"
          fill="currentColor"
          className="text-slate-300"
        />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200/30 to-transparent animate-shimmer" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="px-3 py-1.5 bg-white/80 rounded-full text-xs text-slate-500">
          Loading map data...
        </div>
      </div>
    </div>
  );
}


// =============================================================================
// STEP 3B: src/components/dashboard/InlineEditToolbar.tsx (NEW FILE)
// =============================================================================

import React from 'react';
import { Check, X, Plus, RotateCcw, Layout } from 'lucide-react';

interface InlineEditToolbarProps {
  isEditing: boolean;
  hasChanges: boolean;
  onEnterEdit: () => void;
  onExitEdit: () => void;
  onSave: () => void;
  onReset: () => void;
  onAddWidget: () => void;
}

export function InlineEditToolbar({
  isEditing,
  hasChanges,
  onEnterEdit,
  onExitEdit,
  onSave,
  onReset,
  onAddWidget,
}: InlineEditToolbarProps) {
  if (!isEditing) {
    return (
      <button
        onClick={onEnterEdit}
        className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-colors text-sm"
      >
        <Layout className="w-4 h-4" />
        Customize
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-xl">
      <div className="flex items-center gap-2 pr-3 border-r border-orange-200">
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-orange-700">Edit Mode</span>
      </div>

      <button
        onClick={onAddWidget}
        className="px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-100 rounded-lg flex items-center gap-1.5 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add
      </button>

      {hasChanges && (
        <button
          onClick={onReset}
          className="px-3 py-1.5 text-sm text-slate-600 hover:bg-orange-100 rounded-lg flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      )}

      <div className="w-px h-6 bg-orange-200" />

      <button
        onClick={onExitEdit}
        className="px-3 py-1.5 text-sm text-slate-600 hover:bg-orange-100 rounded-lg flex items-center gap-1.5 transition-colors"
      >
        <X className="w-4 h-4" />
        Cancel
      </button>

      <button
        onClick={onSave}
        className="px-3 py-1.5 text-sm bg-orange-500 text-white hover:bg-orange-600 rounded-lg flex items-center gap-1.5 transition-colors"
      >
        <Check className="w-4 h-4" />
        Done
      </button>
    </div>
  );
}


// =============================================================================
// STEP 3C: src/components/dashboard/EditableWidgetCard.tsx (NEW FILE)
// =============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { GripVertical, X, Lock, ChevronDown, Move } from 'lucide-react';
import {
  getWidgetConstraints,
  isValidWidgetSize,
  getSizeLabel,
  clampWidgetSize,
} from '../../config/widgetConstraints';

type WidgetSizeValue = 1 | 2 | 3;

interface EditableWidgetCardProps {
  children: React.ReactNode;
  widgetId: string;
  widgetType: string;
  widgetName: string;
  iconColor: string;
  icon: React.ReactNode;
  currentSize: WidgetSizeValue;
  isEditMode: boolean;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onSizeChange: (size: WidgetSizeValue) => void;
  allowHoverDrag?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export function EditableWidgetCard({
  children,
  widgetId,
  widgetType,
  widgetName,
  iconColor,
  icon,
  currentSize,
  isEditMode,
  isSelected,
  isDragging,
  onSelect,
  onRemove,
  onSizeChange,
  allowHoverDrag = true,
  onDragStart,
  onDragEnd,
}: EditableWidgetCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const constraints = getWidgetConstraints(widgetId, widgetType);

  useEffect(() => {
    if (!showSizeMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setShowSizeMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSizeMenu]);

  useEffect(() => {
    if (!isEditMode) {
      setShowSizeMenu(false);
    }
  }, [isEditMode]);

  const handleSizeSelect = (size: WidgetSizeValue) => {
    const clampedSize = clampWidgetSize(size, widgetId, widgetType);
    onSizeChange(clampedSize);
    setShowSizeMenu(false);
  };

  const showHoverDragHandle = !isEditMode && isHovered && allowHoverDrag;
  const showFullControls = isEditMode;

  return (
    <div
      ref={cardRef}
      className={`
        relative bg-white rounded-2xl border overflow-hidden transition-all duration-200
        ${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''}
        ${isSelected && isEditMode ? 'ring-2 ring-orange-500 border-orange-500' : 'border-slate-200'}
        ${isDragging ? 'opacity-50 scale-[0.98] shadow-2xl' : ''}
        ${isEditMode ? 'hover:border-orange-300' : 'hover:shadow-lg hover:border-slate-300'}
      `}
      style={{
        animation: isEditMode && !isDragging ? 'wiggle 0.3s ease-in-out infinite' : undefined,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => isEditMode && onSelect()}
    >
      {/* HOVER MODE: Subtle drag handle only */}
      {showHoverDragHandle && (
        <div
          className="absolute top-3 left-3 z-20 p-2 bg-white/95 rounded-lg shadow-md border border-slate-200 cursor-grab active:cursor-grabbing hover:bg-slate-50 transition-all animate-fade-in"
          onMouseDown={(e) => {
            e.stopPropagation();
            onDragStart?.();
          }}
          title="Drag to reorder"
        >
          <Move className="w-4 h-4 text-slate-500" />
        </div>
      )}

      {/* EDIT MODE: Full controls */}
      {showFullControls && (
        <>
          {/* Drag handle */}
          <div
            className="absolute top-3 left-3 z-20 p-2 bg-white rounded-lg shadow-md border border-slate-200 cursor-grab active:cursor-grabbing hover:bg-orange-50 hover:border-orange-300 transition-colors"
            onMouseDown={(e) => {
              e.stopPropagation();
              onDragStart?.();
            }}
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4 text-slate-500" />
          </div>

          {/* Remove button */}
          <button
            className="absolute -top-2 -right-2 z-20 w-7 h-7 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="Remove widget"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          {/* Size selector */}
          <div className="absolute bottom-3 right-3 z-20">
            <button
              className={`
                px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all
                ${showSizeMenu
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-orange-50 hover:text-orange-600 border border-slate-200 hover:border-orange-300'
                }
              `}
              onClick={(e) => {
                e.stopPropagation();
                setShowSizeMenu(!showSizeMenu);
              }}
            >
              {getSizeLabel(currentSize)}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showSizeMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Size dropdown */}
            {showSizeMenu && (
              <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden min-w-[160px] animate-scale-in">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Widget Size</span>
                </div>
                {([1, 2, 3] as WidgetSizeValue[]).map((size) => {
                  const isValid = isValidWidgetSize(size, widgetId, widgetType);
                  const isActive = currentSize === size;
                  const isOptimal = size === constraints.optimalSize;

                  return (
                    <button
                      key={size}
                      className={`
                        w-full px-3 py-2.5 text-left text-sm flex items-center justify-between transition-colors
                        ${isActive ? 'bg-orange-50 text-orange-600 font-medium' : 'text-slate-700'}
                        ${isValid && !isActive ? 'hover:bg-slate-50' : ''}
                        ${!isValid ? 'opacity-40 cursor-not-allowed bg-slate-50' : ''}
                      `}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isValid) handleSizeSelect(size);
                      }}
                      disabled={!isValid}
                    >
                      <span className="flex items-center gap-2">
                        <span className="flex gap-0.5">
                          {[1, 2, 3].map((col) => (
                            <span
                              key={col}
                              className={`w-2 h-3 rounded-sm ${
                                col <= size
                                  ? isActive ? 'bg-orange-500' : 'bg-slate-400'
                                  : 'bg-slate-200'
                              }`}
                            />
                          ))}
                        </span>
                        <span>{getSizeLabel(size)}</span>
                        {!isValid && <Lock className="w-3 h-3 text-slate-400" />}
                      </span>
                      {isOptimal && isValid && (
                        <span className="text-xs text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded">
                          Best
                        </span>
                      )}
                    </button>
                  );
                })}

                {(constraints.minSize > 1 || constraints.maxSize < 3) && (
                  <div className="px-3 py-2 bg-amber-50 border-t border-amber-100">
                    <p className="text-xs text-amber-700">
                      {constraints.minSize === 3
                        ? '📍 Maps need full width to display properly'
                        : constraints.minSize === 2
                          ? '📊 Charts need medium or larger size'
                          : constraints.maxSize < 3
                            ? '📏 This widget works best at smaller sizes'
                            : ''
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Size indicator */}
          {!showSizeMenu && (
            <div className="absolute bottom-3 left-3 z-10">
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                {currentSize === 1 ? '1 col' : currentSize === 2 ? '2 cols' : '3 cols'}
              </span>
            </div>
          )}
        </>
      )}

      {/* Selection indicator */}
      {isEditMode && isSelected && (
        <div className="absolute inset-0 pointer-events-none border-2 border-orange-500 rounded-2xl" />
      )}

      {/* Widget content */}
      <div className={isEditMode ? 'pointer-events-none' : ''}>
        {children}
      </div>
    </div>
  );
}


// =============================================================================
// STEP 3D: src/components/dashboard/WidgetGalleryModal.tsx (NEW FILE)
// =============================================================================

import React, { useState, useMemo, useEffect } from 'react';
import {
  X, Search, Plus, Star, TrendingUp,
  Package, DollarSign, PieChart, BarChart3, Map, Table, Globe,
  ChevronRight, Sparkles, Lock
} from 'lucide-react';
import { widgetLibrary, WidgetDefinition } from '../../config/widgetLibrary';
import { WidgetSkeleton } from './WidgetSkeleton';
import {
  getWidgetConstraints,
  isValidWidgetSize,
  getSizeLabel,
  WidgetSizeConstraint
} from '../../config/widgetConstraints';

interface WidgetGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (widgetId: string, size: WidgetSizeConstraint) => void;
  currentWidgets: string[];
  isAdmin: boolean;
}

type CollectionId = 'popular' | 'financial' | 'geographic' | 'performance' | 'all';

interface Collection {
  id: CollectionId;
  name: string;
  description: string;
  icon: React.ElementType;
  filter: (widget: WidgetDefinition) => boolean;
}

const collections: Collection[] = [
  {
    id: 'popular',
    name: 'Popular',
    description: 'Most used widgets',
    icon: Star,
    filter: (w) => ['total_shipments', 'total_cost', 'monthly_spend', 'flow_map', 'carrier_mix'].includes(w.id),
  },
  {
    id: 'financial',
    name: 'Financial',
    description: 'Cost and revenue metrics',
    icon: DollarSign,
    filter: (w) => w.category === 'financial',
  },
  {
    id: 'geographic',
    name: 'Geographic',
    description: 'Maps and location data',
    icon: Globe,
    filter: (w) => w.category === 'geographic',
  },
  {
    id: 'performance',
    name: 'Performance',
    description: 'KPIs and metrics',
    icon: TrendingUp,
    filter: (w) => w.category === 'performance' || w.category === 'volume',
  },
  {
    id: 'all',
    name: 'All Widgets',
    description: 'Browse everything',
    icon: Package,
    filter: () => true,
  },
];

const typeIcons: Record<string, React.ElementType> = {
  kpi: TrendingUp,
  featured_kpi: Star,
  bar_chart: BarChart3,
  line_chart: TrendingUp,
  pie_chart: PieChart,
  table: Table,
  map: Map,
};

export function WidgetGalleryModal({
  isOpen,
  onClose,
  onAddWidget,
  currentWidgets,
  isAdmin,
}: WidgetGalleryModalProps) {
  const [activeCollection, setActiveCollection] = useState<CollectionId>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWidget, setSelectedWidget] = useState<WidgetDefinition | null>(null);
  const [selectedSize, setSelectedSize] = useState<WidgetSizeConstraint>(1);

  useEffect(() => {
    if (isOpen) {
      setActiveCollection('popular');
      setSearchQuery('');
      setSelectedWidget(null);
      setSelectedSize(1);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedWidget) {
      const constraints = getWidgetConstraints(selectedWidget.id, selectedWidget.type);
      setSelectedSize(constraints.optimalSize);
    }
  }, [selectedWidget]);

  const allWidgets = useMemo(() => {
    return Object.values(widgetLibrary).filter(w => {
      if (w.adminOnly && !isAdmin) return false;
      return true;
    });
  }, [isAdmin]);

  const filteredWidgets = useMemo(() => {
    let widgets = allWidgets;

    const collection = collections.find(c => c.id === activeCollection);
    if (collection) {
      widgets = widgets.filter(collection.filter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      widgets = widgets.filter(w =>
        w.name.toLowerCase().includes(query) ||
        w.description.toLowerCase().includes(query)
      );
    }

    return widgets;
  }, [allWidgets, activeCollection, searchQuery]);

  const handleAdd = () => {
    if (selectedWidget) {
      onAddWidget(selectedWidget.id, selectedSize);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Widget Gallery</h2>
              <p className="text-sm text-slate-500">Choose widgets to add to your dashboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Collections sidebar */}
          <div className="w-56 border-r border-slate-200 p-4 flex-shrink-0">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
              Collections
            </div>
            <nav className="space-y-1">
              {collections.map((collection) => {
                const Icon = collection.icon;
                const isActive = activeCollection === collection.id;

                return (
                  <button
                    key={collection.id}
                    onClick={() => setActiveCollection(collection.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left
                      ${isActive
                        ? 'bg-orange-50 text-orange-700 font-medium'
                        : 'text-slate-600 hover:bg-slate-50'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {collection.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Widget list */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search widgets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                {filteredWidgets.map((widget) => {
                  const Icon = typeIcons[widget.type] || Package;
                  const isOnDashboard = currentWidgets.includes(widget.id);
                  const isSelected = selectedWidget?.id === widget.id;

                  return (
                    <button
                      key={widget.id}
                      onClick={() => !isOnDashboard && setSelectedWidget(widget)}
                      disabled={isOnDashboard}
                      className={`
                        p-4 rounded-xl border-2 text-left transition-all
                        ${isOnDashboard
                          ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                          : isSelected
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-slate-200 hover:border-orange-300 hover:bg-slate-50'
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 ${widget.iconColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 text-sm">{widget.name}</span>
                            {isOnDashboard && (
                              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">Added</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{widget.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredWidgets.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No widgets found</p>
                  <p className="text-sm text-slate-400 mt-1">Try adjusting your search</p>
                </div>
              )}
            </div>
          </div>

          {/* Preview panel */}
          <div className="w-80 border-l border-slate-200 p-4 bg-slate-50 flex-shrink-0 flex flex-col">
            {selectedWidget ? (
              <>
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                  Preview
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
                  <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
                    <div className={`w-6 h-6 ${selectedWidget.iconColor} rounded-lg flex items-center justify-center`}>
                      {React.createElement(typeIcons[selectedWidget.type] || Package, {
                        className: 'w-3 h-3 text-white'
                      })}
                    </div>
                    <span className="text-sm font-medium text-slate-900">{selectedWidget.name}</span>
                  </div>
                  <div className="p-3">
                    <WidgetSkeleton
                      widgetType={selectedWidget.type}
                      size={selectedSize}
                      showHeader={false}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-xs font-medium text-slate-500 mb-2">Size</div>
                  <div className="flex gap-2">
                    {([1, 2, 3] as WidgetSizeConstraint[]).map((size) => {
                      const isValid = isValidWidgetSize(size, selectedWidget.id, selectedWidget.type);
                      const isActive = selectedSize === size;
                      const constraints = getWidgetConstraints(selectedWidget.id, selectedWidget.type);
                      const isOptimal = size === constraints.optimalSize;

                      return (
                        <button
                          key={size}
                          onClick={() => isValid && setSelectedSize(size)}
                          disabled={!isValid}
                          className={`
                            flex-1 py-2.5 rounded-lg text-sm font-medium transition-all relative
                            ${isActive
                              ? 'bg-orange-500 text-white'
                              : isValid
                                ? 'bg-white border border-slate-200 text-slate-600 hover:border-orange-300'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }
                          `}
                        >
                          {!isValid && (
                            <Lock className="w-3 h-3 absolute top-1 right-1 text-slate-400" />
                          )}
                          {getSizeLabel(size)}
                          {isOptimal && isValid && !isActive && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="text-sm text-slate-600 mb-4">
                  <p>{selectedWidget.description}</p>
                </div>

                <button
                  onClick={handleAdd}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors mt-auto"
                >
                  <Plus className="w-4 h-4" />
                  Add to Dashboard
                </button>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <ChevronRight className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">Select a widget</p>
                  <p className="text-sm text-slate-400 mt-1">Click any widget to preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


// =============================================================================
// STEP 4A: src/components/dashboard/WidgetGrid.tsx (REPLACE ENTIRE FILE)
// =============================================================================

import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Package, Truck, CheckCircle, DollarSign, TrendingUp, PieChart as PieChartIcon, Map, Clock, Calendar, BarChart3, Globe, Route, Navigation, Receipt, Award, Percent } from 'lucide-react';

import { DashboardWidgetCard } from '../DashboardWidgetCard';
import { EditableWidgetCard } from './EditableWidgetCard';
import { AIWidgetRenderer } from './AIWidgetRenderer';
import { widgetLibrary } from '../../config/widgetLibrary';
import { getSizeColSpan, clampWidgetSize } from '../../config/widgetConstraints';

type WidgetSizeValue = 1 | 2 | 3;

interface WidgetItem {
  id: string;
  source: 'layout' | 'db';
}

interface WidgetGridProps {
  widgets: WidgetItem[];
  customWidgets: Record<string, any>;
  widgetSizes: Record<string, WidgetSizeValue>;
  customerId: string | undefined;
  startDate: string;
  endDate: string;
  comparisonDates: { start: string; end: string } | null;
  isEditMode?: boolean;
  selectedWidgetId?: string | null;
  onWidgetSelect?: (widgetId: string | null) => void;
  onWidgetRemove?: (widgetId: string) => void;
  onWidgetSizeChange?: (widgetId: string, size: WidgetSizeValue) => void;
  onReorder?: (newOrder: string[]) => void;
  allowHoverDrag?: boolean;
}

const iconMap: Record<string, React.ElementType> = {
  Package, Truck, CheckCircle, DollarSign, TrendingUp,
  PieChart: PieChartIcon, Map, Clock, Calendar, BarChart3,
  Globe, Route, Navigation, Receipt, Award, Percent,
};

function SortableWidget({
  id,
  children,
  disabled,
}: {
  id: string;
  children: React.ReactNode;
  disabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

export function WidgetGrid({
  widgets,
  customWidgets,
  widgetSizes,
  customerId,
  startDate,
  endDate,
  comparisonDates,
  isEditMode = false,
  selectedWidgetId = null,
  onWidgetSelect,
  onWidgetRemove,
  onWidgetSizeChange,
  onReorder,
  allowHoverDrag = true,
}: WidgetGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const isDragEnabled = isEditMode || allowHoverDrag;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id && onReorder) {
      const oldIndex = widgets.findIndex(w => w.id === active.id);
      const newIndex = widgets.findIndex(w => w.id === over.id);
      const newOrder = arrayMove(widgets.map(w => w.id), oldIndex, newIndex);
      onReorder(newOrder);
    }
  };

  const renderWidget = (item: WidgetItem, isDragOverlay = false) => {
    const widgetId = item.id;
    let widget = widgetLibrary[widgetId];
    let isCustom = false;

    if (!widget) {
      widget = customWidgets[widgetId];
      isCustom = true;
    }

    if (!widget) return null;

    const isAIWidget = widget.type === 'ai_report' || (widget as any).source === 'ai';
    const currentSize = (widgetSizes[widgetId] || 1) as WidgetSizeValue;
    const effectiveSize = clampWidgetSize(currentSize, widgetId, widget.type);
    const colSpanClass = getSizeColSpan(effectiveSize);

    if (isAIWidget) {
      return (
        <div key={widgetId} className={colSpanClass}>
          <AIWidgetRenderer
            widget={widget}
            onDelete={() => onWidgetRemove?.(widgetId)}
            compact
          />
        </div>
      );
    }

    const Icon = iconMap[widget.icon] || Package;

    if (isDragEnabled && !isDragOverlay) {
      return (
        <div key={widgetId} className={colSpanClass}>
          <EditableWidgetCard
            widgetId={widgetId}
            widgetType={widget.type}
            widgetName={widget.name}
            iconColor={widget.iconColor}
            icon={<Icon className="w-4 h-4 text-white" />}
            currentSize={effectiveSize}
            isEditMode={isEditMode}
            isSelected={selectedWidgetId === widgetId}
            isDragging={activeId === widgetId}
            onSelect={() => onWidgetSelect?.(widgetId)}
            onRemove={() => onWidgetRemove?.(widgetId)}
            onSizeChange={(size) => onWidgetSizeChange?.(widgetId, size)}
            allowHoverDrag={allowHoverDrag && !isEditMode}
            onDragStart={() => {}}
            onDragEnd={() => {}}
          >
            <DashboardWidgetCard
              widget={widget}
              customerId={customerId}
              dateRange={{ start: startDate, end: endDate }}
              comparisonDateRange={comparisonDates || undefined}
              isEditing={false}
              isCustomWidget={isCustom}
              sizeLevel="default"
              scaleFactor={1}
              onRemove={() => {}}
            />
          </EditableWidgetCard>
        </div>
      );
    }

    return (
      <div key={widgetId} className={`${colSpanClass} transition-all duration-300`}>
        <DashboardWidgetCard
          widget={widget}
          customerId={customerId}
          dateRange={{ start: startDate, end: endDate }}
          comparisonDateRange={comparisonDates || undefined}
          isEditing={false}
          isCustomWidget={isCustom}
          sizeLevel="default"
          scaleFactor={1}
          onRemove={() => {}}
        />
      </div>
    );
  };

  const gridContent = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-auto">
      {widgets.map((item) => (
        <SortableWidget key={item.id} id={item.id} disabled={!isDragEnabled}>
          {renderWidget(item)}
        </SortableWidget>
      ))}
    </div>
  );

  if (isDragEnabled) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
          {gridContent}
        </SortableContext>

        <DragOverlay>
          {activeId && widgets.find(w => w.id === activeId) && (
            <div className="opacity-90 rotate-1 scale-[1.02] shadow-2xl">
              {renderWidget(widgets.find(w => w.id === activeId)!, true)}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    );
  }

  return gridContent;
}


// =============================================================================
// STEP 4B: src/components/dashboard/DashboardHeader.tsx (REPLACE ENTIRE FILE)
// =============================================================================

import React from 'react';
import { RefreshCw, GitCompare } from 'lucide-react';

type ComparisonType = 'previous' | 'lastYear' | 'custom';

interface ComparisonConfig {
  enabled: boolean;
  type: ComparisonType;
  customRange?: { start: Date; end: Date };
}

interface DashboardHeaderProps {
  userName: string;
  isViewingAsCustomer: boolean;
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  comparison: ComparisonConfig | null;
  onComparisonChange: (comparison: ComparisonConfig | null) => void;
  showComparisonDropdown: boolean;
  onShowComparisonDropdownChange: (show: boolean) => void;
  comparisonDates: { start: string; end: string } | null;
  onRefresh: () => void;
  customizeButton?: React.ReactNode;
  onCustomize?: () => void;
}

export function DashboardHeader({
  userName,
  isViewingAsCustomer,
  dateRange,
  onDateRangeChange,
  comparison,
  onComparisonChange,
  showComparisonDropdown,
  onShowComparisonDropdownChange,
  comparisonDates,
  onRefresh,
  customizeButton,
  onCustomize,
}: DashboardHeaderProps) {
  return (
    <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          Welcome back, {userName}!
        </h1>
        <p className="text-slate-600">
          {isViewingAsCustomer ? 'Viewing customer dashboard' : 'Your logistics dashboard'}
        </p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={dateRange}
          onChange={(e) => onDateRangeChange(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
        >
          <option value="last7">Last 7 Days</option>
          <option value="last30">Last 30 Days</option>
          <option value="last90">Last 90 Days</option>
          <option value="last6months">Last 6 Months</option>
          <option value="lastyear">Last Year</option>
          <option value="thisMonth">This Month</option>
          <option value="thisQuarter">This Quarter</option>
          <option value="thisYear">This Year</option>
          <option value="next30">Next 30 Days</option>
          <option value="next90">Next 90 Days</option>
          <option value="upcoming">Upcoming (Next Year)</option>
        </select>

        <div className="relative">
          <button
            onClick={() => onShowComparisonDropdownChange(!showComparisonDropdown)}
            className={`px-4 py-2 border rounded-lg flex items-center gap-2 text-sm transition-colors ${
              comparison?.enabled
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            {comparison?.enabled ? (
              comparison.type === 'previous' ? 'vs Previous Period' :
              comparison.type === 'lastYear' ? 'vs Last Year' : 'vs Custom'
            ) : 'Compare'}
          </button>

          {showComparisonDropdown && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 z-50 p-3">
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={comparison?.enabled || false}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onComparisonChange({ enabled: true, type: 'previous' });
                      } else {
                        onComparisonChange(null);
                      }
                    }}
                    className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Enable comparison</span>
                </label>

                {comparison?.enabled && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Compare to
                    </label>
                    <select
                      value={comparison.type}
                      onChange={(e) => onComparisonChange({
                        ...comparison,
                        type: e.target.value as ComparisonType
                      })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="previous">Previous Period</option>
                      <option value="lastYear">Same Period Last Year</option>
                      <option value="custom">Custom Range</option>
                    </select>

                    {comparison.type === 'custom' && (
                      <div className="space-y-2 pt-2">
                        <input
                          type="date"
                          value={comparison.customRange?.start?.toISOString().split('T')[0] || ''}
                          onChange={(e) => onComparisonChange({
                            ...comparison,
                            customRange: {
                              start: new Date(e.target.value),
                              end: comparison.customRange?.end || new Date()
                            }
                          })}
                          className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                        <input
                          type="date"
                          value={comparison.customRange?.end?.toISOString().split('T')[0] || ''}
                          onChange={(e) => onComparisonChange({
                            ...comparison,
                            customRange: {
                              start: comparison.customRange?.start || new Date(),
                              end: new Date(e.target.value)
                            }
                          })}
                          className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    )}

                    {comparisonDates && (
                      <div className="pt-2 text-xs text-slate-500">
                        Comparing: {comparisonDates.start} to {comparisonDates.end}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => onShowComparisonDropdownChange(false)}
                  className="w-full mt-2 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg flex items-center gap-2 transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>

        {customizeButton}
      </div>
    </div>
  );
}


// =============================================================================
// STEP 4C: src/components/dashboard/index.ts (UPDATE - add new exports)
// =============================================================================

export { AIInsightsCard } from './AIInsightsCard';
export { AIInsightsPanel } from './AIInsightsPanel';
export { AIReportsSection } from './AIReportsSection';
export { AIWidgetRenderer } from './AIWidgetRenderer';
export { ComparisonMetrics } from './ComparisonMetrics';
export { DashboardHeader } from './DashboardHeader';
export { WidgetGrid } from './WidgetGrid';
// NEW exports
export { WidgetSkeleton } from './WidgetSkeleton';
export { EditableWidgetCard } from './EditableWidgetCard';
export { InlineEditToolbar } from './InlineEditToolbar';
export { WidgetGalleryModal } from './WidgetGalleryModal';


// =============================================================================
// STEP 5: src/pages/DashboardPage.tsx (REPLACE ENTIRE FILE)
// This is a large file - see widget_dashboard_page_updated.tsx
// =============================================================================
// NOTE: Copy the complete DashboardPage from the file:
// widget_dashboard_page_updated.tsx
// 
// It includes:
// - useDashboardEditMode hook integration
// - Auto-save with debounce for hover drag
// - Separate notifications for manual save vs auto-save
// - All the new component integrations


// =============================================================================
// STEP 6: Add to src/index.css (or your global stylesheet)
// =============================================================================
/*

@keyframes wiggle {
  0%, 100% { transform: rotate(-0.3deg); }
  50% { transform: rotate(0.3deg); }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.animate-shimmer {
  animation: shimmer 1.5s infinite;
}

.animate-fade-in {
  animation: fade-in 0.2s ease-out forwards;
}

.animate-scale-in {
  animation: scale-in 0.15s ease-out forwards;
}

*/


// =============================================================================
// STEP 7: DELETE THESE OLD FILES (optional cleanup)
// =============================================================================
/*

DELETE: src/components/LayoutEditorModal.tsx
DELETE: src/components/AddWidgetModal.tsx

These are replaced by:
- InlineEditToolbar (edit mode controls in header)
- WidgetGalleryModal (new widget picker)
- EditableWidgetCard (inline editing on each widget)

*/
