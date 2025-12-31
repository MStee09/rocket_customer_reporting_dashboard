import { ToolResult, AIToolContext } from '../types';
import { AIReportDefinition, ReportSection, DateRangeType } from '../../../types/aiReport';
import { executeReportData } from '../../../services/reportDataExecutor';

export async function executeAddReportSection(
  toolCallId: string,
  args: Record<string, unknown>,
  context: AIToolContext
): Promise<ToolResult> {
  const sectionType = args.sectionType as string;
  const title = args.title as string | undefined;
  const config = args.config as Record<string, unknown>;
  const position = args.position as number | undefined;

  if (!context.conversationState.reportInProgress) {
    context.conversationState.reportInProgress = {
      id: crypto.randomUUID(),
      name: 'Untitled Report',
      createdAt: new Date().toISOString(),
      createdBy: 'ai',
      customerId: context.customerId,
      dateRange: { type: 'last90' as DateRangeType },
      sections: []
    };
  }

  const report = context.conversationState.reportInProgress as AIReportDefinition;

  const validation = validateSectionConfig(sectionType, config, context);
  if (!validation.valid) {
    return {
      toolCallId,
      success: false,
      error: `Invalid section configuration: ${validation.errors.join(', ')}`,
      suggestions: validation.suggestions
    };
  }

  const section: ReportSection = {
    type: sectionType as ReportSection['type'],
    config: {
      ...config,
      title: title || config.title
    }
  } as ReportSection;

  if (position !== undefined && position >= 0 && position <= report.sections.length) {
    report.sections.splice(position, 0, section);
  } else {
    report.sections.push(section);
  }

  const fieldsUsed = extractFieldsFromSection(section);
  for (const field of fieldsUsed) {
    if (!context.conversationState.confirmedFields.includes(field)) {
      context.conversationState.confirmedFields.push(field);
    }
  }

  return {
    toolCallId,
    success: true,
    data: {
      sectionIndex: position ?? report.sections.length - 1,
      sectionCount: report.sections.length,
      section: section
    }
  };
}

export async function executeModifyReportSection(
  toolCallId: string,
  args: Record<string, unknown>,
  context: AIToolContext
): Promise<ToolResult> {
  const sectionIndex = args.sectionIndex as number;
  const updates = args.updates as Record<string, unknown>;

  const report = context.conversationState.reportInProgress as AIReportDefinition;

  if (!report || !report.sections || sectionIndex >= report.sections.length) {
    return {
      toolCallId,
      success: false,
      error: `Section ${sectionIndex} does not exist. Report has ${report?.sections?.length || 0} sections.`
    };
  }

  const section = report.sections[sectionIndex];

  const updatedConfig = {
    ...section.config,
    ...updates
  };

  const validation = validateSectionConfig(section.type, updatedConfig, context);
  if (!validation.valid) {
    return {
      toolCallId,
      success: false,
      error: `Invalid update: ${validation.errors.join(', ')}`,
      suggestions: validation.suggestions
    };
  }

  report.sections[sectionIndex] = {
    ...section,
    config: updatedConfig
  } as ReportSection;

  return {
    toolCallId,
    success: true,
    data: {
      sectionIndex,
      updatedSection: report.sections[sectionIndex]
    }
  };
}

export async function executeRemoveReportSection(
  toolCallId: string,
  args: Record<string, unknown>,
  context: AIToolContext
): Promise<ToolResult> {
  const sectionIndex = args.sectionIndex as number;

  const report = context.conversationState.reportInProgress as AIReportDefinition;

  if (!report || !report.sections || sectionIndex >= report.sections.length) {
    return {
      toolCallId,
      success: false,
      error: `Section ${sectionIndex} does not exist.`
    };
  }

  const removed = report.sections.splice(sectionIndex, 1)[0];

  return {
    toolCallId,
    success: true,
    data: {
      removedSection: removed,
      remainingSections: report.sections.length
    }
  };
}

export async function executeSetReportMetadata(
  toolCallId: string,
  args: Record<string, unknown>,
  context: AIToolContext
): Promise<ToolResult> {
  if (!context.conversationState.reportInProgress) {
    context.conversationState.reportInProgress = {
      id: crypto.randomUUID(),
      name: 'Untitled Report',
      createdAt: new Date().toISOString(),
      createdBy: 'ai',
      customerId: context.customerId,
      dateRange: { type: 'last90' as DateRangeType },
      sections: []
    };
  }

  const report = context.conversationState.reportInProgress as AIReportDefinition;

  if (args.name) report.name = args.name as string;
  if (args.description) report.description = args.description as string;
  if (args.theme) report.theme = args.theme as AIReportDefinition['theme'];
  if (args.dateRangeType) report.dateRange = { type: args.dateRangeType as DateRangeType };

  return {
    toolCallId,
    success: true,
    data: {
      name: report.name,
      description: report.description,
      theme: report.theme,
      dateRange: report.dateRange
    }
  };
}

