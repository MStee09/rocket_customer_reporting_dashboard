import { useState, useEffect } from 'react';
import { X, ArrowLeft, ArrowRight, Save, Loader2 } from 'lucide-react';
import { ReportBuilderState, CalculationType } from '../types/reports';
import { useAuth } from '../contexts/AuthContext';
import { BasicInformationStep } from './report-builder/BasicInformationStep';
import { DataSourceStep } from './report-builder/DataSourceStep';
import { CalculationStep } from './report-builder/CalculationStep';
import { GroupingStep } from './report-builder/GroupingStep';
import { VisualizationStep } from './report-builder/VisualizationStep';
import { PreviewStep } from './report-builder/PreviewStep';

interface ReportBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (report: any) => Promise<void>;
}

const TOTAL_STEPS = 6;

const STEP_TITLES = [
  'Basic Information',
  'Data Source',
  'Calculation',
  'Grouping & Categories',
  'Visualization',
  'Preview & Save'
];

export function ReportBuilderModal({ isOpen, onClose, onSave }: ReportBuilderModalProps) {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [state, setState] = useState<ReportBuilderState>({
    step: 1,
    name: '',
    description: '',
    primaryTable: 'shipment',
    joins: [],
    calculationType: 'count' as CalculationType,
    calculation: { type: 'count' },
    groupBy: 'month',
    dimensionGrouping: [],
    enableCategoryBreakdown: false,
    categorizeByField: '',
    categories: [],
    visualization: 'bar_chart',
    visualizationOptions: {}
  });

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const savedState = localStorage.getItem('reportBuilderDraft');
    if (savedState) {
      try {
        setState(JSON.parse(savedState));
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (state.name || state.description) {
      localStorage.setItem('reportBuilderDraft', JSON.stringify(state));
    }
  }, [state]);

  if (!isOpen) return null;

  const updateState = (updates: Partial<ReportBuilderState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (state.step < TOTAL_STEPS) {
      setState(prev => ({ ...prev, step: prev.step + 1 }));
    }
  };

  const handleBack = () => {
    if (state.step > 1) {
      setState(prev => ({ ...prev, step: prev.step - 1 }));
    }
  };

  const validateStep = (): boolean => {
    switch (state.step) {
      case 1:
        return state.name.trim().length > 0 && state.description.trim().length > 0;
      case 2:
        return state.primaryTable.length > 0;
      case 3:
        if (state.calculationType === 'ratio') {
          const calc = state.calculation as any;
          return calc.numerator?.field && calc.denominator?.field;
        }
        if (state.calculationType === 'sum' || state.calculationType === 'average') {
          return !!(state.calculation as any).field;
        }
        return true;
      case 4:
        return true;
      case 5:
        return state.visualization.length > 0;
      case 6:
        return true;
      default:
        return false;
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const reportConfig = {
        id: `report-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: state.name,
        description: state.description,
        type: state.enableCategoryBreakdown ? 'category_breakdown' : 'time_series',
        config: {
          primaryTable: state.primaryTable,
          joins: state.joins,
          calculation: state.calculation,
          groupBy: state.groupBy,
          categories: state.enableCategoryBreakdown ? state.categories : undefined,
          filters: {}
        },
        visualization: state.visualization,
        createdAt: new Date().toISOString(),
        createdBy: user?.id || 'system'
      };

      await onSave(reportConfig);
      localStorage.removeItem('reportBuilderDraft');
      onClose();
    } catch (error) {
      console.error('Failed to save report:', error);
      alert('Failed to save report. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const canProceed = validateStep();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute inset-4 md:inset-8 bg-white rounded-2xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-800">
              {state.name || 'New Custom Report'}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                <div key={index} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                      state.step === index + 1
                        ? 'bg-rocket-600 text-white'
                        : state.step > index + 1
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {index + 1}
                  </div>
                  {index < TOTAL_STEPS - 1 && (
                    <div
                      className={`w-12 h-1 mx-1 rounded ${
                        state.step > index + 1 ? 'bg-green-600' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-600 mt-2">
              Step {state.step} of {TOTAL_STEPS}: {STEP_TITLES[state.step - 1]}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {state.step === 1 && (
            <BasicInformationStep state={state} updateState={updateState} />
          )}
          {state.step === 2 && (
            <DataSourceStep state={state} updateState={updateState} />
          )}
          {state.step === 3 && (
            <CalculationStep state={state} updateState={updateState} />
          )}
          {state.step === 4 && (
            <GroupingStep state={state} updateState={updateState} />
          )}
          {state.step === 5 && (
            <VisualizationStep state={state} updateState={updateState} />
          )}
          {state.step === 6 && (
            <PreviewStep state={state} />
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handleBack}
            disabled={state.step === 1}
            className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>

            {state.step < TOTAL_STEPS ? (
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className="px-6 py-2 bg-rocket-600 hover:bg-rocket-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={!canProceed || isSaving}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Report
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
