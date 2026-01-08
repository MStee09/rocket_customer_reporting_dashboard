/**
 * AI Suggestion Assistant - Integrated with Main AI Service
 *
 * This version calls the SAME Supabase Edge Function (generate-report) 
 * that powers the Ask AI chatbot, so it has access to the same:
 * - Schema knowledge
 * - Customer context
 * - Business rules
 * - Available fields
 *
 * LOCATION: /src/admin/visual-builder/components/AISuggestionAssistant.tsx
 */

import React, { useState, useEffect } from 'react';
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
  Wand2,
  RefreshCw,
  X,
  Zap,
  Bot,
  Search,
} from 'lucide-react';
import { useBuilder } from './BuilderContext';
import { supabase } from '../../../lib/supabase';
import type { VisualizationType } from '../types/BuilderSchema';

// =============================================================================
// TYPES
// =============================================================================

interface WidgetConfig {
  visualizationType: VisualizationType;
  xField?: string;
  yField?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  groupBy?: string;
  filters?: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
  title?: string;
}

interface AISuggestion {
  summary: string;
  reasoning?: string;
  config: WidgetConfig;
  alternatives?: Array<{
    description: string;
    config: Partial<WidgetConfig>;
  }>;
  warnings?: string[];
  fieldInfo?: {
    availableGroupFields: string[];
    availableMetricFields: string[];
  };
}

interface ThinkingStep {
  icon: string;
  label: string;
  detail?: string;
}

// =============================================================================
// WIDGET BUILDER PROMPT
// =============================================================================

