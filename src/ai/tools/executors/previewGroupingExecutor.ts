import { supabase } from '../../../lib/supabase';
import { ToolResult, AIToolContext, GroupingPreview } from '../types';

export async function executePreviewGrouping(
  toolCallId: string,
  args: Record<string, unknown>,
  context: AIToolContext
): Promise<ToolResult> {
  const groupBy = args.groupBy as string;
  const metric = args.metric as string;
  const aggregation = args.aggregation as string;
  const limit = (args.limit as number) || 10;

  const groupByField = context.schemaFields.find(
    f => f.name.toLowerCase() === groupBy.toLowerCase()
  );
  const metricField = context.schemaFields.find(
    f => f.name.toLowerCase() === metric.toLowerCase()
  );

  if (!groupByField) {
    return {
      toolCallId,
      success: false,
      error: `Group by field "${groupBy}" not found.`,
      suggestions: ['Use get_schema_info with category "dimension" to see groupable fields']
    };
  }

  if (!metricField) {
    return {
      toolCallId,
      success: false,
      error: `Metric field "${metric}" not found.`,
      suggestions: ['Use get_schema_info with category "measure" to see aggregatable fields']
    };
  }

  if (!groupByField.isGroupable) {
    return {
      toolCallId,
      success: false,
      error: `Field "${groupBy}" cannot be used for grouping.`,
      suggestions: [`Try grouping by ${context.schemaFields.filter(f => f.isGroupable).slice(0, 3).map(f => f.name).join(', ')}`]
    };
  }

  if (!['sum', 'avg', 'count', 'countDistinct', 'min', 'max'].includes(aggregation)) {
    return {
      toolCallId,
      success: false,
      error: `Invalid aggregation "${aggregation}".`,
      suggestions: ['Valid options: sum, avg, count, countDistinct, min, max']
    };
  }

  if (['sum', 'avg'].includes(aggregation) && !metricField.isAggregatable) {
    return {
      toolCallId,
      success: false,
      error: `Cannot use ${aggregation} on field "${metric}" - it's not a numeric field.`,
      suggestions: ['Use "count" or "countDistinct" for non-numeric fields']
    };
  }

  if ((groupByField.adminOnly || metricField.adminOnly) && !context.isAdmin) {
    return {
      toolCallId,
      success: false,
      error: 'This combination uses fields not available in your view.',
      suggestions: ['Try using "retail" instead of cost fields']
    };
  }

  try {
    const { data, error } = await supabase.rpc('preview_grouping', {
      p_customer_id: context.customerId,
      p_group_by: groupByField.name,
      p_metric: metricField.name,
      p_aggregation: aggregation,
      p_limit: limit + 5
    });

    if (error) {
      throw new Error(error.message);
    }

    const results = (data.results || []).slice(0, limit);
    const totalGroups = data.total_groups || results.length;

    let recommendation: GroupingPreview['recommendation'] = 'good';
    let suggestionText: string | undefined;

    if (totalGroups > 50) {
      recommendation = 'too_many';
      suggestionText = `This grouping produces ${totalGroups} groups. Consider adding a filter or using a different field.`;
    } else if (totalGroups < 2) {
      recommendation = 'too_few';
      suggestionText = 'This grouping produces only one group. Try a different groupBy field.';
    } else if (results.length > 0) {
      const topValue = results[0]?.value || 0;
      const totalValue = results.reduce((sum: number, r: { value?: number }) => sum + (r.value || 0), 0);
      if (topValue > totalValue * 0.9) {
        suggestionText = `Note: The top group accounts for ${Math.round((topValue / totalValue) * 100)}% of the total.`;
      }
    }

    const preview: GroupingPreview = {
      groupBy: groupByField.name,
      metric: metricField.name,
      aggregation,
      results: results.map((r: { name?: string; value?: number; count?: number }) => ({
        name: r.name || 'Unknown',
        value: r.value || 0,
        count: r.count || 0
      })),
      totalGroups,
      recommendation,
      suggestionText
    };

    return {
      toolCallId,
      success: true,
      data: preview,
      suggestions: suggestionText ? [suggestionText] : undefined
    };
  } catch (error) {
    return {
      toolCallId,
      success: false,
      error: `Failed to preview grouping: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
