import { CheckCircle2, Database, Calculator, Layers, BarChart3, AlertCircle } from 'lucide-react';
import { ReportBuilderState } from '../../types/reports';
import { TABLE_METADATA } from '../../config/reportBuilderMetadata';
import { Card } from '../ui/Card';

interface PreviewStepProps {
  state: ReportBuilderState;
}

export function PreviewStep({ state }: PreviewStepProps) {
  const getCalculationSummary = () => {
    const calc = state.calculation as any;
    switch (state.calculationType) {
      case 'count':
        return 'Count of records';
      case 'sum':
        return `Sum of ${calc.field || '[field not set]'}`;
      case 'average':
        return `Average of ${calc.field || '[field not set]'}`;
      case 'ratio':
        const numText = calc.numerator?.field ? `${calc.numerator.aggregation} of ${calc.numerator.field}` : '[not set]';
        const denText = calc.denominator?.field ? `${calc.denominator.aggregation} of ${calc.denominator.field}` : '[not set]';
        return `${numText} ÷ ${denText}`;
      case 'formula':
        return calc.expression || '[formula not set]';
      default:
        return 'Not configured';
    }
  };

  const getGroupingSummary = () => {
    const parts = [];
    if (state.groupBy) {
      parts.push(`By ${state.groupBy}`);
    }
    if (state.enableCategoryBreakdown) {
      parts.push(`with ${state.categories.length} categories`);
    }
    return parts.length > 0 ? parts.join(' ') : 'No grouping';
  };

  const validationIssues = [];

  if (!state.name.trim()) {
    validationIssues.push('Report name is required');
  }
  if (!state.description.trim()) {
    validationIssues.push('Description is required');
  }
  if (state.calculationType === 'ratio') {
    const calc = state.calculation as any;
    if (!calc.numerator?.field) {
      validationIssues.push('Numerator field is required for ratio calculation');
    }
    if (!calc.denominator?.field) {
      validationIssues.push('Denominator field is required for ratio calculation');
    }
  }
  if ((state.calculationType === 'sum' || state.calculationType === 'average') && !(state.calculation as any).field) {
    validationIssues.push(`Field is required for ${state.calculationType} calculation`);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-green-100 rounded-lg">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">Preview & Save</h3>
          <p className="text-slate-600">Review your report configuration before saving</p>
        </div>
      </div>

      {validationIssues.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900 mb-2">Please fix the following issues:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
                {validationIssues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <Card variant="default" padding="none" className="overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
            <h4 className="font-semibold text-slate-800">Report Information</h4>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-600">Name</p>
              <p className="text-slate-900">{state.name || <span className="text-red-500">Not set</span>}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Description</p>
              <p className="text-slate-700">{state.description || <span className="text-red-500">Not set</span>}</p>
            </div>
          </div>
        </Card>

        <Card variant="default" padding="none" className="overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-600" />
            <h4 className="font-semibold text-slate-800">Data Source</h4>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-600">Primary Table</p>
              <p className="text-slate-900">{TABLE_METADATA[state.primaryTable]?.displayLabel || state.primaryTable}</p>
            </div>
            {state.joins.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-600 mb-2">Joined Tables</p>
                <div className="space-y-1">
                  {state.joins.map((join, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="px-2 py-1 bg-rocket-100 text-rocket-800 rounded font-mono text-xs">
                        {join.type || 'inner'}
                      </span>
                      <span>{TABLE_METADATA[join.table]?.displayLabel || join.table}</span>
                      <span className="text-slate-500">on {join.on}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card variant="default" padding="none" className="overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-slate-600" />
            <h4 className="font-semibold text-slate-800">Calculation</h4>
          </div>
          <div className="p-4">
            <p className="text-sm font-medium text-slate-600 mb-1">Formula</p>
            <p className="font-mono text-slate-900 bg-slate-50 px-3 py-2 rounded">
              {getCalculationSummary()}
            </p>
          </div>
        </Card>

        <Card variant="default" padding="none" className="overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-600" />
            <h4 className="font-semibold text-slate-800">Grouping</h4>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-600">Time Grouping</p>
              <p className="text-slate-900">{state.groupBy ? `By ${state.groupBy}` : 'None'}</p>
            </div>
            {state.enableCategoryBreakdown && (
              <div>
                <p className="text-sm font-medium text-slate-600 mb-2">Categories</p>
                <div className="space-y-2">
                  {state.categories.map((category, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded flex-shrink-0"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium text-sm text-slate-800">{category.name}</span>
                      {category.keywords.length > 0 && (
                        <span className="text-xs text-slate-600">
                          ({category.keywords.slice(0, 3).join(', ')}{category.keywords.length > 3 ? '...' : ''})
                        </span>
                      )}
                      {category.isDefault && (
                        <span className="text-xs text-slate-500">(default)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card variant="default" padding="none" className="overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-600" />
            <h4 className="font-semibold text-slate-800">Visualization</h4>
          </div>
          <div className="p-4">
            <p className="text-slate-900 capitalize">{state.visualization.replace('_', ' ')}</p>
          </div>
        </Card>
      </div>

      <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-900">
          <span className="font-medium">Ready to save!</span> Click "Save Report" below to create your custom report. It will be available in your Custom Reports dashboard.
        </p>
      </div>
    </div>
  );
}
