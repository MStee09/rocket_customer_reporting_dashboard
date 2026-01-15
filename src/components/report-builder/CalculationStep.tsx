import { Calculator, Info } from 'lucide-react';
import { ReportBuilderState, CalculationType, AggregationType } from '../../types/reports';
import { getAllAvailableFields, getNumericFieldsForTable, TABLE_METADATA } from '../../config/reportBuilderMetadata';
import { useAuth } from '../../contexts/AuthContext';

interface CalculationStepProps {
  state: ReportBuilderState;
  updateState: (updates: Partial<ReportBuilderState>) => void;
}

export function CalculationStep({ state, updateState }: CalculationStepProps) {
  const { isAdmin } = useAuth();
  const allFields = getAllAvailableFields(state.primaryTable, state.joins, isAdmin());
  const numericFields = allFields.filter(f => f.dataType === 'number' && f.aggregations && f.aggregations.length > 0);

  const handleCalculationTypeChange = (type: CalculationType) => {
    let newCalculation: ReportBuilderState['calculation'] = { type };

    switch (type) {
      case 'count':
        newCalculation = { type: 'count' };
        break;
      case 'sum':
        newCalculation = { type: 'sum', field: '', aggregation: 'sum' };
        break;
      case 'average':
        newCalculation = { type: 'average', field: '', aggregation: 'avg' };
        break;
      case 'ratio':
        newCalculation = {
          type: 'ratio',
          numerator: { field: '', aggregation: 'sum' as AggregationType },
          denominator: { field: '', aggregation: 'sum' as AggregationType }
        };
        break;
      case 'formula':
        newCalculation = { type: 'formula', expression: '', fields: [] };
        break;
    }

    updateState({ calculationType: type, calculation: newCalculation });
  };

  const updateSimpleCalculation = (field: string) => {
    updateState({
      calculation: {
        ...state.calculation,
        field
      }
    });
  };

  const updateRatioCalculation = (part: 'numerator' | 'denominator', field: string, aggregation: AggregationType) => {
    const calc = state.calculation as any;
    updateState({
      calculation: {
        ...calc,
        [part]: { field, aggregation }
      }
    });
  };

  const getPreviewText = () => {
    const calc = state.calculation as any;
    switch (state.calculationType) {
      case 'count':
        return 'Count of records';
      case 'sum':
        return calc.field ? `Sum of ${calc.field}` : 'Sum of [select field]';
      case 'average':
        return calc.field ? `Average of ${calc.field}` : 'Average of [select field]';
      case 'ratio':
        const numText = calc.numerator?.field ? `${calc.numerator.aggregation} of ${calc.numerator.field}` : '[select numerator]';
        const denText = calc.denominator?.field ? `${calc.denominator.aggregation} of ${calc.denominator.field}` : '[select denominator]';
        return `${numText} / ${denText}`;
      default:
        return 'Select calculation type';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-rocket-100 rounded-lg">
          <Calculator className="w-8 h-8 text-rocket-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">Calculation</h3>
          <p className="text-slate-600">Define what metric or value to calculate</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Calculation Type
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(['count', 'sum', 'average', 'ratio', 'formula'] as CalculationType[]).map((type) => (
              <button
                key={type}
                onClick={() => handleCalculationTypeChange(type)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  state.calculationType === type
                    ? 'border-rocket-600 bg-rocket-50'
                    : 'border-slate-300 hover:border-rocket-400 bg-white'
                }`}
              >
                <p className="font-medium text-sm capitalize text-slate-800">{type}</p>
              </button>
            ))}
          </div>
        </div>

        {state.calculationType === 'count' && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm text-slate-700">
              This will count the number of records in your dataset.
            </p>
          </div>
        )}

        {(state.calculationType === 'sum' || state.calculationType === 'average') && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Field to {state.calculationType === 'sum' ? 'Sum' : 'Average'}
            </label>
            <select
              value={(state.calculation as any).field || ''}
              onChange={(e) => updateSimpleCalculation(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-transparent"
            >
              <option value="">Select a numeric field...</option>
              {numericFields.map((field) => (
                <option key={field.field} value={field.field}>
                  {field.displayLabel} {field.sampleValue && `(e.g., ${field.sampleValue})`}
                </option>
              ))}
            </select>
            {numericFields.length === 0 && (
              <p className="text-sm text-orange-600 mt-2">
                No numeric fields available. Consider adding related tables in the previous step.
              </p>
            )}
          </div>
        )}

        {state.calculationType === 'ratio' && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border border-slate-300 rounded-lg p-4 bg-white">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Numerator (Top)
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Field</label>
                    <select
                      value={(state.calculation as any).numerator?.field || ''}
                      onChange={(e) => updateRatioCalculation('numerator', e.target.value, (state.calculation as any).numerator?.aggregation || 'sum')}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                    >
                      <option value="">Select field...</option>
                      {numericFields.map((field) => (
                        <option key={field.field} value={field.field}>
                          {field.displayLabel}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Aggregation</label>
                    <select
                      value={(state.calculation as any).numerator?.aggregation || 'sum'}
                      onChange={(e) => updateRatioCalculation('numerator', (state.calculation as any).numerator?.field || '', e.target.value as AggregationType)}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                    >
                      <option value="sum">Sum</option>
                      <option value="avg">Average</option>
                      <option value="count">Count</option>
                      <option value="min">Minimum</option>
                      <option value="max">Maximum</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="border border-slate-300 rounded-lg p-4 bg-white">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Denominator (Bottom)
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Field</label>
                    <select
                      value={(state.calculation as any).denominator?.field || ''}
                      onChange={(e) => updateRatioCalculation('denominator', e.target.value, (state.calculation as any).denominator?.aggregation || 'sum')}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                    >
                      <option value="">Select field...</option>
                      {numericFields.map((field) => (
                        <option key={field.field} value={field.field}>
                          {field.displayLabel}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Aggregation</label>
                    <select
                      value={(state.calculation as any).denominator?.aggregation || 'sum'}
                      onChange={(e) => updateRatioCalculation('denominator', (state.calculation as any).denominator?.field || '', e.target.value as AggregationType)}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                    >
                      <option value="sum">Sum</option>
                      <option value="avg">Average</option>
                      <option value="count">Count</option>
                      <option value="min">Minimum</option>
                      <option value="max">Maximum</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-rocket-50 border border-rocket-200 rounded-lg p-3">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-rocket-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-rocket-900">
                  <span className="font-medium">Example:</span> To calculate "Average Cost Per Unit", set numerator to "Sum of Total Cost" and denominator to "Sum of Quantity".
                </p>
              </div>
            </div>
          </div>
        )}

        {state.calculationType === 'formula' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-900">
              Custom formulas are coming soon! For now, please use Count, Sum, Average, or Ratio.
            </p>
          </div>
        )}

        <div className="bg-slate-100 border border-slate-300 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-600 mb-2">Calculation Preview</p>
          <p className="text-lg font-mono text-slate-800">{getPreviewText()}</p>
        </div>
      </div>
    </div>
  );
}
