import { ToolCall, ToolResult, AIToolContext } from '../types';
import { executeExploreField } from './exploreFieldExecutor';
import { executePreviewGrouping } from './previewGroupingExecutor';
import { executeGetSchemaInfo, executeGetFieldRelationships } from './schemaExecutors';
import { executeGetCustomerContext } from './customerContextExecutor';
import { executeSearchKnowledge } from './knowledgeExecutor';
import { executeSuggestVisualization } from './visualizationExecutor';
import {
  executeAddReportSection,
  executeModifyReportSection,
  executeRemoveReportSection,
  executeSetReportMetadata,
  executeValidateReport,
  executePreview
} from './reportExecutors';

export async function executeToolCall(
  toolCall: ToolCall,
  context: AIToolContext
): Promise<ToolResult> {
  const { name, arguments: args, id } = toolCall;

  try {
    switch (name) {
      case 'explore_field':
        return await executeExploreField(id, args, context);

      case 'preview_grouping':
        return await executePreviewGrouping(id, args, context);

      case 'get_schema_info':
        return await executeGetSchemaInfo(id, args, context);

      case 'get_field_relationships':
        return await executeGetFieldRelationships(id, args, context);

      case 'get_customer_context':
        return await executeGetCustomerContext(id, args, context);

      case 'search_knowledge':
        return await executeSearchKnowledge(id, args, context);

      case 'suggest_visualization':
        return await executeSuggestVisualization(id, args, context);

      case 'add_report_section':
        return await executeAddReportSection(id, args, context);

      case 'modify_report_section':
        return await executeModifyReportSection(id, args, context);

      case 'remove_report_section':
        return await executeRemoveReportSection(id, args, context);

      case 'set_report_metadata':
        return await executeSetReportMetadata(id, args, context);

      case 'validate_report':
        return await executeValidateReport(id, args, context);

      case 'execute_preview':
        return await executePreview(id, args, context);

      default:
        return {
          toolCallId: id,
          success: false,
          error: `Unknown tool: ${name}`
        };
    }
  } catch (error) {
    console.error(`Tool execution error (${name}):`, error);
    return {
      toolCallId: id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function executeToolCalls(
  toolCalls: ToolCall[],
  context: AIToolContext
): Promise<ToolResult[]> {
  const results = await Promise.all(
    toolCalls.map(call => executeToolCall(call, context))
  );
  return results;
}
