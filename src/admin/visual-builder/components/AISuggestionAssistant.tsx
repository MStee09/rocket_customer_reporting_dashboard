import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Filter,
  Database,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  Info,
  Brain,
  Search,
  Zap,
} from 'lucide-react';
import { useBuilder } from './BuilderContext';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import type { VisualizationType, FilterCondition } from '../types/BuilderSchema';

interface SuggestionStep {
  panel: 'visualization' | 'fields' | 'logic' | 'preview' | 'publish';
  title: string;
  description: string;
  action?: {
    type: 'set_visualization' | 'set_field' | 'add_filter' | 'add_ai_block';
    payload: any;
  };
}

interface AISuggestion {
  success: boolean;
  summary: string;
  visualizationType: VisualizationType;
  xField?: string;
  yField?: string;
  aggregation?: string;
  filters?: FilterCondition[];
  steps: SuggestionStep[];
  aiPrompt?: string;
  warning?: string;
  info?: string;
  limitations?: string[];
  mcpQuery?: any;
  reasoning?: string[];
}

type AnalysisPhase = 'idle' | 'discovering' | 'searching' | 'analyzing' | 'complete' | 'error';

export function AISuggestionAssistant() {
  const { state, setVisualization, setActivePanel, addLogicBlock } = useBuilder();
  const { user, selectedCustomerId } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [phase, setPhase] = useState<AnalysisPhase>('idle');
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);

  const analyzePrompt = async () => {
    if (!prompt.trim()) return;

    setPhase('discovering');
    setError(null);
    setSuggestion(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const phaseTimer1 = setTimeout(() => setPhase('searching'), 800);
      const phaseTimer2 = setTimeout(() => setPhase('analyzing'), 1600);

      console.log('[AISuggestionAssistant] Calling widget-builder-ai with prompt:', prompt);

      const response = await supabase.functions.invoke('widget-builder-ai', {
        body: {
          prompt: prompt.trim(),
          customerId: selectedCustomerId?.toString(),
          userId: user?.id,
        },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });

      clearTimeout(phaseTimer1);
      clearTimeout(phaseTimer2);

      console.log('[AISuggestionAssistant] Response:', response);

      if (response.error) {
        throw new Error(response.error.message || 'AI analysis failed');
      }

      const result = response.data;

      if (!result || !result.success) {
        throw new Error(result?.error || 'AI returned unsuccessful response');
      }

      const steps = buildStepsFromAIResponse(result);

      setSuggestion({
        ...result,
        steps,
      });
      setPhase('complete');

    } catch (err) {
      console.error('[AISuggestionAssistant] Error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setPhase('error');

      const fallback = buildFallbackSuggestion(prompt);
      setSuggestion(fallback);
    }
  };

  const applyStep = (step: SuggestionStep) => {
    if (!step.action) {
      setActivePanel(step.panel);
      return;
    }

    switch (step.action.type) {
      case 'set_visualization':
        setVisualization(step.action.payload);
        setActivePanel('visualization');
        break;
      case 'set_field':
        setVisualization(step.action.payload);
        setActivePanel('fields');
        break;
      case 'add_filter':
        addLogicBlock({
          id: crypto.randomUUID(),
          type: 'filter',
          conditions: step.action.payload.conditions,
          enabled: true,
          label: step.action.payload.label,
        });
        setActivePanel('logic');
        break;
      case 'add_ai_block':
        addLogicBlock({
          id: crypto.randomUUID(),
          type: 'ai',
          prompt: step.action.payload.prompt,
          status: 'pending',
          enabled: true,
        });
        setActivePanel('logic');
        break;
    }
  };

  const applyAllSteps = () => {
    if (!suggestion) return;

    setVisualization({
      type: suggestion.visualizationType,
      xField: suggestion.xField,
      yField: suggestion.yField,
      aggregation: suggestion.aggregation as any,
    });

    if (suggestion.filters && suggestion.filters.length > 0) {
      addLogicBlock({
        id: crypto.randomUUID(),
        type: 'filter',
        conditions: suggestion.filters,
        enabled: true,
        label: 'AI Suggested Filter',
      });
    }

    if (suggestion.aiPrompt) {
      addLogicBlock({
        id: crypto.randomUUID(),
        type: 'ai',
        prompt: suggestion.aiPrompt,
        status: 'pending',
        enabled: true,
      });
    }

    setActivePanel('preview');
  };

  const phaseLabels: Record<AnalysisPhase, string> = {
    idle: '',
    discovering: 'Discovering schema...',
    searching: 'Searching for data...',
    analyzing: 'Building configuration...',
    complete: 'Ready',
    error: 'Error',
  };

  const isLoading = phase !== 'idle' && phase !== 'complete' && phase !== 'error';

  return (
    <div className="border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-100 rounded-lg">
            <Brain className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-sm font-medium text-slate-700">AI Assistant</span>
          <span className="text-xs text-slate-500">Describe what you want to see</span>
          <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded">
            MCP-Powered
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Show me average cost for drawer system, cargoglide, and toolbox products"
              rows={3}
              className="w-full px-3 py-2 pr-12 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none bg-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  analyzePrompt();
                }
              }}
              disabled={isLoading}
            />
            <button
              onClick={analyzePrompt}
              disabled={!prompt.trim() || isLoading}
              className="absolute right-2 bottom-2 p-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white rounded-lg transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <div className="flex items-center gap-1.5">
                {phase === 'discovering' && <Database className="w-4 h-4 animate-pulse" />}
                {phase === 'searching' && <Search className="w-4 h-4 animate-pulse" />}
                {phase === 'analyzing' && <Zap className="w-4 h-4 animate-pulse" />}
                <span>{phaseLabels[phase]}</span>
              </div>
              <div className="flex-1 h-1 bg-amber-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{
                    width: phase === 'discovering' ? '33%' :
                           phase === 'searching' ? '66%' :
                           phase === 'analyzing' ? '90%' : '0%'
                  }}
                />
              </div>
            </div>
          )}

          {!suggestion && phase === 'idle' && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-slate-500">Try:</span>
              {[
                'Average cost by carrier',
                'Cost breakdown for drawer system and cargoglide',
                'Shipment volume by state',
                'Top carriers by spend',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setPrompt(example)}
                  className="text-xs px-2 py-1 bg-white border border-slate-200 rounded-full hover:bg-slate-50 text-slate-600"
                >
                  {example}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700">Analysis failed</p>
                  <p className="text-xs text-red-600 mt-0.5">{error}</p>
                  <p className="text-xs text-red-500 mt-1">Using fallback suggestion instead.</p>
                </div>
              </div>
            </div>
          )}

          {suggestion && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="p-3 border-b border-slate-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-slate-700">Suggested Approach</span>
                  </div>
                  <button
                    onClick={applyAllSteps}
                    className="flex items-center gap-1 px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    Apply All
                  </button>
                </div>
                <p className="text-sm text-slate-600 mt-1">{suggestion.summary}</p>
              </div>

              {suggestion.info && (
                <div className="p-3 bg-blue-50 border-b border-blue-100 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800">{suggestion.info}</p>
                </div>
              )}

              {suggestion.warning && (
                <div className="p-3 bg-amber-50 border-b border-amber-100 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">{suggestion.warning}</p>
                </div>
              )}

              {suggestion.limitations && suggestion.limitations.length > 0 && (
                <div className="p-3 bg-slate-50 border-b border-slate-100">
                  <p className="text-xs font-medium text-slate-600 mb-1">Limitations:</p>
                  <ul className="text-xs text-slate-500 list-disc list-inside">
                    {suggestion.limitations.map((lim, i) => (
                      <li key={i}>{lim}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="divide-y divide-slate-100">
                {suggestion.steps.map((step, i) => (
                  <div key={i} className="p-3 flex items-start gap-3 hover:bg-slate-50">
                    <div className="flex-shrink-0 w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-xs font-medium text-slate-600">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <StepIcon panel={step.panel} />
                        <span className="text-sm font-medium text-slate-700">{step.title}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                    </div>
                    {step.action && (
                      <button
                        onClick={() => applyStep(step)}
                        className="flex-shrink-0 p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                        title="Apply this step"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {suggestion.reasoning && suggestion.reasoning.length > 0 && (
                <div className="border-t border-slate-100">
                  <button
                    onClick={() => setShowReasoning(!showReasoning)}
                    className="w-full p-2 text-xs text-slate-500 hover:bg-slate-50 flex items-center justify-center gap-1"
                  >
                    <Brain className="w-3 h-3" />
                    {showReasoning ? 'Hide' : 'Show'} AI reasoning
                  </button>
                  {showReasoning && (
                    <div className="p-3 bg-slate-50 text-xs font-mono text-slate-600 max-h-40 overflow-auto">
                      {suggestion.reasoning.map((r, i) => (
                        <div key={i} className="mb-1">- {r}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepIcon({ panel }: { panel: string }) {
  const icons: Record<string, React.ReactNode> = {
    visualization: <BarChart3 className="w-3 h-3 text-blue-500" />,
    fields: <Database className="w-3 h-3 text-green-500" />,
    logic: <Filter className="w-3 h-3 text-purple-500" />,
    preview: <CheckCircle2 className="w-3 h-3 text-orange-500" />,
    publish: <Sparkles className="w-3 h-3 text-amber-500" />,
  };
  return icons[panel] || null;
}

function buildStepsFromAIResponse(result: any): SuggestionStep[] {
  const steps: SuggestionStep[] = [];

  steps.push({
    panel: 'visualization',
    title: `Select ${capitalizeFirst(result.visualizationType || 'bar')} Chart`,
    description: `This visualization type will best show your data`,
    action: {
      type: 'set_visualization',
      payload: { type: result.visualizationType || 'bar' },
    },
  });

  if (result.xField || result.yField) {
    steps.push({
      panel: 'fields',
      title: 'Configure Data Fields',
      description: `Set X-axis to "${result.xField || 'select field'}" and Y-axis to "${result.yField || 'retail'}" with ${result.aggregation || 'sum'} aggregation`,
      action: {
        type: 'set_field',
        payload: {
          xField: result.xField,
          yField: result.yField || 'retail',
          aggregation: result.aggregation || 'sum',
        },
      },
    });
  }

  if (result.filters && result.filters.length > 0) {
    const filterDesc = result.filters.map((f: any) => `${f.field}: ${f.value}`).join(', ');
    steps.push({
      panel: 'logic',
      title: 'Add Data Filter',
      description: `Filter: ${filterDesc}`,
      action: {
        type: 'add_filter',
        payload: {
          label: `Filter: ${filterDesc}`,
          conditions: result.filters,
        },
      },
    });
  }

  if (result.aiPrompt) {
    steps.push({
      panel: 'logic',
      title: 'Add AI Logic Block',
      description: 'Uses MCP to search for matching data',
      action: {
        type: 'add_ai_block',
        payload: { prompt: result.aiPrompt },
      },
    });
  }

  steps.push({
    panel: 'preview',
    title: 'Preview Results',
    description: 'Verify the data looks correct before publishing',
  });

  return steps;
}

function buildFallbackSuggestion(prompt: string): AISuggestion {
  const lower = prompt.toLowerCase();

  let visualizationType: VisualizationType = 'bar';
  if (lower.includes('line') || lower.includes('trend')) visualizationType = 'line';
  else if (lower.includes('pie')) visualizationType = 'pie';
  else if (lower.includes('map')) visualizationType = 'choropleth';
  else if (lower.includes('kpi') || lower.includes('total')) visualizationType = 'kpi';

  let aggregation = 'sum';
  if (lower.includes('average') || lower.includes('avg')) aggregation = 'avg';
  else if (lower.includes('count')) aggregation = 'count';

  let xField = '';
  let yField = 'retail';

  if (lower.includes('carrier')) xField = 'carrier_name';
  else if (lower.includes('state')) xField = 'origin_state';
  else if (lower.includes('customer')) xField = 'customer_name';
  else if (lower.includes('mode')) xField = 'mode_name';
  else if (lower.includes('month') || lower.includes('date')) xField = 'pickup_date';

  if (lower.includes('cost') || lower.includes('spend') || lower.includes('retail')) yField = 'retail';
  else if (lower.includes('weight')) yField = 'total_weight';
  else if (lower.includes('miles')) yField = 'miles';
  else if (lower.includes('count') || lower.includes('volume')) {
    yField = '';
    aggregation = 'count';
  }

  return {
    success: false,
    summary: `Create a ${visualizationType} chart${xField ? ` showing ${aggregation} of ${yField || 'shipments'} by ${xField}` : ''} (fallback - AI unavailable)`,
    visualizationType,
    xField: xField || undefined,
    yField: yField || undefined,
    aggregation,
    warning: 'AI analysis failed. This is a basic suggestion based on keywords - you may need to adjust fields manually.',
    steps: [
      {
        panel: 'visualization',
        title: `Select ${capitalizeFirst(visualizationType)} Chart`,
        description: 'Configure your visualization type',
        action: { type: 'set_visualization', payload: { type: visualizationType } },
      },
      ...(xField ? [{
        panel: 'fields' as const,
        title: 'Configure Data Fields',
        description: `Set X-axis to "${xField}" and Y-axis to "${yField || 'count'}"`,
        action: {
          type: 'set_field' as const,
          payload: { xField, yField: yField || undefined, aggregation },
        },
      }] : []),
      {
        panel: 'preview' as const,
        title: 'Preview Results',
        description: 'Verify the data looks correct',
      },
    ],
  };
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default AISuggestionAssistant;
