/**
 * AI Suggestion Assistant - Real AI Version
 *
 * Uses Claude with MCP-style tools to intelligently build widget configurations.
 * This replaces the fake pattern-matching with actual AI that queries your schema.
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
} from 'lucide-react';
import { useBuilder } from './BuilderContext';
import { WidgetBuilderService, type WidgetSuggestion } from '../services/widgetBuilderService';
import type { VisualizationType } from '../types/BuilderSchema';

interface AISuggestionAssistantProps {
  apiKey?: string;
  customerId?: string;
}

export function AISuggestionAssistant({ apiKey, customerId }: AISuggestionAssistantProps) {
  const { state, setVisualization, setActivePanel, addLogicBlock, setTitle } = useBuilder();
  const [prompt, setPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestion, setSuggestion] = useState<WidgetSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [showAlternatives, setShowAlternatives] = useState(false);

  // Check if AI is available
  const aiAvailable = Boolean(apiKey && customerId);

  const analyzeWithAI = async () => {
    if (!prompt.trim() || !apiKey || !customerId) return;

    setIsAnalyzing(true);
    setError(null);
    setSuggestion(null);

    try {
      const service = new WidgetBuilderService(apiKey, customerId);
      await service.initialize(); // Loads schema from same source as chatbot
      const result = await service.suggest(prompt);
      setSuggestion(result);
    } catch (err) {
      console.error('AI suggestion error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate suggestion');
    } finally {
      setIsAnalyzing(false);
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
    if (suggestion.config.title) {
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

  const applyAlternative = (alt: NonNullable<WidgetSuggestion['alternatives']>[number]) => {
    setVisualization({
      type: (alt.visualizationType as VisualizationType) || suggestion?.config.visualizationType || 'bar',
      xField: alt.xField || suggestion?.config.xField,
      yField: alt.yField || suggestion?.config.yField,
    });
    setActivePanel('preview');
  };

  const clearSuggestion = () => {
    setSuggestion(null);
    setError(null);
    setPrompt('');
  };

  // If AI not available, show setup instructions
  if (!aiAvailable) {
    return (
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 text-slate-500">
            <Bot className="w-4 h-4" />
            <span className="text-sm">AI Assistant requires API configuration</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Set up your Claude API key in settings to enable intelligent widget suggestions.
          </p>
        </div>
      </div>
    );
  }

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
            POWERED BY CLAUDE
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
                'Compare carriers by on-time delivery',
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
                <div>
                  <p className="text-sm font-medium text-slate-700">Analyzing your request...</p>
                  <p className="text-xs text-slate-500">
                    Checking available fields and previewing data
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full animate-pulse" style={{ width: '60%' }} />
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
                    <ConfigItem label="Title" value={suggestion.config.title} />
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
                              {alt.visualizationType && `${alt.visualizationType} • `}
                              {alt.xField && `by ${alt.xField}`}
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

              {/* Data Preview */}
              {suggestion.dataPreview && (
                <div className="p-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <BarChart3 className="w-3 h-3" />
                    <span>Data Preview ({suggestion.dataPreview.totalRows} rows)</span>
                  </div>
                  <div className="space-y-1">
                    {suggestion.dataPreview.sampleData.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex-1 text-xs text-slate-600 truncate">{item.name}</div>
                        <div className="text-xs font-medium text-slate-800">
                          {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                        </div>
                      </div>
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

function ConfigItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-400 uppercase tracking-wide">{label}:</span>
      <span className="text-xs font-medium text-slate-700">{value}</span>
    </div>
  );
}

export default AISuggestionAssistant;
