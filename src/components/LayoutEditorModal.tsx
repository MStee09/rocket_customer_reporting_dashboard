import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Layout,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  MousePointer,
  TrendingUp,
  Package,
  Truck,
  CheckCircle,
  DollarSign,
  BarChart3,
  Clock,
  MapPin,
  Map as MapIcon,
  PieChart,
  Table as TableIcon,
  Trash2,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { WidgetDefinition, WidgetSizeLevel } from '../types/widgets';
import { getWidgetColSpan, getWidgetRowSpan } from '../utils/widgetSizing';

interface LayoutEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  widgetOrder: string[];
  widgetSizes: Record<string, WidgetSizeLevel>;
  widgetLibrary: Record<string, WidgetDefinition>;
  customWidgets?: Record<string, any>;
  availableWidgets?: Array<{ id: string; name: string; description: string; type: string; iconColor?: string; category?: string }>;
  onSave: (newOrder: string[], newSizes: Record<string, WidgetSizeLevel>) => void;
}

const getWidgetIcon = (type: string) => {
  switch (type) {
    case 'map': return MapIcon;
    case 'pie_chart': return PieChart;
    case 'line_chart': return TrendingUp;
    case 'bar_chart': return BarChart3;
    case 'table': return TableIcon;
    case 'kpi': return DollarSign;
    case 'featured_kpi': return Package;
    default: return BarChart3;
  }
};

interface SortableMiniWidgetProps {
  id: string;
  widget: WidgetDefinition;
  colSpan: number;
  sizeLevel?: WidgetSizeLevel;
  isSelected: boolean;
  isDragging: boolean;
  onClick: () => void;
}

const SortableMiniWidget = ({
  id,
  widget,
  colSpan,
  sizeLevel,
  isSelected,
  isDragging,
  onClick
}: SortableMiniWidgetProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const Icon = getWidgetIcon(widget.type);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    gridColumn: `span ${colSpan}`,
  };

  const heightClass = widget.type === 'map' ? 'h-20'
    : widget.type === 'table' ? 'h-16'
    : widget.type === 'pie_chart' ? 'h-16'
    : 'h-12';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        ${heightClass}
        rounded-lg border-2 p-3 transition-all
        flex items-center gap-2
        ${isDragging ? 'opacity-50' : ''}
        ${isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200'
          : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'}
        cursor-grab active:cursor-grabbing
      `}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <div className={`w-7 h-7 rounded-lg ${widget.iconColor || 'bg-slate-400'} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-4 h-4 text-white" />
      </div>

      <span className="text-sm font-medium text-slate-700 truncate flex-1">
        {widget.name}
      </span>

      {sizeLevel && sizeLevel !== 'default' && (
        <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded flex-shrink-0">
          {sizeLevel === 'large' ? 'L' : sizeLevel === 'xlarge' ? 'XL' : 'Full'}
        </span>
      )}
    </div>
  );
};

interface DragPreviewProps {
  widget: WidgetDefinition;
  colSpan: number;
}

