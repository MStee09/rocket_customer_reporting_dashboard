import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Plus, Search, Truck, MapPin, DollarSign, Layers, Star, ChevronDown, ChevronRight, Calendar, Sparkles, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DashboardAlertProvider } from '../contexts/DashboardAlertContext';
import { AlertInspectorPanel } from '../components/dashboard/widgets';

const ICON_MAP: Record<string, React.ElementType> = {
  truck: Truck,
  map: MapPin,
  dollar: DollarSign,
  layers: Layers,
  star: Star,
};

const DEFAULT_SECTIONS = [
  { id: 'carrier-performance', title: 'Carrier Performance', description: 'Track carrier metrics and on-time performance', icon: 'truck', order: 1 },
  { id: 'lane-analysis', title: 'Lane Analysis', description: 'Analyze shipping lanes and geographic patterns', icon: 'map', order: 2 },
  { id: 'cost-analytics', title: 'Cost Analytics', description: 'Deep dive into spend and cost drivers', icon: 'dollar', order: 3 },
  { id: 'mode-breakdown', title: 'Mode Breakdown', description: 'Compare performance across shipping modes', icon: 'layers', order: 4 },
  { id: 'custom', title: 'My Analytics', description: 'Your pinned reports and custom widgets', icon: 'star', order: 5 },
];

const DATE_RANGE_OPTIONS = [
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'last90', label: 'Last 90 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
];

export function AnalyticsHubPage() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('last30');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { effectiveCustomerIds } = useAuth();
  const customerId = effectiveCustomerIds.length > 0 ? effectiveCustomerIds[0] : undefined;

  const currentDateOption = DATE_RANGE_OPTIONS.find(opt => opt.value === dateRange);

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (dateRange) {
      case 'last7': start = subDays(now, 7); break;
      case 'last30': start = subDays(now, 30); break;
      case 'last90': start = subDays(now, 90); break;
      case 'thisMonth': start = startOfMonth(now); end = endOfMonth(now); break;
      case 'lastMonth': start = startOfMonth(subMonths(now, 1)); end = endOfMonth(subMonths(now, 1)); break;
      default: start = subDays(now, 30);
    }

    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  }, [dateRange]);

  const handleAskAI = useCallback((sectionId: string) => {
    const section = DEFAULT_SECTIONS.find(s => s.id === sectionId);
    const query = `Help me analyze my ${section?.title.toLowerCase() || 'data'}. What insights can you find?`;
    navigate(`/ai-studio?query=${encodeURIComponent(query)}`);
  }, [navigate]);

  const handleBackToPulse = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const filteredSections = searchQuery
    ? DEFAULT_SECTIONS.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : DEFAULT_SECTIONS;

  return (
    <DashboardAlertProvider customerId={customerId}>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToPulse}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Analytics Hub</h1>
                <p className="text-slate-500 mt-1">Deep dive into your logistics data</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all"
                >
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">{currentDateOption?.label}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
                </button>

                {showDatePicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDatePicker(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                      {DATE_RANGE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setDateRange(option.value);
                            setShowDatePicker(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                            option.value === dateRange
                              ? 'bg-orange-50 text-orange-600 font-medium'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium">
                <Plus className="w-4 h-4" />
                Add Widget
              </button>
            </div>
          </div>

          <div className="relative max-w-md mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sections and widgets..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div className="space-y-4">
            {filteredSections.map((section) => {
              const Icon = ICON_MAP[section.icon] || Star;
              const isCollapsed = collapsedSections.has(section.id);

              return (
                <div key={section.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full px-5 py-4 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="text-left">
                        <h2 className="font-semibold text-slate-900">{section.title}</h2>
                        <p className="text-sm text-slate-500">{section.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAskAI(section.id);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Sparkles className="w-4 h-4" />
                        Ask AI
                      </button>
                      {isCollapsed ? (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {!isCollapsed && (
                    <div className="p-5">
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                          <Plus className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-slate-600 font-medium mb-1">No widgets yet</p>
                        <p className="text-sm text-slate-400 mb-4">Add widgets or pin reports to see them here</p>
                        <button className="text-sm text-orange-600 hover:text-orange-700 font-medium">
                          + Add your first widget
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredSections.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">No sections match your search</p>
            </div>
          )}
        </div>
      </div>

      <AlertInspectorPanel />
    </DashboardAlertProvider>
  );
}
