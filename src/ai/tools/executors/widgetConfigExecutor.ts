import { ToolResult, AIToolContext } from '../types';

export async function executeBuildWidgetConfig(
  toolCallId: string,
  args: Record<string, unknown>,
  context: AIToolContext
): Promise<ToolResult> {
  const config = {
    visualizationType: args.visualizationType,
    xField: args.xField,
    yField: args.yField,
    aggregation: args.aggregation,
    groupBy: args.groupBy,
    filters: args.filters,
    title: args.title
  };

  const xFieldExists = context.schemaFields.some(f => f.name === args.xField);
  const yFieldExists = !args.yField || context.schemaFields.some(f => f.name === args.yField);

  if (!xFieldExists) {
    return {
      toolCallId,
      success: false,
      error: `X-axis field "${args.xField}" does not exist. Use get_schema_info to see available fields.`
    };
  }

  if (!yFieldExists) {
    return {
      toolCallId,
      success: false,
      error: `Y-axis field "${args.yField}" does not exist. Use get_schema_info to see available fields.`
    };
  }

  return {
    toolCallId,
    success: true,
    data: {
      type: 'widget_config',
      config,
      reasoning: args.reasoning,
      warnings: args.warnings || [],
      alternatives: args.alternatives || [],
      previewData: args.previewData
    }
  };
}
