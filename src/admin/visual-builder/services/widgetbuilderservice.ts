/**
 * Widget Builder AI Service - Integrated with Existing AI Infrastructure
 *
 * This service uses the SAME tools and context as the AI Chatbot,
 * so it automatically knows all database columns, tables, and customer context.
 *
 * LOCATION: /src/admin/visual-builder/services/widgetBuilderService.ts
 */

import { AIService } from '../../../ai/service';
import { compileSchemaContext } from '../../../ai/compiler/schemaCompiler';
import { getToolDefinitionsForClaude, AI_TOOLS } from '../../../ai/tools/definitions';
import { executeToolCalls } from '../../../ai/tools/executors';
import type { AIToolContext, SchemaFieldInfo, ConversationState } from '../../../ai/tools/types';
import type { VisualizationType } from '../types/BuilderSchema';

// =============================================================================
// TYPES
// =============================================================================

export interface WidgetConfig {
  visualizationType: VisualizationType;
  xField?: string;
  yField?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  groupBy?: string;
  filters?: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
  title?: string;
}

export interface WidgetSuggestion {
  summary: string;
  reasoning: string;
  config: WidgetConfig;
  alternatives?: Array<{
    description: string;
    config: Partial<WidgetConfig>;
  }>;
  warnings?: string[];
  dataPreview?: {
    sampleData: Array<{ name: string; value: number }>;
    totalRows: number;
  };
}

// =============================================================================
// WIDGET BUILDER TOOL - Added to existing tool set
// =============================================================================

/**
 * This tool definition should be added to src/ai/tools/definitions.ts
 * It allows Claude to output a final widget configuration.
 */
export const BUILD_WIDGET_TOOL = {
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
      },
      previewData: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            value: { type: 'number' }
          }
        },
        description: 'Sample data preview if available from preview_grouping'
      }
    },
    required: ['visualizationType', 'xField', 'aggregation', 'reasoning']
  }
};

// =============================================================================
// SYSTEM PROMPT FOR WIDGET BUILDING
// =============================================================================

const WIDGET_BUILDER_SYSTEM_PROMPT = `You are a widget configuration assistant for a logistics analytics platform.
Your job is to help users create data visualizations by understanding their request and configuring a widget.

## YOUR WORKFLOW

1. **First, check what fields are available** - Use get_schema_info to see available fields
2. **If user mentions specific fields, verify they exist** - Use explore_field to check
3. **Preview the data** - Use preview_grouping to validate the configuration works
4. **Then suggest a visualization** - Use suggest_visualization to pick the best chart type
5. **Build the final config** - Use build_widget_config to output the configuration

## CRITICAL RULES

1. **NEVER assume a field exists** - Always use get_schema_info first
2. **ALWAYS preview before suggesting** - Use preview_grouping to validate data quality
3. **If a field doesn't exist, be honest** - Explain what's missing and suggest alternatives
4. **Use field names exactly as returned by get_schema_info** - Don't guess at names

## COMMON USER INTENT MAPPINGS

- "cost", "spend", "freight cost" → use \`retail\` field (what customer pays)
- "by carrier" → group by \`carrier_name\`
- "by state" → could be \`origin_state\` or \`destination_state\` - ask or use both
- "over time", "trend" → group by date field, use line chart
- "top X" → sort descending and limit
- "compare" → bar chart or grouped bars

## OUTPUT

Always call build_widget_config at the end with your final recommendation.
If you can't fulfill the request, explain why in your response and suggest alternatives.`;

// =============================================================================
// MAIN SERVICE CLASS
// =============================================================================

export class WidgetBuilderService {
  private apiKey: string;
  private customerId: string;
  private isAdmin: boolean;
  private schemaFields: SchemaFieldInfo[] = [];
  private toolContext: AIToolContext | null = null;

  constructor(apiKey: string, customerId: string, isAdmin: boolean = false) {
    this.apiKey = apiKey;
    this.customerId = customerId;
    this.isAdmin = isAdmin;
  }

  /**
   * Initialize the service by loading schema context
   * This uses the same schema compiler as the main AI service
   */
  async initialize(): Promise<void> {
    const schemaContext = await compileSchemaContext(this.customerId);

    // Convert schema to tool context format
    this.schemaFields = schemaContext.fields.map(f => ({
      name: f.name,
      displayName: f.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      dataType: f.type,
      isGroupable: f.isGroupable ?? false,
      isAggregatable: f.isAggregatable ?? false,
      isFilterable: true,
      businessContext: f.businessContext,
      category: this.inferCategory(f),
      adminOnly: f.adminOnly ?? false,
    }));

    // Build tool context
    this.toolContext = {
      customerId: this.customerId,
      isAdmin: this.isAdmin,
      schemaFields: this.schemaFields,
      fieldRelationships: this.buildFieldRelationships(),
      conversationState: this.createInitialState(),
    };
  }

  private inferCategory(field: { name: string; type: string; isAggregatable?: boolean }): 'dimension' | 'measure' | 'date' | 'identifier' {
    if (field.name.includes('date') || field.name.includes('time')) return 'date';
    if (field.name.includes('_id') && !field.isAggregatable) return 'identifier';
    if (field.isAggregatable || field.type === 'number' || field.type === 'currency') return 'measure';
    return 'dimension';
  }

  private buildFieldRelationships() {
    return [
      { fieldA: 'origin_state', fieldB: 'destination_state', relationshipType: 'lane_pair' as const, description: 'Origin and destination form a shipping lane' },
      { fieldA: 'pickup_date', fieldB: 'delivery_date', relationshipType: 'temporal_pair' as const, description: 'Pickup and delivery dates define transit time' },
      { fieldA: 'retail', fieldB: 'miles', relationshipType: 'ratio_candidate' as const, description: 'Cost per mile calculation' },
      { fieldA: 'retail', fieldB: 'total_weight', relationshipType: 'ratio_candidate' as const, description: 'Cost per pound calculation' },
    ];
  }

