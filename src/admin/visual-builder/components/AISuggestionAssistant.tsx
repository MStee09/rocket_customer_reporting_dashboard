/**
 * AI Suggestion Assistant
 *
 * A conversational input that helps admins describe what they want to see,
 * then provides step-by-step guidance on how to build it.
 *
 * LOCATION: /src/admin/visual-builder/components/AISuggestionAssistant.tsx
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
  Copy,
  Wand2,
} from 'lucide-react';
import { useBuilder } from './BuilderContext';
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
  summary: string;
  visualizationType: VisualizationType;
  xField?: string;
  yField?: string;
  aggregation?: string;
  filters?: FilterCondition[];
  steps: SuggestionStep[];
  aiPrompt?: string;
}

export function AISuggestionAssistant() {
  const { state, setVisualization, setActivePanel, addLogicBlock } = useBuilder();
  const [prompt, setPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [expanded, setExpanded] = useState(true);

  const analyzePrompt = async () => {
    if (!prompt.trim()) return;

    setIsAnalyzing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    const analysis = parseUserIntent(prompt);
    setSuggestion(analysis);
    setIsAnalyzing(false);
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
        label: 'Product Filter',
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

  return (
    <div className="border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-100 rounded-lg">
            <Wand2 className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-sm font-medium text-slate-700">AI Assistant</span>
          <span className="text-xs text-slate-500">Describe what you want to see</span>
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
              placeholder="Example: Show me a bar chart of average shipping cost for products containing 'drawer system', 'cargoglide', or 'toolbox' in the description"
              rows={3}
              className="w-full px-3 py-2 pr-12 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none bg-white"
            />
            <button
              onClick={analyzePrompt}
              disabled={!prompt.trim() || isAnalyzing}
              className="absolute right-2 bottom-2 p-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white rounded-lg transition-colors"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          {!suggestion && (
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
                  className="text-xs px-2 py-1 bg-white border border-slate-200 rounded-full hover:bg-slate-50 text-slate-600"
                >
                  {example}
                </button>
              ))}
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

              {suggestion.aiPrompt && (
                <div className="p-3 bg-amber-50 border-t border-amber-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-amber-700">Suggested AI Logic Prompt:</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(suggestion.aiPrompt!)}
                      className="text-amber-600 hover:text-amber-700"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-amber-800 font-mono bg-white p-2 rounded border border-amber-200">
                    {suggestion.aiPrompt}
                  </p>
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
    logic: <Filter className="w-3 h-3 text-orange-500" />,
    preview: <CheckCircle2 className="w-3 h-3 text-teal-500" />,
    publish: <Sparkles className="w-3 h-3 text-amber-500" />,
  };
  return icons[panel] || null;
}

function parseUserIntent(prompt: string): AISuggestion {
  const lower = prompt.toLowerCase();

  let visualizationType: VisualizationType = 'bar';
  if (lower.includes('line') || lower.includes('trend') || lower.includes('over time')) {
    visualizationType = 'line';
  } else if (lower.includes('pie') || lower.includes('distribution') || lower.includes('breakdown')) {
    visualizationType = 'pie';
  } else if (lower.includes('map') || lower.includes('state') || lower.includes('geographic')) {
    visualizationType = 'choropleth';
  } else if (lower.includes('table') || lower.includes('list')) {
    visualizationType = 'table';
  } else if (lower.includes('kpi') || lower.includes('metric') || lower.includes('total')) {
    visualizationType = 'kpi';
  }

  let aggregation = 'sum';
  if (lower.includes('average') || lower.includes('avg') || lower.includes('mean')) {
    aggregation = 'avg';
  } else if (lower.includes('count') || lower.includes('number of') || lower.includes('how many')) {
    aggregation = 'count';
  } else if (lower.includes('maximum') || lower.includes('max') || lower.includes('highest')) {
    aggregation = 'max';
  } else if (lower.includes('minimum') || lower.includes('min') || lower.includes('lowest')) {
    aggregation = 'min';
  }

  let xField = '';
  let yField = '';

  if (lower.includes('carrier')) xField = 'carrier_name';
  else if (lower.includes('state')) xField = 'origin_state';
  else if (lower.includes('product') || lower.includes('description')) xField = 'shipment_description';
  else if (lower.includes('customer')) xField = 'customer_name';
  else if (lower.includes('mode')) xField = 'mode_name';
  else if (lower.includes('month') || lower.includes('date') || lower.includes('time')) xField = 'created_date';

  if (lower.includes('cost') || lower.includes('spend') || lower.includes('price')) {
    yField = 'retail';
  } else if (lower.includes('weight')) {
    yField = 'total_weight';
  } else if (lower.includes('volume') || lower.includes('shipment')) {
    yField = '';
    aggregation = 'count';
  }

  const productMatches: string[] = [];
  const containsPatterns = [
    /containing ['"]([^'"]+)['"]/gi,
    /contains ['"]([^'"]+)['"]/gi,
    /includes? ['"]([^'"]+)['"]/gi,
    /['"]([^'"]+)['"],?\s*['"]([^'"]+)['"],?\s*(?:or|and)?\s*['"]([^'"]+)['"]/gi,
    /drawer system|cargoglide|toolbox/gi,
  ];

  for (const pattern of containsPatterns) {
    let match;
    while ((match = pattern.exec(lower)) !== null) {
      if (match[1]) productMatches.push(match[1]);
      if (match[2]) productMatches.push(match[2]);
      if (match[3]) productMatches.push(match[3]);
      if (match[0] && !match[1]) productMatches.push(match[0]);
    }
  }

  const filters: FilterCondition[] = [];
  let aiPrompt = '';

  if (productMatches.length > 0) {
    aiPrompt = `Filter shipments where description contains any of: ${productMatches.map(p => `"${p}"`).join(', ')}`;

    filters.push({
      field: 'shipment_description',
      operator: 'contains_any',
      value: productMatches,
    });
  }

  const steps: SuggestionStep[] = [
    {
      panel: 'visualization',
      title: `Select ${visualizationType.charAt(0).toUpperCase() + visualizationType.slice(1)} Chart`,
      description: `This visualization type will best show your ${aggregation} comparison`,
      action: {
        type: 'set_visualization',
        payload: { type: visualizationType },
      },
    },
    {
      panel: 'fields',
      title: 'Configure Data Fields',
      description: xField
        ? `Set X-axis to "${xField}" and Y-axis to "${yField || 'count'}" with ${aggregation} aggregation`
        : 'Map your data fields to chart dimensions',
      action: xField ? {
        type: 'set_field',
        payload: { xField, yField: yField || undefined, aggregation },
      } : undefined,
    },
  ];

  if (productMatches.length > 0) {
    steps.push({
      panel: 'logic',
      title: 'Add Product Filter',
      description: `Filter to only include: ${productMatches.join(', ')}`,
      action: {
        type: 'add_ai_block',
        payload: { prompt: aiPrompt },
      },
    });
  }

  steps.push({
    panel: 'preview',
    title: 'Preview Results',
    description: 'Verify the data looks correct before publishing',
  });

  return {
    summary: `I'll help you create a ${visualizationType} chart showing ${aggregation} of ${yField || 'shipments'}${xField ? ` by ${xField}` : ''}${productMatches.length > 0 ? ` for products matching: ${productMatches.join(', ')}` : ''}.`,
    visualizationType,
    xField: xField || undefined,
    yField: yField || undefined,
    aggregation,
    filters: filters.length > 0 ? filters : undefined,
    steps,
    aiPrompt: aiPrompt || undefined,
  };
}

export default AISuggestionAssistant;
