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
import { Package, Truck, CheckCircle, DollarSign, TrendingUp, PieChart as PieChartIcon, Map, Clock, Calendar, BarChart3, Globe, Route, Navigation, Receipt, Award, Percent } from 'lucide-react';

import { DashboardWidgetCard } from '../DashboardWidgetCard';
import { EditableWidgetCard } from './EditableWidgetCard';
import { AIWidgetRenderer } from './AIWidgetRenderer';
import { widgetLibrary } from '../../config/widgetLibrary';
import { getSizeColSpan, clampWidgetSize, WidgetSizeConstraint, isInteractiveWidget } from '../../config/widgetConstraints';

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

function SortableWidget({
  id,
  children,
  disabled,
}: {
  id: string;
  children: ReactNode;
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
      widget = customWidgets[widgetId] as typeof widget;
      isCustom = true;
    }

    if (!widget) return null;

    const isAIWidget = widget.type === 'ai_report' || (widget as { source?: string }).source === 'ai';
    const currentSize = (widgetSizes[widgetId] || 1) as WidgetSizeConstraint;
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
            allowHoverDrag={allowHoverDrag && !isEditMode && !isInteractiveWidget(widget.type)}
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
