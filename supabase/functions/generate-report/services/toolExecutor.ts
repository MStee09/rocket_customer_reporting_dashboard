import { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

export interface ToolExecution {
  toolName: string;
  toolInput: Record<string, unknown>;
  result: unknown;
  timestamp: string;
  duration: number;
}

export interface LearningExtraction {
  type: "terminology" | "product" | "preference" | "correction";
  key: string;
  value: string;
  confidence: number;
  mapsToField?: string;
}

interface ReportDraft {
  id: string;
  name: string;
  description?: string;
  theme: string;
  dateRange: { type: string; start?: string; end?: string };
  sections: ReportSection[];
  createdAt: string;
  customerId: string;
}

interface ReportSection {
  type: string;
  title?: string;
  config: Record<string, unknown>;
  insight?: string;
  data?: unknown;
}

export class ToolExecutor {
  private supabase: SupabaseClient;
  private customerId: string;
  private isAdmin: boolean;
  private availableFields: string[];
  private currentReport: ReportDraft | null = null;

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
        // === EXPLORATION TOOLS ===
        case 'explore_field':
          result = await this.exploreField(input);
          break;
        case 'preview_aggregation':
        case 'preview_grouping':
          result = await this.previewAggregation(input);
          break;
        case 'compare_periods':
          result = await this.comparePeriods(input);
          break;
        case 'detect_anomalies':
          result = await this.detectAnomalies(input);
          break;
        case 'investigate_cause':
          result = await this.investigateCause(input);
          break;

        // === REPORT BUILDING TOOLS ===
        case 'create_report_draft':
          result = this.createReportDraft(input);
          break;
        case 'add_section':
          result = await this.addSection(input);
          break;
        case 'modify_section':
          result = this.modifySection(input);
          break;
        case 'remove_section':
          result = this.removeSection(input);
          break;
        case 'reorder_sections':
          result = this.reorderSections(input);
          break;
        case 'preview_report':
          result = await this.previewReport(input);
          break;
        case 'finalize_report':
          result = this.finalizeReport(input);
          break;

        // === LEARNING TOOLS ===
        case 'learn_terminology':
        case 'emit_learning':
          result = await this.learnTerminology(input);
          break;
        case 'learn_preference':
          result = await this.learnPreference(input);
          break;
        case 'record_correction':
          result = await this.recordCorrection(input);
          break;
        case 'get_customer_memory':
          result = await this.getCustomerMemory(input);
          break;

        // === INSIGHT TOOLS ===
        case 'generate_insight':
          result = this.generateInsight(input);
          break;
        case 'generate_recommendation':
          result = this.generateRecommendation(input);
          break;

        // === CLARIFICATION TOOLS ===
        case 'ask_clarification':
          result = {
            question: input.question,
            options: input.options,
            context: input.context,
            default_if_no_response: input.default_if_no_response
          };
          break;
        case 'confirm_understanding':
          result = {
            interpretation: input.interpretation,
            planned_actions: input.planned_actions,
            assumptions: input.assumptions,
            awaiting_confirmation: true
          };
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

  // ==========================================
  // EXPLORATION TOOLS
  // ==========================================

  private async exploreField(input: Record<string, unknown>): Promise<unknown> {
    const fieldName = input.field_name as string;
    const sampleSize = (input.sample_size as number) || 15;
    const includeNulls = input.include_nulls !== false;

    if (!this.availableFields.includes(fieldName)) {
      return {
        error: `Field "${fieldName}" not found`,
        available_fields: this.availableFields.slice(0, 30),
        suggestion: this.findSimilarField(fieldName)
      };
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

      const result = data || { values: [], totalCount: 0, nullCount: 0 };
      const populatedPercent = result.total_count > 0
        ? Math.round((result.populated_count / result.total_count) * 100)
        : 0;

      return {
        ...result,
        data_quality: this.assessDataQuality(populatedPercent, result.unique_count, result.total_count),
        recommendation: this.getFieldRecommendation(fieldName, populatedPercent, result.unique_count)
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Failed to explore field' };
    }
  }

  private async previewAggregation(input: Record<string, unknown>): Promise<unknown> {
    const groupBy = input.group_by as string;
    const metric = input.metric as string;
    const aggregation = input.aggregation as string;
    const secondaryGroupBy = input.secondary_group_by as string | undefined;
    const limit = (input.limit as number) || 15;
    const sort = (input.sort as string) || 'desc';

    if (!this.availableFields.includes(groupBy)) {
      return { error: `Group by field "${groupBy}" not available`, available_fields: this.availableFields.slice(0, 20) };
    }
    if (!this.availableFields.includes(metric)) {
      return { error: `Metric field "${metric}" not available`, available_fields: this.availableFields.slice(0, 20) };
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

      const results = data?.results || [];
      const totalGroups = data?.total_groups || results.length;

      return {
        ...data,
        quality: this.assessGroupingQuality(results, totalGroups),
        visualization_suggestion: this.suggestVisualization(groupBy, metric, aggregation, totalGroups),
        warning: totalGroups > 20 ? `High cardinality (${totalGroups} groups) - consider limiting or filtering` : null
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Failed to preview aggregation' };
    }
  }

  private async comparePeriods(input: Record<string, unknown>): Promise<unknown> {
    const metric = input.metric as string;
    const aggregation = input.aggregation as string;
    const period1 = input.period1 as string;
    const period2 = input.period2 as string;
    const groupBy = input.group_by as string | undefined;

    const { start: start1, end: end1 } = this.parsePeriod(period1);
    const { start: start2, end: end2 } = this.parsePeriod(period2);

    try {
      const { data, error } = await this.supabase.rpc('get_period_comparison', {
        p_customer_id: this.customerId,
        p_start_date: start1,
        p_end_date: end1
      });

      if (error) {
        return { error: error.message };
      }

      const changePercent = data?.spend_change_percent || 0;
      const significance = Math.abs(changePercent) > 20 ? 'significant' :
                          Math.abs(changePercent) > 10 ? 'moderate' : 'minor';

      return {
        period1: { start: start1, end: end1, label: period1 },
        period2: { start: start2, end: end2, label: period2 },
        comparison: data,
        significance,
        insight: this.generateComparisonInsight(data, period1, period2)
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Failed to compare periods' };
    }
  }

  private async detectAnomalies(input: Record<string, unknown>): Promise<unknown> {
    const metric = input.metric as string;
    const groupBy = input.group_by as string | undefined;
    const sensitivity = (input.sensitivity as string) || 'medium';
    const baseline = (input.baseline as string) || 'historical_avg';

    const thresholds = { high: 1.5, medium: 2.0, low: 3.0 };
    const threshold = thresholds[sensitivity as keyof typeof thresholds] || 2.0;

    try {
      const { data: stats, error: statsError } = await this.supabase.rpc('explore_single_field', {
        p_customer_id: parseInt(this.customerId, 10),
        p_field_name: metric,
        p_sample_size: 100
      });

      if (statsError) {
        return { error: statsError.message };
      }

      if (groupBy) {
        const { data: groupData } = await this.supabase.rpc('preview_grouping', {
          p_customer_id: parseInt(this.customerId, 10),
          p_group_by: groupBy,
          p_metric: metric,
          p_aggregation: 'avg',
          p_limit: 50
        });

        const results = groupData?.results || [];
        const values = results.map((r: { value: number }) => r.value);
        const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(values.reduce((sq: number, n: number) => sq + Math.pow(n - mean, 2), 0) / values.length);

        const anomalies = results.filter((r: { value: number }) =>
          Math.abs(r.value - mean) > threshold * stdDev
        ).map((r: { name: string; value: number; count: number }) => ({
          ...r,
          deviation: ((r.value - mean) / stdDev).toFixed(2),
          direction: r.value > mean ? 'high' : 'low'
        }));

        return {
          metric,
          group_by: groupBy,
          baseline_type: baseline,
          sensitivity,
          statistics: { mean: mean.toFixed(2), std_dev: stdDev.toFixed(2), threshold },
          anomalies,
          anomaly_count: anomalies.length,
          insight: anomalies.length > 0
            ? `Found ${anomalies.length} anomalies in ${metric} grouped by ${groupBy}`
            : `No significant anomalies detected in ${metric}`
        };
      }

      return {
        metric,
        baseline_type: baseline,
        sensitivity,
        statistics: stats,
        note: "For time-based anomaly detection, specify a group_by field like 'carrier_name' or 'destination_state'"
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Failed to detect anomalies' };
    }
  }

  private async investigateCause(input: Record<string, unknown>): Promise<unknown> {
    const question = input.question as string;
    const metric = input.metric as string;
    const context = input.context as Record<string, unknown> | undefined;
    const maxDepth = (input.max_depth as number) || 3;

    const drillDownFields = ['carrier_name', 'destination_state', 'origin_state', 'mode_name'];
    const findings: Array<{ dimension: string; insights: unknown }> = [];

    try {
      for (const field of drillDownFields.slice(0, maxDepth)) {
        const { data } = await this.supabase.rpc('preview_grouping', {
          p_customer_id: parseInt(this.customerId, 10),
          p_group_by: field,
          p_metric: metric,
          p_aggregation: 'sum',
          p_limit: 5
        });

        if (data?.results?.length > 0) {
          const results = data.results;
          const total = results.reduce((sum: number, r: { value: number }) => sum + r.value, 0);
          const topContributor = results[0];
          const concentration = (topContributor.value / total * 100).toFixed(1);

          findings.push({
            dimension: field,
            insights: {
              top_contributor: topContributor.name,
              top_value: topContributor.value,
              concentration_percent: concentration,
              distribution: results.slice(0, 3).map((r: { name: string; value: number }) => ({
                name: r.name,
                percent: (r.value / total * 100).toFixed(1)
              }))
            }
          });
        }
      }

      return {
        question,
        metric,
        investigation_depth: maxDepth,
        findings,
        summary: this.summarizeInvestigation(findings, question),
        suggested_actions: this.suggestActionsFromFindings(findings)
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Failed to investigate cause' };
    }
  }

  // ==========================================
  // REPORT BUILDING TOOLS
  // ==========================================

  private createReportDraft(input: Record<string, unknown>): unknown {
    const name = input.name as string;
    const description = input.description as string | undefined;
    const theme = (input.theme as string) || 'blue';
    const dateRange = (input.date_range as string) || 'last90';

    this.currentReport = {
      id: crypto.randomUUID(),
      name,
      description,
      theme,
      dateRange: { type: dateRange },
      sections: [],
      createdAt: new Date().toISOString(),
      customerId: this.customerId
    };

    return {
      success: true,
      report_id: this.currentReport.id,
      name,
      theme,
      date_range: dateRange,
      sections_count: 0,
      message: `Draft created. Use add_section to build the report incrementally.`
    };
  }

  private async addSection(input: Record<string, unknown>): Promise<unknown> {
    if (!this.currentReport) {
      this.createReportDraft({ name: 'Generated Report' });
    }

    const sectionType = input.section_type as string;
    const title = input.title as string | undefined;
    const config = input.config as Record<string, unknown>;
    const position = input.position as number | undefined;
    const generateInsight = input.generate_insight !== false;

    const section: ReportSection = {
      type: sectionType,
      title,
      config
    };

    if (config.groupBy && config.metric) {
      try {
        const { data } = await this.supabase.rpc('preview_grouping', {
          p_customer_id: parseInt(this.customerId, 10),
          p_group_by: config.groupBy as string,
          p_metric: (config.metric as { field: string }).field || config.metric as string,
          p_aggregation: (config.metric as { aggregation: string })?.aggregation || 'sum',
          p_limit: (config.limit as number) || 10
        });
        section.data = data;

        if (generateInsight && data?.results) {
          section.insight = this.generateSectionInsight(sectionType, data.results, title);
        }
      } catch {
        // Preview failed, section will render without data
      }
    }

    if (position !== undefined && position >= 0 && position < this.currentReport!.sections.length) {
      this.currentReport!.sections.splice(position, 0, section);
    } else {
      this.currentReport!.sections.push(section);
    }

    const previewSummary = section.data ? {
      rows: Array.isArray((section.data as any).results) ? (section.data as any).results.length : 0,
      top_value: Array.isArray((section.data as any).results) && (section.data as any).results[0]
        ? `${(section.data as any).results[0].name}: ${(section.data as any).results[0].value}`
        : null
    } : null;

    return {
      success: true,
      section_index: this.currentReport!.sections.length - 1,
      type: sectionType,
      title,
      has_data: !!section.data,
      preview_summary: previewSummary,
      insight: section.insight,
      total_sections: this.currentReport!.sections.length
    };
  }

  private modifySection(input: Record<string, unknown>): unknown {
    if (!this.currentReport) {
      return { error: 'No report draft exists. Call create_report_draft first.' };
    }

    const sectionIndex = input.section_index as number;
    const updates = input.updates as Record<string, unknown>;

    if (sectionIndex < 0 || sectionIndex >= this.currentReport.sections.length) {
      return { error: `Invalid section index. Report has ${this.currentReport.sections.length} sections.` };
    }

    const section = this.currentReport.sections[sectionIndex];
    Object.assign(section, updates);

    return {
      success: true,
      section_index: sectionIndex,
      updated_section: section
    };
  }

  private removeSection(input: Record<string, unknown>): unknown {
    if (!this.currentReport) {
      return { error: 'No report draft exists.' };
    }

    const sectionIndex = input.section_index as number;

    if (sectionIndex < 0 || sectionIndex >= this.currentReport.sections.length) {
      return { error: `Invalid section index. Report has ${this.currentReport.sections.length} sections.` };
    }

    const removed = this.currentReport.sections.splice(sectionIndex, 1)[0];

    return {
      success: true,
      removed_section: removed,
      remaining_sections: this.currentReport.sections.length
    };
  }

  private reorderSections(input: Record<string, unknown>): unknown {
    if (!this.currentReport) {
      return { error: 'No report draft exists.' };
    }

    const newOrder = input.new_order as number[];

    if (newOrder.length !== this.currentReport.sections.length) {
      return { error: 'New order must include all section indices.' };
    }

    const reordered = newOrder.map(i => this.currentReport!.sections[i]);
    this.currentReport.sections = reordered;

    return {
      success: true,
      new_order: newOrder,
      sections: reordered.map((s, i) => ({ index: i, type: s.type, title: s.title }))
    };
  }

  private async previewReport(input: Record<string, unknown>): Promise<unknown> {
    if (!this.currentReport) {
      return { error: 'No report draft exists.' };
    }

    const includeInsights = input.include_insights !== false;
    const includeNarrative = input.include_narrative === true;

    for (const section of this.currentReport.sections) {
      if (section.config?.groupBy && section.config?.metric) {
        try {
          const { data } = await this.supabase.rpc('preview_grouping', {
            p_customer_id: parseInt(this.customerId, 10),
            p_group_by: section.config.groupBy as string,
            p_metric: (section.config.metric as { field: string }).field,
            p_aggregation: (section.config.metric as { aggregation: string })?.aggregation || 'sum',
            p_limit: (section.config.limit as number) || 10
          });
          section.data = data;

          if (includeInsights) {
            section.insight = this.generateSectionInsight(section.type, data?.results, section.title);
          }
        } catch {
          // Continue with other sections
        }
      }
    }

    const sectionsSummary = this.currentReport.sections.map((s, i) => ({
      index: i,
      type: s.type,
      title: s.title,
      has_data: !!s.data,
      insight: s.insight
    }));

    return {
      report_name: this.currentReport.name,
      theme: this.currentReport.theme,
      sections_with_data: this.currentReport.sections.filter(s => s.data).length,
      total_sections: this.currentReport.sections.length,
      sections: sectionsSummary,
      narrative: includeNarrative ? this.generateReportNarrative() : undefined,
      ready_to_finalize: true
    };
  }

  private finalizeReport(input: Record<string, unknown>): unknown {
    let report = input.report as Record<string, unknown> | undefined;
    const summary = input.summary as string;

    if (!report && this.currentReport) {
      report = this.currentReport as unknown as Record<string, unknown>;
    }

    if (!report) {
      return { error: 'No report provided and no draft exists.' };
    }

    if (!report.name) report.name = 'Generated Report';
    if (!report.id) report.id = crypto.randomUUID();
    if (!report.createdAt) report.createdAt = new Date().toISOString();
    report.customerId = this.customerId;

    const validation = this.validateReport(report);

    return {
      report,
      summary,
      validation,
      ready_to_save: validation.valid
    };
  }

  // ==========================================
  // LEARNING TOOLS
  // ==========================================

  private async learnTerminology(input: Record<string, unknown>): Promise<unknown> {
    const term = (input.term || input.key) as string;
    const meaning = (input.meaning || input.value) as string;
    const mapsToField = (input.maps_to_field || input.mapsToField) as string | undefined;
    const mapsToFilter = input.maps_to_filter as Record<string, unknown> | undefined;
    const confidence = (input.confidence as string) || 'medium';

    const confidenceScore = confidence === 'high' ? 0.9 : confidence === 'low' ? 0.5 : 0.7;
    const key = term.toLowerCase().replace(/[^a-z0-9]+/g, '_');

    try {
      const { error } = await this.supabase.from('ai_knowledge').upsert({
        knowledge_type: 'term',
        key,
        label: term,
        definition: meaning,
        scope: 'customer',
        customer_id: this.customerId,
        source: 'learned',
        confidence: confidenceScore,
        needs_review: confidenceScore < 0.8,
        is_active: confidenceScore >= 0.8,
        metadata: {
          maps_to_field: mapsToField,
          maps_to_filter: mapsToFilter
        }
      }, { onConflict: 'knowledge_type,key,scope,customer_id' });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        term,
        meaning,
        confidence,
        will_remember: confidenceScore >= 0.8,
        needs_review: confidenceScore < 0.8
      };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to save terminology' };
    }
  }

  private async learnPreference(input: Record<string, unknown>): Promise<unknown> {
    const preferenceType = input.preference_type as string;
    const key = input.key as string;
    const value = input.value as string;
    const context = input.context as string | undefined;

    const prefKey = `${preferenceType}:${key}`.toLowerCase().replace(/[^a-z0-9:]+/g, '_');

    try {
      const { error } = await this.supabase.from('ai_knowledge').upsert({
        knowledge_type: 'preference',
        key: prefKey,
        label: `${preferenceType}: ${key}`,
        definition: value,
        scope: 'customer',
        customer_id: this.customerId,
        source: 'learned',
        confidence: 0.8,
        is_active: true,
        metadata: { preference_type: preferenceType, context }
      }, { onConflict: 'knowledge_type,key,scope,customer_id' });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, preference_type: preferenceType, key, value, context };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to save preference' };
    }
  }

  private async recordCorrection(input: Record<string, unknown>): Promise<unknown> {
    const original = input.original as string;
    const corrected = input.corrected as string;
    const context = input.context as string;
    const applyImmediately = input.apply_immediately !== false;

    try {
      const { error } = await this.supabase.from('ai_knowledge').insert({
        knowledge_type: 'correction',
        key: `correction_${Date.now()}`,
        label: `Correction: ${original.substring(0, 50)}`,
        definition: corrected,
        scope: 'customer',
        customer_id: this.customerId,
        source: 'correction',
        confidence: 1.0,
        needs_review: true,
        is_active: false,
        metadata: { original, corrected, context, recorded_at: new Date().toISOString() }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        original,
        corrected,
        applied: applyImmediately,
        message: 'Correction recorded for review'
      };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to record correction' };
    }
  }

  private async getCustomerMemory(input: Record<string, unknown>): Promise<unknown> {
    const includeTerminology = input.include_terminology !== false;
    const includePreferences = input.include_preferences !== false;
    const includeHistory = input.include_history === true;

    try {
      const { data, error } = await this.supabase.rpc('get_customer_knowledge', {
        p_customer_id: this.customerId
      });

      if (error) {
        return { error: error.message };
      }

      const memory: Record<string, unknown> = {};

      if (includeTerminology) {
        memory.terminology = (data || []).filter((k: { knowledge_type: string }) => k.knowledge_type === 'term');
      }
      if (includePreferences) {
        memory.preferences = (data || []).filter((k: { knowledge_type: string }) => k.knowledge_type === 'preference');
      }
      if (includeHistory) {
        memory.corrections = (data || []).filter((k: { knowledge_type: string }) => k.knowledge_type === 'correction');
      }

      return {
        customer_id: this.customerId,
        memory,
        total_items: (data || []).length
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Failed to get customer memory' };
    }
  }

  // ==========================================
  // INSIGHT TOOLS
  // ==========================================

  private generateInsight(input: Record<string, unknown>): unknown {
    const data = input.data as Record<string, unknown>;
    const context = input.context as string;
    const comparisonType = input.comparison_type as string | undefined;
    const audience = (input.audience as string) || 'analyst';

    const insight = this.buildInsightText(data, context, comparisonType, audience);

    return {
      insight,
      context,
      audience,
      comparison_type: comparisonType,
      generated_at: new Date().toISOString()
    };
  }

  private generateRecommendation(input: Record<string, unknown>): unknown {
    const finding = input.finding as string;
    const dataSupport = input.data_support as Record<string, unknown>;
    const actionType = input.action_type as string;
    const urgency = (input.urgency as string) || 'this_month';

    const urgencyLabels = {
      immediate: '🔴 Immediate Action Required',
      this_week: '🟠 Address This Week',
      this_month: '🟡 Review This Month',
      next_quarter: '🟢 Plan for Next Quarter'
    };

    const actionVerbs = {
      negotiate: 'Negotiate',
      investigate: 'Investigate',
      monitor: 'Monitor',
      change: 'Implement change to',
      escalate: 'Escalate'
    };

    return {
      finding,
      recommendation: `${actionVerbs[actionType as keyof typeof actionVerbs] || 'Review'}: ${finding}`,
      action_type: actionType,
      urgency,
      urgency_label: urgencyLabels[urgency as keyof typeof urgencyLabels] || urgency,
      data_support: dataSupport,
      generated_at: new Date().toISOString()
    };
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private validateReport(report: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!report.name) errors.push('Report must have a name');
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

  private findSimilarField(fieldName: string): string | null {
    const normalized = fieldName.toLowerCase().replace(/[_-]/g, '');
    for (const field of this.availableFields) {
      if (field.toLowerCase().replace(/[_-]/g, '').includes(normalized) ||
          normalized.includes(field.toLowerCase().replace(/[_-]/g, ''))) {
        return field;
      }
    }
    return null;
  }

  private assessDataQuality(populatedPercent: number, uniqueCount: number, totalCount: number): string {
    if (populatedPercent >= 95) return 'excellent';
    if (populatedPercent >= 80) return 'good';
    if (populatedPercent >= 50) return 'moderate';
    return 'poor';
  }

  private getFieldRecommendation(fieldName: string, populatedPercent: number, uniqueCount: number): string {
    if (populatedPercent < 50) {
      return `Low coverage (${populatedPercent}%) - consider using a different field for reliable analysis`;
    }
    if (uniqueCount === 1) {
      return 'Single value - not useful for grouping or comparison';
    }
    if (uniqueCount > 100) {
      return 'High cardinality - consider aggregating or filtering before use';
    }
    return 'Good for analysis';
  }

  private assessGroupingQuality(results: unknown[], totalGroups: number): string {
    if (results.length === 0) return 'no_data';
    if (totalGroups <= 5) return 'excellent';
    if (totalGroups <= 15) return 'good';
    if (totalGroups <= 50) return 'moderate';
    return 'high_cardinality';
  }

  private suggestVisualization(groupBy: string, metric: string, aggregation: string, totalGroups: number): string {
    if (totalGroups <= 5) return 'pie or donut chart';
    if (totalGroups <= 10) return 'bar chart';
    if (totalGroups <= 20) return 'horizontal bar chart';
    return 'table or filtered chart';
  }

  private parsePeriod(period: string): { start: string; end: string } {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start: Date;

    switch (period) {
      case 'last7':
        start = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'last30':
        start = new Date(now.setDate(now.getDate() - 30));
        break;
      case 'last90':
        start = new Date(now.setDate(now.getDate() - 90));
        break;
      default:
        start = new Date(now.setDate(now.getDate() - 30));
    }

    return { start: start.toISOString().split('T')[0], end };
  }

  private generateComparisonInsight(data: Record<string, unknown>, period1: string, period2: string): string {
    const spendChange = data?.spend_change_percent as number || 0;
    const volumeChange = data?.volume_change_percent as number || 0;

    if (Math.abs(spendChange) < 5 && Math.abs(volumeChange) < 5) {
      return `Stable performance between ${period1} and ${period2}`;
    }

    const spendDirection = spendChange > 0 ? 'increased' : 'decreased';
    const volumeDirection = volumeChange > 0 ? 'increased' : 'decreased';

    return `Spend ${spendDirection} ${Math.abs(spendChange).toFixed(1)}% while volume ${volumeDirection} ${Math.abs(volumeChange).toFixed(1)}%`;
  }

  private summarizeInvestigation(findings: Array<{ dimension: string; insights: unknown }>, question: string): string {
    if (findings.length === 0) return 'No significant patterns found';

    const topFinding = findings[0];
    const insights = topFinding.insights as Record<string, unknown>;

    return `Primary driver: ${topFinding.dimension} - ${insights.top_contributor} accounts for ${insights.concentration_percent}% of the total`;
  }

  private suggestActionsFromFindings(findings: Array<{ dimension: string; insights: unknown }>): string[] {
    const actions: string[] = [];

    for (const finding of findings) {
      const insights = finding.insights as Record<string, unknown>;
      const concentration = parseFloat(insights.concentration_percent as string);

      if (concentration > 50) {
        actions.push(`Review concentration risk in ${finding.dimension} (${insights.top_contributor}: ${concentration}%)`);
      }
    }

    if (actions.length === 0) {
      actions.push('No immediate actions required - distribution appears healthy');
    }

    return actions;
  }

  private generateSectionInsight(sectionType: string, data: unknown[], title?: string): string {
    if (!data || data.length === 0) return '';

    const total = data.reduce((sum: number, r: { value?: number }) => sum + (r.value || 0), 0);
    const top = data[0] as { name: string; value: number };
    const topPercent = total > 0 ? (top.value / total * 100).toFixed(1) : '0';

    return `${top.name} leads with ${topPercent}% of ${title || 'total'}`;
  }

  private generateReportNarrative(): string {
    if (!this.currentReport || this.currentReport.sections.length === 0) {
      return 'Report is empty';
    }

    return `This ${this.currentReport.name} contains ${this.currentReport.sections.length} sections analyzing your shipping data.`;
  }

  private buildInsightText(data: Record<string, unknown>, context: string, comparisonType?: string, audience?: string): string {
    const style = audience === 'executive' ? 'high-level' : 'detailed';
    return `Analysis of ${context}: ${JSON.stringify(data).substring(0, 200)}...`;
  }
}
