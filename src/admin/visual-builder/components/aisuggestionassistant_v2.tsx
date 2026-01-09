/**
 * AISuggestionAssistant - WORKING VERSION
 * 
 * LOCATION: src/admin/visual-builder/components/AISuggestionAssistant.tsx
 * 
 * This version:
 * 1. Calls widget-builder-ai edge function for AI-powered suggestions
 * 2. Has detailed console logging for debugging
 * 3. Falls back to pattern-matching if AI fails
 * 4. Shows reasoning steps from AI
 */

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
  Wand2,
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

const phaseLabels: Record<AnalysisPhase, string> = {
  idle: '',
  discovering: 'Analyzing schema...',
  searching: 'Understanding request...',
  analyzing: 'Building configuration...',
  complete: 'Done!',
  error: 'Error occurred',
};

export function AISuggestionAssistant() {
  const { state, setVisualization, setActivePanel, addLogicBlock } = useBuilder();
  const { user, selectedCustomerId } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [phase, setPhase] = useState<AnalysisPhase>('idle');
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);

  const isLoading = phase !== 'idle' && phase !== 'complete' && phase !== 'error';

  const analyzePrompt = async () => {
    if (!prompt.trim()) return;

    setPhase('discovering');
    setError(null);
    setSuggestion(null);

    try {
      // Get auth token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      // Simulate phase progression for UX
      const phaseTimer1 = setTimeout(() => setPhase('searching'), 800);
      const phaseTimer2 = setTimeout(() => setPhase('analyzing'), 1600);

      console.log('[AISuggestionAssistant] ==============================');
      console.log('[AISuggestionAssistant] Calling widget-builder-ai');
      console.log('[AISuggestionAssistant] Prompt:', prompt);
      console.log('[AISuggestionAssistant] Customer:', selectedCustomerId);

      const response = await supabase.functions.invoke('widget-builder-ai', {
        body: {
          prompt: prompt.trim(),
          customerId: selectedCustomerId?.toString(),
          userId: user?.id,
        },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });

      // Clear timers
      clearTimeout(phaseTimer1);
      clearTimeout(phaseTimer2);

      console.log('[AISuggestionAssistant] Raw response:', response);
      console.log('[AISuggestionAssistant] Response data:', JSON.stringify(response.data, null, 2));

      if (response.error) {
        console.error('[AISuggestionAssistant] Response error:', response.error);
        throw new Error(response.error.message || 'AI analysis failed');
      }

      const result = response.data;

      if (!result) {
        console.error('[AISuggestionAssistant] No data in response');
        throw new Error('Empty response from AI');
      }

      console.log('[AISuggestionAssistant] Result success:', result.success);
      console.log('[AISuggestionAssistant] Result visualizationType:', result.visualizationType);
      console.log('[AISuggestionAssistant] Result xField:', result.xField);
      console.log('[AISuggestionAssistant] Result yField:', result.yField);
      console.log('[AISuggestionAssistant] Result aggregation:', result.aggregation);

      if (!result.success) {
        console.warn('[AISuggestionAssistant] AI returned unsuccessful, using fallback');
        throw new Error(result.error || 'AI returned unsuccessful response');
      }

      // Build steps from the AI response
      const steps = buildStepsFromAIResponse(result);

      console.log('[AISuggestionAssistant] Built steps:', steps);

      setSuggestion({
        success: true,
        summary: result.summary || 'AI-configured widget',
        visualizationType: (result.visualizationType as VisualizationType) || 'bar',
        xField: result.xField,
        yField: result.yField,
        aggregation: result.aggregation,
        filters: result.filters || [],
        steps,
        info: result.info,
        warning: result.warning,
        limitations: result.limitations || [],
        reasoning: result.reasoning || [],
        mcpQuery: result.mcpQuery,
      });
      setPhase('complete');

    } catch (err) {
      console.error('[AISuggestionAssistant] Error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setPhase('error');
      
      // Fall back to basic suggestion if AI fails
      const fallback = buildFallbackSuggestion(prompt);
      console.log('[AISuggestionAssistant] Using fallback:', fallback);
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

    console.log('[AISuggestionAssistant] Applying all steps:', suggestion);

    // Apply visualization
    setVisualization({
      type: suggestion.visualizationType,
      xField: suggestion.xField,
      yField: suggestion.yField,
      aggregation: suggestion.aggregation as any,
    });

    // Apply filters if any
    if (suggestion.filters && suggestion.filters.length > 0) {
      addLogicBlock({
        id: crypto.randomUUID(),
        type: 'filter',
        conditions: suggestion.filters,
        enabled: true,
        label: 'AI Suggested Filter',
      });
    }

    // Add AI logic block if needed
    if (suggestion.aiPrompt) {
      addLogicBlock({
        id: crypto.randomUUID(),
        type: 'ai',
        prompt: suggestion.aiPrompt,
        status: 'pending',
        enabled: true,
      });
    }

    // Go to preview
    setActivePanel('preview');
  };

  const resetSuggestion = () => {
    setPrompt('');
    setSuggestion(null);
    setPhase('idle');
    setError(null);
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500 rounded-md">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-semibold text-slate-800">AI Assistant</span>
            <span className="ml-2 text-xs px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded">MCP-Powered</span>
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-500" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Input area */}
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to see, e.g. 'Show average cost for drawer system, cargoglide, and toolbox products'"
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

          {/* Phase indicator */}
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

          {/* Example prompts */}
          {!suggestion && phase === 'idle' && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-slate-500">Try:</span>
              {[
                'Average retail by carrier',
                'Cost breakdown for drawer system and cargoglide',
                'Shipment count by state',
                'Revenue trend by month',
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

          {/* Error state */}
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

          {/* Suggestion display */}
          {suggestion && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="p-3 border-b border-slate-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-slate-700">Suggested Configuration</span>
                    {suggestion.success && (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={resetSuggestion}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      Clear
                    </button>
                    <button
                      onClick={applyAllSteps}
                      className="flex items-center gap-1 px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      Apply All
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mt-1">{suggestion.summary}</p>
              </div>

              {/* Configuration details */}
              <div className="p-3 bg-slate-50 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">Type:</span>{' '}
                    <span className="font-medium text-slate-700">{suggestion.visualizationType}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Aggregation:</span>{' '}
                    <span className="font-medium text-slate-700">{suggestion.aggregation || 'sum'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">X-Axis:</span>{' '}
                    <span className="font-medium text-slate-700">{suggestion.xField || 'not set'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Y-Axis:</span>{' '}
                    <span className="font-medium text-slate-700">{suggestion.yField || 'retail'}</span>
                  </div>
                </div>
                
                {suggestion.filters && suggestion.filters.length > 0 && (
                  <div>
                    <span className="text-slate-500">Filters:</span>{' '}
                    <span className="font-medium text-slate-700">
                      {suggestion.filters.map((f: any) => `${f.field}: ${f.value}`).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Info/Warning messages */}
              {suggestion.info && (
                <div className="p-2 bg-blue-50 border-t border-blue-100 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <p className="text-xs text-blue-700">{suggestion.info}</p>
                </div>
              )}

              {suggestion.warning && (
                <div className="p-2 bg-amber-50 border-t border-amber-100 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-amber-700">{suggestion.warning}</p>
                </div>
              )}

              {/* Limitations */}
              {suggestion.limitations && suggestion.limitations.length > 0 && (
                <div className="p-2 border-t border-slate-100">
                  <p className="text-xs text-slate-500">
                    <span className="font-medium">Note:</span> {suggestion.limitations.join('. ')}
                  </p>
                </div>
              )}

              {/* Reasoning toggle */}
              {suggestion.reasoning && suggestion.reasoning.length > 0 && (
                <div className="border-t border-slate-100">
                  <button
                    onClick={() => setShowReasoning(!showReasoning)}
                    className="w-full p-2 flex items-center justify-between text-xs text-slate-500 hover:bg-slate-50"
                  >
                    <span>Show AI reasoning</span>
                    {showReasoning ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                  {showReasoning && (
                    <div className="px-2 pb-2 space-y-1">
                      {suggestion.reasoning.map((step, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                          <span className="text-slate-400">{i + 1}.</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Steps - collapsible */}
              {suggestion.steps && suggestion.steps.length > 0 && (
                <div className="p-3 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 mb-2">Steps to apply:</p>
                  <div className="space-y-2">
                    {suggestion.steps.map((step, i) => (
                      <button
                        key={i}
                        onClick={() => applyStep(step)}
                        className="w-full flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-left transition-colors"
                      >
                        <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-medium">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-slate-700">{step.title}</p>
                          <p className="text-xs text-slate-500">{step.description}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildStepsFromAIResponse(result: any): SuggestionStep[] {
  const steps: SuggestionStep[] = [];

  // Step 1: Visualization type
  if (result.visualizationType) {
    steps.push({
      panel: 'visualization',
      title: `Select ${capitalizeFirst(result.visualizationType)} Chart`,
      description: `Best visualization for your request`,
      action: {
        type: 'set_visualization',
        payload: { type: result.visualizationType },
      },
    });
  }

  // Step 2: Field configuration
  if (result.xField || result.yField) {
    steps.push({
      panel: 'fields',
      title: 'Configure Data Fields',
      description: `X: ${result.xField || 'auto'}, Y: ${result.yField || 'retail'}, Agg: ${result.aggregation || 'sum'}`,
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

  // Step 3: Filters
  if (result.filters && result.filters.length > 0) {
    const filterDesc = result.filters.map((f: any) => `${f.field}: ${f.value}`).join(', ');
    steps.push({
      panel: 'logic',
      title: 'Add Filter',
      description: filterDesc,
      action: {
        type: 'add_filter',
        payload: {
          label: `AI Filter: ${filterDesc}`,
          conditions: result.filters,
        },
      },
    });
  }

  // Step 4: Preview
  steps.push({
    panel: 'preview',
    title: 'Preview Widget',
    description: 'Check the data before publishing',
  });

  return steps;
}

function buildFallbackSuggestion(prompt: string): AISuggestion {
  const lower = prompt.toLowerCase();

  // Determine visualization type
  let visualizationType: VisualizationType = 'bar';
  if (lower.includes('line') || lower.includes('trend') || lower.includes('over time')) {
    visualizationType = 'line';
  } else if (lower.includes('pie') || lower.includes('breakdown') || lower.includes('distribution')) {
    visualizationType = 'pie';
  } else if (lower.includes('map') || lower.includes('geographic') || lower.includes('by state')) {
    visualizationType = 'choropleth';
  } else if (lower.includes('kpi') || lower.includes('total') || lower.includes('single')) {
    visualizationType = 'kpi';
  } else if (lower.includes('table') || lower.includes('list') || lower.includes('detail')) {
    visualizationType = 'table';
  }

  // Determine aggregation
  let aggregation = 'sum';
  if (lower.includes('average') || lower.includes('avg') || lower.includes('mean')) {
    aggregation = 'avg';
  } else if (lower.includes('count') || lower.includes('number of') || lower.includes('how many')) {
    aggregation = 'count';
  } else if (lower.includes('max') || lower.includes('highest') || lower.includes('top')) {
    aggregation = 'max';
  } else if (lower.includes('min') || lower.includes('lowest')) {
    aggregation = 'min';
  }

  // Determine X field (grouping)
  let xField = 'origin_state'; // default
  if (lower.includes('carrier')) {
    xField = 'carrier.carrier_name';
  } else if (lower.includes('product') || lower.includes('drawer') || lower.includes('cargoglide') || lower.includes('toolbox')) {
    xField = 'shipment_item.description';
  } else if (lower.includes('customer')) {
    xField = 'customer_name';
  } else if (lower.includes('month') || lower.includes('date') || lower.includes('time')) {
    xField = 'pickup_date';
  } else if (lower.includes('destination')) {
    xField = 'destination_state';
  }

  // Determine Y field (metric)
  let yField = 'retail';
  if (lower.includes('cost') || lower.includes('spend')) {
    yField = 'cost'; // Note: admin only
  } else if (lower.includes('weight')) {
    yField = 'weight';
  } else if (lower.includes('count')) {
    yField = 'load_id';
    aggregation = 'count';
  }

  // Build filters for product mentions
  const filters: FilterCondition[] = [];
  const productMentions: string[] = [];
  
  if (lower.includes('drawer system') || lower.includes('drawer')) {
    productMentions.push('drawer');
  }
  if (lower.includes('cargoglide')) {
    productMentions.push('cargoglide');
  }
  if (lower.includes('toolbox')) {
    productMentions.push('toolbox');
  }

  if (productMentions.length > 0) {
    xField = 'shipment_item.description';
    filters.push({
      field: 'shipment_item.description',
      operator: 'ilike',
      value: productMentions.map(p => `%${p}%`).join('|'),
    });
  }

  const summary = `${capitalizeFirst(aggregation)} of ${yField} grouped by ${xField}${filters.length > 0 ? ' (filtered)' : ''}`;

  return {
    success: false, // Mark as fallback
    summary,
    visualizationType,
    xField,
    yField,
    aggregation,
    filters,
    steps: buildStepsFromAIResponse({
      visualizationType,
      xField,
      yField,
      aggregation,
      filters,
    }),
    warning: 'AI analysis failed - using pattern-matching fallback. Results may not be accurate.',
    limitations: ['This is a best-guess configuration based on keywords in your prompt'],
  };
}
