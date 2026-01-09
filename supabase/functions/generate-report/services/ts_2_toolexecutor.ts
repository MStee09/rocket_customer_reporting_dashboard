// ============================================================================
// TYPESCRIPT FILE 2 OF 4: toolExecutor.ts
// Location: supabase/functions/generate-report/services/toolExecutor.ts
// Action: REPLACE EXISTING FILE
// ============================================================================

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
        case 'create_report_draft': result = this.createReportDraft(input); break;
        case 'add_section': result = await this.addSection(input); break;
        case 'modify_section': result = this.modifySection(input); break;
        case 'remove_section': result = this.removeSection(input); break;
        case 'finalize_report': result = this.finalizeReport(input); break;
        case 'learn_terminology': result = await this.learnTerminology(input); break;
        case 'learn_preference': result = await this.learnPreference(input); break;
        case 'ask_clarification': result = { success: true, question: input.question, options: input.options, context: input.context }; break;
        default: result = { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (e) {
      result = { success: false, error: e instanceof Error ? e.message : 'Tool execution failed' };
    }
    return { toolName, toolInput: input, result, timestamp: new Date().toISOString(), duration: Date.now() - startTime };
  }

  // MCP DISCOVERY
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
          groupable_fields: fields.filter((f: any) => f.is_groupable).map((f: any) => f.field_name),
          aggregatable_fields: fields.filter((f: any) => f.is_aggregatable).map((f: any) => f.field_name),
          searchable_fields: fields.filter((f: any) => f.is_searchable).map((f: any) => f.field_name)
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

  // MCP QUERIES - CRITICAL: Pass native objects, NOT JSON.stringify
  private async queryTable(input: Record<string, unknown>): Promise<ToolResult> {
    const tableName = this.requireString(input, 'table_name');
    try {
      const { data, error } = await this.supabase.rpc('mcp_query_table', {
        p_table_name: tableName,
        p_customer_id: parseInt(this.customerId, 10),
        p_is_admin: this.isAdmin,
        p_select: this.optionalArray<string>(input, 'select', ['*']),
        p_filters: input.filters || [],  // NATIVE OBJECT - NOT JSON.stringify
        p_group_by: this.optionalArray<string>(input, 'group_by'),
        p_aggregations: input.aggregations || null,  // NATIVE OBJECT
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
        p_query: query,
        p_customer_id: parseInt(this.customerId, 10),
        p_is_admin: this.isAdmin,
        p_tables: this.optionalArray<string>(input, 'tables'),
        p_fields: this.optionalArray<string>(input, 'fields'),
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
        p_joins: joins,  // NATIVE ARRAY - NOT JSON.stringify
        p_select: this.optionalArray<string>(input, 'select', ['*']),
        p_filters: input.filters || [],  // NATIVE OBJECT
        p_group_by: this.optionalArray<string>(input, 'group_by'),
        p_aggregations: input.aggregations || null,  // NATIVE OBJECT
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
        p_filters: input.filters || [],  // NATIVE OBJECT
        p_limit: this.optionalNumber(input, 'limit', 20)
      });
      if (error) return { success: false, error: error.message };
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      return { success: result?.success ?? true, row_count: result?.row_count || 0, data: result?.data || [] };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Failed' }; }
  }

  // LEGACY TOOLS
  private async exploreField(input: Record<string, unknown>): Promise<ToolResult> {
    const fieldName = this.requireString(input, 'field_name');
    return this.queryTable({ table_name: 'shipment', select: [fieldName], group_by: [fieldName], aggregations: [{ field: '*', function: 'count', alias: 'count' }], order_by: 'count', limit: this.optionalNumber(input, 'sample_size', 15) });
  }

  private async previewAggregation(input: Record<string, unknown>): Promise<ToolResult> {
    return this.aggregate({ table_name: 'shipment', group_by: this.requireString(input, 'group_by'), metric: this.requireString(input, 'metric'), aggregation: this.optionalString(input, 'aggregation', 'sum') || 'sum', limit: this.optionalNumber(input, 'limit', 15) });
  }

  private async comparePeriods(input: Record<string, unknown>): Promise<ToolResult> {
    const metric = this.requireString(input, 'metric');
    const aggregation = this.requireString(input, 'aggregation');
    const p1Range = this.parsePeriod(this.requireString(input, 'period1'));
    const p2Range = this.parsePeriod(this.requireString(input, 'period2'));
    const tableName = this.optionalString(input, 'table_name', 'shipment');
    const r1 = await this.queryTable({ table_name: tableName, filters: [{ field: 'pickup_date', operator: 'gte', value: p1Range.start }, { field: 'pickup_date', operator: 'lte', value: p1Range.end }], aggregations: [{ field: metric, function: aggregation, alias: 'value' }] }) as any;
    const r2 = await this.queryTable({ table_name: tableName, filters: [{ field: 'pickup_date', operator: 'gte', value: p2Range.start }, { field: 'pickup_date', operator: 'lte', value: p2Range.end }], aggregations: [{ field: metric, function: aggregation, alias: 'value' }] }) as any;
    const v1 = r1?.data?.[0]?.value || 0, v2 = r2?.data?.[0]?.value || 0;
    const change = v2 !== 0 ? ((v1 - v2) / v2) * 100 : 0;
    return { success: true, metric, period1: { range: p1Range, value: v1 }, period2: { range: p2Range, value: v2 }, change_percent: Math.round(change * 10) / 10 };
  }

  private async detectAnomalies(input: Record<string, unknown>): Promise<ToolResult> {
    const metric = this.requireString(input, 'metric');
    const groupBy = this.optionalString(input, 'group_by', 'carrier_name');
    const result = await this.aggregate({ table_name: this.optionalString(input, 'table_name', 'shipment'), group_by: groupBy, metric, aggregation: 'avg', limit: 50 }) as any;
    if (!result?.data?.length) return { success: true, anomalies: [] };
    const values = result.data.map((r: any) => r.value || 0);
    const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
    const stddev = Math.sqrt(values.reduce((sq: number, n: number) => sq + Math.pow(n - mean, 2), 0) / values.length);
    const anomalies = result.data.filter((r: any) => Math.abs((r.value || 0) - mean) > 2 * stddev).map((r: any) => ({ ...r, deviation: ((r.value || 0) - mean) / stddev }));
    return { success: true, metric, statistics: { mean: Math.round(mean * 100) / 100, stddev: Math.round(stddev * 100) / 100 }, anomalies };
  }

  // REPORT BUILDING
  private createReportDraft(input: Record<string, unknown>): ToolResult {
    this.currentReport = {
      id: crypto.randomUUID(), name: this.optionalString(input, 'name', 'Untitled Report') || 'Untitled Report',
      description: this.optionalString(input, 'description'), theme: this.optionalString(input, 'theme', 'blue') || 'blue',
      dateRange: { type: this.optionalString(input, 'date_range', 'last30') || 'last30' },
      sections: [], createdAt: new Date().toISOString(), customerId: this.customerId
    };
    return { success: true, report_id: this.currentReport.id, message: `Created: "${this.currentReport.name}"` };
  }

  private async addSection(input: Record<string, unknown>): Promise<ToolResult> {
    if (!this.currentReport) return { success: false, error: 'No report draft. Call create_report_draft first.' };
    const section: ReportSection = { type: this.requireString(input, 'section_type'), title: this.optionalString(input, 'title'), config: (input.config as Record<string, unknown>) || {} };
    if (section.config.groupBy && section.config.metric) {
      const preview = await this.aggregate({ table_name: 'shipment', group_by: section.config.groupBy as string, metric: section.config.metric as string, aggregation: (section.config.aggregation as string) || 'sum', limit: 10 }) as any;
      section.data = preview?.data;
    }
    this.currentReport.sections.push(section);
    return { success: true, section_index: this.currentReport.sections.length - 1, total_sections: this.currentReport.sections.length };
  }

  private modifySection(input: Record<string, unknown>): ToolResult {
    if (!this.currentReport) return { success: false, error: 'No report draft' };
    const idx = input.section_index as number;
    if (typeof idx !== 'number' || idx < 0 || idx >= this.currentReport.sections.length) return { success: false, error: 'Invalid index' };
    this.currentReport.sections[idx] = { ...this.currentReport.sections[idx], ...(input.updates as Record<string, unknown>) };
    return { success: true, section_index: idx };
  }

  private removeSection(input: Record<string, unknown>): ToolResult {
    if (!this.currentReport) return { success: false, error: 'No report draft' };
    const idx = input.section_index as number;
    if (typeof idx !== 'number' || idx < 0 || idx >= this.currentReport.sections.length) return { success: false, error: 'Invalid index' };
    this.currentReport.sections.splice(idx, 1);
    return { success: true, remaining: this.currentReport.sections.length };
  }

  private finalizeReport(input: Record<string, unknown>): ToolResult {
    if (!this.currentReport) return { success: false, error: 'No report draft' };
    return { success: true, report: this.currentReport, summary: input.summary, ready_to_save: true };
  }

  // LEARNING
  private async learnTerminology(input: Record<string, unknown>): Promise<ToolResult> {
    const term = this.requireString(input, 'term'), meaning = this.requireString(input, 'meaning');
    try {
      const { error } = await this.supabase.from('ai_knowledge').insert({
        customer_id: parseInt(this.customerId, 10), knowledge_type: 'term', key: term.toLowerCase(), label: term, definition: meaning,
        metadata: { maps_to_field: input.maps_to_field, confidence: this.optionalString(input, 'confidence', 'medium') },
        scope: 'customer', source: 'learned', is_active: true
      });
      if (error) return { success: false, error: error.message };
      return { success: true, term, meaning, message: `Learned: "${term}" = "${meaning}"` };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Failed' }; }
  }

  private async learnPreference(input: Record<string, unknown>): Promise<ToolResult> {
    const prefType = this.requireString(input, 'preference_type'), key = this.requireString(input, 'key'), value = this.requireString(input, 'value');
    try {
      const { error } = await this.supabase.from('ai_knowledge').insert({
        customer_id: parseInt(this.customerId, 10), knowledge_type: 'preference', key: `${prefType}:${key}`, label: key, definition: value,
        metadata: { preference_type: prefType }, scope: 'customer', source: 'learned', is_active: true
      });
      if (error) return { success: false, error: error.message };
      return { success: true, message: `Learned preference: ${key} = ${value}` };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Failed' }; }
  }

  private parsePeriod(period: string): { start: string; end: string } {
    const now = new Date(), end = now.toISOString().split('T')[0];
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
}
