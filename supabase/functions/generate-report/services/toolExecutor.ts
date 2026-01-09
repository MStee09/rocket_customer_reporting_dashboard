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

interface ToolResult {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

export class ToolExecutor {
  private supabase: SupabaseClient;
  private customerId: string;
  private isAdmin: boolean;
  private currentReport: ReportDraft | null = null;

  constructor(supabase: SupabaseClient, customerId: string, isAdmin: boolean) {
    this.supabase = supabase;
    this.customerId = customerId;
    this.isAdmin = isAdmin;
  }

  getCurrentReport(): Record<string, unknown> | null {
    return this.currentReport as Record<string, unknown> | null;
  }

  private requireString(input: Record<string, unknown>, key: string): string {
    const value = input[key];
    if (typeof value !== 'string' || value.trim() === '') throw new Error(`${key} is required`);
    return value.trim();
  }

  private optionalString(input: Record<string, unknown>, key: string, defaultValue?: string): string | undefined {
    const value = input[key];
    if (value === undefined || value === null) return defaultValue;
    if (typeof value !== 'string') throw new Error(`${key} must be a string`);
    return value;
  }

  private optionalNumber(input: Record<string, unknown>, key: string, defaultValue: number): number {
    const value = input[key];
    if (value === undefined || value === null) return defaultValue;
    if (typeof value !== 'number') throw new Error(`${key} must be a number`);
    return value;
  }

  private optionalBoolean(input: Record<string, unknown>, key: string, defaultValue: boolean): boolean {
    const value = input[key];
    if (value === undefined || value === null) return defaultValue;
    if (typeof value !== 'boolean') throw new Error(`${key} must be a boolean`);
    return value;
  }

  private optionalArray<T>(input: Record<string, unknown>, key: string, defaultValue: T[] | null = null): T[] | null {
    const value = input[key];
    if (value === undefined || value === null) return defaultValue;
    if (!Array.isArray(value)) throw new Error(`${key} must be an array`);
    return value as T[];
  }

