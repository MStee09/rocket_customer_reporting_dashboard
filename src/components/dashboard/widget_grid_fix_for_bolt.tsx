// =============================================================================
// WIDGET SYSTEM FIXES - PASTE INTO BOLT
// =============================================================================
//
// TWO FILES TO UPDATE:
// 1. src/components/dashboard/WidgetGrid.tsx (REPLACE ENTIRE FILE)
// 2. tailwind.config.js (ADD safelist and wiggle animation)
//
// =============================================================================


// =============================================================================
// FILE 1: src/components/dashboard/WidgetGrid.tsx (REPLACE ENTIRE FILE)
// =============================================================================

import { useState, ReactNode } from 'react';
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
import { Package, Truck, CheckCircle, DollarSign, TrendingUp, PieChart as PieChartIcon, Map, Clock, Calendar, BarChart3, Globe, Route, Navigation, Receipt, Award, Percent, GripVertical, X, Move } from 'lucide-react';

import { DashboardWidgetCard } from '../DashboardWidgetCard';
import { AIWidgetRenderer } from './AIWidgetRenderer';
import { widgetLibrary } from '../../config/widgetLibrary';
import { getSizeColSpan, clampWidgetSize, WidgetSizeConstraint, isInteractiveWidget, isValidWidgetSize, getSizeLabel, getWidgetConstraints } from '../../config/widgetConstraints';

type WidgetSizeValue = 1 | 2 | 3;

interface WidgetItem {
  id: string;
  source: 'layout' | 'db';
}

