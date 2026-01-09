/**
 * AI Suggestion Assistant - MCP-Enabled Version
 *
 * LOCATION: /src/admin/visual-builder/components/AISuggestionAssistant.tsx
 *
 * Changes from original:
 * - Calls generate-report Edge Function with MCP tools
 * - Can search for products across shipment_item.description
 * - Uses real database discovery instead of hardcoded patterns
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
} from 'lucide-react';
import { useBuilder } from './BuilderContext';
import { supabase } from '../../../../lib/supabase';
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
  mcpQuery?: any; // The MCP query configuration for preview
}

interface MCPSearchResult {
  table: string;
  field: string;
  match_count: number;
  sample_values: string[];
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
    
    try {
      // First, search for any product terms in the prompt using MCP
      const productTerms = extractProductTerms(prompt);
      let searchResults: MCPSearchResult[] = [];
      
      if (productTerms.length > 0) {
        // Call MCP search for each term
        for (const term of productTerms) {
          const result = await searchWithMCP(term);
          if (result && result.length > 0) {
            searchResults = [...searchResults, ...result];
          }
        }
      }
      
      // Generate suggestion based on prompt and search results
      const analysis = await generateSuggestion(prompt, searchResults, productTerms);
      setSuggestion(analysis);
    } catch (error) {
      console.error('AI analysis error:', error);
      // Fall back to local parsing if MCP fails
      const fallbackAnalysis = parseUserIntentLocal(prompt);
      setSuggestion(fallbackAnalysis);
    }
    
    setIsAnalyzing(false);
  };

  const searchWithMCP = async (query: string): Promise<MCPSearchResult[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
          prompt: `Search for "${query}"`,
          customerId: state.customerId || '',
          useTools: true,
          mode: 'investigate',
          conversationHistory: [],
        },
      });

      if (error) throw error;

      // Extract search results from tool executions
      const searchTool = data?.toolExecutions?.find(
        (t: any) => t.toolName === 'search_text'
      );
      
      if (searchTool?.result?.results) {
        return searchTool.result.results;
      }
      
      return [];
    } catch (e) {
      console.error('MCP search failed:', e);
      return [];
    }
  };

  const extractProductTerms = (text: string): string[] => {
    const terms: string[] = [];
    const lower = text.toLowerCase();
    
    // Extract quoted terms
    const quotedPattern = /["']([^"']+)["']/g;
    let match;
    while ((match = quotedPattern.exec(text)) !== null) {
      terms.push(match[1].trim());
    }
    
    // Known product terms
    const knownProducts = [
      'drawer system', 'drawer systems',
      'cargoglide', 'cargo glide',
      'toolbox', 'tool box', 'tool boxes',
    ];
    
    for (const product of knownProducts) {
      if (lower.includes(product) && !terms.includes(product)) {
        terms.push(product);
      }
    }
    
    return terms;
  };

  const generateSuggestion = async (
    prompt: string,
    searchResults: MCPSearchResult[],
    productTerms: string[]
  ): Promise<AISuggestion> => {
    const lower = prompt.toLowerCase();
    
    // Determine visualization type
    let visualizationType: VisualizationType = 'bar';
    if (lower.includes('line') || lower.includes('trend') || lower.includes('over time')) {
      visualizationType = 'line';
    } else if (lower.includes('pie') || lower.includes('distribution')) {
      visualizationType = 'pie';
    } else if (lower.includes('map')) {
      visualizationType = 'choropleth';
    } else if (lower.includes('table') || lower.includes('list')) {
      visualizationType = 'table';
    } else if (lower.includes('kpi') || lower.includes('total')) {
      visualizationType = 'kpi';
    }

    // Determine aggregation
    let aggregation = 'sum';
    if (lower.includes('average') || lower.includes('avg')) {
      aggregation = 'avg';
    } else if (lower.includes('count') || lower.includes('volume') || lower.includes('how many')) {
      aggregation = 'count';
    } else if (lower.includes('max') || lower.includes('highest')) {
      aggregation = 'max';
    } else if (lower.includes('min') || lower.includes('lowest')) {
      aggregation = 'min';
    }

    // Determine fields
    let xField = '';
    let yField = 'retail';
    
    if (lower.includes('carrier')) {
      xField = 'carrier_name';
    } else if (lower.includes('destination state')) {
      xField = 'destination_state';
    } else if (lower.includes('state')) {
      xField = 'origin_state';
    } else if (lower.includes('mode')) {
      xField = 'mode_name';
    } else if (lower.includes('month') || lower.includes('date') || lower.includes('time')) {
      xField = 'created_date';
    } else if (productTerms.length > 0) {
      // If products are mentioned, group by product
      xField = 'product_category';
    }

    if (lower.includes('weight')) {
      yField = 'weight';
    } else if (lower.includes('miles') || lower.includes('distance')) {
      yField = 'miles';
    } else if (lower.includes('count') || lower.includes('volume')) {
      yField = '';
      aggregation = 'count';
    }

    // Build filters from search results
    const filters: FilterCondition[] = [];
    let warning = '';
    let mcpQuery: any = null;

    if (productTerms.length > 0 && searchResults.length > 0) {
      // Products found in database - use MCP query
      const productField = searchResults[0];
      
      mcpQuery = {
        base_table: 'shipment',
        joins: [{ table: productField.table }],
        filters: productTerms.map(term => ({
          field: `${productField.table}.${productField.field}`,
          operator: 'ilike',
          value: `%${term}%`,
        })),
        aggregations: [{
          field: `shipment.${yField || 'retail'}`,
          function: aggregation,
          alias: `${aggregation}_${yField || 'retail'}`,
        }],
      };

      // Add filter for UI
      filters.push({
        field: `${productField.table}.${productField.field}`,
        operator: 'ilike' as any,
        value: productTerms.join('|'),
      });
    } else if (productTerms.length > 0) {
      // Products mentioned but not found
      warning = `Could not find "${productTerms.join(', ')}" in the database. Try different search terms or check spelling.`;
    }

    // Build steps
    const steps: SuggestionStep[] = [
      {
        panel: 'visualization',
        title: `Select ${visualizationType.charAt(0).toUpperCase() + visualizationType.slice(1)} Chart`,
        description: `Best visualization for ${aggregation} comparison`,
        action: {
          type: 'set_visualization',
          payload: { type: visualizationType },
        },
      },
      {
        panel: 'fields',
        title: 'Configure Data Fields',
        description: xField
          ? `X-axis: "${xField}", Y-axis: "${yField || 'count'}" with ${aggregation}`
          : 'Configure your chart dimensions',
        action: xField ? {
          type: 'set_field',
          payload: { xField, yField: yField || undefined, aggregation },
        } : undefined,
      },
    ];

    if (productTerms.length > 0) {
      steps.push({
        panel: 'logic',
        title: 'Add Product Filter',
        description: `Filter for: ${productTerms.join(', ')}`,
        action: {
          type: 'add_filter',
          payload: {
            label: `Product Filter: ${productTerms.join(', ')}`,
            conditions: filters,
          },
        },
      });
    }

    steps.push({
      panel: 'preview',
      title: 'Preview Results',
      description: 'Verify data before publishing',
    });

    return {
      summary: `Create a ${visualizationType} chart showing ${aggregation} of ${yField || 'shipments'}${xField ? ` by ${xField}` : ''}${productTerms.length > 0 ? ` for: ${productTerms.join(', ')}` : ''}.`,
      visualizationType,
      xField: xField || undefined,
      yField: yField || undefined,
      aggregation,
      filters: filters.length > 0 ? filters : undefined,
      steps,
      warning: warning || undefined,
      mcpQuery,
    };
  };

  // Fallback local parsing (same as original)
  const parseUserIntentLocal = (prompt: string): AISuggestion => {
    const lower = prompt.toLowerCase();

    let visualizationType: VisualizationType = 'bar';
    if (lower.includes('line') || lower.includes('trend')) {
      visualizationType = 'line';
    } else if (lower.includes('pie')) {
      visualizationType = 'pie';
    }

    let aggregation = 'sum';
    if (lower.includes('average') || lower.includes('avg')) {
      aggregation = 'avg';
    } else if (lower.includes('count')) {
      aggregation = 'count';
    }

    let xField = '';
    if (lower.includes('carrier')) xField = 'carrier_name';
    else if (lower.includes('state')) xField = 'origin_state';

    let yField = 'retail';
    if (lower.includes('weight')) yField = 'total_weight';

    return {
      summary: `Create a ${visualizationType} chart showing ${aggregation} of ${yField} by ${xField || 'category'}.`,
      visualizationType,
      xField: xField || undefined,
      yField,
      aggregation,
      steps: [
        {
          panel: 'visualization',
          title: `Select ${visualizationType} Chart`,
          description: 'Best fit for your request',
          action: { type: 'set_visualization', payload: { type: visualizationType } },
        },
        {
          panel: 'fields',
          title: 'Configure Fields',
          description: `Set up ${xField} and ${yField}`,
          action: xField ? { type: 'set_field', payload: { xField, yField, aggregation } } : undefined,
        },
        {
          panel: 'preview',
          title: 'Preview',
          description: 'Check your results',
        },
      ],
      warning: 'Using simplified analysis. For product filtering, ensure MCP is available.',
    };
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
        mcpQuery: suggestion.mcpQuery, // Pass MCP query config
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

export default AISuggestionAssistant;
