// =============================================================================
// WIDGET SYSTEM FIXES
// =============================================================================
//
// TWO ISSUES TO FIX:
// 1. Maps (flow_map, cost_by_state) should DEFAULT to large size, not require manual resize
// 2. Map panning/zooming is broken because hover drag intercepts mouse events
//
// =============================================================================


// =============================================================================
// FIX 1: src/config/widgetConstraints.ts (REPLACE ENTIRE FILE)
// =============================================================================
// Added: getDefaultSize() function that returns optimal size for new widgets

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
  // Maps MUST be large
  flow_map: { minSize: 3, maxSize: 3, optimalSize: 3, minHeight: 500 },
  cost_by_state: { minSize: 2, maxSize: 3, optimalSize: 3, minHeight: 400 },
  // Other specific overrides
  carrier_mix: { minSize: 1, maxSize: 2, optimalSize: 1, minHeight: 200 },
  top_lanes: { minSize: 2, maxSize: 3, optimalSize: 2, minHeight: 320 },
  monthly_spend: { minSize: 2, maxSize: 3, optimalSize: 2, minHeight: 280 },
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

// NEW: Get the default/optimal size for a widget
// This should be used when initializing widget sizes
export function getDefaultSize(widgetId: string, widgetType: string): WidgetSizeConstraint {
  const constraints = getWidgetConstraints(widgetId, widgetType);
  return constraints.optimalSize;
}

// NEW: Check if widget type needs special interaction handling (like maps)
export function isInteractiveWidget(widgetType: string): boolean {
  return widgetType === 'map';
}

// NEW: Get default sizes for all widgets in a layout
export function getDefaultSizesForLayout(
  layout: string[], 
  widgetLibrary: Record<string, { type: string }>
): Record<string, WidgetSizeConstraint> {
  const sizes: Record<string, WidgetSizeConstraint> = {};
  
  for (const widgetId of layout) {
    const widget = widgetLibrary[widgetId];
    if (widget) {
      sizes[widgetId] = getDefaultSize(widgetId, widget.type);
    } else {
      sizes[widgetId] = 1; // Default to small for unknown widgets
    }
  }
  
  return sizes;
}


// =============================================================================
// FIX 2: src/components/dashboard/EditableWidgetCard.tsx (REPLACE ENTIRE FILE)
// =============================================================================
// Changes:
// - Added isInteractiveContent prop to disable hover drag on maps
// - Map widgets won't show hover drag handle (only edit mode controls)
// - This allows map panning/zooming to work normally

import { useState, useRef, useEffect, ReactNode } from 'react';
import { GripVertical, X, Lock, ChevronDown, Move } from 'lucide-react';
import {
  getWidgetConstraints,
  isValidWidgetSize,
  getSizeLabel,
  clampWidgetSize,
  isInteractiveWidget,
} from '../../config/widgetConstraints';

type WidgetSizeValue = 1 | 2 | 3;

interface EditableWidgetCardProps {
  children: ReactNode;
  widgetId: string;
  widgetType: string;
  widgetName: string;
  iconColor: string;
  icon: ReactNode;
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
}: EditableWidgetCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const constraints = getWidgetConstraints(widgetId, widgetType);
  
  // Check if this widget has interactive content (like maps)
  const hasInteractiveContent = isInteractiveWidget(widgetType);

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

  // Don't show hover drag handle for interactive widgets (maps)
  // They need mouse events for panning/zooming
  const showHoverDragHandle = !isEditMode && isHovered && allowHoverDrag && !hasInteractiveContent;
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
      {/* HOVER MODE: Subtle drag handle (NOT shown for maps) */}
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

      {/* EDIT MODE: Full controls (shown for ALL widgets including maps) */}
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

      {/* Widget content - NOT pointer-events-none for interactive widgets when not in edit mode */}
      <div className={isEditMode ? 'pointer-events-none' : ''}>
        {children}
      </div>
    </div>
  );
}


// =============================================================================
// FIX 3: src/pages/DashboardPage.tsx (PARTIAL UPDATE)
// =============================================================================
// Find the convertSizes function and update it to apply default sizes

