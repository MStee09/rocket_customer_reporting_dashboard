/**
 * TOOL EXECUTOR SERVICE
 * Handles AI tool execution with timeout protection
 */

import { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { isRestrictedField, findRestrictedFieldsInString } from './restrictedFields.ts';

export interface ToolExecution {
  toolName: string;
  toolInput: Record<string, unknown>;
  result: unknown;
  timestamp: string;
  duration: number;
}

export interface LearningExtraction {
  type: 'terminology' | 'product' | 'preference' | 'correction';
  key: string;
  value: string;
  confidence: number;
  source: 'explicit' | 'inferred' | 'tool';
}

export interface FinalizedReport {
  report: Record<string, unknown>;
  summary: string;
  validation: { valid: boolean; errors: string[] };
}

export class ToolExecutor {
  private supabase: SupabaseClient;
  private customerId: string;
  private isAdmin: boolean;
  private availableFields: string[];
  private timeoutMs: number;

  constructor(
    supabase: SupabaseClient,
    customerId: string,
    isAdmin: boolean,
    availableFields: string[],
    timeoutMs: number = 10000
  ) {
    this.supabase = supabase;
    this.customerId = customerId;
    this.isAdmin = isAdmin;
    this.availableFields = availableFields;
    this.timeoutMs = timeoutMs;
  }

  async execute(toolName: string, toolInput: Record<string, unknown>): Promise<ToolExecution> {
    const startTime = Date.now();

    try {
      const result = await this.executeWithTimeout(toolName, toolInput);
      return {
        toolName,
        toolInput,
        result,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        toolName,
        toolInput,
        result: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      };
    }
  }

  private async executeWithTimeout(toolName: string, toolInput: Record<string, unknown>): Promise<unknown> {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Tool '${toolName}' timed out`)), this.timeoutMs);
    });

    const executionPromise = this.executeToolInternal(toolName, toolInput);
    return Promise.race([executionPromise, timeoutPromise]);
  }

  private async executeToolInternal(toolName: string, toolInput: Record<string, unknown>): Promise<unknown> {
    switch (toolName) {
      case 'explore_field':
        return this.exploreField(toolInput as { field_name: string; sample_size?: number });
      case 'preview_grouping':
        return this.previewGrouping(toolInput as { group_by: string; metric: string; aggregation: string; limit?: number });
      case 'emit_learning':
        return this.emitLearning(toolInput as { learning_type: string; key: string; value: string; confidence: string; maps_to_field?: string });
      case 'finalize_report':
        return this.finalizeReport(toolInput as { report: unknown; summary: string });
      case 'ask_clarification':
        return { needsClarification: true, ...(toolInput as { question: string; options?: string[] }) };
      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  }

  private async exploreField(input: { field_name: string; sample_size?: number }): Promise<unknown> {
    const { field_name, sample_size = 10 } = input;

    if (!this.isAdmin && isRestrictedField(field_name)) {
      return { error: `Field '${field_name}' is not available` };
    }

    try {
      const { data, error } = await this.supabase.rpc('explore_single_field', {
        p_customer_id: this.customerId,
        p_field_name: field_name,
        p_sample_size: sample_size,
      });
      if (error) return { error: error.message };
      return data || { error: 'No data returned' };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  private async previewGrouping(input: { group_by: string; metric: string; aggregation: string; limit?: number }): Promise<unknown> {
    const { group_by, metric, aggregation, limit = 15 } = input;

    if (!this.isAdmin && (isRestrictedField(group_by) || isRestrictedField(metric))) {
      return { error: 'One or more requested fields are not available' };
    }

    try {
      const { data, error } = await this.supabase.rpc('preview_grouping', {
        p_customer_id: this.customerId,
        p_group_by: group_by,
        p_metric: metric,
        p_aggregation: aggregation,
        p_limit: limit,
      });

      if (error) return { error: error.message };

      const totalGroups = data?.total_groups || 0;
      let quality = 'good';
      let warning = null;

      if (totalGroups === 0) {
        quality = 'empty';
        warning = 'No data found for this grouping';
      } else if (totalGroups > 50) {
        quality = 'many_groups';
        warning = `This grouping has ${totalGroups} unique values - consider using top N limit`;
      } else if (totalGroups === 1) {
        quality = 'single_group';
        warning = "Only one group found - might not make a useful chart";
      }

      return { ...data, quality, warning };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  private async emitLearning(input: { learning_type: string; key: string; value: string; confidence: string; maps_to_field?: string }): Promise<{ success: boolean; learning: LearningExtraction }> {
    const confidenceMap: Record<string, number> = { high: 0.9, medium: 0.7, low: 0.5 };

    const learning: LearningExtraction = {
      type: input.learning_type as LearningExtraction['type'],
      key: input.key.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
      value: input.value,
      confidence: confidenceMap[input.confidence] || 0.7,
      source: 'tool',
    };

    try {
      await this.supabase.from('ai_knowledge').upsert({
        knowledge_type: learning.type === 'terminology' ? 'term' : learning.type,
        key: learning.key,
        label: input.key,
        definition: learning.value,
        scope: 'customer',
        customer_id: this.customerId,
        source: 'learned',
        confidence: learning.confidence,
        needs_review: learning.confidence < 0.8,
        is_active: learning.confidence >= 0.8,
        metadata: input.maps_to_field ? { maps_to_field: input.maps_to_field } : null,
      }, { onConflict: 'knowledge_type,key,scope,customer_id' });
    } catch (e) {
      console.error('Failed to save learning:', e);
    }

    return { success: true, learning };
  }

  private finalizeReport(input: { report: unknown; summary: string }): FinalizedReport {
    const report = input.report as Record<string, unknown>;
    const errors: string[] = [];

    if (!report.name) errors.push('Report must have a name');
    if (!report.sections || !Array.isArray(report.sections)) {
      errors.push('Report must have a sections array');
    }

    if (!report.id) report.id = crypto.randomUUID();
    if (!report.createdAt) report.createdAt = new Date().toISOString();
    if (!report.dateRange) report.dateRange = { type: 'last90' };
    report.customerId = this.customerId;

    const sections = (report.sections as unknown[]) || [];
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i] as Record<string, unknown>;
      const config = section.config as Record<string, unknown> | undefined;

      if (config) {
        const groupBy = config.groupBy as string | undefined;
        if (groupBy && !this.availableFields.includes(groupBy.toLowerCase())) {
          errors.push(`Section ${i + 1}: Unknown field "${groupBy}"`);
        }

        const metric = config.metric as Record<string, unknown> | undefined;
        if (metric?.field && !this.availableFields.includes((metric.field as string).toLowerCase())) {
          errors.push(`Section ${i + 1}: Unknown metric field "${metric.field}"`);
        }
      }
    }

    if (!this.isAdmin) {
      const reportStr = JSON.stringify(report).toLowerCase();
      const restrictedFound = findRestrictedFieldsInString(reportStr);
      for (const field of restrictedFound) {
        errors.push(`Report contains restricted field: ${field}`);
      }
    }

    return { report, summary: input.summary, validation: { valid: errors.length === 0, errors } };
  }
}