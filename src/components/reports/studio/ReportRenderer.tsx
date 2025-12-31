import { AlertCircle, Loader2 } from 'lucide-react';
import {
  AIReportDefinition,
  ReportSection,
  ExecutedReportData,
  DateRangeType,
  ReportTheme,
  MapSection,
} from '../../../types/aiReport';
import { HeroMetric, HeroIcon } from './HeroMetric';
import { StatRow } from './StatRow';
import { StatIcon } from './StatCard';
import { CategoryGrid, CategoryData } from './CategoryGrid';
import { SectionHeader } from './SectionHeader';
import { ReportChart, ChartDataPoint } from './ReportChart';
import { ReportTable, TableColumn } from './ReportTable';
import { ReportContainer } from './ReportContainer';
import { DateRangeSelector, DateRange } from './DateRangeSelector';
import { ReportMap, MapDataPoint } from './ReportMap';

interface MetricResult {
  label: string;
  value: number;
  format: string;
}

interface GroupedResult {
  name: string;
  value: number;
  subtitle?: string;
}

export interface ReportRendererProps {
  report: AIReportDefinition;
  data: ExecutedReportData | null;
  isLoading?: boolean;
  onDateRangeChange?: (range: DateRangeType, dates?: DateRange) => void;
  onExport?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
  onRefresh?: () => void;
  onEdit?: () => void;
  embedded?: boolean;
  compact?: boolean;
}

export function ReportRenderer({
  report,
  data,
  isLoading,
  onDateRangeChange,
  onExport,
  onDelete,
  onBack,
  onRefresh,
  onEdit,
  embedded = false,
  compact = false,
}: ReportRendererProps) {
  if (isLoading && !embedded) {
    return (
      <ReportContainer
        title={report.name}
        description={report.description}
        onBack={onBack}
      >
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-500">Loading report data...</span>
        </div>
      </ReportContainer>
    );
  }

  const globalTheme = report.theme || 'blue';
  const sectionSpacing = compact ? 'space-y-3' : 'space-y-6';
  const containerPadding = compact ? 'p-3' : 'p-0';

  const reportContent = (
    <div className={`${sectionSpacing} ${containerPadding}`}>
      {report.sections.map((section, index) => (
        <SectionRenderer
          key={index}
          section={section}
          data={data?.sections[index]?.data}
          error={data?.sections[index]?.error}
          theme={globalTheme}
          compact={compact}
        />
      ))}
    </div>
  );

  const content = (
    <>
      {onDateRangeChange && report.dateRange && (
        <DateRangeSelector
          value={report.dateRange.type}
          customRange={
            report.dateRange.customStart && report.dateRange.customEnd
              ? {
                  start: new Date(report.dateRange.customStart),
                  end: new Date(report.dateRange.customEnd),
                }
              : undefined
          }
          onChange={(preset, dates) =>
            onDateRangeChange(preset as DateRangeType, dates)
          }
        />
      )}

      <div className={onDateRangeChange ? 'mt-6' : ''}>
        {reportContent}
      </div>

      {(!data || data.sections.length === 0) && !isLoading && (
        <div className="text-center py-12 text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No data available for this report.</p>
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className={compact ? '' : 'space-y-6'}>{content}</div>;
  }

  return (
    <ReportContainer
      title={report.name}
      description={report.description}
      onExport={onExport}
      onDelete={onDelete}
      onBack={onBack}
      onRefresh={onRefresh}
      onEdit={onEdit}
      isLoading={isLoading}
      lastUpdated={data ? new Date(data.executedAt) : undefined}
    >
      {content}
    </ReportContainer>
  );
}

interface SectionRendererProps {
  section: ReportSection;
  data: unknown;
  error?: string;
  theme: ReportTheme;
  compact?: boolean;
}

function SectionRenderer({ section, data, error, theme, compact = false }: SectionRendererProps) {
  if (!section || !section.config) {
    return null;
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-xl ${compact ? 'p-3' : 'p-4'}`}>
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className={`flex-shrink-0 ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
          <span className={`font-medium ${compact ? 'text-sm' : ''}`}>Error loading section</span>
        </div>
        <p className={`text-red-500 mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>{error}</p>
      </div>
    );
  }

  switch (section.type) {
    case 'hero': {
      const heroData = data as MetricResult | null;
      return (
        <HeroMetric
          label={section.config.metric.label}
          value={heroData?.value || 0}
          format={section.config.metric.format}
          icon={section.config.icon as HeroIcon}
          theme={theme}
          subtitle={section.config.subtitle}
          compact={compact}
        />
      );
    }

    case 'stat-row': {
      const statData = data as MetricResult[] | null;
      return (
        <StatRow
          stats={section.config.stats.map((stat, i) => ({
            label: stat.metric.label,
            value: statData?.[i]?.value || 0,
            format: stat.metric.format,
            icon: stat.icon as StatIcon,
            theme,
          }))}
          columns={section.config.columns}
          compact={compact}
        />
      );
    }

    case 'category-grid': {
      const gridData = data as GroupedResult[] | null;
      const categories: CategoryData[] = (gridData || []).map((item) => ({
        category: item.name,
        value: item.value,
        format: section.config.metric.format,
        subtitle: item.subtitle,
      }));

      return (
        <>
          {section.config.title && (
            <SectionHeader title={section.config.title} compact={compact} />
          )}
          <CategoryGrid categories={categories} theme={theme} compact={compact} />
        </>
      );
    }

    case 'chart': {
      const chartData = data as GroupedResult[] | null;
      const chartPoints: ChartDataPoint[] = (chartData || []).map((item) => ({
        name: item.name,
        value: item.value,
      }));

      return (
        <ReportChart
          type={section.config.chartType}
          data={chartPoints}
          title={section.config.title}
          format={section.config.metric.format}
          height={compact ? Math.min(section.config.height || 200, 200) : section.config.height}
          horizontal={section.config.horizontal}
          colors={section.config.colors}
          theme={theme}
          compact={compact}
        />
      );
    }

    case 'table': {
      const tableData = data as Record<string, unknown>[] | null;
      const columns: TableColumn[] = section.config.columns.map((col, index) => {
        let key = col.field;
        if (col.aggregation && col.aggregation !== 'sum') {
          key = `${col.field}_${col.aggregation}`;
        } else {
          const duplicatesBefore = section.config.columns
            .slice(0, index)
            .filter((c) => c.field === col.field).length;
          if (duplicatesBefore > 0) {
            key = `${col.field}_${index}`;
          }
        }
        return {
          key,
          label: col.label,
          format: col.format,
          align: col.align,
        };
      });

      return (
        <ReportTable
          columns={columns}
          data={tableData || []}
          title={section.config.title}
          maxRows={compact ? Math.min(section.config.maxRows || 5, 5) : section.config.maxRows}
          compact={compact}
        />
      );
    }

    case 'header':
      return (
        <SectionHeader
          title={section.config.title}
          subtitle={section.config.subtitle}
          compact={compact}
        />
      );

    case 'map': {
      const mapSection = section as MapSection;
      const mapData = data as MapDataPoint[] | null;

      return (
        <ReportMap
          type={mapSection.config.mapType}
          data={mapData || []}
          title={mapSection.config.title}
          height={compact ? Math.min(mapSection.config.height || 300, 300) : mapSection.config.height}
          format={mapSection.config.metric.format}
          compact={compact}
        />
      );
    }

    default:
      return null;
  }
}

export default ReportRenderer;
