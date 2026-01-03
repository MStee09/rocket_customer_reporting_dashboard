import { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

export interface ToolExecution {
  toolName: string;
  toolInput: Record<string, unknown>;
  result: unknown;
  timestamp: string;
  duration: number;
}

export interface LearningExtraction {
  type: "terminology" | "product" | "preference";
  key: string;
  value: string;
  confidence: number;
  mapsToField?: string;
}

export class ToolExecutor {
  private supabase: SupabaseClient;
  private customerId: string;
  private isAdmin: boolean;
  private availableFields: string[];

  constructor(
    supabase: SupabaseClient,
    customerId: string,
    isAdmin: boolean,
    availableFields: string[]
  ) {
    this.supabase = supabase;
    this.customerId = customerId;
    this.isAdmin = isAdmin;
    this.availableFields = availableFields;
  }

  async execute(toolName: string, input: Record<string, unknown>): Promise<ToolExecution> {
    const startTime = Date.now();
    let result: unknown;

    try {
      switch (toolName) {
        case 'explore_field':
          result = await this.exploreField(input);
          break;
        case 'preview_grouping':
          result = await this.previewGrouping(input);
          break;
        case 'emit_learning':
          result = await this.emitLearning(input);
          break;
        case 'finalize_report':
          result = this.finalizeReport(input);
          break;
        case 'ask_clarification':
          result = { question: input.question, options: input.options };
          break;
        default:
          result = { error: `Unknown tool: ${toolName}` };
      }
    } catch (e) {
      result = { error: e instanceof Error ? e.message : 'Tool execution failed' };
    }

    return {
      toolName,
      toolInput: input,
      result,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime
    };
  }

  private async exploreField(input: Record<string, unknown>): Promise<unknown> {
    const fieldName = input.field_name as string;
    const sampleSize = (input.sample_size as number) || 10;

    if (!this.availableFields.includes(fieldName)) {
      return { error: `Field "${fieldName}" is not available. Available fields: ${this.availableFields.slice(0, 20).join(', ')}...` };
    }

    try {
      const { data, error } = await this.supabase.rpc('explore_single_field', {
        p_customer_id: parseInt(this.customerId, 10),
        p_field_name: fieldName,
        p_sample_size: sampleSize
      });

      if (error) {
        return { error: error.message };
      }

      return data || { values: [], totalCount: 0, nullCount: 0 };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Failed to explore field' };
    }
  }

  private async previewGrouping(input: Record<string, unknown>): Promise<unknown> {
    const groupBy = input.group_by as string;
    const metric = input.metric as string;
    const aggregation = input.aggregation as string;
    const limit = (input.limit as number) || 10;

    if (!this.availableFields.includes(groupBy)) {
      return { error: `Group by field "${groupBy}" is not available` };
    }

    if (!this.availableFields.includes(metric)) {
      return { error: `Metric field "${metric}" is not available` };
    }

    try {
      const { data, error } = await this.supabase.rpc('preview_grouping', {
        p_customer_id: parseInt(this.customerId, 10),
        p_group_by: groupBy,
        p_metric: metric,
        p_aggregation: aggregation,
        p_limit: limit
      });

      if (error) {
        return { error: error.message };
      }

      return data || { groups: [], total: 0 };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Failed to preview grouping' };
    }
  }

  private async emitLearning(input: Record<string, unknown>): Promise<unknown> {
    const learningType = input.learning_type as string;
    const key = input.key as string;
    const value = input.value as string;
    const confidence = input.confidence as string;
    const mapsToField = input.maps_to_field as string | undefined;

    const confidenceScore = confidence === 'high' ? 0.9 : confidence === 'low' ? 0.5 : 0.7;

    const learning: LearningExtraction = {
      type: learningType as 'terminology' | 'product' | 'preference',
      key: key.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      value,
      confidence: confidenceScore,
      mapsToField
    };

    try {
      await this.supabase.from('ai_knowledge').upsert({
        knowledge_type: learningType === 'terminology' ? 'term' : learningType,
        key: learning.key,
        label: key,
        definition: value,
        scope: 'customer',
        customer_id: this.customerId,
        source: 'learned',
        confidence: confidenceScore,
        needs_review: confidenceScore < 0.8,
        is_active: confidenceScore >= 0.8,
        metadata: mapsToField ? { maps_to_field: mapsToField } : null
      }, { onConflict: 'knowledge_type,key,scope,customer_id' });

      return { success: true, learning };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to save learning', learning };
    }
  }

  private finalizeReport(input: Record<string, unknown>): unknown {
    const report = input.report as Record<string, unknown>;
    const summary = input.summary as string;

    if (!report) {
      return { error: 'No report provided' };
    }

    if (!report.name) {
      report.name = 'Generated Report';
    }

    if (!report.id) {
      report.id = crypto.randomUUID();
    }

    if (!report.createdAt) {
      report.createdAt = new Date().toISOString();
    }

    report.customerId = this.customerId;

    const validation = this.validateReport(report);

    return {
      report,
      summary,
      validation
    };
  }

  private validateReport(report: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!report.name) {
      errors.push('Report must have a name');
    }

    if (!report.sections || !Array.isArray(report.sections)) {
      errors.push('Report must have a sections array');
    } else {
      const validTypes = ['hero', 'stat-row', 'category-grid', 'chart', 'table', 'header', 'map'];
      for (let i = 0; i < (report.sections as unknown[]).length; i++) {
        const section = (report.sections as Record<string, unknown>[])[i];
        if (!section.type || !validTypes.includes(section.type as string)) {
          errors.push(`Section ${i + 1}: Invalid or missing type`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}