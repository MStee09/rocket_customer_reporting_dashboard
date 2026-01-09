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
  warning?: string;
  info?: string;
  mcpQuery?: any;
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
    await new Promise(resolve => setTimeout(resolve, 300));
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
          mcpQuery: step.action.payload.mcpQuery,
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
        mcpQuery: suggestion.mcpQuery,
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
              placeholder="Example: Show me average cost for drawer system, cargoglide, and toolbox"
              rows={3}
              className="w-full px-3 py-2 pr-12 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none bg-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  analyzePrompt();
                }
              }}
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
                'Cost breakdown for drawer system and cargoglide',
                'Shipment volume by state',
                'Top carriers for toolbox shipments',
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

function parseUserIntent(prompt: string): AISuggestion {
  const lower = prompt.toLowerCase();

  let visualizationType: VisualizationType = 'bar';
  if (lower.includes('line') || lower.includes('trend') || lower.includes('over time')) {
    visualizationType = 'line';
  } else if (lower.includes('pie') || lower.includes('distribution') || lower.includes('breakdown')) {
    visualizationType = 'pie';
  } else if (lower.includes('map') || lower.includes('geographic')) {
    visualizationType = 'choropleth';
  } else if (lower.includes('table') || lower.includes('list')) {
    visualizationType = 'table';
  } else if (lower.includes('kpi') || lower.includes('metric') || lower.includes('total')) {
    visualizationType = 'kpi';
  }

  let aggregation = 'sum';
  if (lower.includes('average') || lower.includes('avg') || lower.includes('mean')) {
    aggregation = 'avg';
  } else if (lower.includes('count') || lower.includes('number of') || lower.includes('how many') || lower.includes('volume')) {
    aggregation = 'count';
  } else if (lower.includes('maximum') || lower.includes('max') || lower.includes('highest')) {
    aggregation = 'max';
  } else if (lower.includes('minimum') || lower.includes('min') || lower.includes('lowest')) {
    aggregation = 'min';
  }

  let xField = '';
  let yField = 'retail';
  let warning = '';
  let info = '';

  if (lower.includes('carrier')) {
    xField = 'carrier_name';
  } else if (lower.includes('state') && !lower.includes('destination')) {
    xField = 'origin_state';
  } else if (lower.includes('destination state')) {
    xField = 'destination_state';
  } else if (lower.includes('customer')) {
    xField = 'customer_name';
  } else if (lower.includes('mode')) {
    xField = 'mode_name';
  } else if (lower.includes('status')) {
    xField = 'status_name';
  } else if (lower.includes('month') || lower.includes('date') || lower.includes('time') || lower.includes('trend')) {
    xField = 'created_date';
  } else if (lower.includes('lane')) {
    xField = 'origin_state';
  }

  if (lower.includes('cost') || lower.includes('spend') || lower.includes('price') || lower.includes('retail')) {
    yField = 'retail';
  } else if (lower.includes('weight')) {
    yField = 'weight';
  } else if (lower.includes('miles') || lower.includes('distance')) {
    yField = 'miles';
  } else if (lower.includes('volume') || lower.includes('shipment') || lower.includes('count')) {
    yField = '';
    aggregation = 'count';
  }

  const productMatches = new Set<string>();

  const quotedPattern = /["']([^"']+)["']/g;
  let match;
  while ((match = quotedPattern.exec(prompt)) !== null) {
    productMatches.add(match[1].toLowerCase().trim());
  }

  const knownProducts = [
    { pattern: 'drawer system', normalized: 'drawer system' },
    { pattern: 'drawer systems', normalized: 'drawer system' },
    { pattern: 'cargoglide', normalized: 'cargoglide' },
    { pattern: 'cargo glide', normalized: 'cargoglide' },
    { pattern: 'toolbox', normalized: 'tool box' },
    { pattern: 'tool box', normalized: 'tool box' },
    { pattern: 'tool boxes', normalized: 'tool box' },
  ];

  for (const product of knownProducts) {
    if (lower.includes(product.pattern)) {
      productMatches.add(product.normalized);
    }
  }

  const uniqueProducts = Array.from(productMatches);

  const filters: FilterCondition[] = [];
  let mcpQuery: any = null;
  let aiPrompt = '';

  if (uniqueProducts.length > 0) {
    info = `Product filtering will use MCP to search shipment_item.description for: ${uniqueProducts.join(', ')}`;

    if (!xField) {
      xField = 'description';
    }

    mcpQuery = {
      base_table: 'shipment',
      joins: [{ table: 'shipment_item' }],
      select: ['shipment.load_id', 'shipment.retail', 'shipment_item.description', 'shipment_item.weight'],
      filters: uniqueProducts.map(term => ({
        field: 'shipment_item.description',
        operator: 'ilike',
        value: `%${term}%`,
      })),
      group_by: ['shipment_item.description'],
      aggregations: [{
        field: yField ? `shipment.${yField}` : 'shipment.load_id',
        function: aggregation,
        alias: `${aggregation}_value`,
      }],
    };

    filters.push({
      field: 'shipment_item.description',
      operator: 'ilike' as any,
      value: uniqueProducts,
    });

    aiPrompt = `Filter shipments containing products: ${uniqueProducts.join(', ')}`;
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

  if (uniqueProducts.length > 0) {
    steps.push({
      panel: 'logic',
      title: 'Add Product Filter',
      description: `Filter to include: ${uniqueProducts.join(', ')}`,
      action: {
        type: 'add_filter',
        payload: {
          label: `Products: ${uniqueProducts.join(', ')}`,
          conditions: filters,
          mcpQuery,
        },
      },
    });
  }

  steps.push({
    panel: 'preview',
    title: 'Preview Results',
    description: 'Verify the data looks correct before publishing',
  });

  return {
    summary: `Create a ${visualizationType} chart showing ${aggregation} of ${yField || 'shipments'}${xField ? ` by ${xField}` : ''}${uniqueProducts.length > 0 ? ` for products: ${uniqueProducts.join(', ')}` : ''}.`,
    visualizationType,
    xField: xField || undefined,
    yField: yField || undefined,
    aggregation,
    filters: filters.length > 0 ? filters : undefined,
    steps,
    aiPrompt: aiPrompt || undefined,
    warning: warning || undefined,
    info: info || undefined,
    mcpQuery,
  };
}

export default AISuggestionAssistant;
