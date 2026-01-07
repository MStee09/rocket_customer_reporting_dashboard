import { supabase } from '../lib/supabase';
import type {
  Report,
  CreateReportInput,
  UpdateReportInput,
  ReportExecutionParams,
} from '../types/report';

export async function getReports(customerId: string): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('customer_id', customerId)
    .eq('visibility', 'saved')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch reports: ${error.message}`);
  return data || [];
}

export async function getReportById(reportId: string): Promise<Report | null> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch report: ${error.message}`);
  return data;
}

export async function createReport(input: CreateReportInput): Promise<Report> {
  const { data, error } = await supabase
    .from('reports')
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to create report: ${error.message}`);
  return data;
}

export async function updateReport(
  reportId: string,
  updates: UpdateReportInput
): Promise<Report> {
  const { data, error } = await supabase
    .from('reports')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', reportId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update report: ${error.message}`);
  return data;
}

export async function deleteReport(reportId: string): Promise<void> {
  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', reportId);

  if (error) throw new Error(`Failed to delete report: ${error.message}`);
}

export async function duplicateReport(
  reportId: string,
  newName: string
): Promise<Report> {
  const original = await getReportById(reportId);
  if (!original) throw new Error('Report not found');

  const { id, created_at, updated_at, ...rest } = original;
  return createReport({
    ...rest,
    name: newName,
    visibility: 'saved',
  } as CreateReportInput);
}

export async function createWidgetReport(
  widgetId: string,
  name: string,
  executionParams: ReportExecutionParams,
  ownerId: string,
  customerId: string
): Promise<Report> {
  return createReport({
    name,
    source_type: 'widget',
    source_widget_id: widgetId,
    execution_params: executionParams,
    visibility: 'saved',
    owner_id: ownerId,
    customer_id: customerId,
  });
}

export async function createSimpleReport(
  name: string,
  queryDefinition: Record<string, unknown>,
  ownerId: string,
  customerId: string
): Promise<Report> {
  return createReport({
    name,
    source_type: 'simple_report',
    query_definition: queryDefinition,
    visibility: 'saved',
    owner_id: ownerId,
    customer_id: customerId,
  });
}

export async function getReportsByOwner(ownerId: string): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('visibility', 'saved')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch reports: ${error.message}`);
  return data || [];
}

export async function searchReports(
  customerId: string,
  searchTerm: string
): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('customer_id', customerId)
    .eq('visibility', 'saved')
    .ilike('name', `%${searchTerm}%`)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) throw new Error(`Failed to search reports: ${error.message}`);
  return data || [];
}