const DragPreview = ({ widget, colSpan }: DragPreviewProps) => {
  const Icon = getWidgetIcon(widget.type);
  const widthClass = colSpan === 3 ? 'w-96' : colSpan === 2 ? 'w-64' : 'w-40';

  return (
    <div className={`
      ${widthClass} h-14
      rounded-lg border-2 border-blue-500 bg-blue-50 shadow-xl
      p-3 flex items-center gap-2
      opacity-90
    `}>
      <div className={`w-7 h-7 rounded-lg ${widget.iconColor || 'bg-slate-400'} flex items-center justify-center`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <span className="text-sm font-medium text-slate-700 truncate">
        {widget.name}
      </span>
    </div>
  );
};

export function LayoutEditorModal({
  isOpen,
  onClose,
  widgetOrder,
  widgetSizes,
  widgetLibrary,
  customWidgets = {},
  availableWidgets = [],
  onSave,
}: LayoutEditorModalProps) {
  const [localOrder, setLocalOrder] = useState(widgetOrder);
  const [localSizes, setLocalSizes] = useState(widgetSizes);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');

  const allWidgets = { ...widgetLibrary, ...customWidgets };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setSelectedWidget(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setLocalOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const moveWidget = (widgetId: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    setLocalOrder(prev => {
      const index = prev.indexOf(widgetId);
      const newOrder = [...prev];

      switch (direction) {
        case 'up':
          if (index > 0) {
            [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
          }
          break;
        case 'down':
          if (index < prev.length - 1) {
            [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
          }
          break;
        case 'top':
          newOrder.splice(index, 1);
          newOrder.unshift(widgetId);
          break;
        case 'bottom':
          newOrder.splice(index, 1);
          newOrder.push(widgetId);
          break;
      }

      return newOrder;
    });
  };

  const setSize = (widgetId: string, size: WidgetSizeLevel) => {
    setLocalSizes(prev => ({
      ...prev,
      [widgetId]: size
    }));
  };

  const resetSize = (widgetId: string) => {
    setLocalSizes(prev => {
      const next = { ...prev };
      delete next[widgetId];
      return next;
    });
  };

  const resetAll = () => {
    setLocalOrder(widgetOrder);
    setLocalSizes({});
    setSelectedWidget(null);
    setActiveId(null);
  };

  const removeWidget = (widgetId: string) => {
    setLocalOrder(prev => prev.filter(id => id !== widgetId));
    setLocalSizes(prev => {
      const next = { ...prev };
      delete next[widgetId];
      return next;
    });
    if (selectedWidget === widgetId) {
      setSelectedWidget(null);
    }
  };

  const addWidget = (widgetId: string) => {
    if (!localOrder.includes(widgetId)) {
      setLocalOrder(prev => [...prev, widgetId]);
    }
    setShowAddPanel(false);
    setAddSearchQuery('');
  };

  const handleSave = () => {
    onSave(localOrder, localSizes);
    onClose();
  };

  const filteredAvailableWidgets = availableWidgets.filter(w => {
    if (localOrder.includes(w.id)) return false;
    if (!addSearchQuery) return true;
    const query = addSearchQuery.toLowerCase();
    return w.name.toLowerCase().includes(query) || w.description?.toLowerCase().includes(query);
  });

  if (!isOpen) return null;

  const selectedWidgetData = selectedWidget ? allWidgets[selectedWidget] : null;
  const selectedPosition = selectedWidget ? localOrder.indexOf(selectedWidget) + 1 : 0;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed inset-6 md:inset-10 lg:inset-16 z-50 flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Layout className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Customize Layout</h2>
              <p className="text-sm text-slate-500">Click a widget to select • Use controls to reorder and resize</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetAll}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset All
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-sm bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 transition"
            >
              Save Layout
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 p-6 overflow-auto bg-slate-50">
            <div className="max-w-3xl mx-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <SortableContext items={localOrder} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-3 gap-3 bg-white rounded-xl p-4 shadow-sm">
                    {localOrder.map((widgetId) => {
                      const widget = allWidgets[widgetId];
                      if (!widget) return null;

                      const colSpan = getWidgetColSpan(widget, localSizes[widgetId]);

                      return (
                        <SortableMiniWidget
                          key={widgetId}
                          id={widgetId}
                          widget={widget}
                          colSpan={colSpan}
                          sizeLevel={localSizes[widgetId]}
                          isSelected={selectedWidget === widgetId}
                          isDragging={activeId === widgetId}
                          onClick={() => setSelectedWidget(widgetId)}
                        />
                      );
                    })}
                  </div>
                </SortableContext>

                <DragOverlay>
                  {activeId && allWidgets[activeId] ? (
                    <DragPreview
                      widget={allWidgets[activeId]}
                      colSpan={getWidgetColSpan(allWidgets[activeId], localSizes[activeId])}
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>

              <div className="mt-4 flex items-center justify-center gap-4">
                <span className="text-sm text-slate-500">
                  Drag widgets to reorder • Click to select
                </span>
                {availableWidgets.length > 0 && (
                  <button
                    onClick={() => setShowAddPanel(true)}
                    className="px-4 py-2 text-sm bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Widget
                  </button>
                )}
              </div>
            </div>
          </div>

          {showAddPanel && (
            <div className="absolute inset-0 bg-white z-10 flex flex-col">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Plus className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Add Widget</h2>
                    <p className="text-sm text-slate-500">Choose a widget to add to your dashboard</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowAddPanel(false); setAddSearchQuery(''); }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={addSearchQuery}
                    onChange={(e) => setAddSearchQuery(e.target.value)}
                    placeholder="Search widgets..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rocket-500 text-sm"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4">
                {filteredAvailableWidgets.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">No widgets available</p>
                    <p className="text-sm mt-1">All widgets are already on your dashboard</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {filteredAvailableWidgets.map((widget) => {
                      const Icon = getWidgetIcon(widget.type);
                      return (
                        <button
                          key={widget.id}
                          onClick={() => addWidget(widget.id)}
                          className="p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition text-left"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-10 h-10 rounded-lg ${widget.iconColor || 'bg-slate-400'} flex items-center justify-center`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-medium text-slate-900 text-sm">{widget.name}</span>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2">{widget.description}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="w-80 border-l bg-white p-6 overflow-auto">
            {selectedWidgetData ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = getWidgetIcon(selectedWidgetData.type);
                    return (
                      <div className={`w-12 h-12 rounded-xl ${selectedWidgetData.iconColor || 'bg-slate-400'} flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    );
                  })()}
                  <div>
                    <h3 className="font-semibold text-slate-900">{selectedWidgetData.name}</h3>
                    <p className="text-sm text-slate-500">Position {selectedPosition} of {localOrder.length}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Position</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => moveWidget(selectedWidget!, 'top')}
                      disabled={selectedPosition === 1}
                      className="px-3 py-2 text-sm border rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      <ChevronsUp className="w-4 h-4" /> Top
                    </button>
                    <button
                      onClick={() => moveWidget(selectedWidget!, 'up')}
                      disabled={selectedPosition === 1}
                      className="px-3 py-2 text-sm border rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      <ChevronUp className="w-4 h-4" /> Up
                    </button>
                    <button
                      onClick={() => moveWidget(selectedWidget!, 'down')}
                      disabled={selectedPosition === localOrder.length}
                      className="px-3 py-2 text-sm border rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      <ChevronDown className="w-4 h-4" /> Down
                    </button>
                    <button
                      onClick={() => moveWidget(selectedWidget!, 'bottom')}
                      disabled={selectedPosition === localOrder.length}
                      className="px-3 py-2 text-sm border rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      <ChevronsDown className="w-4 h-4" /> Bottom
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Size</label>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg">
                    {(['default', 'large', 'xlarge', 'full'] as WidgetSizeLevel[]).map((size) => {
                      const currentSize = localSizes[selectedWidget!] || 'default';
                      return (
                        <button
                          key={size}
                          onClick={() => setSize(selectedWidget!, size)}
                          className={`
                            px-2 py-2 text-xs font-medium rounded-md transition
                            ${currentSize === size
                              ? 'bg-white text-blue-600 shadow-sm'
                              : 'text-slate-600 hover:bg-white/50'}
                          `}
                        >
                          {size === 'default' ? 'Auto' : size === 'large' ? 'Large' : size === 'xlarge' ? 'XL' : 'Full'}
                        </button>
                      );
                    })}
                  </div>
                  {localSizes[selectedWidget!] && localSizes[selectedWidget!] !== 'default' && (
                    <button
                      onClick={() => resetSize(selectedWidget!)}
                      className="mt-2 text-sm text-blue-600 hover:underline"
                    >
                      Reset to auto size
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Width Preview</label>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{
                        width: `${(getWidgetColSpan(selectedWidgetData, localSizes[selectedWidget!]) / 3) * 100}%`
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {(() => {
                      const span = getWidgetColSpan(selectedWidgetData, localSizes[selectedWidget!]);
                      return span === 3 ? 'Full width (3 columns)' : span === 2 ? '2/3 width (2 columns)' : '1/3 width (1 column)';
                    })()}
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <button
                    onClick={() => removeWidget(selectedWidget!)}
                    className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove from Dashboard
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500 py-12">
                <MousePointer className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                <p className="font-medium">Click a widget to select it</p>
                <p className="text-sm mt-1">Then use controls to move or resize</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
