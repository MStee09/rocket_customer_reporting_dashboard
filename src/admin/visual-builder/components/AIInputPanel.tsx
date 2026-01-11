import React, { useState, useCallback } from 'react';
import { Sparkles, Send, Loader2, ChevronDown, ChevronRight, Search, Database, CheckCircle, AlertCircle, Wand2 } from 'lucide-react';
import { useBuilderV3 } from './BuilderContextV3';
import { useVisualBuilderAI, ReasoningStep } from '../hooks/useVisualBuilderAI';

const EXAMPLE_PROMPTS = [
  "Show revenue by carrier for the last 30 days",
  "Average cost per shipment by state, top 10",
  "Shipment count by mode over time",
  "Cost breakdown by item description for drawer products",
];

export function AIInputPanel({ customerId }: { customerId?: number }) {
  const { state, dispatch } = useBuilderV3();
  const [showReasoning, setShowReasoning] = useState(true);
  const [prompt, setPrompt] = useState('');
  const { isProcessing, reasoning, investigate } = useVisualBuilderAI(customerId);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isProcessing) return;

    dispatch({ type: 'SET_AI_PROMPT', prompt });
    dispatch({ type: 'SET_AI_PROCESSING', processing: true });

    const result = await investigate(prompt);

    dispatch({ type: 'SET_AI_PROCESSING', processing: false });

    if (result?.success) {
      dispatch({
        type: 'SET_AI_RESULT',
        result: {
          success: true,
          answer: result.answer,
          explanation: result.explanation,
          reasoning: result.reasoning,
          suggestedWidget: result.suggestedWidget,
        },
      });
    } else {
      dispatch({
        type: 'SET_AI_RESULT',
        result: { success: false, answer: '', explanation: '', reasoning: [], error: result?.error || 'Investigation failed' },
      });
    }
  }, [prompt, isProcessing, investigate, dispatch]);

  const handleApplySuggestion = useCallback(() => {
    if (state.aiResult?.suggestedWidget) {
      dispatch({ type: 'APPLY_AI_SUGGESTION', suggestion: state.aiResult.suggestedWidget });
    }
  }, [state.aiResult, dispatch]);

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-50 to-slate-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">AI Widget Builder</h3>
            <p className="text-sm text-slate-600">Describe what you want to visualize</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Show me average cost per shipment by carrier for drawer system products"
              className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              disabled={isProcessing}
            />
            <button
              type="submit"
              disabled={!prompt.trim() || isProcessing}
              className="absolute right-3 bottom-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-slate-500">Try:</span>
            {EXAMPLE_PROMPTS.map((example, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPrompt(example)}
                className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-full hover:border-blue-300"
              >
                {example.slice(0, 35)}...
              </button>
            ))}
          </div>
        </form>
      </div>

      {isProcessing && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            <span className="font-medium text-slate-700">Analyzing...</span>
          </div>
          <ReasoningDisplay steps={reasoning} isLive />
        </div>
      )}

      {!isProcessing && state.aiResult && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {state.aiResult.success && state.aiResult.suggestedWidget ? (
            <>
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 mb-1">{state.aiResult.suggestedWidget.name}</h4>
                    <p className="text-sm text-slate-600">{state.aiResult.explanation}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-b border-slate-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Chart Type</span>
                    <p className="font-medium text-slate-900 capitalize">{state.aiResult.suggestedWidget.chartType}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Group By</span>
                    <p className="font-medium text-slate-900">{state.aiResult.suggestedWidget.xField}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Metric</span>
                    <p className="font-medium text-slate-900">{state.aiResult.suggestedWidget.aggregation} of {state.aiResult.suggestedWidget.yField}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Data Points</span>
                    <p className="font-medium text-slate-900">{state.aiResult.suggestedWidget.data?.length || 0} rows</p>
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-100">
                <button
                  onClick={() => setShowReasoning(!showReasoning)}
                  className="w-full px-4 py-3 flex items-center justify-between text-sm text-slate-600 hover:bg-slate-50"
                >
                  <span>AI Reasoning ({state.aiResult.reasoning.length} steps)</span>
                  {showReasoning ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {showReasoning && (
                  <div className="px-4 pb-4">
                    <ReasoningDisplay steps={state.aiResult.reasoning} />
                  </div>
                )}
              </div>

              <div className="p-4">
                <button
                  onClick={handleApplySuggestion}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  <Wand2 className="w-5 h-5" />
                  Apply This Configuration
                </button>
              </div>
            </>
          ) : (
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h4 className="font-medium text-red-900">Investigation Failed</h4>
                  <p className="text-sm text-red-700 mt-1">{state.aiResult.error}</p>
                  <button
                    onClick={() => dispatch({ type: 'SET_AI_RESULT', result: null })}
                    className="mt-3 text-sm text-blue-600 hover:underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReasoningDisplay({ steps, isLive }: { steps: ReasoningStep[]; isLive?: boolean }) {
  if (steps.length === 0) {
    return <div className="text-sm text-slate-500 italic">{isLive ? 'Starting...' : 'No steps'}</div>;
  }

  return (
    <div className="space-y-2">
      {steps.map((step, index) => (
        <div key={index} className="flex items-start gap-2 text-sm">
          <StepIcon type={step.type} />
          <div className="flex-1 min-w-0">
            {step.toolName && (
              <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 mr-2">{step.toolName}</span>
            )}
            <span className="text-slate-700">{step.content.slice(0, 200)}{step.content.length > 200 ? '...' : ''}</span>
          </div>
        </div>
      ))}
      {isLive && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
}

function StepIcon({ type }: { type: string }) {
  switch (type) {
    case 'routing': return <Sparkles className="w-4 h-4 text-blue-500 mt-0.5" />;
    case 'thinking': return <div className="w-4 h-4 rounded-full bg-blue-100 mt-0.5" />;
    case 'tool_call': return <Search className="w-4 h-4 text-orange-500 mt-0.5" />;
    case 'tool_result': return <Database className="w-4 h-4 text-green-500 mt-0.5" />;
    default: return <div className="w-4 h-4 rounded-full bg-slate-200 mt-0.5" />;
  }
}
