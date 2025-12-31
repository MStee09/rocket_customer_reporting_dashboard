import { useState, useRef, useEffect } from 'react';
import { Search, BarChart3, PieChart, Map, DollarSign, Package } from 'lucide-react';

interface Widget {
  id: string;
  name: string;
  description: string;
  type: string;
  iconColor?: string;
  category?: string;
}

interface AddWidgetPopoverProps {
  availableWidgets: Widget[];
  currentWidgets: string[];
  onAddWidget: (widgetId: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLDivElement>;
}

const getWidgetIcon = (type: string) => {
  switch (type) {
    case 'map': return Map;
    case 'pie_chart': return PieChart;
    case 'line_chart':
    case 'bar_chart': return BarChart3;
    case 'kpi': return DollarSign;
    case 'featured_kpi': return Package;
    default: return BarChart3;
  }
};

export function AddWidgetPopover({
  availableWidgets,
  currentWidgets,
  onAddWidget,
  onClose,
  anchorRef
}: AddWidgetPopoverProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  const filteredWidgets = availableWidgets.filter(w => {
    if (currentWidgets.includes(w.id)) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return w.name.toLowerCase().includes(query) || w.description?.toLowerCase().includes(query);
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, anchorRef]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-fade-in"
    >
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search widgets..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rocket-500"
            autoFocus
          />
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto p-2">
        {filteredWidgets.length === 0 ? (
          <div className="text-center py-6 text-slate-500">
            <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No widgets available</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredWidgets.slice(0, 8).map((widget) => {
              const Icon = getWidgetIcon(widget.type);
              return (
                <button
                  key={widget.id}
                  onClick={() => {
                    onAddWidget(widget.id);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <div className={`w-8 h-8 rounded-lg ${widget.iconColor || 'bg-slate-400'} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{widget.name}</div>
                    <div className="text-xs text-slate-500 truncate">{widget.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {filteredWidgets.length > 8 && (
        <div className="p-2 border-t bg-slate-50 text-center">
          <span className="text-xs text-slate-500">
            +{filteredWidgets.length - 8} more widgets available
          </span>
        </div>
      )}
    </div>
  );
}