// FIND THIS SECTION (around line 85-94):
/*
  const convertSizes = useCallback((sizes: Record<string, string>): Record<string, WidgetSizeValue> => {
    const converted: Record<string, WidgetSizeValue> = {};
    Object.entries(sizes).forEach(([key, value]) => {
      if (value === 'default' || value === '1') converted[key] = 1;
      else if (value === 'large' || value === 'expanded' || value === '2') converted[key] = 2;
      else if (value === 'xlarge' || value === 'full' || value === '3') converted[key] = 3;
      else converted[key] = 1;
    });
    return converted;
  }, []);
*/

// REPLACE WITH:
import { getDefaultSize } from '../config/widgetConstraints';
// (add to imports at top)

const convertSizes = useCallback((
  sizes: Record<string, string>,
  currentLayout: string[]
): Record<string, WidgetSizeValue> => {
  const converted: Record<string, WidgetSizeValue> = {};
  
  // First, apply stored sizes
  Object.entries(sizes).forEach(([key, value]) => {
    if (value === 'default' || value === '1') converted[key] = 1;
    else if (value === 'large' || value === 'expanded' || value === '2') converted[key] = 2;
    else if (value === 'xlarge' || value === 'full' || value === '3') converted[key] = 3;
    else converted[key] = 1;
  });
  
  // Then, for any widgets in layout without a stored size, apply smart defaults
  for (const widgetId of currentLayout) {
    if (!(widgetId in converted)) {
      const widget = widgetLibrary[widgetId];
      if (widget) {
        // Use the optimal size as default
        converted[widgetId] = getDefaultSize(widgetId, widget.type);
      } else {
        converted[widgetId] = 1;
      }
    }
  }
  
  return converted;
}, []);


// ALSO UPDATE the useEffect that calls convertSizes (around line 96-100):
// FIND:
/*
  useEffect(() => {
    if (!editMode.state.isEditing) {
      setLocalLayout(layout);
      setLocalSizes(convertSizes(storedWidgetSizes));
      lastSavedLayoutRef.current = layout;
    }
  }, [layout, storedWidgetSizes, editMode.state.isEditing, convertSizes]);
*/

// REPLACE WITH:
useEffect(() => {
  if (!editMode.state.isEditing) {
    setLocalLayout(layout);
    setLocalSizes(convertSizes(storedWidgetSizes, layout));
    lastSavedLayoutRef.current = layout;
  }
}, [layout, storedWidgetSizes, editMode.state.isEditing, convertSizes]);


// =============================================================================
// FIX 4: src/components/dashboard/WidgetGrid.tsx (PARTIAL UPDATE)  
// =============================================================================
// Import the new function
import { getSizeColSpan, clampWidgetSize, WidgetSizeConstraint, isInteractiveWidget } from '../../config/widgetConstraints';

// In renderWidget function, update EditableWidgetCard to pass widget type
// The current code already passes widgetType, so no change needed there.
// But we need to update allowHoverDrag logic:

// FIND (around line 179):
/*
            allowHoverDrag={allowHoverDrag && !isEditMode}
*/

// REPLACE WITH:
            allowHoverDrag={allowHoverDrag && !isEditMode && !isInteractiveWidget(widget.type)}


// =============================================================================
// SUMMARY OF CHANGES
// =============================================================================
/*

ISSUE 1: Maps should default to large size
------------------------------------------
- Added getDefaultSize() function to widgetConstraints.ts
- Updated convertSizes() in DashboardPage.tsx to apply smart defaults
- flow_map will now default to size 3 (Large)
- cost_by_state will now default to size 3 (Large)

ISSUE 2: Can't pan/zoom maps with cursor
----------------------------------------
- Added isInteractiveWidget() function to widgetConstraints.ts
- Updated EditableWidgetCard to NOT show hover drag handle for maps
- Maps can now be panned/zoomed normally
- In edit mode, maps still show drag handle + controls
- Users can still reorder maps by clicking "Customize" first

BEHAVIOR NOW:
- Normal mode on maps: Full pan/zoom capability, no drag handle appears
- Normal mode on non-maps: Hover shows drag handle for quick reorder
- Edit mode on ALL widgets: Full controls (drag, resize, remove)

*/
