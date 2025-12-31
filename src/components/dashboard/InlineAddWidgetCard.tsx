import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import { AddWidgetPopover } from './AddWidgetPopover';

interface Widget {
  id: string;
  name: string;
  description: string;
  type: string;
  iconColor?: string;
  category?: string;
}

interface InlineAddWidgetCardProps {
  availableWidgets: Widget[];
  currentWidgets: string[];
  onAddWidget: (widgetId: string) => void;
}

export function InlineAddWidgetCard({
  availableWidgets,
  currentWidgets,
  onAddWidget
}: InlineAddWidgetCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const widgetsToAdd = availableWidgets.filter(w => !currentWidgets.includes(w.id));
  if (widgetsToAdd.length === 0) return null;

  return (
    <div ref={cardRef} className="relative col-span-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full h-32 rounded-xl border-2 border-dashed transition-all
          flex flex-col items-center justify-center gap-2
          ${isOpen
            ? 'border-rocket-500 bg-rocket-50 text-rocket-600'
            : 'border-slate-300 hover:border-rocket-400 hover:bg-slate-50 text-slate-400 hover:text-slate-600'
          }
        `}
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isOpen ? 'bg-rocket-100' : 'bg-slate-100'}`}>
          <Plus className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium">Add Widget</span>
      </button>

      {isOpen && (
        <AddWidgetPopover
          availableWidgets={availableWidgets}
          currentWidgets={currentWidgets}
          onAddWidget={onAddWidget}
          onClose={() => setIsOpen(false)}
          anchorRef={cardRef}
        />
      )}
    </div>
  );
}