interface WidgetGridProps {
  widgets: WidgetItem[];
  customWidgets: Record<string, unknown>;
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

const iconMap: Record<string, typeof Package> = {
  Package, Truck, CheckCircle, DollarSign, TrendingUp,
  PieChart: PieChartIcon, Map, Clock, Calendar, BarChart3,
  Globe, Route, Navigation, Receipt, Award, Percent,
};

interface SortableWidgetWrapperProps {
  id: string;
  disabled: boolean;
  className?: string;
  isEditMode: boolean;
  isSelected: boolean;
  widgetType: string;
  currentSize: WidgetSizeValue;
  onSelect: () => void;
  onRemove: () => void;
  onSizeChange: (size: WidgetSizeValue) => void;
  children: ReactNode;
}

function SortableWidgetWrapper({
  id,
  disabled,
  className,
  isEditMode,
  isSelected,
  widgetType,
  currentSize,
  onSelect,
  onRemove,
  onSizeChange,
  children,
}: SortableWidgetWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const constraints = getWidgetConstraints(id, widgetType);
  const isMapWidget = isInteractiveWidget(widgetType);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const handleSizeSelect = (size: WidgetSizeValue) => {
    onSizeChange(size);
    setShowSizeMenu(false);
  };

  const showHoverHandle = !isEditMode && isHovered && !isMapWidget && !disabled;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`relative ${className || ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...attributes}
    >
      {showHoverHandle && (
        <div
          className="absolute top-3 left-3 z-30 p-2 bg-white/95 rounded-lg shadow-md border border-slate-200 cursor-grab active:cursor-grabbing hover:bg-slate-50 transition-all"
          style={{ animation: 'fadeIn 0.15s ease-out' }}
          {...listeners}
        >
          <Move className="w-4 h-4 text-slate-500" />
        </div>
      )}

      {isEditMode && (
        <>
          <div
            className="absolute top-3 left-3 z-30 p-2 bg-white rounded-lg shadow-md border border-slate-200 cursor-grab active:cursor-grabbing hover:bg-orange-50 hover:border-orange-300 transition-colors"
            {...listeners}
          >
            <GripVertical className="w-4 h-4 text-slate-500" />
          </div>

          <button
            className="absolute -top-2 -right-2 z-30 w-7 h-7 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="absolute bottom-3 right-3 z-30">
            <button
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all ${
                showSizeMenu
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-orange-50 border border-slate-200'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setShowSizeMenu(!showSizeMenu);
              }}
            >
              {getSizeLabel(currentSize)}
              <svg className={`w-3.5 h-3.5 transition-transform ${showSizeMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showSizeMenu && (
              <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden min-w-[160px]">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Widget Size</span>
                </div>
                {([1, 2, 3] as WidgetSizeValue[]).map((size) => {
                  const isValid = isValidWidgetSize(size, id, widgetType);
                  const isActive = currentSize === size;
                  const isOptimal = size === constraints.optimalSize;

                  return (
                    <button
                      key={size}
                      className={`w-full px-3 py-2.5 text-left text-sm flex items-center justify-between transition-colors ${
                        isActive ? 'bg-orange-50 text-orange-600 font-medium' : 'text-slate-700'
                      } ${isValid && !isActive ? 'hover:bg-slate-50' : ''} ${
                        !isValid ? 'opacity-40 cursor-not-allowed bg-slate-50' : ''
                      }`}
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
                      </span>
                      {isOptimal && isValid && (
                        <span className="text-xs text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded">
                          Best
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {!showSizeMenu && (
            <div className="absolute bottom-3 left-3 z-20">
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                {currentSize === 1 ? '1 col' : currentSize === 2 ? '2 cols' : '3 cols'}
              </span>
            </div>
          )}
        </>
      )}

      <div
        className={`bg-white rounded-2xl border overflow-hidden transition-all duration-200 h-full ${
          isEditMode 
            ? isSelected 
              ? 'ring-2 ring-orange-500 border-orange-500' 
              : 'border-slate-200 hover:border-orange-300'
            : 'border-slate-200 hover:shadow-lg hover:border-slate-300'
        } ${isDragging ? 'opacity-50 scale-[0.98] shadow-2xl' : ''}`}
        style={{
          animation: isEditMode && !isDragging ? 'wiggle 0.3s ease-in-out infinite' : undefined,
        }}
        onClick={() => isEditMode && onSelect()}
      >
        {children}
      </div>
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

  const getColSpan = (widgetId: string): string => {
    const widget = widgetLibrary[widgetId] || customWidgets[widgetId] as { type: string } | undefined;
    if (!widget) return 'col-span-1';
    
    const currentSize = (widgetSizes[widgetId] || 1) as WidgetSizeConstraint;
    const effectiveSize = clampWidgetSize(currentSize, widgetId, widget.type);
    return getSizeColSpan(effectiveSize);
  };

  const renderWidgetContent = (item: WidgetItem) => {
    const widgetId = item.id;
    let widget = widgetLibrary[widgetId];
    let isCustom = false;

    if (!widget) {
      widget = customWidgets[widgetId] as typeof widget;
      isCustom = true;
    }

    if (!widget) return null;

    const isAIWidget = widget.type === 'ai_report' || (widget as { source?: string }).source === 'ai';

    if (isAIWidget) {
      return (
        <AIWidgetRenderer
          widget={widget}
          onDelete={() => onWidgetRemove?.(widgetId)}
          compact
        />
      );
    }

    return (
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
    );
  };

  const gridContent = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-auto">
      {widgets.map((item) => {
        const widget = widgetLibrary[item.id] || customWidgets[item.id] as { type: string } | undefined;
        const widgetType = widget?.type || 'kpi';
        const currentSize = (widgetSizes[item.id] || 1) as WidgetSizeValue;
        const effectiveSize = clampWidgetSize(currentSize, item.id, widgetType);

        return (
          <SortableWidgetWrapper
            key={item.id}
            id={item.id}
            disabled={!isDragEnabled}
            className={getColSpan(item.id)}
            isEditMode={isEditMode}
            isSelected={selectedWidgetId === item.id}
            widgetType={widgetType}
            currentSize={effectiveSize}
            onSelect={() => onWidgetSelect?.(item.id)}
            onRemove={() => onWidgetRemove?.(item.id)}
            onSizeChange={(size) => onWidgetSizeChange?.(item.id, size)}
          >
            {renderWidgetContent(item)}
          </SortableWidgetWrapper>
        );
      })}
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
          {activeId && (() => {
            const widget = widgetLibrary[activeId] || customWidgets[activeId] as { type: string } | undefined;
            if (!widget) return null;
            
            return (
              <div className={`opacity-90 rotate-1 scale-[1.02] shadow-2xl ${getColSpan(activeId)}`}>
                <div className="bg-white rounded-2xl border border-slate-300 overflow-hidden">
                  {renderWidgetContent({ id: activeId, source: 'layout' })}
                </div>
              </div>
            );
          })()}
        </DragOverlay>
      </DndContext>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-auto">
      {widgets.map((item) => (
        <div key={item.id} className={getColSpan(item.id)}>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow">
            {renderWidgetContent(item)}
          </div>
        </div>
      ))}
    </div>
  );
}


// =============================================================================
// FILE 2: tailwind.config.js (REPLACE ENTIRE FILE)
// =============================================================================
/*

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    'col-span-1',
    'col-span-2',
    'col-span-3',
    'md:col-span-1',
    'md:col-span-2',
    'md:col-span-3',
    'lg:col-span-1',
    'lg:col-span-2',
    'lg:col-span-3',
  ],
  theme: {
    extend: {
      colors: {
        'rocket': {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#f97316',
          700: '#ea580c',
          800: '#c2410c',
          900: '#9a3412',
        },
        'coral': {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
        },
        'charcoal': {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        'success': {
          light: '#dcfce7',
          DEFAULT: '#22c55e',
          dark: '#16a34a',
        },
        'warning': {
          light: '#fef3c7',
          DEFAULT: '#f59e0b',
          dark: '#d97706',
        },
        'danger': {
          light: '#fee2e2',
          DEFAULT: '#ef4444',
          dark: '#dc2626',
        },
        'info': {
          light: '#e0f2fe',
          DEFAULT: '#0ea5e9',
          dark: '#0284c7',
        },
      },
      backgroundImage: {
        'rocket-gradient': 'linear-gradient(135deg, #fcd34d 0%, #f97316 50%, #fb7185 100%)',
        'rocket-gradient-subtle': 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 50%, #fecdd3 100%)',
        'rocket-gradient-dark': 'linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #e11d48 100%)',
        'sidebar-gradient': 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.04)',
        'glow-orange': '0 0 20px -5px rgb(249 115 22 / 0.4)',
        'glow-gold': '0 0 20px -5px rgb(251 191 36 / 0.4)',
        'inner-glow': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
      },
      borderRadius: {
        'sm': '4px',
        'DEFAULT': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'display': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'pulse-glow': 'pulseGlow 2s infinite',
        'gradient-x': 'gradientX 3s ease infinite',
        'wiggle': 'wiggle 0.3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(100%)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(249 115 22 / 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgb(249 115 22 / 0)' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-0.5deg)' },
          '50%': { transform: 'rotate(0.5deg)' },
        },
      },
    },
  },
  plugins: [],
};

*/
