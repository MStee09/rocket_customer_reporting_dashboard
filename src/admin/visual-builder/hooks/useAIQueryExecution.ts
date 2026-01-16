import { useCallback } from 'react';
import { logger } from '../../../utils/logger';
import { supabase } from '../../../lib/supabase';
import {
  Aggregation,
  AIConfig,
  Column,
  WidgetConfig,
} from '../types/visualBuilderTypes';
import {
  extractProductTerms,
  detectMultiDimensionQuery,
  generateDescription,
  buildAIPrompt,
  filterAdminData,
  parseAIConfig,
  mapAIChartType,
  mapAIFieldToColumn,
  mapAIAggregation,
} from '../utils/visualBuilderUtils';
import {
  queryProductCategories,
  queryMultiDimension,
} from '../utils/visualBuilderQueries';

interface ReasoningStep {
  type: string;
  content: string;
}

interface UseAIQueryExecutionParams {
  aiPrompt: string;
  aiLoading: boolean;
  targetScope: 'admin' | 'customer';
  targetCustomerId: number | null;
  effectiveCustomerId: number | null;
  userId: string | undefined;
  canSeeAdminColumns: boolean;
  availableColumns: Column[];
  dateRange: { start: string; end: string };
  setAiLoading: (loading: boolean) => void;
  setAiError: (error: string | null) => void;
  setAiReasoning: React.Dispatch<React.SetStateAction<ReasoningStep[]>>;
  setConfig: React.Dispatch<React.SetStateAction<WidgetConfig>>;
  setHasResults: (hasResults: boolean) => void;
  setIsProductQuery: (isProductQuery: boolean) => void;
  syncFiltersFromAI: (terms: string[]) => void;
}

