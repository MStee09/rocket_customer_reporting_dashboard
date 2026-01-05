import { ArrowRight, BarChart3, Brain, Layers } from 'lucide-react';

interface ExploreAnalyticsCTAProps {
  onClick: () => void;
}

export function ExploreAnalyticsCTA({ onClick }: ExploreAnalyticsCTAProps) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl p-5 text-left transition-all group shadow-sm hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
              <Brain className="w-3 h-3 text-amber-900" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Explore Analytics Hub</h3>
            <p className="text-sm text-blue-100">Deep dive into carrier performance, lane analysis, cost trends, and more</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-blue-100 text-sm">
            <Layers className="w-4 h-4" />
            <span>Report-based widgets</span>
          </div>
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors">
            <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </button>
  );
}
