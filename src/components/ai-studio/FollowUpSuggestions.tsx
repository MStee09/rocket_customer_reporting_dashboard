import { Sparkles, Map, BarChart3, TrendingUp, PieChart, Calendar, GitCompare, type LucideIcon } from 'lucide-react';

interface Suggestion {
  icon: LucideIcon;
  label: string;
  prompt: string;
}

interface FollowUpSuggestionsProps {
  currentReportType: string;
  groupBy?: string;
  onSuggestionClick: (prompt: string) => void;
}

const suggestionsByContext: Record<string, Suggestion[]> = {
  carrier: [
    { icon: Map, label: 'See where each carrier delivers', prompt: 'Show me a heat map of deliveries by carrier' },
    { icon: TrendingUp, label: 'Carrier cost trends over time', prompt: 'Show me how carrier costs have changed month by month' },
    { icon: GitCompare, label: 'Compare carriers side by side', prompt: 'Create a radar chart comparing my top 3 carriers' },
  ],
  geographic: [
    { icon: BarChart3, label: 'Top destinations breakdown', prompt: 'Show me a bar chart of my top 10 destination states' },
    { icon: TrendingUp, label: 'Regional cost trends', prompt: 'Show me how costs have changed by region over time' },
    { icon: PieChart, label: 'Mode split by region', prompt: 'What modes do I use for each region?' },
  ],
  temporal: [
    { icon: Calendar, label: 'Daily shipping patterns', prompt: 'Show me a calendar heatmap of my shipping activity' },
    { icon: BarChart3, label: 'Compare months side by side', prompt: 'Compare this month vs last month' },
    { icon: Map, label: 'Geographic changes over time', prompt: 'Has my geographic distribution changed over time?' },
  ],
  default: [
    { icon: Map, label: 'Geographic distribution', prompt: 'Show me where my shipments go on a heat map' },
    { icon: GitCompare, label: 'Compare carriers', prompt: 'Compare my carriers on cost, speed, and volume' },
    { icon: Calendar, label: 'Shipping patterns', prompt: 'When are my busiest shipping days?' },
  ],
};

export function FollowUpSuggestions({
  currentReportType,
  groupBy,
  onSuggestionClick,
}: FollowUpSuggestionsProps) {
  let context = 'default';
  if (groupBy?.toLowerCase().includes('carrier')) {
    context = 'carrier';
  } else if (groupBy?.toLowerCase().includes('state') || currentReportType === 'map') {
    context = 'geographic';
  } else if (groupBy?.toLowerCase().includes('month') || groupBy?.toLowerCase().includes('date')) {
    context = 'temporal';
  }

  const suggestions = suggestionsByContext[context] || suggestionsByContext.default;

  return (
    <div className="mt-6 p-4 bg-gradient-to-r from-rocket-50 to-orange-50 rounded-xl border border-rocket-100">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-rocket-600" />
        <span className="text-sm font-medium text-rocket-800">You might also find useful</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => {
          const Icon = suggestion.icon;
          return (
            <button
              key={index}
              onClick={() => onSuggestionClick(suggestion.prompt)}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-rocket-200
                         text-sm text-slate-700 hover:border-rocket-400 hover:bg-rocket-50
                         transition-colors shadow-sm"
            >
              <Icon className="w-4 h-4 text-rocket-500" />
              {suggestion.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