const WIDGET_BUILDER_PROMPT = `You are helping build a widget for the Visual Widget Builder.

IMPORTANT: You must respond with a widget configuration in this EXACT format wrapped in <widget_config> tags:

<widget_config>
{
  "visualizationType": "bar",
  "xField": "carrier_name",
  "yField": "retail",
  "aggregation": "avg",
  "title": "Average Cost by Carrier",
  "reasoning": "Bar chart is ideal for comparing values across categories",
  "warnings": [],
  "alternatives": [
    {"description": "Use a pie chart for proportion view", "visualizationType": "pie"}
  ]
}
</widget_config>

Valid visualizationType values: bar, line, pie, area, kpi, table, choropleth, flow, histogram, scatter, treemap, funnel

Rules:
1. ONLY use fields from the AVAILABLE DATA FIELDS list in your context
2. xField must be a groupable field (marked with ✓ in Group By column)
3. yField should be an aggregatable field for sum/avg, or omit for count
4. Always include reasoning explaining your choice
5. Include warnings if the user asked for something that's not possible
6. Suggest alternatives when appropriate

Common mappings:
- "cost", "spend", "freight cost" → yField: "retail"
- "by carrier" → xField: "carrier_name"  
- "by state" → xField: "origin_state" or "destination_state"
- "over time", "trend" → xField: "created_date", visualizationType: "line"
- "volume", "count" → aggregation: "count", no yField needed`;

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AISuggestionAssistant() {
  const { state, setVisualization, setActivePanel, addLogicBlock, setTitle } = useBuilder();
  const [prompt, setPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);

  // Get customer ID on mount
  useEffect(() => {
    const getCustomerId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // For admin, we might need to get the selected customer
        // For now, use a default or the user's associated customer
        const { data: profile } = await supabase
          .from('profiles')
          .select('customer_id')
          .eq('id', user.id)
          .single();
        
        if (profile?.customer_id) {
          setCustomerId(profile.customer_id);
        }
      }
    };
    getCustomerId();
  }, []);

  const analyzeWithAI = async () => {
    if (!prompt.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setSuggestion(null);
    setThinkingSteps([
      { icon: '🔍', label: 'Reading your request...' },
    ]);

    try {
      // Build the widget builder prompt
      const widgetPrompt = `${WIDGET_BUILDER_PROMPT}

User request: "${prompt}"

Please analyze this request and provide a widget configuration.`;

      setThinkingSteps([
        { icon: '🔍', label: 'Reading your request...' },
        { icon: '📊', label: 'Checking available fields...' },
      ]);

      // Call the same edge function as the chatbot
      const { data, error: apiError } = await supabase.functions.invoke('generate-report', {
        body: {
          prompt: widgetPrompt,
          conversationHistory: [],
          customerId: customerId || 'default',
          isAdmin: true,
          useTools: true,
          mode: 'widget_builder'  // Tell the backend this is for widget building
        }
      });

      if (apiError) {
        throw new Error(apiError.message || 'Failed to generate suggestion');
      }

      setThinkingSteps([
        { icon: '🔍', label: 'Reading your request...' },
        { icon: '📊', label: 'Checking available fields...' },
        { icon: '✨', label: 'Building configuration...' },
      ]);

      // Parse the response
      const config = parseWidgetConfig(data.message || data.response || '');
      
      if (config) {
        setSuggestion({
          summary: config.title || `${config.visualizationType} chart of ${config.yField || 'count'} by ${config.xField}`,
          reasoning: config.reasoning,
          config: {
            visualizationType: config.visualizationType as VisualizationType,
            xField: config.xField,
            yField: config.yField,
            aggregation: config.aggregation,
            groupBy: config.groupBy,
            filters: config.filters,
            title: config.title,
          },
          warnings: config.warnings,
          alternatives: config.alternatives,
        });
      } else {
        // Fallback: try to extract useful info from the message
        const fallbackConfig = extractFallbackConfig(data.message || '', prompt);
        if (fallbackConfig) {
          setSuggestion(fallbackConfig);
        } else {
          setError('Could not generate a widget configuration. The AI response was: ' + (data.message || 'No response').slice(0, 200));
        }
      }
    } catch (err) {
      console.error('AI suggestion error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate suggestion');
    } finally {
      setIsAnalyzing(false);
      setThinkingSteps([]);
    }
  };

  const applySuggestion = () => {
    if (!suggestion) return;

    // Set visualization config
    setVisualization({
      type: suggestion.config.visualizationType,
      xField: suggestion.config.xField,
      yField: suggestion.config.yField,
      aggregation: suggestion.config.aggregation,
      groupBy: suggestion.config.groupBy,
    });

    // Set title if provided
    if (suggestion.config.title && setTitle) {
      setTitle(suggestion.config.title);
    }

    // Add filters if any
    if (suggestion.config.filters && suggestion.config.filters.length > 0) {
      addLogicBlock({
        id: crypto.randomUUID(),
        type: 'filter',
        conditions: suggestion.config.filters,
        enabled: true,
        label: 'AI Suggested Filter',
      });
    }

    setActivePanel('preview');
  };

  const applyAlternative = (alt: NonNullable<AISuggestion['alternatives']>[number]) => {
    setVisualization({
      type: (alt.config?.visualizationType as VisualizationType) || suggestion?.config.visualizationType || 'bar',
      xField: alt.config?.xField || suggestion?.config.xField,
      yField: alt.config?.yField || suggestion?.config.yField,
    });
    setActivePanel('preview');
  };

  const clearSuggestion = () => {
    setSuggestion(null);
    setError(null);
    setPrompt('');
  };

  return (
    <div className="border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-100 rounded-lg">
            <Wand2 className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-sm font-medium text-slate-700">AI Assistant</span>
          <span className="px-1.5 py-0.5 bg-amber-200 text-amber-800 text-[10px] font-medium rounded">
            SAME AI AS CHATBOT
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
          {/* Input Area */}
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  analyzeWithAI();
                }
              }}
              placeholder="Describe what you want to visualize... (e.g., 'Show average shipping cost by carrier' or 'Compare volume by state over time')"
              rows={3}
              disabled={isAnalyzing}
              className="w-full px-3 py-2 pr-12 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none bg-white disabled:bg-slate-50"
            />
            <button
              onClick={analyzeWithAI}
              disabled={!prompt.trim() || isAnalyzing}
              className="absolute right-2 bottom-2 p-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white rounded-lg transition-colors"
              title="Generate suggestion (Enter)"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Quick Examples */}
          {!suggestion && !error && !isAnalyzing && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-slate-500">Try:</span>
              {[
                'Average cost by carrier',
                'Shipment volume by state',
                'Cost trend over time',
                'Top 10 lanes by spend',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setPrompt(example)}
                  className="text-xs px-2 py-1 bg-white border border-slate-200 rounded-full hover:bg-slate-50 text-slate-600 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          )}

          {/* Loading State */}
          {isAnalyzing && (
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                    <Loader2 className="w-3 h-3 text-white animate-spin" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">Analyzing your request...</p>
                  <div className="mt-2 space-y-1">
                    {thinkingSteps.map((step, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{step.icon}</span>
                        <span>{step.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">Unable to generate suggestion</p>
                  <p className="text-xs text-red-600 mt-1">{error}</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={analyzeWithAI}
                      className="text-xs px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Try Again
                    </button>
                    <button
                      onClick={clearSuggestion}
                      className="text-xs px-3 py-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Suggestion Result */}
          {suggestion && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="p-3 border-b border-slate-100 bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-slate-700">Suggested Configuration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={clearSuggestion}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded"
                      title="Clear"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={applySuggestion}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      Apply
                    </button>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="p-3 border-b border-slate-100">
                <p className="text-sm text-slate-700">{suggestion.summary}</p>
                {suggestion.reasoning && (
                  <p className="text-xs text-slate-500 mt-2 italic">{suggestion.reasoning}</p>
                )}
              </div>

              {/* Configuration Preview */}
              <div className="p-3 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <Database className="w-3 h-3" />
                  <span>Configuration</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <ConfigItem label="Chart Type" value={suggestion.config.visualizationType} />
                  <ConfigItem label="X-Axis" value={suggestion.config.xField || 'N/A'} />
                  <ConfigItem label="Y-Axis" value={suggestion.config.yField || 'count'} />
                  <ConfigItem label="Aggregation" value={suggestion.config.aggregation || 'sum'} />
                  {suggestion.config.groupBy && (
                    <ConfigItem label="Group By" value={suggestion.config.groupBy} />
                  )}
                  {suggestion.config.title && (
                    <ConfigItem label="Title" value={suggestion.config.title} className="col-span-2" />
                  )}
                </div>
              </div>

              {/* Warnings */}
              {suggestion.warnings && suggestion.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 border-b border-amber-100">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-amber-800">Notes</p>
                      <ul className="mt-1 space-y-1">
                        {suggestion.warnings.map((warning, i) => (
                          <li key={i} className="text-xs text-amber-700">• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Alternatives */}
              {suggestion.alternatives && suggestion.alternatives.length > 0 && (
                <div className="p-3">
                  <button
                    onClick={() => setShowAlternatives(!showAlternatives)}
                    className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700"
                  >
                    <Lightbulb className="w-3 h-3" />
                    <span>{showAlternatives ? 'Hide' : 'Show'} alternatives ({suggestion.alternatives.length})</span>
                    <ChevronRight className={`w-3 h-3 transition-transform ${showAlternatives ? 'rotate-90' : ''}`} />
                  </button>

                  {showAlternatives && (
                    <div className="mt-2 space-y-2">
                      {suggestion.alternatives.map((alt, i) => (
                        <div
                          key={i}
                          className="p-2 bg-slate-50 rounded border border-slate-200 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs text-slate-700">{alt.description}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {alt.config?.visualizationType && `${alt.config.visualizationType}`}
                              {alt.config?.xField && ` • by ${alt.config.xField}`}
                            </p>
                          </div>
                          <button
                            onClick={() => applyAlternative(alt)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title="Apply this alternative"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
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

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function ConfigItem({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-[10px] text-slate-400 uppercase tracking-wide">{label}:</span>
      <span className="text-xs font-medium text-slate-700">{value}</span>
    </div>
  );
}

// =============================================================================
// PARSING HELPERS
// =============================================================================

function parseWidgetConfig(response: string): any | null {
  // Try to extract from <widget_config> tags
  const configMatch = response.match(/<widget_config>\s*([\s\S]*?)\s*<\/widget_config>/);
  if (configMatch) {
    try {
      return JSON.parse(configMatch[1].trim());
    } catch (e) {
      console.error('Failed to parse widget config JSON:', e);
    }
  }

  // Try to find any JSON object with visualizationType
  const jsonMatch = response.match(/\{[\s\S]*?"visualizationType"[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      // Try to fix common JSON issues
      try {
        const fixed = jsonMatch[0]
          .replace(/'/g, '"')
          .replace(/(\w+):/g, '"$1":')
          .replace(/,\s*}/g, '}');
        return JSON.parse(fixed);
      } catch {}
    }
  }

  return null;
}

function extractFallbackConfig(message: string, originalPrompt: string): AISuggestion | null {
  // Simple fallback parsing based on common patterns in the response
  const lower = message.toLowerCase();
  const promptLower = originalPrompt.toLowerCase();
  
  let visualizationType: VisualizationType = 'bar';
  let xField = 'carrier_name';
  let yField: string | undefined = 'retail';
  let aggregation: 'sum' | 'avg' | 'count' = 'sum';

  // Detect chart type from response or prompt
  if (lower.includes('line') || promptLower.includes('trend') || promptLower.includes('over time')) {
    visualizationType = 'line';
    xField = 'created_date';
  } else if (lower.includes('pie')) {
    visualizationType = 'pie';
  }

  // Detect grouping field
  if (promptLower.includes('carrier')) xField = 'carrier_name';
  else if (promptLower.includes('state')) xField = 'destination_state';
  else if (promptLower.includes('customer')) xField = 'customer_name';
  else if (promptLower.includes('mode')) xField = 'mode_name';

  // Detect metric
  if (promptLower.includes('cost') || promptLower.includes('spend')) {
    yField = 'retail';
  } else if (promptLower.includes('weight')) {
    yField = 'total_weight';
  } else if (promptLower.includes('count') || promptLower.includes('volume')) {
    yField = undefined;
    aggregation = 'count';
  }

  // Detect aggregation
  if (promptLower.includes('average') || promptLower.includes('avg')) {
    aggregation = 'avg';
  } else if (promptLower.includes('total') || promptLower.includes('sum')) {
    aggregation = 'sum';
  }

  return {
    summary: `${visualizationType} chart showing ${aggregation} of ${yField || 'shipments'} by ${xField}`,
    reasoning: 'Generated from your request (fallback mode)',
    config: {
      visualizationType,
      xField,
      yField,
      aggregation,
    },
    warnings: ['This is a simplified suggestion. For better results, try rephrasing your request.'],
  };
}

export default AISuggestionAssistant;
