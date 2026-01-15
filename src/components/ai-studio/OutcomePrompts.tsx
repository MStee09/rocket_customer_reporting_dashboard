import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Truck,
  MapPin,
  DollarSign,
  BarChart3,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { fetchSuggestedPrompts } from '../../services/aiReportGeneratorService';

interface OutcomePromptsProps {
  onSelectPrompt: (prompt: string) => void;
  isAdmin: boolean;
  compact?: boolean;
}

interface PromptCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const CATEGORIES: PromptCategory[] = [
  { id: 'cost', label: 'Cost Analysis', icon: <DollarSign className="w-4 h-4" />, color: 'text-green-600 bg-green-50' },
  { id: 'volume', label: 'Volume & Trends', icon: <TrendingUp className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50' },
  { id: 'carrier', label: 'Carrier Performance', icon: <Truck className="w-4 h-4" />, color: 'text-teal-600 bg-teal-50' },
  { id: 'lane', label: 'Lane Analysis', icon: <MapPin className="w-4 h-4" />, color: 'text-orange-600 bg-orange-50' },
  { id: 'executive', label: 'Executive Summary', icon: <BarChart3 className="w-4 h-4" />, color: 'text-slate-600 bg-slate-50' }
];

export function OutcomePrompts({ onSelectPrompt, isAdmin, compact = false }: OutcomePromptsProps) {
  const [prompts, setPrompts] = useState<Array<{ category: string; prompt: string; description?: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const data = await fetchSuggestedPrompts(isAdmin);
      setPrompts(data);
      setIsLoading(false);
    }
    load();
  }, [isAdmin]);

  const visibleCategories = CATEGORIES.filter(cat =>
    isAdmin || cat.id !== 'cost'
  );

  const filteredPrompts = selectedCategory
    ? prompts.filter(p => p.category === selectedCategory)
    : prompts.slice(0, 6);

  if (compact) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-gray-500 font-medium">Quick questions:</p>
        <div className="flex flex-wrap gap-2">
          {filteredPrompts.slice(0, 4).map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => onSelectPrompt(prompt.prompt)}
              className="text-xs px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-full transition-colors"
            >
              {prompt.prompt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-50 to-amber-50 rounded-full mb-4">
          <Sparkles className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium text-orange-700">AI-Powered Analytics</span>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          What would you like to know?
        </h2>
        <p className="text-gray-500">
          Ask a question in plain English, or choose from popular analyses below
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedCategory === null
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {visibleCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              selectedCategory === cat.id
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPrompts.map((prompt, idx) => {
            const category = CATEGORIES.find(c => c.id === prompt.category);
            return (
              <button
                key={idx}
                onClick={() => onSelectPrompt(prompt.prompt)}
                className="group text-left p-4 rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all bg-white"
              >
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${category?.color || 'bg-gray-50 text-gray-600'}`}>
                    {category?.icon || <BarChart3 className="w-4 h-4" />}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-500 transition-colors" />
                </div>
                <p className="mt-3 font-medium text-gray-900 group-hover:text-orange-600 transition-colors">
                  {prompt.prompt}
                </p>
                {prompt.description && (
                  <p className="mt-1 text-sm text-gray-500">
                    {prompt.description}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
