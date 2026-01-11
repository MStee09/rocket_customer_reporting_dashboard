import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Wrench, Eye, Rocket, ChevronRight } from 'lucide-react';
import { BuilderProviderV3, useBuilderV3 } from './BuilderContextV3';
import { AIInputPanel } from './AIInputPanel';
import { ManualConfigPanel } from './ManualConfigPanel';
import { PreviewPanelV3 } from './PreviewPanelV3';
import { PublishPanelV3 } from './PublishPanelV3';
import { useAuth } from '../../../contexts/AuthContext';
import { BuilderStep, BuilderMode } from '../types/BuilderSchemaV3';

const STEPS: Array<{ id: BuilderStep; label: string; icon: React.ElementType }> = [
  { id: 'input', label: 'Create', icon: Sparkles },
  { id: 'configure', label: 'Configure', icon: Wrench },
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'publish', label: 'Publish', icon: Rocket },
];

export function VisualBuilderPageV3() {
  return (
    <BuilderProviderV3>
      <VisualBuilderContent />
    </BuilderProviderV3>
  );
}

function VisualBuilderContent() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { state, dispatch, canProceedToPreview } = useBuilderV3();

  const handleModeChange = (mode: BuilderMode) => {
    dispatch({ type: 'SET_MODE', mode });
    dispatch({ type: 'SET_STEP', step: 'input' });
  };

  const handleStepClick = (step: BuilderStep) => {
    if (step === 'configure' && state.mode === 'ai' && !state.aiResult?.suggestedWidget) return;
    if (step === 'preview' && !canProceedToPreview()) return;
    dispatch({ type: 'SET_STEP', step });
  };

  const handleNext = () => {
    const i = STEPS.findIndex((s) => s.id === state.step);
    if (i < STEPS.length - 1) handleStepClick(STEPS[i + 1].id);
  };

  const handleBack = () => {
    const i = STEPS.findIndex((s) => s.id === state.step);
    if (i > 0) dispatch({ type: 'SET_STEP', step: STEPS[i - 1].id });
  };

  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
          <p className="text-slate-600 mt-2">Visual Builder is only available for admins.</p>
          <button
            onClick={() => navigate('/analytics')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Go to Analytics
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/analytics')}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Visual Builder V3</h1>
                <p className="text-sm text-slate-500">Create custom widgets with AI</p>
              </div>
            </div>
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => handleModeChange('ai')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${
                  state.mode === 'ai' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
                }`}
              >
                <Sparkles className="w-4 h-4" /> AI Mode
              </button>
              <button
                onClick={() => handleModeChange('manual')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${
                  state.mode === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
                }`}
              >
                <Wrench className="w-4 h-4" /> Manual
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = state.step === step.id;
              const isPast = STEPS.findIndex((s) => s.id === state.step) > i;
              return (
                <React.Fragment key={step.id}>
                  {i > 0 && <ChevronRight className="w-4 h-4 text-slate-300" />}
                  <button
                    onClick={() => handleStepClick(step.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : isPast
                          ? 'text-slate-700'
                          : 'text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {step.label}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            {state.step === 'input' && state.mode === 'ai' && <AIInputPanel />}
            {((state.step === 'input' && state.mode === 'manual') ||
              state.step === 'configure' ||
              state.step === 'preview') && <ManualConfigPanel />}
            {state.step === 'publish' && <PublishPanelV3 />}

            {state.step !== 'publish' && (
              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={handleBack}
                  disabled={state.step === 'input'}
                  className="px-4 py-2 text-slate-600 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={
                    (state.step === 'input' &&
                      state.mode === 'ai' &&
                      !state.aiResult?.suggestedWidget) ||
                    (state.step === 'configure' && !canProceedToPreview())
                  }
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg disabled:bg-slate-300"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <div className="lg:sticky lg:top-32 lg:self-start">
            <PreviewPanelV3 />
          </div>
        </div>
      </main>
    </div>
  );
}

export default VisualBuilderPageV3;
