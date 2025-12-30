import { SimpleReportConfig, SimpleReportColumn } from '../types/reports';
import { ReportEnhancementContext, EnhancementColumn, ColumnStats, AppliedFilter } from '../types/reportEnhancement';
import { getColumnById } from '../config/reportColumns';

export function buildEnhancementContext(
  reportConfig: SimpleReportConfig,
  reportData: Record<string, unknown>[],
  dateRange: { type: string; start?: string; end?: string }
): ReportEnhancementContext {
  const columns = reportConfig.columns.map(col => mapToEnhancementColumn(col));
  const columnStats = calculateColumnStats(reportConfig.columns, reportData);
  const sampleData = reportData.slice(0, 20);

  const appliedFilters: AppliedFilter[] = (reportConfig.filters || []).map(f => ({
    field: f.column,
    operator: f.operator,
    value: f.value,
    label: `${f.column} ${f.operator} ${f.value}`
  }));

  return {
    sourceType: 'custom_report',
    sourceReportId: reportConfig.id || 'unsaved',
    sourceReportName: reportConfig.name,
    columns,
    rowCount: reportData.length,
    dateRange: {
      type: dateRange.type as any,
      start: dateRange.start,
      end: dateRange.end
    },
    appliedFilters,
    sampleData,
    columnStats,
    timestamp: new Date().toISOString()
  };
}

function mapToEnhancementColumn(col: SimpleReportColumn): EnhancementColumn {
  const columnDef = getColumnById(col.id);

  return {
    id: col.id,
    label: col.label,
    type: columnDef?.type === 'number' ? 'number' :
          columnDef?.type === 'date' ? 'date' :
          columnDef?.type === 'lookup' ? 'lookup' : 'text',
    format: columnDef?.format as any,
    isGroupable: columnDef?.type !== 'number' || !!col.aggregation,
    isAggregatable: columnDef?.type === 'number'
  };
}

function calculateColumnStats(
  columns: SimpleReportColumn[],
  data: Record<string, unknown>[]
): Record<string, ColumnStats> {
  const stats: Record<string, ColumnStats> = {};

  for (const col of columns) {
    const columnDef = getColumnById(col.id);
    const values = data.map(row => row[col.id]).filter(v => v !== null && v !== undefined);
    const nullCount = data.length - values.length;
    const populatedPercent = data.length > 0 ? Math.round((values.length / data.length) * 100) : 0;

    if (columnDef?.type === 'number') {
      const numValues = values.map(v => Number(v)).filter(n => !isNaN(n));
      stats[col.id] = {
        sum: numValues.reduce((a, b) => a + b, 0),
        avg: numValues.length > 0 ? numValues.reduce((a, b) => a + b, 0) / numValues.length : 0,
        min: numValues.length > 0 ? Math.min(...numValues) : 0,
        max: numValues.length > 0 ? Math.max(...numValues) : 0,
        nullCount,
        populatedPercent
      };
    } else {
      const stringValues = values.map(v => String(v));
      const uniqueValues = [...new Set(stringValues)];
      const valueCounts = new Map<string, number>();
      stringValues.forEach(v => valueCounts.set(v, (valueCounts.get(v) || 0) + 1));
      const topValues = [...valueCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([v]) => v);

      stats[col.id] = {
        uniqueCount: uniqueValues.length,
        topValues,
        nullCount,
        populatedPercent
      };
    }
  }

  return stats;
}

export function formatContextForAI(context: ReportEnhancementContext): string {
  let output = `## CUSTOM REPORT CONTEXT\n\n`;
  output += `You are enhancing the custom report "${context.sourceReportName}".\n`;
  output += `This report has ${context.rowCount.toLocaleString()} rows of verified data.\n\n`;

  output += `### Available Columns\n\n`;
  output += `| Column | Type | Groupable | Aggregatable | Stats |\n`;
  output += `|--------|------|-----------|--------------|-------|\n`;

  for (const col of context.columns) {
    const stats = context.columnStats[col.id];
    let statsStr = '';

    if (col.type === 'number' && stats) {
      statsStr = `Sum: ${formatNumber(stats.sum)}, Avg: ${formatNumber(stats.avg)}`;
    } else if (stats?.uniqueCount !== undefined) {
      statsStr = `${stats.uniqueCount} unique values`;
    }

    output += `| ${col.label} | ${col.type} | ${col.isGroupable ? 'Yes' : 'No'} | ${col.isAggregatable ? 'Yes' : 'No'} | ${statsStr} |\n`;
  }

  output += `\n### Sample Values\n\n`;
  for (const col of context.columns) {
    const stats = context.columnStats[col.id];
    if (stats?.topValues && stats.topValues.length > 0) {
      output += `**${col.label}**: ${stats.topValues.slice(0, 5).map(v => `"${v}"`).join(', ')}${stats.topValues.length > 5 ? '...' : ''}\n`;
    }
  }

  if (context.appliedFilters.length > 0) {
    output += `\n### Applied Filters\n\n`;
    context.appliedFilters.forEach(f => {
      output += `- ${f.label}\n`;
    });
  }

  output += `\n### Date Range\n\n`;
  output += `Type: ${context.dateRange.type} (DYNAMIC - always current)\n`;

  output += `\n### IMPORTANT\n\n`;
  output += `This report uses DYNAMIC date ranges. When you generate a report definition, use the dateRange type "${context.dateRange.type}" NOT fixed dates.\n`;
  output += `The report will automatically show current data when viewed.\n`;

  return output;
}

function formatNumber(n: number | undefined): string {
  if (n === undefined) return 'N/A';
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(2);
}

export function generateEnhancementSuggestions(context: ReportEnhancementContext): string[] {
  const suggestions: string[] = [];

  const textColumns = context.columns.filter(c => c.type === 'text');
  const numericColumns = context.columns.filter(c => c.type === 'number');

  for (const col of textColumns) {
    const stats = context.columnStats[col.id];
    if (stats?.uniqueCount && stats.uniqueCount > 5 && stats.uniqueCount < 100) {
      suggestions.push(`Group data by ${col.label} and show as a pie chart`);
    }
    if (stats?.uniqueCount && stats.uniqueCount > 100) {
      suggestions.push(`Categorize ${col.label} by keywords (tell me what categories you want)`);
    }
  }

  for (const numCol of numericColumns) {
    for (const textCol of textColumns) {
      suggestions.push(`Show ${numCol.label} by ${textCol.label} as a bar chart`);
    }
  }

  if (numericColumns.length >= 2) {
    suggestions.push(`Calculate ${numericColumns[0].label} per ${numericColumns[1].label}`);
  }

  return suggestions.slice(0, 5);
}
