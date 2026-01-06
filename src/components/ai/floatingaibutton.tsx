import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, X, Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Context-aware suggestions based on current page
// IMPORTANT: Every suggestion here must be answerable with actual data in the schema
const CONTEXT_SUGGESTIONS: Record<string, string[]> = {
  // Dashboard / Pulse - executive overview questions
  '/': [
    "What's driving spend this month?",
    'Which carriers have the best on-time rate?',
    'Compare this month to last month',
  ],
  '/pulse': [
    "What's changed vs last month?",
    'Show me any anomalies or alerts',
    'Break down spend by carrier',
  ],

  // Shipments List - questions about the list they're viewing
  '/shipments': [
    'Which carriers have late deliveries?',
    'Show high-cost shipments',
    'Compare shipments by mode',
  ],

  // Shipment Detail - questions about the specific shipment
  // Note: We use startsWith matching for /shipments/:id
  '/shipment-detail': [
    'Show other shipments on this route',
    'What accessorials were charged?',
    'Show notes on this shipment',
  ],

  // Analytics Hub - deeper analysis questions
  '/analytics-hub': [
    "What's driving spend this month?",
    'Which lanes cost the most?',
    'Show carrier performance comparison',
  ],

  // AI Studio - creative/open-ended
  '/ai-studio': [
    'Create a report on carrier performance',
    'Analyze my shipping patterns',
    'What should I focus on this month?',
  ],

  // Carriers page
  '/carriers': [
    'Compare carrier costs on the same lanes',
    'Which carrier is most reliable?',
    'Show carrier volume trends',
  ],

  // Reports
  '/reports': [
    'Create a monthly summary report',
    'Build a carrier comparison report',
    'Generate an executive dashboard',
  ],

  // Default fallback
  default: [
    "What's my total spend this month?",
    'Show late deliveries',
    'Which carriers do I use most?',
  ],
};

function getContextSuggestions(pathname: string): string[] {
  // Check for exact match first
  if (CONTEXT_SUGGESTIONS[pathname]) {
    return CONTEXT_SUGGESTIONS[pathname];
  }

  // Check for shipment detail page (matches /shipments/:id pattern)
  if (pathname.match(/^\/shipments\/\d+/)) {
    return CONTEXT_SUGGESTIONS['/shipment-detail'];
  }

  // Check for prefix matches
  for (const [path, suggestions] of Object.entries(CONTEXT_SUGGESTIONS)) {
    if (path !== 'default' && pathname.startsWith(path)) {
      return suggestions;
    }
  }

  return CONTEXT_SUGGESTIONS.default;
}

export function FloatingAIButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const { effectiveCustomerId } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');

  const isOnAIStudio = location.pathname.startsWith('/ai-studio');

  // Get context-aware suggestions based on current page
  const suggestions = useMemo(
    () => getContextSuggestions(location.pathname),
    [location.pathname]
  );

  if (isOnAIStudio) return null;

  const handleQuickSubmit = () => {
    if (!quickQuery.trim()) return;
    const customerIdStr = effectiveCustomerId ? String(effectiveCustomerId) : '';
    navigate(
      `/ai-studio?query=${encodeURIComponent(quickQuery)}${
        customerIdStr ? `&customerId=${customerIdStr}` : ''
      }`
    );
    setQuickQuery('');
    setIsExpanded(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    const customerIdStr = effectiveCustomerId ? String(effectiveCustomerId) : '';
    navigate(
      `/ai-studio?query=${encodeURIComponent(suggestion)}${
        customerIdStr ? `&customerId=${customerIdStr}` : ''
      }`
    );
    setIsExpanded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuickSubmit();
    }
    if (e.key === 'Escape') {
      setIsExpanded(false);
    }
  };

  const handleOpenStudio = () => {
    navigate('/ai-studio');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isExpanded && (
        <div className="absolute bottom-16 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
          <div className="bg-gradient-to-r from-charcoal-800 to-charcoal-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rocket-400" />
              <span className="font-medium text-white text-sm">Ask AI</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>

          <div className="p-4">
            <div className="relative">
              <input
                type="text"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your shipping data..."
                className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rocket-500 focus:border-transparent"
                autoFocus
              />
              <button
                onClick={handleQuickSubmit}
                disabled={!quickQuery.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-rocket-600 hover:bg-rocket-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Context-aware suggestions */}
            <div className="mt-3">
              <div className="text-xs text-slate-500 mb-2">Suggested for this page:</div>
              <div className="flex flex-col gap-1.5">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-left px-3 py-2 text-sm bg-slate-50 hover:bg-rocket-50 hover:text-rocket-700 text-slate-700 rounded-lg transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleOpenStudio}
              className="mt-4 w-full py-2 text-sm text-rocket-600 hover:text-rocket-700 font-medium"
            >
              Open Full AI Studio
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          isExpanded
            ? 'bg-slate-600 hover:bg-slate-700'
            : 'bg-gradient-to-r from-rocket-600 to-rocket-500 hover:from-rocket-700 hover:to-rocket-600'
        }`}
      >
        {isExpanded ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Sparkles className="w-6 h-6 text-white" />
        )}
      </button>
    </div>
  );
}
