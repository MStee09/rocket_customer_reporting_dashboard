import { BarChart3, LineChart, PieChart, Table, Layers, Hash } from 'lucide-react';
import { ReportBuilderState } from '../../types/reports';

interface VisualizationStepProps {
  state: ReportBuilderState;
  updateState: (updates: Partial<ReportBuilderState>) => void;
}

const VISUALIZATIONS = [
  {
    type: 'single_value' as const,
    name: 'Single Value',
    description: 'Display one key metric',
    icon: Hash,
    color: 'blue',
    bestFor: 'Simple counts or totals'
  },
  {
    type: 'line_chart' as const,
    name: 'Line Chart',
    description: 'Show trends over time',
    icon: LineChart,
    color: 'green',
    bestFor: 'Time series data'
  },
  {
    type: 'bar_chart' as const,
    name: 'Bar Chart',
    description: 'Compare values across categories',
    icon: BarChart3,
    color: 'orange',
    bestFor: 'Comparing groups'
  },
  {
    type: 'pie_chart' as const,
    name: 'Pie Chart',
    description: 'Show proportions of a whole',
    icon: PieChart,
    color: 'purple',
    bestFor: 'Distribution analysis'
  },
  {
    type: 'category_breakdown' as const,
    name: 'Category Breakdown',
    description: 'Multi-category trend analysis',
    icon: Layers,
    color: 'pink',
    bestFor: 'Category comparisons over time'
  },
  {
    type: 'table' as const,
    name: 'Data Table',
    description: 'Detailed row-by-row view',
    icon: Table,
    color: 'slate',
    bestFor: 'Detailed data inspection'
  }
];

export function VisualizationStep({ state, updateState }: VisualizationStepProps) {
  const getRecommendedVisualization = () => {
    if (state.enableCategoryBreakdown && state.groupBy) {
      return 'category_breakdown';
    }
    if (state.groupBy) {
      return 'line_chart';
    }
    if (state.calculationType === 'count' && !state.groupBy) {
      return 'single_value';
    }
    return 'bar_chart';
  };

  const recommended = getRecommendedVisualization();

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors: Record<string, { border: string; bg: string; icon: string }> = {
      blue: { border: 'border-blue-600', bg: 'bg-blue-50', icon: 'text-blue-600' },
      green: { border: 'border-green-600', bg: 'bg-green-50', icon: 'text-green-600' },
      orange: { border: 'border-orange-600', bg: 'bg-orange-50', icon: 'text-orange-600' },
      purple: { border: 'border-purple-600', bg: 'bg-purple-50', icon: 'text-purple-600' },
      pink: { border: 'border-pink-600', bg: 'bg-pink-50', icon: 'text-pink-600' },
      slate: { border: 'border-slate-600', bg: 'bg-slate-50', icon: 'text-slate-600' }
    };

    const c = colors[color] || colors.blue;

    if (isSelected) {
      return {
        border: c.border,
        bg: c.bg,
        icon: c.icon
      };
    }

    return {
      border: 'border-slate-300',
      bg: 'bg-white',
      icon: 'text-slate-600'
    };
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-rocket-100 rounded-lg">
          <BarChart3 className="w-8 h-8 text-rocket-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">Visualization</h3>
          <p className="text-slate-600">Choose how to display your report</p>
        </div>
      </div>

      {recommended && recommended !== state.visualization && (
        <div className="bg-rocket-50 border border-rocket-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-rocket-900">
            <span className="font-medium">Recommendation:</span> Based on your configuration, we suggest using{' '}
            <button
              onClick={() => updateState({ visualization: recommended })}
              className="font-semibold underline hover:text-rocket-700"
            >
              {VISUALIZATIONS.find(v => v.type === recommended)?.name}
            </button>
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {VISUALIZATIONS.map((viz) => {
          const isSelected = state.visualization === viz.type;
          const colors = getColorClasses(viz.color, isSelected);
          const Icon = viz.icon;

          return (
            <button
              key={viz.type}
              onClick={() => updateState({ visualization: viz.type })}
              className={`relative p-6 rounded-xl border-2 transition-all text-left hover:shadow-lg ${
                isSelected
                  ? `${colors.border} ${colors.bg} shadow-md`
                  : 'border-slate-300 bg-white hover:border-slate-400'
              }`}
            >
              {viz.type === recommended && !isSelected && (
                <span className="absolute top-2 right-2 px-2 py-1 bg-rocket-100 text-rocket-700 text-xs font-medium rounded">
                  Recommended
                </span>
              )}

              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                isSelected ? colors.bg : 'bg-slate-100'
              }`}>
                <Icon className={`w-6 h-6 ${colors.icon}`} />
              </div>

              <h4 className="font-bold text-slate-800 mb-2">{viz.name}</h4>
              <p className="text-sm text-slate-600 mb-3">{viz.description}</p>

              <div className="pt-3 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  <span className="font-medium">Best for:</span> {viz.bestFor}
                </p>
              </div>

              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-rocket-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h4 className="font-medium text-slate-800 mb-3">Preview</h4>
        <div className="bg-white rounded-lg p-8 border border-slate-200 flex items-center justify-center min-h-48">
          <div className="text-center">
            <div className={`w-16 h-16 rounded-lg mx-auto mb-4 flex items-center justify-center ${
              getColorClasses(VISUALIZATIONS.find(v => v.type === state.visualization)?.color || 'blue', true).bg
            }`}>
              {(() => {
                const Icon = VISUALIZATIONS.find(v => v.type === state.visualization)?.icon || BarChart3;
                return <Icon className={`w-8 h-8 ${getColorClasses(VISUALIZATIONS.find(v => v.type === state.visualization)?.color || 'blue', true).icon}`} />;
              })()}
            </div>
            <p className="font-medium text-slate-800">
              {VISUALIZATIONS.find(v => v.type === state.visualization)?.name}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              {VISUALIZATIONS.find(v => v.type === state.visualization)?.description}
            </p>
            <p className="text-xs text-slate-500 mt-3">
              Full preview available in the next step
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