  private createInitialState(): ConversationState {
    return {
      phase: 'exploring',
      reportInProgress: null,
      confirmedFields: [],
      confirmedFilters: [],
      exploredFields: new Map(),
      pendingClarifications: [],
      turnCount: 0,
      lastToolCalls: [],
    };
  }

  /**
   * Generate a widget suggestion using the full AI tool loop
   */
  async suggest(userPrompt: string): Promise<WidgetSuggestion> {
    if (!this.toolContext) {
      await this.initialize();
    }

    // Get tools - use existing tools plus widget builder tool
    const tools = [
      ...getToolDefinitionsForClaude().filter(t =>
        ['get_schema_info', 'explore_field', 'preview_grouping', 'suggest_visualization', 'get_field_relationships'].includes(t.name)
      ),
      {
        name: BUILD_WIDGET_TOOL.name,
        description: BUILD_WIDGET_TOOL.description,
        input_schema: BUILD_WIDGET_TOOL.parameters
      }
    ];

    const messages: Array<{ role: string; content: unknown }> = [
      { role: 'user', content: userPrompt }
    ];

    let iterations = 0;
    const maxIterations = 8;

    while (iterations < maxIterations) {
      iterations++;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: WIDGET_BUILDER_SYSTEM_PROMPT,
          tools,
          messages
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${await response.text()}`);
      }

      const data = await response.json();

      // Check for end of conversation
      if (data.stop_reason === 'end_turn') {
        // Look for build_widget_config result
        return this.extractWidgetConfig(messages, data);
      }

      // Handle tool use
      if (data.stop_reason === 'tool_use') {
        messages.push({ role: 'assistant', content: data.content });

        const toolResults: Array<{ type: string; tool_use_id: string; content: string }> = [];

        for (const block of data.content) {
          if (block.type === 'tool_use') {
            const result = await this.executeTool(block.name, block.input, block.id);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result)
            });
          }
        }

        messages.push({ role: 'user', content: toolResults });
      }
    }

    throw new Error('Widget suggestion did not complete within iteration limit');
  }

  /**
   * Execute a tool - uses existing executors for most tools
   */
  private async executeTool(name: string, input: Record<string, unknown>, id: string): Promise<unknown> {
    // Handle the widget builder tool specially
    if (name === 'build_widget_config') {
      return {
        success: true,
        type: 'widget_config',
        config: {
          visualizationType: input.visualizationType,
          xField: input.xField,
          yField: input.yField,
          aggregation: input.aggregation,
          groupBy: input.groupBy,
          filters: input.filters,
          title: input.title
        },
        reasoning: input.reasoning,
        warnings: input.warnings || [],
        alternatives: input.alternatives || [],
        previewData: input.previewData
      };
    }

    // Use existing tool executors
    const toolCall = { id, name: name as any, arguments: input };
    const results = await executeToolCalls([toolCall], this.toolContext!);
    return results[0];
  }

  /**
   * Extract widget config from conversation
   */
  private extractWidgetConfig(messages: Array<{ role: string; content: unknown }>, finalResponse: any): WidgetSuggestion {
    // Look for build_widget_config result in messages
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'user' && Array.isArray(msg.content)) {
        for (const block of msg.content as Array<{ type: string; content?: string }>) {
          if (block.type === 'tool_result' && block.content) {
            try {
              const parsed = JSON.parse(block.content);
              if (parsed.type === 'widget_config' || parsed.config?.visualizationType) {
                const config = parsed.config || parsed;
                return {
                  summary: this.extractTextResponse(finalResponse) || 'Widget configuration ready',
                  reasoning: parsed.reasoning || config.reasoning || '',
                  config: {
                    visualizationType: config.visualizationType,
                    xField: config.xField,
                    yField: config.yField,
                    aggregation: config.aggregation,
                    groupBy: config.groupBy,
                    filters: config.filters,
                    title: config.title
                  },
                  warnings: parsed.warnings || [],
                  alternatives: parsed.alternatives,
                  dataPreview: parsed.previewData ? {
                    sampleData: parsed.previewData,
                    totalRows: parsed.previewData.length
                  } : undefined
                };
              }
            } catch {}
          }
        }
      }
    }

    // Fallback - try to extract from final response text
    const textResponse = this.extractTextResponse(finalResponse);
    throw new Error(`AI did not produce a widget configuration. Response: ${textResponse}`);
  }

  private extractTextResponse(response: any): string {
    const textBlock = response.content?.find((c: { type: string }) => c.type === 'text');
    return textBlock?.text || '';
  }

  /**
   * Quick access to schema fields for dropdowns
   */
  getGroupableFields(): SchemaFieldInfo[] {
    return this.schemaFields.filter(f => f.isGroupable && (!f.adminOnly || this.isAdmin));
  }

  getAggregatableFields(): SchemaFieldInfo[] {
    return this.schemaFields.filter(f => f.isAggregatable && (!f.adminOnly || this.isAdmin));
  }

  getAllFields(): SchemaFieldInfo[] {
    return this.schemaFields.filter(f => !f.adminOnly || this.isAdmin);
  }
}

// =============================================================================
// HOOK FOR REACT COMPONENTS
// =============================================================================

/**
 * Factory function to create the service
 * Can be used in React components or called directly
 */
export function createWidgetBuilderService(
  apiKey: string,
  customerId: string,
  isAdmin: boolean = false
): WidgetBuilderService {
  return new WidgetBuilderService(apiKey, customerId, isAdmin);
}

export default WidgetBuilderService;
