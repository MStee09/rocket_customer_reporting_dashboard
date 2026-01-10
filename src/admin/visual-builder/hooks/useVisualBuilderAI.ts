import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import type {
  WidgetQueryConfig,
  ChartType,
  AIResult,
} from '../types/BuilderSchemaV3';

export interface ReasoningStep {
  type: 'routing' | 'thinking' | 'tool_call' | 'tool_result';
  content: string;
  toolName?: string;
}

export interface AIWidgetSuggestion {
  name: string;
  description: string;
  chartType: ChartType;
  xField: string;
  yField: string;
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
  query: WidgetQueryConfig;
  data: any[];
}

export interface AIInvestigationResult {
  success: boolean;
  answer: string;
  explanation: string;
  reasoning: ReasoningStep[];
  suggestedWidget?: AIWidgetSuggestion;
  error?: string;
}

export function useVisualBuilderAI(customerId?: number) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AIInvestigationResult | null>(null);
  const [reasoning, setReasoning] = useState<ReasoningStep[]>([]);

  const investigate = useCallback(async (prompt: string): Promise<AIInvestigationResult | null> => {
    if (!user) {
      setError('Not authenticated');
      return null;
    }

    setIsProcessing(true);
    setError(null);
    setReasoning([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/investigate`;

      const enhancedPrompt = `
I need to create a dashboard widget. ${prompt}

Please:
1. Search for any specific terms mentioned (products, carriers, etc.)
2. Determine the best query structure with proper JOINs
3. Suggest a visualization type (bar, line, pie, kpi, table)
4. Return the data grouped and aggregated appropriately

Focus on creating a reusable widget configuration.`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          question: enhancedPrompt,
          customerId: customerId?.toString() || '0',
          userId: user.id,
          conversationHistory: [],
          preferences: {
            showReasoning: true,
            forceMode: 'visual',
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Investigation failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Investigation failed');
      }

      const reasoningSteps: ReasoningStep[] = (data.reasoning || []).map((r: any) => ({
        type: r.type,
        content: r.content,
        toolName: r.toolName,
      }));

      setReasoning(reasoningSteps);

      let suggestedWidget: AIWidgetSuggestion | undefined;

      if (data.visualizations && data.visualizations.length > 0) {
        const viz = data.visualizations[0];
        const vizData = viz.data?.data || [];

        suggestedWidget = {
          name: viz.title || 'New Widget',
          description: viz.subtitle || prompt,
          chartType: viz.type as ChartType,
          xField: viz.config?.groupBy || 'label',
          yField: viz.config?.metric || 'value',
          aggregation: inferAggregation(viz.config?.metric),
          query: {
            baseTable: 'shipment',
            joins: [],
            filters: [],
            groupBy: [],
          },
          data: vizData,
        };
      }

      const result: AIInvestigationResult = {
        success: true,
        answer: data.answer,
        explanation: data.answer.split('.').slice(0, 3).join('. ') + '.',
        reasoning: reasoningSteps,
        suggestedWidget,
      };

      setLastResult(result);
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Investigation failed';
      setError(errorMessage);

      const errorResult: AIInvestigationResult = {
        success: false,
        answer: '',
        explanation: '',
        reasoning: [],
        error: errorMessage,
      };

      setLastResult(errorResult);
      return errorResult;
    } finally {
      setIsProcessing(false);
    }
  }, [user, customerId]);

  const clearResult = useCallback(() => {
    setLastResult(null);
    setReasoning([]);
    setError(null);
  }, []);

  const toAIResult = useCallback((result: AIInvestigationResult | null): AIResult | null => {
    if (!result) return null;
    return {
      success: result.success,
      answer: result.answer,
      explanation: result.explanation,
      reasoning: result.reasoning.map(r => ({
        type: r.type,
        content: r.content,
        toolName: r.toolName,
      })),
      suggestedWidget: result.suggestedWidget,
      error: result.error,
    };
  }, []);

  return {
    isProcessing,
    error,
    lastResult,
    reasoning,
    investigate,
    clearResult,
    toAIResult,
  };
}

function inferAggregation(metric?: string): 'sum' | 'avg' | 'count' | 'min' | 'max' {
  if (!metric) return 'sum';
  const m = metric.toLowerCase();
  if (m.includes('avg') || m.includes('average')) return 'avg';
  if (m.includes('count')) return 'count';
  if (m.includes('min')) return 'min';
  if (m.includes('max')) return 'max';
  return 'sum';
}
