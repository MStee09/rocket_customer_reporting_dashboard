import { useState } from 'react';
import { X, Search, Globe, Package, DollarSign, PieChart, Clock, Check } from 'lucide-react';
import { widgetLibrary, getGlobalWidgets } from '../config/widgetLibrary';
import { WidgetCategory } from '../types/widgets';

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (widgetId: string) => void;
  currentWidgets: string[];
  isAdmin: boolean;
}

const categoryIcons: Record<WidgetCategory, React.ElementType> = {
  geographic: Globe,
  volume: Package,
  financial: DollarSign,
  breakdown: PieChart,
  performance: Clock,
};

const categoryLabels: Record<WidgetCategory, string> = {
  geographic: 'Geographic',
  volume: 'Volume',
  financial: 'Financial',
  breakdown: 'Breakdown',
  performance: 'Performance',
};

export function AddWidgetModal({
  isOpen,
  onClose,
  onAddWidget,
  currentWidgets,
  isAdmin,
}: AddWidgetModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<WidgetCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const globalWidgets = getGlobalWidgets();

  const filteredWidgets = globalWidgets.filter((widget) => {
    if (widget.adminOnly && !isAdmin) return false;

    if (selectedCategory !== 'all' && widget.category !== selectedCategory) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        widget.name.toLowerCase().includes(query) ||
        widget.description.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const categories: Array<WidgetCategory | 'all'> = ['all', 'geographic', 'volume', 'financial', 'breakdown', 'performance'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Widget Library</h2>
            <p className="text-sm text-slate-600 mt-1">Add widgets to customize your dashboard</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-56 border-r border-slate-200 p-4 flex-shrink-0 overflow-y-auto">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Categories
            </h4>
            <nav className="space-y-1">
              {categories.map((category) => {
                const Icon = category === 'all' ? Package : categoryIcons[category as WidgetCategory];
                const label = category === 'all' ? 'All Widgets' : categoryLabels[category as WidgetCategory];
                const isActive = selectedCategory === category;

                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-rocket-50 text-rocket-700 font-medium'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search widgets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rocket-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-4">
                {filteredWidgets.map((widget) => {
                  const isOnDashboard = currentWidgets.includes(widget.id);
                  const IconComponent = categoryIcons[widget.category];

                  return (
                    <button
                      key={widget.id}
                      onClick={() => !isOnDashboard && onAddWidget(widget.id)}
                      disabled={isOnDashboard}
                      className={`p-4 border rounded-xl text-left transition-all ${
                        isOnDashboard
                          ? 'border-green-200 bg-green-50 cursor-not-allowed opacity-75'
                          : 'border-slate-200 hover:border-rocket-500 hover:shadow-md cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-lg ${widget.iconColor} flex items-center justify-center flex-shrink-0`}>
                          <IconComponent className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 text-sm mb-1 flex items-center gap-2">
                            {widget.name}
                            {isOnDashboard && (
                              <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                            )}
                          </h4>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${
                            widget.size === 'hero'
                              ? 'bg-purple-100 text-purple-700'
                              : widget.size === 'large'
                              ? 'bg-rocket-100 text-rocket-700'
                              : widget.size === 'wide'
                              ? 'bg-cyan-100 text-cyan-700'
                              : widget.size === 'tall'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {widget.size}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600">{widget.description}</p>
                      {isOnDashboard && (
                        <span className="text-xs text-green-600 mt-2 block font-medium">
                          ✓ Already on dashboard
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {filteredWidgets.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-slate-600 font-medium">No widgets found</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Try adjusting your search or category filter
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
