import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Maximize2, GripVertical } from 'lucide-react';
import { WidgetDefinition, WidgetSizeLevel } from '../types/widgets';

interface MiniWidgetCardProps {
  widget: WidgetDefinition;
  sizeLevel?: WidgetSizeLevel;
  index: number;
  onCycleSize: () => void;
}

export function MiniWidgetCard({ widget, sizeLevel = 'default', index, onCycleSize }: MiniWidgetCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const getColSpan = () => {
    const baseSpan = widget.type === 'map' ? 6
                   : widget.type === 'table' ? 4
                   : widget.type === 'line_chart' ? 4
                   : widget.type === 'bar_chart' ? 4
                   : widget.type === 'pie_chart' ? 2
                   : 2;

    if (sizeLevel === 'large') return Math.min(baseSpan + 1, 6);
    if (sizeLevel === 'xlarge') return Math.min(baseSpan + 2, 6);
    if (sizeLevel === 'full') return 6;
    return baseSpan;
  };

  const getIconEmoji = () => {
    switch (widget.type) {
      case 'map': return '🗺️';
      case 'pie_chart': return '📊';
      case 'line_chart': return '📈';
      case 'bar_chart': return '📊';
      case 'table': return '📋';
      case 'kpi': return '💹';
      case 'featured_kpi': return '⭐';
      default: return '📊';
    }
  };

  const colSpan = getColSpan();

  const getWidthClass = () => {
    if (colSpan >= 6) return 'w-full';
    if (colSpan >= 4) return 'w-2/3';
    return 'w-1/3';
  };

  const getWidthLabel = () => {
    if (colSpan >= 6) return 'Full';
    if (colSpan >= 4) return '2/3';
    return '1/3';
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 150ms ease',
    zIndex: isDragging ? 100 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        ${getWidthClass()}
        flex items-center gap-3 p-3 rounded-xl border-2
        transition-all cursor-grab active:cursor-grabbing
        ${isDragging
          ? 'bg-blue-50 border-blue-400 shadow-xl scale-[1.02]'
          : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'}
      `}
      {...attributes}
      {...listeners}
    >
      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500 flex-shrink-0">
        {index + 1}
      </div>

      <div className="text-slate-400 flex-shrink-0">
        <GripVertical className="w-4 h-4" />
      </div>

      <div className={`w-8 h-8 rounded-lg ${widget.iconColor || 'bg-slate-500'} flex items-center justify-center flex-shrink-0`}>
        <span className="text-xs">{getIconEmoji()}</span>
      </div>

      <div className="flex-1 min-w-0">
        <span className="font-medium text-slate-700">{widget.name}</span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex gap-0.5">
          <div className={`w-3 h-2 rounded-sm ${colSpan >= 2 ? 'bg-blue-500' : 'bg-slate-200'}`} />
          <div className={`w-3 h-2 rounded-sm ${colSpan >= 4 ? 'bg-blue-500' : 'bg-slate-200'}`} />
          <div className={`w-3 h-2 rounded-sm ${colSpan >= 6 ? 'bg-blue-500' : 'bg-slate-200'}`} />
        </div>
        <span className="text-xs text-slate-500 w-8">
          {getWidthLabel()}
        </span>
      </div>

      {sizeLevel && sizeLevel !== 'default' && (
        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-medium flex-shrink-0">
          {sizeLevel === 'large' ? 'L' : sizeLevel === 'xlarge' ? 'XL' : 'Full'}
        </span>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onCycleSize();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="p-1.5 hover:bg-slate-100 rounded-lg transition flex-shrink-0"
        title="Cycle size: Auto → Large → XL → Full"
      >
        <Maximize2 className="w-4 h-4 text-slate-500" />
      </button>
    </div>
  );
}
