import { useState, useRef } from 'react';
import {
  X,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  Printer,
  Copy,
  Check,
  BarChart3,
  Table,
  Hash,
  TrendingUp
} from 'lucide-react';
import type { ReportDraft, DraftSection } from '../../ai/investigator/types';
import { ReportChart } from '../reports/studio/ReportChart';
import { ReportTable } from '../reports/studio/ReportTable';

interface ReportPreviewPanelProps {
  report: ReportDraft;
  onClose: () => void;
  onExport?: () => void;
}

const CHART_COLORS = [
  '#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ef4444',
  '#14b8a6', '#f59e0b', '#6366f1', '#ec4899', '#84cc16'
];

export function ReportPreviewPanel({ report, onClose }: ReportPreviewPanelProps) {
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(report.sections.map(s => s.id)));
  const reportRef = useRef<HTMLDivElement>(null);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedSections(new Set(report.sections.map(s => s.id)));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  const handleCopyToClipboard = async () => {
    const reportText = generateReportText(report);
    await navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateReportText = (report: ReportDraft): string => {
    let text = `# ${report.name}\n\n`;
    if (report.description) {
      text += `${report.description}\n\n`;
    }
    text += `Generated: ${report.metadata?.createdAt ? new Date(report.metadata.createdAt).toLocaleDateString() : 'Just now'}\n\n`;
    text += `---\n\n`;

    report.sections.forEach((section, index) => {
      text += `## ${index + 1}. ${section.title || `Section ${index + 1}`}\n`;
      text += `Type: ${section.type}\n`;

      if (section.preview?.dataPreview?.aggregatedValues) {
        text += `\nData:\n`;
        Object.entries(section.preview.dataPreview.aggregatedValues).forEach(([key, value]) => {
          text += `- ${key}: ${typeof value === 'number' ? value.toLocaleString() : value}\n`;
        });
      }

      if (section.insights && section.insights.length > 0) {
        text += `\nInsights:\n`;
        section.insights.forEach(insight => {
          text += `- ${insight.text}\n`;
        });
      }
      text += `\n`;
    });

    return text;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    window.print();
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[560px] lg:w-[640px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200 print:relative print:w-full print:shadow-none print:border-none">
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50 print:bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center print:hidden">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 truncate max-w-[320px]">
                {report.name}
              </h2>
              <p className="text-xs text-gray-500">
                {report.sections.length} sections {report.theme ? `• ${report.theme} theme` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors print:hidden"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="flex-shrink-0 px-4 py-2 border-b border-gray-100 flex items-center gap-2 print:hidden">
        <button
          onClick={handleCopyToClipboard}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-orange-500 text-white hover:bg-orange-600 rounded-lg transition-colors ml-auto"
        >
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      <div className="flex-shrink-0 px-4 py-2 border-b border-gray-100 flex items-center justify-between print:hidden">
        <span className="text-xs text-gray-500">
          {expandedSections.size} of {report.sections.length} sections expanded
        </span>
        <div className="flex gap-2">
          <button onClick={expandAll} className="text-xs text-orange-600 hover:underline">
            Expand all
          </button>
          <span className="text-gray-300">|</span>
          <button onClick={collapseAll} className="text-xs text-orange-600 hover:underline">
            Collapse all
          </button>
        </div>
      </div>

      <div ref={reportRef} className="flex-1 overflow-y-auto p-4 space-y-4 print:overflow-visible">
        {report.description && (
          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            {report.description}
          </p>
        )}

        <div className="space-y-3">
          {report.sections.map((section, index) => (
            <SectionRenderer
              key={section.id}
              section={section}
              index={index}
              expanded={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
              theme={report.theme || 'blue'}
            />
          ))}
        </div>

        {report.sections.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No sections added yet</p>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 bg-gray-50 print:bg-white">
        <p className="text-xs text-gray-500 text-center">
          Created {report.metadata?.createdAt ? new Date(report.metadata.createdAt).toLocaleString() : 'Just now'}
        </p>
      </div>
    </div>
  );
}

interface SectionRendererProps {
  section: DraftSection;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  theme: string;
}

function SectionRenderer({ section, index, expanded, onToggle, theme }: SectionRendererProps) {
  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'hero': return <Hash className="w-4 h-4" />;
      case 'chart': return <BarChart3 className="w-4 h-4" />;
      case 'table': return <Table className="w-4 h-4" />;
      case 'stat-row': return <TrendingUp className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const typeColors: Record<string, string> = {
    hero: 'bg-blue-100 text-blue-700',
    chart: 'bg-blue-100 text-blue-700',
    table: 'bg-green-100 text-green-700',
    'stat-row': 'bg-amber-100 text-amber-700',
    header: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden print:break-inside-avoid">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left print:hover:bg-white"
      >
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">
            {section.title || `Section ${index + 1}`}
          </p>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium mt-1 ${typeColors[section.type] || 'bg-gray-100 text-gray-700'}`}>
            {getSectionIcon(section.type)}
            {section.type}
          </span>
        </div>
        <div className="print:hidden">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <SectionContent section={section} theme={theme} />
        </div>
      )}
    </div>
  );
}

interface SectionContentProps {
  section: DraftSection;
  theme: string;
}

function buildAggregatedValues(sampleData: unknown[]): Record<string, number> {
  if (!sampleData || sampleData.length === 0) return {};

  const result: Record<string, number> = {};

  sampleData.forEach((item) => {
    const typedItem = item as Record<string, unknown>;
    if (typedItem.name && typeof typedItem.value === 'number') {
      result[String(typedItem.name)] = typedItem.value;
    }
  });

  return result;
}

function SectionContent({ section, theme }: SectionContentProps) {
  const preview = section.preview;
  const config = section.config || {};

  const backendData = (section as { data?: { results?: unknown[] } }).data;
  const sampleData = backendData?.results || preview?.dataPreview?.sampleData || [];
  const aggregatedValues = preview?.dataPreview?.aggregatedValues || {};

  const finalAggregatedValues = Object.keys(aggregatedValues).length > 0
    ? aggregatedValues
    : buildAggregatedValues(sampleData);

  switch (section.type) {
    case 'hero':
      return <HeroSection config={config} aggregatedValues={finalAggregatedValues} sampleData={sampleData} />;

    case 'chart':
      return <ChartSection config={config} sampleData={sampleData} aggregatedValues={finalAggregatedValues} theme={theme} />;

    case 'table':
      return <TableSection config={config} sampleData={sampleData} />;

    case 'stat-row':
      return <StatRowSection config={config} aggregatedValues={finalAggregatedValues} sampleData={sampleData} />;

    default:
      return (
        <div className="py-4 text-center text-gray-500 text-sm">
          <p>Preview not available for {section.type} sections</p>
        </div>
      );
  }
}

function HeroSection({ config, aggregatedValues, sampleData }: { config: Record<string, unknown>; aggregatedValues: Record<string, unknown>; sampleData: unknown[] }) {
  type MetricDef = { label?: string; value?: unknown; format?: string };
  const metrics = (config.metrics as MetricDef[]) || [];

  let primaryValue: number | string = '--';
  let primaryLabel = (config.label as string) || 'Total';
  let format: string | undefined;

  if (metrics.length > 0) {
    const primaryMetric = metrics[0];
    primaryLabel = primaryMetric.label || 'Total';
    format = primaryMetric.format;
    if (typeof primaryMetric.value !== 'undefined' && primaryMetric.value !== null) {
      primaryValue = primaryMetric.value as number | string;
    }
  }

  if (primaryValue === '--' && Object.keys(aggregatedValues).length > 0) {
    const firstKey = Object.keys(aggregatedValues)[0];
    primaryLabel = firstKey;
    primaryValue = aggregatedValues[firstKey] as number | string;
  }

  if (primaryValue === '--' && sampleData.length > 0) {
    const firstItem = sampleData[0] as Record<string, unknown>;
    if (firstItem.name !== undefined && typeof firstItem.value === 'number') {
      const total = sampleData.reduce((sum, item) => {
        const typedItem = item as Record<string, unknown>;
        return sum + (typeof typedItem.value === 'number' ? typedItem.value : 0);
      }, 0);
      primaryValue = total;
      primaryLabel = (config.label as string) || 'Total';
    }
  }

  if (primaryValue === '--' && config.value !== undefined) {
    primaryValue = config.value as number | string;
  }

  if (!format) {
    format = config.format as string | undefined;
  }

  let formattedValue: string;
  if (typeof primaryValue === 'number') {
    if (format === 'currency') {
      formattedValue = `$${primaryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (format === 'percent') {
      formattedValue = `${primaryValue.toFixed(1)}%`;
    } else {
      formattedValue = primaryValue.toLocaleString();
    }
  } else {
    formattedValue = String(primaryValue);
  }

  return (
    <div className="py-6 text-center">
      <p className="text-4xl font-bold text-gray-900">{formattedValue}</p>
      <p className="text-sm text-gray-500 mt-1">{primaryLabel}</p>
    </div>
  );
}

function ChartSection({ config, sampleData, aggregatedValues, theme }: { config: Record<string, unknown>; sampleData: unknown[]; aggregatedValues: Record<string, unknown>; theme: string }) {
  const chartType = (config.chartType as string) || 'bar';

  let chartData: Array<{ name: string; value: number }> = [];

  if (sampleData.length > 0) {
    const firstItem = sampleData[0] as Record<string, unknown>;
    if (firstItem.name !== undefined && firstItem.value !== undefined) {
      chartData = sampleData.map((item) => {
        const typedItem = item as Record<string, unknown>;
        return {
          name: String(typedItem.name || 'Unknown'),
          value: typeof typedItem.value === 'number' ? typedItem.value : parseFloat(String(typedItem.value)) || 0
        };
      });
    }
  }

  if (chartData.length === 0 && Object.keys(aggregatedValues).length > 0) {
    chartData = Object.entries(aggregatedValues).map(([name, value]) => ({
      name: String(name),
      value: typeof value === 'number' ? value : 0
    }));
  }

  if (chartData.length === 0 && sampleData.length > 0) {
    const groupBy = config.groupBy as string | undefined;
    const metricConfig = config.metric as { field?: string } | undefined;
    const metricField = metricConfig?.field || 'value';

    if (groupBy) {
      const grouped = new Map<string, number>();
      sampleData.forEach((row) => {
        const typedRow = row as Record<string, unknown>;
        const key = String(typedRow[groupBy] || 'Unknown');
        const val = typeof typedRow[metricField] === 'number' ? typedRow[metricField] as number : 0;
        grouped.set(key, (grouped.get(key) || 0) + val);
      });
      chartData = Array.from(grouped.entries()).map(([name, value]) => ({ name, value }));
    }
  }

  if (chartData.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500 text-sm">
        <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No chart data available</p>
      </div>
    );
  }

  const coloredData = chartData.map((d, i) => ({
    ...d,
    color: CHART_COLORS[i % CHART_COLORS.length]
  }));

  const metricConfig = config.metric as { field?: string } | undefined;
  const format = (config.format as 'currency' | 'number' | 'percent') || (metricConfig?.field === 'retail' ? 'currency' : 'number');
  const mappedType = chartType === 'donut' ? 'pie' : chartType;

  return (
    <div className="py-4">
      <ReportChart
        type={mappedType as 'bar' | 'line' | 'pie' | 'area' | 'treemap' | 'radar' | 'calendar' | 'bump' | 'waterfall'}
        data={coloredData}
        height={280}
        format={format}
        colors={CHART_COLORS}
        showLegend={chartType === 'pie' || chartType === 'donut'}
        theme={theme as 'blue' | 'green' | 'orange' | 'purple' | 'slate'}
      />
    </div>
  );
}

function TableSection({ config, sampleData }: { config: Record<string, unknown>; sampleData: unknown[] }) {
  if (sampleData.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500 text-sm">
        <Table className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No table data available</p>
      </div>
    );
  }

  type ColumnConfig = { field?: string; key?: string; label?: string; format?: string };
  type MetricConfig = { field?: string; label?: string; format?: string };

  const firstRow = sampleData[0] as Record<string, unknown>;
  let columns: Array<{ key: string; label: string; format?: 'currency' | 'number' | 'percent' | 'date' | 'string' }> = [];

  if (firstRow.name !== undefined && firstRow.value !== undefined && Object.keys(firstRow).length <= 3) {
    const groupByLabel = (config.groupBy as string) || 'Category';
    const metricDef = config.metric as MetricConfig | undefined;
    const metricsDef = config.metrics as MetricConfig[] | undefined;
    const metricLabel = metricDef?.label || metricsDef?.[0]?.label || 'Value';
    const format = (config.format as string) || metricDef?.format || metricsDef?.[0]?.format;

    columns = [
      { key: 'name', label: groupByLabel },
      { key: 'value', label: metricLabel, format: format as 'currency' | 'number' | 'percent' | undefined }
    ];
  } else if (config.columns && Array.isArray(config.columns)) {
    columns = (config.columns as ColumnConfig[]).map((col) => ({
      key: col.field || col.key || '',
      label: col.label || col.field || col.key || '',
      format: col.format as 'currency' | 'number' | 'percent' | 'date' | 'string' | undefined
    }));
  } else if (config.metrics && Array.isArray(config.metrics)) {
    if (config.groupBy) {
      columns.push({ key: config.groupBy as string, label: config.groupBy as string });
    }
    (config.metrics as MetricConfig[]).forEach((m) => {
      columns.push({
        key: m.field || m.label || '',
        label: m.label || m.field || '',
        format: m.format as 'currency' | 'number' | 'percent' | 'date' | 'string' | undefined
      });
    });
  } else {
    columns = Object.keys(firstRow).slice(0, 6).map(key => ({
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }));
  }

  const tableData = sampleData.slice(0, 15) as Array<Record<string, unknown>>;

  return (
    <div className="py-4">
      <ReportTable
        columns={columns}
        data={tableData}
        maxRows={15}
        compact
      />
      {sampleData.length > 15 && (
        <p className="text-xs text-gray-400 mt-2 text-center">
          Showing 15 of {sampleData.length} rows
        </p>
      )}
    </div>
  );
}

function StatRowSection({ config, aggregatedValues, sampleData }: { config: Record<string, unknown>; aggregatedValues: Record<string, unknown>; sampleData: unknown[] }) {
  type MetricConfig = { label?: string; field?: string; value?: unknown; color?: string; format?: string };
  const metrics = (config.metrics as MetricConfig[]) || [];

  const stats: Array<{ label: string; value: unknown; format?: string }> = [];

  const formatStatValue = (value: unknown, format?: string): string => {
    if (value === '--' || value === null || value === undefined) return '--';
    if (typeof value !== 'number') return String(value);

    if (format === 'currency') {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (format === 'percent') {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString();
  };

  if (metrics.length > 0) {
    metrics.forEach((m) => {
      const label = m.label || m.field || 'Metric';
      let value: unknown = '--';

      if (typeof m.value !== 'undefined' && m.value !== null) {
        value = m.value;
      } else if (aggregatedValues[label] !== undefined) {
        value = aggregatedValues[label];
      } else if (m.field && aggregatedValues[m.field] !== undefined) {
        value = aggregatedValues[m.field];
      }

      stats.push({ label, value, format: m.format });
    });
  } else if (Object.keys(aggregatedValues).length > 0) {
    Object.entries(aggregatedValues).forEach(([label, value]) => {
      stats.push({ label, value });
    });
  } else if (sampleData.length > 0) {
    sampleData.slice(0, 4).forEach((item) => {
      const typedItem = item as Record<string, unknown>;
      if (typedItem.name && typedItem.value !== undefined) {
        stats.push({
          label: String(typedItem.name),
          value: typedItem.value
        });
      }
    });
  }

  if (stats.length === 0) {
    return (
      <div className="py-4 text-center text-gray-500 text-sm">
        <p>No stats data available</p>
      </div>
    );
  }

  return (
    <div className="py-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-xl font-semibold text-gray-900">{formatStatValue(stat.value, stat.format)}</p>
          <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
