import { supabase } from '../../../lib/supabase';
import { ToolResult, AIToolContext, FieldExplorationResult } from '../types';

export async function executeExploreField(
  toolCallId: string,
  args: Record<string, unknown>,
  context: AIToolContext
): Promise<ToolResult> {
  const fieldName = args.fieldName as string;
  const sampleSize = (args.sampleSize as number) || 10;

  const fieldInfo = context.schemaFields.find(
    f => f.name.toLowerCase() === fieldName.toLowerCase()
  );

  if (!fieldInfo) {
    return {
      toolCallId,
      success: false,
      error: `Field "${fieldName}" not found. Available fields: ${context.schemaFields.slice(0, 10).map(f => f.name).join(', ')}...`,
      suggestions: ['Use get_schema_info to see all available fields']
    };
  }

  if (fieldInfo.adminOnly && !context.isAdmin) {
    return {
      toolCallId,
      success: false,
      error: `Field "${fieldName}" is not available in your view.`,
      suggestions: ['Try exploring a different field like "retail" or "carrier_name"']
    };
  }

  try {
    const { data, error } = await supabase.rpc('explore_single_field', {
      p_customer_id: context.customerId,
      p_field_name: fieldInfo.name,
      p_sample_size: sampleSize
    });

    if (error) {
      throw new Error(error.message);
    }

    const result: FieldExplorationResult = {
      fieldName: fieldInfo.name,
      dataType: data.data_type || fieldInfo.dataType as 'text' | 'number' | 'date' | 'boolean',
      totalCount: data.total_count || 0,
      populatedCount: data.populated_count || 0,
      populatedPercent: data.populated_percent || 0,
      uniqueCount: data.unique_count,
      sampleValues: data.sample_values,
      numericStats: data.numeric_stats,
      dateRange: data.date_range
    };

    context.conversationState.exploredFields.set(fieldName, result);

    const suggestions: string[] = [];

    if (result.populatedPercent < 50) {
      suggestions.push(`Warning: This field is only ${result.populatedPercent}% populated. Consider using a different field or filtering to populated records only.`);
    }

    if (result.uniqueCount && result.uniqueCount > 100 && fieldInfo.isGroupable) {
      suggestions.push(`This field has ${result.uniqueCount} unique values. Consider limiting results or using a different grouping.`);
    }

    if (result.uniqueCount && result.uniqueCount < 3 && fieldInfo.isGroupable) {
      suggestions.push(`This field only has ${result.uniqueCount} unique values. A pie chart might work well.`);
    }

    return {
      toolCallId,
      success: true,
      data: {
        exploration: result,
        fieldInfo: {
          displayName: fieldInfo.displayName,
          category: fieldInfo.category,
          businessContext: fieldInfo.businessContext,
          isGroupable: fieldInfo.isGroupable,
          isAggregatable: fieldInfo.isAggregatable
        }
      },
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  } catch (error) {
    return {
      toolCallId,
      success: false,
      error: `Failed to explore field: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
