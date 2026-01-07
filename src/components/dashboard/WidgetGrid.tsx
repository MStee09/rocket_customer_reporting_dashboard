import { useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { GripVertical, X, Move } from 'lucide-react';

import { DashboardWidgetCard } from '../DashboardWidgetCard';
import { AIWidgetRenderer } from './AIWidgetRenderer';
import { widgetLibrary } from '../../config/widgetLibrary';
import { getSizeColSpan, clampWidgetSize, WidgetSizeConstraint, isInteractiveWidget, isValidWidgetSize, getSizeLabel, getWidgetConstraints } from '../../config/widgetConstraints';
import { useDashboardAlerts } from '../../contexts/DashboardAlertContext';

type WidgetSizeValue = 1 | 2 | 3 | 4;

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
  comparisonDates?: { start: string; end: string } | null;
  isEditMode?: boolean;
  selectedWidgetId?: string | null;
  onWidgetSelect?: (widgetId: string | null) => void;
  onWidgetRemove?: (widgetId: string) => void;
  onWidgetSizeChange?: (widgetId: string, size: WidgetSizeValue) => void;
  onReorder?: (newOrder: string[]) => void;
  allowHoverDrag?: boolean;
}

interface SortableWidgetWrapperProps {
  id: string;
  disabled: boolean;
  className?: string;
  isEditMode: boolean;
  isSelected: boolean;
  widgetType: string;
  currentSize: WidgetSizeValue;
  isCustomWidget: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onSizeChange: (size: WidgetSizeValue) => void;
  onWidgetClick: () => void;
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
  isCustomWidget,
  onSelect,
  onRemove,
  onSizeChange,
  onWidgetClick,
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

  const { getStateForWidget, getMaxSeverityForWidget } = useDashboardAlerts();
  const alertState = getStateForWidget(id);
  const maxSeverity = getMaxSeverityForWidget(id);
  const hasAlerts = alertState === 'active';

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

  const getAlertStyles = () => {
    if (isEditMode) return '';
    if (!hasAlerts) {
      return 'border-slate-200 hover:shadow-lg hover:border-slate-300';
    }
    const severity = maxSeverity || 'warning';
    if (severity === 'critical') {
      return 'border-red-500 border-2 shadow-lg shadow-red-500/20 ring-2 ring-red-500/10';
    }
    return 'border-orange-500 border-2 shadow-lg shadow-orange-500/20 ring-2 ring-orange-500/10';
  };

  const isClickableForNavigation = !isEditMode && !isCustomWidget && widgetType !== 'ai_report';

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;

    const clickedButton = target.closest('button');
    const clickedLink = target.closest('a');
    const clickedGrab = target.closest('.cursor-grab');

    if (clickedButton && clickedButton !== currentTarget) return;
    if (clickedLink && clickedLink !== currentTarget) return;
    if (clickedGrab) return;

    if (isEditMode) {
      onSelect();
    } else if (isClickableForNavigation) {
      onWidgetClick();
    }
  };

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
          className="absolute top-3 left-3 z-30 p-2 bg-white/95 rounded-lg shadow-md border border-slate-200 cursor-grab active:cursor-grabbing hover:bg-slate-50 transition-all animate-fade-in"
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
              <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden min-w-[160px] animate-scale-in">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Widget Size</span>
                </div>
                {([1, 2, 3, 4] as WidgetSizeValue[]).map((size) => {
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
                          {[1, 2, 3, 4].map((col) => (
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
        className={`bg-white rounded-2xl border overflow-hidden transition-all duration-300 h-full ${
          isEditMode
            ? isSelected
              ? 'ring-2 ring-orange-500 border-orange-500'
              : 'border-slate-200 hover:border-orange-300'
            : getAlertStyles()
        } ${isDragging ? 'opacity-50 scale-[0.98] shadow-2xl' : ''} ${isClickableForNavigation ? 'cursor-pointer' : ''}`}
        style={{
          animation: isEditMode && !isDragging ? 'wiggle 0.3s ease-in-out infinite' : undefined,
        }}
        onClick={handleClick}
        role={isClickableForNavigation ? 'button' : undefined}
        tabIndex={isClickableForNavigation ? 0 : undefined}
        onKeyDown={isClickableForNavigation ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onWidgetClick();
          }
        } : undefined}
        data-widget-id={id}
        data-alert-state={alertState}
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
  const navigate = useNavigate();
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

  const handleWidgetClick = (widgetId: string) => {
    navigate(`/widgets/${widgetId}/data`);
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-auto">
      {widgets.map((item) => {
        const widget = widgetLibrary[item.id] || customWidgets[item.id] as { type: string } | undefined;
        const widgetType = widget?.type || 'kpi';
        const currentSize = (widgetSizes[item.id] || 1) as WidgetSizeValue;
        const effectiveSize = clampWidgetSize(currentSize, item.id, widgetType);
        const isCustom = !widgetLibrary[item.id];

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
            isCustomWidget={isCustom}
            onSelect={() => onWidgetSelect?.(item.id)}
            onRemove={() => onWidgetRemove?.(item.id)}
            onSizeChange={(size) => onWidgetSizeChange?.(item.id, size)}
            onWidgetClick={() => handleWidgetClick(item.id)}
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-auto">
      {widgets.map((item) => {
        const widget = widgetLibrary[item.id] || customWidgets[item.id] as { type: string } | undefined;
        const widgetType = widget?.type || 'kpi';
        const isCustom = !widgetLibrary[item.id];
        const isClickable = !isCustom && widgetType !== 'ai_report';

        return (
          <div
            key={item.id}
            className={getColSpan(item.id)}
            onClick={isClickable ? () => handleWidgetClick(item.id) : undefined}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={isClickable ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleWidgetClick(item.id);
              }
            } : undefined}
          >
            <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow ${isClickable ? 'cursor-pointer' : ''}`}>
              {renderWidgetContent(item)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