  async execute(toolName: string, input: Record<string, unknown>): Promise<ToolExecution> {
    const startTime = Date.now();
    let result: ToolResult;

    try {
      switch (toolName) {
        case 'discover_tables': result = await this.discoverTables(input); break;
        case 'discover_fields': result = await this.discoverFields(input); break;
        case 'discover_joins': result = await this.discoverJoins(input); break;
        case 'query_table': result = await this.queryTable(input); break;
        case 'search_text': result = await this.searchText(input); break;
        case 'query_with_join': result = await this.queryWithJoin(input); break;
        case 'aggregate': result = await this.aggregate(input); break;
        case 'explore_field': result = await this.exploreField(input); break;
        case 'preview_aggregation':
        case 'preview_grouping': result = await this.previewAggregation(input); break;
        case 'compare_periods': result = await this.comparePeriods(input); break;
        case 'detect_anomalies': result = await this.detectAnomalies(input); break;
        case 'investigate_cause': result = await this.investigateCause(input); break;
        case 'create_report_draft': result = this.createReportDraft(input); break;
        case 'add_section': result = await this.addSection(input); break;
        case 'modify_section': result = this.modifySection(input); break;
        case 'remove_section': result = this.removeSection(input); break;
        case 'reorder_sections': result = this.reorderSections(input); break;
        case 'preview_report': result = await this.previewReport(input); break;
        case 'finalize_report': result = this.finalizeReport(input); break;
        case 'learn_terminology':
        case 'emit_learning': result = await this.learnTerminology(input); break;
        case 'learn_preference': result = await this.learnPreference(input); break;
        case 'record_correction': result = await this.recordCorrection(input); break;
        case 'get_customer_memory': result = await this.getCustomerMemory(input); break;
        case 'generate_insight': result = await this.generateInsight(input); break;
        case 'generate_recommendation': result = await this.generateRecommendation(input); break;
        case 'generate_section_insight': result = await this.generateSectionInsightWithHaiku(input); break;
        case 'ask_clarification': result = { success: true, question: input.question, options: input.options, context: input.context }; break;
        case 'confirm_understanding': result = { success: true, interpretation: input.interpretation, planned_actions: input.planned_actions, assumptions: input.assumptions, awaiting_confirmation: true }; break;
        default: result = { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (e) {
      result = { success: false, error: e instanceof Error ? e.message : 'Tool execution failed' };
    }

    return { toolName, toolInput: input, result, timestamp: new Date().toISOString(), duration: Date.now() - startTime };
  }

  private async discoverTables(input: Record<string, unknown>): Promise<ToolResult> {
    try {
      const { data, error } = await this.supabase.rpc('mcp_get_tables', {
        p_category: this.optionalString(input, 'category') || null,
        p_include_row_counts: this.optionalBoolean(input, 'include_row_counts', false)
      });
      if (error) return { success: false, error: error.message };
      return { success: true, tables: data || [], count: data?.length || 0, hint: "Use discover_fields(table_name) to see fields" };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Failed' }; }
  }

  private async discoverFields(input: Record<string, unknown>): Promise<ToolResult> {
    const tableName = this.requireString(input, 'table_name');
    try {
      const { data, error } = await this.supabase.rpc('mcp_get_fields', {
        p_table_name: tableName,
        p_include_samples: this.optionalBoolean(input, 'include_samples', true),
        p_admin_mode: this.isAdmin
      });
      if (error) return { success: false, error: error.message };
      const fields = data || [];
      return {
        success: true, table_name: tableName, field_count: fields.length, fields,
        summary: {
          groupable_fields: fields.filter((f: { is_groupable: boolean }) => f.is_groupable).map((f: { field_name: string }) => f.field_name),
          aggregatable_fields: fields.filter((f: { is_aggregatable: boolean }) => f.is_aggregatable).map((f: { field_name: string }) => f.field_name),
          searchable_fields: fields.filter((f: { is_searchable: boolean }) => f.is_searchable).map((f: { field_name: string }) => f.field_name)
        },
        hint: "Use query_table() to query this table"
      };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Failed' }; }
  }

  private async discoverJoins(input: Record<string, unknown>): Promise<ToolResult> {
    const tableName = this.requireString(input, 'table_name');
    try {
      const { data, error } = await this.supabase.rpc('mcp_get_table_joins', { p_table_name: tableName });
      if (error) return { success: false, error: error.message };
      return { success: true, table_name: tableName, joins: data || [], join_count: data?.length || 0, hint: "Use query_with_join() for multi-table queries" };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Failed' }; }
  }

  private async queryTable(input: Record<string, unknown>): Promise<ToolResult> {
    const tableName = this.requireString(input, 'table_name');
    try {
      const { data, error } = await this.supabase.rpc('mcp_query_table', {
        p_table_name: tableName,
        p_customer_id: parseInt(this.customerId, 10),
        p_is_admin: this.isAdmin,
        p_select: this.optionalArray<string>(input, 'select', ['*']),
        p_filters: input.filters || [],
        p_group_by: this.optionalArray<string>(input, 'group_by'),
        p_aggregations: input.aggregations || null,
        p_order_by: this.optionalString(input, 'order_by'),
        p_order_dir: this.optionalString(input, 'order_dir', 'desc'),
        p_limit: this.optionalNumber(input, 'limit', 100)
      });
      if (error) return { success: false, error: error.message };
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      return { success: result?.success ?? true, table: tableName, row_count: result?.row_count || 0, data: result?.data || [], query: result?.query };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Failed' }; }
  }

  private async searchText(input: Record<string, unknown>): Promise<ToolResult> {
    const query = this.requireString(input, 'query');
    try {
      const { data, error } = await this.supabase.rpc('mcp_search_text', {
        p_search_query: query,
        p_customer_id: parseInt(this.customerId, 10),
        p_is_admin: this.isAdmin,
        p_match_type: this.optionalString(input, 'match_type', 'contains'),
        p_limit: this.optionalNumber(input, 'limit', 50)
      });
      if (error) return { success: false, error: error.message };
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      return { success: true, query, total_matches: result?.total_matches || 0, results: result?.results || [],
        hint: result?.results?.length > 0 ? `Found in ${result.results.length} field(s). Use query_table() with filters.` : "No matches. Try different term." };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Failed' }; }
  }

  private async queryWithJoin(input: Record<string, unknown>): Promise<ToolResult> {
    const baseTable = this.requireString(input, 'base_table');
    const joins = this.optionalArray<{ table: string; type?: string; on?: string }>(input, 'joins');
    if (!joins || joins.length === 0) return { success: false, error: 'joins required' };
    try {
      const { data, error } = await this.supabase.rpc('mcp_query_with_join', {
        p_base_table: baseTable,
        p_customer_id: parseInt(this.customerId, 10),
        p_is_admin: this.isAdmin,
        p_joins: joins,
        p_select: this.optionalArray<string>(input, 'select', ['*']),
        p_filters: input.filters || [],
        p_group_by: this.optionalArray<string>(input, 'group_by'),
        p_aggregations: input.aggregations || null,
        p_order_by: this.optionalString(input, 'order_by'),
        p_limit: this.optionalNumber(input, 'limit', 100)
      });
      if (error) return { success: false, error: error.message };
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      return { success: result?.success ?? true, base_table: baseTable, joins: joins.map(j => j.table), row_count: result?.row_count || 0, data: result?.data || [], query: result?.query };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Failed' }; }
  }

  private async aggregate(input: Record<string, unknown>): Promise<ToolResult> {
    try {
      const { data, error } = await this.supabase.rpc('mcp_aggregate', {
        p_table_name: this.requireString(input, 'table_name'),
        p_customer_id: parseInt(this.customerId, 10),
        p_is_admin: this.isAdmin,
        p_group_by: this.requireString(input, 'group_by'),
        p_metric: this.requireString(input, 'metric'),
        p_aggregation: this.requireString(input, 'aggregation'),
        p_filters: input.filters || [],
        p_limit: this.optionalNumber(input, 'limit', 20)
      });
      if (error) return { success: false, error: error.message };
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      return { success: result?.success ?? true, row_count: result?.row_count || 0, data: result?.data || [] };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Failed' }; }
  }

  private async exploreField(input: Record<string, unknown>): Promise<ToolResult> {
    const fieldName = this.requireString(input, 'field_name');
    const sampleSize = this.optionalNumber(input, 'sample_size', 15);

    try {
      const { data, error } = await this.supabase.rpc('explore_single_field', {
        p_customer_id: parseInt(this.customerId, 10),
        p_field_name: fieldName,
        p_sample_size: sampleSize
      });

      if (error) return { success: false, error: error.message };

      const result = data || { values: [], totalCount: 0, nullCount: 0 };
      const populatedPercent = result.total_count > 0 ? Math.round((result.populated_count / result.total_count) * 100) : 0;

      return {
        success: true,
        ...result,
        data_quality: this.assessDataQuality(populatedPercent, result.unique_count, result.total_count),
        recommendation: this.getFieldRecommendation(fieldName, populatedPercent, result.unique_count)
      };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Failed to explore field' }; }
  }

  private async previewAggregation(input: Record<string, unknown>): Promise<ToolResult> {
    const groupBy = this.requireString(input, 'group_by');
    const metric = this.requireString(input, 'metric');
    const aggregation = this.optionalString(input, 'aggregation', 'sum') || 'sum';
    const limit = this.optionalNumber(input, 'limit', 15);

    try {
      const { data, error } = await this.supabase.rpc('preview_grouping', {
        p_customer_id: parseInt(this.customerId, 10),
        p_group_by: groupBy,
        p_metric: metric,
        p_aggregation: aggregation,
        p_limit: limit
      });

      if (error) return { success: false, error: error.message };

      const results = data?.results || [];
      const totalGroups = data?.total_groups || results.length;

      return {
        success: true,
        ...data,
        quality: this.assessGroupingQuality(results, totalGroups),
        visualization_suggestion: this.suggestVisualization(groupBy, metric, aggregation, totalGroups),
        warning: totalGroups > 20 ? `High cardinality (${totalGroups} groups) - consider limiting or filtering` : null
      };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Failed to preview aggregation' }; }
  }

  private async comparePeriods(input: Record<string, unknown>): Promise<ToolResult> {
    const metric = this.requireString(input, 'metric');
    const aggregation = this.requireString(input, 'aggregation');
    const period1 = this.requireString(input, 'period1');
    const period2 = this.requireString(input, 'period2');
    const tableName = this.optionalString(input, 'table_name', 'shipment');

    const p1Range = this.parsePeriod(period1);
    const p2Range = this.parsePeriod(period2);

    const r1 = await this.queryTable({ table_name: tableName, filters: [{ field: 'pickup_date', operator: 'gte', value: p1Range.start }, { field: 'pickup_date', operator: 'lte', value: p1Range.end }], aggregations: [{ field: metric, function: aggregation, alias: 'value' }] }) as ToolResult;
    const r2 = await this.queryTable({ table_name: tableName, filters: [{ field: 'pickup_date', operator: 'gte', value: p2Range.start }, { field: 'pickup_date', operator: 'lte', value: p2Range.end }], aggregations: [{ field: metric, function: aggregation, alias: 'value' }] }) as ToolResult;

    const v1 = (r1?.data as Array<{ value: number }>)?.[0]?.value || 0;
    const v2 = (r2?.data as Array<{ value: number }>)?.[0]?.value || 0;
    const change = v2 !== 0 ? ((v1 - v2) / v2) * 100 : 0;

    return {
      success: true,
      metric,
      period1: { range: p1Range, value: v1 },
      period2: { range: p2Range, value: v2 },
      change_percent: Math.round(change * 10) / 10,
      insight: this.generateComparisonInsight({ spend_change_percent: change, volume_change_percent: 0 }, period1, period2)
    };
  }

  private async detectAnomalies(input: Record<string, unknown>): Promise<ToolResult> {
    const metric = this.requireString(input, 'metric');
    const groupBy = this.optionalString(input, 'group_by', 'carrier_name');
    const sensitivity = this.optionalString(input, 'sensitivity', 'medium') || 'medium';

    const thresholds = { high: 1.5, medium: 2.0, low: 3.0 };
    const threshold = thresholds[sensitivity as keyof typeof thresholds] || 2.0;

    const result = await this.aggregate({
      table_name: this.optionalString(input, 'table_name', 'shipment'),
      group_by: groupBy!,
      metric,
      aggregation: 'avg',
      limit: 50
    }) as ToolResult;

    if (!result?.data || !(result.data as Array<{ value: number }>).length) {
      return { success: true, anomalies: [] };
    }

    const data = result.data as Array<{ name: string; value: number; count: number }>;
    const values = data.map(r => r.value || 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stddev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length);

    const anomalies = data.filter(r => Math.abs((r.value || 0) - mean) > threshold * stddev).map(r => ({
      ...r,
      deviation: ((r.value || 0) - mean) / stddev,
      direction: r.value > mean ? 'high' : 'low'
    }));

    return {
      success: true,
      metric,
      group_by: groupBy,
      statistics: { mean: Math.round(mean * 100) / 100, stddev: Math.round(stddev * 100) / 100, threshold },
      anomalies,
      anomaly_count: anomalies.length
    };
  }

  private async investigateCause(input: Record<string, unknown>): Promise<ToolResult> {
    const question = this.optionalString(input, 'question', 'What is driving this metric?') || '';
    const metric = this.requireString(input, 'metric');
    const maxDepth = this.optionalNumber(input, 'max_depth', 3);

    const drillDownFields = ['carrier_name', 'destination_state', 'origin_state', 'mode_name'];
    const findings: Array<{ dimension: string; insights: unknown }> = [];

    for (const field of drillDownFields.slice(0, maxDepth)) {
      const result = await this.previewAggregation({ group_by: field, metric, aggregation: 'sum', limit: 5 }) as ToolResult;

      if (result?.results && Array.isArray(result.results) && result.results.length > 0) {
        const results = result.results as Array<{ name: string; value: number; count: number }>;
        const total = results.reduce((sum, r) => sum + r.value, 0);
        const topContributor = results[0];
        const concentration = (topContributor.value / total * 100).toFixed(1);

        findings.push({
          dimension: field,
          insights: {
            top_contributor: topContributor.name,
            top_value: topContributor.value,
            concentration_percent: concentration,
            distribution: results.slice(0, 3).map(r => ({ name: r.name, percent: (r.value / total * 100).toFixed(1) }))
          }
        });
      }
    }

    return {
      success: true,
      question,
      metric,
      investigation_depth: maxDepth,
      findings,
      summary: this.summarizeInvestigation(findings, question),
      suggested_actions: this.suggestActionsFromFindings(findings)
    };
  }

  private createReportDraft(input: Record<string, unknown>): ToolResult {
    this.currentReport = {
      id: crypto.randomUUID(),
      name: this.optionalString(input, 'name', 'Untitled Report') || 'Untitled Report',
      description: this.optionalString(input, 'description'),
      theme: this.optionalString(input, 'theme', 'blue') || 'blue',
      dateRange: { type: this.optionalString(input, 'date_range', 'last30') || 'last30' },
      sections: [],
      createdAt: new Date().toISOString(),
      customerId: this.customerId
    };
    return { success: true, report_id: this.currentReport.id, message: `Created: "${this.currentReport.name}"` };
  }

  private async addSection(input: Record<string, unknown>): Promise<ToolResult> {
    if (!this.currentReport) {
      this.createReportDraft({ name: 'Generated Report' });
    }

    const section: ReportSection = {
      type: this.requireString(input, 'section_type'),
      title: this.optionalString(input, 'title'),
      config: (input.config as Record<string, unknown>) || {}
    };

    if (section.config.groupBy && section.config.metric) {
      const preview = await this.previewAggregation({
        group_by: section.config.groupBy as string,
        metric: (section.config.metric as { field: string })?.field || section.config.metric as string,
        aggregation: (section.config.metric as { aggregation: string })?.aggregation || 'sum',
        limit: 10
      }) as ToolResult;
      section.data = preview?.results || preview?.data;

      if (section.data && Array.isArray(section.data)) {
        section.insight = this.generateSectionInsight(section.type, section.data, section.title);
      }
    }

    this.currentReport!.sections.push(section);

    return {
      success: true,
      section_index: this.currentReport!.sections.length - 1,
      total_sections: this.currentReport!.sections.length,
      has_data: !!section.data,
      insight: section.insight
    };
  }

  private modifySection(input: Record<string, unknown>): ToolResult {
    if (!this.currentReport) return { success: false, error: 'No report draft' };
    const idx = input.section_index as number;
    if (typeof idx !== 'number' || idx < 0 || idx >= this.currentReport.sections.length) {
      return { success: false, error: 'Invalid index' };
    }
    this.currentReport.sections[idx] = { ...this.currentReport.sections[idx], ...(input.updates as Record<string, unknown>) };
    return { success: true, section_index: idx };
  }

  private removeSection(input: Record<string, unknown>): ToolResult {
    if (!this.currentReport) return { success: false, error: 'No report draft' };
    const idx = input.section_index as number;
    if (typeof idx !== 'number' || idx < 0 || idx >= this.currentReport.sections.length) {
      return { success: false, error: 'Invalid index' };
    }
    this.currentReport.sections.splice(idx, 1);
    return { success: true, remaining: this.currentReport.sections.length };
  }

  private reorderSections(input: Record<string, unknown>): ToolResult {
    if (!this.currentReport) return { success: false, error: 'No report draft' };
    const newOrder = input.new_order as number[];
    if (!newOrder || newOrder.length !== this.currentReport.sections.length) {
      return { success: false, error: 'New order must include all section indices' };
    }
    this.currentReport.sections = newOrder.map(i => this.currentReport!.sections[i]);
    return { success: true, new_order: newOrder };
  }

  private async previewReport(_input: Record<string, unknown>): Promise<ToolResult> {
    if (!this.currentReport) return { success: false, error: 'No report draft' };

    for (const section of this.currentReport.sections) {
      if (section.config?.groupBy && section.config?.metric && !section.data) {
        const preview = await this.previewAggregation({
          group_by: section.config.groupBy as string,
          metric: (section.config.metric as { field: string })?.field || section.config.metric as string,
          aggregation: (section.config.metric as { aggregation: string })?.aggregation || 'sum',
          limit: 10
        }) as ToolResult;
        section.data = preview?.results || preview?.data;
        if (section.data && Array.isArray(section.data)) {
          section.insight = this.generateSectionInsight(section.type, section.data, section.title);
        }
      }
    }

    return {
      success: true,
      report_name: this.currentReport.name,
      theme: this.currentReport.theme,
      total_sections: this.currentReport.sections.length,
      sections: this.currentReport.sections.map((s, i) => ({ index: i, type: s.type, title: s.title, has_data: !!s.data })),
      ready_to_finalize: true
    };
  }

  private finalizeReport(input: Record<string, unknown>): ToolResult {
    let report = input.report as Record<string, unknown> | undefined;
    if (!report && this.currentReport) {
      report = this.currentReport as unknown as Record<string, unknown>;
    }
    if (!report) return { success: false, error: 'No report provided and no draft exists' };

    if (!report.name) report.name = 'Generated Report';
    if (!report.id) report.id = crypto.randomUUID();
    if (!report.createdAt) report.createdAt = new Date().toISOString();
    report.customerId = this.customerId;

    return { success: true, report, summary: input.summary, ready_to_save: true };
  }

  private async learnTerminology(input: Record<string, unknown>): Promise<ToolResult> {
    const term = (input.term || input.key) as string;
    const meaning = (input.meaning || input.value) as string;
    if (!term || !meaning) return { success: false, error: 'term and meaning are required' };

    const confidence = this.optionalString(input, 'confidence', 'medium') || 'medium';
    const confidenceScore = confidence === 'high' ? 0.9 : confidence === 'low' ? 0.5 : 0.7;

    try {
      const { error } = await this.supabase.from('ai_knowledge').upsert({
        knowledge_type: 'term',
        key: term.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        label: term,
        definition: meaning,
        scope: 'customer',
        customer_id: parseInt(this.customerId, 10),
        source: 'learned',
        confidence: confidenceScore,
        needs_review: confidenceScore < 0.8,
        is_active: confidenceScore >= 0.8,
        metadata: { maps_to_field: input.maps_to_field, maps_to_filter: input.maps_to_filter }
      }, { onConflict: 'knowledge_type,key,scope,customer_id' });

      if (error) return { success: false, error: error.message };
      return { success: true, term, meaning, message: `Learned: "${term}" = "${meaning}"` };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Failed' }; }
  }

  private async learnPreference(input: Record<string, unknown>): Promise<ToolResult> {
    const prefType = this.requireString(input, 'preference_type');
    const key = this.requireString(input, 'key');
    const value = this.requireString(input, 'value');

    try {
      const { error } = await this.supabase.from('ai_knowledge').upsert({
        knowledge_type: 'preference',
        key: `${prefType}:${key}`.toLowerCase().replace(/[^a-z0-9:]+/g, '_'),
        label: `${prefType}: ${key}`,
        definition: value,
        scope: 'customer',
        customer_id: parseInt(this.customerId, 10),
        source: 'learned',
        confidence: 0.8,
        is_active: true,
        metadata: { preference_type: prefType, context: input.context }
      }, { onConflict: 'knowledge_type,key,scope,customer_id' });

      if (error) return { success: false, error: error.message };
      return { success: true, message: `Learned preference: ${key} = ${value}` };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Failed' }; }
  }

  private async recordCorrection(input: Record<string, unknown>): Promise<ToolResult> {
    const original = this.requireString(input, 'original');
    const corrected = this.requireString(input, 'corrected');

    try {
      const { error } = await this.supabase.from('ai_knowledge').insert({
        knowledge_type: 'correction',
        key: `correction_${Date.now()}`,
        label: `Correction: ${original.substring(0, 50)}`,
        definition: corrected,
        scope: 'customer',
        customer_id: parseInt(this.customerId, 10),
        source: 'correction',
        confidence: 1.0,
        needs_review: true,
        is_active: false,
        metadata: { original, corrected, context: input.context, recorded_at: new Date().toISOString() }
      });

      if (error) return { success: false, error: error.message };
      return { success: true, original, corrected, message: 'Correction recorded for review' };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Failed' }; }
  }

  private async getCustomerMemory(input: Record<string, unknown>): Promise<ToolResult> {
    try {
      const { data, error } = await this.supabase.rpc('get_customer_knowledge', { p_customer_id: this.customerId });

      if (error) return { success: false, error: error.message };

      const memory: Record<string, unknown> = {};
      if (input.include_terminology !== false) {
        memory.terminology = (data || []).filter((k: { knowledge_type: string }) => k.knowledge_type === 'term');
      }
      if (input.include_preferences !== false) {
        memory.preferences = (data || []).filter((k: { knowledge_type: string }) => k.knowledge_type === 'preference');
      }
      if (input.include_history === true) {
        memory.corrections = (data || []).filter((k: { knowledge_type: string }) => k.knowledge_type === 'correction');
      }

      return { success: true, customer_id: this.customerId, memory, total_items: (data || []).length };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Failed' }; }
  }

  private async generateInsight(input: Record<string, unknown>): Promise<ToolResult> {
    const dataPoint = input.data_point as string || JSON.stringify(input.data || {}).substring(0, 200);
    const context = input.context as string;
    const audience = this.optionalString(input, 'audience', 'operations') || 'operations';
    const insightType = this.optionalString(input, 'type', 'observation') || 'observation';

    const prompt = `You are a freight logistics analyst generating insights for a ${audience} audience.

Data Point: ${dataPoint}
Context: ${context}
Insight Type: ${insightType}

Generate a concise, actionable insight (2-3 sentences max). Be specific and quantitative where possible.`;

    try {
      const startTime = Date.now();
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') || '',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 150,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) throw new Error(`Haiku API error: ${response.status}`);

      const data = await response.json();
      const insight = data.content?.[0]?.text || this.generateFallbackInsight(dataPoint, audience);
      const latencyMs = Date.now() - startTime;

      try {
        await this.supabase.from('ai_insight_log').insert({
          customer_id: this.customerId,
          insight_type: insightType,
          insight_text: insight,
          context_summary: context?.substring(0, 200),
          audience,
          tokens_used: data.usage?.output_tokens || 0,
          model_used: 'claude-3-haiku-20240307',
          latency_ms: latencyMs
        });
      } catch { /* ignore logging errors */ }

      return { success: true, insight, audience, type: insightType, model: 'claude-3-haiku', latency_ms: latencyMs };
    } catch {
      return { success: true, insight: this.generateFallbackInsight(dataPoint, audience), audience, type: insightType, model: 'fallback' };
    }
  }

  private generateFallbackInsight(dataPoint: string, audience: string): string {
    const templates: Record<string, string> = {
      executive: `${dataPoint} represents a key metric for cost management. This warrants strategic review.`,
      operations: `${dataPoint} indicates an opportunity for process optimization. Consider reviewing routing efficiency.`,
      finance: `${dataPoint} impacts budget forecasting. Recommend quarterly spend review.`
    };
    return templates[audience] || templates.operations;
  }

  private async generateRecommendation(input: Record<string, unknown>): Promise<ToolResult> {
    const finding = this.requireString(input, 'finding');
    const goal = this.optionalString(input, 'goal', 'cost optimization') || 'cost optimization';
    const priority = this.optionalString(input, 'priority', 'medium') || 'medium';

    const prompt = `You are a freight logistics consultant providing actionable recommendations.

Finding: ${finding}
Goal: ${goal}
Priority: ${priority}

Provide a specific, actionable recommendation (2-3 sentences). Include what action to take and expected impact.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') || '',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) throw new Error(`Haiku API error: ${response.status}`);

      const data = await response.json();
      return { success: true, recommendation: data.content?.[0]?.text || `Based on ${finding}, recommend detailed analysis to support ${goal}.`, goal, priority, model: 'claude-3-haiku' };
    } catch {
      return { success: true, recommendation: `Based on ${finding}, recommend detailed analysis to support ${goal}.`, goal, priority, model: 'fallback' };
    }
  }

  private async generateSectionInsightWithHaiku(input: Record<string, unknown>): Promise<ToolResult> {
    const sectionType = input.section_type as string;
    const sectionTitle = input.title as string;
    const dataPreview = input.data_preview as string;

    const prompt = `Generate a one-line insight for a ${sectionType} titled "${sectionTitle}".
Data: ${dataPreview}
Write a brief, specific insight (1 sentence) highlighting the key takeaway. Be quantitative.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') || '',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 60,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) throw new Error(`Haiku API error: ${response.status}`);

      const data = await response.json();
      return { success: true, insight: data.content?.[0]?.text || `Key finding from ${sectionTitle}`, model: 'claude-3-haiku' };
    } catch {
      return { success: true, insight: `Key finding from ${sectionTitle}`, model: 'fallback' };
    }
  }

  private parsePeriod(period: string): { start: string; end: string } {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start: Date;

    switch (period) {
      case 'last7': start = new Date(now.getTime() - 7 * 86400000); break;
      case 'last30': start = new Date(now.getTime() - 30 * 86400000); break;
      case 'last90': start = new Date(now.getTime() - 90 * 86400000); break;
      case 'last6months': start = new Date(now); start.setMonth(start.getMonth() - 6); break;
      case 'lastYear': start = new Date(now); start.setFullYear(start.getFullYear() - 1); break;
      default: start = new Date(now.getTime() - 30 * 86400000);
    }

    return { start: start.toISOString().split('T')[0], end };
  }

  private assessDataQuality(populatedPercent: number, _uniqueCount: number, _totalCount: number): string {
    if (populatedPercent >= 95) return 'excellent';
    if (populatedPercent >= 80) return 'good';
    if (populatedPercent >= 50) return 'moderate';
    return 'poor';
  }

  private getFieldRecommendation(fieldName: string, populatedPercent: number, uniqueCount: number): string {
    if (populatedPercent < 50) return `Low coverage (${populatedPercent}%) - consider using a different field`;
    if (uniqueCount === 1) return 'Single value - not useful for grouping';
    if (uniqueCount > 100) return 'High cardinality - consider filtering';
    return 'Good for analysis';
  }

  private assessGroupingQuality(results: unknown[], totalGroups: number): string {
    if (results.length === 0) return 'no_data';
    if (totalGroups <= 5) return 'excellent';
    if (totalGroups <= 15) return 'good';
    if (totalGroups <= 50) return 'moderate';
    return 'high_cardinality';
  }

  private suggestVisualization(_groupBy: string, _metric: string, _aggregation: string, totalGroups: number): string {
    if (totalGroups <= 5) return 'pie or donut chart';
    if (totalGroups <= 10) return 'bar chart';
    if (totalGroups <= 20) return 'horizontal bar chart';
    return 'table or filtered chart';
  }

  private generateComparisonInsight(data: Record<string, unknown>, period1: string, period2: string): string {
    const spendChange = data?.spend_change_percent as number || 0;
    if (Math.abs(spendChange) < 5) return `Stable performance between ${period1} and ${period2}`;
    const direction = spendChange > 0 ? 'increased' : 'decreased';
    return `Spend ${direction} ${Math.abs(spendChange).toFixed(1)}% from ${period2} to ${period1}`;
  }

  private summarizeInvestigation(findings: Array<{ dimension: string; insights: unknown }>, _question: string): string {
    if (findings.length === 0) return 'No significant patterns found';
    const top = findings[0];
    const insights = top.insights as Record<string, unknown>;
    return `Primary driver: ${top.dimension} - ${insights.top_contributor} accounts for ${insights.concentration_percent}% of total`;
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
    if (actions.length === 0) actions.push('No immediate actions required - distribution appears healthy');
    return actions;
  }

  private generateSectionInsight(sectionType: string, data: unknown[], title?: string): string {
    if (!data || data.length === 0) return '';
    const total = data.reduce((sum: number, r: { value?: number }) => sum + (r.value || 0), 0);
    const top = data[0] as { name: string; value: number };
    const topPercent = total > 0 ? (top.value / total * 100).toFixed(1) : '0';
    return `${top.name} leads with ${topPercent}% of ${title || sectionType}`;
  }
}