export async function executeValidateReport(
  toolCallId: string,
  args: Record<string, unknown>,
  context: AIToolContext
): Promise<ToolResult> {
  const autoFix = args.autoFix as boolean || false;

  const report = context.conversationState.reportInProgress as AIReportDefinition;

  if (!report) {
    return {
      toolCallId,
      success: false,
      error: 'No report in progress. Use add_report_section first.'
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!report.name || report.name === 'Untitled Report') {
    warnings.push('Report has no custom name');
  }

  if (!report.sections || report.sections.length === 0) {
    errors.push('Report has no sections');
  }

  for (let i = 0; i < (report.sections || []).length; i++) {
    const section = report.sections[i];
    if (!section.type) {
      errors.push(`Section ${i}: missing type`);
    }
    if (!section.config && section.type !== 'header') {
      errors.push(`Section ${i}: missing config`);
    }
  }

  if (errors.length === 0) {
    return {
      toolCallId,
      success: true,
      data: {
        valid: true,
        sectionCount: report.sections.length,
        warnings
      }
    };
  }

  if (autoFix) {
    if (!report.name || report.name === 'Untitled Report') {
      report.name = 'Custom Report';
    }
  }

  return {
    toolCallId,
    success: false,
    error: `Report validation failed: ${errors.join(', ')}`,
    suggestions: ['Fix the errors listed above before finalizing']
  };
}

export async function executePreview(
  toolCallId: string,
  args: Record<string, unknown>,
  context: AIToolContext
): Promise<ToolResult> {
  const sectionIndices = args.sectionIndices as number[] | undefined;

  const report = context.conversationState.reportInProgress as AIReportDefinition;

  if (!report || report.sections.length === 0) {
    return {
      toolCallId,
      success: false,
      error: 'No report sections to preview. Add sections first.'
    };
  }

  try {
    const executedData = await executeReportData(
      report,
      context.customerId,
      context.isAdmin
    );

    let sections = executedData.sections;
    if (sectionIndices) {
      sections = sections.filter(s => sectionIndices.includes(s.sectionIndex));
    }

    return {
      toolCallId,
      success: true,
      data: {
        dateRange: executedData.dateRange,
        executedAt: executedData.executedAt,
        sections: sections.map(s => ({
          index: s.sectionIndex,
          type: report.sections[s.sectionIndex]?.type,
          title: (report.sections[s.sectionIndex]?.config as Record<string, unknown>)?.title,
          hasData: !!s.data && (Array.isArray(s.data) ? s.data.length > 0 : true),
          error: s.error,
          preview: summarizeData(s.data)
        }))
      }
    };
  } catch (error) {
    return {
      toolCallId,
      success: false,
      error: `Preview failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

function validateSectionConfig(
  sectionType: string,
  config: Record<string, unknown>,
  context: AIToolContext
): { valid: boolean; errors: string[]; suggestions?: string[] } {
  const errors: string[] = [];
  const suggestions: string[] = [];

  switch (sectionType) {
    case 'chart':
      if (!config.chartType) errors.push('chartType is required');
      if (!config.groupBy) errors.push('groupBy is required');
      if (!config.metric) errors.push('metric is required');

      if (config.groupBy && !context.schemaFields.find(f => f.name === config.groupBy)) {
        errors.push(`groupBy field "${config.groupBy}" not found`);
        suggestions.push('Use get_schema_info to see available fields');
      }
      break;

    case 'table':
      if (!config.columns || !Array.isArray(config.columns) || config.columns.length === 0) {
        errors.push('columns array is required');
      }
      break;

    case 'hero':
    case 'stat-row':
      if (!config.metric && !config.stats) {
        errors.push('metric or stats configuration is required');
      }
      break;

    case 'header':
      if (!config.title) {
        errors.push('title is required for header sections');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
    suggestions: suggestions.length > 0 ? suggestions : undefined
  };
}

function extractFieldsFromSection(section: ReportSection): string[] {
  const fields: string[] = [];
  const config = section.config as Record<string, unknown>;

  if (config.groupBy) fields.push(config.groupBy as string);
  if ((config.metric as Record<string, unknown>)?.field) {
    fields.push((config.metric as Record<string, unknown>).field as string);
  }
  if (config.columns) {
    for (const col of config.columns as Array<Record<string, unknown>>) {
      if (col.field) fields.push(col.field as string);
    }
  }
  if (config.stats) {
    for (const stat of config.stats as Array<Record<string, unknown>>) {
      if ((stat.metric as Record<string, unknown>)?.field) {
        fields.push((stat.metric as Record<string, unknown>).field as string);
      }
    }
  }

  return fields;
}

function summarizeData(data: unknown): string {
  if (!data) return 'No data';
  if (Array.isArray(data)) {
    if (data.length === 0) return 'Empty array';
    return `${data.length} rows`;
  }
  if (typeof data === 'object') {
    return 'Object with data';
  }
  return String(data);
}
