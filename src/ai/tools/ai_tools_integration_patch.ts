/**
 * AI Tools Integration Patch
 * 
 * Add these changes to your existing AI tools to enable the Visual Builder
 * to use the same infrastructure as the chatbot.
 * 
 * LOCATION: Apply to /src/ai/tools/
 */

// =============================================================================
// 1. ADD TO: /src/ai/tools/definitions.ts
// =============================================================================

// Add this tool to the AI_TOOLS array:

const BUILD_WIDGET_CONFIG_TOOL = {
  name: 'build_widget_config',
  description: 'Build a widget configuration for the Visual Builder. Call this when you have determined the best visualization configuration based on the user request and available data.',
  parameters: {
    type: 'object',
    properties: {
      visualizationType: {
        type: 'string',
        description: 'Chart type',
        enum: ['bar', 'line', 'pie', 'area', 'kpi', 'table', 'choropleth', 'flow', 'histogram', 'scatter', 'treemap', 'funnel']
      },
      xField: {
        type: 'string',
        description: 'X-axis / grouping field - must be a valid field from get_schema_info'
      },
      yField: {
        type: 'string',
        description: 'Y-axis / value field for aggregation (omit for count)'
      },
      aggregation: {
        type: 'string',
        enum: ['sum', 'avg', 'count', 'min', 'max']
      },
      groupBy: {
        type: 'string',
        description: 'Optional secondary grouping for series'
      },
      filters: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string' },
            operator: { type: 'string' },
            value: {}
          }
        }
      },
      title: {
        type: 'string',
        description: 'Suggested title for the widget'
      },
      reasoning: {
        type: 'string',
        description: 'Brief explanation of why this configuration was chosen'
      },
      warnings: {
        type: 'array',
        items: { type: 'string' },
        description: 'Any warnings or limitations'
      },
      alternatives: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            xField: { type: 'string' },
            yField: { type: 'string' },
            visualizationType: { type: 'string' }
          }
        }
      }
    },
    required: ['visualizationType', 'xField', 'aggregation', 'reasoning']
  }
};

// Add to AI_TOOLS array:
// export const AI_TOOLS: ToolDefinition[] = [
//   ... existing tools ...
//   BUILD_WIDGET_CONFIG_TOOL,  // <-- Add this
// ];


// =============================================================================
// 2. ADD TO: /src/ai/tools/types.ts
// =============================================================================

// Add to ToolName type:
// export type ToolName =
//   | 'explore_field'
//   | ... existing tools ...
//   | 'build_widget_config';  // <-- Add this


// =============================================================================
// 3. ADD TO: /src/ai/tools/executors/index.ts
// =============================================================================

// Add import:
// import { executeBuildWidgetConfig } from './widgetConfigExecutor';

// Add case to switch statement:
// case 'build_widget_config':
//   return await executeBuildWidgetConfig(id, args, context);


// =============================================================================
// 4. CREATE: /src/ai/tools/executors/widgetConfigExecutor.ts
// =============================================================================

import { ToolResult, AIToolContext } from '../types';

export async function executeBuildWidgetConfig(
  toolCallId: string,
  args: Record<string, unknown>,
  context: AIToolContext
): Promise<ToolResult> {
  // This tool just captures and returns the configuration
  // The actual widget creation happens in the Visual Builder component
  
  const config = {
    visualizationType: args.visualizationType,
    xField: args.xField,
    yField: args.yField,
    aggregation: args.aggregation,
    groupBy: args.groupBy,
    filters: args.filters,
    title: args.title
  };

  // Validate fields exist
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
      alternatives: args.alternatives || []
    }
  };
}


// =============================================================================
// THAT'S IT!
// =============================================================================
// 
// With these changes:
// 1. The Visual Builder AI uses the SAME schema as the chatbot
// 2. The Visual Builder AI uses the SAME tools (explore_field, preview_grouping, etc.)
// 3. The Visual Builder AI can build validated widget configs
// 
// The WidgetBuilderService (in /src/admin/visual-builder/services/) 
// automatically uses these shared tools.