export function useAIQueryExecution({
  aiPrompt,
  aiLoading,
  targetScope,
  targetCustomerId,
  effectiveCustomerId,
  userId,
  canSeeAdminColumns,
  availableColumns,
  dateRange,
  setAiLoading,
  setAiError,
  setAiReasoning,
  setConfig,
  setHasResults,
  setIsProductQuery,
  syncFiltersFromAI,
}: UseAIQueryExecutionParams) {
  const executeAIQuery = useCallback(async () => {
    if (!aiPrompt.trim() || aiLoading) return;

    setAiLoading(true);
    setAiError(null);
    setAiReasoning([]);
    setConfig(prev => ({ ...prev, data: null, aiConfig: undefined }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const multiDimConfig = detectMultiDimensionQuery(aiPrompt);

      if (multiDimConfig) {
        logger.log('[VisualBuilder] Multi-dimension query detected:', multiDimConfig);
        setAiReasoning([
          { type: 'routing', content: `Multi-dimension analysis: ${multiDimConfig.metric} by ${multiDimConfig.primaryGroupBy} and ${multiDimConfig.secondaryGroupBy}` },
          { type: 'thinking', content: 'Using grouped aggregation for dual-dimension breakdown' }
        ]);

        try {
          const queryCustomerId = targetScope === 'admin' ? null : (targetCustomerId || effectiveCustomerId);
          const productTerms = extractProductTerms(aiPrompt);

          const { raw, grouped, secondaryGroups } = await queryMultiDimension(
            multiDimConfig,
            queryCustomerId,
            dateRange,
            productTerms.length > 0 ? productTerms : undefined
          );

          if (grouped.length > 0) {
            setConfig(prev => ({
              ...prev,
              name: `${multiDimConfig.aggregation.toUpperCase()} ${multiDimConfig.metric} by ${multiDimConfig.primaryGroupBy} and ${multiDimConfig.secondaryGroupBy}`,
              description: `Shows ${multiDimConfig.aggregation} ${multiDimConfig.metric} broken down by ${multiDimConfig.primaryGroupBy} and ${multiDimConfig.secondaryGroupBy}`,
              chartType: 'grouped_bar',
              groupByColumn: multiDimConfig.primaryGroupBy,
              secondaryGroupBy: multiDimConfig.secondaryGroupBy,
              metricColumn: multiDimConfig.metric,
              aggregation: multiDimConfig.aggregation as Aggregation,
              data: grouped,
              rawMultiDimData: raw,
              secondaryGroups: secondaryGroups,
              isMultiDimension: true,
              aiConfig: {
                title: `${multiDimConfig.metric} by ${multiDimConfig.primaryGroupBy} and ${multiDimConfig.secondaryGroupBy}`,
                xAxis: multiDimConfig.primaryGroupBy,
                yAxis: multiDimConfig.metric,
                aggregation: multiDimConfig.aggregation.toUpperCase(),
                filters: [],
                searchTerms: productTerms
              }
            }));

            setHasResults(true);
            setAiReasoning(prev => [...prev,
              { type: 'tool_result', content: `Found ${grouped.length} primary groups x ${secondaryGroups.length} secondary groups` }
            ]);
            setAiLoading(false);
            return;
          }
        } catch (err) {
          console.error('[VisualBuilder] Multi-dimension query failed:', err);
          setAiError(`Multi-dimension query failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setAiLoading(false);
          return;
        }
      }

      const productTerms = extractProductTerms(aiPrompt);

      if (productTerms.length >= 2) {
        logger.log('[VisualBuilder] Product comparison detected:', productTerms);
        setAiReasoning([
          { type: 'routing', content: `Detected product comparison: ${productTerms.join(', ')}` },
          { type: 'thinking', content: 'Using direct database queries for accurate category comparison' }
        ]);

        const queryCustomerId = targetScope === 'admin' ? null : (targetCustomerId || effectiveCustomerId);
        logger.log('[VisualBuilder] Product query using customer ID:', queryCustomerId, '(target:', targetCustomerId, 'effective:', effectiveCustomerId, 'scope:', targetScope, ')');

        const results = await queryProductCategories(
          productTerms,
          canSeeAdminColumns ? 'cost' : 'retail',
          'avg',
          queryCustomerId,
          dateRange
        );

        if (results.length > 0) {
          const aiConfig: AIConfig = {
            title: `Average ${canSeeAdminColumns ? 'Cost' : 'Retail'} by Product Category`,
            xAxis: 'Product Category',
            yAxis: canSeeAdminColumns ? 'cost' : 'retail',
            aggregation: 'AVG',
            filters: productTerms.map(t => `item_description ILIKE '%${t}%'`),
            searchTerms: productTerms
          };

          syncFiltersFromAI(productTerms);

          setConfig(prev => ({
            ...prev,
            name: aiConfig.title,
            description: `Shows average ${canSeeAdminColumns ? 'cost' : 'retail'} for products: ${productTerms.join(', ')}`,
            chartType: 'bar',
            groupByColumn: 'item_description',
            metricColumn: canSeeAdminColumns ? 'cost' : 'retail',
            aggregation: 'avg',
            data: results,
            aiConfig,
          }));

          setHasResults(true);
          setIsProductQuery(true);
          setAiReasoning(prev => [...prev,
            { type: 'tool_result', content: `Found ${results.length} categories with data` }
          ]);
          return;
        } else {
          const dateRangeStr = `${dateRange.start} to ${dateRange.end}`;
          setAiError(`No product data found for "${productTerms.join(', ')}" in the selected date range (${dateRangeStr}). Try expanding the date range or check if this customer has shipments with these products.`);
          setAiLoading(false);
          return;
        }
      }

      const improvedPrompt = buildAIPrompt(aiPrompt, canSeeAdminColumns);

      const requestBody = {
        question: improvedPrompt,
        customerId: targetScope === 'admin' ? '0' : String(targetCustomerId || effectiveCustomerId),
        userId: userId,
        conversationHistory: [],
        preferences: { showReasoning: true, forceMode: 'visual' },
      };

      console.log('[VisualBuilder] Investigate request body:', {
        originalPrompt: aiPrompt,
        improvedPrompt,
        customerId: requestBody.customerId,
        userId: requestBody.userId,
        targetScope,
        targetCustomerId,
        effectiveCustomerId,
        preferences: requestBody.preferences
      });

      const response = await fetch(`${supabaseUrl}/functions/v1/investigate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();

      console.log('[VisualBuilder] Raw investigate response:', data);
      console.log('[VisualBuilder] Response keys:', Object.keys(data));
      console.log('[VisualBuilder] Has visualizations?', {
        exists: 'visualizations' in data,
        isArray: Array.isArray(data.visualizations),
        count: data.visualizations?.length
      });

      if (data.reasoning && Array.isArray(data.reasoning)) {
        console.log('[VisualBuilder] Reasoning steps:', data.reasoning.map((r: any, idx: number) => {
          console.log(`Step ${idx}:`, r);

          if (r.type === 'tool_use') {
            return {
              type: 'tool_use',
              toolName: r.name,
              input: r.input
            };
          } else if (r.type === 'tool_result') {
            return {
              type: 'tool_result',
              toolUseId: r.tool_use_id,
              content: r.content
            };
          } else {
            return {
              type: r.type,
              text: r.text
            };
          }
        }));

        const queryToolCalls = data.reasoning.filter((r: any) =>
          r.type === 'tool_use' && r.name === 'query_with_join'
        );
        console.log('[VisualBuilder] query_with_join tool calls:', queryToolCalls?.map((r: any) => ({
          input: r.input,
          result: data.reasoning.find((res: any) =>
            res.type === 'tool_result' && res.tool_use_id === r.id
          )?.content
        })));
      }

      if (data.visualizations && data.visualizations.length > 0) {
        console.log('[VisualBuilder] First visualization:', {
          title: data.visualizations[0].title,
          type: data.visualizations[0].type,
          dataKeys: Object.keys(data.visualizations[0].data || {}),
          dataRowCount: data.visualizations[0].data?.data?.length || 0,
          hasQuery: !!data.visualizations[0].data?.query
        });
      }

      if (!data.success) {
        throw new Error(data.error || 'AI investigation failed');
      }

      setAiReasoning(data.reasoning || []);

      if (data.visualizations && data.visualizations.length > 0) {
        const viz = data.visualizations[0];
        const vizData = viz.data?.data || [];

        const secureData = canSeeAdminColumns ? vizData : filterAdminData(vizData);

        const aiConfig = parseAIConfig(data.reasoning || [], viz, aiPrompt);

        if (aiConfig.searchTerms.length > 0) {
          syncFiltersFromAI(aiConfig.searchTerms);
        }

        const xAxisColumn = mapAIFieldToColumn(aiConfig.xAxis, availableColumns);
        const yAxisColumn = mapAIFieldToColumn(aiConfig.yAxis, availableColumns);
        const aggregation = mapAIAggregation(aiConfig.aggregation);

        setConfig(prev => ({
          ...prev,
          name: viz.title || '',
          description: generateDescription(aiPrompt, aiConfig, secureData),
          chartType: mapAIChartType(viz.type),
          groupByColumn: xAxisColumn,
          metricColumn: yAxisColumn,
          aggregation: aggregation,
          data: secureData,
          aiConfig,
        }));

        setHasResults(true);
      } else {
        throw new Error('AI could not generate visualization. Try a prompt like: "Average cost for drawer, cargoglide, toolbox"');
      }
    } catch (err) {
      let errorMessage = 'AI request failed';
      if (err instanceof Error) {
        if (err.message.includes('Unexpected end of JSON')) {
          errorMessage = 'Request timed out. Try a simpler query or check your connection.';
        } else if (err.message.includes('500') || err.message.includes('502')) {
          errorMessage = 'Server error. Please try again in a moment.';
        } else {
          errorMessage = err.message;
        }
      }
      setAiError(errorMessage);
    } finally {
      setAiLoading(false);
    }
  }, [
    aiPrompt,
    aiLoading,
    targetScope,
    targetCustomerId,
    effectiveCustomerId,
    userId,
    canSeeAdminColumns,
    availableColumns,
    dateRange,
    setAiLoading,
    setAiError,
    setAiReasoning,
    setConfig,
    setHasResults,
    setIsProductQuery,
    syncFiltersFromAI,
  ]);

  return { executeAIQuery };
}
